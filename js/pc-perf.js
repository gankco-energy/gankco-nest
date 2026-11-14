/* GANKCO Nest 3.0.5 — PeopleCore Performance (stage 1): appraisal cycles, BSC objectives (KPIs) set by staff or their
   line manager and approved by the line manager, progress updates and comments, core values, the rating scale and
   rating tags, ARC members, copying and bulk upload. Admin, Supervisor and self service. */
'use strict';

PC_MODS.perf = { name: 'Performance', icon: 'target', desc: 'Appraisal cycles, objectives (BSC), core values, ratings and the review committee.',
  perms: ['view-appraisal-cycle', 'create-appraisal-cycle', 'view-objective', 'create-objective', 'update-performance-settings', 'view-employee-appraisal-status'], pages: {}, menu: [] };
const PF = PC_MODS.perf;
PF.menu = [['', 'Overview', 'home', ['view-appraisal-cycle', 'view-objective', 'view-employee-appraisal-status']],
  ['cycles', 'Appraisal cycles', 'plan', ['view-appraisal-cycle', 'create-appraisal-cycle', 'edit-appraisal-cycle']],
  ['objectives', 'Objectives', 'target', ['view-objective', 'create-objective', 'update-objective-status']],
  ['appraisals', 'Appraisals & reviews', 'check', ['view-employee-appraisal-status', 'view-appraisal-period', 'view-performance-review', 'create-appraisal-period']],
  ['pip', 'Improvement plans', 'undo', ['view-pip', 'create-pip', 'close-pip']],
  ['reports', 'Reports & nine-box', 'chart', ['view-report-and-analytics', 'configure-ninebox-matrix', 'view-employee-ninebox-matrix-position']],
  ['settings', 'Settings', 'gear', ['update-performance-settings', 'view-perspective', 'view-corevalue', 'view-rating']]];
Object.assign(PC_MOD_LABEL, { perf: 'Performance', comp: 'Competency', onb: 'Onboarding & confirmation', promo: 'Promotions & salary reviews', survey: 'Surveys' });
if (!PC_SUP_MENU.some(m => m[0] === 'perf')) PC_SUP_MENU.splice(PC_SUP_MENU.findIndex(m => m[0] === 'exit'), 0, ['perf', 'Performance', 'target']);
if (typeof HR_SOON !== 'undefined') HR_SOON.performance = ['Performance', 'Set your objectives for each appraisal cycle, send them to your line manager, and record your progress.', 'Ready'];

const PF_ST = { none: ['muted', 'Not started'], draft: ['muted', 'Draft'], submitted: ['pending', 'Waiting for approval'], approved: ['ok', 'Approved'], returned: ['rejected', 'Returned'] };
const PF_CYC = { draft: ['muted', 'Draft'], active: ['ok', 'In progress'], completed: ['out', 'Completed'], archived: ['muted', 'Archived'] };
const PF_MEASURE = { number: 'Number', percent: 'Percentage (%)', currency: 'Amount (₦)', rating: 'Rating on the scale', yesno: 'Yes or no' };
const PF_RATERS = [['employee', 'Employee'], ['manager', 'Line manager'], ['peer', 'Peers'], ['subordinate', 'Subordinates']];
const PF_ARC = { chairman: 'Chairman', scribe: 'Scribe', member: 'Nominal member' };
const pfCfg = () => hrSettings().perf || {};
const pfP = p => p instanceof URLSearchParams ? Object.fromEntries(p) : (p || {});
const pfScale = () => pfCfg().scale?.length ? pfCfg().scale : [1, 2, 3, 4, 5].map(v => ({ v, t: String(v) }));
const pfNum = n => n == null || n === '' ? '—' : Number(n).toLocaleString('en-NG', { maximumFractionDigits: 2 });
const pfVal = (o, v) => {
  if (v == null || v === '') return '—';
  if (o.measure === 'percent') return pfNum(v) + '%';
  if (o.measure === 'currency') return pcMoney(v);
  if (o.measure === 'yesno') return +v > 0 ? 'Yes' : 'No';
  if (o.measure === 'rating') { const s = pfScale().find(x => +x.v === Math.round(+v)); return `${pfNum(v)}${s ? ' · ' + s.t : ''}`; }
  return pfNum(v) + (o.unit ? ' ' + o.unit : '');
};
const pfTarget = o => o.measure === 'yesno' ? 'Done' : o.measure === 'rating' ? `${pfScale().at(-1)?.v || 5} on the scale` : (o.direction === 'down' ? 'At most ' : '') + pfVal(o, o.target);
const pfBar = (p, cls = '') => `<span class="pf-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, +p || 0))}%" class="${+p >= 100 ? 'full' : +p >= 70 ? 'good' : +p >= 40 ? 'mid' : 'low'}"></i></span>`;
const pfPct = p => p == null ? '—' : pfNum(p) + '%';

async function pfCycles(force) {
  if (!force && S.pc.pfCyc && Date.now() - S.pc.pfCycAt < 30000) return S.pc.pfCyc;
  S.pc.pfCyc = await q(sb.from('hr_perf_cycles').select('*').order('start_date', { ascending: false }).order('id', { ascending: false }));
  S.pc.pfCycAt = Date.now(); return S.pc.pfCyc;
}
// the cycle to show: the one asked for, else the newest appraisal cycle in progress
const pfPick = (cycles, want, probation) => cycles.find(c => c.id === +want)
  || cycles.find(c => c.status === 'active' && (probation ? c.kind === 'probation' : c.kind === 'appraisal'))
  || cycles.find(c => c.status === 'active') || cycles.find(c => c.status !== 'archived') || cycles[0];
const pfCycleSelect = (cycles, cur, id = 'pfcyc') => `<label class="pf-cycsel">${ico('plan')}<select id="${id}" aria-label="Appraisal cycle">${['active', 'draft', 'completed', 'archived'].map(s => {
  const cs = cycles.filter(c => c.status === s); return cs.length ? `<optgroup label="${esc(PF_CYC[s][1])}">${cs.map(c => opt(c.id, c.title, cur?.id)).join('')}</optgroup>` : ''; }).join('')}</select></label>`;
const pfDates = c => `${fd(c.start_date)} – ${fd(c.end_date)}`;

