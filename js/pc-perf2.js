/* GANKCO Nest 3.0.5 — PeopleCore Performance (stage 2): appraisals and performance reviews (self, line manager,
   360 by peers and subordinates, the review committee, revealing and signing off), exceptional achievements,
   performance improvement plans, reports and the nine-box. Self service, Supervisor and Admin. */
'use strict';

const PA_ST = { self: ['muted', 'Self-appraisal'], manager: ['pending', 'With line manager'], arc: ['pending', 'With the committee'], reveal: ['pending', 'Ready to reveal'],
  employee: ['out', 'Waiting for sign-off'], completed: ['ok', 'Completed'], skipped: ['muted', 'Skipped'] };
const PA_STEPS = [['self', 'Self-appraisal'], ['manager', 'Line manager'], ['arc', 'Committee'], ['reveal', 'Reveal'], ['employee', 'Sign-off'], ['completed', 'Done']];
const PA_POT = [['low', 'Low potential'], ['average', 'Average potential'], ['high', 'High potential']];
const PA_REC = { appraisal: [['none', 'No change'], ['promotion', 'Recommend for promotion'], ['salary_review', 'Recommend a salary review'], ['training', 'Training'], ['pip', 'Improvement plan'], ['redeploy', 'Redeployment']],
  probation: [['confirm', 'Confirm appointment'], ['extend', 'Extend probation'], ['not_confirm', 'Do not confirm']] };
const PIP_ST = { draft: ['muted', 'Draft'], active: ['pending', 'In progress'], closed: ['ok', 'Closed'] };
const PIP_OUT = { passed: ['ok', 'Passed'], extended: ['pending', 'Extended'], failed: ['rejected', 'Not passed'] };
const paScaleOpts = sel => `<option value="">Score…</option>` + pfScale().map(s => opt(s.v, `${s.v} · ${s.t}`, sel ?? '')).join('');
const paScoreTxt = s => { if (s?.score == null) return '<span class="muted">—</span>'; const x = pfScale().find(v => +v.v === Math.round(+s.score)); return `<b>${pfNum(s.score)}</b>${x ? ` <small>${esc(x.t)}</small>` : ''}`; };
const paSuggest = o => o.progress == null ? null : Math.max(1, Math.min(pfScale().length, Math.round(+o.progress / 100 * pfScale().length)));
const paBox = (score, pot) => { const nb = pfCfg().ninebox || {}; const perf = score == null ? null : +score >= (nb.exceeds ?? 70) ? 'high' : +score >= (nb.meets ?? 55) ? 'mid' : 'low'; return perf && pot ? `${perf}_${pot}` : null; };
const paBoxName = k => (pfCfg().ninebox?.boxes || {})[k] || '';

function paStepper(st, kind, arc) {
  if (st === 'skipped') return `<div class="pa-steps">${pcChip('muted', 'Skipped by HR')}</div>`;
  const steps = PA_STEPS.filter(([k]) => (k !== 'arc' || arc) && (k !== 'reveal' || (kind === 'appraisal' && pfCfg().reveal_after_arc !== false)));
  const at = steps.findIndex(([k]) => k === st);
  return `<ol class="pa-steps">${steps.map(([k, l], i) => `<li class="${i < at || st === 'completed' ? 'done' : i === at ? 'on' : ''}"><span>${i < at || st === 'completed' ? '✓' : i + 1}</span>${esc(l)}</li>`).join('')}</ol>`;
}

// 3.0.5u: past appraisal results, from before Nest. They show on the staff Appraisal tab, in reports and on the nine-box.
const PA_PAST_COLS = [{ k: 'who', l: 'who', w: 26 }, { k: 'cycle', l: 'cycle', w: 26 }, { k: 'year', l: 'year', w: 8 }, { k: 'final_score', l: 'final_score', w: 12 }, { k: 'rating', l: 'rating', w: 18 }, { k: 'potential', l: 'potential', w: 11 }, { k: 'comments', l: 'comments', w: 50 }];
const PA_PAST_NOTES = [['who', 'Staff ID, work email or full name.'], ['cycle', 'The cycle name, for example “2025 Appraisal”. A name not in Nest is added as a completed cycle.'],
  ['year', 'Optional. The cycle’s year, for a new cycle.'], ['final_score', 'The final score out of 100.'], ['rating', 'Optional. A rating tag name. Empty works it out from the score.'],
  ['potential', 'Optional. low, average or high. Used for the nine-box.'], ['comments', 'Optional.']];
function paPastUpload() {
  return pcUploadDlg({ title: 'Upload past appraisal results', sub: 'Results from before Nest. Each one shows as a past record on the person’s Appraisal tab, in reports and on the nine-box. Uploading the same person and cycle again updates it.',
    notes: PA_PAST_NOTES.slice(0, 2).concat([['Past objectives', 'Optional: open the cycle under Objectives and use Bulk upload.']]),
    template: () => pcXlsx('Past appraisal results template.xlsx', PA_PAST_COLS, [{ who: 'GES0042026', cycle: '2025 Appraisal', year: 2025, final_score: 78.5, rating: '', potential: 'high', comments: 'Strong year on the Mahin jobs' }], { sheet: 'Results', notes: PA_PAST_NOTES }),
    run: rows => q(sb.rpc('hr_perf_historic_upload', { p_rows: rows })),
    done: r => `${plural(r.added, 'result')} added${r.updated ? `, ${plural(r.updated, 'result')} updated` : ''}` });
}
// 3.0.5u: a past result uploaded from before Nest: only the outcome was recorded
function paHistoricHtml(d, card, show, box, can) {
  const a = d.appraisal;
  return `<section class="panel pf-head"><div class="body">
      <div class="pf-who">${hrAv(card, 'lg')}<div><h2>${esc(d.employee.name)}</h2><div class="sub">${esc(card.title || '')}</div>
        <div class="hr-chips">${pcChip('muted', 'Past record')}${pcChip('muted', d.cycle.title)}</div></div></div>
      ${show ? `<div class="pa-final"><div class="pa-fs">${pfPct(a.final_score)}</div>${d.tag ? pcChip(d.tag.color, d.tag.name) : ''}<small>Final score</small></div>` : ''}</div></section>
    <section class="panel pa-res"><header><h2>Result</h2></header><div class="body">
      <p class="muted">This result was uploaded from before Nest. Only the outcome was recorded, not the scores behind it.</p>
      ${show && box && (!can.self || pfCfg().see_ninebox) ? `<div class="pa-break"><div><small>Nine-box</small><b class="pa-nb">${esc(paBoxName(box))}</b><span>${esc(PA_POT.find(x => x[0] === a.potential)?.[1] || '')}</span></div></div>` : ''}
      ${a.mgr_comment ? `<p class="pa-q"><b>Comments:</b> ${esc(a.mgr_comment)}</p>` : ''}</div></section>`;
}

