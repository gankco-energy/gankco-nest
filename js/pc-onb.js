/* GANKCO Nest 3.0.5 — PeopleCore Onboarding & Confirmation, and Promotions & Salary Reviews (stage 3).
   Onboarding checklists, the probation tracker, end-of-probation assessments and confirmation requests;
   promotions and salary reviews through the approval workflow, applied on the effective date. Admin, Supervisor, self service. */
'use strict';

PC_MODS.onb = { name: 'Onboarding & confirmation', icon: 'user', desc: 'Onboarding checklists for new staff, the probation tracker and confirmations.',
  perms: ['view-onboarding', 'manage-onboarding-checklists', 'view-probation-tracker', 'employee-confirmation'], pages: {}, menu: [] };
PC_MODS.promo = { name: 'Promotions & salary reviews', icon: 'up', desc: 'Promotions and salary reviews, their approval and history.',
  perms: ['view-promotion-management-menu', 'promote-staff', 'view-salary-review', 'create-salary-review', 'promotion-report'], pages: {}, menu: [] };
const ON = PC_MODS.onb, PR = PC_MODS.promo;
ON.menu = [['', 'Overview', 'home'], ['onboarding', 'Onboarding', 'user', ['view-onboarding', 'manage-onboarding-checklists']], ['probation', 'Probation tracker', 'clock', ['view-probation-tracker', 'employee-confirmation']],
  ['confirmations', 'Confirmations', 'check', ['employee-confirmation', 'view-approval-requests', 'export-confirmation-requests']], ['checklists', 'Checklists', 'plan', ['manage-onboarding-checklists']], ['settings', 'Settings', 'gear', ['view-confirmation-settings']]];
PR.menu = [['', 'Overview', 'home', ['view-promotion-management-menu', 'promotion-report']], ['history', 'Promotions & reviews', 'up', ['view-promotion-management-menu', 'promote-staff', 'view-salary-review']],
  ['settings', 'Settings', 'gear', ['add-promotion-request-policy', 'manage-salary-review-policy', 'view-promotion-request-policy']]];
['onb', 'promo'].forEach(k => { if (!PC_SUP_MENU.some(m => m[0] === k)) PC_SUP_MENU.splice(PC_SUP_MENU.findIndex(m => m[0] === 'exit'), 0, k === 'onb' ? ['onb', 'Onboarding & probation', 'user'] : ['promo', 'Promotions', 'up']); });
if (typeof HR_SOON !== 'undefined') {
  HR_SOON.onboarding = ['Onboarding', 'Your onboarding checklist, your probation and your confirmation.', 'Ready'];
  HR_SOON.promotion = ['Promotion', 'Your promotions and salary reviews once they are applied.', 'Ready'];
}
const ON_OWN = { hr: 'HR', manager: 'Line manager', employee: 'New starter' };
const CF_DEC = { confirm: ['ok', 'Confirm'], extend: ['pending', 'Extend probation'], not_confirm: ['rejected', 'Do not confirm'] };
const CF_ST = { pending: ['pending', 'Waiting for approval'], approved: ['ok', 'Approved'], rejected: ['rejected', 'Not approved'], cancelled: ['muted', 'Cancelled'] };
const PR_ST = { pending: ['pending', 'Waiting for approval'], approved: ['out', 'Approved · due'], applied: ['ok', 'Applied'], rejected: ['rejected', 'Not approved'], cancelled: ['muted', 'Cancelled'] };
const onCfg = () => hrSettings().onb || {};
const onDays = d => d == null ? '' : d < 0 ? `${plural(-d, 'day')} overdue` : d === 0 ? 'today' : `in ${plural(d, 'day')}`;
const onProbChip = r => r.pending ? pcChip('pending', 'Confirmation waiting') : r.days_left < 0 ? pcChip('rejected', 'Overdue') : r.days_left <= 30 ? pcChip('pending', 'Due soon') : pcChip('muted', 'On probation');