// ================================================================ one person's objectives (staff, supervisor and HR all use this)
function pfPlanHtml(d, ctx) {
  const c = d.cycle, pl = d.plan || {}, can = d.can || {}, st = pl.status || 'none', objs = d.objectives || [];
  const persp = d.persp || []; const totalPw = persp.reduce((a, p) => a + +p.weight, 0) || 100;
  const byP = p => objs.filter(o => o.perspective_id === p.id);
  const orphan = objs.filter(o => !persp.some(p => p.id === o.perspective_id));
  const pProg = list => { const w = list.reduce((a, o) => a + +o.weight, 0); return w ? list.reduce((a, o) => a + (+o.progress || 0) * +o.weight, 0) / w : null; };
  const overall = persp.length ? (() => { let s = 0, w = 0; persp.forEach(p => { const v = pProg(byP(p)); if (v != null) { s += v * p.weight; w += +p.weight; } }); return w ? s / w : null; })() : pProg(objs);
  const card = hrCard(d.employee.id) || { name: d.employee.name };
  const who = ctx === 'self' ? 'Your' : esc(d.employee.name.split(' ')[0]) + '’s';
  const banner = st === 'returned' ? `<div class="notice warn pf-note"><b>Returned by ${esc(pl.decided_by_name || 'the line manager')}</b>${esc(pl.note || '')}${can.submit ? '<br><small>Make the changes, then send them again.</small>' : ''}</div>`
    : st === 'submitted' ? `<div class="notice pf-note">${ctx === 'self' ? `Sent to ${esc(d.employee.manager || 'your line manager')} on ${fd(pl.submitted_at)}. You’ll get a notification when they approve or return them.` : `Sent for approval on ${fd(pl.submitted_at)}. Check the objectives, then approve them or return them with a note.`}</div>`
    : st === 'approved' ? `<div class="notice ok pf-note">Approved${pl.decided_by_name ? ' by ' + esc(pl.decided_by_name) : ''} on ${fd(pl.decided_at)}.${pl.note ? ' ' + esc(pl.note) : ''}${can.update ? ` ${ctx === 'self' ? 'Record your progress as the cycle goes on.' : ''}` : ''}</div>` : '';
  const acts = [
    can.edit && c.use_bsc ? `<button class="btn ${objs.length ? '' : 'primary'}" type="button" data-pfadd>${ico('plus')}Add objective</button>` : '',
    can.submit ? `<button class="btn primary" type="button" data-pfsubmit ${d.weights_ok ? 'disabled' : ''}>${ico('check')}Send to line manager</button>` : '',
    can.decide && ['submitted', 'draft', 'returned'].includes(st) && objs.length ? `<button class="btn primary" type="button" data-pfdec="approve">${ico('check')}Approve</button>` : '',
    can.decide && ['submitted', 'approved'].includes(st) ? `<button class="btn" type="button" data-pfdec="return">${ico('undo')}Return</button>` : '',
    can.freeze && pl.id ? `<button class="btn" type="button" data-pfdec="${pl.frozen ? 'unfreeze' : 'freeze'}">${ico('lock')}${pl.frozen ? 'Unfreeze' : 'Freeze'}</button>` : ''].join('');
  const objRow = o => `<div class="pf-obj" data-oid="${o.id}">
      <div class="pf-o-main"><b>${esc(o.title)}</b>${o.description ? `<small>${esc(o.description)}</small>` : ''}
        <div class="pf-o-meta"><span>Weight <b>${pfNum(o.weight)}%</b></span><span>Target <b>${esc(pfTarget(o))}</b></span>${o.due_date ? `<span>Due <b>${fd(o.due_date)}</b></span>` : ''}<span class="muted">${esc(PF_MEASURE[o.measure])}${o.direction === 'down' ? ', lower is better' : ''}</span>${o.source && !['individual', 'upload'].includes(o.source) ? `<span class="chip muted">${esc({ copy: 'Copied', department: 'Department', jobrole: 'Job role', company: 'Company' }[o.source] || o.source)}</span>` : ''}</div></div>
      <div class="pf-o-prog">${o.actual != null ? `<div class="pf-o-pv"><b>${pfPct(o.progress)}</b><small>${esc(pfVal(o, o.actual))}${o.progress_at ? ' · ' + fd(o.progress_at) : ''}</small></div>${pfBar(o.progress)}` : `<div class="pf-o-pv muted"><small>${st === 'approved' ? 'No progress recorded yet' : 'Progress starts once approved'}</small></div>${pfBar(0, 'pf-none')}`}</div>
      <div class="pf-o-acts">${can.update ? `<button class="btn small" type="button" data-pfup="${o.id}">${ico('up')}Update</button>` : ''}
        <button class="btn small pf-ib" type="button" data-pfnotes="${o.id}" title="Comments and updates">${ico('chat')}${o.notes || ''}</button>
        ${can.edit ? `<button class="btn small pf-ib" type="button" data-pfedit="${o.id}" title="Edit">${ico('edit')}</button><button class="btn small pf-ib" type="button" data-pfdel="${o.id}" title="Remove">${ico('trash')}</button>` : ''}</div></div>`;
  const block = (p, list) => { const w = list.reduce((a, o) => a + +o.weight, 0); const pv = pProg(list);
    return `<section class="panel pf-persp"><header><h2>${esc(p.name)}</h2><span class="meta">Perspective weight ${pfNum(p.weight)}% of the final score</span>
      <span class="right">${list.length ? `<span class="chip ${w === 100 ? 'ok' : 'pending'}" title="The objectives in a perspective must add up to 100%">${w === 100 ? 'Weights 100%' : `Weights ${pfNum(w)}% · need 100%`}</span>` : ''}${pv != null ? `<span class="pf-pp">${pfPct(Math.round(pv * 10) / 10)}</span>` : ''}</span></header>
      ${list.length ? list.map(objRow).join('') : `<div class="empty">${can.edit ? `No objectives here yet. <button class="btn small" type="button" data-pfadd="${p.id}">${ico('plus')}Add one</button>` : 'No objectives here yet.'}</div>`}</section>`; };
  return `<section class="panel pf-head"><div class="body">
      <div class="pf-who">${hrAv(card, 'lg')}<div><h2>${esc(d.employee.name)}</h2><div class="sub">${esc(card.title || '')}${d.employee.manager ? ` · Line manager: <b>${esc(d.employee.manager)}</b>` : ''}</div>
        <div class="hr-chips">${pcChip(...PF_ST[st])}${pl.frozen ? pcChip('muted', 'Frozen by HR') : ''}${pcChip('muted', c.title)}<span class="muted">${pfDates(c)}</span>${c.obj_deadline && ['draft', 'returned', 'none'].includes(st) ? pcChip('pending', 'Set objectives by ' + fd(c.obj_deadline)) : ''}</div></div></div>
      <div class="pf-score">${pcRing(overall == null ? 0 : Math.round(overall), 64)}<span>${overall == null ? 'No progress yet' : 'Objectives progress'}</span></div></div>
      ${acts ? `<div class="pf-acts">${acts}</div>` : ''}</section>
    ${banner}
    ${d.weights_ok && objs.length && (can.edit || can.submit) ? `<div class="notice warn">${esc(d.weights_ok)}</div>` : ''}
    ${!c.use_bsc ? '<div class="notice">This cycle has no objectives: people are appraised on core values only.</div>' : ''}
    ${!d.eligible && !pl.id ? `<div class="notice">${ctx === 'self' ? 'You are' : esc(d.employee.name) + ' is'} not part of ${esc(c.title)}${c.kind === 'probation' ? ' (it is for staff on probation)' : ''}.</div>`
      : c.use_bsc ? (persp.map(p => block(p, byP(p))).join('') + (orphan.length ? block({ name: 'Other', weight: 0 }, orphan) : '')) +
        (!objs.length && !can.edit ? `<section class="panel"><div class="pc-empty-hero"><b>No objectives yet</b>${ctx === 'self' ? (c.status === 'active' ? 'Your line manager will set them, or HR will upload them.' : 'This cycle hasn’t started yet.') : 'None have been set for this cycle.'}</div></section>` : '') : ''}
    <section class="panel pf-cv"><header><h2>Core values</h2><span class="meta">${c.use_cv ? `${pfNum(c.cv_weight)}% of the final score · rated during the appraisal` : 'Not used in this cycle'}</span></header>
      ${c.use_cv ? `<div class="pf-cvs">${(S.pc.pfCv || []).filter(v => v.active).map(v => `<div><b>${esc(v.name)}</b><small>${esc(v.description || '')}</small>${pfCfg().conceal_cv_weight && ctx === 'self' ? '' : `<span class="chip muted">${pfNum(v.weight)}%</span>`}</div>`).join('')}</div>` : ''}</section>`;
}

