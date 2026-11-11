/* GANKCO Nest 3.0.5 — PeopleCore Competency (stage 4): categories, the competency library with proficiency levels,
   the job roles that need each one, assessments (employee then line manager) and gap analysis. Admin, Supervisor, self service. */
'use strict';

PC_MODS.comp = { name: 'Competency', icon: 'cert', desc: 'The skills each job role needs, assessments, and the gaps to close.',
  perms: ['view-competency-framework', 'view-competency-setup', 'view-competency-category-setup', 'initiate-competency-assessment', 'view-competency-gap-analysis', 'view-staff-competency-analysis'], pages: {}, menu: [] };
const CP = PC_MODS.comp;
CP.menu = [['', 'Competency library', 'cert', ['view-competency-framework', 'view-competency-setup', 'add-new-competency']], ['categories', 'Categories', 'grid', ['view-competency-category-setup']],
  ['assessments', 'Assessments', 'check', ['view-staff-competency-analysis', 'initiate-competency-assessment']], ['gap', 'Gap analysis', 'chart', ['view-competency-gap-analysis', 'view-staff-competency-analysis']],
  ['settings', 'Settings', 'gear', ['view-competency-setup']]];
if (!PC_SUP_MENU.some(m => m[0] === 'comp')) PC_SUP_MENU.splice(PC_SUP_MENU.findIndex(m => m[0] === 'exit'), 0, ['comp', 'Competency', 'cert']);
if (typeof HR_SOON !== 'undefined') HR_SOON.competency = ['Competency', 'The skills your role needs, your assessed level and your gaps.', 'Ready'];
const CP_SEV = { low: ['muted', 'Low'], medium: ['out', 'Medium'], high: ['pending', 'High'], critical: ['rejected', 'Critical'] };
const CP_ST = { self: ['muted', 'Self-assessment'], manager: ['pending', 'With line manager'], completed: ['ok', 'Graded'], cancelled: ['muted', 'Cancelled'] };
const cpCfg = () => hrSettings().comp || {};
const cpLevel = (c, n) => n ? `${n} · ${esc(c.levels?.[n - 1]?.title || '')}` : '—';
// required vs graded, as a small ladder
const cpLadder = c => `<span class="cp-ladder" title="Needs ${cpLevel(c, c.required)}${c.level ? ', graded ' + cpLevel(c, c.level) : ''}">${Array.from({ length: c.max || 3 }, (_, i) => `<i class="${i < (c.level || 0) ? 'have' : ''} ${i === c.required - 1 ? 'need' : ''}"></i>`).join('')}</span>`;