// ---------------------------------------------------------------- one onboarding: tasks grouped by owner
function onCard(o, ctx) {
  const me = hrMe()?.id; const done = o.tasks.filter(t => t.done_at).length; const pct = o.tasks.length ? Math.round(done / o.tasks.length * 100) : 0;
  const can = t => ctx === 'admin' || (t.owner === 'employee' && o.employee_id === me) || (t.owner === 'manager' && ctx === 'sup');
  const groups = ['hr', 'manager', 'employee'].map(k => [k, o.tasks.filter(t => t.owner === k)]).filter(([, ts]) => ts.length);
  return `<section class="panel on-card" data-onb="${o.id}"><header>${pcPerson(hrCard(o.employee_id) || o, `Started ${fd(o.start_date)}${o.manager ? ' · Line manager: ' + esc(o.manager) : ''}`)}
      <span class="right">${pcRing(pct, 44)}${pcChip(o.status === 'active' ? 'pending' : o.status === 'completed' ? 'ok' : 'muted', o.status === 'active' ? `${done} of ${o.tasks.length} done` : o.status === 'completed' ? 'Completed' : 'Cancelled')}
        ${ctx === 'admin' ? `<select class="inline mini" data-onact="${o.id}" aria-label="Actions"><option value="">Actions…</option>${opt('add', 'Add a task', '')}${o.status === 'active' ? opt('complete', 'Mark as completed', '') + opt('cancel', 'Cancel', '') : opt('reopen', 'Reopen', '')}${pcCan('manage-onboarding-checklists') ? opt('delete', 'Delete', '') : ''}</select>` : ''}</span></header>
    <div class="on-groups">${groups.map(([k, ts]) => `<div class="on-grp"><h3>${esc(ctx === 'self' && k === 'employee' ? 'You' : ON_OWN[k])}</h3><ul class="on-tasks">${ts.map(t => { const late = !t.done_at && t.due_date && hrDays(t.due_date) < 0;
      return `<li class="${t.done_at ? 'done' : late ? 'late' : ''}"><label><input type="checkbox" data-task="${t.id}" ${t.done_at ? 'checked' : ''} ${can(t) && o.status !== 'cancelled' ? '' : 'disabled'}><span><b>${esc(t.title)}</b>
        ${t.note ? `<small>${esc(t.note)}</small>` : ''}<small class="muted">${t.done_at ? `Done by ${esc(t.done_by_name || '')} · ${fd(t.done_at)}${t.done_note ? ' · ' + esc(t.done_note) : ''}` : t.due_date ? `Due ${fd(t.due_date)}${late ? ' · late' : ''}` : ''}</small></span></label>${ctx === 'admin' && o.status !== 'cancelled' && pcCan('view-onboarding', 'manage-onboarding-checklists')
        ? `<button type="button" class="btn small pf-ib on-tedit" data-tedit="${t.id}" data-title="${esc(t.title)}" data-owner="${esc(t.owner)}" data-due="${esc(t.due_date || '')}" data-note="${esc(t.note || '')}" data-n="${o.tasks.length}" title="Edit or remove this task" aria-label="Edit task">${ico('edit')}</button>` : ''}</li>`; }).join('')}</ul></div>`).join('')}</div></section>`;
}
function onBindCards(main) {
  // 3.0.5u: HR edits or removes a task in one person's onboarding
  main.addEventListener('click', e => { const b = e.target.closest('[data-tedit]'); if (!b) return; const x = b.dataset;
    pcEdit({ title: 'Edit task', wide: false, fields: [{ k: 'title', l: 'Task', req: true }, { k: 'owner', l: 'Done by', t: 'radio', opts: Object.entries(ON_OWN) }, { k: 'due_date', l: 'Due', t: 'date', hint: 'Leave empty for no due date.' }, { k: 'note', l: 'Note', t: 'textarea', rows: 2 }],
      vals: { title: x.title, owner: x.owner, due_date: x.due, note: x.note },
      save: async v => { await q(sb.rpc('hr_onb_task', { p_id: +x.tedit, p_action: 'edit', p_data: { title: v.title, owner: v.owner, due_date: v.due_date || '', note: v.note || '' } })); toast('Task updated'); render({ quiet: true }); },
      del: +x.n > 1 ? { label: 'Remove task', title: 'Remove this task?', yes: 'Remove task', ok: 'Task removed', text: `“${esc(x.title)}” comes off this person’s onboarding only. The checklist doesn’t change.`,
        run: () => q(sb.rpc('hr_onb_task', { p_id: +x.tedit, p_action: 'delete', p_data: {} })) } : null }); });
  main.addEventListener('change', async e => {
    const t = e.target.closest('[data-task]'); if (t) { await pcTry(() => q(sb.rpc('hr_onb_task', { p_id: +t.dataset.task, p_action: t.checked ? 'done' : 'undo' })), t.checked ? 'Done' : 'Reopened'); return render({ quiet: true }); }
    const a = e.target.closest('[data-onact]'); if (!a || !a.value) return; const id = +a.dataset.onact, act = a.value; a.value = '';
    if (act === 'add') return pcEdit({ title: 'Add a task', wide: false, fields: [{ k: 'title', l: 'Task', req: true }, { k: 'owner', l: 'Done by', t: 'radio', opts: Object.entries(ON_OWN), def: 'hr' }, { k: 'due_date', l: 'Due', t: 'date' }],
      save: async v => { await q(sb.rpc('hr_onb_action', { p_id: id, p_action: 'add_task', p_data: v })); toast('Task added'); render({ quiet: true }); } });
    if (act === 'delete' && !await pcConfirm('Delete this onboarding?', 'Its tasks are deleted too.', 'Delete')) return;
    await pcTry(() => q(sb.rpc('hr_onb_action', { p_id: id, p_action: act })), { complete: 'Completed', cancel: 'Cancelled', reopen: 'Reopened', delete: 'Deleted' }[act]); render({ quiet: true });
  });
}