// ================================================================ one appraisal (every role sees it through this)
function paHtml(d, ctx) {
  const can = d.can || {};
  if (d.mode === 'rater') return paRaterHtml(d);
  const a = d.appraisal, c = d.cycle, p = d.period, kind = p.kind;
  const card = hrCard(d.employee.id) || { name: d.employee.name };
  const showRes = a.final_score != null && (can.see_scores) && (!can.self || pfCfg().show_final_score !== false);
  const recs = PA_REC[c.kind === 'probation' ? 'probation' : 'appraisal'];
  const editS = can.self_edit, editM = can.mgr_edit;
  const objRows = (d.objectives || []).map(o => `<tr data-oid="${o.id}">
      <td><b>${esc(o.title)}</b><small class="muted">Weight ${pfNum(o.weight)}% · Target ${esc(pfTarget(o))}</small>
        <span class="pa-act">${o.actual != null ? `Actual ${esc(pfVal(o, o.actual))} ${pfBar(o.progress)} <b>${pfPct(o.progress)}</b>` : '<span class="muted">No progress recorded</span>'}</span></td>
      <td class="pa-sc">${editS ? `<select data-sc="objective:${o.id}" aria-label="Your score">${paScaleOpts(o.self?.score)}</select>${paSuggest(o) && !o.self?.score ? `<small class="muted">Progress suggests ${paSuggest(o)}</small>` : ''}<textarea rows="1" data-cm="objective:${o.id}" placeholder="Comment">${esc(o.self?.comment || '')}</textarea>`
        : o.self ? `${paScoreTxt(o.self)}${o.self.comment ? `<small>${esc(o.self.comment)}</small>` : ''}` : '<span class="muted">—</span>'}</td>
      <td class="pa-sc">${editM ? `<select data-sc="objective:${o.id}" aria-label="Manager score">${paScaleOpts(o.manager?.score)}</select><textarea rows="1" data-cm="objective:${o.id}" placeholder="Comment">${esc(o.manager?.comment || '')}</textarea>`
        : o.manager ? `${paScoreTxt(o.manager)}${o.manager.comment ? `<small>${esc(o.manager.comment)}</small>` : ''}` : '<span class="muted">—</span>'}</td></tr>`).join('');
  const cvRows = (d.core_values || []).map(v => { const sr = v.raters.includes('employee'), mr = v.raters.includes('manager');
    return `<tr><td><b>${esc(v.name)}</b>${v.weight != null ? ` <span class="chip muted">${pfNum(v.weight)}%</span>` : ''}<small class="muted">${esc(v.description || '')}</small></td>
      <td class="pa-sc">${!sr ? '<span class="muted">Not rated by the employee</span>' : editS ? `<select data-sc="core_value:${v.id}">${paScaleOpts(v.self?.score)}</select><textarea rows="1" data-cm="core_value:${v.id}" placeholder="Comment">${esc(v.self?.comment || '')}</textarea>` : v.self ? paScoreTxt(v.self) + (v.self.comment ? `<small>${esc(v.self.comment)}</small>` : '') : '<span class="muted">—</span>'}</td>
      <td class="pa-sc">${!mr ? '<span class="muted">—</span>' : editM ? `<select data-sc="core_value:${v.id}">${paScaleOpts(v.manager?.score)}</select><textarea rows="1" data-cm="core_value:${v.id}" placeholder="Comment">${esc(v.manager?.comment || '')}</textarea>` : v.manager ? paScoreTxt(v.manager) + (v.manager.comment ? `<small>${esc(v.manager.comment)}</small>` : '') : '<span class="muted">—</span>'}</td>
      <td class="pa-sc">${v.others?.n ? `<b>${pfNum(v.others.avg)}</b> <small class="muted">from ${plural(v.others.n, 'colleague')}</small>${v.others.list?.some(x => x.name || x.comment) ? `<ul class="pa-oth">${v.others.list.map(x => `<li>${x.name ? `<b>${esc(x.name)}</b> ` : ''}<span class="muted">${x.kind === 'peer' ? 'Peer' : 'Subordinate'}</span> ${pfNum(x.score)}${x.comment ? ` · ${esc(x.comment)}` : ''}</li>`).join('')}</ul>` : ''}` : '<span class="muted">—</span>'}</td></tr>`; }).join('');
  const ach = d.achievements || [];
  const acts = [
    editS || editM ? `<button class="btn" type="button" data-pa="save">Save draft</button>` : '',
    editS ? `<button class="btn primary" type="button" data-pa="submit">${ico('check')}Send to line manager</button>` : '',
    editM ? `<button class="btn primary" type="button" data-pa="submit">${ico('check')}${c.arc_on && kind === 'appraisal' ? 'Send to the committee' : 'Send'}</button>` : '',
    can.reject ? `<button class="btn" type="button" data-pa="reject">${ico('undo')}Send back</button>` : '',
    can.arc_act ? `<button class="btn" type="button" data-pa="adjust">${ico('edit')}Change final score</button><button class="btn primary" type="button" data-pa="arcok">${ico('check')}Approve result</button>` : '',
    can.reveal ? `<button class="btn primary" type="button" data-pa="reveal">${ico('eye')}Reveal result</button>` : '',
    can.attest ? `<button class="btn primary" type="button" data-pa="attest">${ico('sign')}Sign off</button>` : '',
    can.pip && !(d.pips || []).length ? `<button class="btn" type="button" data-pa="pip">${ico('undo')}Start improvement plan</button>` : '',
    can.nudge ? `<button class="btn" type="button" data-pa="nudge">${ico('bell')}Nudge</button>` : '',
    can.reroute && !['completed', 'skipped'].includes(a.status) ? `<button class="btn" type="button" data-pa="reroute">${ico('move')}Change reviewer</button>` : '',
    can.reset ? `<button class="btn" type="button" data-pa="${a.status === 'skipped' ? 'unskip' : 'skip'}">${a.status === 'skipped' ? 'Bring back' : 'Skip'}</button>${a.status !== 'self' ? `<button class="btn danger" type="button" data-pa="reset">Reset</button>` : ''}` : ''].join('');
  const box = paBox(a.final_score, a.potential);
  if (a.historic) return paHistoricHtml(d, card, showRes || (a.final_score != null && !can.self), box, can);
  return `<section class="panel pf-head"><div class="body">
      <div class="pf-who">${hrAv(card, 'lg')}<div><h2>${esc(d.employee.name)}</h2><div class="sub">${esc(card.title || '')}${d.employee.manager ? ` · Reviewer: <b>${esc(d.employee.manager)}</b>` : ''}</div>
        <div class="hr-chips">${pcChip(...PA_ST[a.status])}${pcChip('muted', p.title)}<span class="muted">${fd(p.start_date)} – ${fd(p.end_date)}${p.status === 'closed' ? ' · closed' : ''}</span></div></div></div>
      ${showRes ? `<div class="pa-final"><div class="pa-fs">${pfPct(a.final_score)}</div>${d.tag ? pcChip(d.tag.color, d.tag.name) : ''}<small>Final score</small></div>` : ''}</div>
      ${paStepper(a.status, kind, c.arc_on && kind === 'appraisal')}
      ${acts ? `<div class="pf-acts">${acts}</div>` : ''}</section>
    ${a.reject_note && a.status === 'self' ? `<div class="notice warn pf-note"><b>Sent back by your line manager</b>${esc(a.reject_note)}</div>` : ''}
    ${d.plan_status && d.plan_status !== 'approved' && c.use_bsc && (editS || editM) ? `<div class="notice warn">These objectives were never approved (${esc(PF_ST[d.plan_status]?.[1] || d.plan_status)}). They are still scored.</div>` : ''}
    ${showRes ? `<section class="panel pa-res"><header><h2>Result</h2>${a.attest ? `<span class="right">${pcChip(a.attest === 'agree' ? 'ok' : 'rejected', a.attest === 'agree' ? 'Signed off: agrees' : 'Signed off: disagrees')}</span>` : ''}</header><div class="body">
        <div class="pa-break">${a.obj_score != null ? `<div><small>Objectives</small><b>${pfPct(a.obj_score)}</b><span>${pfNum(100 - c.cv_weight)}% of the score</span></div>` : ''}${a.cv_score != null ? `<div><small>Core values</small><b>${pfPct(a.cv_score)}</b><span>${pfNum(c.cv_weight)}% of the score</span></div>` : ''}
          ${+a.deduction ? `<div class="neg"><small>Disciplinary deduction</small><b>−${pfNum(a.deduction)}</b><span>performance points</span></div>` : ''}${a.arc_score != null ? `<div><small>Committee’s score</small><b>${pfPct(a.arc_score)}</b><span>${esc(a.arc_by_name || '')}</span></div>` : d.arc_changed ? `<div><small>Review committee</small><b>${pfPct(a.final_score)}</b><span>The committee set the final score</span></div>` : ''}
          ${box && (!can.self || pfCfg().see_ninebox) ? `<div><small>Nine-box</small><b class="pa-nb">${esc(paBoxName(box))}</b><span>${esc(PA_POT.find(x => x[0] === a.potential)?.[1] || '')}</span></div>` : ''}</div>
        ${a.arc_note ? `<p class="pa-q"><b>Committee:</b> ${esc(a.arc_note)}</p>` : ''}${a.reveal_comment ? `<p class="pa-q"><b>${esc(a.revealed_by_name || 'Line manager')}:</b> ${esc(a.reveal_comment)}</p>` : ''}
        ${a.attest_comment ? `<p class="pa-q"><b>${esc(d.employee.name.split(' ')[0])}:</b> ${esc(a.attest_comment)}</p>` : ''}
        ${a.recommendation && !can.self ? `<p class="pa-q"><b>Recommendation:</b> ${esc(recs.find(r => r[0] === a.recommendation)?.[1] || a.recommendation)}${a.recommend_note ? ' · ' + esc(a.recommend_note) : ''}</p>` : ''}</div></section>` : ''}
    ${c.use_bsc ? `<section class="panel"><header><h2>Objectives</h2><span class="meta">${kind === 'review' ? 'Score progress so far' : 'Score each objective on the rating scale'}</span></header>
      ${objRows ? `<div class="tablewrap"><table class="t pa-tbl"><thead><tr><th>Objective</th><th>${can.self ? 'Your score' : 'Employee'}</th><th>${can.manager ? 'Your score' : 'Line manager'}</th></tr></thead><tbody>${objRows}</tbody></table></div>` : '<div class="empty">No objectives in this cycle.</div>'}</section>` : ''}
    ${(d.core_values || []).length ? `<section class="panel"><header><h2>Core values</h2></header><div class="tablewrap"><table class="t pa-tbl"><thead><tr><th>Core value</th><th>${can.self ? 'Your score' : 'Employee'}</th><th>${can.manager ? 'Your score' : 'Line manager'}</th><th>Peers & subordinates</th></tr></thead><tbody>${cvRows}</tbody></table></div></section>` : ''}
    <section class="panel"><header><h2>Comments</h2></header><div class="body pa-cm">
      ${editS ? `<label class="f wide">Your overall comment<textarea rows="3" id="pa_self">${esc(a.self_comment || '')}</textarea></label>` : a.self_comment ? `<p class="pa-q"><b>${esc(d.employee.name.split(' ')[0])}:</b> ${esc(a.self_comment)}</p>` : ''}
      ${editM ? `<label class="f wide">Your overall comment<textarea rows="3" id="pa_mgr">${esc(a.mgr_comment || '')}</textarea></label>
        ${kind === 'appraisal' && pfCfg().ninebox_on !== false ? `<fieldset class="f wide pc-radio"><legend>Potential <i class="req">*</i></legend><div class="seg">${PA_POT.map(([k, l]) => `<label class="segi"><input type="radio" name="pa_pot" value="${k}" ${a.potential === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div><small class="pc-hint">Used for the nine-box matrix with the final score. Not shown to the employee${pfCfg().see_ninebox ? ' until revealed' : ''}.</small></fieldset>` : ''}
        <div class="pc-form"><label class="f">Recommendation<select id="pa_rec"><option value="">None yet</option>${recs.map(([k, l]) => opt(k, l, a.recommendation || '')).join('')}</select></label><label class="f">Recommendation note<input id="pa_recn" value="${esc(a.recommend_note || '')}"></label></div>`
        : a.mgr_comment && !can.self ? `<p class="pa-q"><b>${esc(d.employee.manager || 'Line manager')}:</b> ${esc(a.mgr_comment)}</p>` : a.mgr_comment && can.see_scores ? `<p class="pa-q"><b>${esc(d.employee.manager || 'Line manager')}:</b> ${esc(a.mgr_comment)}</p>` : ''}
      ${!editS && !editM && !a.self_comment && !a.mgr_comment ? '<div class="muted">No comments yet.</div>' : ''}</div></section>
    ${pfCfg().state_achievements !== false || ach.length ? `<section class="panel"><header><h2>Exceptional achievements</h2>${can.achieve ? `<span class="right"><button class="btn small" type="button" data-pa="ach">${ico('plus')}Add</button></span>` : ''}</header>
      ${ach.length ? `<ul class="list">${ach.map(x => `<li><div class="main"><div class="name">${esc(x.title)} ${x.category ? pcChip('muted', x.category) : ''} ${pcChip(x.status === 'verified' ? 'ok' : x.status === 'rejected' ? 'rejected' : 'pending', x.status === 'verified' ? 'Verified' : x.status === 'rejected' ? 'Not verified' : 'Waiting for the line manager')}</div>
        <div class="sub">${esc(x.description || '')}${x.given_by_name ? ` · added by ${esc(x.given_by_name)}` : ''}</div></div><span class="pc-acts">${can.verify && x.status === 'pending' ? `<button class="btn small" data-achv="${x.id}" data-st="verified">Verify</button><button class="btn small" data-achv="${x.id}" data-st="rejected">Reject</button>` : ''}${(x.status === 'pending' && x.given_by === hrMe()?.id) || pcCan('verify-exceptional-achievement') ? `<button class="btn small pf-ib" type="button" data-achdel="${x.id}" data-t="${esc(x.title)}" title="Remove" aria-label="Remove">${ico('trash')}</button>` : ''}</span></li>`).join('')}</ul>` : '<div class="empty">None added.</div>'}</section>` : ''}
    ${d.raters ? `<section class="panel"><header><h2>Peers & subordinates (360°)</h2><span class="meta">${d.raters.filter(r => r.status === 'done').length} of ${d.raters.length} done</span>${can.raters ? `<span class="right"><button class="btn small" type="button" data-pa="addrater">${ico('plus')}Add a colleague</button></span>` : ''}</header>
      ${d.raters.length ? `<ul class="list">${d.raters.map(r => `<li><div class="main"><div class="name">${esc(r.name || (r.kind === 'peer' ? 'A peer' : 'A subordinate'))}</div><div class="sub">${r.kind === 'peer' ? 'Peer' : 'Subordinate'}</div></div>${pcChip(r.status === 'done' ? 'ok' : 'pending', r.status === 'done' ? 'Done' : 'Waiting')}${can.raters && r.status !== 'done' ? `<button class="btn small pf-ib" data-delrater="${r.id}" title="Remove">${ico('trash')}</button>` : ''}</li>`).join('')}</ul>` : '<div class="empty">Nobody is asked to rate this person.</div>'}</section>` : ''}`;
}
function paRaterHtml(d) {
  const can = d.can;
  return `<section class="panel pf-head"><div class="body"><div class="pf-who">${hrAv(hrCard(d.employee.id) || { name: d.employee.name }, 'lg')}<div><h2>Rate ${esc(d.employee.name)}</h2>
      <div class="sub">${esc(d.period.title)} · as their ${can.rater === 'peer' ? 'peer' : 'subordinate'}. ${pfCfg().peers?.peer_named === false ? 'Your name isn’t shown with your scores.' : 'HR and the committee can see who gave each rating; the employee can’t.'}</div>
      <div class="hr-chips">${pcChip(can.rate ? 'pending' : 'ok', can.rate ? 'Waiting for you' : 'Done')}</div></div></div></div>
      ${can.rate ? `<div class="pf-acts"><button class="btn" type="button" data-pa="save">Save draft</button><button class="btn primary" type="button" data-pa="submit">${ico('check')}Send ratings</button></div>` : ''}</section>
    <section class="panel"><header><h2>Core values</h2></header><div class="tablewrap"><table class="t pa-tbl"><thead><tr><th>Core value</th><th>Your score</th></tr></thead><tbody>
      ${d.core_values.map(v => `<tr><td><b>${esc(v.name)}</b><small class="muted">${esc(v.description || '')}</small></td><td class="pa-sc">${can.rate ? `<select data-sc="core_value:${v.id}">${paScaleOpts(v.mine?.score)}</select><textarea rows="1" data-cm="core_value:${v.id}" placeholder="Comment">${esc(v.mine?.comment || '')}</textarea>` : paScoreTxt(v.mine)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
const paLoad = async (id, as) => (S.pc.pa = await q(sb.rpc('hr_perf_appr_get', { p_id: id, p_as: as || null })));
function paBind(main) {
  const d = () => S.pc.pa;
  const collect = () => $$('[data-sc]', main).map(s => { const [item, id] = s.dataset.sc.split(':'); return { item, id: +id, score: s.value || null, comment: $(`[data-cm="${s.dataset.sc}"]`, main)?.value || '' }; });
  const extra = () => { const x = {}; if ($('#pa_self', main)) x.self_comment = $('#pa_self', main).value; if ($('#pa_mgr', main)) { x.mgr_comment = $('#pa_mgr', main).value; x.recommendation = $('#pa_rec', main).value; x.recommend_note = $('#pa_recn', main).value; const p = $('input[name=pa_pot]:checked', main); if (p) x.potential = p.value; } return x; };
  const save = () => q(sb.rpc('hr_perf_score_save', { p_id: d().id, p_items: collect(), p_extra: extra() }));
  // keep what was typed when something else redraws the page (adding an achievement, a rater…)
  const editable = () => d().can.self_edit || d().can.mgr_edit || d().can.rate;
  const again = async () => { if (editable() && $('[data-sc]', main)) await save().catch(() => {}); render({ quiet: true }); };
  main.addEventListener('click', async e => {
    const xd = e.target.closest('[data-achdel]'); if (xd) { if (!await pcConfirm('Remove this achievement?', `“${esc(xd.dataset.t)}” comes off the appraisal.`, 'Remove')) return;
      await pcTry(() => q(sb.rpc('hr_perf_achievement_decide', { p_id: +xd.dataset.achdel, p_status: 'delete' })), 'Achievement removed'); return again(); }
    const v = e.target.closest('[data-achv]'); if (v) { await pcTry(() => q(sb.rpc('hr_perf_achievement_decide', { p_id: +v.dataset.achv, p_status: v.dataset.st })), v.dataset.st === 'verified' ? 'Verified' : 'Not verified'); return again(); }
    const dr = e.target.closest('[data-delrater]'); if (dr) { await pcTry(() => q(sb.rpc('hr_perf_appr_admin', { p_id: d().id, p_action: 'remove_rater', p_data: { rater_id: +dr.dataset.delrater } })), 'Removed'); return again(); }
    const b = e.target.closest('[data-pa]'); if (!b) return; const act = b.dataset.pa; const nm = esc(d().employee.name);
    if (act === 'save') { await pcTry(save, 'Saved'); return; }
    if (act === 'submit') {
      const who = d().mode === 'rater' ? null : d().can.self_edit ? 'self' : 'mgr';
      if (!await pcConfirm(who === 'self' ? 'Send your self-appraisal?' : who === 'mgr' ? 'Send your appraisal?' : 'Send your ratings?', who === 'self' ? `It goes to ${esc(d().employee.manager || 'your line manager')}. You can’t change it after sending, unless they send it back.` : who === 'mgr' ? `${d().cycle.arc_on && d().period.kind === 'appraisal' ? 'The review committee looks at it next.' : `${nm} sees the result next.`} You can’t change your scores after sending.` : 'You can’t change them after sending.', 'Send', false)) return;
      await pcTry(save); const r = await pcTry(() => q(sb.rpc('hr_perf_appr_submit', { p_id: d().id })));
      toast({ manager: 'Sent to your line manager', arc: 'Sent to the review committee', reveal: 'Done. Reveal it once the committee has approved it', employee: `Sent: ${d().employee.name.split(' ')[0]} can read it now`, done: 'Thank you: ratings sent' }[r] || 'Sent'); return render({ quiet: true }); }
    if (act === 'reject') return pcEdit({ title: 'Send back the self-appraisal', sub: `${nm} can change it and send it again.`, submit: 'Send back', wide: false, fields: [{ k: 'note', l: 'What needs to change', t: 'textarea', req: true }],
      save: async x => { await q(sb.rpc('hr_perf_appr_reject', { p_id: d().id, p_note: x.note })); toast('Sent back'); again(); } });
    if (act === 'adjust') return pcEdit({ title: 'Change the final score', sub: `Now ${pfPct(d().appraisal.final_score)}. The committee’s score replaces the worked-out score.`, wide: false,
      fields: [{ k: 'score', l: 'New final score (%)', t: 'number', step: 'any', min: 0, max: 200, req: true }, { k: 'note', l: 'Why', t: 'textarea', req: true }], vals: { score: d().appraisal.final_score },
      save: async x => { await q(sb.rpc('hr_perf_appr_arc', { p_ids: [d().id], p_action: 'adjust', p_score: x.score, p_note: x.note })); toast('Score changed'); again(); } });
    if (act === 'arcok') { await pcTry(() => q(sb.rpc('hr_perf_appr_arc', { p_ids: [d().id], p_action: 'approve' })), 'Approved: the line manager can reveal it'); return again(); }
    if (act === 'reveal') return pcEdit({ title: 'Reveal the result', sub: `${nm} sees their result and signs it off.`, submit: 'Reveal', wide: false, fields: [{ k: 'c', l: `Comment for ${d().employee.name.split(' ')[0]}`, t: 'textarea', req: pfCfg().reveal_comment !== false }],
      save: async x => { await q(sb.rpc('hr_perf_appr_reveal', { p_id: d().id, p_comment: x.c })); toast('Revealed'); again(); } });
    if (act === 'attest') return pcEdit({ title: 'Sign off your appraisal', sub: 'Say whether you agree with the result. If you disagree, HR is told.', submit: 'Sign off', wide: false,
      fields: [{ k: 'a', l: 'The result', t: 'radio', req: true, opts: [['agree', 'I agree'], ['disagree', 'I disagree']] }, { k: 'c', l: 'Comment', t: 'textarea', ph: 'Required if you disagree' }],
      save: async x => { await q(sb.rpc('hr_perf_appr_attest', { p_id: d().id, p_attest: x.a, p_comment: x.c })); toast('Signed off'); again(); } });
    if (act === 'ach') return pcEdit({ title: 'Add an exceptional achievement', sub: d().can.self ? 'Your line manager verifies it.' : '', wide: false,
      fields: [{ k: 'category', l: 'Category', t: 'select', opts: (pfCfg().achievement_cats || []).map(x => [x, x]) }, { k: 'title', l: 'What was achieved', req: true }, { k: 'description', l: 'Details', t: 'textarea' }],
      save: async x => { await q(sb.rpc('hr_perf_achievement_save', { p: { ...x, appraisal_id: d().id } })); toast('Added'); again(); } });
    if (act === 'addrater') return pcEdit({ title: 'Ask a colleague to rate', sub: `They rate ${nm}’s core values.`, wide: false,
      fields: [{ k: 'employee_id', l: 'Colleague', t: 'select', req: true, opts: v => pcPeopleOpts(v, 'Choose…', d().employee.id) }, { k: 'kind', l: 'As a', t: 'radio', opts: [['peer', 'Peer'], ['subordinate', 'Subordinate']], def: 'peer' }],
      save: async x => { await q(sb.rpc('hr_perf_appr_admin', { p_id: d().id, p_action: 'add_rater', p_data: { employee_id: +x.employee_id, kind: x.kind || 'peer' } })); toast('Asked'); again(); } });
    if (act === 'reroute') return pcEdit({ title: 'Change the reviewer', sub: `Who scores and reveals ${nm}’s appraisal.`, wide: false, fields: [{ k: 'm', l: 'Reviewer', t: 'select', req: true, opts: v => pcPeopleOpts(v, 'Choose…', d().employee.id) }], vals: { m: d().employee.manager_id },
      save: async x => { await q(sb.rpc('hr_perf_appr_admin', { p_id: d().id, p_action: 'reroute', p_data: { manager_id: +x.m } })); toast('Reviewer changed'); again(); } });
    if (act === 'pip') return paPipForm({ employee_id: d().employee.id, appraisal_id: d().id });
    if (['nudge', 'skip', 'unskip', 'reset'].includes(act)) {
      if (act === 'reset' && !await pcConfirm('Reset this appraisal?', `All scores and comments on ${nm}’s appraisal are cleared and it goes back to the self-appraisal.`, 'Reset')) return;
      await pcTry(() => q(sb.rpc('hr_perf_appr_admin', { p_id: d().id, p_action: act })), { nudge: 'Reminder sent', skip: 'Skipped', unskip: 'Brought back', reset: 'Reset' }[act]); return again(); }
  });
}

// ================================================================ improvement plans
async function paPipForm(base = {}, pip) {
  const cfg = pfCfg().pip || {}; const concerns = cfg.concerns || [];
  const months = +cfg.months || 1; const sd = localISO(0); const ed = (() => { const x = new Date(); x.setMonth(x.getMonth() + months); return x.toISOString().slice(0, 10); })();
  const goalsHtml = gs => `<div class="pa-goals">${(gs.length ? gs : [{}]).map(g => `<div class="pa-goal"><input data-g="title" placeholder="Goal, e.g. All job reports within 48 hours" value="${esc(g.title || '')}"><input data-g="measure" placeholder="How it’s measured" value="${esc(g.measure || '')}"><input type="date" data-g="due" value="${esc(g.due || '')}"><button type="button" class="btn small pf-ib" data-gdel title="Remove">${ico('trash')}</button></div>`).join('')}</div><button type="button" class="btn small" data-gadd>${ico('plus')}Add a goal</button>`;
  const fields = [...(base.employee_id ? [] : [{ k: 'employee_id', l: 'Employee', t: 'select', req: true, opts: v => pcPeopleOpts(v, 'Choose…') }]),
    { k: 'title', l: 'Title', req: true, wide: true, ph: 'e.g. Report timeliness' },
    { k: 'concerns', l: 'Areas of concern', t: 'checks', opts: concerns.map(x => [x.t, x.t]) },
    { k: 'start_date', l: 'Starts', t: 'date', req: true }, { k: 'end_date', l: 'Ends', t: 'date', req: true, hint: `Default length: ${plural(months, 'month')}` },
    { k: 'goals', l: 'Goals', t: 'html', html: goalsHtml(pip?.goals || []) },
    { k: 'send', l: 'Send it now', t: 'switch', hint: 'They are told and asked to accept it. Leave off to keep it as a draft.' }];
  return pcEdit({ title: pip ? 'Edit improvement plan' : 'New improvement plan', sub: base.employee_id ? esc(pcName(base.employee_id)) : '', wide: true, fields,
    vals: { title: pip?.title, concerns: (pip?.concerns || []).map(x => x.t), start_date: pip?.start_date || sd, end_date: pip?.end_date || ed, send: true },
    onOpen: d => { d.addEventListener('click', e => { if (e.target.closest('[data-gadd]')) { $('.pa-goals', d).insertAdjacentHTML('beforeend', `<div class="pa-goal"><input data-g="title" placeholder="Goal"><input data-g="measure" placeholder="How it’s measured"><input type="date" data-g="due"><button type="button" class="btn small pf-ib" data-gdel>${ico('trash')}</button></div>`); }
      const x = e.target.closest('[data-gdel]'); if (x && $$('.pa-goal', d).length > 1) x.closest('.pa-goal').remove(); }); },
    save: async (v, d) => {
      const goals = $$('.pa-goal', d).map(g => ({ title: $('[data-g=title]', g).value.trim(), measure: $('[data-g=measure]', g).value.trim(), due: $('[data-g=due]', g).value || null, done: false })).filter(g => g.title);
      const p = { ...base, ...v, id: pip?.id || null, goals, concerns: (v.concerns || []).map(t => ({ t, d: concerns.find(c => c.t === t)?.d || '' })) }; delete p.undefined;
      await q(sb.rpc('hr_perf_pip_save', { p })); toast(v.send ? 'Improvement plan sent' : 'Draft saved'); render({ quiet: true });
    } });
}
function paPipCard(x, ctx) {
  const me = hrMe()?.id; const mine = x.employee_id === me; const mgr = x.manager_id === me || ctx === 'admin';
  const left = hrDays(x.end_date);
  return `<section class="panel pa-pip" data-pip="${x.id}"><header><h2>${esc(x.title)}</h2>${pcChip(...PIP_ST[x.status])}${x.outcome ? pcChip(...PIP_OUT[x.outcome]) : ''}
      <span class="meta">${ctx !== 'self' ? esc(x.name) + ' · ' : ''}${fd(x.start_date)} – ${fd(x.end_date)}${x.status === 'active' ? ` · ${left >= 0 ? plural(left, 'day') + ' left' : 'ended ' + plural(-left, 'day') + ' ago'}` : ''}</span>
      <span class="right">${x.status === 'draft' && mgr ? `<button class="btn small" data-pipedit="${x.id}">Edit</button><button class="btn small danger" data-pipact="delete" data-id="${x.id}">Delete</button>` : ''}
        ${x.status === 'active' && mine && !x.attest ? `<button class="btn small primary" data-pipact="attest" data-id="${x.id}">Accept or reject</button>` : ''}
        ${x.status === 'active' && mgr ? `<button class="btn small" data-pipact="close" data-id="${x.id}">Close or extend</button>` : ''}</span></header>
    <div class="body">${x.concerns?.length ? `<div class="pa-con">${x.concerns.map(c => `<div><b>${esc(c.t)}</b>${c.d ? `<small>${esc(c.d)}</small>` : ''}</div>`).join('')}</div>` : ''}
      <ul class="pa-glist">${x.goals.map((g, i) => `<li class="${g.done ? 'done' : ''}"><label><input type="checkbox" data-goal="${i}" data-id="${x.id}" ${g.done ? 'checked' : ''} ${x.status === 'active' && (mine || mgr) ? '' : 'disabled'}><span><b>${esc(g.title)}</b>${g.measure ? `<small>${esc(g.measure)}</small>` : ''}</span></label>${g.due ? `<span class="muted">by ${fd(g.due)}</span>` : ''}${g.note ? `<small class="pa-gn">${esc(g.note)}${g.by ? ' · ' + esc(g.by) : ''}</small>` : ''}</li>`).join('')}</ul>
      ${x.attest ? `<p class="pa-q"><b>${esc((x.name || '').split(' ')[0] || 'Employee')} ${x.attest} the plan</b>${x.attest_comment ? ': ' + esc(x.attest_comment) : '.'}</p>` : x.status === 'active' ? `<p class="muted">Waiting for ${mine ? 'you' : esc((x.name || '').split(' ')[0])} to accept it.</p>` : ''}
      ${x.outcome_note ? `<p class="pa-q"><b>Outcome:</b> ${esc(x.outcome_note)}</p>` : ''}</div></section>`;
}
function paPipBind(main, list) {
  main.addEventListener('change', async e => { const g = e.target.closest('[data-goal]'); if (!g) return; await pcTry(() => q(sb.rpc('hr_perf_pip_act', { p_id: +g.dataset.id, p_action: 'goal', p_data: { index: +g.dataset.goal, done: g.checked } })), g.checked ? 'Goal met' : 'Goal reopened'); render({ quiet: true }); });
  main.addEventListener('click', async e => {
    const ed = e.target.closest('[data-pipedit]'); if (ed) { const x = list().find(p => p.id === +ed.dataset.pipedit); return paPipForm({ employee_id: x.employee_id }, x); }
    const b = e.target.closest('[data-pipact]'); if (!b) return; const id = +b.dataset.id, a = b.dataset.pipact; const x = list().find(p => p.id === id);
    if (a === 'delete') { if (!await pcConfirm('Delete this draft?', esc(x.title), 'Delete')) return; await pcTry(() => q(sb.rpc('hr_perf_pip_act', { p_id: id, p_action: 'delete' })), 'Deleted'); return render({ quiet: true }); }
    if (a === 'attest') return pcEdit({ title: 'Your improvement plan', sub: esc(x.title), submit: 'Send', wide: false, fields: [{ k: 'attest', l: 'Do you accept the plan?', t: 'radio', req: true, opts: [['accepted', 'I accept'], ['rejected', 'I reject']] }, { k: 'comment', l: 'Comment', t: 'textarea' }],
      save: async v => { await q(sb.rpc('hr_perf_pip_act', { p_id: id, p_action: 'attest', p_data: v })); toast('Sent'); render({ quiet: true }); } });
    if (a === 'close') return pcEdit({ title: 'Close or extend the plan', sub: esc(`${x.name} · ${x.title}`), submit: 'Save', wide: false,
      fields: [{ k: 'outcome', l: 'Outcome', t: 'radio', req: true, opts: [['passed', 'Passed'], ['extended', 'Extend it'], ['failed', 'Not passed']] }, { k: 'end_date', l: 'New end date', t: 'date', show: v => v.outcome === 'extended' }, { k: 'note', l: 'Note', t: 'textarea' }],
      save: async v => { await q(sb.rpc('hr_perf_pip_act', { p_id: id, p_action: 'close', p_data: v })); toast(v.outcome === 'extended' ? 'Extended' : 'Closed'); render({ quiet: true }); } });
  });
}

// ================================================================ self service: Work → Performance
PC_SELF.performance = {
  async load(rest, params = {}) { params = pfP(params);
    const me = hrMe(); if (!me) return topbar('Performance') + '<div class="notice">HR hasn’t added your PeopleCore record yet, or it isn’t linked to your sign-in. Ask HR.</div>';
    const [cycles, mine, rate, arc, pips] = await Promise.all([pfCycles(true), q(sb.rpc('hr_perf_appr_list', { p_period: null, p_scope: 'mine' })), q(sb.rpc('hr_perf_appr_list', { p_period: null, p_scope: 'rate' })),
      q(sb.from('hr_perf_arc').select('cycle_id').eq('employee_id', me.id)), q(sb.rpc('hr_perf_pip_list', { p_scope: 'mine' }))]);
    const vis = cycles.filter(c => c.status !== 'archived' && c.status !== 'draft');
    const tab = this.tab = params.tab || 'objectives'; this.params = params; this.pips = pips;
    const pendingRate = rate.filter(r => r.status === 'pending' && r.open).length;
    const T = [['objectives', 'Objectives'], ['review', 'Performance review'], ['appraisal', 'Appraisal'], ...(rate.length ? [['rate', `Rate colleagues${pendingRate ? ` (${pendingRate})` : ''}`]] : []),
      ...(arc.length ? [['arc', 'Review committee']] : []), ...(pips.length ? [['pip', 'Improvement plan']] : [])];
    const cur = this.cur = pfPick(vis, params.cycle);
    const tabs = pcTabs(T.map(([k, l]) => [`#/people/work/performance?tab=${k}${cur ? '&cycle=' + cur.id : ''}`, l]), `#/people/work/performance?tab=${tab}${cur ? '&cycle=' + cur.id : ''}`);
    const head = topbar('Performance', 'Track your objectives, appraisals and reviews.', vis.length && ['objectives', 'review', 'appraisal', 'arc'].includes(tab) ? pfCycleSelect(vis, cur) : '') + tabs;
    this.mode = null;
    if (tab === 'rate') {
      if (params.a) { this.mode = 'appr'; return head + `<a class="pa-back" href="#/people/work/performance?tab=rate">← All colleagues</a>` + paHtml(await paLoad(+params.a, 'rater'), 'self'); }
      return head + pcTable('parate', [{ l: 'Colleague', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, r.kind === 'peer' ? 'as their peer' : 'as their subordinate') }, { l: 'Appraisal', v: r => r.period }, { l: 'Due', v: r => r.end_date, f: r => fd(r.end_date) },
        { l: 'Status', v: r => r.status, f: r => pcChip(r.status === 'done' ? 'ok' : r.open ? 'pending' : 'muted', r.status === 'done' ? 'Done' : r.open ? 'Waiting for you' : 'Closed') }], rate,
        { noun: 'colleague', search: false, href: r => `#/people/work/performance?tab=rate&a=${r.id}`, empty: 'Nobody to rate.' });
    }
    if (tab === 'pip') { return head + pips.map(x => paPipCard(x, 'self')).join(''); }
    if (!cur) return head + '<section class="panel"><div class="pc-empty-hero"><b>No appraisal cycle yet</b>When HR starts a cycle, you set your objectives here.</div></section>';
    if (tab === 'arc') { this.mode = 'arc'; return head + await paArcPage(cur, params, '#/people/work/performance?tab=arc&cycle=' + cur.id); }
    if (tab === 'review' || tab === 'appraisal') {
      const kind = tab; const rows = mine.filter(r => r.cycle_id === cur.id && r.kind === kind);
      const pick = rows.find(r => r.id === +params.a) || rows.find(r => r.period_status === 'open') || rows[0];
      if (!pick) return head + `<section class="panel"><div class="pc-empty-hero"><b>${kind === 'review' ? 'No performance review open' : 'No appraisal open'}</b>${kind === 'review' ? 'Mid-cycle reviews appear here when HR opens one for ' : 'Your self-appraisal opens here when HR opens the appraisal period for '}${esc(cur.title)}. You’ll get a notification.</div></section>`;
      this.mode = 'appr';
      const other = rows.length > 1 ? `<nav class="pc-tabs pa-sub">${rows.map(r => `<a href="#/people/work/performance?tab=${kind}&cycle=${cur.id}&a=${r.id}" class="${r.id === pick.id ? 'on' : ''}">${esc(r.period)}</a>`).join('')}</nav>` : '';
      return head + other + paHtml(await paLoad(pick.id), 'self');
    }
    const d = await pfLoadPlan(cur.id, null);
    return head + pfPlanHtml(d, 'self');
  },
  bind(main) {
    const s = $('#pfcyc', main); if (s) s.onchange = () => go(`#/people/work/performance?tab=${this.tab}&cycle=${s.value}`);
    if (this.mode === 'appr') return paBind(main);
    if (this.mode === 'arc') return paArcBind(main);
    if (this.tab === 'pip') return paPipBind(main, () => this.pips);
    if (this.tab === 'objectives' && this.cur) pfBindPlan(main, 'self');
  }
};

// the review committee's list (with bulk approve), or one appraisal
async function paArcPage(cur, params, base) {
  if (params.a) return `<a class="pa-back" href="${base}">← Committee list</a>` + paHtml(await paLoad(+params.a), 'arc');
  const rows = (await q(sb.rpc('hr_perf_appr_list', { p_period: null, p_scope: 'arc' }))).filter(r => r.cycle_id === cur.id); S.pc.arcRows = rows;
  const wait = rows.filter(r => r.status === 'arc').length;
  return pcKpis([[wait, 'Waiting for the committee', wait ? 'warn' : ''], [rows.filter(r => r.status === 'reveal').length, 'Approved, to reveal'], [rows.filter(r => ['employee', 'completed'].includes(r.status)).length, 'Revealed']]) +
    pcTable('paarc', [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, esc(r.manager ? 'Reviewer: ' + r.manager : '')) }, { l: 'Department', v: r => hrUnit(r.unit_id)?.name || '', f: r => esc(hrUnit(r.unit_id)?.name || '—') },
      { l: 'Final score', cls: 'num', v: r => +r.final_score || -1, f: r => r.final_score != null ? `<b>${pfPct(r.final_score)}</b>${r.arc_changed ? ' ' + pcChip('pending', 'Changed') : ''}` : '—' },
      { l: 'Rating', v: r => r.tag || '', f: r => r.tag ? pcChip(r.tag_color, r.tag) : '—' }, { l: 'Nine-box', v: r => paBoxName(paBox(r.final_score, r.potential)), f: r => esc(paBoxName(paBox(r.final_score, r.potential)) || '—') },
      { l: 'Status', v: r => r.status, f: r => pcChip(...PA_ST[r.status]) }], rows,
      { noun: 'appraisal', csv: 'Committee ' + cur.title, check: true, href: r => `${base}&a=${r.id}`, empty: 'Nothing for the committee yet.',
        filters: [{ k: 's', l: 'Status', opts: [['arc', 'Waiting for the committee'], ['reveal', 'Approved'], ['employee', 'Revealed']], test: (r, v) => v === 'employee' ? ['employee', 'completed'].includes(r.status) : r.status === v }],
        actions: wait ? `<button class="btn small primary" type="button" id="arcall">${ico('check')}Approve ticked</button>` : '' });
}
function paArcBind(main) {
  if (S.pc.pa && $('.pf-head', main) && !$('[data-tbl=paarc]', main)) return paBind(main);
  const b = $('#arcall', main); if (b) b.onclick = async () => { const ids = pcSelected('paarc').filter(r => r.status === 'arc').map(r => r.id); if (!ids.length) return toast('Tick the appraisals waiting for the committee', true);
    if (!await pcConfirm('Approve these results?', `${plural(ids.length, 'appraisal')} go to the line managers to reveal.`, 'Approve', false)) return;
    await pcTry(() => q(sb.rpc('hr_perf_appr_arc', { p_ids: ids, p_action: 'approve' })), 'Approved'); render({ quiet: true }); };
}