function cpProfileHtml(items, empty) {
  if (!items.length) return `<section class="panel"><div class="pc-empty-hero"><b>No competencies yet</b>${empty || 'HR hasn’t set the competencies for this job role.'}</div></section>`;
  return `<div class="cp-cards">${items.map(c => `<section class="panel cp-card"><div class="body"><div class="cp-top"><div><b>${esc(c.name)}</b><small>${esc(c.category || '')}</small></div>${c.level == null ? pcChip('muted', 'Not graded yet') : c.gap ? pcChip('pending', `Gap of ${c.gap}`) : pcChip('ok', 'Meets the role')}</div>
      <p class="muted">${esc(c.description || '')}</p>${cpLadder(c)}
      <dl class="cp-dl"><div><dt>Required</dt><dd>${cpLevel(c, c.required)}</dd></div><div><dt>Graded</dt><dd>${cpLevel(c, c.level)}</dd></div><div><dt>Severity</dt><dd>${pcChip(...CP_SEV[c.severity])}</dd></div>${c.acquire_months ? `<div><dt>Time to acquire</dt><dd>${plural(c.acquire_months, 'month')} into the job</dd></div>` : ''}</dl></div></section>`).join('')}</div>`;
}
function cpAssessHtml(d) {
  const a = d.assessment, can = d.can; const editS = can.self_edit, editM = can.mgr_edit;
  const sel = (c, cur, who) => `<select data-lv="${c.id}" aria-label="${who} level"><option value="">Level…</option>${c.levels.map((l, i) => opt(i + 1, `${i + 1} · ${l.title}`, cur ?? '')).join('')}</select>`;
  return `<section class="panel pf-head"><div class="body"><div class="pf-who">${hrAv(hrCard(d.employee.id) || { name: d.employee.name }, 'lg')}<div><h2>${esc(d.employee.name)}</h2><div class="sub">${esc(d.employee.job || '')}${d.employee.manager ? ' · Line manager: <b>' + esc(d.employee.manager) + '</b>' : ''}</div>
      <div class="hr-chips">${pcChip(...CP_ST[a.status])}<span class="muted">Started ${fd(a.created_at)}${a.completed_at ? ' · graded ' + fd(a.completed_at) : ''}</span></div></div></div></div>
      ${editS || editM || can.cancel || can.reset || can.nudge ? `<div class="pf-acts">${editS || editM ? `<button class="btn" data-cp="save">Save draft</button><button class="btn primary" data-cp="submit">${ico('check')}${editS ? 'Send to line manager' : 'Grade and finish'}</button>` : ''}
        ${can.nudge ? `<button class="btn" data-cp="nudge">${ico('bell')}Nudge</button>` : ''}${can.cancel ? `<button class="btn" data-cp="cancel">Cancel</button>` : ''}${can.reset ? `<button class="btn danger" data-cp="reset">Reset</button>` : ''}</div>` : ''}</section>
    <section class="panel"><div class="tablewrap"><table class="t pa-tbl"><thead><tr><th>Competency</th><th>Required</th><th>${can.self ? 'Your level' : 'Employee'}</th><th>${can.manager ? 'Your level' : 'Line manager'}</th>${a.status === 'completed' ? '<th>Final</th>' : ''}</tr></thead><tbody>
      ${d.items.map(c => `<tr><td><b>${esc(c.name)}</b> ${pcChip(...CP_SEV[c.severity])}<small class="muted">${esc(c.description || '')}</small>
          <details class="cp-lv"><summary>Proficiency levels</summary><ol>${c.levels.map(l => `<li><b>${esc(l.title)}</b>${l.description ? ' · ' + esc(l.description) : ''}</li>`).join('')}</ol></details></td>
        <td>${cpLevel(c, c.required)}</td>
        <td class="pa-sc">${editS ? sel(c, c.self?.level, 'Your') + `<textarea rows="1" data-lc="${c.id}" placeholder="Comment">${esc(c.self?.comment || '')}</textarea>` : `${cpLevel(c, c.self?.level)}${c.self?.comment ? `<small>${esc(c.self.comment)}</small>` : ''}`}</td>
        <td class="pa-sc">${editM ? sel(c, c.mgr?.level, 'Manager') + `<textarea rows="1" data-lc="${c.id}" placeholder="Comment">${esc(c.mgr?.comment || '')}</textarea>` : c.mgr ? `${cpLevel(c, c.mgr.level)}${c.mgr.comment ? `<small>${esc(c.mgr.comment)}</small>` : ''}` : '<span class="muted">—</span>'}</td>
        ${a.status === 'completed' ? `<td><b>${cpLevel(c, c.final)}</b>${c.final < c.required ? `<br>${pcChip('pending', 'Gap ' + (c.required - c.final))}` : `<br>${pcChip('ok', 'Meets')}`}</td>` : ''}</tr>`).join('')}</tbody></table></div></section>
    <section class="panel"><header><h2>Comments</h2></header><div class="body">${editS ? `<label class="f wide">Your comment<textarea id="cp_c" rows="2">${esc(a.self_comment || '')}</textarea></label>` : a.self_comment ? `<p class="pa-q"><b>${esc(d.employee.name.split(' ')[0])}:</b> ${esc(a.self_comment)}</p>` : ''}
      ${editM ? `<label class="f wide">Your comment<textarea id="cp_c" rows="2">${esc(a.mgr_comment || '')}</textarea></label>` : a.mgr_comment ? `<p class="pa-q"><b>${esc(d.employee.manager || 'Line manager')}:</b> ${esc(a.mgr_comment)}</p>` : ''}
      ${!editS && !editM && !a.self_comment && !a.mgr_comment ? '<span class="muted">No comments.</span>' : ''}</div></section>`;
}
function cpBind(main, id) {
  main.addEventListener('click', async e => { const b = e.target.closest('[data-cp]'); if (!b) return; const a = b.dataset.cp;
    const items = $$('[data-lv]', main).map(s => ({ id: +s.dataset.lv, level: s.value || null, comment: $(`[data-lc="${s.dataset.lv}"]`, main)?.value || '' }));
    const save = () => q(sb.rpc('hr_comp_score_save', { p_id: id, p_items: items, p_comment: $('#cp_c', main)?.value ?? null }));
    if (a === 'save') return pcTry(save, 'Saved');
    if (a === 'submit') { if (!await pcConfirm('Send?', 'You can’t change the levels after this.', 'Send', false)) return; await pcTry(save); const r = await pcTry(() => q(sb.rpc('hr_comp_submit', { p_id: id }))); toast(r === 'manager' ? 'Sent to your line manager' : 'Graded'); return render({ quiet: true }); }
    if (a === 'reset' && !await pcConfirm('Reset this assessment?', 'All levels are cleared and it starts again with the employee.', 'Reset')) return;
    await pcTry(() => q(sb.rpc('hr_comp_admin', { p_id: id, p_action: a })), { nudge: 'Reminder sent', cancel: 'Cancelled', reset: 'Reset' }[a]); render({ quiet: true }); });
}
const cpList = (id, rows, base, o = {}) => pcTable(id, [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, esc(r.job || '')) }, ...(o.admin ? [{ l: 'Line manager', v: r => r.manager || '', f: r => esc(r.manager || '—') }] : []),
    { l: 'Started', v: r => r.created_at, f: r => fd(r.created_at) }, { l: 'Status', v: r => r.status, f: r => pcChip(...CP_ST[r.status]), csv: r => CP_ST[r.status][1] },
    { l: 'Gaps', cls: 'num', v: r => r.gaps ?? -1, f: r => r.gaps == null ? '—' : r.gaps ? pcChip('pending', plural(r.gaps, 'gap')) : pcChip('ok', 'None') }], rows,
  { noun: 'assessment', csv: o.csv, href: r => base + r.id, empty: o.empty || 'No assessments yet.', actions: o.actions, filters: [{ k: 's', l: 'Status', opts: Object.entries(CP_ST).map(([k, v]) => [k, v[1]]), test: (r, v) => r.status === v }] });

