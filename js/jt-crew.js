// ================================================================ 3.0.14 JOBTRACK CREW CHANGES
// A crew change says who goes off and who comes on, from a date. The job keeps its crew history (on and off dates per person).
// People going off can still finish and send their own reports for days up to their last day, for 3 days.
const jtSince = (c, j) => c.on_date ? `since ${fd(c.on_date)}` : j.started ? `since ${fd(j.started)}` : 'from the start';
const jtCrewName = c => `${esc(c.name)}`;
const jtCrewSub = c => esc([c.role, c.company && c.company !== 'GANKCO' ? c.company : ''].filter(Boolean).join(' · ')) + (c.profile_id ? '' : `${c.role || (c.company && c.company !== 'GANKCO') ? ' · ' : ''}not in Nest`);

// the job page's crew panel: on board now, earlier crew, and the changes
function jtCrewPanel(j, manage) {
  const hist = j.crew_hist || [], changes = j.crew_changes || [];
  return `<section class="panel jt-crewp"><header><h2>Crew</h2><span class="meta">${plural(j.crew.length, 'person', 'people')} on board</span>${manage ? `<span class="right">
      <button class="btn small" id="jt-copy">${ico('copy')}Copy from another job</button><button class="btn small" id="jt-crew">${ico('edit')}Edit crew</button>
      ${j.crew.length ? `<button class="btn small tagbtn" id="jt-crewchg">${ico('move')}Crew change</button>` : ''}</span>` : ''}</header>
    ${j.crew.length ? `<div class="jt-sec">On board now</div><ul class="list">${j.crew.map(c => `<li><div style="flex:1"><div class="name">${jtCrewName(c)}${c.profile_id && c.profile_id === j.lead_id ? ' ' + chip('out', 'Lead') : ''}${c.is_hse ? ' ' + chip('ok', 'HSE') : ''}</div>
        <div class="sub">${jtCrewSub(c)}</div></div><div class="end sub">${esc(jtSince(c, j))}</div></li>`).join('')}</ul>` : '<div class="empty">No crew yet.</div>'}
    ${hist.length ? `<div class="jt-sec">Earlier crew</div><ul class="list jt-crewold">${hist.map(c => `<li><div style="flex:1"><div class="name">${jtCrewName(c)}${c.was_lead ? ' <span class="sub">· lead</span>' : ''}${c.is_hse ? ' <span class="sub">· HSE</span>' : ''}</div>
        <div class="sub">${jtCrewSub(c)}</div></div><div class="end sub">${c.on_date ? fd(c.on_date) : j.started ? fd(j.started) : 'Start'} – ${fd(c.off_date)}</div></li>`).join('')}</ul>` : ''}
    ${changes.length ? `<div class="body jt-chglog">${changes.slice(0, 6).map(x => `<div>${ico('clock')}<span><b>${fd(x.change_date)}</b> · crew change by ${esc(x.by_name || '')}${x.note ? ' · ' + esc(x.note) : ''}
        <span class="sub">${[x.off_names ? 'off: ' + esc(x.off_names) : '', x.on_names ? 'on: ' + esc(x.on_names) : '', x.new_lead ? 'new lead: ' + esc(x.new_lead) : '', x.new_hse ? 'HSE: ' + esc(x.new_hse) : ''].filter(Boolean).join(' · ')}</span></span></div>`).join('')}
        ${changes.length > 6 ? `<div class="sub">…and ${plural(changes.length - 6, 'earlier change')}</div>` : ''}</div>` : ''}
    <div class="body muted small">Everyone can look at this job; the people on its crew work on it. Use <b>Crew change</b> when people go off or come on, so their dates are kept. <b>Edit crew</b> is for corrections.
      ${j.crew.some(c => c.is_hse) ? `The HSE person fills the HSE Daily Report, which fills the HSE part of each daily report.${j.hse_id ? '' : ' They’re not on Nest, so the lead fills it.'}` : 'Tick the HSE person on board (Edit crew): they fill the HSE Daily Report.'}</div></section>`;
}