// ================================================================ Supervisor: Objectives · Appraisals · Improvement plans
PC_SUP.perf = {
  async load(rest, params = {}) { params = pfP(params);
    const tab = this.tab = rest[0] === 'appraisal' ? 'appraisals' : rest[0] === 'pip' ? 'pip' : params.tab || 'objectives';
    const cycles = (await pfCycles(true)).filter(c => c.status !== 'archived'); this.mode = null;
    const cur = this.cur = pfPick(cycles, params.cycle);
    const tabs = pcTabs([['#/people/sup/perf?tab=objectives', 'Objectives'], ['#/people/sup/perf?tab=appraisals', 'Appraisals & reviews'], ['#/people/sup/perf?tab=pip', 'Improvement plans']].map(([h, l]) => [h + (cur ? '&cycle=' + cur.id : ''), l]), `#/people/sup/perf?tab=${tab}${cur ? '&cycle=' + cur.id : ''}`);
    if (rest[0] === 'appraisal' && rest[1]) { this.mode = 'appr'; const d = await paLoad(+rest[1]);
      return topbar(`${esc(d.employee.name)} · ${esc(d.period?.title || 'Appraisal')}`, esc(d.cycle?.title || ''), `<a class="btn" href="#/people/sup/perf?tab=appraisals&cycle=${d.cycle?.id}">Back to my team</a>`) + paHtml(d, 'sup'); }
    if (rest[0] && rest[1] && rest[0] !== 'pip') { this.mode = 'plan'; this.one = { cycle: +rest[0], emp: +rest[1] }; const d = await pfLoadPlan(+rest[0], +rest[1]);
      return topbar(`${esc(d.employee.name)} · Objectives`, esc(d.cycle.title), `<a class="btn" href="#/people/sup/perf?cycle=${d.cycle.id}">Back to my team</a>`) + pfPlanHtml(d, 'sup'); }
    if (tab === 'pip') {
      const pips = this.pips = await q(sb.rpc('hr_perf_pip_list', { p_scope: 'team' }));
      const canNew = pfCfg().pip?.creator !== 'admin' || pcAcc().perms.includes('create-pip');
      return topbar('Improvement plans', 'Performance improvement plans for your team.', canNew ? `<button class="btn primary" id="pipnew">${ico('plus')}New plan</button>` : '') + tabs +
        (pips.length ? pips.map(x => paPipCard(x, 'sup')).join('') : '<section class="panel"><div class="pc-empty-hero"><b>No improvement plans</b>Start one from a revealed appraisal, or here.</div></section>');
    }
    if (!cur) return topbar('Team performance') + tabs + '<div class="notice">HR hasn’t set up an appraisal cycle yet.</div>';
    if (tab === 'appraisals') {
      const periods = await q(sb.from('hr_perf_periods').select('*').eq('cycle_id', cur.id).order('start_date', { ascending: false }));
      const per = this.per = periods.find(p => p.id === +params.p) || periods.find(p => p.status === 'open') || periods[0];
      const head = topbar('Team performance', 'Score your team’s appraisals and reviews, then reveal the results.', pfCycleSelect(cycles, cur)) + tabs;
      if (!per) return head + `<section class="panel"><div class="pc-empty-hero"><b>No appraisal or review open</b>HR opens appraisals for ${esc(cur.title)}.</div></section>`;
      const rows = await q(sb.rpc('hr_perf_appr_list', { p_period: per.id, p_scope: 'team' })); const n = s => rows.filter(r => r.status === s).length;
      return head + (periods.length > 1 ? `<nav class="pc-tabs pa-sub">${periods.map(p => `<a href="#/people/sup/perf?tab=appraisals&cycle=${cur.id}&p=${p.id}" class="${p.id === per.id ? 'on' : ''}">${esc(p.title)}</a>`).join('')}</nav>` : '') +
        pcKpis([[rows.length, 'In ' + per.title], [n('manager'), 'Waiting for your scores', n('manager') ? 'warn' : ''], [n('reveal'), 'Ready to reveal', n('reveal') ? 'warn' : ''], [n('self'), 'Self-appraisal not sent'], [n('completed'), 'Completed']]) +
        pcTable('pateam', [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, esc(r.emp_no || '') + (r.direct ? '' : ` · reviewer ${esc(r.manager || '')}`)) },
          { l: 'Status', v: r => r.status, f: r => pcChip(...PA_ST[r.status]) }, { l: '360°', cls: 'num', v: r => +r.raters, f: r => r.raters ? `${r.raters_done} of ${r.raters}` : '—' },
          { l: 'Final score', cls: 'num', v: r => +r.final_score || -1, f: r => r.final_score != null ? `<b>${pfPct(r.final_score)}</b>` : '—' }, { l: 'Rating', v: r => r.tag || '', f: r => r.tag ? pcChip(r.tag_color, r.tag) : '—' },
          { l: '', cls: 'num', sort: false, csv: false, f: r => r.direct && ['manager', 'reveal'].includes(r.status) ? `<span class="btn small primary">${r.status === 'manager' ? 'Score' : 'Reveal'}</span>` : '' }], rows,
          { noun: 'appraisal', csv: per.title, href: r => `#/people/sup/perf/appraisal/${r.id}`, empty: 'Nobody in your team is in this appraisal.' });
    }
    const rows = await q(sb.rpc('hr_perf_plan_list', { p_cycle: cur.id, p_scope: 'team' })); const n = s => rows.filter(r => r.status === s).length;
    const cols = [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, esc(r.emp_no || '') + (r.direct ? '' : ` · reports to ${esc(r.manager || '')}`)) },
      { l: 'Objectives', cls: 'num', v: r => +r.objectives, f: r => r.objectives || '—' },
      { l: 'Status', v: r => r.status, f: r => pcChip(...PF_ST[r.status]) + (r.frozen ? ' ' + pcChip('muted', 'Frozen') : '') },
      { l: 'Progress', v: r => +r.progress || -1, f: r => r.progress != null && r.status === 'approved' ? `<span class="pf-tp">${pfBar(r.progress)}<b>${pfPct(r.progress)}</b></span>` : '—' },
      { l: '', cls: 'num', sort: false, csv: false, f: r => r.direct && r.status === 'submitted' ? `<span class="btn small primary">Review</span>` : r.direct && ['none', 'draft', 'returned'].includes(r.status) && cur.status === 'active' ? '<span class="btn small">Set objectives</span>' : '' }];
    return topbar('Team performance', 'Set, approve and follow your team’s objectives.', pfCycleSelect(cycles, cur)) + tabs +
      pcKpis([[rows.length, 'In this cycle'], [n('submitted'), 'Waiting for you', n('submitted') ? 'warn' : ''], [n('approved'), 'Approved'], [n('none') + n('draft'), 'Not sent yet'], [n('returned'), 'Returned']]) +
      pcTable('pfteam', cols, rows, { noun: 'employee', csv: 'Team objectives', href: r => `#/people/sup/perf/${cur.id}/${r.employee_id}`, empty: 'Nobody in your team is in this cycle.',
        filters: [{ k: 's', l: 'Status', opts: Object.entries(PF_ST).map(([k, v]) => [k, v[1]]), test: (r, v) => r.status === v }] });
  },
  bind(main) {
    const s = $('#pfcyc', main); if (s) s.onchange = () => go(`#/people/sup/perf?tab=${this.tab}&cycle=${s.value}`);
    if (this.mode === 'appr') return paBind(main);
    if (this.mode === 'plan') return pfBindPlan(main, 'sup');
    if (this.tab === 'pip') { const b = $('#pipnew', main); if (b) b.onclick = () => paPipForm({}); paPipBind(main, () => this.pips); }
  }
};

