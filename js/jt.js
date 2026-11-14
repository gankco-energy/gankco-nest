/* GANKCO Nest 3.0.9 — JobTrack: field jobs, Daily Operation Reports, the Operations Breakdown and unpriced tickets.
   No prices anywhere in JobTrack. Roles: Admin (operations managers), Engineer (crew), Viewer (management). */
'use strict';

const JT_STATUS = { planned: ['muted', 'Planned'], mobilised: ['out', 'Mobilised'], on_location: ['ok', 'On location'], demobilised: ['pending', 'Demobilised'], closed: ['muted', 'Closed'] };
const JT_RSTATUS = { draft: ['muted', 'Draft'], submitted: ['out', 'Sent'], reviewed: ['ok', 'Reviewed'], returned: ['overdue', 'Sent back'] };
const JT_TSTATUS = { draft: ['muted', 'Draft'], submitted: ['pending', 'Waiting for approval'], approved: ['ok', 'Approved'], returned: ['overdue', 'Sent back'] };
const JT_EQ = { op: ['ok', 'Op', 'Operating'], stdby: ['pending', 'Stdby', 'Standby'], mob: ['out', 'Mob', 'Mobilising'], demob: ['out', 'Demob', 'Demobilising'], off: ['muted', 'Off', 'Not on location'] };
const JT_SEC = { sales: 'Sales items', rental: 'Rental items', consumable: 'Consumables', personnel: 'Personnel', fa: 'Feeding & accommodation', mob: 'Mobilisation & demobilisation', other: 'Other charges' };
const JT_RULE = { days: 'Days follow an equipment group', location: 'Days on location', once: 'Once per ticket', qty: 'Quantity typed in', mob: 'Mobilisation: 1 when the group mobilised', demob: 'Demobilisation: 1 when the group demobilised' };
const JT_RULE_SHORT = { days: 'Days', location: 'Days on location', once: 'Once', qty: 'Quantity', mob: 'Mobilisation', demob: 'Demobilisation' };
const JT_MODE = { normal: 'Operating and standby as reported', standby: 'Every day as standby (backup tool)', operating: 'Every day as operating' };
S.jt = { cfg: null, clients: [], items: [], at: 0, f: { view: 'active', q: '' }, ifq: { q: '', sec: '' } };