// ---------------------------------------------------------------- confirmation form (line manager or HR)
async function onConfirmForm(r) {
  const a = r.assessment; const rec = a?.recommendation && CF_DEC[a.recommendation] ? a.recommendation : 'confirm';
  return pcEdit({ title: 'Recommend confirmation', sub: `${esc(r.name)} · probation ends ${fd(r.due)}${a?.score != null ? ` · end-of-probation score ${pfPct(a.score)}` : ' · no end-of-probation assessment yet'}`, wide: false, submit: 'Send for approval',
    fields: [{ k: 'decision', l: 'Recommendation', t: 'radio', req: true, opts: Object.entries(CF_DEC).map(([k, v]) => [k, v[1]]) },
      { k: 'extend_months', l: 'Extend by (months)', t: 'number', min: 1, max: 12, req: true, show: v => v.decision === 'extend' },
      { k: 'effective_date', l: 'Confirmed from', t: 'date', show: v => (v.decision || rec) === 'confirm', hint: 'Usually the day probation ends.' },
      { k: 'note', l: 'Reason', t: 'textarea', req: false, ph: 'Required to extend or not confirm' }],
    vals: { decision: rec, extend_months: 3, effective_date: r.due && hrDays(r.due) > 0 ? r.due : localISO(0) },
    save: async v => { await q(sb.rpc('hr_confirm_raise', { p: { ...v, employee_id: r.employee_id } })); toast('Sent through the Confirmation workflow'); render({ quiet: true }); } });
}
function onProbTable(id, rows, ctx) {
  const base = ctx === 'admin' ? '#/people/admin/perf/appraisals' : '#/people/sup/perf/appraisal';
  return pcTable(id, [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, esc(r.emp_no || '') + (ctx === 'admin' && r.manager ? ' · ' + esc(r.manager) : '')) },
    { l: 'Department', v: r => hrUnit(r.unit_id)?.name || '', f: r => esc(hrUnit(r.unit_id)?.name || '—') },
    { l: 'Started', v: r => r.start_date, f: r => fd(r.start_date) }, { l: 'Probation ends', v: r => r.due, f: r => `${fd(r.due)}<br><small class="muted">${onDays(r.days_left)}</small>` },
    { l: 'Assessment', v: r => r.assessment?.score ?? -1, f: r => r.assessment ? (r.assessment.score != null ? `<b>${pfPct(r.assessment.score)}</b> ${r.assessment.recommendation && CF_DEC[r.assessment.recommendation] ? pcChip(CF_DEC[r.assessment.recommendation][0], CF_DEC[r.assessment.recommendation][1]) : ''}` : pcChip(...PA_ST[r.assessment.status])) : '<span class="muted">Not started</span>' },
    { l: 'Status', v: r => r.pending ? 0 : r.days_left, f: r => onProbChip(r) + (r.pending?.step ? `<br><small class="muted">with ${esc(r.pending.step)}</small>` : ''), csv: r => r.pending ? 'Confirmation waiting' : onDays(r.days_left) },
    { l: '', cls: 'num', sort: false, csv: false, f: r => `<span class="pc-acts">${ctx === 'admin' && !r.assessment && pcCan('create-performance-review', 'create-appraisal-period', 'view-probation-tracker') ? `<button class="btn small" data-assess="${r.employee_id}">Start assessment</button>` : ''}
        ${r.assessment && ctx === 'admin' ? `<a class="btn small" href="#/people/admin/perf/appraisals?p=${r.assessment.period_id}">Assessment</a>` : r.assessment && ctx === 'sup' ? `<a class="btn small" href="${base}/${r.assessment.id}">Assessment</a>` : ''}
        ${!r.pending && (ctx === 'admin' ? pcCan('employee-confirmation') : r.direct) ? `<button class="btn small primary" data-confirm="${r.employee_id}">Recommend</button>` : ''}
        ${r.pending && (r.pending.mine || (ctx === 'admin' && pcCan('employee-confirmation'))) ? `<button class="btn small" data-cfw="${r.pending.id}" data-name="${esc(r.name)}">${ico('undo')}Withdraw</button>` : ''}</span>` }], rows,
    { noun: 'employee', csv: 'Probation', empty: ctx === 'admin' ? 'Nobody is on probation.' : 'Nobody in your team is on probation.',
      filters: [{ k: 's', l: 'Status', opts: [['soon', 'Due in 30 days'], ['over', 'Overdue'], ['wait', 'Confirmation waiting']], test: (r, v) => v === 'wait' ? !!r.pending : v === 'over' ? r.days_left < 0 : r.days_left <= 30 }] });
}
// 3.0.5u: past confirmations from before Nest: HRIS dates, a “Confirmed” line in the job history, and onboarding marked done
const CF_PAST_COLS = [{ k: 'who', l: 'who', w: 26 }, { k: 'start_date', l: 'start_date', w: 13 }, { k: 'probation_months', l: 'probation_months', w: 17 }, { k: 'confirmed_on', l: 'confirmed_on', w: 14 }];
const CF_PAST_NOTES = [['who', 'Staff ID, work email or full name.'], ['start_date', 'Optional. Their start date. Empty keeps what HRIS has.'], ['probation_months', 'Optional. Empty keeps what HRIS has.'], ['confirmed_on', 'The day they were confirmed. Dates as YYYY-MM-DD or DD/MM/YYYY.']];
function onPastUpload() {
  return pcUploadDlg({ title: 'Upload past confirmations', sub: 'For staff confirmed before Nest. Their HRIS record gets the dates, the job history gets a “Confirmed” line, and they are marked as onboarded.', notes: CF_PAST_NOTES,
    template: () => pcXlsx('Past confirmations template.xlsx', CF_PAST_COLS, [{ who: 'GES0042026', start_date: '2023-02-01', probation_months: 6, confirmed_on: '2023-08-01' }], { sheet: 'Confirmations', notes: CF_PAST_NOTES }),
    run: rows => q(sb.rpc('hr_confirm_historic_upload', { p_rows: rows })), done: r => `${plural(r.added, 'person', 'people')} updated` });
}
// 3.0.5u: withdraw a confirmation recommendation that is still waiting
async function onWithdraw(id, name) {
  return pcEdit({ title: 'Withdraw the recommendation?', sub: `For ${esc(name)}. The approval stops and you can recommend again.`, wide: false, submit: 'Withdraw', danger: true,
    fields: [{ k: 'note', l: 'Why (optional)', t: 'textarea', rows: 2 }],
    save: async v => { await q(sb.rpc('hr_confirm_withdraw', { p_id: id, p_note: v.note || null })); toast('Recommendation withdrawn'); render({ quiet: true }); } });
}
function onBindProb(main, rows) {
  main.addEventListener('click', async e => {
    const w = e.target.closest('[data-cfw]'); if (w) return onWithdraw(+w.dataset.cfw, w.dataset.name);
    const c = e.target.closest('[data-confirm]'); if (c) return onConfirmForm(rows().find(r => r.employee_id === +c.dataset.confirm));
    const a = e.target.closest('[data-assess]'); if (a) { const r = rows().find(x => x.employee_id === +a.dataset.assess);
      if (!await pcConfirm('Start the end-of-probation assessment?', `${esc(r.name)} does a self-appraisal, then ${esc(r.manager || 'their line manager')} scores it and recommends a confirmation.`, 'Start', false)) return;
      await pcTry(() => q(sb.rpc('hr_probation_assess', { p_emp: r.employee_id })), 'Assessment opened'); render({ quiet: true }); }
  });
}