async function pfLoadPlan(cycle, emp) {
  const [d, cv] = await Promise.all([q(sb.rpc('hr_perf_plan_get', { p_cycle: cycle, p_emp: emp || null })), S.pc.pfCv ? S.pc.pfCv : q(sb.from('hr_perf_core_values').select('*').order('sort'))]);
  S.pc.pfCv = cv; S.pc.pf = d; return d;
}
function pfBindPlan(main, ctx, reload) {
  const d = () => S.pc.pf; const obj = id => d().objectives.find(o => o.id === +id);
  const again = () => render({ quiet: true });
  const editObj = async (o = {}, persp) => {
    const ps = d().persp; const measures = Object.entries(PF_MEASURE);
    const fields = [
      ...(ps.length > 1 ? [{ k: 'perspective_id', l: 'Perspective', t: 'select', req: true, blank: false, opts: ps.map(p => [p.id, `${p.name} (${pfNum(p.weight)}%)`]) }] : []),
      { k: 'title', l: 'Objective', req: true, wide: true, ph: 'e.g. Complete wireline jobs without a safety incident' },
      { k: 'description', l: 'How it’s measured', t: 'textarea', rows: 2, ph: 'What counts, where the number comes from' },
      { k: 'weight', l: 'Weight in its perspective (%)', t: 'number', req: true, min: 0, max: 100, step: 1, hint: 'The objectives in each perspective must add up to 100%.' },
      { k: 'measure', l: 'Measured as', t: 'select', blank: false, opts: measures },
      { k: 'direction', l: 'Better when the actual is', t: 'radio', def: 'up', opts: [['up', 'Higher'], ['down', 'Lower']], show: v => !['rating', 'yesno'].includes(v.measure || 'number') },
      { k: 'target', l: 'Target', t: 'number', step: 'any', req: true, show: v => !['rating', 'yesno'].includes(v.measure || 'number') },
      { k: 'unit', l: 'Unit', ph: 'jobs, days, reports…', show: v => (v.measure || 'number') === 'number' },
      { k: 'start_date', l: 'Start', t: 'date' }, { k: 'due_date', l: 'Due', t: 'date' }];
    const used = d().objectives.filter(x => x.id !== o.id && x.perspective_id === (o.perspective_id || persp || ps[0]?.id)).reduce((a, x) => a + +x.weight, 0);
    await pcEdit({ title: o.id ? 'Edit objective' : 'Add objective', sub: `${esc(d().cycle.title)} · ${used ? `${pfNum(used)}% already used in this perspective, ${pfNum(Math.max(0, 100 - used))}% left` : 'Weights in each perspective add up to 100%'}`,
      fields, vals: { measure: 'number', direction: 'up', perspective_id: persp || ps[0]?.id, weight: o.id ? o.weight : Math.max(0, 100 - used) || null, ...o }, wide: true,
      save: async v => { await q(sb.rpc('hr_perf_obj_save', { p: { ...v, id: o.id || null, cycle_id: d().cycle.id, employee_id: d().employee.id } })); toast(o.id ? 'Objective saved' : 'Objective added'); await again(); } });
  };
  main.addEventListener('click', async e => {
    const t = e.target.closest('[data-pfadd],[data-pfedit],[data-pfdel],[data-pfup],[data-pfnotes],[data-pfsubmit],[data-pfdec]'); if (!t) return;
    if (t.dataset.pfadd !== undefined) return editObj({}, +t.dataset.pfadd || null);
    if (t.dataset.pfedit) return editObj(obj(t.dataset.pfedit));
    if (t.dataset.pfdel) { const o = obj(t.dataset.pfdel); if (!await pcConfirm('Remove objective?', `Remove “${esc(o.title)}”?`, 'Remove')) return;
      await pcTry(() => q(sb.rpc('hr_perf_obj_delete', { p_id: o.id })), 'Removed'); return again(); }
    if (t.dataset.pfup) { const o = obj(t.dataset.pfup);
      const f = o.measure === 'yesno' ? { k: 'actual', l: 'Done?', t: 'radio', req: true, opts: [['1', 'Yes'], ['0', 'Not yet']] }
        : o.measure === 'rating' ? { k: 'actual', l: 'Rating', t: 'select', req: true, opts: pfScale().map(s => [s.v, `${s.v} · ${s.t}`]) }
        : { k: 'actual', l: `Actual so far${o.unit ? ' (' + o.unit + ')' : o.measure === 'percent' ? ' (%)' : o.measure === 'currency' ? ' (₦)' : ''}`, t: 'number', step: 'any', req: true, hint: `Target: ${esc(pfTarget(o))}` };
      return pcEdit({ title: 'Update progress', sub: esc(o.title), fields: [f, { k: 'note', l: 'Note', t: 'textarea', rows: 2, ph: 'What changed, or why it’s behind' }], vals: { actual: o.actual }, wide: false,
        save: async v => { const p = await q(sb.rpc('hr_perf_obj_update', { p_id: o.id, p_actual: +v.actual, p_note: v.note })); toast(`Progress saved: ${pfPct(p)}`); await again(); } }); }
    if (t.dataset.pfnotes) { const o = obj(t.dataset.pfnotes); const notes = await q(sb.rpc('hr_perf_obj_notes_get', { p_id: o.id }));
      const li = n => `<li><div class="main"><div class="name">${esc(n.by_name || '')} <small class="muted">${new Date(n.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></div>
        <div class="sub">${n.kind === 'update' ? `<span class="chip muted">Progress ${esc(pfVal(o, n.data?.from))} → ${esc(pfVal(o, n.data?.to))}</span> ` : ''}${esc(n.body || '')}</div></div></li>`;
      return modal({ title: o.title, sub: 'Comments and progress updates', submit: d().can.comment ? 'Add comment' : null, cancel: 'Close',
        body: `${notes.length ? `<ul class="list pf-notes">${notes.map(li).join('')}</ul>` : '<div class="empty">Nothing yet.</div>'}${d().can.comment ? '<label class="f wide">Comment<textarea name="body" rows="2" placeholder="Write a comment"></textarea></label>' : ''}`,
        onSubmit: async v => { await q(sb.rpc('hr_perf_obj_comment', { p_id: o.id, p_body: v.body })); toast('Comment added'); await again(); } }); }
    if (t.dataset.pfsubmit !== undefined) { if (!await pcConfirm('Send your objectives?', `Send your objectives for ${esc(d().cycle.title)} to ${esc(d().employee.manager || 'your line manager')} for approval? You can’t change them while they are with your line manager.`, 'Send', false)) return;
      const r = await pcTry(() => q(sb.rpc('hr_perf_plan_submit', { p_cycle: d().cycle.id }))); toast(r === 'approved' ? 'Approved: no line manager approval is needed' : 'Sent to your line manager'); return again(); }
    if (t.dataset.pfdec) { const a = t.dataset.pfdec; const nm = esc(d().employee.name);
      if (a === 'return') return pcEdit({ title: 'Return objectives', sub: `${nm} will see your note and can change them and send them again.`, submit: 'Return', fields: [{ k: 'note', l: 'What needs to change', t: 'textarea', req: true, rows: 3 }], wide: false,
        save: async v => { await q(sb.rpc('hr_perf_plan_decide', { p_cycle: d().cycle.id, p_emp: d().employee.id, p_action: 'return', p_note: v.note })); toast('Returned'); await again(); } });
      if (a === 'approve') return pcEdit({ title: 'Approve objectives', sub: `${nm} can then record progress against them.`, submit: 'Approve', fields: [{ k: 'note', l: 'Note (optional)', t: 'textarea', rows: 2 }], wide: false,
        save: async v => { await q(sb.rpc('hr_perf_plan_decide', { p_cycle: d().cycle.id, p_emp: d().employee.id, p_action: 'approve', p_note: v.note })); toast('Approved'); await again(); } });
      await pcTry(() => q(sb.rpc('hr_perf_plan_decide', { p_cycle: d().cycle.id, p_emp: d().employee.id, p_action: a })), a === 'freeze' ? 'Frozen: only HR can change them now' : 'Unfrozen'); return again(); }
  });
}

// (self service and Supervisor pages are in pc-perf2.js)

// ================================================================ Admin: overview
PF.pages[''] = { perms: ['view-appraisal-cycle', 'view-objective', 'view-employee-appraisal-status'],
  async load(rest, params = {}) { params = pfP(params);
    const cycles = await pfCycles(true); const cur = this.cur = pfPick(cycles, params.cycle);
    const head = topbar('Performance', 'Appraisal cycles, objectives and the people in them.', (cycles.length ? pfCycleSelect(cycles, cur) : '') + (pcCan('create-appraisal-cycle') ? `<a class="btn primary" href="#/people/admin/perf/cycles/new">${ico('plus')}New cycle</a>` : ''));
    if (!cur) return head + '<section class="panel"><div class="pc-empty-hero"><b>No appraisal cycles yet</b>Create the first cycle to start.</div></section>';
    const o = await q(sb.rpc('hr_perf_overview', { p_cycle: cur.id })); const b = o.by_status || {};
    return head + `<section class="panel pf-cycard"><div class="body"><div><h2>${esc(cur.title)} ${pcChip(...PF_CYC[cur.status])}</h2><div class="sub">${pfDates(cur)}${cur.description ? ' · ' + esc(cur.description) : ''}</div></div>
        <div class="pf-types">${cur.use_bsc ? pcChip('out', 'Balanced Score Card') : ''}${cur.use_cv ? pcChip('out', `Core values ${pfNum(cur.cv_weight)}%`) : ''}${cur.use_comp ? pcChip('out', 'Competency') : ''}${cur.arc_on ? pcChip('muted', 'ARC') : ''}${cur.kind === 'probation' ? pcChip('pending', 'Probation') : ''}</div></div></section>` +
      pcKpis([[o.people, 'People in the cycle', '', `#/people/admin/perf/objectives?cycle=${cur.id}`], [(b.none || 0) + (b.draft || 0), 'Not sent yet', '', `#/people/admin/perf/objectives?cycle=${cur.id}&s=none`],
        [b.submitted || 0, 'Waiting for approval', b.submitted ? 'warn' : '', `#/people/admin/perf/objectives?cycle=${cur.id}&s=submitted`], [b.returned || 0, 'Returned'], [b.approved || 0, 'Approved', '', `#/people/admin/perf/objectives?cycle=${cur.id}&s=approved`], [pfPct(o.avg_progress), 'Average progress']]) +
      `<div class="pc-grid2"><section class="panel"><header><h2>Objectives by status</h2></header>${pcBars(Object.entries(PF_ST).map(([k, v]) => ({ name: v[1], n: b[k] || 0 })).filter(x => x.n), { pct: true })}</section>
        <section class="panel"><header><h2>Approved by department</h2></header>${o.by_unit.length ? `<ul class="pc-bars">${o.by_unit.map((u, i) => `<li><span class="pc-bl">${esc(u.name)}</span><span class="pc-bt"><i style="width:${Math.max(2, u.done / u.n * 100)}%" class="c${i % 6}"></i></span><span class="pc-bv">${u.done} of ${u.n}</span></li>`).join('')}</ul>` : '<div class="empty">No data yet</div>'}</section></div>`;
  },
  bind(main) { const s = $('#pfcyc', main); if (s) s.onchange = () => go('#/people/admin/perf?cycle=' + s.value); }
};

