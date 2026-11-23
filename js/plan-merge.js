/* GANKCO Nest 3.0.13 — one materials request for several wells of a client (from the Job planner), and tool clashes */
'use strict';

// The wells of one campaign are done one after another, so the tools that come back (the planner's service tools: EMST, sleeves,
// rods, adapter kits, retrieving tools) go on the request once per size. Everything else (packers, screens, blanks...) adds up.
const sameClient = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const PM_WINDOW = 14;   // planned jobs this many days apart or closer count as at the same time (for clashes)
const pmDays = (a, b) => Math.abs((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 864e5);

// one tool for several tubing sizes: sizes with the same shared stock name, or linked to the same Nest item(s)
// (e.g. the 2.125" EMST used for both 2-7/8" and 3-1/2" tubing)
function pmToolKey(E, part, size) {
  const l = E.linkOf(part.id, size); const ids = (l?.item_ids || []).map(Number).sort((a, b) => a - b);
  return l?.pool ? 'pool:' + l.pool.trim().toLowerCase() : ids.length ? 'items:' + ids.join(',') : 'size:' + size;
}
// what a set of planned jobs needs: part × size → quantity, and which wells it's for (a tool once, however many sizes use it)
function planDemand(E, jobs) {
  const m = new Map();
  for (const j of jobs) {
    const r = E.results.get(j.id); if (!r) continue;
    for (const ln of r.lines) {
      const svc = ln.part.kind === 'service'; const q = svc ? 1 : +ln.qty || 0;
      if (!q) continue;
      const k = svc ? 'svc|' + ln.part.id + '|' + pmToolKey(E, ln.part, ln.size) : ln.part.id + '|' + ln.size;
      // a tool shared by sizes: link from a size that is linked to items, if any
      const x = m.get(k) || m.set(k, { k, part: ln.part, size: ln.size, sizes: [], svc, qty: 0, wells: [] }).get(k);
      if (!x.sizes.includes(ln.size)) x.sizes.push(ln.size);
      if (svc && !(E.linkOf(ln.part.id, x.size)?.item_ids || []).length && (E.linkOf(ln.part.id, ln.size)?.item_ids || []).length) x.size = ln.size;
      x.qty = svc ? 1 : x.qty + q; x.wells.push({ title: j.title, qty: q });
    }
  }
  return m;
}
const pmSizes = d => (d.sizes && d.sizes.length ? d.sizes : [d.size]).join(' / ');
// other open requests of this client: which of their items each one holds (a tool already out, or already asked for)
async function pmClientHolds(client, exceptId) {
  const rows = await q(sb.from('jobs').select('id,job_no,status,client,job_lines(item_id,qty,checkouts(closed_at))').in('status', ['draft', 'submitted', 'partial', 'out']));
  const held = new Map();
  rows.filter(r => r.id !== exceptId && sameClient(r.client, client)).forEach(r => (r.job_lines || []).forEach(l => {
    if (['partial', 'out'].includes(r.status) && l.checkouts && l.checkouts.closed_at) return;   // already back
    if (!held.has(l.item_id)) held.set(l.item_id, r);
  }));
  return held;
}
// pick Nest items off the shelf for a demand (most stock first), skipping tools this client already has on another open request
function pmPick(E, demand, held, used = {}) {
  const rows = [], missing = [], leftOff = [];
  const take = (itemId, n) => {
    const locs = S.locs.filter(l => l.active).map(l => ({ l, q: stockOf(itemId, l.id) - (used[itemId + ':' + l.id] || 0) })).filter(x => x.q > 0).sort((a, b) => b.q - a.q);
    let left = n;
    for (const x of locs) { if (!left) break; const t = Math.min(left, x.q); used[itemId + ':' + x.l.id] = (used[itemId + ':' + x.l.id] || 0) + t; rows.push({ item_id: itemId, location_id: x.l.id, qty: t, key: demand.k }); left -= t; }
    return left;
  };
  for (const d of demand.values ? demand.values() : demand) {
    const link = E.linkOf(d.part.id, d.size); const ids = (link?.item_ids || []).map(Number);
    if (d.svc && held) { const h = ids.map(i => held.get(i)).find(Boolean); if (h) { leftOff.push({ d, req: h }); continue; } }
    let left = d.qty;
    for (const id of ids.sort((a, b) => (E.avail[b] || 0) - (E.avail[a] || 0))) { if (!left) break; left = take(id, left); }
    if (left > 0) missing.push({ d, n: left });
  }
  return { rows, missing, leftOff };
}
const pmMergeRows = rows => { const m = {}; rows.forEach(x => { const k = x.item_id + ':' + x.location_id; m[k] = m[k] ? { ...m[k], qty: m[k].qty + x.qty } : { item_id: x.item_id, location_id: x.location_id, qty: x.qty }; }); return Object.values(m); };
const pmWells = jobs => jobs.map(j => j.title).join(', ');
const pmTitle = (client, jobs) => `${client ? client + ' · ' : ''}${pmWells(jobs)}`.slice(0, 200);
const pmItem = id => (S.items || []).find(i => i.id === +id);
const pmLines = (title, list, fmt) => list.length ? `<div class="pm-sec">${title}</div>${list.map(fmt).join('')}` : '';

// ---------------------------------------------------------------- the Job planner: one request for the ticked wells
async function planMergeRequest(jobs) {
  if (!jobs.length) return;
  const client = jobs[0].customer || '';
  if (jobs.some(j => !sameClient(j.customer, client))) return toast('Only wells of the same client can share a request.', true);
  const P = await planData(true); const E = planEngine(P); await stockRows(true);
  jobs = jobs.map(j => P.jobs.find(x => x.id === j.id)).filter(j => j && E.results.get(j.id) && !j.mr_id);
  if (!jobs.length) return toast('Those jobs already have a request.', true);
  const held = await pmClientHolds(client, null);
  const drafts = [...new Map([...held.values()].filter(r => r.status === 'draft').map(r => [r.id, r])).values()];
  const demand = planDemand(E, jobs); const pick = pmPick(E, demand, held);
  const lines = pmMergeRows(pick.rows);
  const tools = [...demand.values()].filter(d => d.svc), rest = [...demand.values()].filter(d => !d.svc);
  const row = (d, extra = '') => `<div class="pm-row"><span>${esc(partName(d.part))} <span class="sub">${esc(pmSizes(d))}</span></span><span class="sub">${d.svc ? esc(d.wells.map(w => w.title).join(', ')) : esc(d.wells.map(w => fq(w.qty)).join(' + '))}</span><b>${fq(d.qty)}</b>${extra}</div>`;
  const locCount = {}; lines.forEach(x => locCount[x.location_id] = (locCount[x.location_id] || 0) + 1);
  const base = +Object.entries(locCount).sort((a, b) => b[1] - a[1])[0]?.[0] || realLocs()[0]?.id;
  return modal({ title: jobs.length > 1 ? `One materials request for ${plural(jobs.length, 'job')}` : `Materials request for ${jobs[0].title}`, wide: true, submit: 'Create draft request',
    sub: `${esc(client || 'No client')} · ${esc(pmWells(jobs))}. Nest picks the linked items from the locations with the most stock. You can change anything on the draft before sending it.`,
    body: `${drafts.length ? `<label class="f">Put them on<select name="to"><option value="new">A new request</option>${drafts.map(d => opt(d.id, `${d.job_no} (draft for ${client})`)).join('')}</select><span class="hint">Adding to a draft adds only what the draft doesn’t already have: a tool size it already carries isn’t added again.</span></label>` : ''}
      <div class="pm-box">${pmLines('Tools that come back · one per size', tools, d => row(d))}
      ${pmLines('Used up or left in the well · added up', rest, d => row(d))}</div>
      ${pick.leftOff.length ? `<div class="notice">${ico('check')} Left off, already on another request for ${esc(client)}: ${pick.leftOff.map(x => `${esc(partName(x.d.part))} ${esc(pmSizes(x.d))} on <b>${esc(x.req.job_no)}</b>${x.req.status === 'draft' ? ' (draft)' : ''}`).join('; ')}.</div>` : ''}
      ${pick.missing.length ? `<div class="notice bad">Not on the shelf, so not added: ${pick.missing.map(x => `${fq(x.n)} × ${esc(partName(x.d.part))} (${esc(pmSizes(x.d))})`).join(', ')}.${pick.missing.some(x => x.d.svc) && canEditPlan() ? ' If a tool is the same one used for another size, link that size to the same Nest item in Job planner → Setup.' : ''}</div>` : ''}
      <p class="muted small">${plural(lines.length, 'line')} ready${lines.length ? `, leaving from ${esc(locName(base))}` : ''}.</p>`,
    onSubmit: async x => {
      if (x.to && x.to !== 'new') { await pmAddJobs(+x.to, jobs.map(j => j.id)); return; }
      if (!lines.length) throw new Error('Nothing on the shelf to add for these jobs.');
      const first = jobs.map(j => j.planned_on).filter(Boolean).sort()[0] || null;
      const nj = await q(sb.from('jobs').insert({ title: pmTitle(client, jobs), client: client || null, field: pmWells(jobs).slice(0, 200), base_location_id: base, start_date: first,
        notes: `From Job planner · ${plural(jobs.length, 'well')}: ${pmWells(jobs)}. Tools that come back are on it once per size.` }).select().single());
      await q(sb.from('job_lines').insert(lines.map(l => ({ ...l, job_id: nj.id }))));
      await q(sb.from('plan_jobs').update({ mr_id: nj.id }).in('id', jobs.map(j => j.id)));
      S.plan = null; toast(`${nj.job_no} created as a draft for ${plural(jobs.length, 'well')}`); go('#/job/' + nj.id);
    } });
}

// ---------------------------------------------------------------- change the wells on a draft: only the difference is added or taken off,
// so lines added by hand stay as they are. A tool stays while any well on the request still needs that size.
async function pmApplyChange(reqId, beforeIds, afterIds) {
  const P = await planData(true); const E = planEngine(P); await stockRows(true);
  const byId = id => P.jobs.find(j => j.id === id);
  const before = planDemand(E, beforeIds.map(byId).filter(Boolean)), after = planDemand(E, afterIds.map(byId).filter(Boolean));
  const req = await q(sb.from('jobs').select('id,client,status').eq('id', reqId).single());
  if (req.status !== 'draft') throw new Error('Only a draft request can be changed.');
  const lines = await q(sb.from('job_lines').select('id,item_id,location_id,qty').eq('job_id', reqId).order('id'));
  const add = new Map(), less = [];
  new Set([...before.keys(), ...after.keys()]).forEach(k => {
    const a = after.get(k), b = before.get(k); const delta = (a?.qty || 0) - (b?.qty || 0);
    if (delta > 0) add.set(k, { ...a, qty: delta }); else if (delta < 0) less.push({ d: b, n: -delta });
  });
  // take off what's no longer needed, from the lines of the linked items
  for (const { d, n } of less) {
    let left = n; const ids = (E.linkOf(d.part.id, d.size)?.item_ids || []).map(Number);
    for (const l of lines.filter(x => ids.includes(x.item_id)).reverse()) {
      if (!left) break; const t = Math.min(left, +l.qty); left -= t; l.qty = +l.qty - t;
      if (l.qty <= 0) await q(sb.from('job_lines').delete().eq('id', l.id)); else await q(sb.from('job_lines').update({ qty: l.qty }).eq('id', l.id));
    }
  }
  // add what's new (tools this client already has on another request are left off)
  const held = await pmClientHolds(req.client, reqId);
  const used = {}; lines.forEach(l => { if (l.qty > 0) used[l.item_id + ':' + l.location_id] = (used[l.item_id + ':' + l.location_id] || 0) + +l.qty; });
  // a tool size the request already carries (added by hand, say) isn't added again
  for (const [k, d] of add) if (d.svc && lines.some(l => l.qty > 0 && (E.linkOf(d.part.id, d.size)?.item_ids || []).map(Number).includes(l.item_id))) add.delete(k);
  const pick = pmPick(E, add, held, used);
  for (const r of pmMergeRows(pick.rows)) {
    const same = lines.find(l => l.item_id === r.item_id && l.location_id === r.location_id && l.qty > 0);
    if (same) await q(sb.from('job_lines').update({ qty: +same.qty + r.qty }).eq('id', same.id));
    else await q(sb.from('job_lines').insert({ ...r, job_id: reqId }));
  }
  return pick;
}
const pmDone = (pick, what) => toast(`${what}${pick.missing.length ? ` · not on the shelf: ${pick.missing.map(x => `${fq(x.n)} × ${partName(x.d.part)} (${pmSizes(x.d)})`).join(', ')}` : ''}${pick.leftOff.length ? ` · left off, already on ${[...new Set(pick.leftOff.map(x => x.req.job_no))].join(', ')}` : ''}`, !!pick.missing.length);
async function pmAddJobs(reqId, ids) {
  const cur = (await q(sb.from('plan_jobs').select('id').eq('mr_id', reqId))).map(x => x.id);
  const pick = await pmApplyChange(reqId, cur, [...cur, ...ids]);
  await q(sb.from('plan_jobs').update({ mr_id: reqId }).in('id', ids));
  await pmRetitle(reqId);
  S.plan = null; pmDone(pick, `Added ${plural(ids.length, 'well')}`); go('#/job/' + reqId); render({ quiet: true });
}
async function pmRemoveJob(reqId, planId) {
  const cur = (await q(sb.from('plan_jobs').select('id').eq('mr_id', reqId))).map(x => x.id);
  const pick = await pmApplyChange(reqId, cur, cur.filter(x => x !== planId));
  await q(sb.from('plan_jobs').update({ mr_id: null, mr_note: null }).eq('id', planId));
  await pmRetitle(reqId);
  S.plan = null; pmDone(pick, 'Well taken off; its items came off the request');
}
// the request's title follows its wells (when it was made from the planner)
async function pmRetitle(reqId) {
  const [req, pj] = await Promise.all([q(sb.from('jobs').select('id,client,notes').eq('id', reqId).single()), q(sb.from('plan_jobs').select('title,planned_on').eq('mr_id', reqId).order('planned_on'))]);
  if (!pj.length || !/^From Job planner/.test(req.notes || '')) return;
  await q(sb.from('jobs').update({ title: pmTitle(req.client, pj), field: pmWells(pj).slice(0, 200), notes: `From Job planner · ${plural(pj.length, 'well')}: ${pmWells(pj)}. Tools that come back are on it once per size.` }).eq('id', reqId));
}

// ---------------------------------------------------------------- the request page: its wells, add one, take one off, merge two drafts
async function pmRequestPanel(j) {
  const [mine, open] = await Promise.all([q(sb.from('plan_jobs').select('id,title,customer,planned_on,tubing_size').eq('mr_id', j.id).order('planned_on')),
    j.status === 'draft' || j.status === 'submitted' ? q(sb.from('plan_jobs').select('id,title,customer,planned_on,tubing_size,status').is('mr_id', null).eq('status', 'planned').order('planned_on')) : []]);
  const avail = (open || []).filter(p => sameClient(p.customer, j.client));
  const can = !readOnly() && canRequest() && ['draft', 'submitted'].includes(j.status);
  const drafts = j.status === 'draft' && can ? (await q(sb.from('jobs').select('id,job_no,title,client').eq('status', 'draft').neq('id', j.id))).filter(d => sameClient(d.client, j.client)) : [];
  pmRequestPanel.ctx = { j, mine, avail, drafts };
  if (!mine.length && !avail.length && !drafts.length) return '';
  return `<section class="panel pm-wells"><header><h2>Wells on this request</h2><span class="meta">${mine.length ? `${plural(mine.length, 'well')} from the Job planner · tools once per size, the rest added up` : 'From the Job planner'}</span>
      ${can && (avail.length || drafts.length) ? `<div class="right">${avail.length ? `<button class="btn small" id="pm-add">${ico('plus')}Add a planned job</button>` : ''}${drafts.length ? `<button class="btn small" id="pm-merge">${ico('copy')}Merge with another draft</button>` : ''}</div>` : ''}</header>
    <div class="body">${mine.length ? `<div class="pm-chips">${mine.map(p => `<span class="pm-chip">${esc(p.title)} <span class="sub">${fmonthD(p.planned_on)} · ${esc(p.tubing_size || '')}</span>${can && mine.length > 1 ? `<button type="button" data-pmrm="${p.id}" aria-label="Take ${esc(p.title)} off this request" title="Take this well off">${ico('x')}</button>` : ''}</span>`).join('')}</div>`
      : `<p class="muted">No planned jobs on this request yet.${avail.length ? ` ${plural(avail.length, 'planned job')} for ${esc(j.client || 'this client')} can be added.` : ''}</p>`}
      ${j.status === 'submitted' && can && mine.length > 1 ? '<p class="muted small">Taking a well off sends this request back to draft (no line has approved it yet). Send it again afterwards.</p>' : ''}</div></section>`;
}
function bindPmRequestPanel(main) {
  const c = pmRequestPanel.ctx; if (!c) return; const { j, avail, drafts, mine } = c;
  const back = async () => { if (j.status === 'submitted') await q(sb.rpc('request_back_to_draft', { p_job: j.id })); };
  const add = $('#pm-add', main); if (add) add.onclick = () => modal({ title: `Add planned jobs to ${j.job_no}`, submit: 'Add', sub: `Planned jobs for ${esc(j.client || 'this client')} with no request yet. Only what this request doesn’t already have is added.${j.status === 'submitted' ? ' The request goes back to draft; send it again afterwards.' : ''}`,
    body: `<div class="pm-pick">${avail.map(p => `<label class="check"><input type="checkbox" name="p_${p.id}"> <b>${esc(p.title)}</b> <span class="sub">${fmonthD(p.planned_on)} · ${esc(p.tubing_size || '')}</span></label>`).join('')}</div>`,
    onSubmit: async x => { const ids = avail.filter(p => x['p_' + p.id]).map(p => p.id); if (!ids.length) throw new Error('Tick at least one job.'); await back(); await pmAddJobs(j.id, ids); } });
  $$('[data-pmrm]', main).forEach(b => b.onclick = async () => {
    const p = mine.find(x => x.id === +b.dataset.pmrm);
    if (!confirm(`Take ${p.title} off ${j.job_no}?\n\nIts screens, blanks and other parts come off the request. A tool stays while another well on it needs that size.${j.status === 'submitted' ? '\n\nThe request goes back to draft. Send it again afterwards.' : ''}`)) return;
    try { await back(); await pmRemoveJob(j.id, p.id); render({ quiet: true }); } catch (e) { toast(niceError(e), true); render({ quiet: true }); }
  });
  const mg = $('#pm-merge', main); if (mg) mg.onclick = () => modal({ title: `Merge another draft into ${j.job_no}`, submit: 'Merge',
    sub: `Drafts for ${esc(j.client || 'this client')}. Its items come onto ${esc(j.job_no)}: a tool both have is kept once, everything else is added up. The other draft is cancelled and points here.`,
    body: `<label class="f">Draft<select name="other">${drafts.map(d => opt(d.id, `${d.job_no} · ${d.title}`)).join('')}</select></label>`,
    onSubmit: async x => { await pmMergeDrafts(j, drafts.find(d => d.id === +x.other)); } });
}
async function pmMergeDrafts(into, other) {
  if (!other || !sameClient(into.client, other.client)) throw new Error('Only drafts of the same client can be merged.');
  const [a, b] = await Promise.all([q(sb.from('job_lines').select('id,item_id,location_id,qty,serials,notes').eq('job_id', into.id)), q(sb.from('job_lines').select('id,item_id,location_id,qty,serials,notes').eq('job_id', other.id))]);
  await items();
  for (const l of b) {
    const it = pmItem(l.item_id); const back = it?.item_type === 'equipment';
    const same = a.find(x => x.item_id === l.item_id && x.location_id === l.location_id) || (back ? a.find(x => x.item_id === l.item_id) : null);
    if (same) { const nq = back ? Math.max(+same.qty, +l.qty) : +same.qty + +l.qty; if (nq !== +same.qty) await q(sb.from('job_lines').update({ qty: nq }).eq('id', same.id)); same.qty = nq; }
    else { const r = { job_id: into.id, item_id: l.item_id, location_id: l.location_id, qty: l.qty, serials: l.serials, notes: l.notes }; await q(sb.from('job_lines').insert(r)); a.push({ ...r }); }
  }
  await q(sb.from('plan_jobs').update({ mr_id: into.id }).eq('mr_id', other.id));
  await q(sb.from('jobs').update({ status: 'cancelled', notes: `Merged into ${into.job_no} on ${fd(localISO(0))}.` }).eq('id', other.id));
  await pmRetitle(into.id);
  S.plan = null; toast(`${other.job_no} merged into ${into.job_no}`); render({ quiet: true });
}

// ---------------------------------------------------------------- clashes: the same tool needed by different clients at the same time
// how many of each item Nest has, on the shelf or out on jobs
async function pmOwned() {
  await stockRows();
  const own = {}; (S.stock || []).forEach(s => { if (s.status !== 'damaged') own[s.item_id] = (own[s.item_id] || 0) + +s.qty; });
  (await q(sb.from('checkouts').select('item_id,open_qty').is('closed_at', null)).catch(() => [])).forEach(c => { own[c.item_id] = (own[c.item_id] || 0) + +c.open_qty; });
  return own;
}
// the Job planner: planned jobs of different clients, 14 days apart or closer, needing a tool size Nest has too few of
function planClashes(E, own) {
  const need = new Map();
  for (const r of E.results.values()) for (const ln of r.lines) if (ln.part.kind === 'service' && ln.g) (need.get(ln.g.key) || need.set(ln.g.key, []).get(ln.g.key)).push({ job: r.job, ln });
  const out = [];
  for (const [k, list] of need) {
    const g = E.G[k]; const have = [...g.items].reduce((a, i) => a + (own[i] || 0), 0);
    const dated = list.filter(x => x.job.planned_on).sort((a, b) => a.job.planned_on.localeCompare(b.job.planned_on));
    const hit = new Set();
    dated.forEach(a => { const near = dated.filter(b => pmDays(a.job.planned_on, b.job.planned_on) <= PM_WINDOW);
      const clients = new Set(near.map(b => String(b.job.customer || '').trim().toLowerCase()));
      if (clients.size > Math.max(have, 0) && clients.size > 1) near.forEach(b => hit.add(b)); });
    if (!hit.size) continue;
    // one group per client, however its name was typed
    const by = {}, name = {}; [...hit].forEach(x => { const k = String(x.job.customer || '').trim().toLowerCase(); name[k] ||= (x.job.customer || 'No client').trim(); (by[name[k]] ||= []).push(x.job); });
    out.push({ part: list[0].ln.part, label: g.label, have, jobs: [...hit].map(x => x.job.id), by });
  }
  return out;
}
const pmClashText = c => `${partName(c.part)} ${c.label} is needed by ${Object.entries(c.by).map(([cl, js]) => { const ds = js.map(j => j.planned_on).sort();
  return `${cl} (${js.map(j => j.title).join(', ')}, ${ds[0] === ds[ds.length - 1] ? fd(ds[0]) : fd(ds[0]) + ' to ' + fd(ds[ds.length - 1])})`; }).join(' and ')} within ${PM_WINDOW} days of each other. You have ${fq(c.have)}.`;
// a request: its tools also wanted by another client's open request over the same days
async function requestClashes(j, lines) {
  const tools = lines.filter(l => l.items?.item_type === 'equipment'); if (!tools.length) return [];
  const others = (await q(sb.from('jobs').select('id,job_no,title,client,status,start_date,expected_return,job_lines(item_id,qty,checkouts(closed_at))').in('status', ['submitted', 'partial', 'out'])))
    .filter(o => o.id !== j.id && !sameClient(o.client, j.client));
  const span = x => { const a = x.start_date || localISO(0); const b = x.expected_return || new Date(new Date(a + 'T00:00:00').getTime() + PM_WINDOW * 864e5).toISOString().slice(0, 10); return [a, b]; };
  const [a0, a1] = span(j); const own = await pmOwned(); const out = [];
  for (const l of tools) {
    const clash = others.filter(o => { const [b0, b1] = span(o); return b0 <= a1 && a0 <= b1 && (o.job_lines || []).some(x => x.item_id === l.item_id && !(x.checkouts && x.checkouts.closed_at)); });
    const want = clash.reduce((s, o) => s + (o.job_lines || []).filter(x => x.item_id === l.item_id).reduce((t, x) => t + +x.qty, 0), 0) + +l.qty;
    if (clash.length && want > (own[l.item_id] || 0)) out.push({ l, clash, have: own[l.item_id] || 0 });
  }
  return out;
}
const requestClashHtml = cs => cs.length ? `<div class="notice bad pm-clash">${ico('bell')}<div><b>Tool clash with another client</b>${cs.map(c => `<div>${tag(c.l.items?.code)} ${esc(c.l.items?.name || '')} is also on ${c.clash.map(o => `<a href="#/job/${o.id}">${esc(o.job_no)}</a> (${esc(o.client || 'no client')}, ${esc(o.title)})`).join(', ')} over the same days. You have ${fq(c.have)}.</div>`).join('')}</div></div>` : '';