// ================================================================ Admin: Onboarding & confirmation
ON.pages[''] = {
  async load() {
    const o = await q(sb.rpc('hr_onb_overview'));
    return topbar('Onboarding & confirmation', 'New staff settling in, probation and confirmations.') +
      pcKpis([[o.onboarding, 'Being onboarded', '', '#/people/admin/onb/onboarding'], [o.tasks_late, 'Onboarding tasks late', o.tasks_late ? 'warn' : '', '#/people/admin/onb/onboarding'],
        [o.probation, 'On probation', '', '#/people/admin/onb/probation'], [o.due_30, 'Probation ends in 30 days', o.due_30 ? 'warn' : '', '#/people/admin/onb/probation'], [o.overdue, 'Probation overdue', o.overdue ? 'warn' : ''],
        [o.pending, 'Confirmations waiting', o.pending ? 'warn' : '', '#/people/admin/onb/confirmations'], [o.confirmed_year, 'Confirmed this year']]) +
      `<section class="panel"><div class="body on-how"><div><b>1 · Onboarding</b><span>When HR adds someone, their checklist starts: tasks for HR, the line manager and the new starter.</span></div>
        <div><b>2 · Probation</b><span>${esc(String(onCfg().probation_months || 6))} months by default. HR and the line manager are reminded ${esc(String(onCfg().remind_days || 30))} days before it ends.</span></div>
        <div><b>3 · Assessment</b><span>The end-of-probation assessment runs in the Probation appraisal cycle: self-appraisal, then the line manager’s scores and recommendation.</span></div>
        <div><b>4 · Confirmation</b><span>Confirm, extend or do not confirm goes through the Confirmation workflow, then updates the record. No letters.</span></div></div></section>`;
  }
};
ON.pages.onboarding = { perms: ['view-onboarding', 'manage-onboarding-checklists'],
  async load(rest, params) { params = pfP(params);
    const list = await q(sb.rpc('hr_onb_list', { p_scope: 'admin' })); const st = params.s || 'active'; const show = list.filter(o => st === 'all' || o.status === st);
    return topbar('Onboarding', 'Checklists for new staff. Tick tasks off as they are done.', pcCan('view-onboarding', 'manage-onboarding-checklists') ? `<button class="btn primary" id="onnew">${ico('plus')}Start onboarding</button>` : '') +
      `<nav class="pc-tabs">${[['active', 'In progress'], ['completed', 'Completed'], ['all', 'All']].map(([k, l]) => `<a href="#/people/admin/onb/onboarding?s=${k}" class="${st === k ? 'on' : ''}">${l} (${k === 'all' ? list.length : list.filter(o => o.status === k).length})</a>`).join('')}</nav>` +
      (show.length ? show.map(o => onCard(o, 'admin')).join('') : '<section class="panel"><div class="pc-empty-hero"><b>Nobody here</b>Onboarding starts by itself when HR adds a new employee, or start one here.</div></section>');
  },
  bind(main) {
    onBindCards(main);
    const b = $('#onnew', main); if (b) b.onclick = async () => { const tpl = await q(sb.from('hr_onb_templates').select('*').eq('active', true).order('name'));
      pcEdit({ title: 'Start onboarding', wide: false, fields: [{ k: 'emp', l: 'Employee', t: 'select', req: true, opts: v => pcPeopleOpts(v) }, { k: 'tpl', l: 'Checklist', t: 'select', req: true, blank: false, opts: tpl.map(t => [t.id, t.name + (t.is_default ? ' (default)' : '')]) }, { k: 'start', l: 'Start date', t: 'date', hint: 'Leave empty to use their start date.' }],
        vals: { tpl: tpl.find(t => t.is_default)?.id }, save: async v => { await q(sb.rpc('hr_onb_start', { p_emp: +v.emp, p_template: +v.tpl, p_start: v.start || null })); toast('Onboarding started: they and their line manager are told'); render({ quiet: true }); } }); };
  }
};
ON.pages.probation = { perms: ['view-probation-tracker', 'employee-confirmation'],
  async load() { const rows = this.rows = await q(sb.rpc('hr_probation_list', { p_scope: 'admin' }));
    return topbar('Probation tracker', 'Everyone on probation, when it ends, their end-of-probation assessment and confirmation.') + onProbTable('onprob', rows, 'admin'); },
  bind(main) { onBindProb(main, () => this.rows); }
};
ON.pages.confirmations = { perms: ['employee-confirmation', 'view-approval-requests', 'export-confirmation-requests'],
  async load() {
    const rows = await q(sb.from('hr_confirmations').select('*').order('created_at', { ascending: false }));
    return topbar('Confirmations', 'Recommendations to confirm, extend probation or not confirm, and where each one is.') +
      pcTable('oncf', [{ l: 'Employee', v: r => pcName(r.employee_id), f: r => pcPerson(hrCard(r.employee_id) || { name: pcName(r.employee_id) }, `Raised by ${esc(r.raised_by_name || '')} · ${fd(r.created_at)}`) },
        { l: 'Recommendation', v: r => r.decision, f: r => pcChip(...CF_DEC[r.decision]) + (r.extend_months ? ` <small>${plural(r.extend_months, 'month')}</small>` : ''), csv: r => CF_DEC[r.decision][1] },
        { l: 'Probation ended', v: r => r.due_date, f: r => fd(r.due_date) }, { l: 'Score', cls: 'num', v: r => +r.score || -1, f: r => r.score != null ? pfPct(r.score) : '—' }, { l: 'Reason', v: r => r.note || '' , f: r => esc(r.note || '') },
        { l: 'Status', v: r => r.status, f: r => pcChip(...CF_ST[r.status]) + (r.historic ? ' ' + pcChip('muted', 'Past record') : ''), csv: r => CF_ST[r.status][1] },
        { l: '', cls: 'num', sort: false, csv: false, f: r => r.status === 'pending' && (pcCan('employee-confirmation') || r.raised_by === hrMe()?.id) ? `<button class="btn small" data-cfw="${r.id}" data-name="${esc(pcName(r.employee_id))}">${ico('undo')}Withdraw</button>` : '' }], rows,
      { noun: 'confirmation', csv: pcCan('export-confirmation-requests') ? 'Confirmations' : null, empty: 'No confirmations yet.', actions: pcCan('employee-confirmation') ? `<button class="btn small" type="button" id="cfpast">${ico('up')}Upload past records</button>` : '', 
        filters: [{ k: 's', l: 'Status', opts: Object.entries(CF_ST).map(([k, v]) => [k, v[1]]), test: (r, v) => r.status === v }] });
  },
  bind(main) {
    main.addEventListener('click', e => { const w = e.target.closest('[data-cfw]'); if (w) onWithdraw(+w.dataset.cfw, w.dataset.name); });
    const u = $('#cfpast', main); if (u) u.onclick = () => onPastUpload();
  }
};
ON.pages.checklists = { perms: ['manage-onboarding-checklists'],
  async load() {
    const tpl = this.tpl = await q(sb.from('hr_onb_templates').select('*').order('name'));
    return topbar('Onboarding checklists', 'The tasks each new starter goes through. The default checklist starts by itself when HR adds someone.', `<button class="btn primary" data-tpl="new">${ico('plus')}New checklist</button>`) +
      tpl.map(t => `<section class="panel"><header><h2>${esc(t.name)}</h2>${t.is_default ? pcChip('ok', 'Default') : ''}${t.active ? '' : pcChip('muted', 'Off')}<span class="meta">${esc(t.description || '')}</span><span class="right"><button class="btn small" data-tpl="${t.id}">Edit</button></span></header>
        <ul class="list">${t.tasks.map(x => `<li><div class="main"><div class="name">${esc(x.title)}</div><div class="sub">${esc(ON_OWN[x.owner] || x.owner)} · day ${+x.days || 0}${x.note ? ' · ' + esc(x.note) : ''}</div></div></li>`).join('')}</ul></section>`).join('');
  },
  bind(main) {
    main.addEventListener('click', e => { const b = e.target.closest('[data-tpl]'); if (!b) return; const t = b.dataset.tpl === 'new' ? { tasks: [{ owner: 'hr', days: 0 }], active: true } : this.tpl.find(x => x.id === +b.dataset.tpl);
      const row = x => `<div class="on-trow"><input data-t="title" placeholder="Task" value="${esc(x.title || '')}"><select data-t="owner">${Object.entries(ON_OWN).map(([k, l]) => opt(k, l, x.owner || 'hr')).join('')}</select><span class="pc-money"><i>Day</i><input type="number" min="0" data-t="days" value="${+x.days || 0}"></span><input data-t="note" placeholder="Note" value="${esc(x.note || '')}"><button type="button" class="btn small pf-ib" data-tdel>${ico('trash')}</button></div>`;
      pcEdit({ title: t.id ? 'Edit checklist' : 'New checklist', wide: true,
        fields: [{ k: 'name', l: 'Name', req: true }, { k: 'description', l: 'For whom' }, { k: 'tasks', l: 'Tasks (day = days after the start date)', t: 'html', html: `<div class="on-trows">${t.tasks.map(row).join('')}</div><button type="button" class="btn small" data-tadd>${ico('plus')}Add a task</button>` },
          { k: 'is_default', l: 'Default checklist', t: 'switch', hint: 'Starts by itself for new staff.' }, { k: 'active', l: 'In use', t: 'switch' }], vals: t,
        onOpen: d => d.addEventListener('click', e => { if (e.target.closest('[data-tadd]')) $('.on-trows', d).insertAdjacentHTML('beforeend', row({})); const x = e.target.closest('[data-tdel]'); if (x && $$('.on-trow', d).length > 1) x.closest('.on-trow').remove(); }),
        save: async (v, d) => { const tasks = $$('.on-trow', d).map(r => ({ title: $('[data-t=title]', r).value.trim(), owner: $('[data-t=owner]', r).value, days: +$('[data-t=days]', r).value || 0, note: $('[data-t=note]', r).value.trim() })).filter(x => x.title);
          await q(sb.rpc('hr_onb_template_save', { p: { ...v, id: t.id || null, tasks } })); toast('Saved'); render({ quiet: true }); },
        del: t.id ? { label: 'Delete checklist', title: 'Delete this checklist?', yes: 'Delete checklist', ok: 'Checklist deleted',
          text: `“${esc(t.name)}” is removed. People already onboarding with it keep their tasks.${t.is_default ? ' It is the default, so choose another default checklist afterwards.' : ''}`,
          run: () => q(sb.rpc('hr_onb_template_delete', { p_id: t.id })) } : null }); });
  }
};
ON.pages.settings = { perms: ['view-confirmation-settings'],
  async load() { this.surveys = await q(sb.from('hr_surveys').select('id,title').neq('status', 'closed').order('title')).catch(() => []); this.F = [{ k: 'probation_months', l: 'Probation length (months)', t: 'number', min: 1, max: 24, hint: 'For new staff when HR doesn’t set their own.' },
      { k: 'remind_days', l: 'Remind HR and the line manager this many days before probation ends', t: 'number', min: 1, max: 90 },
      { k: 'auto_start', l: 'Start onboarding by itself when HR adds someone', t: 'switch', hint: 'Uses the default checklist.' },
      { k: 'survey_id', l: 'Onboarding survey', t: 'select', blank: 'No survey', opts: this.surveys.map(x => [x.id, x.title]) },
      { k: 'survey_days', l: 'Send it this many days after they start', t: 'number', min: 1, max: 365 }];
    return topbar('Onboarding & confirmation settings', 'Who approves confirmations is set in Approval workflow (Confirmation Workflow).', `<a class="btn" href="#/people/admin/flow">Approval workflow</a>`) +
      `<section class="panel"><div class="body"><form id="onset">${pcForm(this.F, onCfg())}<button class="btn primary">Save</button></form></div></section>`; },
  bind(main) { const f = $('#onset', main); f.onsubmit = async e => { e.preventDefault(); const v = pcRead(f, this.F); v.survey_id = v.survey_id ? +v.survey_id : null; await pcTry(() => q(sb.rpc('hr_onb_settings_save', { p: v })), 'Saved'); S.settings.people = { ...(S.settings.people || {}), onb: { ...onCfg(), ...v } }; }; }
};