// ================================================================ Admin: appraisal cycles and the 5-step setup
PF.pages.cycles = { perms: ['view-appraisal-cycle', 'create-appraisal-cycle', 'edit-appraisal-cycle'],
  async load(rest, params = {}) { params = pfP(params);
    const [cycles, persp] = await Promise.all([pfCycles(true), q(sb.from('hr_perf_perspectives').select('*').order('sort'))]); this.persp = persp;
    if (rest[0]) { this.c = rest[0] === 'new' ? null : cycles.find(c => c.id === +rest[0]); return this.wizard(); }
    this.c = undefined; const arch = params.archived === '1';
    const list = cycles.filter(c => arch ? c.status === 'archived' : c.status !== 'archived');
    const menu = c => [c.status === 'draft' && pcCan('edit-appraisal-cycle', 'create-appraisal-cycle') ? ['start', 'Start the cycle'] : null, pcCan('edit-appraisal-cycle') && c.status !== 'archived' ? ['edit', 'Edit'] : null,
      c.status === 'active' && pcCan('close-appraisal-period', 'edit-appraisal-cycle') ? ['complete', 'Mark as completed'] : null, c.status === 'completed' && pcCan('reopen-appraisal-period', 'edit-appraisal-cycle') ? ['reopen', 'Reopen'] : null,
      pcCan('duplicate-appraisal-cycle') ? ['duplicate', 'Duplicate cycle'] : null, pcCan('duplicate-objective') && c.status !== 'archived' ? ['copyobj', 'Copy objectives into this cycle'] : null,
      ['draft', 'completed'].includes(c.status) && pcCan('edit-appraisal-cycle') ? ['archive', 'Archive'] : null, c.status === 'archived' && pcCan('edit-appraisal-cycle') ? ['unarchive', 'Unarchive'] : null,
      pcCan('delete-appraisal-cycle') && c.status !== 'active' ? ['delete', 'Delete'] : null].filter(Boolean);
    this.menus = Object.fromEntries(list.map(c => [c.id, menu(c)]));
    return topbar('Appraisal cycles', 'Each cycle sets what people are appraised on, when, and who reviews the results.', (pcCan('create-appraisal-cycle') ? `<a class="btn primary" href="#/people/admin/perf/cycles/new">${ico('plus')}New cycle</a>` : '')) +
      `<nav class="pc-tabs"><a href="#/people/admin/perf/cycles" class="${arch ? '' : 'on'}">Appraisal cycles</a><a href="#/people/admin/perf/cycles?archived=1" class="${arch ? 'on' : ''}">Archived</a></nav>` +
      (list.length ? `<div class="pf-cycles">${list.map(c => `<article class="panel pf-cyc">
        <div class="pf-cyc-top"><div><h3><a href="#/people/admin/perf/cycles/${c.id}">${esc(c.title)}</a></h3><div class="sub">${esc(c.description || '')}</div></div>${pcChip(...PF_CYC[c.status])}</div>
        <div class="pf-cyc-mid"><span>${ico('plan')}${pfDates(c)}</span>${c.kind === 'probation' ? pcChip('pending', 'Probation') : ''}${c.use_bsc ? pcChip('muted', 'BSC') : ''}${c.use_cv ? pcChip('muted', `Core values ${pfNum(c.cv_weight)}%`) : ''}${c.obj_deadline ? `<span class="muted">Objectives by ${fd(c.obj_deadline)}</span>` : ''}</div>
        <div class="pf-cyc-foot"><a class="btn small" href="#/people/admin/perf/objectives?cycle=${c.id}">${ico('target')}Objectives</a>
          ${this.menus[c.id].length ? `<select class="inline mini" data-cact="${c.id}" aria-label="Actions"><option value="">Actions…</option>${this.menus[c.id].map(([k, l]) => opt(k, l, '')).join('')}</select>` : ''}</div></article>`).join('')}</div>`
        : `<section class="panel"><div class="pc-empty-hero"><b>${arch ? 'No archived cycles' : 'No appraisal cycles yet'}</b>${arch ? '' : 'Create one to start setting objectives.'}</div></section>`);
  },
  wizard() {
    const c = this.c || { use_bsc: true, use_cv: true, use_tags: true, arc_on: true, score_type: 'employee', lm_weight: 70, cv_weight: 40, kind: 'appraisal', year: new Date().getFullYear() };
    this.step = this.step && this.c !== undefined ? this.step : 0; this.v = { ...c };
    const steps = ['Define appraisal', 'Appraisal type', 'Rating tags', 'Score type', 'Review committee (ARC)'];
    return topbar(this.c ? esc(this.c.title) : 'New appraisal cycle', this.c ? `${pcChip(...PF_CYC[this.c.status])} ${pfDates(this.c)}` : 'Five short steps. Nothing is saved until you press Save.', `<a class="btn" href="#/people/admin/perf/cycles">Back to cycles</a>`) +
      `<div class="pf-wiz"><ol class="pf-steps">${steps.map((s, i) => `<li data-step="${i}"><span>${i + 1}</span>${esc(s)}</li>`).join('')}</ol>
       <section class="panel"><div class="body" id="pfwbody"></div><div class="pf-wfoot"><span id="pfwmsg" class="muted"></span><span class="right"><button class="btn" type="button" id="pfwback">Back</button><button class="btn primary" type="button" id="pfwnext">Next</button></span></div></section></div>`;
  },
  async wizBind(main) {
    const ro = this.c && !pcCan('edit-appraisal-cycle'); const v = this.v; const persp = this.persp;
    const arc = this.arc = this.c ? await q(sb.from('hr_perf_arc').select('*').eq('cycle_id', this.c.id)) : [];
    const cp = this.c ? await q(sb.from('hr_perf_cycle_persp').select('*').eq('cycle_id', this.c.id)) : [{ perspective_id: persp.find(p => p.active)?.id, weight: 60 }];
    v.persp = persp.filter(p => p.active || cp.some(x => x.perspective_id === p.id)).map(p => ({ id: p.id, name: p.name, weight: +(cp.find(x => x.perspective_id === p.id)?.weight || 0) }));
    v.arc = arc.map(a => ({ employee_id: a.employee_id, role: a.role, group_id: a.group_id }));
    const tags = await q(sb.from('hr_perf_tags').select('*').eq('active', true).order('min_score'));
    this.surveys = await q(sb.from('hr_surveys').select('id,title,purpose').neq('status', 'closed').order('title')).catch(() => []);
    const body = $('#pfwbody', main), msg = $('#pfwmsg', main);
    const F = [
      () => [{ k: 'title', l: 'Title', req: true, wide: true, ph: 'e.g. H1 2027 Appraisal Cycle' }, { k: 'description', l: 'Description', t: 'textarea', rows: 2 },
        { k: 'kind', l: 'Cycle for', t: 'radio', opts: [['appraisal', 'Everyone (appraisal)'], ['probation', 'Staff on probation']] }, { k: 'year', l: 'Appraisal year', t: 'number', min: 2020, max: 2100 },
        { k: 'start_date', l: 'Start date', t: 'date', req: true }, { k: 'end_date', l: 'End date', t: 'date', req: true },
        { k: 'obj_deadline', l: 'Objectives must be set by', t: 'date', hint: 'Optional. After this date staff can’t change their own objectives; their line manager and HR still can.' },
        { k: 'survey_id', l: 'Appraisal survey (optional)', t: 'select', blank: 'No survey', opts: this.surveys.map(x => [x.id, x.title]), hint: 'Sent to everyone when the appraisal opens. Line managers see the answers while reviewing, unless it is anonymous.' }],
      () => [{ k: 'use_bsc', l: 'Balanced Score Card', t: 'switch', hint: 'Objectives (KPIs) grouped into perspectives, each with a weight.' },
        { k: 'pw', t: 'html', l: '', show: x => x.use_bsc, html: `<div class="pf-pw">${v.persp.map(p => `<label><span>${esc(p.name)}</span><span class="pc-money"><input type="number" min="0" max="100" step="1" data-pw="${p.id}" value="${p.weight || ''}" placeholder="0"><i>%</i></span></label>`).join('')}</div><small class="pc-hint">Set a weight for each perspective this cycle uses (leave the others empty). Add perspectives in Settings.</small>` },
        { k: 'use_cv', l: 'Behavioural / core value appraisal', t: 'switch', hint: 'Staff are rated on GANKCO’s core values (Settings → Core values).' },
        { k: 'cv_weight', l: 'Core values weight (%)', t: 'number', min: 0, max: 100, show: x => x.use_cv && x.use_bsc },
        { k: 'tot', t: 'html', l: '', html: '<div class="pf-tot" id="pftot"></div>' },
        { k: 'use_comp', l: 'Competency assessment', t: 'switch', hint: 'The latest graded competency assessment shares the core values part of the score equally. Off at GANKCO.' }],
      () => [{ k: 'use_tags', l: 'Use rating tags', t: 'switch', hint: 'Each final score gets a tag from its score band (Settings → Rating tags).' },
        { k: 'tg', t: 'html', l: '', html: `<ul class="pf-tags">${tags.map(t => `<li>${pcChip(t.color, t.name)}<span>${pfNum(t.min_score)}% – ${+t.max_score >= 100 ? '100%+' : pfNum(t.max_score) + '%'}</span><small>${esc(t.description || '')}</small></li>`).join('')}</ul>` }],
      () => [{ k: 'score_type', l: 'How the final score is worked out', t: 'radio', opts: [['employee', 'Employee score: the employee’s and line manager’s scores, with the line manager’s counting more'], ['custom', 'Custom score']], dis: true, hint: 'GANKCO uses the employee score. Custom scores arrive with the appraisal stage.' },
        { k: 'lm_weight', l: 'Line manager’s share of the score (%)', t: 'number', min: 50, max: 100, step: 5, hint: 'The employee’s own score makes up the rest.' }],
      () => [{ k: 'arc_on', l: 'Appraisal Review Committee', t: 'switch', hint: 'The committee reviews everyone’s results before line managers reveal them. A member not given a group sits on every committee.' },
        { k: 'arcl', t: 'html', l: '', show: x => x.arc_on, html: '<div id="pfarc"></div>' }]];
    let step = 0;
    const read = () => { const f = F[step](); Object.assign(v, pcRead(body, f)); $$('[data-pw]', body).forEach(i => { const p = v.persp.find(x => x.id === +i.dataset.pw); if (p) p.weight = +i.value || 0; });
      $$('[data-arc]', body).forEach((r, i) => { v.arc[i] = { employee_id: +$('[name=ae]', r).value || null, role: $('[name=ar]', r).value, group_id: +$('[name=ag]', r).value || null }; }); };
    const tot = () => { const t = $('#pftot', body); if (!t) return; const pw = v.persp.reduce((a, p) => a + (+p.weight || 0), 0), cw = v.use_cv ? (v.use_bsc ? +v.cv_weight || 0 : 100) : 0; const s = (v.use_bsc ? pw : 0) + cw;
      t.className = 'pf-tot ' + (s === 100 ? 'ok' : 'bad'); t.innerHTML = `${v.use_bsc ? `Perspectives <b>${pfNum(pw)}%</b>` : ''}${v.use_bsc && v.use_cv ? ' + ' : ''}${v.use_cv ? `Core values <b>${pfNum(cw)}%</b>` : ''} = <b>${pfNum(s)}%</b> ${s === 100 ? '✓' : '· must be 100%'}`; };
    const arcHtml = () => `<table class="t pf-arct"><thead><tr><th>Member</th><th>ARC role</th><th>Presiding over</th><th></th></tr></thead><tbody>${v.arc.map((a, i) => `<tr data-arc="${i}"><td><select name="ae">${pcPeopleOpts(a.employee_id, 'Choose…')}</select></td>
        <td><select name="ar">${Object.entries(PF_ARC).map(([k, l]) => opt(k, l, a.role)).join('')}</select></td><td><select name="ag"><option value="">Every group</option>${(S.pc.look?.groups || []).map(g => opt(g.id, g.name, a.group_id)).join('')}</select></td>
        <td><button class="btn small pf-ib" type="button" data-arcdel="${i}">${ico('trash')}</button></td></tr>`).join('') || '<tr><td colspan="4" class="pc-empty">No members yet.</td></tr>'}</tbody></table>
      <button class="btn small" type="button" id="pfarcadd">${ico('plus')}Add member</button>`;
    const draw = () => { body.innerHTML = pcForm(F[step](), v); if (ro) $$('input,select,textarea', body).forEach(i => i.disabled = true);
      const arcBox = $('#pfarc', body); if (arcBox) arcBox.innerHTML = arcHtml();
      pcLiveShow(body, F[step](), v); tot();
      $$('.pf-steps li', main).forEach((li, i) => { li.classList.toggle('on', i === step); li.classList.toggle('done', i < step); });
      $('#pfwback', main).style.visibility = step ? '' : 'hidden'; $('#pfwnext', main).textContent = step === F.length - 1 ? (ro ? 'Close' : 'Save cycle') : 'Next'; msg.textContent = ''; };
    body.addEventListener('input', () => { read(); tot(); }); body.addEventListener('change', () => { read(); tot(); });
    body.addEventListener('click', e => { if (e.target.closest('#pfarcadd')) { read(); v.arc.push({ role: 'member' }); $('#pfarc', body).innerHTML = arcHtml(); }
      const d = e.target.closest('[data-arcdel]'); if (d) { read(); v.arc.splice(+d.dataset.arcdel, 1); $('#pfarc', body).innerHTML = arcHtml(); } });
    const check = () => { const f = F[step](); const miss = f.find(x => x.req && !v[x.k]); if (miss) throw new Error(miss.l + ' is required');
      if (step === 0 && v.end_date < v.start_date) throw new Error('The end date is before the start date');
      if (step === 1) { if (!v.use_bsc && !v.use_cv) throw new Error('Choose Balanced Score Card, core values, or both'); const s = (v.use_bsc ? v.persp.reduce((a, p) => a + (+p.weight || 0), 0) : 0) + (v.use_cv ? (v.use_bsc ? +v.cv_weight || 0 : 100) : 0); if (s !== 100) throw new Error('The weights must add up to 100%'); } };
    $$('.pf-steps li', main).forEach(li => li.onclick = () => { read(); if (+li.dataset.step > step) { try { for (let i = step; i < +li.dataset.step; i++) { step = i; check(); } } catch (e) { msg.textContent = e.message; msg.className = 'err-t'; draw(); msg.textContent = e.message; return; } } step = +li.dataset.step; draw(); });
    $('#pfwback', main).onclick = () => { read(); step = Math.max(0, step - 1); draw(); };
    $('#pfwnext', main).onclick = async () => {
      read(); try { check(); } catch (e) { msg.textContent = e.message; msg.className = 'err-t'; return; }
      if (step < F.length - 1) { step++; return draw(); }
      if (ro) return go('#/people/admin/perf/cycles');
      const p = { ...v, id: this.c?.id || null, persp: v.persp.filter(x => x.weight > 0).map(x => ({ id: x.id, weight: x.weight })), arc: v.arc_on ? v.arc.filter(a => a.employee_id) : [] };
      ['pw', 'tot', 'tg', 'arcl'].forEach(k => delete p[k]);
      const id = await pcTry(() => q(sb.rpc('hr_perf_cycle_save', { p })), this.c ? 'Cycle saved' : 'Cycle created'); S.pc.pfCycAt = 0; go('#/people/admin/perf/cycles');
      if (!this.c && id) setTimeout(() => toast('Start the cycle from its Actions menu when you are ready. Staff are told to set their objectives.'), 600);
    };
    draw();
  },
  bind(main) {
    if (this.c !== undefined) return this.wizBind(main);
    main.addEventListener('change', async e => {
      const s = e.target.closest('[data-cact]'); if (!s || !s.value) return; const id = +s.dataset.cact, a = s.value; s.value = '';
      const c = S.pc.pfCyc.find(x => x.id === id);
      if (a === 'edit') return go('#/people/admin/perf/cycles/' + id);
      if (a === 'copyobj') return pfCopyObjectives(id);
      const ask = { start: ['Start this cycle?', `Staff in ${esc(c.title)} are told to set their objectives and send them to their line manager.`, 'Start', false],
        complete: ['Mark as completed?', 'Nobody can change objectives or record progress after this. You can reopen it.', 'Complete', false],
        archive: ['Archive this cycle?', 'It moves to Archived. You can unarchive it.', 'Archive', false], delete: ['Delete this cycle?', `Delete ${esc(c.title)}? This can’t be undone.`, 'Delete', true] }[a];
      if (ask && !await pcConfirm(...ask)) return;
      const r = await pcTry(() => q(sb.rpc('hr_perf_cycle_action', { p_id: id, p_action: a })), { start: 'Cycle started', complete: 'Completed', reopen: 'Reopened', archive: 'Archived', unarchive: 'Unarchived', delete: 'Deleted', duplicate: 'Copy made' }[a]);
      S.pc.pfCycAt = 0; if (a === 'duplicate' && r) return go('#/people/admin/perf/cycles/' + r); pcRefresh();
    });
  }
};

