/* GANKCO Nest 3.0.4 — Developer tools: reverse test requests, reset monthly counts, remove test and unused records.
   Only the Developer. Every action asks for the record's number (or name) to be typed; the audit log keeps a full copy. */
'use strict';

// type-to-confirm dialog used here and on the PO page
function devConfirm({ title, expect, sub, run, submit = 'Remove' }) {
  return modal({ title, submit, danger: true, sub: sub || '',
    body: `<div class="notice bad devwarn">${ico('wrench')}<span>This can’t be undone from Nest. A full copy is kept in the audit log.</span></div>
      <label class="f">Type <b class="mono">${esc(expect)}</b> to confirm<input name="confirm" autocomplete="off" spellcheck="false"></label>`,
    onOpen: d => { const i = $('[name=confirm]', d), b = $('button[type=submit]', d); const chk = () => { b.disabled = i.value.trim().toLowerCase() !== String(expect).trim().toLowerCase(); }; i.oninput = chk; chk(); },
    onSubmit: async x => run(x.confirm.trim()) });
}

const DEV_TABS = [
  ['requests', 'Materials requests', 'truck'], ['counts', 'Monthly counts', 'count'], ['po', 'Purchase orders', 'audit'], ['planner', 'Job planner', 'plan'],
  ['signoffs', 'Sign-offs', 'sign'], ['unused', 'Unused records', 'box'], ['signups', 'Sign-ups', 'user'], ['people', 'PeopleCore', 'users'], ['talent', 'Performance & talent', 'target']];
// 3.0.5u: steps an appraisal can be sent back to
const DEV_STEPS = [['self', 'Self-appraisal'], ['manager', 'Line manager'], ['arc', 'Review committee (ARC)'], ['reveal', 'Reveal'], ['employee', 'Employee sign-off']];
const COUNT_ST = { in_progress: ['pending', 'In progress'], rejected: ['rejected', 'Sent back'], submitted: ['soon', 'Submitted'], verified: ['ok', 'Approved'] };
const DEV = { tab: 'requests', q: '' };