// ================================================================ self service and Supervisor: onboarding and probation
PC_SELF.onboarding = {
  async load() {
    const me = hrMe(); if (!me) return topbar('Onboarding') + '<div class="notice">HR hasn’t added your PeopleCore record yet.</div>';
    const [list, emp] = await Promise.all([q(sb.rpc('hr_onb_list', { p_scope: 'mine' })), q(sb.from('hr_employees').select('start_date,probation_months,confirmation_due,confirmed_on').eq('id', me.id).maybeSingle())]);
    const conf = emp?.confirmed_on ? `<div class="notice ok">Your appointment was confirmed on <b>${fd(emp.confirmed_on)}</b>.</div>`
      : emp?.confirmation_due ? `<section class="panel on-prob"><div class="body"><div><small>Probation</small><b>Ends ${fd(emp.confirmation_due)}</b><span>${onDays(hrDays(emp.confirmation_due))} · ${plural(emp.probation_months || 0, 'month')}</span></div>
          <p>Near the end, HR opens your end-of-probation assessment under Performance. Your line manager then recommends your confirmation.</p></div></section>` : '';
    return topbar('Onboarding', 'Your onboarding checklist and your probation.') + conf + (list.length ? list.map(o => onCard(o, 'self')).join('') : '<section class="panel"><div class="pc-empty-hero"><b>No onboarding checklist</b>New staff get one when they join.</div></section>');
  },
  bind(main) { onBindCards(main); }
};
PC_SUP.onb = {
  async load() {
    const [list, prob] = await Promise.all([q(sb.rpc('hr_onb_list', { p_scope: 'team' })), q(sb.rpc('hr_probation_list', { p_scope: 'team' }))]); this.rows = prob;
    const act = list.filter(o => o.status === 'active');
    return topbar('Onboarding & probation', 'Your new starters’ tasks, and your team on probation.') +
      `<h2 class="pc-h2">On probation <small class="muted">· recommend a confirmation when probation ends</small></h2>` + onProbTable('onprobt', prob, 'sup') +
      (act.length ? `<h2 class="pc-h2">Onboarding in progress</h2>` + act.map(o => onCard(o, 'sup')).join('') : '');
  },
  bind(main) { onBindCards(main); onBindProb(main, () => this.rows); }
};