async function pfCopyObjectives(toId) {
  const cycles = (await pfCycles()).filter(c => c.id !== toId); const to = S.pc.pfCyc.find(c => c.id === toId);
  return pcEdit({ title: 'Copy objectives', sub: `Into ${esc(to.title)}. People who already have objectives in it are skipped; everyone else gets a copy of their objectives as a draft.`, submit: 'Copy', wide: false,
    fields: [{ k: 'from', l: 'Copy from', t: 'select', req: true, opts: cycles.map(c => [c.id, `${c.title} (${PF_CYC[c.status][1]})`]) }],
    save: async v => { const n = await q(sb.rpc('hr_perf_obj_copy', { p_from: +v.from, p_to: toId, p_emps: null })); toast(n ? `Copied for ${plural(n, 'person', 'people')}` : 'Nothing to copy: everyone already has objectives, or nobody had any'); pcRefresh(); } });
}

// ================================================================ Admin: everybody's objectives in a cycle
PF.pages.objectives = { perms: ['view-objective', 'create-objective', 'update-objective-status'],
  async load(rest, params = {}) { params = pfP(params);
    const cycles = await pfCycles(true);
    if (rest[0] && rest[1]) { this.one = { cycle: +rest[0], emp: +rest[1] }; const d = await pfLoadPlan(+rest[0], +rest[1]);
      return topbar(`${esc(d.employee.name)} · Objectives`, esc(d.cycle.title), `<a class="btn" href="#/people/admin/perf/objectives?cycle=${d.cycle.id}">Back to everyone</a>`) + pfPlanHtml(d, 'admin'); }
    this.one = null; const cur = this.cur = pfPick(cycles, params.cycle);
    if (!cur) return topbar('Objectives') + '<section class="panel"><div class="pc-empty-hero"><b>No appraisal cycles yet</b>Create a cycle first.</div></section>';
    const rows = await q(sb.rpc('hr_perf_plan_list', { p_cycle: cur.id, p_scope: 'admin' }));
    if (params.s) S.pc.tables.pfall = { ...(S.pc.tables.pfall || {}), f: { s: params.s === 'none' ? 'none' : params.s } };
    const cols = [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, esc(r.emp_no || '')) },
      { l: 'Department', v: r => hrUnit(r.unit_id)?.name || '', f: r => esc(hrUnit(r.unit_id)?.name || '—') }, { l: 'Line manager', v: r => r.manager || '', f: r => esc(r.manager || '—') },
      { l: 'Objectives', cls: 'num', v: r => +r.objectives, f: r => r.objectives || '—' },
      { l: 'Status', v: r => r.status, f: r => pcChip(...PF_ST[r.status]) + (r.frozen ? ' ' + pcChip('muted', 'Frozen') : ''), csv: r => PF_ST[r.status][1] },
      { l: 'Progress', v: r => +r.progress || -1, f: r => r.progress != null && r.status === 'approved' ? `<span class="pf-tp">${pfBar(r.progress)}<b>${pfPct(r.progress)}</b></span>` : '—', csv: r => r.progress ?? '' }];
    const up = pcCan('upload-individual-objective', 'upload-department-objective', 'upload-jobrole-objective', 'upload-company-objective');
    return topbar('Objectives', 'Everyone in the cycle, where their objectives stand, and their progress.', pfCycleSelect(cycles, cur)) +
      pcTable('pfall', cols, rows, { noun: 'employee', csv: 'Objectives ' + cur.title, href: r => `#/people/admin/perf/objectives/${cur.id}/${r.employee_id}`, empty: 'Nobody is in this cycle.',
        actions: (up && cur.status !== 'archived' ? `<button class="btn small" type="button" id="pfup">${ico('up')}${cur.status === 'completed' ? 'Upload past objectives' : 'Bulk upload'}</button>` : '') + (pcCan('duplicate-objective') && !['completed', 'archived'].includes(cur.status) ? `<button class="btn small" type="button" id="pfcopy">${ico('move')}Copy from a cycle</button>` : ''),
        filters: [{ k: 's', l: 'Status', opts: Object.entries(PF_ST).map(([k, v]) => [k, v[1]]), test: (r, v) => v === 'none' ? ['none', 'draft'].includes(r.status) : r.status === v },
          { k: 'u', l: 'Department', opts: pcDepts().filter(u => rows.some(r => r.unit_id === u.id)).map(u => [u.id, u.name]), test: (r, v) => r.unit_id === +v }] });
  },
  bind(main) {
    if (this.one) return pfBindPlan(main, 'admin', async () => { await pfLoadPlan(this.one.cycle, this.one.emp); render({ quiet: true }); });
    const s = $('#pfcyc', main); if (s) s.onchange = () => go('#/people/admin/perf/objectives?cycle=' + s.value);
    const c = $('#pfcopy', main); if (c) c.onclick = () => pfCopyObjectives(this.cur.id);
    const u = $('#pfup', main); if (u) u.onclick = () => pfUpload(this.cur);
  }
};