// ================================================================ Admin: appraisals & reviews
PF.pages.appraisals = { perms: ['view-employee-appraisal-status', 'view-appraisal-period', 'view-performance-review', 'create-appraisal-period'],
  async load(rest, params = {}) { params = pfP(params);
    this.mode = null;
    if (rest[0] && rest[1]) { this.mode = 'appr'; const d = await paLoad(+rest[1]);
      return topbar(`${esc(d.employee.name)} · ${esc(d.period.title)}`, esc(d.cycle.title), `<a class="btn" href="#/people/admin/perf/appraisals?p=${d.period.id}&cycle=${d.cycle.id}">Back to the list</a>`) + paHtml(d, 'admin'); }
    const cycles = await pfCycles(true); const cur = this.cur = pfPick(cycles, params.cycle);
    const head = topbar('Appraisals & reviews', 'Open an appraisal or a mid-cycle review, follow it, and step in where needed.', (cycles.length ? pfCycleSelect(cycles, cur) : '') +
      (pcCan('upload-individual-scores') ? `<button class="btn" id="perpast">${ico('up')}Upload past results</button>` : '') +
      (cur?.status === 'active' && pcCan('create-appraisal-period', 'create-performance-review') ? `<button class="btn primary" id="pernew">${ico('plus')}Open appraisal or review</button>` : ''));
    if (!cur) return head + '<section class="panel"><div class="pc-empty-hero"><b>No appraisal cycles yet</b></div></section>';
    const periods = this.periods = await q(sb.from('hr_perf_periods').select('*').eq('cycle_id', cur.id).order('start_date', { ascending: false }));
    const per = this.per = periods.find(p => p.id === +params.p) || periods.find(p => p.status === 'open') || periods[0];
    if (!per) return head + `<section class="panel"><div class="pc-empty-hero"><b>Nothing opened yet in ${esc(cur.title)}</b>${cur.status === 'active' ? 'Open the end-of-cycle appraisal, or a mid-cycle performance review.' : 'Start the cycle first (Appraisal cycles → Actions).'}</div></section>`;
    const rows = this.rows = await q(sb.rpc('hr_perf_appr_list', { p_period: per.id, p_scope: 'admin' })); const n = s => rows.filter(r => r.status === s).length;
    const pacts = [per.status === 'open' && pcCan('nudge-appraisal-employee', 'nudge-performance-review-employees') ? ['nudge', 'Nudge everyone who is behind'] : null, pcCan('extend-appraisal-period', 'extend-performance-review') ? ['extend', 'Change the end date'] : null,
      per.status === 'open' && pcCan('close-appraisal-period', 'close-performance-review') ? ['close', 'Close'] : null, per.status === 'closed' && pcCan('reopen-appraisal-period', 'extend-performance-review') ? ['reopen', 'Reopen'] : null,
      per.status === 'scheduled' && pcCan('edit-appraisal-period') ? ['open', 'Open it now'] : null, pcCan('edit-appraisal-period', 'edit-performance-review') ? ['edit', 'Edit'] : null,
      pcCan('delete-appraisal-period', 'delete-performance-review') ? ['delete', 'Delete'] : null].filter(Boolean);
    return head + (periods.length > 1 ? `<nav class="pc-tabs pa-sub">${periods.map(p => `<a href="#/people/admin/perf/appraisals?cycle=${cur.id}&p=${p.id}" class="${p.id === per.id ? 'on' : ''}">${esc(p.title)}</a>`).join('')}</nav>` : '') +
      `<section class="panel pf-cycard"><div class="body"><div><h2>${esc(per.title)} ${pcChip(per.status === 'open' ? 'ok' : per.status === 'scheduled' ? 'pending' : 'muted', { open: 'Open', scheduled: 'Scheduled', closed: 'Closed' }[per.status])} ${pcChip('muted', per.kind === 'review' ? 'Performance review' : 'Appraisal')}</h2>
        <div class="sub">${fd(per.start_date)} – ${fd(per.end_date)}${per.only_emps ? ` · ${plural(per.only_emps.length, 'person', 'people')} chosen` : ''}${per.peers && per.kind === 'appraisal' ? ' · 360° on' : ''}</div></div>
        ${pacts.length ? `<select class="inline mini" id="peract" aria-label="Actions"><option value="">Actions…</option>${pacts.map(([k, l]) => opt(k, l, '')).join('')}</select>` : ''}</div></section>` +
      pcKpis([[rows.length, 'People'], [n('self'), 'Self-appraisal'], [n('manager'), 'With line managers'], [n('arc'), 'With the committee'], [n('reveal') + n('employee'), 'Reveal & sign-off'], [n('completed'), 'Completed'], [rows.filter(r => r.attest === 'disagree').length, 'Disagreed', rows.some(r => r.attest === 'disagree') ? 'warn' : '']]) +
      pcTable('paall', [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, esc(r.emp_no || '')) }, { l: 'Department', v: r => hrUnit(r.unit_id)?.name || '', f: r => esc(hrUnit(r.unit_id)?.name || '—') },
        { l: 'Reviewer', v: r => r.manager || '', f: r => esc(r.manager || '—') }, { l: 'Status', v: r => r.status, f: r => pcChip(...PA_ST[r.status]) + (r.attest === 'disagree' ? ' ' + pcChip('rejected', 'Disagrees') : ''), csv: r => PA_ST[r.status][1] },
        { l: 'Objectives', cls: 'num', v: r => +r.obj_score || -1, f: r => pfPct(r.obj_score), csv: r => r.obj_score ?? '' }, { l: 'Core values', cls: 'num', v: r => +r.cv_score || -1, f: r => pfPct(r.cv_score), csv: r => r.cv_score ?? '' },
        { l: 'Final', cls: 'num', v: r => +r.final_score || -1, f: r => r.final_score != null ? `<b>${pfPct(r.final_score)}</b>${r.arc_changed ? ' ' + pcChip('pending', 'ARC') : ''}` : '—', csv: r => r.final_score ?? '' },
        { l: 'Rating', v: r => r.tag || '', f: r => r.tag ? pcChip(r.tag_color, r.tag) : '—' }], rows,
        { noun: 'appraisal', csv: per.title, href: r => `#/people/admin/perf/appraisals/${per.id}/${r.id}`, empty: 'Nobody is in this appraisal.',
          filters: [{ k: 's', l: 'Status', opts: Object.entries(PA_ST).map(([k, v]) => [k, v[1]]), test: (r, v) => r.status === v }, { k: 'u', l: 'Department', opts: pcDepts().filter(u => rows.some(r => r.unit_id === u.id)).map(u => [u.id, u.name]), test: (r, v) => r.unit_id === +v }] });
  },
  bind(main) {
    if (this.mode === 'appr') return paBind(main);
    const s = $('#pfcyc', main); if (s) s.onchange = () => go('#/people/admin/perf/appraisals?cycle=' + s.value);
    const nb = $('#pernew', main); if (nb) nb.onclick = () => paPeriodForm(this.cur);
    const pp = $('#perpast', main); if (pp) pp.onclick = () => paPastUpload();
    const pa = $('#peract', main); if (pa) pa.onchange = async () => { const a = pa.value; pa.value = ''; const per = this.per; if (!a) return;
      if (a === 'edit') return paPeriodForm(this.cur, per);
      if (a === 'extend') return pcEdit({ title: 'Change the end date', wide: false, fields: [{ k: 'd', l: 'New end date', t: 'date', req: true }], vals: { d: per.end_date },
        save: async v => { await q(sb.rpc('hr_perf_period_action', { p_id: per.id, p_action: 'extend', p_date: v.d })); toast('End date changed'); pcRefresh(); } });
      const ask = { close: ['Close it?', 'Nobody can score after this. You can reopen it.', 'Close', false], delete: ['Delete it?', 'Only possible while nobody has sent anything.', 'Delete', true], nudge: ['Send reminders?', 'Everyone whose step is waiting gets a notification.', 'Send', false] }[a];
      if (ask && !await pcConfirm(...ask)) return;
      const n = await pcTry(() => q(sb.rpc('hr_perf_period_action', { p_id: per.id, p_action: a })), { close: 'Closed', reopen: 'Reopened', open: 'Opened', delete: 'Deleted' }[a]);
      if (a === 'nudge') toast(`${plural(n, 'reminder')} sent`); if (a === 'delete') return go('#/people/admin/perf/appraisals?cycle=' + this.cur.id); pcRefresh(); };
  }
};
async function paPeriodForm(cycle, per) {
  const fields = [{ k: 'kind', l: 'What to open', t: 'radio', opts: [['appraisal', 'End-of-cycle appraisal'], ['review', 'Performance review (mid-cycle)']], dis: !!per },
    { k: 'title', l: 'Title', req: true, wide: true }, { k: 'start_date', l: 'Opens', t: 'date', req: true, hint: 'A date in the future opens it on that day.' }, { k: 'end_date', l: 'Closes', t: 'date', req: true },
    { k: 'peers', l: 'Ask peers and subordinates to rate core values (360°)', t: 'switch', show: v => (v.kind || 'appraisal') === 'appraisal' },
    { k: 'only_emps', l: 'Only these people (leave empty for everyone in the cycle)', t: 'checks', opts: pcPeopleList() }];
  return pcEdit({ title: per ? 'Edit ' + per.title : 'Open an appraisal or review', sub: `${esc(cycle.title)} · Everyone in the cycle is told when it opens.`, wide: true, fields,
    vals: per || { kind: 'appraisal', title: cycle.title.replace(/ ?Cycle$/i, ''), start_date: localISO(0), end_date: cycle.end_date, peers: true },
    save: async v => { const id = await q(sb.rpc('hr_perf_period_save', { p: { ...v, id: per?.id || null, cycle_id: cycle.id, kind: v.kind || per?.kind || 'appraisal' } })); toast(per ? 'Saved' : 'Opened: staff are told'); go(`#/people/admin/perf/appraisals?cycle=${cycle.id}&p=${id}`); } });
}