// ================================================================ Admin
CP.pages[''] = { perms: ['view-competency-framework', 'view-competency-setup', 'add-new-competency'],
  async load(rest, params) { params = pfP(params);
    const [comps, cats, roles] = await Promise.all([q(sb.from('hr_competencies').select('*').order('name')), q(sb.from('hr_comp_categories').select('*').order('sort')), q(sb.from('hr_comp_roles').select('*'))]);
    Object.assign(this, { comps, cats, roles }); const off = params.off === '1';
    const list = comps.filter(c => off ? !c.active : c.active);
    return topbar('Competency library', 'Every competency at GANKCO, its proficiency levels, and the job roles that need it.', pcCan('add-new-competency') ? `<button class="btn primary" data-cpe="new">${ico('plus')}Create competency</button>` : '') +
      (pcCan('view-deactivated-competencies') ? `<nav class="pc-tabs"><a href="#/people/admin/comp" class="${off ? '' : 'on'}">Active</a><a href="#/people/admin/comp?off=1" class="${off ? 'on' : ''}">Deactivated</a></nav>` : '') +
      pcTable('cplib', [{ l: 'Competency', v: r => r.name, f: r => `<b>${esc(r.name)}</b><br><small class="muted">${esc(r.description || '')}</small>` },
        { l: 'Category', v: r => cats.find(c => c.id === r.category_id)?.name || '', f: r => esc(cats.find(c => c.id === r.category_id)?.name || '—') },
        { l: 'Levels', sort: false, f: r => r.levels.map(l => `<span class="chip muted">${esc(l.title)}</span>`).join(' '), csv: r => r.levels.map(l => l.title).join(' / ') },
        { l: 'Job roles', cls: 'num', v: r => roles.filter(x => x.competency_id === r.id).length, f: r => roles.filter(x => x.competency_id === r.id).length || '—' },
        { l: '', cls: 'num', sort: false, csv: false, f: r => pcCan('edit-competency', 'attach-job-role-to-competency') ? `<button class="btn small" data-cpe="${r.id}">Edit</button>` : '' }], list,
        { noun: 'competency', csv: 'Competencies', empty: off ? 'No deactivated competencies.' : 'No competencies yet.', filters: [{ k: 'c', l: 'Category', opts: cats.map(c => [c.id, c.name]), test: (r, v) => r.category_id === +v }] });
  },
  bind(main) {
    main.addEventListener('click', e => { const b = e.target.closest('[data-cpe]'); if (!b) return; const c = b.dataset.cpe === 'new' ? { levels: [{ title: 'Basic' }, { title: 'Intermediate' }, { title: 'Advance' }], active: true } : this.comps.find(x => x.id === +b.dataset.cpe);
      const rs = c.id ? this.roles.filter(x => x.competency_id === c.id) : [];
      const lvRow = (l, i) => `<div class="cp-lvrow"><span class="cp-rk">${i + 1}</span><input data-l="title" placeholder="Level title" value="${esc(l.title || '')}"><input data-l="description" placeholder="What it looks like" value="${esc(l.description || '')}"></div>`;
      const roleRow = r => `<div class="cp-rrow"><select data-r="job_role_id">${pcJobOpts(r.job_role_id, null, 'Choose a job role…')}</select><select data-r="required_level">${c.levels.map((l, i) => opt(i + 1, `Needs ${i + 1} · ${l.title || ''}`, r.required_level || 1)).join('')}</select>
        <select data-r="severity">${Object.entries(CP_SEV).map(([k, v]) => opt(k, v[1], r.severity || 'medium')).join('')}</select><span class="pc-money"><input type="number" min="0" data-r="acquire_months" value="${r.acquire_months ?? ''}" placeholder="—"><i>months</i></span><button type="button" class="btn small pf-ib" data-rdel>${ico('trash')}</button></div>`;
      pcEdit({ title: c.id ? 'Edit competency' : 'Create competency', wide: true,
        fields: [{ k: 'name', l: 'Title', req: true }, { k: 'category_id', l: 'Category', t: 'select', opts: this.cats.filter(x => x.active || x.id === c.category_id).map(x => [x.id, x.name]) }, { k: 'description', l: 'Description', t: 'textarea', rows: 2 },
          { k: 'lv', l: 'Proficiency levels (lowest first)', t: 'html', html: `<div class="cp-lvs">${c.levels.map(lvRow).join('')}</div><button type="button" class="btn small" data-lvadd>${ico('plus')}Add a level</button> <button type="button" class="btn small" data-lvrem>Remove the last level</button>` },
          { k: 'rl', l: 'Job roles that need it (required level, severity, time to acquire)', t: 'html', html: `<div class="cp-rrows">${rs.map(roleRow).join('')}</div><button type="button" class="btn small" data-radd>${ico('plus')}Add a job role</button>` },
          ...(c.id ? [{ k: 'active', l: 'Active', t: 'switch' }] : [])], vals: c,
        onOpen: d => d.addEventListener('click', e => {
          if (e.target.closest('[data-lvadd]')) { const n = $$('.cp-lvrow', d).length; if (n >= 6) return toast('Six levels at most', true); $('.cp-lvs', d).insertAdjacentHTML('beforeend', lvRow({}, n)); }
          if (e.target.closest('[data-lvrem]')) { const r = $$('.cp-lvrow', d); if (r.length <= 2) return toast('Two levels at least', true); r.at(-1).remove(); }
          if (e.target.closest('[data-radd]')) $('.cp-rrows', d).insertAdjacentHTML('beforeend', roleRow({}));
          const x = e.target.closest('[data-rdel]'); if (x) x.closest('.cp-rrow').remove(); }),
        save: async (v, d) => { const levels = $$('.cp-lvrow', d).map(r => ({ title: $('[data-l=title]', r).value.trim(), description: $('[data-l=description]', r).value.trim() }));
          const roles = $$('.cp-rrow', d).map(r => ({ job_role_id: +$('[data-r=job_role_id]', r).value || null, required_level: +$('[data-r=required_level]', r).value, severity: $('[data-r=severity]', r).value, acquire_months: $('[data-r=acquire_months]', r).value || null })).filter(r => r.job_role_id);
          await q(sb.rpc('hr_comp_save', { p: { ...v, id: c.id || null, levels, roles } })); toast('Saved'); render({ quiet: true }); } }); });
  }
};
CP.pages.categories = { perms: ['view-competency-category-setup'],
  async load() { const rows = this.rows = await q(sb.from('hr_comp_categories').select('*').order('sort'));
    return topbar('Competency categories', 'Group competencies, for example Technical, Core and Leadership.', `<button class="btn primary" data-cc="new">${ico('plus')}Add category</button>`) +
      pcTable('cpcat', [{ k: 'name', l: 'Title', f: r => `<b>${esc(r.name)}</b>${r.active ? '' : ' ' + pcChip('muted', 'Off')}` }, { l: 'Description', v: r => r.description || '', f: r => esc(r.description || '') }, { l: '', cls: 'num', sort: false, csv: false, f: r => `<button class="btn small" data-cc="${r.id}">Edit</button>` }], rows, { noun: 'category', search: false }); },
  bind(main) { main.addEventListener('click', e => { const b = e.target.closest('[data-cc]'); if (!b) return; const r = b.dataset.cc === 'new' ? { active: true } : this.rows.find(x => x.id === +b.dataset.cc);
    pcEdit({ title: r.id ? 'Edit category' : 'Add category', wide: false, fields: [{ k: 'name', l: 'Title', req: true }, { k: 'description', l: 'Description', t: 'textarea' }, { k: 'active', l: 'In use', t: 'switch' }], vals: r,
      save: async v => { await q(sb.rpc('hr_comp_category_save', { p: { ...v, id: r.id || null } })); toast('Saved'); render({ quiet: true }); } }); }); }
};
CP.pages.assessments = { perms: ['view-staff-competency-analysis', 'initiate-competency-assessment'],
  async load(rest) {
    if (rest[0]) { this.one = +rest[0]; const d = await q(sb.rpc('hr_comp_get', { p_id: +rest[0] })); return topbar('Competency assessment', esc(d.employee.name), '<a class="btn" href="#/people/admin/comp/assessments">Back</a>') + cpAssessHtml(d); }
    this.one = null; const rows = await q(sb.rpc('hr_comp_list', { p_scope: 'admin' }));
    return topbar('Competency assessments', 'Staff rate themselves on the competencies their role needs, then their line manager grades them.', pcCan('initiate-competency-assessment') ? `<button class="btn primary" id="cpstart">${ico('plus')}Start assessments</button>` : '') +
      cpList('cpall', rows, '#/people/admin/comp/assessments/', { admin: true, csv: 'Competency assessments' });
  },
  bind(main) { if (this.one) return cpBind(main, this.one);
    const b = $('#cpstart', main); if (b) b.onclick = () => pcEdit({ title: 'Start competency assessments', sub: 'Only people whose job role has competencies get one. Anyone with an open assessment is skipped.', wide: true, submit: 'Start',
      fields: [{ k: 'who', l: 'Who', t: 'radio', opts: [['all', 'Everyone'], ['some', 'Chosen people']], def: 'all' }, { k: 'emps', l: 'People', t: 'checks', opts: pcPeopleList(), show: v => v.who === 'some' }],
      save: async v => { const r = await q(sb.rpc('hr_comp_start', { p_emps: v.who === 'some' ? (v.emps || []) : null })); toast(`${plural(r.started, 'assessment')} started`); render({ quiet: true }); } }); }
};
CP.pages.gap = { perms: ['view-competency-gap-analysis', 'view-staff-competency-analysis'],
  async load(rest, params) { params = pfP(params);
    const comps = (await q(sb.from('hr_competencies').select('id,name,levels').eq('active', true).order('name'))); const by = this.by = params.by || 'comp';
    const tabs = `<nav class="pc-tabs"><a href="#/people/admin/comp/gap?by=comp" class="${by === 'comp' ? 'on' : ''}">By competency</a><a href="#/people/admin/comp/gap?by=emp" class="${by === 'emp' ? 'on' : ''}">By employee</a></nav>`;
    if (by === 'emp') { const emp = +params.e || null; const items = emp ? await q(sb.rpc('hr_comp_gap', { p_comp: null, p_emp: emp })) : [];
      return topbar('Gap analysis', 'One person’s competencies against what their job role needs.', `<label class="pf-cycsel">${ico('user')}<select id="cpemp"><option value="">Choose an employee…</option>${S.hr.dir.map(c => opt(c.id, c.name, emp || '')).join('')}</select></label>`) + tabs + (emp ? cpProfileHtml(items) : '<section class="panel"><div class="pc-empty-hero"><b>Choose an employee</b></div></section>'); }
    const cur = comps.find(c => c.id === +params.c) || comps[0]; if (!cur) return topbar('Gap analysis') + tabs + '<div class="notice">Create competencies first.</div>';
    const rows = await q(sb.rpc('hr_comp_gap', { p_comp: cur.id, p_emp: null })); const graded = rows.filter(r => r.level != null);
    return topbar('Gap analysis', 'Who needs this competency, their graded level and the gap.', `<label class="pf-cycsel">${ico('cert')}<select id="cpcomp">${comps.map(c => opt(c.id, c.name, cur.id)).join('')}</select></label>`) + tabs +
      pcKpis([[rows.length, 'Need it'], [graded.length, 'Graded'], [graded.filter(r => r.gap > 0).length, 'Below the required level', graded.some(r => r.gap > 0) ? 'warn' : ''], [rows.length - graded.length, 'Not graded yet']]) +
      pcTable('cpgap', [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, esc(r.job || '')) }, { l: 'Department', v: r => hrUnit(r.unit_id)?.name || '', f: r => esc(hrUnit(r.unit_id)?.name || '—') },
        { l: 'Required', v: r => r.required, f: r => cpLevel(cur, r.required) }, { l: 'Graded', v: r => r.level ?? -1, f: r => r.level != null ? `${cpLadder({ ...r, max: r.max })} ${cpLevel(cur, r.level)}` : '<span class="muted">Not graded</span>' },
        { l: 'Gap', cls: 'num', v: r => r.level == null ? -1 : r.gap, f: r => r.level == null ? '—' : r.gap ? pcChip('pending', String(r.gap)) : pcChip('ok', '0') }, { l: 'Severity', v: r => r.severity, f: r => pcChip(...CP_SEV[r.severity]) }], rows,
        { noun: 'employee', csv: 'Gap ' + cur.name, empty: 'No job role needs this competency yet.' });
  },
  bind(main) { const c = $('#cpcomp', main); if (c) c.onchange = () => go('#/people/admin/comp/gap?by=comp&c=' + c.value); const e = $('#cpemp', main); if (e) e.onchange = () => go('#/people/admin/comp/gap?by=emp&e=' + e.value); }
};
CP.pages.settings = { perms: ['view-competency-setup'],
  load() { this.F = [{ k: 'final_by', l: 'The final level of each competency is', t: 'radio', opts: [['manager', 'The line manager’s level'], ['employee', 'The employee’s level']] },
      { k: 'self_request', l: 'Staff can ask to be assessed', t: 'switch', hint: 'From Work → Competency.' }];
    return topbar('Competency settings', 'Changing these doesn’t change assessments already graded.') + `<section class="panel"><div class="body"><form id="cpset">${pcForm(this.F, { final_by: 'manager', self_request: true, ...cpCfg() })}<button class="btn primary">Save</button></form></div></section>`; },
  bind(main) { const f = $('#cpset', main); f.onsubmit = async e => { e.preventDefault(); const v = pcRead(f, this.F); await pcTry(() => q(sb.rpc('hr_comp_settings_save', { p: v })), 'Saved'); S.settings.people = { ...(S.settings.people || {}), comp: { ...cpCfg(), ...v } }; }; }
};