const jtRole = () => appRole('jobtrack');
const jtAdmin = () => jtRole() === 'admin' && !S.viewAs;
const jtWriter = () => ['admin', 'engineer'].includes(jtRole()) && !S.viewAs;
// 3.0.9: engineers can start a job (JobTrack settings → Jobs), and they lead it
const jtCanStart = () => !S.viewAs && !!S.jt.cfg?.can_start;
const jtGroups = () => S.jt.cfg?.groups || ['Slickline', 'TTSC', 'Crane'];
const jtClientName = id => { const c = S.jt.clients.find(x => x.id === +id); return c ? (c.short_name || c.name) : '—'; };
const jtChip = (map, k) => chip(map[k]?.[0] || 'muted', map[k]?.[1] || k);
const jtEqChip = (g, v) => `<span class="jt-eq ${JT_EQ[v]?.[0] || 'muted'}" title="${esc(g)}: ${esc(JT_EQ[v]?.[2] || 'Not set')}"><b>${esc(g)}</b>${esc(JT_EQ[v]?.[1] || '—')}</span>`;
const jtMins = (a, b) => { if (!/^\d\d:\d\d$/.test(a || '') || !/^\d\d:\d\d$/.test(b || '')) return null; const m = (+b.slice(0, 2) * 60 + +b.slice(3)) - (+a.slice(0, 2) * 60 + +a.slice(3)); return m < 0 ? m + 1440 : m; };
const jtHm = m => m == null ? '' : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const jtDay = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const jtNum = v => v == null || v === '' ? '' : (+v).toLocaleString('en-GB', { maximumFractionDigits: 2 });
const jtNaira = v => '₦' + (+v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function jtLoad(force) {
  if (!force && S.jt.at && Date.now() - S.jt.at < 60000) return S.jt;
  const [cfg, clients, items] = await Promise.all([q(sb.rpc('jt_cfg')), q(sb.from('jt_clients').select('*').order('name')), q(sb.from('jt_items').select('*').order('sort').order('id'))]);
  Object.assign(S.jt, { cfg, clients, items, at: Date.now() });
  jtFlush();
  return S.jt;
}

// ---------------------------------------------------------------- menu, phone bar, home tile
function jtNav() {
  const main = [['jt', 'Overview', 'home'], ['jt/jobs', 'Jobs', 'derrick'], ...(jtWriter() ? [['jt/report/new', 'New daily report', 'plus']] : []), ['jt/items', 'Ticket items', 'label']];
  const setup = [...(jtAdmin() || isSuper() ? [['jt/clients', 'Clients', 'building'], ['jt/settings', 'JobTrack settings', 'gear']] : []), ...(isSuper() ? [['team', 'Nest admin', 'users']] : [])];
  return { main, setup };
}
const jtNavKey = parts => !parts[1] ? 'jt' : ['job', 'ticket'].includes(parts[1]) ? 'jt/jobs' : parts[1] === 'report' ? (parts[2] === 'new' ? 'jt/report/new' : 'jt/jobs') : 'jt/' + parts[1];
function jtBottomBar() {
  return `<nav class="bottombar">
    <a href="#/jt" data-r="jt">${ico('home')}Overview</a>
    <a href="#/jt/jobs" data-r="jt/jobs">${ico('derrick')}Jobs</a>
    ${jtWriter() ? `<a href="#/jt/report/new" data-r="jt/report/new" class="scan"><span class="disc">${ico('plus')}</span>Report</a>` : ''}
    <a href="#/jt/items" data-r="jt/items">${ico('label')}Items</a>
    <a href="#/" data-r="home">${ico('grid')}Apps</a></nav>`;
}
async function jtTileMeta(el) {
  try {
    const o = await q(sb.rpc('jt_overview'));
    const active = o.jobs.filter(j => ['mobilised', 'on_location'].includes(j.status));
    const bits = [o.to_approve.length ? plural(o.to_approve.length, 'ticket') + ' to approve' : '', o.returned.length ? `${o.returned.length} sent back to you` : '',
      (o.hse_todo || []).length ? plural(o.hse_todo.length, 'HSE section') + ' to fill' : '',
      active.length ? plural(active.length, 'job') + ' on location' : ''].filter(Boolean);
    el.textContent = bits.join(' · ') || 'Open';
    if (o.to_approve.length || o.returned.length || (o.hse_todo || []).length) el.classList.add('hot');
  } catch (e) { el.textContent = 'Open'; }
}

// ---------------------------------------------------------------- router
ROUTES.jt = {
  async load(parts, params) {
    if (!jtRole()) return topbar('JobTrack') + `<div class="notice">You don’t have access to JobTrack yet. Ask the Developer to switch it on for you on the Team page.</div><a class="btn" href="#/">Back to Nest home</a>`;
    await jtLoad();
    const p1 = parts[1];
    this.page = !p1 ? jtOverview : p1 === 'jobs' ? jtJobs : p1 === 'job' ? jtJob : p1 === 'report' ? jtReport : p1 === 'ticket' ? jtTicket
      : p1 === 'items' ? jtItemsPage : p1 === 'clients' ? jtClientsPage : p1 === 'settings' ? jtSettingsPage : jtOverview;
    return this.page.load(parts, params);
  },
  bind(main, parts, params) { if (jtRole() && this.page) this.page.bind(main, parts, params); }
};

// ================================================================ OVERVIEW
const jtOverview = {
  async load() {
    const o = this.o = await q(sb.rpc('jt_overview'));
    const active = o.jobs.filter(j => ['mobilised', 'on_location'].includes(j.status));
    const missing = active.filter(j => !j.today_reports);
    return topbar('JobTrack', 'Field jobs, daily operation reports and job tickets. No prices here: pricing happens in PFI & Quote.',
        `${jtCanStart() ? `<button class="btn" id="jt-newjob">${ico('plus')}New job</button>` : ''}${jtWriter() ? `<a class="btn tagbtn" href="#/jt/report/new">${ico('plus')}New daily report</a>` : ''}`) +
      `<div class="board b4">
        <a class="kpi" href="#/jt/jobs"><div class="n">${active.length}</div><div class="l">Jobs on location</div></a>
        <div class="kpi ${missing.length ? 'warn' : ''}"><div class="n">${missing.length}</div><div class="l">No daily report yet today</div></div>
        <div class="kpi ${o.to_approve.length ? 'warn' : ''}"><div class="n">${o.to_approve.length}</div><div class="l">Tickets to approve${S.jt.cfg?.can_approve ? '' : '<span class="sub"> (approvers only)</span>'}</div></div>
        <div class="kpi ${o.returned.length ? 'bad' : ''}"><div class="n">${o.returned.length}</div><div class="l">Sent back to you</div></div></div>
      ${o.returned.length || o.to_approve.length || (o.hse_todo || []).length || (jtAdmin() && o.to_review) ? `<section class="panel"><header><h2>Needs you</h2></header><ul class="list">
        ${(o.hse_todo || []).map(x => `<li><a class="main" href="#/jt/report/${x.id}"><div class="name">HSE section to fill: ${esc(x.label)} ${chip('pending', 'HSE')}</div><div class="sub">${esc(x.job_no)} · the report can’t be sent until you fill it</div></a></li>`).join('')}
        ${o.returned.map(x => `<li><a class="main" href="#/jt/${x.type}/${x.id}"><div class="name">${x.type === 'report' ? 'Daily report' : 'Ticket'} ${esc(x.label)} ${chip('overdue', 'Sent back')}</div><div class="sub">${esc(x.note || '')}</div></a></li>`).join('')}
        ${o.to_approve.map(x => `<li><a class="main" href="#/jt/ticket/${x.id}"><div class="name">${esc(x.ticket_no)} ${chip('pending', 'To approve')}</div><div class="sub">${esc(x.title || '')} · sent by ${esc(x.by || '')} ${fdt(x.at)}</div></a></li>`).join('')}
        ${jtAdmin() && o.to_review ? `<li><a class="main" href="#/jt/jobs"><div class="name">${plural(o.to_review, 'daily report')} to review</div><div class="sub">Open a job and look for reports marked Sent.</div></a></li>` : ''}
        </ul></section>` : ''}
      <section class="panel"><header><h2>Jobs</h2><span class="meta">${plural(o.jobs.length, 'job')}</span><span class="right"><a class="btn small" href="#/jt/jobs">All jobs</a></span></header>
        ${o.jobs.length ? `<ul class="list">${o.jobs.map(j => `<li><a class="main" href="#/jt/job/${j.id}"><div class="name">${esc(j.job_no)} ${jtChip(JT_STATUS, j.status)}</div>
          <div class="sub">${esc(j.client || '')}${j.project ? ' · ' + esc(j.project) : ''}${j.field ? ' · ' + esc(j.field) : ''}${j.lead ? ' · lead ' + esc(j.lead) : ''}</div>
          <div class="sub">${j.last_report ? 'Last report ' + fd(j.last_report) : 'No reports yet'}${['mobilised', 'on_location'].includes(j.status) ? (j.today_reports ? ' · ' + chip('ok', 'Today’s report in') : ' · ' + chip('pending', 'No report yet today')) : ''}${j.drafts ? ` · ${plural(j.drafts, 'draft')}` : ''}</div></a>
          ${jtWriter() && ['mobilised', 'on_location'].includes(j.status) ? `<div class="end"><a class="btn small" href="#/jt/report/new?job=${j.id}">${ico('plus')}Today’s report</a></div>` : ''}</li>`).join('')}</ul>`
          : `<div class="empty">No jobs yet.${jtCanStart() ? ' Press <b>New job</b> to set one up.' : ' An operations manager sets jobs up and adds you to the crew.'}</div>`}</section>`;
  },
  bind(main) { const b = $('#jt-newjob', main); if (b) b.onclick = () => jtJobForm(); }
};

// ================================================================ JOBS
const jtJobs = {
  async load() {
    const [jobs, reps] = await Promise.all([q(sb.from('jt_jobs').select('*').order('seq', { ascending: false })), q(sb.from('jt_reports').select('job_id,report_date'))]);
    const last = {}; reps.forEach(r => { if (!last[r.job_id] || r.report_date > last[r.job_id]) last[r.job_id] = r.report_date; });
    const people = Object.fromEntries((S.jt.cfg?.people || []).map(p => [p.id, p.name]));
    this.rows = jobs.map(j => ({ ...j, last: last[j.id] || null, client: jtClientName(j.client_id), lead: people[j.lead_id] || '' }));
    const f = S.jt.f;
    return topbar('Jobs', 'Every job: its wells, crew, daily reports and tickets.', jtCanStart() ? `<button class="btn tagbtn" id="jt-newjob">${ico('plus')}New job</button>` : '') +
      `<section class="panel"><div class="filters body">
        <input type="search" id="jt-q" placeholder="Search job number, client, field or project" value="${esc(f.q)}" autocomplete="off">
        <div class="seg" id="jt-seg">${[['active', 'Active'], ['planned', 'Planned'], ['on', 'Mobilised & on location'], ['closed', 'Demobilised & closed'], ['all', 'All']].map(([k, l]) => `<button type="button" data-v="${k}" class="${f.view === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div id="jt-list"></div></section>`;
  },
  draw(main) {
    const f = S.jt.f, t = f.q.trim().toLowerCase();
    const rows = this.rows.filter(j => (f.view === 'all' || (f.view === 'active' && j.status !== 'closed') || (f.view === 'planned' && j.status === 'planned') || (f.view === 'on' && ['mobilised', 'on_location'].includes(j.status))
      || (f.view === 'closed' && ['demobilised', 'closed'].includes(j.status))) && (!t || [j.job_no, j.client, j.field, j.project, j.lead].join(' ').toLowerCase().includes(t)));
    $('#jt-list', main).innerHTML = rows.length ? `<div class="tablewrap"><table class="t stack"><thead><tr><th>Job</th><th>Client</th><th>Project · field</th><th>Lead</th><th>Status</th><th>Last report</th></tr></thead><tbody>
      ${rows.map(j => `<tr class="click" data-go="#/jt/job/${j.id}"><td class="name">${esc(j.job_no)}</td><td>${esc(j.client)}</td><td>${esc([j.project, j.field].filter(Boolean).join(' · ') || '—')}</td>
        <td>${esc(j.lead || '—')}</td><td>${jtChip(JT_STATUS, j.status)}</td><td>${j.last ? fd(j.last) : '<span class="sub">None yet</span>'}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">No jobs match.</div>`;
    $$('[data-go]', main).forEach(r => r.onclick = () => go(r.dataset.go));
  },
  bind(main) {
    this.draw(main);
    const b = $('#jt-newjob', main); if (b) b.onclick = () => jtJobForm();
    $('#jt-q', main).oninput = debounce(e => { S.jt.f.q = e.target.value; this.draw(main); }, 200);
    $$('#jt-seg button', main).forEach(b => b.onclick = () => { S.jt.f.view = b.dataset.v; $$('#jt-seg button', main).forEach(x => x.classList.toggle('on', x === b)); this.draw(main); });
  }
};

// a job's details: operations managers, an engineer starting a job (they lead it), or the job's lead
async function jtLines() { if (!S.jt.lines) S.jt.lines = await q(sb.from('po_service_lines').select('*').order('sort')).catch(() => []); return S.jt.lines; }
const JT_WA_DEFAULT = 'Update on {well} {job type} Operation Update - {field}';
async function jtJobForm(j) {
  await jtLoad(!j);
  const lines = await jtLines(); const cfg = S.jt.cfg; const groups = [...new Set([...jtGroups(), ...(j?.groups || [])])];
  const admin = jtAdmin(); const engineers = (cfg.people || []).filter(p => p.role);
  const majors = lines.filter(l => !l.parent_id && l.active !== false);
  const lineOpts = majors.map(m => `<optgroup label="${esc((m.code ? m.code + ' · ' : '') + m.name)}">${opt(m.id, (m.code ? m.code + ' · ' : '') + m.name, j?.line_id)}${lines.filter(s => s.parent_id === m.id && s.active !== false).map(s => opt(s.id, '— ' + s.name, j?.line_id)).join('')}</optgroup>`).join('');
  const others = j ? [] : await q(sb.from('jt_jobs').select('id,job_no,project,field').order('seq', { ascending: false }).limit(60)).catch(() => []);
  const next = `GES-JT-OPR-${String(cfg.next_job || 1).padStart(4, '0')}-${new Date().getFullYear()}`;
  return modal({ title: j ? 'Edit ' + j.job_no : 'New job', wide: true, submit: j ? 'Save' : 'Create job',
    sub: j ? '' : `This job will be <b>${esc(next)}</b>. You add wells, crew and ticket items on the job page.${admin ? '' : ' You’ll be its lead engineer, and the operations managers are told.'}`,
    body: `<div class="row2"><label class="f">Client<select name="client_id" required><option value="">Choose…</option>${S.jt.clients.filter(c => c.active || c.id === j?.client_id).map(c => opt(c.id, c.short_name ? `${c.short_name} (${c.name})` : c.name, j?.client_id)).join('')}
            ${!j && (admin || jtCanStart()) ? '<option value="__new">+ A new client…</option>' : ''}</select>
          <input name="new_client" placeholder="Client name as it goes on the reports" class="mt" hidden><span class="hint">${admin ? 'Logos and details are under Clients.' : 'Not listed? Choose “A new client”. An operations manager adds its logos.'}</span></label>
        ${admin ? `<label class="f">Lead engineer (GANKCO rep)<select name="lead_id"><option value="">Choose…</option>${engineers.map(p => opt(p.id, p.name + (p.title ? ' · ' + p.title : ''), j?.lead_id)).join('')}</select><span class="hint">People with JobTrack. They’re added to the crew.</span></label>`
          : `<div class="f">Lead engineer<b class="jt-ro">${esc(j ? j.lead_name || '—' : S.profile.full_name || 'You')}</b><span class="hint">${j ? 'An operations manager can hand the job to someone else.' : 'You lead the jobs you start.'}</span></div>`}</div>
      <div class="row2"><label class="f">Project / operation<input name="project" value="${esc(j?.project || '')}" placeholder="Thru-Tubing Screen Hang-Off"></label>
        <label class="f">Job type<input name="job_type" value="${esc(j?.job_type || '')}" placeholder="TTSHO"></label></div>
      <div class="row2"><label class="f">Field<input name="field" value="${esc(j?.field || '')}" placeholder="OML30"></label>
        <label class="f">Service line<select name="line_id"><option value="">—</option>${lineOpts}</select></label></div>
      <div class="row2"><label class="f">Client PO / call-off number<input name="client_po" value="${esc(j?.client_po || '')}"></label>
        <label class="f">Contract reference<input name="contract_ref" value="${esc(j?.contract_ref || '')}"></label></div>
      <label class="f">Client rep(s)<input name="client_reps" value="${esc(j?.client_reps || '')}" placeholder="Names, as on the daily report"></label>
      <label class="f">WhatsApp title<input name="wa_title" value="${esc(j?.wa_title || '')}" placeholder="${esc(JT_WA_DEFAULT)}">
        <span class="hint">The first line of the WhatsApp update. {well} becomes the well’s name, {job type} and {field} this job’s. Leave it blank for: ${esc(JT_WA_DEFAULT)}</span></label>
      <div class="f jt-f">Equipment groups<span class="hint">Each day’s report sets these to Op, Stdby, Mob, Demob or Off. Tickets count days from them.</span>
        <div class="jt-chk">${groups.map(g => `<label class="check"><input type="checkbox" name="g_${esc(g)}" ${!j || (j.groups || []).includes(g) ? 'checked' : ''}> ${esc(g)}</label>`).join('')}
        <input name="g_extra" placeholder="Another group (e.g. Nitrogen)" class="jt-gx"></div></div>
      <div class="row3"><label class="f">Rig name<input name="rig_name" value="${esc(j?.rig_name || 'N/A')}"></label><label class="f">Rig owner<input name="rig_owner" value="${esc(j?.rig_owner || 'N/A')}"></label><label class="f">Rig type<input name="rig_type" value="${esc(j?.rig_type || 'N/A')}"></label></div>
      <div class="row3"><label class="f">Mobilisation date<input type="date" name="mob_date" value="${esc(j?.mob_date || '')}"></label><label class="f">Demobilisation date<input type="date" name="demob_date" value="${esc(j?.demob_date || '')}"></label>
        <label class="f">Status<select name="status">${Object.entries(JT_STATUS).filter(([k]) => k !== 'closed' || admin).map(([k, v]) => opt(k, v[1], j?.status || 'planned')).join('')}</select></label></div>
      ${!j && others.length ? `<label class="f">Copy crew and ticket items from<select name="copy_from"><option value="">Don’t copy</option>${others.map(o => opt(o.id, [o.job_no, o.project, o.field].filter(Boolean).join(' · '), '')).join('')}</select>
        <span class="hint">Saves typing the same team and items again. You can change them after.</span></label>` : ''}
      <label class="f">Notes<textarea name="notes" rows="2">${esc(j?.notes || '')}</textarea></label>`,
    onOpen: d => { const sel = $('[name=client_id]', d), nc = $('[name=new_client]', d); sel.onchange = () => { nc.hidden = sel.value !== '__new'; if (!nc.hidden) nc.focus(); }; },
    onSubmit: async x => {
      const gs = groups.filter(g => x['g_' + g]); if (x.g_extra?.trim()) gs.push(x.g_extra.trim());
      if (!gs.length) throw new Error('Tick at least one equipment group.');
      if (x.client_id === '__new') {
        if (!x.new_client?.trim()) throw new Error('Type the new client’s name.');
        x.client_id = await q(sb.rpc('jt_client_save', { p: { name: x.new_client.trim() } })); await jtLoad(true);
      }
      const p = { ...x, id: j?.id || null, groups: gs, own_logos: j?.own_logos }; delete p.new_client; delete p.copy_from;
      if (!admin) p.lead_id = j ? j.lead_id : S.profile.id;
      const id = await q(sb.rpc('jt_job_save', { p }));
      if (!j && x.copy_from) {
        try { const c = await q(sb.rpc('jt_job_copy', { p_job: id, p_from: +x.copy_from, p_crew: true, p_items: true }));
          toast(`Job created. Copied ${plural(c.crew, 'person', 'people')} and ${plural(c.items, 'ticket item')}${c.skipped ? ` (${plural(c.skipped, 'item')} left out: their equipment group isn’t on this job)` : ''}.`); }
        catch (e) { toast('Job created, but the copy didn’t work: ' + niceError(e), true); }
      } else toast(j ? 'Job saved' : 'Job created');
      await jtLoad(true); go('#/jt/job/' + id); if (j) render({ quiet: true }); return id;
    } });
}

// ================================================================ ONE JOB
const jtJob = {
  async load(parts, params) {
    const id = +parts[2]; if (!(id > 0)) { setTimeout(() => go('#/jt/jobs'), 0); return '<div class="loading">Opening…</div>'; }
    const j = this.j = await q(sb.rpc('jt_job_get', { p_id: id }));
    this.tab = params?.get('t') || 'reports';
    const lead = j.lead_id === S.profile.id;
    const statusBtns = (jtAdmin() || (lead && jtWriter())) && j.status !== 'closed' ? `<select id="jt-status" class="inline" title="Job status">${Object.entries(JT_STATUS).filter(([k]) => k !== 'closed' || jtAdmin()).map(([k, v]) => opt(k, v[1], j.status)).join('')}</select>` : '';
    const tabs = [['reports', `Daily reports <span class="count">${j.reports.length}</span>`], ['tickets', `Tickets <span class="count">${j.tickets.length}</span>`], ['breakdown', 'Operations breakdown'], ['setup', 'Wells, crew & items']];
    let body = '';
    if (this.tab === 'reports') body = this.reports(j);
    else if (this.tab === 'tickets') body = this.tickets(j);
    else if (this.tab === 'breakdown') { this.bd = await q(sb.rpc('jt_breakdown', { p_job: id })); body = this.breakdown(j, this.bd); }
    else body = this.setup(j);
    return topbar(esc(j.job_no), `${esc(j.client?.short_name || j.client?.name || '')}${j.project ? ' · ' + esc(j.project) : ''}${j.field ? ' · ' + esc(j.field) : ''}`,
        `${statusBtns}${j.can_manage && !S.viewAs && (jtAdmin() || j.status !== 'closed') ? `<button class="btn" id="jt-edit">${ico('edit')}Edit</button>` : ''}${j.can_write && j.status !== 'closed' ? `<a class="btn tagbtn" href="#/jt/report/new?job=${j.id}">${ico('plus')}New daily report</a>` : ''}`) +
      `<section class="panel"><div class="body jt-facts">
        <div><span>Status</span>${jtChip(JT_STATUS, j.status)}</div><div><span>Client</span><b>${esc(j.client?.name || '—')}</b></div>
        <div><span>Client PO</span><b>${esc(j.client_po || '—')}</b></div><div><span>Lead engineer</span><b>${esc(j.lead_name || '—')}</b></div>
        <div><span>Wells</span><b>${j.wells.length ? esc(j.wells.map(w => w.name).join(', ')) : '—'}</b></div><div><span>Crew</span><b>${j.crew.length}</b></div>
        <div><span>Mobilised</span><b>${j.mob_date ? fd(j.mob_date) : '—'}</b></div><div><span>Demobilised</span><b>${j.demob_date ? fd(j.demob_date) : '—'}</b></div>
        <div><span>Service line</span><b>${j.line ? esc([j.line.code, j.line.name].filter(Boolean).join(' · ')) : '—'}</b></div><div><span>Equipment groups</span><b>${esc((j.groups || []).join(', '))}</b></div></div></section>
      <nav class="tabs">${tabs.map(([k, l]) => `<a href="#/jt/job/${j.id}?t=${k}" class="${this.tab === k ? 'on' : ''}">${l}</a>`).join('')}</nav>${body}`;
  },
  reports(j) {
    if (!j.reports.length) return `<section class="panel"><div class="empty">No daily reports yet.${j.can_write ? ' Press <b>New daily report</b> at the start of each day’s work.' : ''}</div></section>`;
    const byDate = {}; j.reports.forEach(r => (byDate[r.report_date] = byDate[r.report_date] || []).push(r));
    return `<section class="panel"><header><h2>Daily Operation Reports</h2><span class="meta">${plural(j.reports.length, 'report')}</span>
        <span class="right"><button class="btn small" id="jt-xls">${ico('down')}Excel (all reports)</button></span></header>
      <ul class="list jt-replist">${Object.entries(byDate).map(([d, rs]) => rs.map(r => `<li><a class="main" href="#/jt/report/${r.id}">
        <div class="name">${jtDay(d)} · ${esc(r.well)} <span class="sub">Report ${r.report_no}</span> ${jtChip(JT_RSTATUS, r.status)}${r.photos ? ` <span class="sub">${ico('eye')}${r.photos}</span>` : ''}</div>
        <div class="jt-eqs">${(j.groups || []).map(g => jtEqChip(g, r.equipment?.[g])).join('')}</div>
        <div class="sub">${esc(r.summary || 'No summary yet')}</div>${r.status === 'returned' && r.return_note ? `<div class="sub neg">Sent back: ${esc(r.return_note)}</div>` : ''}</a></li>`).join('')).join('')}</ul></section>`;
  },
  tickets(j) {
    const svc = j.tickets.filter(t => t.kind === 'service'), rb = j.tickets.filter(t => t.kind === 'reimb');
    const row = t => `<li><a class="main" href="#/jt/ticket/${t.id}"><div class="name">${esc(t.ticket_no)} ${jtChip(JT_TSTATUS, t.status)}${t.new_lines ? ' ' + chip('soon', plural(t.new_lines, 'new line')) : ''}</div>
      <div class="sub">${esc(t.title || '')}${t.wells?.length ? ' · ' + esc(t.wells.join(' & ')) : ''} · ${t.date_from ? fd(t.date_from) + ' to ' + fd(t.date_to) : 'no dates yet'}${t.kind === 'reimb' && t.amount ? ' · ' + jtNaira(t.amount) : ` · ${plural(t.lines, 'line')}`}</div>
      ${t.status === 'returned' && t.return_note ? `<div class="sub neg">Sent back: ${esc(t.return_note)}</div>` : ''}</a></li>`;
    return `<section class="panel"><header><h2>Job tickets</h2><span class="meta">Unpriced: BD prices them in PFI &amp; Quote</span>
        ${j.can_write ? `<span class="right"><button class="btn small tagbtn" id="jt-newt">${ico('plus')}New ticket</button></span>` : ''}</header>
        ${svc.length ? `<ul class="list">${svc.map(row).join('')}</ul>` : `<div class="empty">No tickets yet. A ticket covers one well or several, for the dates you choose. Nest counts the operating and standby days from the daily reports.</div>`}</section>
      <section class="panel"><header><h2>Reimbursables</h2><span class="meta">FTO, community and truck in/out, at cost in Naira</span>
        ${j.can_write ? `<span class="right"><button class="btn small" id="jt-newr">${ico('plus')}New reimbursables ticket</button></span>` : ''}</header>
        ${rb.length ? `<ul class="list">${rb.map(row).join('')}</ul>` : `<div class="empty">None yet. Engineers who make these payments enter them here, with receipts.</div>`}</section>`;
  },
  breakdown(j, rows) {
    if (!rows.length) return `<section class="panel"><div class="empty">The Operations Breakdown fills itself in from the daily reports.</div></section>`;
    return `<section class="panel"><header><h2>Operations breakdown</h2><span class="meta">${plural(rows.length, 'day')} · from the daily reports</span>
        <span class="right"><button class="btn small" id="jt-bdx">${ico('down')}Excel</button><button class="btn small" id="jt-bdp">${ico('pdf')}PDF</button></span></header>
      <div class="tablewrap"><table class="t jt-bd"><thead><tr><th>#</th><th>Date</th><th>Well</th><th>Operations summary</th>${(j.groups || []).map(g => `<th>${esc(g)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td>${i + 1}</td><td class="nowrap">${fd(r.date)}</td><td>${esc(r.wells)}</td><td class="jt-pre">${esc(r.summary)}</td>${(j.groups || []).map(g => `<td>${r.status?.[g] ? jtChip(JT_EQ, r.status[g]) : '—'}</td>`).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4" class="num">Operating / standby days</td>${(j.groups || []).map(g => `<td class="nowrap">${rows.filter(r => r.status?.[g] === 'op').length} / ${rows.filter(r => r.status?.[g] === 'stdby').length}</td>`).join('')}</tr></tfoot></table></div></section>`;
  },
  setup(j) {
    const admin = jtAdmin(); const manage = j.can_manage && !S.viewAs && (admin || j.status !== 'closed');
    const items = j.items; const bySec = Object.keys(JT_SEC).map(k => [k, items.filter(i => i.section === k)]).filter(([, a]) => a.length);
    return `<section class="panel"><header><h2>Wells</h2><span class="meta">${plural(j.wells.length, 'well')}</span>${j.can_write && j.status !== 'closed' ? `<span class="right"><button class="btn small" id="jt-addwell">${ico('plus')}Add well</button></span>` : ''}</header>
        ${j.wells.length ? `<ul class="list">${j.wells.map(w => `<li><div style="flex:1"><div class="name">${esc(w.name)}</div><div class="sub">${esc(w.field || j.field || '')} · ${plural(j.reports.filter(r => r.well_id === w.id).length, 'report')}</div></div>
          ${j.can_write ? `<div class="end"><button class="btn small" data-wedit="${w.id}">Rename</button>${admin ? ` <button class="btn small danger" data-wdel="${w.id}">${ico('trash')}</button>` : ''}</div>` : ''}</li>`).join('')}</ul>`
          : `<div class="empty">Add the first well. Engineers can add the next one as the crew moves.</div>`}</section>
      <section class="panel"><header><h2>Crew</h2><span class="meta">${plural(j.crew.length, 'person', 'people')}</span>${manage ? `<span class="right"><button class="btn small" id="jt-copy">${ico('copy')}Copy from another job</button><button class="btn small" id="jt-crew">${ico('edit')}Edit crew</button></span>` : ''}</header>
        ${j.crew.length ? `<ul class="list">${j.crew.map(c => `<li><div style="flex:1"><div class="name">${esc(c.name)}${c.profile_id === j.lead_id ? ' ' + chip('out', 'Lead') : ''}${c.is_hse ? ' ' + chip('ok', 'HSE') : ''}</div><div class="sub">${esc([c.role, c.company !== 'GANKCO' ? c.company : ''].filter(Boolean).join(' · '))}${c.profile_id ? '' : ' · not in Nest'}</div></div></li>`).join('')}</ul>`
          : '<div class="empty">No crew yet.</div>'}
        <div class="body muted small">Engineers see and work on the jobs they’re crew on. Subcontractor crew can be typed in by name. ${j.crew.some(c => c.is_hse) ? 'The HSE person fills the HSE part of each daily report.' : 'Mark the HSE person on board (Edit crew) and they fill the HSE part of each daily report.'}</div></section>
      <section class="panel"><header><h2>Ticket items for this job</h2><span class="meta">${plural(items.length, 'item')}</span>${manage ? `<span class="right"><button class="btn small" id="jt-items">${ico('edit')}Choose items</button></span>` : ''}</header>
        ${items.length ? bySec.map(([k, a]) => `<div class="jt-sec">${esc(JT_SEC[k])}</div><ul class="list">${a.map(i => `<li><div style="flex:1"><div class="name">${esc(i.description)}${i.is_new ? ' ' + chip('soon', 'New') : ''}</div>
            <div class="sub">${esc(jtRuleText(i))} · qty ${jtNum(i.qty)}</div></div></li>`).join('')}</ul>`).join('')
          : `<div class="empty">No items yet. ${manage ? 'Press <b>Choose items</b> and pick what this job will put on its tickets.' : 'The lead engineer or an operations manager chooses them.'} New tickets start from this list.</div>`}</section>
      <section class="panel"><header><h2>Logos on the daily report</h2><span class="meta">${j.own_logos ? 'This job’s own logos' : 'The client’s logos'}</span></header><div class="body">
        <div class="jt-logos" id="jt-logos">${j.logos.map(l => `<span class="jt-logo" data-logo="${l.id}"></span>`).join('') || '<span class="muted">No logos yet.</span>'}</div>
        ${admin ? `<label class="switch mini mt"><input type="checkbox" id="jt-ownlogos" ${j.own_logos ? 'checked' : ''}><span class="sw"></span><span>Use different logos for this job (for example an asset with other partners)</span></label>
          ${j.own_logos ? `<div class="mt">${jtLogoEditor(j.job_logos, 'job')}</div>` : `<p class="muted small mt">Change the client’s logos under Clients.</p>`}` : ''}</div></section>
      ${admin ? `<section class="panel"><header><h2>Delete job</h2></header><div class="body"><p class="muted">A job can only be deleted before it has any reports or tickets. Otherwise close it.</p><button class="btn danger" id="jt-deljob">${ico('trash')}Delete ${esc(j.job_no)}</button></div></section>` : ''}`;
  },
  bind(main) {
    const j = this.j;
    const ed = $('#jt-edit', main); if (ed) ed.onclick = () => jtJobForm(j);
    const st = $('#jt-status', main); if (st) st.onchange = async () => { try { await q(sb.rpc('jt_job_status', { p_id: j.id, p_status: st.value })); toast('Status: ' + JT_STATUS[st.value][1]); render({ quiet: true }); } catch (e) { toast(niceError(e), true); st.value = j.status; } };
    const xl = $('#jt-xls', main); if (xl) xl.onclick = () => withProgress('Making the Excel file…', () => jtDorWorkbook(j));
    const bx = $('#jt-bdx', main); if (bx) bx.onclick = () => jtBreakdownXlsx(j, this.bd);
    const bp = $('#jt-bdp', main); if (bp) bp.onclick = () => jtBreakdownPdf(j, this.bd);
    const nt = $('#jt-newt', main); if (nt) nt.onclick = () => jtNewTicket(j, 'service');
    const nr = $('#jt-newr', main); if (nr) nr.onclick = () => jtNewTicket(j, 'reimb');
    const aw = $('#jt-addwell', main); if (aw) aw.onclick = () => jtWellForm(j);
    $$('[data-wedit]', main).forEach(b => b.onclick = () => jtWellForm(j, j.wells.find(w => w.id === +b.dataset.wedit)));
    $$('[data-wdel]', main).forEach(b => b.onclick = async () => { const w = j.wells.find(x => x.id === +b.dataset.wdel); if (!confirm(`Remove ${w.name} from this job?`)) return;
      try { await q(sb.rpc('jt_well_delete', { p_id: w.id })); toast('Well removed'); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } });
    const cr = $('#jt-crew', main); if (cr) cr.onclick = () => jtCrewForm(j);
    const cp = $('#jt-copy', main); if (cp) cp.onclick = () => jtCopyForm(j);
    const it = $('#jt-items', main); if (it) it.onclick = () => jtJobItemsForm(j);
    const ol = $('#jt-ownlogos', main); if (ol) ol.onchange = async () => { try { await q(sb.rpc('jt_job_save', { p: { ...j, client_id: j.client_id, own_logos: ol.checked, groups: j.groups } })); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } };
    const dj = $('#jt-deljob', main); if (dj) dj.onclick = async () => { if (!confirm(`Delete ${j.job_no}? This can’t be undone.`)) return; try { await q(sb.rpc('jt_job_delete', { p_id: j.id })); toast('Job deleted'); go('#/jt/jobs'); } catch (e) { toast(niceError(e), true); } };
    jtDrawLogos(main); jtBindLogoEditor(main, { job_id: j.id });
  }
};
const jtRuleText = i => i.rule === 'days' ? `${i.grp || '—'} days${i.mode === 'standby' ? ', all as standby' : i.mode === 'operating' ? ', all as operating' : ''}` : i.rule === 'mob' || i.rule === 'demob' ? `${JT_RULE_SHORT[i.rule]}${i.grp ? ' · ' + i.grp : ''}` : JT_RULE_SHORT[i.rule] || i.rule;

async function jtWellForm(j, w) {
  return modal({ title: w ? 'Rename well' : 'Add a well', submit: 'Save',
    body: `<label class="f">Well<input name="name" value="${esc(w?.name || '')}" placeholder="Olomoro 4S" required></label><label class="f">Field<input name="field" value="${esc(w?.field || j.field || '')}"></label>`,
    onSubmit: async x => { const id = await q(sb.rpc('jt_well_save', { p: { id: w?.id || null, job_id: j.id, ...x } })); toast('Saved'); render({ quiet: true }); return id; } });
}

async function jtCrewForm(j) {
  const people = (S.jt.cfg.people || []).filter(p => p.role);
  const row = (c = {}) => `<div class="jt-crewrow"><select name="pid">${opt('', 'Typed in (not in Nest)', c.profile_id || '')}${people.map(p => opt(p.id, p.name, c.profile_id)).join('')}</select>
    <input name="name" placeholder="Name" value="${esc(c.profile_id ? '' : c.name || '')}"><input name="role" placeholder="Role (e.g. TTSC Engineer)" value="${esc(c.role || '')}">
    <input name="company" placeholder="Company" value="${esc(c.company || 'GANKCO')}"><label class="check jt-hsechk" title="The HSE person on board fills the HSE part of each daily report"><input type="checkbox" class="jt-hse" ${c.is_hse ? 'checked' : ''}> HSE</label>
    <button type="button" class="btn small" data-rm title="Remove">${ico('trash')}</button></div>`;
  return modal({ title: 'Crew on ' + j.job_no, wide: true, submit: 'Save crew',
    sub: 'People with JobTrack who are on the crew can write this job’s daily reports and tickets. Subcontractor crew can be typed in by name. Tick <b>HSE</b> for the HSE person on board: they fill the HSE part of each daily report, and the report can’t be sent until they do. The lead engineer always stays on.',
    body: `<div id="jt-crewrows">${j.crew.map(row).join('')}</div><button type="button" class="btn small" id="jt-addcrew">${ico('plus')}Add someone</button>`,
    onOpen: d => {
      const wire = () => { $$('[data-rm]', d).forEach(b => b.onclick = () => b.closest('.jt-crewrow').remove());
        $$('.jt-hse', d).forEach(c => c.onchange = () => { if (c.checked) $$('.jt-hse', d).forEach(o => { if (o !== c) o.checked = false; }); }); };
      $('#jt-addcrew', d).onclick = () => { $('#jt-crewrows', d).insertAdjacentHTML('beforeend', row()); wire(); }; wire();
    },
    onSubmit: async (x, d) => {
      const rows = $$('.jt-crewrow', d).map(r => ({ profile_id: $('[name=pid]', r).value || null, name: $('[name=name]', r).value.trim(), role: $('[name=role]', r).value.trim(), company: $('[name=company]', r).value.trim(), is_hse: $('.jt-hse', r).checked }))
        .filter(r => r.profile_id || r.name);
      const h = rows.find(r => r.is_hse);
      if (h && h.profile_id && (S.jt.cfg.people || []).find(p => p.id === h.profile_id)?.role === 'viewer') throw new Error('The HSE person has view-only JobTrack, so they can’t fill the HSE part. Ask the Developer to make them an Engineer, or untick HSE.');
      await q(sb.rpc('jt_crew_set', { p_job: j.id, p_rows: rows })); toast('Crew saved'); render({ quiet: true });
    } });
}
// copy the crew and/or ticket items from another job
async function jtCopyForm(j) {
  const jobs = (await q(sb.from('jt_jobs').select('id,job_no,project,field').neq('id', j.id).order('seq', { ascending: false }).limit(80)));
  if (!jobs.length) return toast('There’s no other job to copy from yet.', true);
  return modal({ title: 'Copy from another job', submit: 'Copy', sub: 'Adds the people and ticket items from that job to this one. Nothing already here is removed or doubled.',
    body: `<label class="f">From<select name="from" required>${jobs.map(o => opt(o.id, [o.job_no, o.project, o.field].filter(Boolean).join(' · '), '')).join('')}</select></label>
      <label class="check"><input type="checkbox" name="crew" checked> Crew</label><label class="check"><input type="checkbox" name="items" checked> Ticket items</label>`,
    onSubmit: async x => {
      if (!x.crew && !x.items) throw new Error('Tick crew, ticket items or both.');
      const c = await q(sb.rpc('jt_job_copy', { p_job: j.id, p_from: +x.from, p_crew: !!x.crew, p_items: !!x.items }));
      toast(`Copied ${plural(c.crew, 'person', 'people')} and ${plural(c.items, 'ticket item')}${c.skipped ? `. ${plural(c.skipped, 'item')} left out: their equipment group isn’t on this job` : ''}`); render({ quiet: true });
    } });
}

// choose the job's ticket items: from the list, from Inventory, or typed in
async function jtJobItemsForm(j) {
  let rows = j.items.map(i => ({ ...i }));
  const draw = d => {
    const box = $('#jt-ji', d);
    box.innerHTML = rows.length ? Object.keys(JT_SEC).map(k => { const a = rows.map((r, i) => [r, i]).filter(([r]) => r.section === k); return a.length ? `<div class="jt-sec">${esc(JT_SEC[k])}</div>${a.map(([r, i]) => `<div class="jt-jirow">
        <div class="jt-jid"><b>${esc(r.description)}</b>${r.is_new || !r.cat_id ? ' ' + chip('soon', 'New') : ''}<div class="sub">${esc(jtRuleText(r))}</div></div>
        <label class="jt-q">Qty<input type="number" min="0" step="any" value="${esc(r.qty ?? 1)}" data-qty="${i}"></label>
        <button type="button" class="btn small" data-jirm="${i}" title="Remove">${ico('trash')}</button></div>`).join('')}` : ''; }).join('') : '<div class="empty">Nothing chosen yet. Search below.</div>';
    $$('[data-qty]', d).forEach(x => x.oninput = () => { rows[+x.dataset.qty].qty = x.value; });
    $$('[data-jirm]', d).forEach(b => b.onclick = () => { rows.splice(+b.dataset.jirm, 1); draw(d); });
    $('#jt-jicount', d).textContent = plural(rows.length, 'item');
  };
  return modal({ title: 'Ticket items for ' + j.job_no, wide: true, submit: 'Save items',
    sub: 'What this job will put on its tickets. Quantity is how many (for example 2 TTSC engineers, or 5 people for feeding). Days are counted from the daily reports.',
    body: `<div class="jt-jihead"><b id="jt-jicount"></b></div><div id="jt-ji" class="jt-ji"></div>
      <div class="pjf-sec">Add</div>${jtPickerHtml('jt-jip')}`,
    onOpen: d => {
      draw(d);
      jtBindPicker(d, 'jt-jip', j, item => { rows.push({ cat_id: item.cat_id || null, inv_item: item.inv_item || null, section: item.section, description: item.description, unit: item.unit, rule: item.rule, grp: item.grp, mode: item.mode || 'normal', qty: item.qty ?? 1, is_new: !item.cat_id }); draw(d); });
    },
    onSubmit: async () => {
      await q(sb.rpc('jt_job_items_set', { p_job: j.id, p_rows: rows.map(r => ({ id: r.id || null, cat_id: r.cat_id || null, inv_item: r.inv_item || null, section: r.section, description: r.description, unit: r.unit, rule: r.rule, grp: r.grp, mode: r.mode, qty: r.qty })) }));
      toast('Ticket items saved'); render({ quiet: true });
    } });
}

// one search box: the ticket items list, then Inventory; anything not found can be typed in
const jtPickerHtml = id => `<div class="jt-pick" id="${id}"><input type="search" class="jt-pq" placeholder="Search the ticket items list and Inventory (e.g. actuator, crane, supervisor)" autocomplete="off">
  <div class="jt-pres"></div></div>`;
function jtBindPicker(root, id, j, onPick) {
  const box = $('#' + id, root), inp = $('.jt-pq', box), res = $('.jt-pres', box);
  const groups = j?.groups || jtGroups();
  const run = debounce(async () => {
    const t = inp.value.trim().toLowerCase(); if (t.length < 2) { res.innerHTML = ''; return; }
    const words = t.split(/\s+/);
    const cat = S.jt.items.filter(i => i.active && words.every(w => (i.description + ' ' + (i.aliases || []).join(' ')).toLowerCase().includes(w))).slice(0, 12);
    let inv = []; try { inv = (await q(sb.rpc('jt_inv_search', { p_q: t }))).filter(x => !S.jt.items.some(i => i.inv_item === x.id)).slice(0, 8); } catch (e) { inv = []; }
    res.innerHTML = `${cat.map(i => `<button type="button" class="jt-pr" data-cat="${i.id}"><b>${esc(i.description)}</b><span class="sub">${esc(JT_SEC[i.section])} · ${esc(jtRuleText(i))}</span></button>`).join('')}
      ${inv.map(x => `<button type="button" class="jt-pr" data-inv="${x.id}"><b>${esc(x.name)}</b><span class="sub">From Inventory${x.code ? ' · ' + esc(x.code) : ''} · you choose how it’s counted</span></button>`).join('')}
      <button type="button" class="jt-pr type" data-type="1">${ico('edit')}<b>Type “${esc(inp.value.trim())}”</b><span class="sub">Not on the list: type it in. An operations manager can add it to the list when approving.</span></button>`;
    $$('[data-cat]', res).forEach(b => b.onclick = () => { const i = S.jt.items.find(x => x.id === +b.dataset.cat); onPick({ cat_id: i.id, inv_item: i.inv_item, section: i.section, description: i.description, unit: i.unit, rule: i.rule, grp: i.grp, mode: i.mode, qty: 1 }); inp.value = ''; res.innerHTML = ''; inp.focus(); });
    $$('[data-inv]', res).forEach(b => b.onclick = async () => { const x = inv.find(y => y.id === +b.dataset.inv); const r = await jtNewLineForm(x.name, groups, { inv_item: x.id, section: x.type === 'sales' ? 'sales' : x.type === 'consumable' ? 'consumable' : 'rental' }); if (r) { onPick(r); inp.value = ''; res.innerHTML = ''; } });
    $('[data-type]', res).onclick = async () => { const r = await jtNewLineForm(inp.value.trim(), groups, {}); if (r) { onPick(r); inp.value = ''; res.innerHTML = ''; } };
  }, 220);
  inp.oninput = run;
  inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); run(); } };
}
// a line typed in or picked from Inventory: say what kind of line it is and how it's counted
function jtNewLineForm(desc, groups, o = {}) {
  return new Promise(resolve => {
    const d = document.createElement('dialog'); d.className = 'modal';
    d.innerHTML = `<form method="dialog" novalidate><div class="mh"><h2>How is this line counted?</h2><p>${esc(desc)}</p></div><div class="mb"><div class="err" hidden></div>
      <label class="f">Description<input name="description" value="${esc(desc)}"></label>
      <div class="row2"><label class="f">Section<select name="section">${Object.entries(JT_SEC).map(([k, v]) => opt(k, v, o.section || 'rental')).join('')}</select></label>
      <label class="f">Counted by<select name="rule">${Object.entries(JT_RULE).map(([k, v]) => opt(k, v, o.section === 'sales' || o.section === 'consumable' ? 'qty' : 'days')).join('')}</select></label></div>
      <div class="row2"><label class="f">Equipment group<select name="grp"><option value="">—</option>${groups.map(g => opt(g, g, groups[0])).join('')}</select><span class="hint">For lines counted by days, mobilisation or demobilisation.</span></label>
      <label class="f">Days as<select name="mode">${Object.entries(JT_MODE).map(([k, v]) => opt(k, v, 'normal')).join('')}</select></label></div>
      <label class="f">Quantity<input type="number" name="qty" min="0" step="any" value="1"></label></div>
      <div class="mf"><button type="button" class="btn" data-x>Cancel</button><button type="submit" class="btn primary">Add line</button></div></form>`;
    document.body.appendChild(d); d.showModal();
    const close = v => { d.close(); d.remove(); resolve(v); };
    $('[data-x]', d).onclick = () => close(null); d.addEventListener('cancel', e => { e.preventDefault(); close(null); });
    $('form', d).onsubmit = e => { e.preventDefault(); const x = Object.fromEntries(new FormData($('form', d)).entries());
      if (!x.description.trim()) { const er = $('.err', d); er.textContent = 'Describe the line.'; er.hidden = false; return; }
      if (['days'].includes(x.rule) && !x.grp) { const er = $('.err', d); er.textContent = 'Choose the equipment group whose days it follows.'; er.hidden = false; return; }
      close({ cat_id: null, inv_item: o.inv_item || null, section: x.section, description: x.description.trim(), unit: '', rule: x.rule, grp: x.grp || null, mode: x.mode, qty: +x.qty || 1 }); };
  });
}

