// ================================================================ 3.0.12 JOBTRACK LIVE
// Today's activity lines from every job on location, newest first, as the crews type them. Daily reports save their finished
// lines by themselves, so this page fills during the day. It looks again every minute while it's open.
let jtLiveTimer = null;
const jtLiveKey = (rid, o) => `${rid}|${o.from}|${o.desc}`;
// the lines of one day, newest first (a day that runs past midnight keeps its order)
function jtLiveLines(d, job) {
  const out = [];
  for (const j of d.jobs) {
    if (job && j.id !== job) continue;
    for (const r of j.reports) {
      const ops = (r.ops || []).filter(o => o.desc); if (!ops.length) continue;
      const pivot = jtPivot(ops[0].from);
      ops.forEach((o, i) => out.push({ j, r, o, last: i === ops.length - 1, k: jtDayKey(o.from, pivot) }));
    }
  }
  return out.sort((a, b) => b.k - a.k || String(b.r.updated_at).localeCompare(String(a.r.updated_at)));
}
const jtLiveAgo = at => { const m = Math.round((Date.now() - new Date(at).getTime()) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : fdt(at); };
const jtLiveHM = at => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });

const jtLive = {
  async load(parts, params) {
    const date = params?.get('date') || ''; this.date = date;
    const d = this.d = await jtCached('live.' + (date || 'today'), () => q(sb.rpc('jt_live', { p_date: date || null })));
    const today = d.date === d.today;
    const job = this.job = d.jobs.some(j => j.id === S.jt.liveJob) ? S.jt.liveJob : null;
    // lines that arrived since the last look are marked New
    const seenFor = S.jt.liveSeen?.date === d.date ? S.jt.liveSeen.keys : null;
    const lines = jtLiveLines(d, job);
    this.fresh = new Set(seenFor ? lines.filter(x => !seenFor.has(jtLiveKey(x.r.id, x.o))).map(x => jtLiveKey(x.r.id, x.o)) : []);
    S.jt.liveSeen = { date: d.date, keys: new Set(jtLiveLines(d, null).map(x => jtLiveKey(x.r.id, x.o))) };
    const jobs = job ? d.jobs.filter(j => j.id === job) : d.jobs;
    const nLines = lines.length;
    return topbar('Live', today ? 'Today’s activities from every job on location, as the crews enter them.' : `Activities on ${jtDay(d.date)}.`,
        `<label class="jt-lvday">Day<input type="date" id="jt-lvdate" value="${esc(d.date)}" max="${esc(d.today)}"></label>${today ? '' : `<a class="btn" href="#/jt/live">Today</a>`}`) +
      `<div class="jt-lvbar">${today ? `<span class="jt-lvdot" aria-hidden="true"></span><span><b>Live</b> · looks again every minute · updated <span id="jt-lvat">${jtLiveHM(d.at)}</span></span>` : `<span>${ico('clock')} ${esc(jtDay(d.date))}</span>`}
        <span class="jt-sp"></span>${d.jobs.length > 1 ? `<label class="jt-lvjob">Job<select id="jt-lvjob"><option value="">All jobs (${d.jobs.length})</option>${d.jobs.map(j => opt(j.id, `${j.job_no} · ${j.client || ''}`, job)).join('')}</select></label>` : ''}
        <button type="button" class="btn small" id="jt-lvgo">${ico('undo')}Refresh</button></div>` +
      (!d.jobs.length ? `<div class="empty">${today ? 'No jobs are on location right now, and no daily reports for today yet.' : 'No daily reports for this day.'}</div>` :
      `<div class="jt-lvcards">${jobs.map(j => this.card(j, today)).join('')}</div>
      <section class="panel"><header><h2>Activities</h2><span class="meta">${plural(nLines, 'line')}${job ? '' : d.jobs.length > 1 ? ` from ${plural(d.jobs.filter(j => j.reports.some(r => (r.ops || []).some(o => o.desc))).length, 'job')}` : ''}, newest first</span></header>
        ${nLines ? `<ol class="jt-lvfeed">${lines.map(x => this.line(x, !job && d.jobs.length > 1)).join('')}</ol>`
          : `<div class="empty">${today ? 'Nothing entered yet today. Lines appear here as soon as the crew types them in their daily report.' : 'No activities were entered on this day.'}</div>`}</section>`);
  },
  card(j, today) {
    const reps = j.reports; const latest = [...reps].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0];
    // equipment from the report updated last; weather from any well's HSE report
    const eq = latest?.equipment || {}; const wx = reps.map(r => r.weather).find(Boolean);
    const lastOp = latest ? (latest.ops || []).filter(o => o.desc).slice(-1)[0] : null;
    return `<a class="jt-lvcard${j.mine ? ' mine' : ''}" href="#/jt/job/${j.id}">
      <div class="jt-lvc-top"><b>${esc(j.job_no)}</b>${jtChip(JT_STATUS, j.status)}${j.mine ? chip('out', 'Yours') : ''}</div>
      <div class="sub">${esc([j.client, j.project, j.field].filter(Boolean).join(' · '))}</div>
      <div class="jt-lvwells">${reps.length ? reps.map(r => `<span class="jt-lvwell">${esc(r.well)} ${jtChip(JT_RSTATUS, r.status)}${r.hse ? '' : ' <span class="jt-lvnohse" title="No HSE report yet">HSE not in</span>'}</span>`).join('')
        : `<span class="muted">${today ? 'No daily report yet today' : 'No report'}</span>`}</div>
      ${(j.groups || []).length ? `<div class="jt-eqs">${j.groups.map(g => jtEqChip(g, eq[g])).join('')}</div>` : ''}
      <div class="jt-lvmeta"><span>${ico('compass')}${esc(wx || 'Weather not in yet')}</span>${latest ? `<span>${ico('clock')}${jtLiveHM(latest.updated_at)} · ${esc(latest.updated_by || '')}</span>` : ''}</div>
      ${lastOp ? `<div class="jt-lvnow"><span>${esc(lastOp.from)}</span>${esc(lastOp.desc)}</div>` : ''}</a>`;
  },
  line(x, showJob) {
    const k = jtLiveKey(x.r.id, x.o); const isNew = this.fresh.has(k);
    return `<li class="${isNew ? 'new' : ''}${x.last ? ' cur' : ''}"><span class="jt-lvt">${esc(x.o.from)}</span>
      <div class="jt-lvx"><div class="jt-lvd">${esc(x.o.desc)}</div>
        <div class="sub">${showJob ? `<a href="#/jt/job/${x.j.id}">${esc(x.j.job_no)}</a> · ` : ''}<a href="#/jt/report/${x.r.id}">${esc(x.r.well)}</a>${x.o.to ? ` · until ${esc(x.o.to)} (${jtHm(jtMins(x.o.from, x.o.to))} h)` : x.last ? ' · still going' : ''}${isNew ? ' ' + chip('ok', 'New') : ''}</div></div></li>`;
  },
  bind(main) {
    clearInterval(jtLiveTimer);
    const dd = $('#jt-lvdate', main); if (dd) dd.onchange = () => go(dd.value && dd.value !== this.d.today ? `#/jt/live?date=${dd.value}` : '#/jt/live');
    const sj = $('#jt-lvjob', main); if (sj) sj.onchange = () => { S.jt.liveJob = +sj.value || null; render({ quiet: true }); };
    const again = () => { if (!location.hash.startsWith('#/jt/live') || document.hidden || $('dialog[open]')) return; render({ quiet: true }); };
    $('#jt-lvgo', main).onclick = () => render({ quiet: true });
    // only today's page changes by itself
    if (this.d.date === this.d.today) jtLiveTimer = setInterval(again, 60000);
  }
};
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/jt/live')) clearInterval(jtLiveTimer); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && location.hash.startsWith('#/jt/live') && S.session) render({ quiet: true }); });