// ================================================================ self service and Supervisor
PC_SELF.competency = {
  async load(rest, params) { params = pfP(params);
    const me = hrMe(); if (!me) return topbar('Competency') + '<div class="notice">HR hasn’t added your PeopleCore record yet.</div>';
    const tab = this.tab = params.a ? 'assess' : params.tab || 'mine'; this.one = null;
    const [prof, list] = await Promise.all([q(sb.rpc('hr_comp_gap', { p_comp: null, p_emp: me.id })), q(sb.rpc('hr_comp_list', { p_scope: 'mine' }))]);
    const open = list.find(a => ['self', 'manager'].includes(a.status));
    const tabs = pcTabs([['#/people/work/competency?tab=mine', 'My competencies'], ['#/people/work/competency?tab=assess', `Assessment${open?.status === 'self' ? ' (1)' : ''}`], ['#/people/work/competency?tab=history', 'Graded assessments']], '#/people/work/competency?tab=' + tab);
    const head = topbar('Competency', 'The competencies your job role needs, your graded level and your gaps.', !open && prof.length && cpCfg().self_request !== false ? `<button class="btn" id="cpreq">${ico('plus')}Ask to be assessed</button>` : '') + tabs;
    if (tab === 'history') return head + cpList('cpmine', list, '#/people/work/competency?a=', { empty: 'No assessments yet.' });
    if (tab === 'assess') { const id = +params.a || open?.id || list[0]?.id; if (!id) return head + '<section class="panel"><div class="pc-empty-hero"><b>No assessment</b>HR starts competency assessments, or ask to be assessed.</div></section>';
      this.one = id; return head + cpAssessHtml(await q(sb.rpc('hr_comp_get', { p_id: id }))); }
    return head + cpProfileHtml(prof);
  },
  bind(main) { if (this.one) cpBind(main, this.one); const r = $('#cpreq', main); if (r) r.onclick = async () => { const id = await pcTry(() => q(sb.rpc('hr_comp_request')), 'Assessment started'); go('#/people/work/competency?a=' + id); }; }
};
PC_SUP.comp = {
  async load(rest, params) { params = pfP(params); this.one = null;
    if (params.a) { this.one = +params.a; const d = await q(sb.rpc('hr_comp_get', { p_id: +params.a })); return topbar('Competency assessment', esc(d.employee.name), '<a class="btn" href="#/people/sup/comp">Back to my team</a>') + cpAssessHtml(d); }
    const rows = await q(sb.rpc('hr_comp_list', { p_scope: 'team' }));
    return topbar('Team competency', 'Grade your team’s competency assessments.') + pcKpis([[rows.filter(r => r.status === 'manager' && r.direct).length, 'Waiting for you', rows.some(r => r.status === 'manager' && r.direct) ? 'warn' : ''], [rows.filter(r => r.status === 'self').length, 'With the employee'], [rows.filter(r => r.status === 'completed').length, 'Graded']]) +
      cpList('cpteam', rows, '#/people/sup/comp?a=', { empty: 'No competency assessments in your team.' }); },
  bind(main) { if (this.one) cpBind(main, this.one); }
};