// ---------------------------------------------------------------- logos (clients, or a job's own)
const _jtLogoCache = {};
async function jtLogoData(ids) {
  const need = ids.filter(id => !_jtLogoCache[id]);
  if (need.length) (await q(sb.from('jt_files').select('id,mime,data').in('id', need)).catch(() => [])).forEach(f => { _jtLogoCache[f.id] = `data:${f.mime || 'image/png'};base64,${f.data}`; });
  return ids.map(id => _jtLogoCache[id]).filter(Boolean);
}
async function jtDrawLogos(root) {
  const els = $$('[data-logo]', root); if (!els.length) return;
  await jtLogoData(els.map(e => +e.dataset.logo));
  els.forEach(e => { const u = _jtLogoCache[+e.dataset.logo]; if (u) e.innerHTML = `<img src="${u}" alt="">`; });
}
const jtLogoEditor = (logos, scope) => `<div class="jt-logoed" data-scope="${scope}">${logos.map((l, i) => `<div class="jt-logoitem"><span class="jt-logo" data-logo="${l.id}"></span>
    <div class="jt-logoact">${i > 0 ? `<button type="button" class="btn small" data-lup="${l.id}" title="Move left">←</button>` : ''}${i < logos.length - 1 ? `<button type="button" class="btn small" data-ldown="${l.id}" title="Move right">→</button>` : ''}
    <button type="button" class="btn small danger" data-ldel="${l.id}" title="Remove">${ico('trash')}</button></div></div>`).join('')}
  ${logos.length < 3 ? `<label class="btn small filebtn">${ico('up')}Add logo<input type="file" accept="image/png,image/jpeg" data-ladd hidden></label>` : ''}
  <span class="muted small">Up to 3, shown top left of the daily report in this order. The GANKCO logo is always top right.</span></div>`;