const PF_UP_COLS = ['scope', 'who', 'perspective', 'title', 'description', 'weight', 'measure', 'direction', 'target', 'unit', 'due_date'];
async function pfReadSheet(file, keepAll) {
  const ext = (file.name.split('.').pop() || '').toLowerCase(); const rows = [];
  if (['xlsx', 'xlsm'].includes(ext)) {
    await loadScript('vendor/exceljs.min.js'); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer());
    wb.worksheets[0].eachRow({ includeEmpty: false }, r => { const cells = []; r.eachCell({ includeEmpty: true }, (c, i) => { let v = c.value; if (v && typeof v === 'object') v = v.result ?? v.text ?? (v.richText ? v.richText.map(t => t.text).join('') : ''); cells[i - 1] = v instanceof Date ? v.toISOString().slice(0, 10) : v ?? ''; }); rows.push(cells); });
  } else if (['csv', 'txt'].includes(ext)) {
    (await file.text()).replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim()).forEach(l => rows.push(l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))));
  } else throw new Error('Use an Excel (.xlsx) or CSV file');
  const head = (rows.shift() || []).map(h => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  const alias = { applies_to: 'scope', for: 'scope', employee: 'who', name: 'who', objective: 'title', kpi: 'title', due: 'due_date', measured_as: 'measure', better_when: 'direction' };
  return rows.map(r => Object.fromEntries(head.map((h, i) => [alias[h] || h, r[i] == null ? '' : String(r[i]).trim()]))).filter(r => keepAll ? Object.values(r).some(Boolean) : (r.title || r.who));
}
async function pfUpload(cur) {
  return modal({ title: cur.status === 'completed' ? 'Upload past objectives' : 'Bulk upload objectives', sub: `Into ${esc(cur.title)}. One row per objective. A row can be for one person, a department, a job role or the whole company.${cur.status === 'completed' ? ' The cycle is completed, so these go in as approved past records.' : ''}`, submit: 'Upload', wide: true,
    body: `<ol class="pf-upsteps"><li>Download the template and fill it in. <button class="btn small" type="button" id="pftpl">${ico('down')}Template</button></li>
      <li><b>scope</b> is employee, department, job role or company. <b>who</b> is the staff ID, email or name, or the department or job role name (empty for company).</li>
      <li><b>measure</b> is number, %, ₦, rating or yes/no. <b>direction</b> is up (higher is better) or down. Each person’s objectives in a perspective should add up to 100%.</li></ol>
      <label class="f wide">File (.xlsx or .csv)<input type="file" name="file" accept=".xlsx,.csv" required></label><div id="pfprev"></div>`,
    onOpen: d => {
      $('#pftpl', d).onclick = () => pcCsv('Objectives upload template.csv', PF_UP_COLS.map(k => ({ l: k, k })), [
        { scope: 'department', who: 'Engineering', perspective: 'Overall Performance', title: 'Tools ready before every job', description: 'Checked on the job pack', weight: 40, measure: '%', direction: 'up', target: 95, unit: '', due_date: cur.end_date },
        { scope: 'employee', who: 'GES0042026', perspective: 'Overall Performance', title: 'Lost-time incidents', description: '', weight: 60, measure: 'number', direction: 'down', target: 0, unit: 'incidents', due_date: '' }]);
      $('[name=file]', d).onchange = async e => { const f = e.target.files[0]; if (!f) return; try { d._rows = await pfReadSheet(f); $('#pfprev', d).innerHTML = `<div class="notice ok">${plural(d._rows.length, 'row')} ready to upload.</div>`; } catch (x) { $('#pfprev', d).innerHTML = `<div class="notice warn">${esc(x.message)}</div>`; d._rows = null; } };
    },
    onSubmit: async (_, d) => {
      if (!d._rows?.length) throw new Error('Choose a file with at least one row');
      const r = await q(sb.rpc('hr_perf_obj_upload', { p_cycle: cur.id, p_rows: d._rows }));
      toast(`${plural(r.added, 'objective')} added`);
      if (r.skipped.length) setTimeout(() => modal({ title: `${plural(r.skipped.length, 'row')} skipped`, submit: null, cancel: 'Close', body: `<ul class="list">${r.skipped.map(s => `<li><div class="main"><div class="name">Row ${s.row + 1}</div><div class="sub">${esc(s.why)}</div></div></li>`).join('')}</ul>` }), 300);
      pcRefresh();
    } });
}