// ================================================================ Promotions & salary reviews
async function prForm(emp, kind = 'promotion') {
  const money = pcAcc().perms.includes('view-salary-amounts') || pcAcc().perms.includes('view-employee-private-data') || pcAcc().super;
  const e = emp ? hrCard(emp) : null;
  const fields = [...(emp ? [] : [{ k: 'employee_id', l: 'Employee', t: 'select', req: true, opts: v => pcPeopleOpts(v) }]),
    { k: 'kind', l: 'What', t: 'radio', opts: [['promotion', 'Promotion'], ['salary_review', 'Salary review']], def: kind },
    { k: 'to_job_role_id', l: 'New job role', t: 'select', opts: v => pcJobOpts(v, null, 'No change'), show: v => (v.kind || kind) === 'promotion' },
    { k: 'to_grade_id', l: 'New paygrade', t: 'select', opts: v => pcGradeOpts(v, 'No change') },
    { k: 'to_unit_id', l: 'New department', t: 'select', opts: v => pcDeptOpts(v, 'No change'), show: v => (v.kind || kind) === 'promotion' },
    ...(money ? [{ k: 'to_salary', l: 'Proposed annual salary', t: 'money', hint: 'Only people allowed to see pay can see this.' }] : []),
    { k: 'effective_date', l: 'Effective from', t: 'date', req: true }, { k: 'reason', l: 'Why', t: 'textarea', req: true }];
  return pcEdit({ title: 'Recommend a promotion or salary review', sub: `${e ? esc(e.name) + ' · now ' + esc(e.title || '') + ' · ' : ''}It goes through the Promotion & Salary Review workflow. ${e ? esc(e.name.split(' ')[0]) : 'They'} isn’t told until it is applied.`, wide: true, fields,
    vals: { kind, effective_date: localISO(0) },
    save: async v => { const p = { ...v, employee_id: emp || +v.employee_id }; Object.keys(p).forEach(k => p[k] === null && delete p[k]);
      await q(sb.rpc('hr_promo_raise', { p })); toast('Sent for approval'); render({ quiet: true }); } });
}
const prRows = (id, rows, o = {}) => pcTable(id, [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, esc(r.emp_no || '')) },
    { l: 'Type', v: r => r.kind, f: r => r.kind === 'promotion' ? pcChip('out', 'Promotion') : pcChip('muted', 'Salary review'), csv: r => r.kind === 'promotion' ? 'Promotion' : 'Salary review' },
    { l: 'From', v: r => r.from_job || '', f: r => `${esc(r.from_job || '—')}<br><small class="muted">${esc(r.from_grade || '')}</small>` },
    { l: 'To', v: r => r.to_job || '', f: r => `<b>${esc(r.to_job || '—')}</b><br><small class="muted">${esc(r.to_grade || '')}${r.to_unit && r.to_unit !== r.from_unit ? ' · ' + esc(r.to_unit) : ''}</small>` },
    ...(rows.some(r => r.money) ? [{ l: 'Annual salary', cls: 'num', v: r => +r.to_salary || 0, f: r => r.to_salary != null ? `${pcMoney(r.to_salary)}${r.from_salary ? `<br><small class="muted">was ${pcMoney(r.from_salary)}</small>` : ''}` : '—', csv: r => r.to_salary ?? '' }] : []),
    { l: 'Effective', v: r => r.effective_date, f: r => fd(r.effective_date) }, { l: 'Appraisal', cls: 'num', v: r => +r.score || -1, f: r => r.score != null ? pfPct(r.score) : '—' },
    { l: 'Status', v: r => r.status, f: r => pcChip(...PR_ST[r.status]) + (r.step ? `<br><small class="muted">with ${esc(r.step)}</small>` : ''), csv: r => PR_ST[r.status][1] },
    { l: '', cls: 'num', sort: false, csv: false, f: r => ['pending', 'approved'].includes(r.status) && (r.mine_raised || o.admin) ? `<button class="btn small" data-prcancel="${r.id}">Cancel</button>` : '' }], rows,
  { noun: 'request', csv: o.csv, empty: o.empty || 'Nothing yet.', filters: [{ k: 'k', l: 'Type', opts: [['promotion', 'Promotion'], ['salary_review', 'Salary review']], test: (r, v) => r.kind === v }, { k: 's', l: 'Status', opts: Object.entries(PR_ST).map(([k, v]) => [k, v[1]]), test: (r, v) => r.status === v }], actions: o.actions });