function jtBindLogoEditor(root, owner) {
  const ed = $('.jt-logoed', root); if (!ed) return;
  const ids = $$('[data-ldel]', ed).map(b => +b.dataset.ldel);
  const add = $('[data-ladd]', ed);
  if (add) add.onchange = async () => { const f = add.files[0]; if (!f) return;
    try { const data = await jtImageB64(f, 900, f.type === 'image/png' ? 'image/png' : 'image/jpeg');
      await q(sb.rpc('jt_file_add', { p: { kind: 'logo', ...owner, name: f.name, mime: data.mime, data: data.b64 } })); toast('Logo added'); render({ quiet: true });
    } catch (e) { toast(niceError(e), true); } };
  $$('[data-ldel]', ed).forEach(b => b.onclick = async () => { if (!confirm('Remove this logo?')) return; try { await q(sb.rpc('jt_file_delete', { p_id: +b.dataset.ldel })); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } });
  const move = async (id, dir) => { const a = ids.slice(); const i = a.indexOf(id); const k = i + dir; [a[i], a[k]] = [a[k], a[i]]; try { await q(sb.rpc('jt_logo_order', { p_ids: a })); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } };
  $$('[data-lup]', ed).forEach(b => b.onclick = () => move(+b.dataset.lup, -1));
  $$('[data-ldown]', ed).forEach(b => b.onclick = () => move(+b.dataset.ldown, 1));
}
// read an image, shrink it to max px on the long side, return base64
async function jtImageB64(file, max = 1600, mime = 'image/jpeg', quality = 0.8) {
  const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('The file couldn’t be read')); r.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That isn’t an image Nest can read')); i.src = url; });
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const x = c.getContext('2d'); if (mime === 'image/jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); } x.drawImage(img, 0, 0, c.width, c.height);
  const out = c.toDataURL(mime, quality); return { mime, b64: out.split(',')[1], w: c.width, h: c.height };
}
const jtFileB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('The file couldn’t be read')); r.readAsDataURL(f); });

// ================================================================ DAILY OPERATION REPORT
// drafts kept on the phone while typing; reports that couldn't be sent wait in an outbox and go when the signal is back
const JT_OUT = 'nest.jt.outbox';
const jtOutbox = () => { try { return JSON.parse(localStorage.getItem(JT_OUT) || '[]'); } catch (e) { return []; } };
const jtOutboxSet = a => { try { localStorage.setItem(JT_OUT, JSON.stringify(a)); } catch (e) { } };
const jtNetErr = e => !navigator.onLine || /failed to fetch|networkerror|load failed|network request failed|reach the server/i.test(String(e?.message || e));
let jtFlushing = false;
async function jtFlush() {
  const box = jtOutbox(); if (!box.length || jtFlushing || !navigator.onLine) return; jtFlushing = true;
  const left = [];
  for (const x of box) {
    try { const id = await q(sb.rpc('jt_report_save', { p: x.p })); if (x.submit) await q(sb.rpc('jt_report_submit', { p_id: id })); try { localStorage.removeItem(x.key); } catch (e) { } toast(`Sent: daily report for ${x.label}`); }
    catch (e) { if (jtNetErr(e)) left.push(x); else { left.push({ ...x, error: niceError(e) }); toast(`The daily report for ${x.label} couldn’t be sent: ${niceError(e)} Open it, fix it and send again.`, true); } }
  }
  jtOutboxSet(left); jtFlushing = false;
}
window.addEventListener('online', () => { if (S.session) jtFlush(); });

// 3.0.9: each activity has a start time only. It runs until the next one starts; the last one until the day ends.
const jtTm = t => /^\d\d:\d\d$/.test(t || '') ? +t.slice(0, 2) * 60 + +t.slice(3) : null;
// the order of the day: a time before the day's start (05:00, or the first activity if that's earlier) is after midnight
const jtPivot = first => Math.min(300, jtTm(first) ?? 300);
const jtDayKey = (t, pivot) => { const m = jtTm(t); return m == null ? 1e9 : m < pivot ? m + 1440 : m; };
const jtSpans = (ops, end) => ops.map((o, i) => { const to = i < ops.length - 1 ? ops[i + 1].from : (end || ''); return { ...o, to, mins: jtMins(o.from, to) }; });
const jtNowHM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// the Daily Operations Summary, written from the day's activities: the work steps, without routine lines or readings
const JT_ROUTINE = /\b(arrived|arrival|departed|left (the )?location|safety meeting|toolbox|tbt|htbt|pre-?job|jha|jsa|ptw|permit to work|revalidated|housekeeping|lunch|tea break)\b/i;
const JT_READING = /^(@|checking weights?\b|checked weights?\b)|^[A-Z]{2,6}\s*[-:=]\s*\d|^(rw|hw|puw|sow)\b/i;
function jtAutoSummary(ops) {
  const acts = [];
  (ops || []).forEach(o => {
    const cl = [];
    String(o.desc || '').split(/\n/).forEach(line => {
      line = line.replace(/\s+/g, ' ').trim(); if (!line) return;
      line.split(/;\s*|\.\s+(?=[A-Z0-9])/).forEach(c => {
        c = c.trim().replace(/[.;,:]+$/, ''); if (!c || JT_READING.test(c)) return;
        if (/^(ok|okay|done|good|successful)\b/i.test(c) && c.length < 14) { if (cl.length) cl[cl.length - 1] += '; ' + c; return; }   // "Surface tested PCM; OK"
        cl.push(c);
      });
    });
    const keep = cl.filter(c => !JT_ROUTINE.test(c));
    if (keep.length) acts.push(keep.join('; '));
  });
  const out = []; acts.forEach(c => { if (out[out.length - 1]?.toLowerCase() !== c.toLowerCase()) out.push(c); });
  // a day of routine only (standby, moving) keeps its lines
  if (!out.length) (ops || []).forEach(o => { const t = String(o.desc || '').replace(/\s+/g, ' ').trim().replace(/[.;,:]+$/, ''); if (t) out.push(t); });
  return out.length ? out.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join('. ') + '.' : '';
}