// ================================================================ Admin: settings
const PF_RULES = [
  ['Objectives', [['approval', 'Line managers approve objectives before progress can be recorded'], ['over_100', 'Progress can go above 100% when a target is beaten']]],
  ['Appraisals (they open in the next update)', [['see_cv_total', 'Employees can see the total score of their core value assessment'], ['show_final_score', 'Show the final score on the appraisal report'],
    ['see_report_during', 'Employees can view their appraisal report during an appraisal'], ['notify_after_cso', 'Employees are notified after the countersigning officer has evaluated their appraisal'],
    ['lm_reject_self', 'Line managers can reject an employee’s self-appraisal'], ['lm_see_survey', 'Line managers can see an employee’s survey answers while reviewing their appraisal'],
    ['reveal_after_arc', 'Line managers reveal results to employees after the ARC’s review'], ['reveal_comment', 'Line managers add a comment when revealing a score'],
    ['score_all_objectives', 'Employees must score all their objectives'], ['score_all_cv', 'Employees must score all their core values'], ['see_average', 'Employees see their average appraisal score'],
    ['conceal_cv_weight', 'Hide the weight of core values from employees']]],
  ['Exceptional achievements', [['state_achievements', 'Employees and line managers state exceptional achievements during appraisals'], ['lm_verify_achievements', 'Line managers verify exceptional achievements given by the employee, peers or subordinates'],
    ['see_achievements', 'Employees see their exceptional achievements on their appraisal report'], ['admin_verify_achievements', 'HR can verify an exceptional achievement given outside an appraisal']]],
  ['Nine-box matrix', [['ninebox_on', 'The nine-box matrix is on'], ['see_ninebox', 'Employees see their nine-box position on their appraisal report'], ['scribe_export', 'ARC scribes can export appraisal reports']]]];