// ================================================================ Admin: improvement plans
PF.pages.pip = { perms: ['view-pip', 'create-pip', 'close-pip'],
  async load() {
    const pips = this.pips = await q(sb.rpc('hr_perf_pip_list', { p_scope: 'admin' }));
    const n = s => pips.filter(p => p.status === s).length;
    return topbar('Improvement plans', 'Every performance improvement plan, its goals and outcome.', pcCan('create-pip') ? `<button class="btn primary" id="pipnew">${ico('plus')}New plan</button>` : '') +
      pcKpis([[n('active'), 'In progress'], [n('draft'), 'Drafts'], [pips.filter(p => p.outcome === 'passed').length, 'Passed'], [pips.filter(p => p.outcome === 'failed').length, 'Not passed']]) +
      pcTable('pipall', [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, esc(r.manager ? 'Line manager: ' + r.manager : '')) }, { l: 'Plan', v: r => r.title, f: r => `<b>${esc(r.title)}</b>` },
        { l: 'Dates', v: r => r.end_date, f: r => `${fd(r.start_date)} – ${fd(r.end_date)}` }, { l: 'Goals met', cls: 'num', v: r => r.goals_done, f: r => `${r.goals_done} of ${r.goals.length}` },
        { l: 'Accepted', v: r => r.attest || '', f: r => r.attest ? pcChip(r.attest === 'accepted' ? 'ok' : 'rejected', r.attest === 'accepted' ? 'Accepted' : 'Rejected') : '—' },
        { l: 'Status', v: r => r.status, f: r => pcChip(...PIP_ST[r.status]) + (r.outcome ? ' ' + pcChip(...PIP_OUT[r.outcome]) : '') }], pips,
        { noun: 'plan', csv: 'Improvement plans', empty: 'No improvement plans yet.',
          onRow: r => modal({ title: r.title, sub: esc(r.name), submit: null, cancel: 'Close', wide: true, body: paPipCard(r, 'admin'),
            onOpen: (d, close) => { d.addEventListener('click', e => { if (e.target.closest('[data-pipact],[data-pipedit]')) setTimeout(() => close(null), 0); }, true); paPipBind(d, () => this.pips); } }) });
  },
  bind(main) { const b = $('#pipnew', main); if (b) b.onclick = () => paPipForm({}); }
};