const jtReport = {
  async load(parts, params) {
    this.key = null; this.r = null; this.behalf = false;
    if (parts[2] === 'new') {
      const jobId = +params?.get('job');
      if (!jobId) return this.picker();
      const j = this.j = await q(sb.rpc('jt_job_get', { p_id: jobId }));
      if (!j.can_write) return topbar('New daily report') + `<div class="notice">You’re not on the crew of ${esc(j.job_no)}. Ask an operations manager to add you.</div>`;
      const date = params.get('date') || localISO(0);
      let wellId = +params.get('well') || (j.reports[0]?.well_id) || j.wells[j.wells.length - 1]?.id || null;
      // an existing report for that well and day opens instead
      const ex = j.reports.find(r => r.well_id === wellId && r.report_date === date);
      if (ex) { setTimeout(() => go('#/jt/report/' + ex.id), 0); return '<div class="loading">Opening…</div>'; }
      const prev = (await q(sb.from('jt_reports').select('*').eq('job_id', j.id).lte('report_date', date).order('report_date', { ascending: false }).limit(1)))[0];
      // POB from the crew (it can still be changed on the day)
      const gk = j.crew.filter(c => (c.company || 'GANKCO').toUpperCase() === 'GANKCO').length, oth = j.crew.length - gk;
      const hseCrew = j.crew.find(c => c.is_hse);
      this.r = { id: null, job_id: j.id, well_id: wellId, report_date: date, status: 'draft', client_reps: prev?.client_reps || j.client_reps || '', gankco_rep: prev?.gankco_rep || j.lead_name || '',
        man_hours: prev?.man_hours ?? '', tri: 0, lti: false, hse_comment: 'No incident / accident', summary: '', ops: [{ from: '06:00', desc: '' }], day_end: '', weather: prev?.weather || '',
        equipment: prev?.equipment || {}, comments: '', look_ahead: '', pob_client: prev?.pob_client ?? '', pob_gankco: j.crew.length ? gk : prev?.pob_gankco ?? '', pob_others: j.crew.length ? oth : prev?.pob_others ?? '',
        photos: [], can_edit: true, hse_id: j.hse_id || null, hse_name: hseCrew?.name || '', is_hse: !!j.is_hse, is_lead: j.lead_id === S.profile.id };
      this.key = `nest.jt.dor.new.${j.id}`;
    } else {
      const id = +parts[2];
      const r = this.r = await q(sb.rpc('jt_report_get', { p_id: id }));
      this.j = await q(sb.rpc('jt_job_get', { p_id: r.job_id }));
      this.key = `nest.jt.dor.${id}`;
    }
    const local = (() => { try { return JSON.parse(localStorage.getItem(this.key) || 'null'); } catch (e) { return null; } })();
    this.local = local && (!this.r.updated_at || local.at > new Date(this.r.updated_at).getTime()) ? local : null;
    if (this.local?.behalf) this.behalf = true;
    // the HSE person on board (not the lead) fills just the HSE part
    this.hseOnly = !!(this.r.id && this.r.is_hse && !this.r.is_lead && !jtAdmin());
    return this.hseOnly ? this.hsePage() : this.r.can_edit ? this.form() : this.view();
  },
  // which job? (from the phone bar)
  async picker() {
    const o = await q(sb.rpc('jt_overview'));
    const jobs = o.jobs.filter(j => j.status !== 'closed');
    return topbar('New daily report', 'Choose the job.') + (jobs.length ? `<section class="panel"><ul class="list">${jobs.map(j => `<li><a class="main" href="#/jt/report/new?job=${j.id}">
        <div class="name">${esc(j.job_no)} ${jtChip(JT_STATUS, j.status)}</div><div class="sub">${esc([j.client, j.project, j.field].filter(Boolean).join(' · '))}</div></a></li>`).join('')}</ul></section>`
      : '<div class="notice">You’re not on any open job. An operations manager adds you to a job’s crew.</div>');
  },
  head() {
    const r = this.r, j = this.j;
    return `<div class="jt-rhead"><div><div class="jt-rjob">${esc(j.job_no)} · ${esc(j.client?.short_name || j.client?.name || '')}</div>
      <div class="jt-rmeta">${r.id ? `Report ${r.report_no} · day ${r.report_no} on this well · ` : ''}${r.id ? jtChip(JT_RSTATUS, r.status) : chip('muted', 'New')}${r.submitted_by_name ? ` <span class="sub">sent by ${esc(r.submitted_by_name)} ${fdt(r.submitted_at)}</span>` : ''}${r.reviewed_by_name ? ` <span class="sub">· reviewed by ${esc(r.reviewed_by_name)}</span>` : ''}</div></div></div>`;
  },
  // who fills the HSE part here: 'open' (you can type it) or 'locked' (the HSE person does)
  hseMode() {
    const r = this.r;
    if (!r.hse_id || r.is_hse) return 'open';
    return this.behalf ? 'open' : 'locked';
  },
  canBehalf() { return jtAdmin() || this.j.lead_id === S.profile.id; },
  hseStatus() {
    const r = this.r;
    if (r.hse_at) return chip('ok', `Filled by ${r.hse_by_name || ''}${r.hse_on_behalf ? ` for ${r.hse_name || 'HSE'}` : ''}`);
    return r.hse_id ? chip('pending', `Waiting for ${r.hse_name || 'HSE'}`) : chip('muted', 'Not filled yet');
  },
  hseFields(v) {
    return `<div class="row3"><label class="f">Total man-hours<input type="number" name="man_hours" min="0" step="any" value="${esc(v.man_hours ?? '')}"></label>
        <label class="f">TRI<input type="number" name="tri" min="0" step="1" value="${esc(v.tri ?? 0)}"></label>
        <label class="check jt-ltichk"><input type="checkbox" name="lti" ${v.lti ? 'checked' : ''}> A lost-time injury (LTI) today</label></div>
      <label class="f">HSE comment<input name="hse_comment" value="${esc(v.hse_comment || '')}" placeholder="No incident / accident"></label>`;
  },
  hseSection(v) {
    const r = this.r, mode = this.hseMode(); const who = r.hse_name || 'the HSE person';
    const head = `<header><h2>HSE</h2><span class="meta">Days without LTI: <b id="jt-lti">${r.lti_days ?? '—'}</b></span><span class="right">${r.hse_id || r.hse_at ? this.hseStatus() : ''}</span></header>`;
    if (mode === 'open') return `<section class="panel jt-hse" id="jt-hsebox">${head}<div class="body">
      ${this.behalf ? `<div class="notice">You’re filling this on behalf of ${esc(who)}. It’s recorded that you did. <button type="button" class="btn small" id="jt-hseundo">Leave it to ${esc(who)}</button></div>` : ''}
      ${!r.hse_id && this.j.crew.some(c => c.is_hse) ? `<p class="muted small">For ${esc(this.j.crew.find(c => c.is_hse).name)} (HSE, not in Nest).</p>` : ''}
      ${this.hseFields(v)}</div></section>`;
    const filled = !!r.hse_at;
    return `<section class="panel jt-hse locked" id="jt-hsebox">${head}<div class="body">
      ${filled ? `<div class="jt-facts"><div><span>Man-hours</span><b>${jtNum(r.man_hours) || '—'}</b></div><div><span>TRI</span><b>${r.tri ?? 0}</b></div><div><span>LTI today</span><b>${r.lti ? 'Yes' : 'No'}</b></div><div><span>HSE comment</span><b>${esc(r.hse_comment || '—')}</b></div></div>`
        : `<p class="muted">${esc(who)} (HSE on board) fills this part${r.id ? '' : ' once the report is saved'}. The report can’t be sent until it’s filled.</p>`}
      ${['draft', 'returned'].includes(r.status || 'draft') ? `<div class="actionrow">${r.id && !filled ? `<button type="button" class="btn small" id="jt-hserem">${ico('bell')}Remind ${esc(r.hse_name || 'HSE')}</button>` : ''}
        ${this.canBehalf() ? `<button type="button" class="btn small" id="jt-hsemine">${ico('edit')}${filled ? 'Change it myself' : 'Fill it myself'}</button>` : ''}</div>` : ''}</div></section>`;
  },
  opRow(o) {
    return `<div class="jt-op"><input type="time" class="jt-from" value="${esc(o.from || '')}" aria-label="Started at"><span class="jt-hrs"></span>
      <textarea class="jt-desc" rows="1" placeholder="What the crew did">${esc(o.desc || '')}</textarea><button type="button" class="btn small" data-oprm title="Remove">${ico('trash')}</button></div>`;
  },
  form() {
    const r = this.r, j = this.j, admin = jtAdmin();
    const v = this.local ? { ...r, ...this.local.data } : r;
    const groups = j.groups || [];
    const others = (r.same_day || []);
    const ops = (v.ops?.length ? v.ops : [{ from: '', desc: '' }]);
    return topbar(r.id ? `Daily report · ${esc(r.well || '')}` : 'New daily report', jtDay(v.report_date), `<a class="btn" href="#/jt/job/${j.id}">Back to job</a>`) + this.head() +
      `${this.local ? `<div class="notice">This phone has changes that weren’t saved (${fdt(this.local.at)}). They’re shown below. <button type="button" class="btn small" id="jt-discard">Discard them</button></div>` : ''}
      ${r.status === 'returned' && r.return_note ? `<div class="notice bad"><b>Sent back:</b> ${esc(r.return_note)}</div>` : ''}
      ${(() => { const w = jtOutbox().find(x => x.key === this.key); return !w ? '' : w.error ? `<div class="notice bad">This report was saved on the phone but couldn’t be sent: ${esc(w.error)} Fix it and press Save again.</div>` : `<div class="notice jt-wait">${ico('clock')} Waiting for signal: this report is saved on the phone and will be sent by itself.</div>`; })()}
      <form id="jt-dor" class="jt-dor" novalidate>
      <section class="panel"><header><h2>Well and date</h2></header><div class="body">
        <div class="row2"><label class="f">Well<select name="well_id" required>${j.wells.map(w => opt(w.id, w.name, v.well_id)).join('')}</select>${j.can_write ? `<span class="hint"><a href="#" id="jt-addwell2">Moved to a new well? Add it</a></span>` : ''}</label>
        <label class="f">Date<input type="date" name="report_date" value="${esc(v.report_date)}" max="${localISO(1)}" required></label></div>
        ${others.length ? `<p class="muted small">Also on this day: ${others.map(o => `<a href="#/jt/report/${o.id}">${esc(o.well)}</a>`).join(', ')}</p>` : ''}
        ${!j.wells.length ? '<div class="notice">Add the well first.</div>' : ''}</div></section>
      <section class="panel"><header><h2>Activities</h2><span class="meta" id="jt-tot"></span></header><div class="body">
        <p class="muted small">Enter the time each activity started. It runs until the next one starts.</p>
        <div id="jt-ops">${ops.map(o => this.opRow(o)).join('')}</div>
        <div class="jt-opbar"><button type="button" class="btn small" id="jt-addop">${ico('plus')}Add activity</button><button type="button" class="btn small" id="jt-now">${ico('clock')}Now</button>
          <label class="jt-end">Day ended at<input type="time" name="day_end" value="${esc(v.day_end || '')}" aria-label="Day ended at"><button type="button" class="btn small" id="jt-endnow">Now</button><span class="hint">Usually 18:00. Fill it when the crew stops.</span></label>
          <span class="jt-sp"></span><button type="button" class="btn small" id="jt-wa2">${ico('chat')}Copy for WhatsApp</button></div></div></section>
      <section class="panel"><header><h2>Daily operations summary (24 hr)</h2><span class="right"><button type="button" class="btn small" id="jt-sumgo">${ico('undo')}Rebuild from activities</button></span></header><div class="body">
        <textarea name="summary" rows="4" placeholder="Written for you from the activities. You can change it.">${esc(v.summary || '')}</textarea>
        <p class="muted small" id="jt-sumnote">Written from today’s activities. Your changes are kept unless you press Rebuild.</p></div></section>
      <section class="panel"><header><h2>Weather condition</h2><span class="meta">For the WhatsApp update</span></header><div class="body">
        <input name="weather" value="${esc(v.weather || '')}" placeholder="Calm and Cloudy" list="jt-wx"><datalist id="jt-wx">${['Calm and Cloudy', 'Sunny', 'Calm and Sunny', 'Cloudy', 'Rainy', 'Light rain', 'Heavy rain', 'Windy', 'Stormy'].map(x => `<option value="${x}">`).join('')}</datalist></div></section>
      <section class="panel"><header><h2>Equipment status today</h2><span class="meta">Tickets count operating and standby days from this</span></header><div class="body jt-eqset">
        ${groups.map(g => `<div class="jt-eqrow"><b>${esc(g)}</b><div class="seg jt-eqseg" data-g="${esc(g)}">${Object.entries(JT_EQ).map(([k, x]) => `<button type="button" data-v="${k}" class="${v.equipment?.[g] === k ? 'on ' + x[0] : ''}">${x[1]}</button>`).join('')}</div></div>`).join('')}
        <p class="muted small">Op: working. Stdby: on location, not working. Mob/Demob: moving in or out. Off: not on location.</p></div></section>
      ${this.hseSection(v)}
      <section class="panel"><header><h2>People</h2></header><div class="body">
        <div class="row2"><label class="f">Client rep(s)<input name="client_reps" value="${esc(v.client_reps || '')}"></label><label class="f">GANKCO rep<input name="gankco_rep" value="${esc(v.gankco_rep || '')}"></label></div>
        <div class="row3"><label class="f">POB · client<input type="number" min="0" name="pob_client" value="${esc(v.pob_client ?? '')}"></label><label class="f">POB · GANKCO<input type="number" min="0" name="pob_gankco" value="${esc(v.pob_gankco ?? '')}"></label>
          <label class="f">POB · others<input type="number" min="0" name="pob_others" value="${esc(v.pob_others ?? '')}"></label></div>
        ${!r.id && j.crew.length ? '<p class="muted small">GANKCO and others are counted from the job’s crew. Change them if today is different.</p>' : ''}</div></section>
      <section class="panel"><header><h2>Comments and look ahead</h2></header><div class="body">
        <label class="f">General comments / observations<textarea name="comments" rows="2">${esc(v.comments || '')}</textarea></label>
        <label class="f">Look ahead<textarea name="look_ahead" rows="2" placeholder="Drift well and conduct BHP survey">${esc(v.look_ahead || '')}</textarea></label></div></section>
      <section class="panel"><header><h2>Photos</h2><span class="meta">${r.id ? plural(r.photos.length, 'photo') : 'Save the report first'}</span></header><div class="body">
        <div class="jt-photos">${(r.photos || []).map(p => `<figure class="jt-ph" data-ph="${p.id}"><span class="jt-phimg"></span><figcaption>${esc(p.caption || '')}</figcaption>
          <button type="button" class="btn small danger" data-phdel="${p.id}" title="Remove">${ico('trash')}</button></figure>`).join('')}</div>
        ${r.id ? `<label class="btn small filebtn">${ico('up')}Add photos<input type="file" accept="image/*" multiple id="jt-phadd" hidden></label>` : ''}</div></section>
      </form>
      <div class="jt-actbar">
        ${admin && r.status === 'submitted' ? `<button class="btn" id="jt-back">${ico('undo')}Send back</button><button class="btn primary" id="jt-ok">${ico('check')}Mark reviewed</button>` : ''}
        <button class="btn" id="jt-wa">${ico('chat')}WhatsApp</button>${r.id ? `<button class="btn" id="jt-pdf">${ico('pdf')}PDF</button><button class="btn" id="jt-xl">${ico('down')}Excel</button>` : ''}
        ${r.id && (admin || ['draft', 'returned'].includes(r.status)) ? `<button class="btn danger" id="jt-del">${ico('trash')}</button>` : ''}
        <span class="jt-sp"></span>
        <button class="btn" id="jt-save">${ico('check')}Save</button>${['draft', 'returned'].includes(r.status || 'draft') ? `<button class="btn tagbtn" id="jt-send">${ico('send')}Save and send</button>` : ''}</div>`;
  },
  // the activities as typed, in the order of the day
  opsNow(main) { return $$('.jt-op', main).map(x => ({ from: $('.jt-from', x).value, desc: $('.jt-desc', x).value.trim() })); },
  // the report as typed
  collect(main) {
    const f = $('#jt-dor', main); const x = Object.fromEntries(new FormData(f).entries());
    const eq = {}; $$('.jt-eqseg', main).forEach(s => { const on = $('button.on', s); if (on) eq[s.dataset.g] = on.dataset.v; });
    const ops = this.opsNow(main).filter(o => o.desc);
    const p = { id: this.r.id, job_id: this.j.id, well_id: +x.well_id || null, report_date: x.report_date, client_reps: x.client_reps, gankco_rep: x.gankco_rep,
      summary: x.summary, ops, day_end: x.day_end || '', weather: x.weather, equipment: eq, comments: x.comments, look_ahead: x.look_ahead,
      pob_client: x.pob_client, pob_gankco: x.pob_gankco, pob_others: x.pob_others };
    if (this.hseMode() === 'open') { p.hse = { man_hours: x.man_hours, tri: x.tri, lti: !!$('[name=lti]', f)?.checked, hse_comment: x.hse_comment }; if (this.behalf) p.hse_on_behalf = true; }
    return p;
  },
  viewBody(hseEditable) {
    const r = this.r, j = this.j;
    const spans = (r.ops || []).map(o => ({ ...o, mins: jtMins(o.from, o.to) }));
    const tot = spans.reduce((a, o) => a + (o.mins || 0), 0);
    return `${r.status === 'returned' && r.return_note ? `<div class="notice bad"><b>Sent back:</b> ${esc(r.return_note)}</div>` : ''}
      ${hseEditable || ''}
      <section class="panel"><div class="body jt-facts">
        <div><span>Client</span><b>${esc(j.client?.name || '')}</b></div><div><span>Client rep(s)</span><b>${esc(r.client_reps || '—')}</b></div><div><span>GANKCO rep</span><b>${esc(r.gankco_rep || '—')}</b></div>
        <div><span>Field · well</span><b>${esc([r.well_field, r.well].filter(Boolean).join(' · '))}</b></div><div><span>Project</span><b>${esc(j.project || '—')}</b></div><div><span>Weather</span><b>${esc(r.weather || '—')}</b></div>
        ${hseEditable ? '' : `<div><span>Man-hours</span><b>${jtNum(r.man_hours) || '—'}</b></div><div><span>Days without LTI</span><b>${r.lti_days ?? '—'}</b></div><div><span>TRI</span><b>${r.tri ?? 0}</b></div>
        <div><span>HSE</span><b>${esc(r.hse_comment || '—')}</b>${r.hse_by_name ? `<span class="sub">by ${esc(r.hse_by_name)}${r.hse_on_behalf ? ` for ${esc(r.hse_name || 'HSE')}` : ''}</span>` : ''}</div>`}
        <div><span>POB (client / GANKCO / others)</span><b>${[r.pob_client, r.pob_gankco, r.pob_others].map(x => x ?? '—').join(' / ')}</b></div></div></section>
      <section class="panel"><header><h2>Equipment status</h2></header><div class="body jt-eqs">${(j.groups || []).map(g => jtEqChip(g, r.equipment?.[g])).join('')}</div></section>
      <section class="panel"><header><h2>Daily operations summary (24 hr)</h2></header><div class="body jt-pre">${esc(r.summary || '—')}</div></section>
      <section class="panel"><header><h2>Activities</h2><span class="meta">${jtHm(tot)} h</span></header>
        <div class="tablewrap"><table class="t"><thead><tr><th>From</th><th>To</th><th>Hours</th><th>Activity</th></tr></thead><tbody>
        ${spans.map(o => `<tr><td>${esc(o.from)}</td><td>${esc(o.to || '—')}</td><td>${jtHm(o.mins)}</td><td class="jt-pre">${esc(o.desc)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">None</td></tr>'}</tbody></table></div></section>
      <section class="panel"><header><h2>Comments and look ahead</h2></header><div class="body"><p><b>Comments:</b> ${esc(r.comments || '—')}</p><p><b>Look ahead:</b> ${esc(r.look_ahead || '—')}</p></div></section>
      ${r.photos?.length ? `<section class="panel"><header><h2>Photos</h2></header><div class="body jt-photos">${r.photos.map(p => `<figure class="jt-ph" data-ph="${p.id}"><span class="jt-phimg"></span><figcaption>${esc(p.caption || '')}</figcaption></figure>`).join('')}</div></section>` : ''}`;
  },
  view() {
    const r = this.r, j = this.j, admin = jtAdmin();
    return topbar(`Daily report · ${esc(r.well)}`, jtDay(r.report_date), `<a class="btn" href="#/jt/job/${j.id}">Back to job</a>`) + this.head() + this.viewBody() +
      `<div class="jt-actbar">${admin && r.status === 'submitted' ? `<button class="btn" id="jt-back">${ico('undo')}Send back</button><button class="btn primary" id="jt-ok">${ico('check')}Mark reviewed</button>` : ''}
        <button class="btn" id="jt-wa">${ico('chat')}WhatsApp</button><button class="btn" id="jt-pdf">${ico('pdf')}PDF</button><button class="btn" id="jt-xl">${ico('down')}Excel</button></div>`;
  },
  // the HSE person on board: their part to fill, and the rest of the report to read
  hsePage() {
    const r = this.r, j = this.j; const open = ['draft', 'returned'].includes(r.status);
    const box = `<form id="jt-hseform"><section class="panel jt-hse mine"><header><h2>Your HSE section</h2><span class="meta">Days without LTI: <b>${r.lti_days ?? '—'}</b></span><span class="right">${this.hseStatus()}</span></header><div class="body">
      ${open ? `<p class="muted small">You’re the HSE person on ${esc(j.job_no)}. The lead can’t send this report until you fill this.</p>${this.hseFields(r.hse_at ? r : { ...r, man_hours: r.man_hours ?? '', hse_comment: r.hse_comment || 'No incident / accident' })}
        <div class="acc-save"><button class="btn primary" type="submit">${ico('check')}Save HSE</button></div>`
        : `<div class="jt-facts"><div><span>Man-hours</span><b>${jtNum(r.man_hours) || '—'}</b></div><div><span>TRI</span><b>${r.tri ?? 0}</b></div><div><span>LTI today</span><b>${r.lti ? 'Yes' : 'No'}</b></div><div><span>HSE comment</span><b>${esc(r.hse_comment || '—')}</b></div></div>
        <p class="muted small">The report has been ${r.status === 'reviewed' ? 'reviewed' : 'sent'}. An operations manager can send it back if HSE needs changing.</p>`}</div></section></form>`;
    return topbar(`Daily report · ${esc(r.well)}`, jtDay(r.report_date), `<a class="btn" href="#/jt/job/${j.id}">Back to job</a>`) + this.head() + this.viewBody(box) +
      `<div class="jt-actbar"><button class="btn" id="jt-wa">${ico('chat')}WhatsApp</button><button class="btn" id="jt-pdf">${ico('pdf')}PDF</button><button class="btn" id="jt-xl">${ico('down')}Excel</button></div>`;
  },
  bind(main) {
    const r = this.r; if (!r) return; const self = this;
    // photos
    const phs = $$('[data-ph]', main);
    if (phs.length) q(sb.from('jt_files').select('id,mime,data').in('id', phs.map(p => +p.dataset.ph))).then(rows => rows.forEach(f => { const el = $(`[data-ph="${f.id}"] .jt-phimg`, main); if (el) el.innerHTML = `<img src="data:${f.mime};base64,${f.data}" alt="">`; })).catch(() => { });
    const live = () => r.can_edit && !this.hseOnly && $('#jt-dor', main) ? (() => { const p = this.collect(main); return { ...r, ...p, ops: jtSpans(p.ops, p.day_end), well: this.j.wells.find(w => w.id === p.well_id)?.name || r.well }; })() : r;
    const wa = () => jtShareWhatsApp(live(), this.j);
    ['#jt-wa', '#jt-wa2'].forEach(k => { const b = $(k, main); if (b) b.onclick = wa; });
    const pdf = $('#jt-pdf', main); if (pdf) pdf.onclick = () => jtDorPdfAsk(r.id, this.j);
    const xl = $('#jt-xl', main); if (xl) xl.onclick = () => withProgress('Making the Excel file…', async () => { try { await jtDorWorkbook(this.j, [r.id]); } catch (e) { toast(niceError(e), true); } });
    const ok = $('#jt-ok', main); if (ok) ok.onclick = async () => { try { await q(sb.rpc('jt_report_review', { p_id: r.id, p_ok: true, p_note: null })); toast('Reviewed'); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } };
    const bk = $('#jt-back', main); if (bk) bk.onclick = () => modal({ title: 'Send this report back', submit: 'Send back', body: '<label class="f">What needs changing?<textarea name="note" rows="3" required></textarea></label>',
      onSubmit: async x => { await q(sb.rpc('jt_report_review', { p_id: r.id, p_ok: false, p_note: x.note })); toast('Sent back'); render({ quiet: true }); } });
    // the HSE person's own part
    const hf = $('#jt-hseform', main); if (hf) hf.onsubmit = async e => {
      e.preventDefault(); const x = Object.fromEntries(new FormData(hf).entries());
      if (x.man_hours === '' || !String(x.hse_comment || '').trim()) return toast('Fill the man-hours and the HSE comment.', true);
      try { await q(sb.rpc('jt_report_hse', { p_id: r.id, p: { man_hours: x.man_hours, tri: x.tri, lti: !!hf.lti?.checked, hse_comment: x.hse_comment } })); toast('HSE saved. The lead can now send the report.'); render({ quiet: true }); }
      catch (e2) { toast(niceError(e2), true); }
    };
    if (!r.can_edit || this.hseOnly) return;
    // typing: keep a copy on the phone
    const keep = debounce(() => { try { localStorage.setItem(this.key, JSON.stringify({ at: Date.now(), behalf: this.behalf, data: this.collect(main) })); } catch (e) { } }, 600);
    const ops = $('#jt-ops', main), endIn = $('[name=day_end]', main), sum = $('[name=summary]', main);
    // the summary follows the activities until someone edits it
    sum.dataset.auto = !sum.value.trim() || sum.value.trim() === jtAutoSummary(this.opsNow(main).filter(o => o.desc)) ? '1' : '';
    const autoSum = force => { const t = jtAutoSummary(this.opsNow(main).filter(o => o.desc)); if (force || sum.dataset.auto === '1') { sum.value = t; sum.dataset.auto = '1'; } };
    sum.addEventListener('input', () => { sum.dataset.auto = sum.value.trim() ? '' : '1'; });
    $('#jt-sumgo', main).onclick = () => { if (sum.dataset.auto !== '1' && sum.value.trim() && !confirm('Replace the summary with one written from the activities?')) return; autoSum(true); keep(); };
    const durations = () => {
      const rows = $$('.jt-op', main); let t = 0;
      rows.forEach((x, i) => { const to = i < rows.length - 1 ? $('.jt-from', rows[i + 1]).value : endIn.value; const m = $('.jt-desc', x).value.trim() || $('.jt-from', x).value ? jtMins($('.jt-from', x).value, to) : null;
        $('.jt-hrs', x).textContent = m == null ? (i === rows.length - 1 && $('.jt-from', x).value ? 'until day ends' : '') : jtHm(m) + ' h'; t += m || 0; });
      $('#jt-tot', main).textContent = t ? `${jtHm(t)} h in total` : '';
    };
    // keep the rows in the order of the day
    const sortRows = () => {
      const rows = $$('.jt-op', main); if (rows.length < 2) return;
      const pivot = jtPivot($('.jt-from', rows[0]).value);
      const sorted = rows.map((x, i) => [x, i]).sort((a, b) => (jtDayKey($('.jt-from', a[0]).value, pivot) - jtDayKey($('.jt-from', b[0]).value, pivot)) || a[1] - b[1]).map(a => a[0]);
      if (sorted.some((x, i) => x !== rows[i])) { sorted.forEach(x => ops.appendChild(x)); toast('Activities put in time order', false); }
    };
    const grow = d => { d.style.height = 'auto'; d.style.height = d.scrollHeight + 'px'; };
    const wire = () => {
      $$('.jt-op', main).forEach(x => {
        const fr = $('.jt-from', x), d = $('.jt-desc', x);
        fr.oninput = durations; fr.onchange = () => { sortRows(); durations(); autoSum(); keep(); };
        d.oninput = () => { grow(d); durations(); autoSum(); }; grow(d);
        $('[data-oprm]', x).onclick = () => { if ($$('.jt-op', main).length > 1) x.remove(); else { fr.value = ''; d.value = ''; } durations(); autoSum(); keep(); };
      });
    };
    wire(); durations();
    const addRow = (from, focusDesc) => { ops.insertAdjacentHTML('beforeend', this.opRow({ from, desc: '' })); wire(); const last = $$('.jt-op', main).pop(); sortRows(); durations();
      (focusDesc ? $('.jt-desc', last) : $('.jt-from', last)).focus(); keep(); };
    $('#jt-addop', main).onclick = () => addRow('', false);
    $('#jt-now', main).onclick = () => { const empty = $$('.jt-op', main).find(x => !$('.jt-from', x).value && !$('.jt-desc', x).value.trim());
      if (empty) { $('.jt-from', empty).value = jtNowHM(); sortRows(); durations(); $('.jt-desc', empty).focus(); keep(); } else addRow(jtNowHM(), true); };
    endIn.oninput = durations; endIn.onchange = () => { durations(); keep(); };
    $('#jt-endnow', main).onclick = () => { endIn.value = jtNowHM(); durations(); keep(); };
    $$('.jt-eqseg', main).forEach(s => $$('button', s).forEach(b => b.onclick = () => { $$('button', s).forEach(x => x.className = ''); b.className = 'on ' + JT_EQ[b.dataset.v][0]; keep(); }));
    $('#jt-dor', main).addEventListener('input', keep); $('#jt-dor', main).addEventListener('change', keep);
    // the HSE part
    const rem = $('#jt-hserem', main); if (rem) rem.onclick = async () => { try { const who = await q(sb.rpc('jt_hse_remind', { p_id: r.id })); toast(`${who} has been reminded`); rem.disabled = true; } catch (e) { toast(niceError(e), true); } };
    const mine = $('#jt-hsemine', main); if (mine) mine.onclick = () => { const cur = this.collect(main); this.behalf = true;
      $('#jt-hsebox', main).outerHTML = this.hseSection(r.hse_at ? r : { ...r, man_hours: r.man_hours ?? cur.man_hours ?? '', hse_comment: r.hse_comment || 'No incident / accident' }); this.bindHse(main, keep); keep(); };
    this.bindHse(main, keep);
    const dis = $('#jt-discard', main); if (dis) dis.onclick = () => { try { localStorage.removeItem(this.key); } catch (e) { } render({ quiet: true }); };
    const aw = $('#jt-addwell2', main); if (aw) aw.onclick = async e => { e.preventDefault(); keep(); const id = await jtWellForm(this.j); if (id) { this.j = await q(sb.rpc('jt_job_get', { p_id: this.j.id })); } };
    const save = async submit => {
      sortRows(); const p = this.collect(main);
      if (!p.well_id) return toast('Choose the well (add it first if it’s new).', true);
      if (submit) {
        if (!p.ops.length) return toast('Add the day’s activities first', true);
        if (p.ops.some(o => !jtTm(o.from))) return toast('Give each activity its start time', true);
        if (!p.day_end) return toast('Give the time the day ended (when the last activity finished)', true);
        const miss = (this.j.groups || []).filter(g => !p.equipment[g]); if (miss.length) return toast('Set the equipment status for ' + miss.join(', '), true);
        if (!String(p.summary || '').trim()) return toast('Write the daily operations summary first', true);
        if (p.hse && (p.hse.man_hours === '' || !String(p.hse.hse_comment || '').trim())) return toast('Fill the HSE section (man-hours and the HSE comment) first', true);
        if (!p.hse && !r.hse_at) return toast(`The HSE section isn’t filled yet. Ask ${r.hse_name || 'the HSE person'} to fill it, or fill it on their behalf.`, true);
      }
      try {
        const id = await q(sb.rpc('jt_report_save', { p }));
        if (submit) await q(sb.rpc('jt_report_submit', { p_id: id }));
        try { localStorage.removeItem(this.key); } catch (e) { } jtOutboxSet(jtOutbox().filter(x => x.key !== this.key));
        toast(submit ? 'Report sent' : 'Saved');
        if (!r.id) go('#/jt/report/' + id); else render({ quiet: true });
      } catch (e) {
        if (jtNetErr(e)) {
          const label = `${this.j.wells.find(w => w.id === p.well_id)?.name || ''} ${fd(p.report_date)}`;
          jtOutboxSet([...jtOutbox().filter(x => x.key !== this.key), { key: this.key, p, submit, label }]);
          toast('No signal. The report is saved on this phone and will be sent by itself when you’re back online.');
          if (!$('#jt-wait', main)) $('#jt-dor', main).insertAdjacentHTML('beforebegin', `<div class="notice jt-wait" id="jt-wait">${ico('clock')} No signal: this report is saved on the phone and will be sent by itself when you’re back online. You can keep working.</div>`);
        } else toast(niceError(e), true);
      }
    };
    $('#jt-save', main).onclick = () => save(false);
    const sd = $('#jt-send', main); if (sd) sd.onclick = () => save(true);
    const del = $('#jt-del', main); if (del) del.onclick = async () => { if (!confirm('Delete this daily report?')) return; try { await q(sb.rpc('jt_report_delete', { p_id: r.id })); try { localStorage.removeItem(this.key); } catch (e) { } toast('Deleted'); go('#/jt/job/' + this.j.id); } catch (e) { toast(niceError(e), true); } };
    const pa = $('#jt-phadd', main); if (pa) pa.onchange = async () => {
      const files = [...pa.files]; if (!files.length) return;
      await withProgress('Adding photos…', async set => {
        for (let i = 0; i < files.length; i++) { set(i, files.length);
          try { const im = await jtImageB64(files[i], 1600, 'image/jpeg', 0.75); await q(sb.rpc('jt_file_add', { p: { kind: 'photo', report_id: r.id, name: files[i].name, mime: im.mime, data: im.b64 } })); }
          catch (e) { toast(niceError(e), true); } }
      });
      render({ quiet: true });
    };
    $$('[data-phdel]', main).forEach(b => b.onclick = async () => { if (!confirm('Remove this photo?')) return; try { await q(sb.rpc('jt_file_delete', { p_id: +b.dataset.phdel })); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } });
  },
  bindHse(main, keep) {
    const undo = $('#jt-hseundo', main); if (undo) undo.onclick = () => { this.behalf = false; $('#jt-hsebox', main).outerHTML = this.hseSection(this.r);
      const again = $('#jt-hsemine', main); if (again) again.onclick = () => { this.behalf = true; $('#jt-hsebox', main).outerHTML = this.hseSection(this.r.hse_at ? this.r : { ...this.r, man_hours: this.r.man_hours ?? '', hse_comment: this.r.hse_comment || 'No incident / accident' }); this.bindHse(main, keep); keep(); };
      const rem = $('#jt-hserem', main); if (rem) rem.onclick = async () => { try { const who = await q(sb.rpc('jt_hse_remind', { p_id: this.r.id })); toast(`${who} has been reminded`); rem.disabled = true; } catch (e) { toast(niceError(e), true); } };
      keep(); };
  }
};

// ---------------------------------------------------------------- Copy for WhatsApp, in the operations group's own format
// *Update on Olomoro 8S TTSHO Operation Update - OML30*
// *27th July, 2026*  • activity  • activity  *Weather Condition*  Calm and Cloudy   (then the next day)
const jtOrd = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const jtWaDate = d => { const x = new Date(d + 'T00:00:00'); return `${jtOrd(x.getDate())} ${x.toLocaleDateString('en-GB', { month: 'long' })}, ${x.getFullYear()}`; };
const jtWaTitle = (j, well, field, t) => String(t || j.wa_title || JT_WA_DEFAULT).replace(/\{well\}/gi, well || '').replace(/\{job type\}/gi, j.job_type || '').replace(/\{field\}/gi, field || j.field || '')
  .replace(/\{client\}/gi, j.client?.short_name || j.client?.name || '').replace(/\{job no\}/gi, j.job_no || '').replace(/\s+/g, ' ').replace(/\s+-\s*$/, '').trim();
function jtWhatsAppText(days, j, well, field, title) {
  const out = [`*${jtWaTitle(j, well, field, title)}*`];
  days.forEach(d => {
    out.push('', `*${jtWaDate(d.report_date)}*`);
    (d.ops || []).filter(o => String(o.desc || '').trim()).forEach(o => out.push('• ' + String(o.desc).replace(/\s*\n\s*/g, ' ').trim()));
    if (String(d.weather || '').trim()) out.push('', '*Weather Condition*', String(d.weather).trim());
  });
  return out.join('\n');
}
async function jtShareWhatsApp(r, j) {
  // the well's days so far (this report as it is on screen)
  let days = [];
  try { days = r.well_id ? await q(sb.from('jt_reports').select('id,report_date,ops,weather').eq('job_id', j.id).eq('well_id', r.well_id).order('report_date')) : []; } catch (e) { days = []; }
  days = days.filter(d => d.report_date !== r.report_date && d.id !== r.id); days.push({ id: r.id, report_date: r.report_date, ops: r.ops, weather: r.weather });
  days.sort((a, b) => a.report_date.localeCompare(b.report_date));
  const field = r.well_field || j.wells?.find(w => w.id === r.well_id)?.field || j.field;
  const canTitle = jtAdmin() || j.lead_id === S.profile.id;
  modal({ title: 'Copy for WhatsApp', submit: null, cancel: 'Close', sub: 'In the operations group’s format. Copy it again after each new activity and paste the latest version. Nothing is sent from Nest.', wide: true,
    body: `<div class="jt-wagrid"><div>
        <div class="segi" id="jt-wawhich"><label><input type="radio" name="which" value="today" checked><span>This day</span></label><label><input type="radio" name="which" value="pick"><span>Pick days</span></label><label><input type="radio" name="which" value="all"><span>The whole well so far</span></label></div>
        <div class="checklist jt-wadays" hidden>${days.map(d => `<label class="checkrow"><input type="checkbox" data-d="${d.report_date}" ${d.report_date === r.report_date ? 'checked' : ''}><span><b>${esc(jtDay(d.report_date))}</b></span></label>`).join('')}</div>
        <label class="f mt">Title<input name="wa_title" value="${esc(j.wa_title || JT_WA_DEFAULT)}"><span class="hint">{well} becomes ${esc(r.well || 'the well')}.</span></label>
        ${canTitle ? `<label class="check"><input type="checkbox" name="keep_title"> Use this title for this job from now on</label>` : ''}</div>
      <div><textarea class="jt-wa" rows="16" readonly></textarea></div></div>
      <div class="actionrow"><button type="button" class="btn primary" id="jt-wacopy">${ico('chat')}Copy</button><a class="btn" target="_blank" rel="noopener" id="jt-waopen">Open WhatsApp</a></div>`,
    onOpen: d => {
      const ta = $('.jt-wa', d), ti = $('[name=wa_title]', d);
      const draw = () => {
        const w = $('[name=which]:checked', d).value; $('.jt-wadays', d).hidden = w !== 'pick';
        const pick = w === 'today' ? days.filter(x => x.report_date === r.report_date) : w === 'all' ? days : days.filter(x => $(`[data-d="${x.report_date}"]`, d)?.checked);
        ta.value = jtWhatsAppText(pick, j, r.well, field, ti.value); $('#jt-waopen', d).href = 'https://wa.me/?text=' + encodeURIComponent(ta.value);
      };
      $$('[name=which]', d).forEach(x => x.onchange = draw); $$('[data-d]', d).forEach(x => x.onchange = draw); ti.oninput = draw; draw();
      $('#jt-wacopy', d).onclick = async () => {
        try { await navigator.clipboard.writeText(ta.value); } catch (e) { ta.select(); document.execCommand('copy'); }
        toast('Copied. Paste it into the WhatsApp group.');
        const kt = $('[name=keep_title]', d);
        if (kt?.checked && ti.value.trim() !== (j.wa_title || JT_WA_DEFAULT)) {
          try { const full = await q(sb.rpc('jt_job_get', { p_id: j.id })); await q(sb.rpc('jt_job_save', { p: { ...full, client_id: full.client_id, groups: full.groups, wa_title: ti.value.trim() } })); j.wa_title = ti.value.trim(); kt.checked = false; }
          catch (e) { toast(niceError(e), true); }
        }
      };
    } });
}

// ================================================================ TICKETS
async function jtNewTicket(j, kind) {
  if (kind === 'service' && !j.wells.length) return toast('Add a well first.', true);
  if (kind === 'service' && !j.items.length) { if (!confirm('This job has no ticket items chosen yet, so the ticket will start empty. Carry on?')) return; }
  const firstLast = w => { const rs = j.reports.filter(r => w.includes(r.well_id)).map(r => r.report_date).sort(); return [rs[0] || '', rs[rs.length - 1] || '']; };
  const defW = j.reports[0] ? [j.reports[0].well_id] : [j.wells[0]?.id];
  const [f0, t0] = firstLast(defW);
  return modal({ title: kind === 'service' ? 'New ticket' : 'New reimbursables ticket', submit: 'Create ticket',
    sub: kind === 'service' ? 'Choose the well or wells and the dates. Nest fills in the lines from this job’s ticket items and counts the days from the daily reports.' : 'FTO, community and truck in/out payments, at cost in Naira, with receipts.',
    body: `${kind === 'service' ? `<div class="f jt-f">Wells${j.wells.map(w => `<label class="check"><input type="checkbox" name="w_${w.id}" ${defW.includes(w.id) ? 'checked' : ''}> ${esc(w.name)}</label>`).join('')}</div>
      <label class="f">Heading<input name="title" value="${esc(j.project || '')}" placeholder="TT Screens, Running Tools &amp; Personnel (for 2 3/8&quot; Tubing)"></label>` : ''}
      <div class="row2"><label class="f">From<input type="date" name="date_from" value="${esc(kind === 'service' ? f0 : j.mob_date || '')}"></label><label class="f">To<input type="date" name="date_to" value="${esc(kind === 'service' ? t0 : j.demob_date || localISO(0))}"></label></div>
      ${kind === 'service' ? '<p class="muted small">Leave the dates as they are to cover every report for the wells you tick. On a moving day both wells have a report: make sure each day is on only one ticket.</p>' : ''}`,
    onOpen: d => { $$('[name^=w_]', d).forEach(c => c.onchange = () => { const w = j.wells.filter(x => $(`[name=w_${x.id}]`, d).checked).map(x => x.id); const [a, b] = firstLast(w); $('[name=date_from]', d).value = a; $('[name=date_to]', d).value = b; }); },
    onSubmit: async x => {
      const wells = j.wells.filter(w => x['w_' + w.id]).map(w => w.id);
      const id = await q(sb.rpc('jt_ticket_create', { p: { job_id: j.id, kind, wells, title: x.title, date_from: x.date_from || null, date_to: x.date_to || null } }));
      toast('Ticket created'); go('#/jt/ticket/' + id); return id;
    } });
}

const jtTicket = {
  async load(parts) {
    const id = +parts[2];
    const t = this.t = await q(sb.rpc('jt_ticket_get', { p_id: id }));
    this.lines = t.lines.map(l => ({ ...l }));
    this.dirty = false;
    const reimb = t.kind === 'reimb';
    const c = t.counts;
    const warn = [];
    if (t.overlaps?.length) warn.push(`Some days are also on ${t.overlaps.map(o => `<a href="#/jt/ticket/${o.id}">${esc(o.ticket_no)}</a> (${fd(o.date_from)} to ${fd(o.date_to)})`).join(', ')}. Each day should be on one ticket only.`);
    if (c?.drafts) warn.push(`${plural(c.drafts, 'daily report')} in these dates ${c.drafts === 1 ? 'hasn’t' : 'haven’t'} been sent yet. The counts use ${c.drafts === 1 ? 'it' : 'them'} as they are.`);
    if (!reimb && c && !c.location) warn.push('No daily reports fall in these dates for these wells, so every day count is 0.');
    return topbar(esc(t.ticket_no), `${esc(t.job.client?.name || '')} · ${reimb ? 'Reimbursables' : esc(t.well_names.join(' & '))}`, `<a class="btn" href="#/jt/job/${t.job.id}?t=tickets">Back to job</a>`) +
      `<div class="jt-rhead"><div><div class="jt-rjob">${esc(t.job.job_no)} · ${jtChip(JT_TSTATUS, t.status)}${t.signed_name ? ` <span class="sub">signed by ${esc(t.signed_name)} ${fdt(t.signed_at)}</span>` : ''}${t.decided_by_name && t.status === 'approved' ? ` <span class="sub">· approved by ${esc(t.decided_by_name)} ${fdt(t.decided_at)}</span>` : ''}</div>
        ${t.submitted_by_name ? `<div class="jt-rmeta sub">Sent by ${esc(t.submitted_by_name)} ${fdt(t.submitted_at)}</div>` : ''}</div></div>
      ${t.status === 'returned' && t.return_note ? `<div class="notice bad"><b>Sent back:</b> ${esc(t.return_note)}</div>` : ''}
      ${warn.map(w => `<div class="notice">${w}</div>`).join('')}
      <section class="panel"><header><h2>Ticket</h2>${t.can_edit ? '<span class="meta">Changing anything removes your signature: sign again before sending</span>' : ''}</header><div class="body">
        ${t.can_edit ? `${reimb ? '' : `<label class="f">Heading<input id="tk-title" value="${esc(t.title || '')}"></label>
          <div class="f jt-f">Wells<div class="jt-chk">${t.job.wells.map(w => `<label class="check"><input type="checkbox" data-tw="${w.id}" ${t.wells.includes(w.id) ? 'checked' : ''}> ${esc(w.name)}</label>`).join('')}</div></div>`}
          <div class="row3"><label class="f">From<input type="date" id="tk-from" value="${esc(t.date_from || '')}"></label><label class="f">To<input type="date" id="tk-to" value="${esc(t.date_to || '')}"></label>
            ${reimb ? '' : `<div class="f jt-f">&nbsp;<button type="button" class="btn" id="tk-recount">${ico('undo')}Count the days again</button></div>`}</div>
          <label class="f">Notes<textarea id="tk-notes" rows="2">${esc(t.notes || '')}</textarea></label>`
        : `<div class="jt-facts"><div><span>Heading</span><b>${esc(t.title || '—')}</b></div><div><span>Dates</span><b>${t.date_from ? fd(t.date_from) + ' to ' + fd(t.date_to) : '—'}</b></div>
          <div><span>Client PO</span><b>${esc(t.job.client_po || '—')}</b></div>${t.notes ? `<div><span>Notes</span><b>${esc(t.notes)}</b></div>` : ''}</div>`}
        ${!reimb && c ? `<div class="jt-cnt">${(t.job.groups || []).map(g => { const x = c.groups?.[g] || {}; return `<span><b>${esc(g)}</b> ${x.op || 0} op · ${x.sb || 0} stdby${x.mob ? ' · mob' : ''}${x.demob ? ' · demob' : ''}</span>`; }).join('')}<span><b>On location</b> ${c.location} days</span></div>` : ''}
      </div></section>
      <section class="panel"><header><h2>${reimb ? 'Payments' : 'Lines'}</h2><span class="meta" id="tk-meta"></span></header><div id="tk-lines"></div>
        ${t.can_edit ? `<div class="body">${reimb ? `<button type="button" class="btn small" id="tk-addr">${ico('plus')}Add a payment</button>` : jtPickerHtml('tk-pick')}</div>` : ''}</section>
      ${this.filesPanel(t)}
      ${t.can_decide ? this.decidePanel(t) : ''}
      <div class="jt-actbar">
        <button class="btn" id="tk-pdf">${ico('pdf')}${reimb ? 'PDF' : 'Unpriced ticket (PDF)'}</button>${reimb ? '' : `<button class="btn" id="tk-xls">${ico('down')}Excel</button>`}
        ${t.can_edit ? `<button class="btn danger" id="tk-del">${ico('trash')}</button>` : ''}
        ${jtAdmin() && t.status === 'approved' ? `<button class="btn" id="tk-reopen">${ico('undo')}Reopen</button>` : ''}
        <span class="jt-sp"></span>
        ${t.can_edit ? `<button class="btn" id="tk-save">${ico('check')}Save</button><button class="btn" id="tk-sign">${ico('sign')}${t.signed_at ? 'Signed' : 'Sign'}</button><button class="btn tagbtn" id="tk-send">${ico('send')}Send for approval</button>` : ''}</div>`;
  },
  filesPanel(t) {
    const reimb = t.kind === 'reimb';
    const signed = t.files.filter(f => f.kind === 'signed'), other = t.files.filter(f => f.kind !== 'signed');
    if (reimb && !t.files.length && !t.can_edit) return '';
    return `<section class="panel"><header><h2>${reimb ? 'Other documents' : 'Client-signed copy'}</h2>${!reimb ? `<span class="meta">${signed.length ? chip('ok', 'Uploaded') : chip('pending', 'Needed before sending')}</span>` : ''}</header>
      ${t.files.length ? `<ul class="list">${t.files.map(f => `<li><div style="flex:1"><div class="name">${esc(f.name)}</div><div class="sub">${f.kind === 'signed' ? 'Client-signed ticket' : 'Document'} · ${esc(f.added_by_name || '')} ${fdt(f.added_at)}</div></div>
        <div class="end"><button class="btn small" data-fdl="${f.id}">${ico('down')}Open</button>${t.can_edit ? ` <button class="btn small danger" data-fdel="${f.id}">${ico('trash')}</button>` : ''}</div></li>`).join('')}</ul>` : ''}
      ${t.can_edit ? `<div class="body">${!reimb ? '<p class="muted small">Print the unpriced ticket, have the client rep sign it, then photograph or scan it and upload it here.</p>' : ''}
        <label class="btn small filebtn">${ico('up')}${reimb ? 'Upload a document' : 'Upload the signed copy'}<input type="file" accept="image/*,application/pdf" id="tk-file" hidden></label></div>` : ''}</section>`;
  },
  decidePanel(t) {
    const nw = this.lines.filter(l => l.is_new);
    return `<section class="panel jt-decide"><header><h2>Approve this ticket</h2><span class="meta">You’re an approver</span></header><div class="body">
      ${nw.length ? `<p><b>${plural(nw.length, 'line')} ${nw.length === 1 ? 'isn’t' : 'aren’t'} on the ticket items list yet.</b> Add each to the list, or say which item it is the same as, so BD can price it.</p>
        ${nw.map(l => `<div class="jt-newfix" data-nl="${l.id}"><div><b>${esc(l.description)}</b><div class="sub">${esc(JT_SEC[l.section])} · ${esc(jtRuleText(l))}${l.inv_item ? ' · from Inventory' : ''}</div></div>
          <select data-fix="${l.id}"><option value="">Decide later</option><option value="add">Add to the list</option><optgroup label="Same as…">${S.jt.items.filter(i => i.active && i.section === l.section).map(i => opt('m' + i.id, i.description, '')).join('')}</optgroup></select></div>`).join('')}` : ''}
      <div class="actionrow"><button class="btn" id="tk-return">${ico('undo')}Send back</button><button class="btn primary" id="tk-approve">${ico('check')}Approve</button></div></div></section>`;
  },
  draw(main) {
    const t = this.t, reimb = t.kind === 'reimb', ed = t.can_edit, L = this.lines;
    const box = $('#tk-lines', main);
    if (reimb) {
      const tot = L.reduce((a, l) => a + (+l.amount || 0), 0);
      box.innerHTML = L.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>#</th><th>Payment</th><th>From</th><th>To</th><th class="num">Amount (₦)</th><th>Receipts</th>${ed ? '<th></th>' : ''}</tr></thead><tbody>
        ${L.map((l, i) => `<tr><td>${i + 1}</td><td>${ed ? `<input data-k="description" data-i="${i}" value="${esc(l.description)}">` : esc(l.description)}</td>
          <td>${ed ? `<input type="date" data-k="date_from" data-i="${i}" value="${esc(l.date_from || '')}">` : fd(l.date_from)}</td><td>${ed ? `<input type="date" data-k="date_to" data-i="${i}" value="${esc(l.date_to || '')}">` : fd(l.date_to)}</td>
          <td class="num">${ed ? `<input type="number" min="0" step="0.01" data-k="amount" data-i="${i}" value="${esc(l.amount ?? '')}" class="jt-amt">` : jtNaira(l.amount)}</td>
          <td>${(l.receipts || []).map(f => `<button type="button" class="btn small link" data-fdl="${f.id}">${esc(f.name)}</button>`).join(' ')}${ed && l.id ? `<label class="btn small link filebtn">${ico('up')}Add<input type="file" accept="image/*,application/pdf" data-rcpt="${l.id}" hidden></label>` : ''}</td>
          ${ed ? `<td><button type="button" class="btn small" data-lrm="${i}">${ico('trash')}</button></td>` : ''}</tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="4" class="num"><b>Total</b></td><td class="num"><b>${jtNaira(tot)}</b></td><td colspan="${ed ? 2 : 1}"></td></tr></tfoot></table></div>${ed ? '<p class="body muted small">Save first, then add receipts to each payment.</p>' : ''}`
        : '<div class="empty">No payments yet.</div>';
      $('#tk-meta', main).textContent = plural(L.length, 'payment');
    } else {
      let n = 0;
      const secs = Object.keys(JT_SEC).map(k => [k, L.map((l, i) => [l, i]).filter(([l]) => l.section === k)]).filter(([, a]) => a.length);
      const letters = 'ABCDEFGHIJ';
      const cell = (l, i, k) => {
        const auto = k === 'op_days' ? l.auto_op : k === 'sb_days' ? l.auto_sb : l.auto_qty;
        const changed = auto != null && l[k] != null && +l[k] !== +auto;
        if (!ed) return `${l[k] == null ? 'N/A' : jtNum(l[k])}${changed ? `<span class="jt-was" title="Nest counted ${jtNum(auto)}">*</span>` : ''}`;
        return `<input type="number" min="0" step="any" class="jt-n${changed ? ' changed' : ''}" data-k="${k}" data-i="${i}" value="${esc(l[k] ?? '')}">${changed ? `<span class="jt-was">Nest: ${jtNum(auto)}</span>` : ''}`;
      };
      box.innerHTML = L.length ? `<div class="tablewrap"><table class="t jt-tk"><thead><tr><th>S/N</th><th>Description</th><th class="num">Operating days</th><th class="num">Standby days</th><th class="num">Qty</th>${ed ? '<th></th>' : ''}</tr></thead><tbody>
        ${secs.map(([k, a], si) => `<tr class="jt-secrow"><td>${letters[si]}</td><td colspan="${ed ? 5 : 4}">${esc(JT_SEC[k])}</td></tr>${a.map(([l, i], ii) => {
          const days = ['days', 'location'].includes(l.rule), needR = days ? (l.auto_op != null && +l.op_days !== +l.auto_op) || (l.rule === 'days' && l.auto_sb != null && +l.sb_days !== +l.auto_sb) : ['mob', 'demob'].includes(l.rule) && l.auto_qty != null && +l.qty !== +l.auto_qty;
          return `<tr><td>${['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx', 'xxi', 'xxii', 'xxiii', 'xxiv', 'xxv'][ii] || ii + 1}</td>
            <td><div class="name">${esc(l.description)}${l.is_new ? ' ' + chip('soon', 'New') : ''}</div><div class="sub">${esc(jtRuleText(l))}</div>
              ${ed && needR ? `<input class="jt-reason" data-k="reason" data-i="${i}" placeholder="Why is this different from what Nest counted?" value="${esc(l.reason || '')}">` : l.reason ? `<div class="sub jt-why">Changed: ${esc(l.reason)}</div>` : ''}</td>
            <td class="num">${days ? cell(l, i, 'op_days') : 'N/A'}</td><td class="num">${l.rule === 'days' ? cell(l, i, 'sb_days') : 'N/A'}</td>
            <td class="num">${['mob', 'demob'].includes(l.rule) ? cell(l, i, 'qty') : ed ? `<input type="number" min="0" step="any" class="jt-n" data-k="qty" data-i="${i}" value="${esc(l.qty ?? '')}">` : jtNum(l.qty)}</td>
            ${ed ? `<td><button type="button" class="btn small" data-lrm="${i}" title="Remove">${ico('trash')}</button></td>` : ''}</tr>`; }).join('')}`).join('')}</tbody></table></div>`
        : '<div class="empty">No lines. Search below to add them.</div>';
      $('#tk-meta', main).textContent = plural(L.length, 'line') + (L.some(l => l.is_new) ? ` · ${L.filter(l => l.is_new).length} new` : '');
    }
    if (!ed) { $$('[data-fdl]', main).forEach(b => b.onclick = () => jtOpenFile(+b.dataset.fdl)); return; }
    $$('[data-k]', box).forEach(x => x.oninput = () => { const l = this.lines[+x.dataset.i]; l[x.dataset.k] = x.value === '' ? null : x.value; this.dirty = true;
      if (['op_days', 'sb_days', 'qty'].includes(x.dataset.k) && !reimb) { clearTimeout(this.rt); this.rt = setTimeout(() => { const f = document.activeElement; const k = f?.dataset?.k, i = f?.dataset?.i; this.draw(main); if (k) { const el = $(`[data-k="${k}"][data-i="${i}"]`, box); if (el) { el.focus(); const v = el.value; el.value = ''; el.value = v; } } }, 700); } });
    $$('[data-lrm]', box).forEach(b => b.onclick = () => { this.lines.splice(+b.dataset.lrm, 1); this.dirty = true; this.draw(main); });
    $$('[data-fdl]', main).forEach(b => b.onclick = () => jtOpenFile(+b.dataset.fdl));
    $$('[data-rcpt]', box).forEach(inp => inp.onchange = async () => { const f = inp.files[0]; if (!f) return;
      try { const isImg = /^image\//.test(f.type); const data = isImg ? (await jtImageB64(f, 1800, 'image/jpeg', 0.8)).b64 : await jtFileB64(f);
        await q(sb.rpc('jt_file_add', { p: { kind: 'receipt', ticket_id: t.id, line_id: +inp.dataset.rcpt, name: f.name, mime: isImg ? 'image/jpeg' : f.type, data } })); toast('Receipt added'); render({ quiet: true }); }
      catch (e) { toast(niceError(e), true); } });
  },
  payload() {
    const t = this.t, main = $('#main');
    const wells = t.kind === 'reimb' ? [] : $$('[data-tw]', main).filter(c => c.checked).map(c => +c.dataset.tw);
    return { id: t.id, title: $('#tk-title', main)?.value ?? t.title, wells, date_from: $('#tk-from', main).value || null, date_to: $('#tk-to', main).value || null, notes: $('#tk-notes', main).value,
      lines: this.lines.map(l => ({ id: l.id || null, job_item_id: l.job_item_id || null, cat_id: l.cat_id || null, inv_item: l.inv_item || null, section: l.section, description: l.description, unit: l.unit,
        rule: l.rule, grp: l.grp, mode: l.mode, qty: l.qty, op_days: l.op_days, sb_days: l.sb_days, reason: l.reason, amount: l.amount, date_from: l.date_from, date_to: l.date_to })) };
  },
  async save(silent) { await q(sb.rpc('jt_ticket_save', { p: this.payload() })); this.dirty = false; if (!silent) toast('Saved'); },
  bind(main) {
    const t = this.t; this.draw(main);
    $('#tk-pdf', main).onclick = async () => { try { if (this.dirty && t.can_edit) await this.save(true); await jtTicketPdf(await q(sb.rpc('jt_ticket_get', { p_id: t.id }))); } catch (e) { toast(niceError(e), true); } };
    const xl = $('#tk-xls', main); if (xl) xl.onclick = async () => { try { if (this.dirty && t.can_edit) await this.save(true); await jtTicketXlsx(await q(sb.rpc('jt_ticket_get', { p_id: t.id }))); } catch (e) { toast(niceError(e), true); } };
    $$('[data-fdl]', main).forEach(b => b.onclick = () => jtOpenFile(+b.dataset.fdl));
    const ro = $('#tk-reopen', main); if (ro) ro.onclick = () => modal({ title: 'Reopen ' + t.ticket_no, submit: 'Reopen', body: '<label class="f">Why?<textarea name="note" rows="2" required></textarea></label>',
      onSubmit: async x => { await q(sb.rpc('jt_ticket_reopen', { p_id: t.id, p_note: x.note })); toast('Reopened'); render({ quiet: true }); } });
    if (t.can_decide) {
      const fixes = () => $$('[data-fix]', main).filter(s => s.value).map(s => s.value === 'add' ? { line_id: +s.dataset.fix, action: 'add' } : { line_id: +s.dataset.fix, action: 'match', cat_id: +s.value.slice(1) });
      $('#tk-approve', main).onclick = async () => { const left = $$('[data-fix]', main).filter(s => !s.value).length;
        if (left && !confirm(`${plural(left, 'new line')} ${left === 1 ? 'is' : 'are'} still not on the list. BD will have to match ${left === 1 ? 'it' : 'them'} when pricing. Approve anyway?`)) return;
        try { await q(sb.rpc('jt_ticket_decide', { p_id: t.id, p_approve: true, p_note: null, p_fixes: fixes() })); await jtLoad(true); toast('Approved'); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } };
      $('#tk-return', main).onclick = () => modal({ title: 'Send this ticket back', submit: 'Send back', body: '<label class="f">What needs changing?<textarea name="note" rows="3" required></textarea></label>',
        onSubmit: async x => { await q(sb.rpc('jt_ticket_decide', { p_id: t.id, p_approve: false, p_note: x.note, p_fixes: fixes() })); toast('Sent back'); render({ quiet: true }); } });
    }
    if (!t.can_edit) return;
    const mark = () => { this.dirty = true; };
    ['#tk-title', '#tk-from', '#tk-to', '#tk-notes'].forEach(s => { const e = $(s, main); if (e) e.addEventListener('input', mark); });
    $$('[data-tw]', main).forEach(c => c.onchange = mark);
    if (t.kind === 'reimb') $('#tk-addr', main).onclick = () => { this.lines.push({ description: '', section: 'other', rule: 'qty', amount: null, date_from: t.date_from, date_to: t.date_to }); this.dirty = true; this.draw(main); $$('[data-k="description"]', main).pop()?.focus(); };
    else jtBindPicker(main, 'tk-pick', { groups: t.job.groups }, item => { this.lines.push({ ...item, is_new: !item.cat_id, op_days: null, sb_days: null }); this.dirty = true; this.draw(main); });
    const rc = $('#tk-recount', main); if (rc) rc.onclick = async () => { try { const p = this.payload(); delete p.lines; await q(sb.rpc('jt_ticket_save', { p })); toast('Days counted again from the daily reports'); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } };
    $('#tk-save', main).onclick = async () => { try { await this.save(); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } };
    $('#tk-sign', main).onclick = async () => {
      if (!S.profile.signature_id) return toast('Add your signature first: My account → Signature.', true);
      try { if (this.dirty) await this.save(true); await q(sb.rpc('jt_ticket_sign', { p_id: t.id })); toast('Signed'); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } };
    $('#tk-send', main).onclick = async () => { try {
        if (this.dirty) { await this.save(true); await q(sb.rpc('jt_ticket_sign', { p_id: t.id })); }
        await q(sb.rpc('jt_ticket_submit', { p_id: t.id })); toast('Sent for approval'); render({ quiet: true }); } catch (e) { toast(niceError(e), true); render({ quiet: true }); } };
    $('#tk-del', main).onclick = async () => { if (!confirm(`Delete ${t.ticket_no}?`)) return; try { await q(sb.rpc('jt_ticket_delete', { p_id: t.id })); toast('Deleted'); go(`#/jt/job/${t.job.id}?t=tickets`); } catch (e) { toast(niceError(e), true); } };
    const fi = $('#tk-file', main); if (fi) fi.onchange = async () => { const f = fi.files[0]; if (!f) return;
      try { if (this.dirty) await this.save(true); const isImg = /^image\//.test(f.type); const data = isImg ? (await jtImageB64(f, 2200, 'image/jpeg', 0.82)).b64 : await jtFileB64(f);
        await q(sb.rpc('jt_file_add', { p: { kind: t.kind === 'reimb' ? 'file' : 'signed', ticket_id: t.id, name: f.name, mime: isImg ? 'image/jpeg' : f.type, data } })); toast('Uploaded'); render({ quiet: true }); }
      catch (e) { toast(niceError(e), true); } };
    $$('[data-fdel]', main).forEach(b => b.onclick = async () => { if (!confirm('Remove this file?')) return; try { await q(sb.rpc('jt_file_delete', { p_id: +b.dataset.fdel })); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } });
  }
};
async function jtOpenFile(id) {
  try { const f = (await q(sb.from('jt_files').select('name,mime,data').eq('id', id)))[0]; if (!f) return;
    const bin = atob(f.data); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    saveBlob(new Blob([a], { type: f.mime || 'application/octet-stream' }), f.name); } catch (e) { toast(niceError(e), true); }
}

// ================================================================ TICKET ITEMS (the list)
const jtItemsPage = {
  async load() {
    await jtLoad(true);
    return topbar('Ticket items', 'Everything that can go on a ticket, and how each is counted. Started from GANKCO’s own TTSC, TTSHO and slickline tickets.', jtAdmin() ? `<button class="btn tagbtn" id="it-new">${ico('plus')}New item</button>` : '') +
      `<section class="panel"><div class="filters body"><input type="search" id="it-q" placeholder="Search" value="${esc(S.jt.ifq.q)}" autocomplete="off">
        <select id="it-sec"><option value="">All sections</option>${Object.entries(JT_SEC).map(([k, v]) => opt(k, v, S.jt.ifq.sec)).join('')}</select>
        <label class="check inline"><input type="checkbox" id="it-hidden"> Show hidden</label></div><div id="it-list"></div></section>
      <section class="panel"><header><h2>How items are counted</h2></header><div class="body"><dl class="kv">
        ${Object.entries(JT_RULE).map(([k, v]) => `<dt>${esc(JT_RULE_SHORT[k])}</dt><dd>${esc(v)}${k === 'days' ? '. A backup (secondary) tool can count every day as standby; a toolbox every day as operating.' : ''}</dd>`).join('')}</dl></div></section>`;
  },
  draw(main) {
    const t = S.jt.ifq.q.trim().toLowerCase(), sec = S.jt.ifq.sec, hid = $('#it-hidden', main).checked;
    const rows = S.jt.items.filter(i => (hid || i.active) && (!sec || i.section === sec) && (!t || (i.description + ' ' + (i.aliases || []).join(' ')).toLowerCase().includes(t)));
    $('#it-list', main).innerHTML = rows.length ? Object.keys(JT_SEC).map(k => { const a = rows.filter(i => i.section === k); return a.length ? `<div class="jt-sec">${esc(JT_SEC[k])} <span class="sub">${a.length}</span></div><ul class="list">${a.map(i => `<li ${jtAdmin() ? `class="clickrow" data-it="${i.id}"` : ''}>
        <div style="flex:1"><div class="name">${esc(i.description)}${i.active ? '' : ' ' + chip('muted', 'Hidden')}</div><div class="sub">${esc(jtRuleText(i))}${i.unit ? ' · per ' + esc(i.unit) : ''}${i.aliases?.length ? ' · also known as: ' + esc(i.aliases.join('; ')) : ''}</div></div></li>`).join('')}</ul>` : ''; }).join('')
      : '<div class="empty">No items match.</div>';
    $$('[data-it]', main).forEach(r => r.onclick = () => jtItemForm(S.jt.items.find(i => i.id === +r.dataset.it)));
  },
  bind(main) {
    this.draw(main);
    $('#it-q', main).oninput = debounce(e => { S.jt.ifq.q = e.target.value; this.draw(main); }, 200);
    $('#it-sec', main).onchange = e => { S.jt.ifq.sec = e.target.value; this.draw(main); };
    $('#it-hidden', main).onchange = () => this.draw(main);
    const n = $('#it-new', main); if (n) n.onclick = () => jtItemForm();
  }
};
async function jtItemForm(i) {
  const groups = [...new Set([...jtGroups(), ...(i?.grp ? [i.grp] : [])])];
  return modal({ title: i ? 'Ticket item' : 'New ticket item', submit: 'Save',
    body: `<label class="f">Description<textarea name="description" rows="2" required>${esc(i?.description || '')}</textarea><span class="hint">Written as it should appear on tickets.</span></label>
      <div class="row2"><label class="f">Section<select name="section">${Object.entries(JT_SEC).map(([k, v]) => opt(k, v, i?.section || 'rental')).join('')}</select></label><label class="f">Unit<input name="unit" value="${esc(i?.unit || '')}" placeholder="day, each, lump sum"></label></div>
      <div class="row2"><label class="f">Counted by<select name="rule">${Object.entries(JT_RULE).map(([k, v]) => opt(k, v, i?.rule || 'days')).join('')}</select></label>
        <label class="f">Equipment group<select name="grp"><option value="">—</option>${groups.map(g => opt(g, g, i?.grp || '')).join('')}</select></label></div>
      <label class="f">Days as<select name="mode">${Object.entries(JT_MODE).map(([k, v]) => opt(k, v, i?.mode || 'normal')).join('')}</select></label>
      ${i?.aliases?.length ? `<p class="muted small">Also matched when typed as: ${esc(i.aliases.join('; '))}</p>` : ''}
      ${i ? `<label class="check"><input type="checkbox" name="active" ${i.active ? 'checked' : ''}> On the list (untick to hide it)</label>` : ''}
      ${i ? '<div class="actionrow"><button type="button" class="btn small danger" id="it-del">' + ico('trash') + 'Delete</button></div>' : ''}`,
    onOpen: (d, close) => { const del = $('#it-del', d); if (del) del.onclick = async () => { if (!confirm('Delete this item? If it has been used it is hidden instead.')) return; try { const r = await q(sb.rpc('jt_item_delete', { p_id: i.id })); toast(r === 'hidden' ? 'It has been used, so it’s hidden instead' : 'Deleted'); await jtLoad(true); close(true); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } }; },
    onSubmit: async x => { await q(sb.rpc('jt_item_save', { p: { ...x, id: i?.id || null, inv_item: i?.inv_item || null, active: i ? !!x.active : true } })); await jtLoad(true); toast('Saved'); render({ quiet: true }); } });
}

// ================================================================ CLIENTS
const jtClientsPage = {
  async load() {
    await jtLoad(true);
    if (!jtAdmin() && !isSuper()) return topbar('Clients') + '<div class="notice">Only JobTrack admins manage clients.</div>';
    const logos = await q(sb.from('jt_files').select('id,client_id,name,sort').eq('kind', 'logo').not('client_id', 'is', null).order('sort'));
    this.logos = logos;
    return topbar('Clients', 'Each client’s name and logos as they appear on the daily report. PFI &amp; Quote adds contracts and rate cards to these clients later.', `<button class="btn tagbtn" id="cl-new">${ico('plus')}New client</button>`) +
      S.jt.clients.map(c => `<section class="panel"><header><h2>${esc(c.short_name || c.name)}</h2>${c.active ? '' : chip('muted', 'Hidden')}<span class="right"><button class="btn small" data-cl="${c.id}">${ico('edit')}Edit</button></span></header>
        <div class="body"><div class="jt-facts"><div><span>Name on reports</span><b>${esc(c.name)}</b></div><div><span>Address</span><b>${esc(c.address || '—')}</b></div></div>
        <div class="mt" data-clogo="${c.id}">${jtLogoEditor(logos.filter(l => l.client_id === c.id), 'client')}</div></div></section>`).join('') || '<div class="notice">No clients yet.</div>';
  },
  bind(main) {
    const n = $('#cl-new', main); if (n) n.onclick = () => jtClientForm();
    $$('[data-cl]', main).forEach(b => b.onclick = () => jtClientForm(S.jt.clients.find(c => c.id === +b.dataset.cl)));
    jtDrawLogos(main);
    $$('[data-clogo]', main).forEach(box => jtBindLogoEditor(box, { client_id: +box.dataset.clogo }));
  }
};
async function jtClientForm(c) {
  return modal({ title: c ? 'Edit client' : 'New client', submit: 'Save',
    body: `<label class="f">Name on reports<input name="name" value="${esc(c?.name || '')}" placeholder="NEPL/SHORELINE/HEOSL OML-30" required></label>
      <label class="f">Short name<input name="short_name" value="${esc(c?.short_name || '')}" placeholder="Heritage (HEOSL)"><span class="hint">Used in lists.</span></label>
      <label class="f">Address<textarea name="address" rows="2">${esc(c?.address || '')}</textarea></label>
      ${c ? `<label class="check"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}> Active (untick to hide)</label>` : ''}`,
    onSubmit: async x => { await q(sb.rpc('jt_client_save', { p: { ...x, id: c?.id || null, active: c ? !!x.active : true } })); await jtLoad(true); toast('Saved'); render({ quiet: true }); } });
}