// the crew change box
function jtCrewChangeForm(j) {
  const people = (S.jt.cfg.people || []).filter(p => p.role);
  const lead = j.crew.find(c => c.profile_id && c.profile_id === j.lead_id), hse = j.crew.find(c => c.is_hse);
  const inRow = () => `<div class="jt-crewrow jt-inrow"><select name="pid">${opt('', 'Typed in (not in Nest)', '')}${people.filter(p => !j.crew.some(c => c.profile_id === p.id)).map(p => opt(p.id, p.name, '')).join('')}</select>
    <input name="name" placeholder="Name"><input name="role" placeholder="Role (e.g. TTSC Engineer)"><input name="company" placeholder="Company" value="GANKCO">
    <button type="button" class="btn small" data-rmin title="Remove">${ico('trash')}</button></div>`;
  return modal({ title: 'Crew change · ' + j.job_no, wide: true, submit: 'Save crew change',
    sub: 'Who goes off and who comes on, from a date. The people going off can still finish and send their own reports for days up to their last day, for 3 days. Everyone is told.',
    body: `<div class="row2"><label class="f">Date of the change<input type="date" name="date" value="${localISO(0)}" max="${localISO(1)}" required><span class="hint">Their last day on board is the day before. It can be an earlier day if you’re entering it late.</span></label>
        <label class="f">Note (optional)<input name="note" placeholder="e.g. 28-day rotation"></label></div>
      <div class="pjf-sec">Going off</div>
      <div class="jt-offs">${j.crew.map(c => `<label class="check jt-offrow"><input type="checkbox" name="off_${c.id}"> <b>${esc(c.name)}</b> <span class="sub">${jtCrewSub(c)}</span>
        ${c === lead ? chip('out', 'Lead') : ''}${c.is_hse ? chip('ok', 'HSE') : ''}</label>`).join('')}</div>
      <div class="pjf-sec">Coming on</div>
      <div id="jt-ins">${inRow()}</div><button type="button" class="btn small" id="jt-addin">${ico('plus')}Add someone</button>
      <div class="pjf-sec">Handover</div>
      <div class="row2"><label class="f">Lead engineer after the change<select name="lead"></select><span class="hint" id="jt-leadhint"></span></label>
        <label class="f">HSE person after the change<select name="hse"></select><span class="hint" id="jt-hsehint"></span></label></div>`,
    onOpen: d => {
      const offs = () => j.crew.filter(c => $(`[name=off_${c.id}]`, d).checked);
      const ins = () => $$('.jt-inrow', d).map((r, i) => ({ r, pid: $('[name=pid]', r).value, name: $('[name=name]', r).value.trim() || (people.find(p => p.id === $('[name=pid]', r).value)?.name || ''), role: $('[name=role]', r).value.trim(), company: $('[name=company]', r).value.trim() }))
        .filter(x => x.pid || x.name);
      const draw = () => {
        const off = offs(), on = ins(); const stay = j.crew.filter(c => !off.includes(c));
        const ls = $('[name=lead]', d), hs = $('[name=hse]', d); const lv = ls.value, hv = hs.value;
        const leadOff = lead && off.includes(lead), hseOff = hse && off.includes(hse);
        ls.innerHTML = `${leadOff ? '<option value="">Choose the new lead…</option>' : opt('', lead ? `${lead.name} (stays)` : 'No change', '')}`
          + stay.filter(c => c.profile_id && c !== lead).map(c => opt(c.profile_id, `${c.name} (stays on)`, lv)).join('')
          + on.filter(x => x.pid).map(x => opt(x.pid, `${x.name} (coming on)`, lv)).join('');
        hs.innerHTML = `${hseOff ? '<option value="">Choose who takes over…</option>' : opt('', hse ? `${hse.name} (stays)` : 'No HSE person (the lead fills it)', '')}`
          + stay.filter(c => c !== hse).map(c => opt('c:' + c.id, `${c.name} (stays on)`, hv)).join('')
          + on.map((x, i) => opt('n:' + i, `${x.name} (coming on)`, hv)).join('') + (hseOff ? opt('none', 'No HSE person (the lead fills it)', hv) : '');
        $('#jt-leadhint', d).textContent = leadOff ? 'The lead is going off: choose who leads from the date of the change. They must be on Nest.' : 'Leave it unless the lead changes.';
        $('#jt-hsehint', d).textContent = hseOff ? 'The HSE person is going off: choose who fills the HSE Daily Report.' : 'Leave it unless the HSE person changes.';
        $$('.jt-offrow', d).forEach(l => l.classList.toggle('on', $('input', l).checked));
      };
      const wire = () => { $$('[data-rmin]', d).forEach(b => b.onclick = () => { b.closest('.jt-inrow').remove(); draw(); });
        $$('.jt-inrow select, .jt-inrow input', d).forEach(i => { i.oninput = draw; i.onchange = draw; }); };
      $('#jt-addin', d).onclick = () => { $('#jt-ins', d).insertAdjacentHTML('beforeend', inRow()); wire(); draw(); };
      $$('.jt-offrow input', d).forEach(c => c.onchange = draw);
      wire(); draw();
      d._get = { offs, ins };
    },
    onSubmit: async (x, d) => {
      const off = d._get.offs(), on = d._get.ins();
      if (!off.length && !on.length) throw new Error('Tick who is going off, or add who is coming on.');
      if (on.some(r => !r.role)) throw new Error('Give each person coming on their role.');
      if (lead && off.includes(lead) && !x.lead) throw new Error('The lead engineer is going off: choose the new lead.');
      if (hse && off.includes(hse) && !x.hse) throw new Error('The HSE person is going off: choose who takes over.');
      const p = { date: x.date, note: x.note, off: off.map(c => c.id), on: on.map(r => ({ profile_id: r.pid || null, name: r.pid ? null : r.name, role: r.role, company: r.company })),
        lead_id: x.lead || null, hse: x.hse || null };
      await q(sb.rpc('jt_crew_change', { p_job: j.id, p }));
      await jtLoad(true);
      toast(`Crew change saved${off.length ? ` · ${plural(off.length, 'person', 'people')} off` : ''}${on.length ? ` · ${plural(on.length, 'person', 'people')} on` : ''}`);
      render({ quiet: true });
    } });
}