ROUTES.devtools = {
  async load(parts, params) {
    if (!isSuper() || S.viewAs) return topbar('Developer tools') + '<div class="notice">Only the Developer can use these tools.</div>';
    const want = params && params.get ? params.get('tab') : null;
    if (want && DEV_TABS.some(t => t[0] === want)) DEV.tab = want;
    const t = DEV.tab; let body = '';
    const row = (main, sub, chipHtml, btn) => `<li><div class="main"><div class="name">${main}</div><div class="sub">${sub}</div></div><div class="end">${chipHtml || ''} ${btn}</div></li>`;
    const btn = (attrs, label = 'Remove', icon = 'trash') => `<button class="btn small danger-ghost" ${attrs}>${ico(icon)}${label}</button>`;
    const list = (title, meta, rows, empty, note) => `<section class="panel"><header><h2>${title}</h2><span class="meta">${meta}</span></header>${note ? `<div class="body muted">${note}</div>` : ''}
      ${rows.length ? `<ul class="list devlist">${rows.join('')}</ul>` : `<div class="empty">${empty}</div>`}</section>`;
    this.data = {};
    if (t === 'requests') {
      const rows = await q(sb.from('jobs').select('id,job_no,title,status,requester_name,created_at,submitted_at').order('id', { ascending: false }).limit(300));
      this.data.rows = rows;
      body = list('Materials requests', plural(rows.length, 'request'), rows.map(j => row(`${tag(j.job_no)} <a href="#/job/${j.id}">${esc(j.title || '')}</a>`, `${esc(j.requester_name || '—')} · ${fd(j.created_at)}`,
          chip(...(JOB_STATUS[j.status] || ['muted', j.status])), btn(`data-rev="${j.id}"`, 'Reverse & remove', 'undo'))), 'No materials requests.',
        'Reversing undoes everything the request did: items issued go back where they came from, items returned come off again, and the request, its approvals, crew and Load-out Manifest signatures are removed. A planned job it came from goes back to Planned. If stock has moved since, Nest says what to put back first.');
    } else if (t === 'counts') {
      const rows = await q(sb.from('counts').select('id,department_id,month,state,started_by_name,submitted_by_name,verified_at').order('month', { ascending: false }).order('department_id').limit(200));
      this.data.rows = rows;
      body = list('Monthly counts', plural(rows.length, 'count'), rows.map(c => row(`<b>${esc(lineName(c.department_id))}</b> · ${new Date(c.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
          `Count ${c.id} · started by ${esc(c.started_by_name || '—')}${c.submitted_by_name ? ' · submitted by ' + esc(c.submitted_by_name) : ''}`, chip(...(COUNT_ST[c.state] || ['muted', c.state])), btn(`data-cnt="${c.id}"`, 'Reset', 'undo'))), 'No counts yet.',
        'Resetting removes the count so <b>Start count</b> shows again for that line and month. If it was approved, the stock change it made is undone first (if it added 3, 3 come off), and the stock history shows a “Count reset” line.');
    } else if (t === 'po') {
      const [pos, sups] = await Promise.all([q(sb.from('po_orders').select('id,po_no,revision,status,supplier_name,supplier_id,created_by_name,po_date,total,currency').order('id', { ascending: false }).limit(300)), q(sb.from('po_suppliers').select('id,name').order('name'))]);
      const used = new Set(pos.map(o => o.supplier_id).filter(Boolean)); const idle = sups.filter(s => !used.has(s.id));
      this.data.rows = pos; this.data.sups = idle;
      body = list('Purchase orders', plural(pos.length, 'PO'), pos.map(o => row(`${o.po_no ? tag(poFull(o)) : chip('muted', 'Draft ' + o.id)} <a href="#/po/${o.id}">${esc(o.supplier_name || 'No supplier yet')}</a>`,
          `${esc(o.created_by_name || '—')}${o.po_date ? ' · ' + fd(o.po_date) : ''}${o.total ? ' · ' + esc(o.currency || '') + ' ' + Number(o.total).toLocaleString('en-US', { maximumFractionDigits: 2 }) : ''}`,
          chip(...(PO_STATUS[o.status] || ['muted', o.status])), btn(`data-po="${o.id}"`, 'Delete'))), 'No purchase orders.',
        'Deleting removes the PO and its revisions. Goods received against it come off stock, and “On order” in Inventory is worked out again. The PO number is not reused.')
        + list('Suppliers on no PO', plural(idle.length, 'supplier'), idle.map(s => row(esc(s.name), 'Not on any purchase order', '', btn(`data-sup="${s.id}"`, 'Delete'))), 'Every supplier is on at least one PO.');
    } else if (t === 'planner') {
      const rows = await q(sb.from('plan_jobs').select('id,title,customer,planned_on,status,mr_id,created_by_name').order('planned_on', { ascending: false }).limit(300));
      this.data.rows = rows;
      body = list('Planned jobs', plural(rows.length, 'job'), rows.map(j => row(`<b>${esc(j.title)}</b>${j.customer ? ' · ' + esc(j.customer) : ''}`, `${j.planned_on ? fd(j.planned_on) : 'No date'} · added by ${esc(j.created_by_name || '—')}${j.mr_id ? ' · has a materials request' : ''}`,
          chip('muted', j.status), btn(`data-plan="${j.id}"`, 'Delete'))), 'The Job planner is empty.', 'Deleting a planned job doesn’t touch any materials request made from it.');
    } else if (t === 'signoffs') {
      const rows = await q(sb.from('report_signoffs').select('id,ref,title,subtitle,period_label,status,prepared_name,department_id').order('id', { ascending: false }).limit(300));
      this.data.rows = rows;
      body = list('Report sign-offs', plural(rows.length, 'report'), rows.map(r => row(`${tag(r.ref)} <a href="#/signoff/${r.id}">${esc(r.title || '')}</a>`, `${esc(r.subtitle || r.period_label || '')} · ${r.department_id ? esc(lineShort(r.department_id)) : 'All lines'} · ${esc(r.prepared_name || '')}`,
          chip(...(SO_STATUS[r.status] || ['muted', r.status])), btn(`data-so="${r.id}"`, 'Delete'))), 'No sign-offs yet.', 'Deleting a sign-off removes its signatures. The report period can then be signed off again.');
    } else if (t === 'unused') {
      await Promise.all([items(), loadLookups()]);
      const qq = DEV.q.trim().toLowerCase();
      const its = qq ? S.items.filter(i => `${i.code || ''} ${i.name}`.toLowerCase().includes(qq)).slice(0, 40) : [];
      const units = qq ? await q(sb.from('units').select('id,serial_no,item_id').ilike('serial_no', `%${DEV.q.trim()}%`).limit(20)).catch(() => []) : [];
      this.data = { its, units };
      body = `<section class="panel"><header><h2>Items and serial numbers</h2></header><div class="body muted">Only things never used can be removed: no stock movements, requests, counts, POs or certificates. Anything with history can only be archived. Search for what you want to remove.</div>
        <div class="filters"><input type="search" id="dev-q" placeholder="Search items by code or name, or a serial number" value="${esc(DEV.q)}"></div>
        ${qq ? `<ul class="list devlist">${its.map(i => row(`${tag(i.code || '')} ${esc(i.name)}`, `${esc(lineShort(i.department_id))}${i.active ? '' : ' · archived'}`, '', btn(`data-item="${i.id}"`, 'Delete if unused'))).join('')}
          ${units.map(u => row(`Serial / kit ${esc(u.serial_no || '')}`, esc(S.items.find(i => i.id === u.item_id)?.name || ''), '', btn(`data-unit="${u.id}"`, 'Delete if unused'))).join('')}</ul>${its.length || units.length ? '' : '<div class="empty">Nothing matches.</div>'}` : ''}</section>`
        + list('Locations', plural(S.locs.length, 'location'), S.locs.filter(l => !l.is_placeholder).map(l => row(esc(l.name), l.active ? 'Open' : 'Closed', '', btn(`data-loc="${l.id}"`, 'Delete if unused'))), 'No locations.')
        + list('Categories', plural(S.cats.length, 'category', 'categories'), S.cats.map(c => row(esc(c.name), esc(lineShort(c.department_id)), '', btn(`data-cat="${c.id}"`, 'Delete if unused'))), 'No categories.');
    } else if (t === 'signups') {
      const [, allow] = await Promise.all([loadLookups(), q(sb.rpc('dev_signup_allow', { p_email: null, p_add: null })).catch(() => [])]);
      const rows = Object.values(S.people).filter(p => p.role === 'pending');
      this.data.rows = rows;
      body = list('Sign-ups waiting for approval', plural(rows.length, 'sign-up'), rows.map(p => row(esc(p.full_name || '—'), `${esc(p.email)} · signed up ${fd(p.created_at)}`, '', btn(`data-su="${p.id}"`, 'Remove'))), 'Nobody is waiting.',
        'Removing a sign-up deletes the account, so the email can sign up again. To stop someone who was approved, set their Access to No access in Team &amp; access.')
        + `<section class="panel"><header><h2>Allowed outside emails</h2><span class="meta">${plural(allow.length, 'email')}</span></header>
          <div class="body muted">Only ${esc(CFG.SIGNUP_DOMAIN ? '@' + CFG.SIGNUP_DOMAIN : 'company')} emails, or the email HR has on someone’s PeopleCore record, can create an account. That rule stays on. Add an exact address here to let it sign up too, for example a Gmail for the Developer. New sign-ups still wait for approval.</div>
          <form class="filters" id="dev-allow"><input type="email" name="email" placeholder="name@gmail.com" required autocomplete="off"><button class="btn primary" type="submit">${ico('plus')}Allow this email</button></form>
          ${allow.length ? `<ul class="list devlist">${allow.map(a => row(esc(a.email), `Added by ${esc(a.by || '—')} · ${fd(a.at)}`, a.signed_up ? chip('ok', 'Signed up') : chip('muted', 'Not signed up yet'), btn(`data-unallow="${esc(a.email)}"`, 'Remove'))).join('')}</ul>` : '<div class="empty">No outside emails allowed.</div>'}</section>`;
    } else if (t === 'talent') {
      const L = await q(sb.rpc('dev_hr_list')); this.data = { L };
      const lc = x => esc(String(x || '').toLowerCase());
      const r2 = (s2, main, sub, chipHtml, btns) => `<li data-s="${lc(s2)}"><div class="main"><div class="name">${main}</div><div class="sub">${sub}</div></div><div class="end">${chipHtml || ''} ${btns}</div></li>`;
      const sec = (title, rows, empty, note) => list(title, plural(rows.length, 'record'), rows, empty, note);
      const past = x => x.historic ? ' ' + chip('muted', 'Past record') : '';
      const st = v => chip('muted', String(v || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()));
      body = `<div class="filters"><input type="search" id="dev-hq" placeholder="Filter by person, cycle or survey" value="${esc(DEV.hq || '')}"></div>`
        + sec('Objectives', L.plans.map(x => r2(`${x.name} ${x.cycle}`, `<b>${esc(x.name)}</b>`, `${esc(x.cycle)} · ${plural(x.objectives, 'objective')}`, st(x.status),
            (x.status !== 'draft' ? btn(`data-dh="plan_reopen" data-id="${x.id}" data-x="${esc(x.name)}"`, 'Back to draft', 'undo') : '') + btn(`data-dh="plan_delete" data-id="${x.id}" data-x="${esc(x.name)}"`, 'Delete plan'))), 'No objectives yet.',
            '“Back to draft” reverses an approval so the person can change their objectives. Deleting a plan removes all of that person’s objectives in the cycle.')
        + sec('Appraisals and reviews', L.appraisals.map(x => r2(`${x.name} ${x.cycle} ${x.period}`, `<b>${esc(x.name)}</b>`, `${esc(x.cycle)} · ${esc(x.period)}${x.score != null ? ' · ' + pfPct(x.score) : ''}`, chip('muted', (PA_ST[x.status] || [0, x.status])[1]) + past(x),
            (!x.historic && x.status !== 'self' ? btn(`data-dstep="${x.id}" data-x="${esc(x.name)}" data-st="${x.status}"`, 'Send back', 'undo') : '') + btn(`data-dh="appraisal_delete" data-id="${x.id}" data-x="${esc(x.name)}"`, 'Delete'))), 'No appraisals yet.',
            'Send back moves an appraisal to an earlier step; scores already given stay so they can be changed. A completed one can be sent back too.')
        + sec('Appraisal periods', L.periods.map(x => r2(`${x.title} ${x.cycle}`, `<b>${esc(x.title)}</b>`, `${esc(x.cycle)} · ${plural(x.appraisals, 'appraisal')}`, st(x.status), btn(`data-dh="period_delete" data-id="${x.id}" data-x="${esc(x.title)}"`, 'Delete with data'))), 'No periods.')
        + sec('Appraisal cycles', L.cycles.map(x => r2(x.title, `<b>${esc(x.title)}</b>`, `${x.kind === 'probation' ? 'Probation · ' : ''}${plural(x.plans, 'objective plan')} · ${plural(x.appraisals, 'appraisal')}`, st(x.status), btn(`data-dh="cycle_delete" data-id="${x.id}" data-x="${esc(x.title)}"`, 'Delete with data'))), 'No cycles.',
            'Deleting a cycle removes its periods, objectives, appraisals and scores.')
        + sec('Approved confirmations', L.confirmations.map(x => r2(x.name, `<b>${esc(x.name)}</b>`, `${esc((CF_DEC[x.decision] || [0, x.decision])[1])} · from ${fd(x.effective)}`, chip('ok', 'Approved') + past(x), btn(`data-dh="confirmation_reverse" data-id="${x.id}" data-x="${esc(x.name)}"`, 'Reverse', 'undo'))), 'No approved confirmations.',
            'Reversing puts the person back on probation with their old due date (or takes an extension back off) and removes the job history line.')
        + sec('Applied promotions and salary reviews', L.promotions.map(x => r2(x.name, `<b>${esc(x.name)}</b>`, `${x.kind === 'promotion' ? 'Promotion' : 'Salary review'} · from ${fd(x.effective)}`, chip('ok', 'Applied') + past(x), btn(`data-dh="promotion_reverse" data-id="${x.id}" data-x="${esc(x.name)}"`, 'Reverse', 'undo'))), 'None applied yet.',
            'Reversing restores the job role, paygrade, department and salary from before, and removes the job history line. A past record only loses its history line.')
        + sec('Improvement plans (PIP)', L.pips.map(x => r2(x.name, `<b>${esc(x.name)}</b>`, esc(x.title || ''), st(x.status), btn(`data-dh="pip_delete" data-id="${x.id}" data-x="${esc(x.name)}"`, 'Delete'))), 'No PIPs.')
        + sec('Competency assessments', L.comps.map(x => r2(x.name, `<b>${esc(x.name)}</b>`, fd(x.at), st(x.status) + past(x), btn(`data-dh="comp_delete" data-id="${x.id}" data-x="${esc(x.name)}"`, 'Delete'))), 'No assessments.')
        + sec('Onboardings', L.onbs.map(x => r2(x.name, `<b>${esc(x.name)}</b>`, x.start ? 'Started ' + fd(x.start) : '', st(x.status) + past(x), btn(`data-dh="onb_delete" data-id="${x.id}" data-x="${esc(x.name)}"`, 'Delete'))), 'No onboardings.')
        + sec('Survey answers', L.responses.map(x => r2(`${x.name} ${x.survey}`, `<b>${esc(x.name)}</b>`, `${esc(x.survey)} · ${fd(x.on)}`, '', btn(`data-dh="survey_response_delete" data-id="${x.id}" data-x="${esc(x.name)}"`, 'Delete answers'))), 'No answers to named surveys.',
            'Only surveys that aren’t anonymous. The person can then answer again.');
    } else if (t === 'people') {
      const nm = e => e ? `${e.first_name || ''} ${e.last_name || ''}`.trim() : '—';
      const [reqs, rqs, exits, cases, anns, emps] = await Promise.all([
        q(sb.from('hr_requests').select('id,kind,title,status,created_at,employee:hr_employees!hr_requests_employee_id_fkey(first_name,last_name)').order('id', { ascending: false }).limit(150)).catch(() => q(sb.from('hr_requests').select('id,kind,title,status,created_at').order('id', { ascending: false }).limit(150)).catch(() => [])),
        q(sb.from('hr_requisitions').select('id,kind,title,request_id,created_at').order('id', { ascending: false }).limit(100)).catch(() => []),
        q(sb.from('hr_exits').select('id,status,request_id,employee_id,created_at').order('id', { ascending: false }).limit(100)).catch(() => []),
        q(sb.from('hr_disc_cases').select('id,case_no,kind,title,status,created_at').order('id', { ascending: false }).limit(100)).catch(() => []),
        q(sb.from('hr_ann').select('id,title,created_at').order('id', { ascending: false }).limit(100)).catch(() => []),
        q(sb.from('hr_employees').select('id,first_name,last_name,status,emp_no').order('last_name').limit(1000)).catch(() => [])]);
      const linked = new Set([...rqs.map(r => r.request_id), ...exits.map(x => x.request_id)].filter(Boolean));
      const empName = id => nm(emps.find(e => e.id === id));
      this.data = { emps };
      body = list('Requests (leave and others)', plural(reqs.length, 'request'), reqs.filter(r => !linked.has(r.id)).map(r => row(`<b>${esc(r.title || r.kind)}</b>`, `Request ${r.id} · ${esc(nm(r.employee))} · ${fd(r.created_at)}`, chip('muted', r.status), btn(`data-hr="request" data-id="${r.id}" data-x="Request ${r.id}"`, 'Delete'))), 'No requests.')
        + list('Requisitions', plural(rqs.length, 'requisition'), rqs.map(r => row(`<b>${esc(r.title || r.kind)}</b>`, `Requisition ${r.id} · ${fd(r.created_at)}`, '', btn(`data-hr="requisition" data-id="${r.id}" data-x="Requisition ${r.id}"`, 'Delete'))), 'No requisitions.')
        + list('Exits', plural(exits.length, 'exit'), exits.map(x => row(`<b>${esc(empName(x.employee_id))}</b>`, `Exit ${x.id} · ${fd(x.created_at)}`, st(x.status), btn(`data-hr="exit" data-id="${x.id}" data-x="Exit ${x.id}"`, 'Delete'))), 'No exits.', 'Deleting an exit puts the person back to Active if the exit had completed.')
        + list('Disciplinary and grievance cases', plural(cases.length, 'case'), cases.map(c => row(`<b>${esc(c.title || c.kind)}</b>`, `${esc(c.case_no || 'Case ' + c.id)} · ${fd(c.created_at)}`, chip('muted', c.status), btn(`data-hr="case" data-id="${c.id}" data-x="${esc(c.case_no || 'Case ' + c.id)}"`, 'Delete'))), 'No cases.')
        + list('Announcements', plural(anns.length, 'announcement'), anns.map(a => row(`<b>${esc(a.title)}</b>`, fd(a.created_at), '', btn(`data-hr="announcement" data-id="${a.id}" data-x="${esc(a.title)}"`, 'Delete'))), 'No announcements.')
        + list('Test employees', plural(emps.length, 'employee'), emps.map(e => row(`<b>${esc(nm(e))}</b>`, `${esc(e.emp_no || '')} · ${esc(e.status)}`, '', btn(`data-hr="employee" data-id="${e.id}" data-x="${esc(nm(e))}"`, 'Delete if nothing attached'))), 'No employees.',
          'An employee can only be removed when nothing is attached: no requests, leave, documents, cases, crew or people reporting to them.');
    }
    return topbar('Developer tools', 'Reverse test requests and approvals, reset monthly counts and remove test or unused records. Each one asks you to type its number to confirm, and the audit log keeps a full copy.')
      + `<div class="devtabs" role="tablist">${DEV_TABS.map(([k, l, i]) => `<button type="button" data-tab="${k}" class="${t === k ? 'on' : ''}">${ico(i)}${l}</button>`).join('')}</div>` + body;
  },
  bind(main) {
    if (!isSuper()) return;
    const done = msg => { toast(msg); render({ quiet: true }); };
    $$('[data-tab]', main).forEach(b => b.onclick = () => { DEV.tab = b.dataset.tab; go('#/devtools?tab=' + b.dataset.tab); });
    const s = $('#dev-q', main); if (s) { s.oninput = debounce(() => { DEV.q = s.value; render({ quiet: true }).then(() => { const n = $('#dev-q'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 350); }
    const d = this.data || {};
    $$('[data-rev]', main).forEach(b => b.onclick = () => { const j = d.rows.find(x => x.id === +b.dataset.rev);
      devConfirm({ title: `Reverse ${j.job_no}`, expect: j.job_no, submit: 'Reverse & remove', sub: `${esc(j.title || '')}. Stock goes back to how it was before this request, and the request is removed from every list.`,
        run: async c => { await q(sb.rpc('dev_reverse_request', { p_job: j.id, p_confirm: c })); S.stockAt = 0; done(`${j.job_no} reversed`); } }); });
    $$('[data-cnt]', main).forEach(b => b.onclick = () => { const c = d.rows.find(x => x.id === +b.dataset.cnt);
      devConfirm({ title: `Reset ${lineShort(c.department_id)} count`, expect: 'Count ' + c.id, submit: 'Reset count', sub: c.state === 'verified' ? 'It was approved, so the stock change it made is undone first.' : 'Nothing changed stock yet, so it is simply discarded.',
        run: async x => { await q(sb.rpc('dev_reset_count', { p_count: c.id, p_confirm: x })); done('Count reset: Start count is back for that month'); } }); });
    $$('[data-po]', main).forEach(b => b.onclick = () => { const o = d.rows.find(x => x.id === +b.dataset.po);
      devConfirm({ title: `Delete ${poFull(o) || 'draft ' + o.id}`, expect: o.po_no || 'Draft ' + o.id, submit: 'Delete PO', sub: `${esc(o.supplier_name || '')}. Goods received against it come off stock.`,
        run: async x => { await q(sb.rpc('dev_delete_po', { p_id: o.id, p_confirm: x })); done('PO deleted'); } }); });
    $$('[data-sup]', main).forEach(b => b.onclick = () => { const s2 = d.sups.find(x => x.id === +b.dataset.sup);
      devConfirm({ title: `Delete supplier`, expect: s2.name, run: async x => { await q(sb.rpc('dev_delete_supplier', { p_id: s2.id, p_confirm: x })); done('Supplier deleted'); } }); });
    $$('[data-plan]', main).forEach(b => b.onclick = () => { const j = d.rows.find(x => x.id === +b.dataset.plan);
      devConfirm({ title: 'Delete planned job', expect: j.title, run: async x => { await q(sb.rpc('dev_delete_plan_job', { p_id: j.id, p_confirm: x })); S.plan = null; done('Planned job deleted'); } }); });
    $$('[data-so]', main).forEach(b => b.onclick = () => { const r = d.rows.find(x => x.id === +b.dataset.so);
      devConfirm({ title: `Delete ${r.ref}`, expect: r.ref, run: async x => { await q(sb.rpc('dev_delete_signoff', { p_id: r.id, p_confirm: x })); done('Sign-off deleted'); } }); });
    const unused = (kind, id, expect, what) => devConfirm({ title: `Delete ${what}`, expect, sub: 'Only if it was never used. If it has history, Nest says so and nothing changes.',
      run: async x => { await q(sb.rpc('dev_delete_unused', { p_kind: kind, p_id: id, p_confirm: x })); S.stockAt = 0; await loadLookups(); done(`${what[0].toUpperCase() + what.slice(1)} deleted`); } });
    $$('[data-item]', main).forEach(b => b.onclick = () => { const i = d.its.find(x => x.id === +b.dataset.item); unused('item', i.id, i.code || i.name, 'item'); });
    $$('[data-unit]', main).forEach(b => b.onclick = () => { const u = d.units.find(x => x.id === +b.dataset.unit); unused('unit', u.id, u.serial_no, 'serial number'); });
    $$('[data-loc]', main).forEach(b => b.onclick = () => { const l = S.locs.find(x => x.id === +b.dataset.loc); unused('location', l.id, l.name, 'location'); });
    $$('[data-cat]', main).forEach(b => b.onclick = () => { const c = S.cats.find(x => x.id === +b.dataset.cat); unused('category', c.id, c.name, 'category'); });
    $$('[data-su]', main).forEach(b => b.onclick = () => { const p = S.people[b.dataset.su];
      devConfirm({ title: 'Remove sign-up', expect: p.email, run: async x => { await q(sb.rpc('dev_delete_signup', { p_user: p.id, p_confirm: x })); await loadLookups(); done('Sign-up removed'); } }); });
    $$('[data-hr]', main).forEach(b => b.onclick = () => devConfirm({ title: `Delete ${b.dataset.x}`, expect: b.dataset.x,
      run: async x => { await q(sb.rpc('dev_delete_hr', { p_kind: b.dataset.hr, p_id: +b.dataset.id, p_confirm: x })); done('Deleted'); } }));
    // 3.0.5u: PeopleCore reverse
    const hq = $('#dev-hq', main); if (hq) { const f = () => { DEV.hq = hq.value; const t2 = hq.value.trim().toLowerCase(); $$('li[data-s]', main).forEach(li => { li.hidden = !!t2 && !li.dataset.s.includes(t2); }); }; hq.oninput = f; f(); }
    const DH = { plan_reopen: ['Objectives back to draft', 'Back to draft'], plan_delete: ['Delete objectives', 'Delete plan'], appraisal_delete: ['Delete appraisal', 'Delete'], period_delete: ['Delete period and its appraisals', 'Delete'],
      cycle_delete: ['Delete cycle and everything in it', 'Delete'], confirmation_reverse: ['Reverse confirmation', 'Reverse'], promotion_reverse: ['Reverse', 'Reverse'], pip_delete: ['Delete PIP', 'Delete'],
      comp_delete: ['Delete competency assessment', 'Delete'], onb_delete: ['Delete onboarding', 'Delete'], survey_response_delete: ['Delete survey answers', 'Delete'] };
    $$('[data-dh]', main).forEach(b => b.onclick = () => { const k = b.dataset.dh;
      devConfirm({ title: DH[k][0], expect: b.dataset.x, submit: DH[k][1], sub: esc(b.closest('li')?.querySelector('.sub')?.textContent || ''),
        run: async x => { const m = await q(sb.rpc('dev_hr_reverse', { p_kind: k, p_id: +b.dataset.id, p_confirm: x, p_data: {} })); pcInvalidate?.(); done(m || 'Done'); } }); });
    $$('[data-dstep]', main).forEach(b => b.onclick = () => { const at = DEV_STEPS.findIndex(([k]) => k === b.dataset.st); const opts = (at < 0 ? DEV_STEPS : DEV_STEPS.slice(0, at)).map(([k, l]) => opt(k, l, '')).join('');
      modal({ title: `Send ${b.dataset.x}’s appraisal back`, submit: 'Send back', danger: true, sub: 'Scores already given stay, so they can be changed.',
        body: `<label class="f">Back to<select name="to">${opts}</select></label><div class="notice bad devwarn">${ico('wrench')}<span>A full copy is kept in the audit log.</span></div><label class="f">Type <b class="mono">${esc(b.dataset.x)}</b> to confirm<input name="confirm" autocomplete="off" spellcheck="false"></label>`,
        onOpen: d => { const i = $('[name=confirm]', d), s2 = $('button[type=submit]', d); const chk = () => { s2.disabled = i.value.trim().toLowerCase() !== b.dataset.x.trim().toLowerCase(); }; i.oninput = chk; chk(); },
        onSubmit: async x => { const m = await q(sb.rpc('dev_hr_reverse', { p_kind: 'appraisal_step', p_id: +b.dataset.dstep, p_confirm: x.confirm.trim(), p_data: { to: x.to } })); done(m); } }); });
    // 3.0.5u: allowed outside emails
    const fa = $('#dev-allow', main); if (fa) fa.onsubmit = async e => { e.preventDefault(); const em = fa.email.value.trim(); if (!em) return;
      try { await q(sb.rpc('dev_signup_allow', { p_email: em, p_add: true })); done(`${em} can now sign up`); } catch (x) { toast(niceError(x), true); } };
    $$('[data-unallow]', main).forEach(b => b.onclick = async () => { if (!await pcConfirm('Remove this email?', `${esc(b.dataset.unallow)} won’t be able to sign up. An account it already made stays.`, 'Remove')) return;
      try { await q(sb.rpc('dev_signup_allow', { p_email: b.dataset.unallow, p_add: false })); done('Removed'); } catch (x) { toast(niceError(x), true); } });
  }
};