// ================================================================ SETTINGS
const jtSettingsPage = {
  async load() {
    await jtLoad(true);
    if (!jtAdmin() && !isSuper()) return topbar('JobTrack settings') + '<div class="notice">Only JobTrack admins change these.</div>';
    const c = S.jt.cfg;
    const yr = new Date().getFullYear();
    return topbar('JobTrack settings', 'Jobs and their numbers, equipment groups, who approves tickets, and emails.') +
      `<form id="jts-jobs"><section class="panel" id="jobs"><header><h2>Jobs</h2><span class="meta">Next: GES-JT-OPR-${String(c.next_job || 1).padStart(4, '0')}-${yr}</span></header><div class="body">
        <div class="row2"><label class="f">Who can start a job<select name="who_starts">${opt('any', 'Any engineer (they lead the job)', c.who_starts || 'any')}${opt('admins', 'Operations managers only (JobTrack admins)', c.who_starts || 'any')}</select>
          <span class="hint">So a job can start when the operations manager isn’t around. Leads manage their job’s crew and ticket items.</span></label>
          <label class="f">Next job number<input type="number" name="next_no" min="${(c.last_job || 0) + 1}" step="1" value="${esc(c.next_job || 1)}">
            <span class="hint">Next job: <b id="jts-nprev">GES-JT-OPR-${String(c.next_job || 1).padStart(4, '0')}-${yr}</b>. ${c.last_job ? `It can’t be ${c.last_job} or lower (already used).` : ''} Numbers carry on into a new year; only the year changes.</span></label></div>
        <label class="switch pc-sw"><input type="checkbox" name="tell_ops" ${c.tell_ops !== false ? 'checked' : ''}><span class="sw"></span><span><b>Tell the operations managers when an engineer starts a job</b><span class="sub muted">A Nest notification to every JobTrack admin.</span></span></label>
        <div class="acc-save"><button class="btn primary" type="submit">Save</button></div></div></section></form>
      <form id="jts-groups"><section class="panel" id="groups"><header><h2>Equipment groups</h2><span class="meta">${esc(jtGroups().join(', '))}</span></header><div class="body">
        <p class="muted">New jobs start with these. Each day’s report sets each one to Op, Stdby, Mob, Demob or Off, and tickets count days from them.</p>
        <div id="jts-g">${jtGroups().map(g => `<div class="jt-grow"><input name="g" value="${esc(g)}"><button type="button" class="btn small" data-grm>${ico('trash')}</button></div>`).join('')}</div>
        <button type="button" class="btn small" id="jts-gadd">${ico('plus')}Add a group</button>
        <div class="acc-save"><button class="btn primary" type="submit">Save</button></div></div></section></form>
      <form id="jts-appr"><section class="panel" id="approvers"><header><h2>Who approves tickets</h2><span class="meta">${esc((c.approver_names || []).join(', ') || 'Every JobTrack admin')}</span></header><div class="body">
        <p class="muted">Tick the operations managers who approve tickets. Tick nobody and every JobTrack admin can approve. They get an email and a notification when a ticket comes in.</p>
        ${(c.admins || []).length ? (c.admins || []).map(a => `<label class="check"><input type="checkbox" name="a_${a.id}" ${(c.approvers || []).includes(a.id) ? 'checked' : ''}> ${esc(a.name)}</label>`).join('') : '<div class="notice">Nobody has the JobTrack Admin role yet. The Developer sets it on the Team page.</div>'}
        <div class="acc-save"><button class="btn primary" type="submit">Save</button></div></div></section></form>
      <form id="jts-mail"><section class="panel" id="emails"><header><h2>Emails and reminders</h2></header><div class="body">
        <label class="switch pc-sw"><input type="checkbox" name="emails_on" ${c.emails_on !== false ? 'checked' : ''}><span class="sw"></span><span><b>Email approvers when a ticket is sent</b><span class="sub muted">From nest-alerts, with a Review the ticket button. They always get a Nest notification too.</span></span></label>
        <label class="switch pc-sw mt"><input type="checkbox" name="reminder_on" ${c.reminder_on ? 'checked' : ''}><span class="sw"></span><span><b>Evening reminder</b><span class="sub muted">A Nest notification to the lead and crew when a job on location has no daily report that day.</span></span></label>
        <label class="f mt">Reminder time<select name="reminder_hour">${[17, 18, 19, 20, 21, 22].map(h => opt(h, `${h}:00`, c.reminder_hour || 19)).join('')}</select></label>
        <div class="acc-save"><button class="btn primary" type="submit">Save</button></div></div></section></form>`;
  },
  bind(main) {
    settingsAccordion(main, 'jt-settings');
    const gbox = $('#jts-g', main); if (!gbox) return;
    const wire = () => $$('[data-grm]', gbox).forEach(b => b.onclick = () => b.closest('.jt-grow').remove());
    wire(); $('#jts-gadd', main).onclick = () => { gbox.insertAdjacentHTML('beforeend', `<div class="jt-grow"><input name="g" placeholder="Group name"><button type="button" class="btn small" data-grm>${ico('trash')}</button></div>`); wire(); };
    const saveIt = async p => { try { await q(sb.rpc('jt_settings_save', { p })); await jtLoad(true); toast('Saved'); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } };
    $('#jts-groups', main).onsubmit = e => { e.preventDefault(); saveIt({ groups: $$('[name=g]', gbox).map(x => x.value.trim()).filter(Boolean) }); };
    $('#jts-appr', main).onsubmit = e => { e.preventDefault(); saveIt({ approvers: (S.jt.cfg.admins || []).filter(a => $(`[name="a_${a.id}"]`, main)?.checked).map(a => a.id) }); };
    const jf = $('#jts-jobs', main);
    jf.next_no.oninput = () => { const n = Math.max(1, +jf.next_no.value || 1); $('#jts-nprev', main).textContent = `GES-JT-OPR-${String(n).padStart(4, '0')}-${new Date().getFullYear()}`; };
    jf.onsubmit = e => { e.preventDefault(); const p = { who_starts: jf.who_starts.value, tell_ops: jf.tell_ops.checked };
      if (+jf.next_no.value !== +S.jt.cfg.next_job) p.next_no = +jf.next_no.value; saveIt(p); };
    $('#jts-mail', main).onsubmit = e => { e.preventDefault(); const f = e.target; saveIt({ emails_on: f.emails_on.checked, reminder_on: f.reminder_on.checked, reminder_hour: +f.reminder_hour.value }); };
  }
};