// a daily report: who was on board that day (shown in Nest, not printed)
const jtCrewOnHtml = r => (r.crew_on || []).length ? `<div class="jt-crewon">${ico('users')}<span><b>Crew on board</b> · ${r.crew_on.map(c => esc(c.name) + (c.lead ? ' (lead)' : c.hse ? ' (HSE)' : '')).join(', ')}</span></div>` : '';

// a ticket: the crew on board in its dates, by role, to check personnel and feeding against (nothing changes by itself)
function jtTicketCrewHtml(j, t) {
  if (!t.date_from || !t.date_to) return '';
  const a = t.date_from, b = t.date_to, start = j.started || a;
  const span = (on, off) => { const s = on && on > a ? on : a, e = off && off < b ? off : b; return s > e ? null : [s, e, Math.round((new Date(e) - new Date(s)) / 864e5) + 1]; };
  const rows = [...j.crew.map(c => ({ ...c, on: c.on_date || start, off: null })), ...(j.crew_hist || []).map(c => ({ ...c, on: c.on_date || start, off: c.off_date }))]
    .map(c => ({ c, s: span(c.on, c.off) })).filter(x => x.s);
  if (!rows.length) return '';
  const by = {}; rows.forEach(x => (by[x.c.role || 'No role'] ||= []).push(x));
  const sd = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const total = rows.reduce((s, x) => s + x.s[2], 0);
  return `<section class="panel jt-tkcrew"><header><h2>Crew on board, ${sd(a)} – ${sd(b)}</h2><span class="meta">To check personnel and feeding against · nothing changes by itself</span></header>
    <ul class="list">${Object.entries(by).map(([role, xs]) => `<li><div style="flex:1"><div class="name">${esc(role)}</div><div class="sub">${xs.map(x => `${esc(x.c.name)} ${sd(x.s[0])}–${sd(x.s[1])}`).join(' · ')}</div></div>
      <div class="end">${plural(xs.reduce((s, x) => s + x.s[2], 0), 'day')}</div></li>`).join('')}</ul>
    <div class="body muted small">Person-days on board: <b>${fq(total)}</b>. From the job’s crew and its crew changes; the HSE report’s POB is the day-by-day count.</div></section>`;
}