function prBind(main) {
  main.addEventListener('click', async e => { const c = e.target.closest('[data-prcancel]'); if (!c) return;
    pcEdit({ title: 'Cancel this request?', wide: false, submit: 'Cancel request', danger: true, fields: [{ k: 'n', l: 'Why', t: 'textarea' }], save: async v => { await q(sb.rpc('hr_promo_cancel', { p_id: +c.dataset.prcancel, p_note: v.n })); toast('Cancelled'); render({ quiet: true }); } }); });
}
PR.pages[''] = { perms: ['view-promotion-management-menu', 'promotion-report'],
  async load() {
    const o = await q(sb.rpc('hr_promo_overview')); const y = new Date().getFullYear();
    return topbar('Promotions & salary reviews', 'Promotions and salary reviews: raised by line managers or HR, approved through the workflow, applied on the effective date.', pcCan('promote-staff', 'create-salary-review') ? `<button class="btn primary" id="prnew">${ico('plus')}Promote or review</button>` : '') +
      pcKpis([[o.promotions_year, `Promotions in ${y}`], [o.reviews_year, `Salary reviews in ${y}`], [o.people_year, 'Employees impacted'], [o.pending, 'Waiting for approval', o.pending ? 'warn' : '', '#/people/admin/promo/history'], [o.due_month, 'Due this month']]) +
      `<div class="pc-grid2"><section class="panel"><header><h2>Promotions by department</h2><span class="meta">${y}</span></header>${pcBars(o.by_unit, { pct: true })}</section>
        <section class="panel"><header><h2>How it works</h2></header><div class="body on-how one"><div><b>Raise</b><span>The line manager (from Supervisor → Promotions) or HR. The last appraisal score is attached.</span></div><div><b>Approve</b><span>Line manager → H.O.D → HR → MD/CEO, as set in Approval workflow.</span></div><div><b>Apply</b><span>On the effective date: job role, paygrade, department and salary change and the job history is written. Then the employee is told.</span></div></div></section></div>`;
  },
  bind(main) { const b = $('#prnew', main); if (b) b.onclick = () => prForm(null); }
};
PR.pages.history = { perms: ['view-promotion-management-menu', 'promote-staff', 'view-salary-review'],
  async load() { const rows = await q(sb.rpc('hr_promo_list', { p_scope: 'admin' }));
    return topbar('Promotions & salary reviews', 'Every promotion and salary review, where it is, and when it applies.', (pcCan('promote-staff', 'create-salary-review') ? `<button class="btn" id="prpast">${ico('up')}Upload past records</button>` : '') + (pcCan('create-salary-review') ? `<button class="btn" id="prbulk">${ico('up')}Salary reviews after a cycle</button>` : '') + (pcCan('promote-staff', 'create-salary-review') ? `<button class="btn primary" id="prnew">${ico('plus')}Promote or review</button>` : '')) +
      prRows('prall', rows, { admin: true, csv: 'Promotions and salary reviews', empty: 'No promotions or salary reviews yet.' }); },
  bind(main) { prBind(main); const b = $('#prnew', main); if (b) b.onclick = () => prForm(null); const k = $('#prbulk', main); if (k) k.onclick = prBulk; const pp = $('#prpast', main); if (pp) pp.onclick = prPastUpload; }
};
// 3.0.5u: past promotions and salary reviews: written as applied, with a job history line. Today’s record isn’t changed.
function prPastUpload() {
  const money = pcAcc().perms.includes('view-salary-amounts') || pcAcc().perms.includes('view-employee-private-data') || pcAcc().super;
  const cols = [{ k: 'who', l: 'who', w: 24 }, { k: 'kind', l: 'kind', w: 14 }, { k: 'effective_date', l: 'effective_date', w: 14 }, { k: 'from_job_role', l: 'from_job_role', w: 24 }, { k: 'to_job_role', l: 'to_job_role', w: 24 },
    { k: 'from_grade', l: 'from_grade', w: 12 }, { k: 'to_grade', l: 'to_grade', w: 12 }, { k: 'to_department', l: 'to_department', w: 22 }, ...(money ? [{ k: 'from_salary', l: 'from_salary', w: 13 }, { k: 'to_salary', l: 'to_salary', w: 13 }] : []), { k: 'reason', l: 'reason', w: 34 }];
  const notes = [['who', 'Staff ID, work email or full name.'], ['kind', 'promotion or salary review.'], ['effective_date', 'The day it applied. Past dates only.'],
    ['job roles, grades, department', 'Names exactly as in PeopleCore. A promotion needs the new job role or grade.'], ...(money ? [['salaries', 'Annual gross, numbers only. A salary review needs the new salary.']] : []), ['reason', 'Optional.']];
  return pcUploadDlg({ title: 'Upload past promotions & salary reviews', sub: 'From before Nest. Each is recorded as applied and gets a line in the person’s job history. Their current job role, grade and salary don’t change.', notes,
    template: () => pcXlsx('Past promotions template.xlsx', cols, [{ who: 'GES0042026', kind: 'promotion', effective_date: '2024-01-01', from_job_role: 'Slickline Operator', to_job_role: 'Slickline Supervisor', from_grade: 'G5', to_grade: 'G6', reason: '2023 appraisal' }], { sheet: 'Promotions', notes }),
    run: rows => q(sb.rpc('hr_promo_historic_upload', { p_rows: rows })), done: r => `${plural(r.added, 'record')} added` });
}
async function prBulk() {
  const cycles = (await pfCycles()).filter(c => c.kind === 'appraisal'); const cur = cycles.find(c => c.status === 'completed') || cycles[0];
  const per = cur ? (await q(sb.from('hr_perf_periods').select('*').eq('cycle_id', cur.id).eq('kind', 'appraisal').order('start_date', { ascending: false })))[0] : null;
  const rows = per ? (await q(sb.rpc('hr_perf_appr_list', { p_period: per.id, p_scope: 'admin' }))).filter(r => r.final_score != null) : [];
  const money = pcAcc().perms.includes('view-salary-amounts') || pcAcc().perms.includes('view-employee-private-data') || pcAcc().super;
  return modal({ title: 'Salary reviews after a cycle', sub: per ? `${esc(per.title)} · tick people, set the new paygrade${money ? ' or salary' : ''}. Each goes through the workflow.` : 'No appraisal results yet.', wide: true, submit: rows.length ? 'Send for approval' : null,
    body: rows.length ? `<div class="pc-form"><label class="f">Batch name<input id="prb" value="${esc(per.title)}"></label><label class="f">Effective from<input type="date" id="pre" value="${localISO(0)}"></label></div>
      <div class="tablewrap"><table class="t"><thead><tr><th></th><th>Employee</th><th>Final</th><th>Rating</th><th>New paygrade</th>${money ? '<th>New annual salary</th>' : ''}</tr></thead><tbody>${rows.sort((a, b) => b.final_score - a.final_score).map(r => `<tr data-pr="${r.employee_id}"><td><input type="checkbox" data-on></td><td>${esc(r.name)}</td><td>${pfPct(r.final_score)}</td><td>${r.tag ? pcChip(r.tag_color, r.tag) : '—'}</td>
        <td><select data-g>${pcGradeOpts(hrCard(r.employee_id)?.grade_id, 'No change')}</select></td>${money ? '<td><input type="number" min="0" step="1000" data-s placeholder="₦"></td>' : ''}</tr>`).join('')}</tbody></table></div>` : '<div class="empty">Scores appear here after an appraisal.</div>',
    onSubmit: async (_, d) => { const eff = $('#pre', d).value; const list = $$('tr[data-pr]', d).filter(t => $('[data-on]', t).checked).map(t => ({ employee_id: +t.dataset.pr, to_grade_id: $('[data-g]', t).value || null, to_salary: $('[data-s]', t)?.value || null, effective_date: eff, reason: 'Salary review: ' + $('#prb', d).value }));
      if (!list.length) throw new Error('Tick at least one person'); const r = await q(sb.rpc('hr_promo_bulk', { p_rows: list, p_batch: $('#prb', d).value }));
      toast(`${plural(r.raised, 'salary review')} sent for approval`); if (r.skipped.length) setTimeout(() => modal({ title: 'Not sent', submit: null, cancel: 'Close', body: `<ul class="list">${r.skipped.map(s => `<li><div class="main"><div class="name">${esc(s.name)}</div><div class="sub">${esc(s.why)}</div></div></li>`).join('')}</ul>` }), 300); render({ quiet: true }); } });
}
PR.pages.settings = { perms: ['add-promotion-request-policy', 'manage-salary-review-policy', 'view-promotion-request-policy'],
  load() { const c = hrSettings().promo || {}; this.F = [{ k: 'managers_raise', l: 'Line managers can recommend promotions and salary reviews for their team', t: 'switch', hint: 'HR can always raise them.' }];
    return topbar('Promotion settings', 'Who approves is set in Approval workflow: the Developer or a Super Admin can change the steps.', `<a class="btn" href="#/people/admin/flow">Approval workflow</a>`) +
      `<section class="panel"><div class="body"><form id="prset">${pcForm(this.F, { managers_raise: c.managers_raise !== false })}<button class="btn primary">Save</button></form></div></section>`; },
  bind(main) { const f = $('#prset', main); f.onsubmit = async e => { e.preventDefault(); const v = pcRead(f, this.F); await pcTry(() => q(sb.rpc('hr_promo_settings_save', { p: v })), 'Saved'); S.settings.people = { ...(S.settings.people || {}), promo: v }; }; }
};
PC_SUP.promo = {
  async load() { const rows = await q(sb.rpc('hr_promo_list', { p_scope: 'team' })); const canRaise = (hrSettings().promo || {}).managers_raise !== false;
    return topbar('Team promotions', 'Recommend a promotion or salary review for someone you manage. They aren’t told until it is applied.', canRaise ? `<button class="btn primary" id="prnew">${ico('plus')}Recommend</button>` : '') +
      prRows('prteam', rows, { csv: 'Team promotions', empty: 'No promotions or salary reviews raised for your team yet.' }); },
  bind(main) { prBind(main); const b = $('#prnew', main); if (b) b.onclick = () => pcEdit({ title: 'Recommend for…', wide: false, fields: [{ k: 'e', l: 'Who', t: 'select', req: true, opts: S.hr.dir.filter(c => c.manager_id === hrMe()?.id).map(c => [c.id, c.name]) }], save: v => setTimeout(() => prForm(+v.e), 50) }); }
};
PC_SELF.promotion = {
  async load() { const rows = await q(sb.rpc('hr_promo_list', { p_scope: 'mine' }));
    return topbar('Promotion history', 'Your promotions and salary reviews once they are applied.') + (rows.length ? `<section class="panel"><ul class="list pr-tl">${rows.map(r => `<li><span class="pr-dot">${ico('up')}</span><div class="main">
        <div class="name">${r.kind === 'promotion' ? esc(r.to_job || 'Promotion') : 'Salary review'} ${r.to_grade ? pcChip('muted', r.to_grade) : ''}</div>
        <div class="sub">From ${fd(r.effective_date)}${r.from_job && r.kind === 'promotion' ? ` · previously ${esc(r.from_job)}${r.from_grade ? ' (' + esc(r.from_grade) + ')' : ''}` : ''}</div></div></li>`).join('')}</ul></section>`
      : '<section class="panel"><div class="pc-empty-hero"><b>No promotions found</b>Promotions and salary reviews appear here once they are applied.</div></section>'); }
};