// ================================================================ Admin: reports and the nine-box
PF.pages.reports = { perms: ['view-report-and-analytics', 'configure-ninebox-matrix', 'view-employee-ninebox-matrix-position'],
  async load(rest, params = {}) { params = pfP(params);
    const cycles = await pfCycles(true); const cur = this.cur = pfPick(cycles, params.cycle);
    const head = topbar('Reports & nine-box', 'Results across the company for an appraisal.', cycles.length ? pfCycleSelect(cycles, cur) : '');
    if (!cur) return head;
    const periods = (await q(sb.from('hr_perf_periods').select('*').eq('cycle_id', cur.id).eq('kind', 'appraisal').order('start_date', { ascending: false })));
    const per = periods.find(p => p.id === +params.p) || periods[0];
    if (!per) return head + `<section class="panel"><div class="pc-empty-hero"><b>No appraisal in ${esc(cur.title)} yet</b>Reports fill in as appraisals are scored.</div></section>`;
    const rows = this.rows = (await q(sb.rpc('hr_perf_appr_list', { p_period: per.id, p_scope: 'admin' }))).filter(r => r.status !== 'skipped');
    const scored = rows.filter(r => r.final_score != null); const avg = scored.length ? scored.reduce((a, r) => a + +r.final_score, 0) / scored.length : null;
    const tags = await q(sb.from('hr_perf_tags').select('*').eq('active', true).order('min_score', { ascending: false }));
    const byUnit = Object.values(scored.reduce((m, r) => { const k = hrUnit(r.unit_id)?.name || 'No department'; (m[k] = m[k] || { name: k, s: 0, n: 0 }); m[k].s += +r.final_score; m[k].n++; return m; }, {})).map(u => ({ name: u.name, n: Math.round(u.s / u.n * 10) / 10 })).sort((a, b) => b.n - a.n);
    const grid = { high: ['low', 'mid', 'high'], average: ['low', 'mid', 'high'], low: ['low', 'mid', 'high'] };
    const cell = (perf, pot) => { const k = `${perf}_${pot}`; const ppl = scored.filter(r => paBox(r.final_score, r.potential) === k);
      return `<div class="nb-cell nb-${perf}-${pot}"><b>${esc(paBoxName(k))}</b><span class="nb-n">${ppl.length}</span><div class="nb-ppl">${ppl.slice(0, 6).map(r => `<a href="#/people/admin/perf/appraisals/${per.id}/${r.id}" title="${esc(r.name)} · ${pfPct(r.final_score)}">${hrAv(hrCard(r.employee_id) || r, 'sm')}</a>`).join('')}${ppl.length > 6 ? `<em>+${ppl.length - 6}</em>` : ''}</div></div>`; };
    const nb = pfCfg().ninebox || {};
    return head + (periods.length > 1 ? `<nav class="pc-tabs pa-sub">${periods.map(p => `<a href="#/people/admin/perf/reports?cycle=${cur.id}&p=${p.id}" class="${p.id === per.id ? 'on' : ''}">${esc(p.title)}</a>`).join('')}</nav>` : '') +
      pcKpis([[rows.length, 'In the appraisal'], [scored.length, 'Scored'], [pfPct(avg == null ? null : Math.round(avg * 10) / 10), 'Average final score'], [rows.filter(r => r.status === 'completed').length, 'Signed off'], [rows.filter(r => r.attest === 'disagree').length, 'Disagreed']]) +
      `<div class="pc-grid2"><section class="panel"><header><h2>Rating tags</h2></header>${pcBars(tags.map(t => ({ name: t.name, n: scored.filter(r => r.tag === t.name).length })), { pct: true })}</section>
        <section class="panel"><header><h2>Average final score by department</h2></header>${byUnit.length ? `<ul class="pc-bars">${byUnit.map((u, i) => `<li><span class="pc-bl">${esc(u.name)}</span><span class="pc-bt"><i style="width:${Math.max(2, Math.min(100, u.n))}%" class="c${i % 6}"></i></span><span class="pc-bv">${pfNum(u.n)}%</span></li>`).join('')}</ul>` : '<div class="empty">No scores yet</div>'}</section></div>` +
      (pfCfg().ninebox_on !== false ? `<section class="panel"><header><h2>Nine-box matrix</h2><span class="meta">Final score against the potential line managers chose · Meets from ${pfNum(nb.meets ?? 55)}%, exceeds from ${pfNum(nb.exceeds ?? 70)}%</span>${pcCan('configure-ninebox-matrix') ? `<span class="right"><button class="btn small" id="nbset">${ico('gear')}Set up</button></span>` : ''}</header>
        <div class="body"><div class="nb"><div class="nb-y">Potential</div><div class="nb-grid">${['high', 'average', 'low'].map(pot => `<div class="nb-row"><span class="nb-lbl">${pot === 'average' ? 'Average' : pot[0].toUpperCase() + pot.slice(1)}</span>${grid[pot].map(perf => cell(perf, pot)).join('')}</div>`).join('')}
          <div class="nb-row nb-x"><span class="nb-lbl"></span><span>Does not meet expectations</span><span>Meets expectations</span><span>Exceeds expectations</span></div></div></div></div></section>` : '') +
      pcTable('parep', [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.employee_id) || r, esc(r.emp_no || '')) }, { l: 'Department', v: r => hrUnit(r.unit_id)?.name || '', f: r => esc(hrUnit(r.unit_id)?.name || '—') },
        { l: 'Objectives', cls: 'num', v: r => +r.obj_score || -1, f: r => pfPct(r.obj_score), csv: r => r.obj_score ?? '' }, { l: 'Core values', cls: 'num', v: r => +r.cv_score || -1, f: r => pfPct(r.cv_score), csv: r => r.cv_score ?? '' },
        { l: 'Deduction', cls: 'num', v: r => +r.deduction, f: r => +r.deduction ? '−' + pfNum(r.deduction) : '—', csv: r => r.deduction ?? '' }, { l: 'Final', cls: 'num', v: r => +r.final_score || -1, f: r => r.final_score != null ? `<b>${pfPct(r.final_score)}</b>` : '—', csv: r => r.final_score ?? '' },
        { l: 'Rating', v: r => r.tag || '', f: r => r.tag ? pcChip(r.tag_color, r.tag) : '—' }, { l: 'Potential', v: r => r.potential || '', f: r => esc(PA_POT.find(x => x[0] === r.potential)?.[1] || '—') },
        { l: 'Nine-box', v: r => paBoxName(paBox(r.final_score, r.potential)), f: r => esc(paBoxName(paBox(r.final_score, r.potential)) || '—') },
        { l: 'Recommendation', v: r => r.recommendation || '', f: r => esc([...PA_REC.appraisal, ...PA_REC.probation].find(x => x[0] === r.recommendation)?.[1] || '—') }, { l: 'Status', v: r => r.status, f: r => pcChip(...PA_ST[r.status]), csv: r => PA_ST[r.status][1] }], rows,
        { noun: 'employee', csv: 'Appraisal report ' + per.title, href: r => `#/people/admin/perf/appraisals/${per.id}/${r.id}`, filters: [{ k: 't', l: 'Rating', opts: tags.map(t => [t.name, t.name]), test: (r, v) => r.tag === v }] });
  },
  bind(main) {
    const s = $('#pfcyc', main); if (s) s.onchange = () => go('#/people/admin/perf/reports?cycle=' + s.value);
    const b = $('#nbset', main); if (b) b.onclick = () => { const nb = pfCfg().ninebox || {}; const keys = ['low', 'mid', 'high'].flatMap(p => ['high', 'average', 'low'].map(o => `${p}_${o}`));
      const lbl = k => { const [p, o] = k.split('_'); return `${{ low: 'Below', mid: 'Meets', high: 'Exceeds' }[p]} · ${o} potential`; };
      pcEdit({ title: 'Nine-box matrix', sub: 'Where the performance bands start, and what each box is called.', wide: true,
        fields: [{ k: 'meets', l: 'Meets expectations from (%)', t: 'number', req: true }, { k: 'exceeds', l: 'Exceeds expectations from (%)', t: 'number', req: true }, ...keys.map(k => ({ k: 'b_' + k, l: lbl(k), req: true }))],
        vals: { meets: nb.meets ?? 55, exceeds: nb.exceeds ?? 70, ...Object.fromEntries(keys.map(k => ['b_' + k, nb.boxes?.[k] || ''])) },
        save: async v => { const ninebox = { meets: v.meets, exceeds: v.exceeds, boxes: Object.fromEntries(keys.map(k => [k, v['b_' + k]])) }; if (ninebox.exceeds <= ninebox.meets) throw new Error('Exceeds must start above Meets');
          await q(sb.rpc('hr_perf_settings_save', { p: { ninebox } })); S.settings.people = { ...(S.settings.people || {}), perf: { ...pfCfg(), ninebox } }; toast('Saved'); render({ quiet: true }); } }); };
  }
};