PF.pages.settings = { perms: ['update-performance-settings', 'view-perspective', 'view-corevalue', 'view-rating'],
  async load(rest) {
    const tab = this.tab = rest[0] || (pcCan('update-performance-settings') ? 'general' : 'persp');
    const T = [['general', 'General', ['update-performance-settings']], ['scale', 'Rating scale', ['update-performance-settings']], ['persp', 'Perspectives', ['view-perspective', 'create-perspective']],
      ['cv', 'Core values', ['view-corevalue', 'create-corevalue']], ['tags', 'Rating tags', ['view-rating', 'create-rating']], ['peers', '360° reviews', ['update-performance-settings']], ['pip', 'PIP', ['update-performance-settings']], ['reminders', 'Reminders', ['update-performance-settings']]];
    const head = topbar('Performance settings', 'How objectives, ratings and appraisals work at GANKCO.') + pcTabs(T.map(([k, l, p]) => ['#/people/admin/perf/settings/' + k, l, p]), '#/people/admin/perf/settings/' + tab);
    const cfg = pfCfg();
    if (tab === 'general') {
      return head + `<form id="pfset"><section class="panel"><header><h2>Who sets objectives</h2></header><div class="body">${pcForm([{ k: 'setters', l: 'Objectives can be set by', t: 'checks', opts: [['employee', 'The employee'], ['manager', 'Their line manager']], hint: 'HR can always set them, and upload them in bulk.' }], { setters: cfg.setters || ['employee', 'manager'] })}</div></section>` +
        PF_RULES.map(([h, rs]) => `<section class="panel"><header><h2>${esc(h)}</h2></header><div class="body pf-rules">${rs.map(([k, l]) => pcField({ k, l, t: 'switch' }, cfg[k])).join('')}</div></section>`).join('') +
        `<div class="pf-savebar"><button class="btn primary">Save settings</button></div></form>`;
    }
    if (tab === 'scale') {
      return head + `<section class="panel"><header><h2>Rating scale</h2><span class="meta">Used to rate objectives measured on the scale and core values</span></header><div class="body"><form id="pfscale">
        <table class="t pf-scale"><thead><tr><th>Point</th><th>Title</th><th>What it means</th></tr></thead><tbody>${pfScale().map((s, i) => `<tr><td><b>${i + 1}</b></td><td><input name="t" value="${esc(s.t)}" required></td><td><input name="d" value="${esc(s.d || '')}"></td></tr>`).join('')}</tbody></table>
        <div class="pf-scbtns"><button class="btn small" type="button" id="pfsadd">${ico('plus')}Add a point</button><button class="btn small" type="button" id="pfsrem">Remove the last point</button><span class="right"><button class="btn primary">Save scale</button></span></div></form></div></section>`;
    }
    if (tab === 'peers') {
      const p = cfg.peers || {};
      this.F = [{ k: 'auto', l: 'Pick peers automatically', t: 'switch', hint: 'Nest picks appraisers from the same group as the employee. Line managers can change them.' },
        { k: 'by', l: 'Pick peers from the same', t: 'radio', opts: [['location', 'Location'], ['unit', 'Department'], ['job_role', 'Job role'], ['region', 'Region']] },
        { k: 'count', l: 'Peers per employee', t: 'number', min: 1, max: 10 },
        { k: 'share', l: 'Share of each core value score that comes from peers and subordinates (%)', t: 'number', min: 0, max: 50, hint: 'The rest comes from the employee’s and line manager’s scores.' },
        { k: 'peer_named', l: 'People who can open an appraisal report see each peer’s name with their ratings and comments', t: 'switch' },
        { k: 'sub_named', l: 'People who can open an appraisal report see each subordinate’s name with their ratings and comments', t: 'switch' }];
      return head + `<section class="panel"><header><h2>360° reviews</h2><span class="meta">Peers and subordinates rate core values only</span></header><div class="body"><form id="pfsub" data-key="peers">${pcForm(this.F, p)}<button class="btn primary">Save</button></form></div></section>`;
    }
    if (tab === 'reminders') {
      const r = { on: true, perf_open: 3, perf_close: 3, obj: 3, survey: 2, ...(cfg.reminders || {}) };
      this.F = [{ k: 'on', l: 'Send date reminders', t: 'switch', hint: 'They go to the bell, by email and to phones, like every Nest notification.' },
        { k: 'perf_open', l: 'Days before an appraisal or review opens', t: 'number', min: 0, max: 30, hint: 'Staff are told it’s coming, and HR is reminded to open it. They’re reminded again on the opening day. 0 for the opening day only.' },
        { k: 'perf_close', l: 'Days before an appraisal or review closes', t: 'number', min: 0, max: 30, hint: 'Whoever still has a step (self-appraisal, scores, reveal, sign-off), and again on the closing day.' },
        { k: 'obj', l: 'Days before the objectives deadline', t: 'number', min: 0, max: 30, hint: 'Staff who haven’t sent their objectives, and again on the deadline.' },
        { k: 'survey', l: 'Days before a survey is due', t: 'number', min: 0, max: 30, hint: 'People who haven’t answered, and again on the due date. Each survey’s own “remind every” still works too.' }];
      return head + `<section class="panel"><header><h2>Date reminders</h2><span class="meta">Sent at 08:00</span></header><div class="body"><form id="pfsub" data-key="reminders">${pcForm(this.F, r)}
        <div class="acc-save"><button class="btn primary">Save</button></div></form></div></section>`;
    }
    if (tab === 'pip') {
      const p = cfg.pip || {};
      this.F = [{ k: 'creator', l: 'Who sets PIP goals', t: 'radio', opts: [['manager', 'Line managers'], ['admin', 'HR'], ['employee', 'Employees']] },
        { k: 'months', l: 'Default length (months)', t: 'number', min: 1, max: 12 }, { k: 'comment_attest', l: 'Comments are required when attesting a PIP', t: 'switch' }, { k: 'comment_reject', l: 'Comments are required when rejecting a PIP', t: 'switch' }];
      return head + `<section class="panel"><header><h2>Performance improvement plans</h2><span class="meta">PIPs open in the next update</span></header><div class="body"><form id="pfsub" data-key="pip">${pcForm(this.F, p)}<button class="btn primary">Save</button></form></div></section>`;
    }
    const kind = { persp: 'perspective', cv: 'core_value', tags: 'tag' }[tab]; this.kind = kind;
    const tbl = { perspective: 'hr_perf_perspectives', core_value: 'hr_perf_core_values', tag: 'hr_perf_tags' }[kind];
    const rows = this.rows = await q(sb.from(tbl).select('*').order(kind === 'tag' ? 'min_score' : 'sort'));
    const canAdd = pcCan({ perspective: 'create-perspective', core_value: 'create-corevalue', tag: 'create-rating' }[kind]);
    const canEd = pcCan({ perspective: ['edit-perspective', 'activate-perspective', 'deactivate-perspective'], core_value: 'edit-corevalue', tag: ['edit-rating', 'activate-rating', 'deactivate-rating'] }[kind]);
    const nameCol = { k: 'name', l: 'Name', f: r => `<b>${esc(r.name)}</b>${r.active ? '' : ' ' + pcChip('muted', 'Off')}<br><small class="muted">${esc(r.description || '')}</small>` };
    const cols = kind === 'tag' ? [{ l: 'Tag', v: r => r.name, f: r => pcChip(r.color, r.name) + (r.active ? '' : ' ' + pcChip('muted', 'Off')) }, { l: 'Description', v: r => r.description || '' }, { l: 'Score band', v: r => +r.min_score, f: r => `${pfNum(r.min_score)}% – ${+r.max_score >= 100 ? '100%+' : pfNum(r.max_score) + '%'}` }]
      : kind === 'core_value' ? [nameCol, { l: 'Weight', cls: 'num', v: r => +r.weight, f: r => pfNum(r.weight) + '%' }, { l: 'Rated by', sort: false, f: r => r.raters.map(x => pcChip('muted', PF_RATERS.find(y => y[0] === x)?.[1] || x)).join(' ') }]
      : [nameCol];
    cols.push({ l: '', cls: 'num', sort: false, csv: false, f: r => canEd ? `<button class="btn small" type="button" data-pfl="${r.id}">Edit</button>` : '' });
    const cvTot = kind === 'core_value' ? rows.filter(r => r.active).reduce((a, r) => a + +r.weight, 0) : null;
    const intro = { perspective: 'Balanced Score Card perspectives. Each cycle gives the ones it uses a weight.', core_value: 'GANKCO’s core values, rated in every appraisal that includes them.', tag: 'Rating tags describe a level of performance. Each final score gets the tag whose band it falls in.' }[kind];
    return head + (cvTot != null ? `<div class="notice ${cvTot === 100 ? 'ok' : 'warn'}">Active core values add up to <b>${pfNum(cvTot)}%</b>${cvTot === 100 ? '.' : '. They must add up to 100% before a cycle with core values can start.'}</div>` : '') +
      pcTable('pf_' + kind, cols, rows, { noun: { perspective: 'perspective', core_value: 'core value', tag: 'tag' }[kind], search: false, csv: intro && ({ perspective: 'Perspectives', core_value: 'Core values', tag: 'Rating tags' }[kind]),
        actions: `<span class="muted pf-intro">${esc(intro)}</span>` + (canAdd ? `<button class="btn primary small" type="button" data-pfl="new">${ico('plus')}Add</button>` : '') });
  },
  bind(main) {
    settingsAccordion(main, 'perf-' + this.tab);
    const f = $('#pfset', main);
    if (f) f.onsubmit = async e => { e.preventDefault(); const keys = PF_RULES.flatMap(([, rs]) => rs.map(r => r[0])); const v = pcRead(f, [{ k: 'setters', t: 'checks' }, ...keys.map(k => ({ k, t: 'switch' }))]);
      if (!v.setters.length) return toast('Choose who can set objectives', true);
      await pcTry(() => q(sb.rpc('hr_perf_settings_save', { p: v })), 'Saved'); S.settings.people = { ...(S.settings.people || {}), perf: { ...pfCfg(), ...v } }; };
    const sub = $('#pfsub', main);
    if (sub) sub.onsubmit = async e => { e.preventDefault(); const v = pcRead(sub, this.F); const k = sub.dataset.key;
      await pcTry(() => q(sb.rpc('hr_perf_settings_save', { p: { [k]: { ...(pfCfg()[k] || {}), ...v } } })), 'Saved'); S.settings.people = { ...(S.settings.people || {}), perf: { ...pfCfg(), [k]: { ...(pfCfg()[k] || {}), ...v } } }; };
    const sc = $('#pfscale', main);
    if (sc) {
      const tb = $('tbody', sc); const renum = () => $$('tr', tb).forEach((tr, i) => tr.firstElementChild.innerHTML = `<b>${i + 1}</b>`);
      $('#pfsadd', sc).onclick = () => { if ($$('tr', tb).length >= 10) return toast('Ten points at most', true); tb.insertAdjacentHTML('beforeend', '<tr><td></td><td><input name="t" required></td><td><input name="d"></td></tr>'); renum(); };
      $('#pfsrem', sc).onclick = () => { if ($$('tr', tb).length <= 3) return toast('Three points at least', true); tb.lastElementChild.remove(); };
      sc.onsubmit = async e => { e.preventDefault(); const scale = $$('tr', tb).map((tr, i) => ({ v: i + 1, t: $('[name=t]', tr).value.trim(), d: $('[name=d]', tr).value.trim() }));
        await pcTry(() => q(sb.rpc('hr_perf_settings_save', { p: { scale } })), 'Scale saved'); S.settings.people = { ...(S.settings.people || {}), perf: { ...pfCfg(), scale } }; };
    }
    if (!this.kind) return;
    main.addEventListener('click', async e => {
      const b = e.target.closest('[data-pfl]'); if (!b) return; const r = b.dataset.pfl === 'new' ? {} : this.rows.find(x => x.id === +b.dataset.pfl); const kind = this.kind;
      const fields = [{ k: 'name', l: 'Name', req: true, wide: true }, { k: 'description', l: 'Description', t: 'textarea', rows: 2 },
        ...(kind === 'core_value' ? [{ k: 'weight', l: 'Weight (%)', t: 'number', min: 0, max: 100, req: true }, { k: 'raters', l: 'Rated by', t: 'checks', opts: PF_RATERS }] : []),
        ...(kind === 'tag' ? [{ k: 'min_score', l: 'From score (%)', t: 'number', min: 0, step: 'any', req: true }, { k: 'max_score', l: 'To score (%)', t: 'number', min: 0, step: 'any', req: true },
          { k: 'color', l: 'Colour', t: 'select', blank: false, opts: [['rejected', 'Red'], ['pending', 'Amber'], ['muted', 'Grey'], ['ok', 'Green'], ['out', 'Blue']] }] : []),
        { k: 'active', l: 'In use', t: 'switch' }];
      const canDel = r.id && pcCan({ perspective: 'delete-perspective', core_value: 'delete-corevalue', tag: 'delete-rating' }[kind]);
      await pcEdit({ title: (r.id ? 'Edit ' : 'Add ') + { perspective: 'perspective', core_value: 'core value', tag: 'rating tag' }[kind], fields, vals: { active: true, raters: ['employee', 'manager', 'peer', 'subordinate'], color: 'muted', ...r }, wide: false,
        onOpen: (d) => { if (!canDel) return; const x = document.createElement('button'); x.type = 'button'; x.className = 'btn danger'; x.textContent = 'Delete'; x.style.marginRight = 'auto';
          x.onclick = async () => { const res = await pcTry(() => q(sb.rpc('hr_perf_lib_delete', { p_kind: kind, p_id: r.id }))); toast(res === 'deleted' ? 'Deleted' : 'It’s in use, so it was switched off instead'); d.close(); d.remove(); pcRefresh(); }; $('.mf', d).prepend(x); },
        save: async v => { await q(sb.rpc('hr_perf_lib_save', { p_kind: kind, p: { ...v, id: r.id || null } })); toast('Saved'); S.pc.pfCv = null; pcRefresh(); } });
    });
  }
};
