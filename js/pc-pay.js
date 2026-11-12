/* GANKCO Nest 3.0.6 — PeopleCore Payroll.
   Settings (allowances, paygrades, tax, change types, payslips, company), pay records, the monthly run
   (changes gathered from Requisition, Leave, Promotions and loans; calculation with workings; close; payslips by email),
   downloads (bank, PAYE, pension, statutory, full report), past payroll and comparison with SeamlessHR. Self service: Pay. */
'use strict';

PC_MODS.pay = { name: 'Payroll', icon: 'pay', desc: 'Paygrades, pay records, the monthly payroll, payslips and remittance schedules.',
  perms: ['view-payroll', 'run-payroll', 'manage-payroll-settings', 'manage-pay-records', 'upload-payroll-history'], pages: {}, menu: [] };
const PY = PC_MODS.pay;
PY.menu = [['', 'Overview', 'home'], ['run', 'Run payroll', 'pay', ['view-payroll', 'run-payroll']], ['records', 'Pay records', 'users', ['view-payroll', 'manage-pay-records', 'run-payroll']],
  ['reports', 'Reports & downloads', 'chart', ['view-payroll', 'download-payroll-schedules']], ['past', 'Past payroll', 'up', ['upload-payroll-history']], ['settings', 'Settings', 'gear', ['manage-payroll-settings']]];
if (typeof HR_SOON !== 'undefined') HR_SOON.pay = ['Pay', 'Your payslips for every month, to view and download.', 'Ready'];

const NG_STATES = ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'];
const PY_ST = { open: ['pending', 'Open'], calculated: ['out', 'Calculated'], closed: ['ok', 'Closed'] };
const PY_KIND = { regular: 'Monthly', offcycle: 'Extra run', past: 'Past record' };
const PY_TAX = { paye: 'PAYE', wht: 'Withholding tax', none: 'No tax' };
const PY_FREQ = { monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Yearly' };
const PY_SRC = { overtime: 'Overtime (Requisition)', expense: 'Expense claim (Requisition)', leave_allowance: 'Leave allowance (Leave)', recurring: 'Recurring', arrears: 'Pay arrears',
  promotion_arrears: 'Promotion arrears', manual: 'Added by HR', upload: 'Uploaded' };
const pyCfg = () => S.pc.payCfg || { ...(hrSettings().pay || {}) };
const pyCfgLoad = async () => { if (!S.pc.payCfg) S.pc.payCfg = await q(sb.rpc('hr_pay_cfg')).catch(() => null); return pyCfg(); };
const pyCfgSet = c => { S.pc.payCfg = c; S.settings.people = { ...(S.settings.people || {}), pay: c }; };
const pyN = n => n == null ? '—' : Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pyM = n => n == null ? '—' : '₦' + pyN(n);
const pyMonth = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const pyNext = () => { const d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0, 10); };
// amounts behind the eye: S.pc.payEye on → shown
const pyEyeOn = () => !!S.pc.payEye;
const pyHid = n => pyEyeOn() ? pyM(n) : '<span class="py-hid">₦ ••••••</span>';
const pyEyeBtn = () => `<button class="btn" type="button" id="pyeye">${ico('eye')}${pyEyeOn() ? 'Hide amounts' : 'Show amounts'}</button>`;
const pyEyeBind = main => { const b = $('#pyeye', main); if (b) b.onclick = () => { S.pc.payEye = !S.pc.payEye; render({ quiet: true }); }; };
let PY_LOOK = null;
async function pyLook(force) {
  if (PY_LOOK && !force) return PY_LOOK;
  await pyCfgLoad();
  const [items, grades, gitems, types] = await Promise.all([q(sb.from('hr_pay_items').select('*').order('sort')), q(sb.from('hr_pay_grades').select('*')), q(sb.from('hr_pay_grade_items').select('*')),
    q(sb.from('hr_pay_change_types').select('*').order('sort'))]);
  return PY_LOOK = { items, grades, gitems, types };
}
const pyInvalidate = () => { PY_LOOK = null; };
const pyGrade = id => pcLists('grade').find(g => g.id === +id);
const pyGroup = id => pcLists('pay_group').find(g => g.id === +id);

// ================================================================ Overview
PY.pages[''] = { perms: PY.perms,
  async load() {
    const [o] = await Promise.all([q(sb.rpc('hr_pay_overview')), pyCfgLoad()]); this.o = o;
    const l = o.last;
    const months = (o.months || []).map(m => ({ name: new Date(m.period + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), n: Math.round(+m.net) }));
    return topbar('Payroll', 'Pay for everyone at GANKCO, month by month.', pyEyeBtn() + (pcCan('run-payroll') ? (o.open ? `<a class="btn primary" href="#/people/admin/pay/run/${o.open.id}">${ico('pay')}Continue ${esc(o.open.title)}</a>`
        : `<button class="btn primary" id="pynew">${ico('plus')}Run payroll for ${esc(pyMonth(pyNext()))}</button>`) : '')) +
      pcKpis([[l ? pyHid(l.net) : '—', l ? `Net pay · ${l.title}` : 'No payroll closed yet'], [l ? pyHid(l.tax) : '—', 'PAYE and WHT'], [pyHid(o.ytd?.net), 'Net pay this year'], [o.people, 'On payroll this month'],
        [o.missing, 'Pay records missing details', o.missing ? 'warn' : '', '#/people/admin/pay/records?f=missing'], [o.rent_pending, 'Rent relief to check', o.rent_pending ? 'warn' : '', '#/people/admin/pay/records?f=rent'],
        [o.to_payroll, 'Waiting to go with payroll', '', '']]) +
      `<div class="pc-grid2"><section class="panel"><header><h2>Net pay by month</h2><span class="meta">Closed payrolls, last 12 months</span></header>${months.length ? (pyEyeOn() ? pcBars(months) : '<div class="body muted">Tap Show amounts to see the figures.</div>') : '<div class="pc-empty">Nothing yet. Upload past payroll, or run the first one.</div>'}</section>
       <section class="panel"><header><h2>Each month</h2></header><div class="body on-how one">
         <div><b>1 · Open the month</b><span>Nest adds overtime and expenses moved to payroll, leave allowances, loans and arrears by itself.</span></div>
         <div><b>2 · Add other changes</b><span>Bonuses, deductions and one-offs, one by one or from a file.</span></div>
         <div><b>3 · Calculate</b><span>Everyone’s pay, pension and tax, with the workings. “Needs a look” lists missing bank or pension details.</span></div>
         <div><b>4 · Close</b><span>Payslips are emailed and appear under Pay. Download the bank, PAYE and pension schedules.</span></div></div></section></div>`;
  },
  bind(main) { pyEyeBind(main); const b = $('#pynew', main); if (b) b.onclick = () => pyNewRun('regular'); }
};
async function pyNewRun(kind) {
  const nx = pyNext();
  return pcEdit({ title: kind === 'offcycle' ? 'Extra run' : 'Run payroll', wide: false, submit: kind === 'offcycle' ? 'Start extra run' : 'Open the month',
    sub: kind === 'offcycle' ? 'For one-off pay (a bonus, a correction) in a month whose payroll is closed. Only the people you add changes for are in it.' : 'Nest adds the month’s changes it already knows about. You can add more before calculating.',
    fields: [{ k: 'period', l: 'Month', t: 'month', req: true }], vals: { period: nx.slice(0, 7) },
    save: async v => { const id = await q(sb.rpc('hr_pay_run_create', { p_period: v.period + '-01', p_kind: kind })); toast('Payroll opened'); go('#/people/admin/pay/run/' + id); } });
}

// ================================================================ Run payroll
PY.pages.run = { perms: ['view-payroll', 'run-payroll'],
  async load(rest) {
    if (rest[0]) { this.id = +rest[0]; return pyRunPage(this.id); }
    this.id = null;
    const rows = this.rows = await q(sb.rpc('hr_pay_runs_list'));
    const open = rows.find(r => r.status !== 'closed' && r.kind === 'regular');
    return topbar('Run payroll', 'Every payroll, newest first. Past records are months uploaded from SeamlessHR.', pyEyeBtn() + (pcCan('run-payroll') ? `<button class="btn" id="pyextra">${ico('plus')}Extra run</button>` +
        (open ? `<a class="btn primary" href="#/people/admin/pay/run/${open.id}">Continue ${esc(open.title)}</a>` : `<button class="btn primary" id="pynew">${ico('pay')}Run payroll</button>`) : '')) +
      pcTable('pyruns', [{ l: 'Payroll', v: r => r.period, f: r => `<b>${esc(r.title)}</b>${r.kind !== 'regular' ? ' ' + pcChip('muted', PY_KIND[r.kind]) : ''}` },
        { l: 'Status', v: r => r.status, f: r => pcChip(...PY_ST[r.status]) + (r.reopened_at && r.status !== 'closed' ? ' ' + pcChip('pending', 'Reopened') : ''), csv: r => PY_ST[r.status][1] },
        { l: 'People', cls: 'num', v: r => +r.people }, { l: 'Gross', cls: 'num', v: r => +r.gross, f: r => pyHid(r.gross), csv: r => r.gross }, { l: 'Tax', cls: 'num', v: r => +r.tax, f: r => pyHid(r.tax), csv: r => r.tax },
        { l: 'Net', cls: 'num', v: r => +r.net, f: r => pyHid(r.net), csv: r => r.net },
        { l: 'Closed', v: r => r.closed_at || '', f: r => r.closed_at ? `${fd(r.closed_at)}<br><small class="muted">${esc(r.closed_by || '')}</small>` : (r.warnings ? pcChip('pending', `${r.warnings} need a look`) : '—') }], rows,
        { noun: 'payroll', csv: 'Payrolls', href: r => '#/people/admin/pay/run/' + r.id, empty: 'No payroll yet. Run the first one, or upload past months under Past payroll.' });
  },
  bind(main) { pyEyeBind(main); if (this.id) return pyRunBind(main, this.id);
    const b = $('#pynew', main); if (b) b.onclick = () => pyNewRun('regular'); const x = $('#pyextra', main); if (x) x.onclick = () => pyNewRun('offcycle'); }
};

async function pyRunPage(id) {
  const [d] = await Promise.all([q(sb.rpc('hr_pay_run_get', { p_run: id })), pyCfgLoad()]); S.pc.pyRun = d; const r = d.run; const can = pcCan('run-payroll') && r.kind !== 'past';
  const L = d.lines; const sum = k => L.reduce((a, x) => a + (+x[k] || 0), 0);
  const warn = L.filter(l => (l.warnings || []).length); const closed = r.status === 'closed';
  const stale = r.status === 'open' && L.length;
  const acts = [
    can && !closed ? `<button class="btn" data-py="gather" title="Look again for overtime, leave allowance, loans and arrears">${ico('undo')}Refresh changes</button>` : '',
    can && !closed ? `<button class="btn primary" data-py="calc">${ico('check')}${L.length ? 'Recalculate' : 'Calculate'}</button>` : '',
    can && r.status === 'calculated' ? `<button class="btn primary" data-py="close">${ico('lock')}Close and send payslips</button>` : '',
    closed && can && pcCan('reopen-payroll') ? `<button class="btn" data-py="reopen">${ico('undo')}Reopen</button>` : '',
    closed && can ? `<button class="btn" data-py="send">${ico('chat')}${r.emailed_at ? 'Send payslips again' : 'Send payslips'}</button>` : '',
    L.length ? `<button class="btn" data-py="compare">${ico('audit')}Compare with SeamlessHR</button>` : '',
    (can && !closed) || (r.kind === 'past' && pcCan('upload-payroll-history')) ? `<button class="btn danger-ghost" data-py="delete">${ico('trash')}Delete</button>` : ''].join('');
  const steps = [['Open the month', true], ['Changes', d.changes.length > 0 || r.status !== 'open'], ['Calculate', r.status !== 'open'], ['Close', closed], ['Payslips sent', !!r.emailed_at]];
  const head = topbar(r.title, `${PY_KIND[r.kind]} payroll · opened by ${esc(r.created_by_name || '')} ${fd(r.created_at)}${r.closed_at ? ` · closed by ${esc(r.closed_by_name || '')} ${fd(r.closed_at)}` : ''}`, pyEyeBtn() + `<a class="btn" href="#/people/admin/pay/run">Back</a>`) +
    `<section class="panel py-head"><div class="body"><div class="hr-chips">${pcChip(...PY_ST[r.status])}${r.reopened_at ? pcChip('pending', 'Reopened: ' + (r.note || '')) : ''}${stale ? pcChip('pending', 'Changed since the last calculation') : ''}</div>
      <ol class="pa-steps">${steps.map(([l, done], i) => `<li class="${done ? 'done' : steps.findIndex(s => !s[1]) === i ? 'on' : ''}"><span>${done ? '✓' : i + 1}</span>${l}</li>`).join('')}</ol>
      <div class="pf-acts">${acts}</div></div></section>`;
  const kp = pcKpis([[L.length, 'People'], [pyHid(sum('gross')), 'Gross pay'], [pyHid(sum('pension_ee') + sum('pension_er')), 'Pension (staff + company)'], [pyHid(sum('tax')), 'PAYE and WHT'],
    [pyHid(sum('net')), 'Net pay'], [pyHid(sum('gross') + sum('pension_er') + sum('nhis_er') + sum('nsitf') + sum('itf')), 'Cost to the company'], [warn.length, 'Need a look', warn.length ? 'warn' : '']]);
  // changes this month
  const ch = d.changes;
  const changes = r.kind === 'past' ? '' : `<section class="panel"><header><h2>Changes this month</h2><span class="meta">${plural(ch.length, 'change')}</span>
      ${can && !closed ? `<span class="right"><button class="btn small" data-py="upchg">${ico('up')}Upload</button><button class="btn small primary" data-py="addchg">${ico('plus')}Add a change</button></span>` : ''}</header>
      ${d.joiners.length || d.leavers.length ? `<div class="body py-jl">${d.joiners.length ? `<span>${ico('user')}Joining this month (paid for the days worked): <b>${d.joiners.map(j => esc(j.name) + ' · ' + fd(j.start_date)).join(', ')}</b></span>` : ''}
        ${d.leavers.length ? `<span>${ico('out')}Leaving this month: <b>${d.leavers.map(j => esc(j.name) + ' · ' + fd(j.exit_date)).join(', ')}</b></span>` : ''}</div>` : ''}
      ${ch.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Employee</th><th>Change</th><th>From</th><th class="num">Amount</th><th></th></tr></thead><tbody>${ch.map(c => `<tr><td>${esc(c.name)}</td>
        <td>${esc(c.label)} ${pcChip(c.kind === 'pay' ? 'ok' : 'rejected', c.kind === 'pay' ? (c.taxable ? 'Pay' : 'Pay, not taxed') : 'Deduction')}${c.note ? `<br><small class="muted">${esc(c.note)}</small>` : ''}</td>
        <td><small>${esc(PY_SRC[c.source] || c.source)}${c.added_by_name && ['manual', 'upload'].includes(c.source) ? ' · ' + esc(c.added_by_name) : ''}</small></td><td class="num">${pyHid(c.amount)}</td>
        <td class="num">${can && !closed && ['manual', 'upload'].includes(c.source) ? `<button class="btn small pf-ib" data-delchg="${c.id}" title="Remove">${ico('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="pc-empty">No changes. ${can && !closed ? 'Overtime and expenses moved to payroll, leave allowances, loans and arrears appear here by themselves.' : ''}</div>`}</section>`;
  const lines = L.length ? pcTable('pylines', [{ l: 'Employee', v: r => r.name, f: r => `<b>${esc(r.name)}</b><br><small class="muted">${esc(r.emp_no || '')}${r.days != null && +r.days < 1 ? ' · part month' : ''}${r.past ? ' · past record' : ''}</small>` },
      { l: 'Paygrade', v: r => pyGrade(r.grade_id)?.name || '', f: r => esc(pyGrade(r.grade_id)?.name || '—') },
      { l: 'Gross', cls: 'num', v: r => +r.gross, f: r => pyHid(r.gross), csv: r => r.gross }, { l: 'Pension', cls: 'num', v: r => +r.pension_ee, f: r => pyHid(r.pension_ee), csv: r => r.pension_ee },
      { l: 'Tax', cls: 'num', v: r => +r.tax, f: r => pyHid(r.tax) + (r.tax_type === 'wht' ? '<br><small class="muted">WHT</small>' : ''), csv: r => r.tax },
      { l: 'Deductions', cls: 'num', v: r => +r.other_ded + +r.nhf + +r.nhis_ee, f: r => pyHid(+r.other_ded + +r.nhf + +r.nhis_ee), csv: r => +r.other_ded + +r.nhf + +r.nhis_ee },
      { l: 'Net', cls: 'num', v: r => +r.net, f: r => `<b>${pyHid(r.net)}</b>`, csv: r => r.net },
      { l: 'vs last month', cls: 'num', v: r => r.prev_net == null ? -999 : (+r.net - +r.prev_net), f: r => r.prev_net == null ? '<small class="muted">new</small>' : pyEyeOn() ? pyDelta(+r.net, +r.prev_net) : '<span class="py-hid">••</span>', csv: r => r.prev_net == null ? '' : +r.net - +r.prev_net },
      { l: 'Needs a look', v: r => (r.warnings || []).join(', '), f: r => (r.warnings || []).map(w => pcChip('pending', w)).join(' ') || '' }], L,
      { noun: 'person', csv: r.title, onRow: x => pyWorkings(x, r), filters: [{ k: 'w', l: 'Show', opts: [['warn', 'Needs a look'], ['part', 'Part month'], ['big', 'Changed by 10%+']],
        test: (x, v) => v === 'warn' ? (x.warnings || []).length > 0 : v === 'part' ? +x.days < 1 : x.prev_net != null && Math.abs(+x.net - +x.prev_net) > Math.abs(+x.prev_net) * .1 }] })
    : `<section class="panel"><div class="pc-empty-hero"><b>${r.kind === 'past' ? 'Nothing uploaded for this month' : 'Not calculated yet'}</b>${can && !closed ? 'Check the changes, then press Calculate.' : ''}</div></section>`;
  const dl = closed && pcCan('download-payroll-schedules', 'view-payroll') ? `<section class="panel"><header><h2>Downloads</h2><span class="meta">${esc(r.title)}</span></header><div class="body py-dl">${pyDownloadsHtml()}</div></section>` : '';
  return head + kp + changes + dl + lines;
}
const pyDelta = (a, b) => { const d = a - b; if (Math.abs(d) < 1) return '<small class="muted">same</small>'; const p = b ? Math.round(d / Math.abs(b) * 100) : 0;
  return `<span class="${Math.abs(p) >= 10 ? (d > 0 ? 'pos' : 'neg') : ''}">${d > 0 ? '+' : '−'}${pyN(Math.abs(d))}</span>${p ? `<br><small class="muted">${d > 0 ? '+' : ''}${p}%</small>` : ''}`; };
const pyDownloadsHtml = () => [['bank', 'Bank schedule', 'Net pay to each account'], ['paye', 'PAYE schedule', 'Tax by state, with TINs'], ['pension', 'Pension schedule', 'By PFA, with RSA PINs'],
  ['stat', 'Statutory summary', 'Pension, NHF, NHIS, NSITF, ITF'], ['full', 'Full payroll report', 'Every allowance and deduction'], ['payslips', 'All payslips (PDF)', 'One file, one page each']]
  .map(([k, l, s]) => `<button class="btn py-dlb" type="button" data-dl="${k}">${ico('down')}<span><b>${l}</b><small>${s}</small></span></button>`).join('');

function pyRunBind(main, id) {
  const d = () => S.pc.pyRun; const r = () => d().run;
  main.addEventListener('click', async e => {
    const b = e.target.closest('[data-py]'); const dc = e.target.closest('[data-delchg]'); const dl = e.target.closest('[data-dl]');
    if (dc) { await pcTry(() => q(sb.rpc('hr_pay_change_delete', { p_id: +dc.dataset.delchg })), 'Removed'); return render({ quiet: true }); }
    if (dl) return pcTry(() => pyDownload(dl.dataset.dl, d()));
    if (!b) return; const a = b.dataset.py;
    if (a === 'gather') { const x = await pcTry(() => q(sb.rpc('hr_pay_run_gather', { p_run: id }))); toast(`${plural(x.changes, 'change')} found`); return render({ quiet: true }); }
    if (a === 'calc') { b.disabled = true; try { const x = await q(sb.rpc('hr_pay_run_calc', { p_run: id })); toast(`${plural(x.people, 'person', 'people')} calculated${x.warnings ? ` · ${x.warnings} need a look` : ''}`); } catch (ex) { toast(niceError(ex), true); } return render({ quiet: true }); }
    if (a === 'addchg') return pyChangeForm(id);
    if (a === 'upchg') return pyChangeUpload(id);
    if (a === 'close') return pyClose(id);
    if (a === 'send') return pySendPayslips(id);
    if (a === 'reopen') return pcEdit({ title: 'Reopen ' + r().title, wide: false, submit: 'Reopen', danger: true, sub: 'What closing marked as paid goes back (overtime, leave allowance, loans). When it’s closed again, staff get a revised payslip.',
      fields: [{ k: 'reason', l: 'Why', t: 'textarea', req: true }], save: async v => { await q(sb.rpc('hr_pay_run_reopen', { p_run: id, p_reason: v.reason })); toast('Reopened'); render({ quiet: true }); } });
    if (a === 'delete') { if (!await pcConfirm('Delete ' + esc(r().title) + '?', 'Its changes and calculation are removed. Overtime, leave allowance and loans in it stay waiting for the next payroll.', 'Delete')) return;
      await pcTry(() => q(sb.rpc('hr_pay_run_delete', { p_run: id })), 'Deleted'); return go('#/people/admin/pay/run'); }
    if (a === 'compare') return pyCompare(id);
  });
}

async function pyChangeForm(runId) {
  const L = await pyLook(); const types = L.types.filter(t => t.active);
  return pcEdit({ title: 'Add a change', wide: false, sub: 'For this payroll only. For something every month (a loan), use the person’s pay record.',
    fields: [{ k: 'employee_id', l: 'Employee', t: 'select', req: true, opts: pcPeopleList() },
      { k: 'type_id', l: 'Change', t: 'select', req: true, opts: types.map(t => [t.id, `${t.name} · ${t.kind === 'pay' ? 'pay' : 'deduction'}${t.basis === 'percent' && t.value ? ` (${t.value}% of gross)` : ''}`]) },
      { k: 'amount', l: 'Amount', t: 'money', hint: 'Leave empty for a change worked out as a percentage of gross.' }, { k: 'note', l: 'Note (shows on the payslip line)' }],
    save: async v => { await q(sb.rpc('hr_pay_change_save', { p: { ...v, run_id: runId } })); toast('Change added. Calculate again to include it.'); render({ quiet: true }); } });
}
async function pyChangeUpload(runId) {
  const L = await pyLook(); const cols = [{ k: 'who', l: 'who', w: 24 }, { k: 'change', l: 'change', w: 24 }, { k: 'amount', l: 'amount', w: 14 }, { k: 'note', l: 'note', w: 40 }];
  const notes = [['who', 'Staff ID, work email or full name.'], ['change', 'A change type: ' + L.types.filter(t => t.active).map(t => t.name).join(', ') + '.'], ['amount', 'Optional for changes worked out as a percentage of gross.'], ['note', 'Optional.']];
  return pcUploadDlg({ title: 'Upload changes', sub: 'Bonuses, deductions and one-offs for this payroll.', notes,
    template: () => pcXlsx('Payroll changes template.xlsx', cols, [{ who: 'GES0042026', change: 'Bonus', amount: 50000, note: 'Q4 bonus' }], { sheet: 'Changes', notes }),
    run: rows => q(sb.rpc('hr_pay_changes_upload', { p_run: runId, p_rows: rows })), done: r => `${plural(r.added, 'change')} added. Calculate again to include them.` });
}

// one person's workings
function pyWorkings(l, r) {
  const items = l.items || []; const show = v => pyM(v);
  const row = (a, b, cls = '') => `<tr class="${cls}"><td>${a}</td><td class="num">${b}</td></tr>`;
  const w = (l.workings || []).map(x => `<li><b>${esc(x.h)}</b><span>${esc(x.l || '')}</span>${x.v != null ? `<em>${pyM(x.v)}</em>` : ''}${x.bands ? `<ul>${x.bands.map(b => `<li><span>${esc(b.l)}</span><em>${pyM(b.v)}</em></li>`).join('')}</ul>` : ''}</li>`).join('');
  return modal({ title: `${l.name} · ${r.title}`, submit: null, cancel: 'Close', wide: true,
    sub: `${esc(pyGrade(l.grade_id)?.name || 'No paygrade')} · ${PY_TAX[l.tax_type] || ''}${l.tax_state ? ' · ' + esc(l.tax_state) : ''}`,
    body: `${(l.warnings || []).length ? `<div class="notice warn">${l.warnings.map(esc).join(' · ')}</div>` : ''}<div class="pc-grid2 py-wk">
      <div><div class="pc-sec">Payslip</div><table class="t py-ps"><tbody>
        ${items.filter(i => i.kind !== 'deduction').map(i => row(esc(i.name) + (i.note ? ` <small class="muted">${esc(i.note)}</small>` : '') + (i.how ? `<br><small class="muted">${esc(i.how)}</small>` : ''), show(i.amount))).join('')}
        ${row('<b>Gross pay</b>', `<b>${show(l.gross)}</b>`, 'tot')}
        ${row('Pension (8%)'.replace('8', pyCfg().pension_ee ?? 8), '−' + show(l.pension_ee))}${+l.nhf ? row('NHF', '−' + show(l.nhf)) : ''}${+l.nhis_ee ? row('NHIS', '−' + show(l.nhis_ee)) : ''}
        ${row(l.tax_type === 'wht' ? 'Withholding tax' : 'PAYE', '−' + show(l.tax))}
        ${items.filter(i => i.kind === 'deduction').map(i => row(esc(i.name), '−' + show(i.amount))).join('')}
        ${row('<b>Net pay</b>', `<b>${show(l.net)}</b>`, 'tot')}
        ${row('<small class="muted">Company pension</small>', `<small class="muted">${show(l.pension_er)}</small>`)}</tbody></table></div>
      <div><div class="pc-sec">How it was worked out</div><ol class="py-steps">${w}</ol></div></div>` });
}

// close, then email payslips
async function pyClose(id) {
  const d = S.pc.pyRun; const warn = d.lines.filter(l => (l.warnings || []).length).length; const cfg = pyCfg();
  if (!await modal({ title: 'Close ' + d.run.title + '?', submit: 'Close payroll', body: `<p>${plural(d.lines.length, 'person', 'people')} · net pay ${pyM(d.lines.reduce((a, l) => a + +l.net, 0))}.</p>
      ${warn ? `<div class="notice warn">${plural(warn, 'person', 'people')} still need a look. You can close anyway.</div>` : ''}
      <p class="muted">Closing locks it, marks overtime, expenses, leave allowance and loan instalments in it as paid, and makes payslips available under Pay.${cfg.email_payslips !== false ? ' Payslips are then emailed.' : ''}</p>`,
    onSubmit: async () => true })) return;
  try { await q(sb.rpc('hr_pay_run_close', { p_run: id })); toast('Payroll closed'); } catch (e) { return toast(niceError(e), true); }
  if (cfg.email_payslips !== false) await pySendPayslips(id);
  render({ quiet: true });
}
async function pySendPayslips(id) {
  const d = await q(sb.rpc('hr_pay_run_get', { p_run: id })); const L = d.lines;
  const dlg = document.createElement('dialog'); dlg.className = 'modal'; dlg.innerHTML = `<div class="mh"><h2>Sending payslips</h2><p>Each payslip is made here and emailed as a PDF. Keep this page open.</p></div>
    <div class="mb"><div class="py-prog"><i style="width:0%"></i></div><p id="pyps">0 of ${L.length}</p></div><div class="mf"><button class="btn" data-x disabled>Close</button></div>`;
  document.body.appendChild(dlg); dlg.showModal();
  let ok = 0, none = 0, bad = []; const tpl = pyCfg().payslips?.default || 'full';
  for (let i = 0; i < L.length; i++) {
    try { const b64 = await pyPayslipPdf(L[i], d.run, { output: 'base64', tpl, ytd: L[i].ytd });
      const res = await q(sb.rpc('hr_pay_payslip_send', { p_run: id, p_emp: L[i].employee_id, p_pdf: b64 })); if (res === 'sent') ok++; else none++;
    } catch (e) { bad.push(L[i].name + ': ' + niceError(e)); }
    $('.py-prog i', dlg).style.width = Math.round((i + 1) / L.length * 100) + '%'; $('#pyps', dlg).textContent = `${i + 1} of ${L.length}`;
  }
  $('#pyps', dlg).innerHTML = `${plural(ok, 'payslip')} emailed${none ? ` · ${none} with no email address` : ''}${bad.length ? `<br><span class="neg">${bad.map(esc).join('<br>')}</span>` : ''}`;
  const c = $('[data-x]', dlg); c.disabled = false; c.onclick = () => { dlg.close(); dlg.remove(); render({ quiet: true }); };
}

// ================================================================ the payslip PDF (built in the browser, for email and download)
// company details printed on payslips (HR can change them in Payroll → Settings → Company)
const PY_CO_DEF = { name: 'GANKCO Energy Services Limited', email: 'info@gankcoenergy.com', website: 'www.gankcoenergy.com', country: 'Nigeria',
  address: 'Corporate Headquarters: Suite FF03, Hatlab Place, Plot 1952, Sokode Crescent, Wuse Zone 5, Abuja. Operational Base: No. 17, Market Lane, Rumuomasi, Off Stadium Road, Port Harcourt, Rivers State, Nigeria.' };
const pyCo = () => { const c = pyCfg().company || {}; const o = { ...PY_CO_DEF }; for (const k of Object.keys(PY_CO_DEF)) if (c[k] != null && String(c[k]).trim() !== '') o[k] = String(c[k]).trim(); return o; };

// amount in words, as on a cheque: "One Hundred and Five Thousand Naira, Fifty Kobo Only"
function pyWords(v) {
  const n = Math.round(Math.abs(+v || 0) * 100); const naira = Math.floor(n / 100), kobo = n % 100;
  const A = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const T = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const two = x => x < 20 ? A[x] : T[Math.floor(x / 10)] + (x % 10 ? '-' + A[x % 10] : '');
  const three = x => { const h = Math.floor(x / 100), r = x % 100; return (h ? A[h] + ' hundred' + (r ? ' and ' : '') : '') + (r ? two(r) : ''); };
  const say = x => { if (!x) return 'zero'; const S = ['', ' thousand', ' million', ' billion', ' trillion']; const parts = []; let i = 0, low = x % 1000;
    while (x > 0) { const c = x % 1000; if (c) parts.unshift(three(c) + S[i]); x = Math.floor(x / 1000); i++; }
    if (parts.length > 1 && low > 0 && low < 100) { const last = parts.pop(); return parts.join(', ') + ' and ' + last; } return parts.join(', '); };
  const cap = s => s.replace(/\b([a-z])/g, c => c.toUpperCase()).replace(/\bAnd\b/g, 'and');
  return cap(`${say(naira)} naira${kobo ? ', ' + say(kobo) + ' kobo' : ''} only`);
}

async function pyPayslipPdf(l, run, o = {}) {
  const cfg = pyCfg(); const P = cfg.payslips || {};
  const T = o.T || P[o.tpl || P.default || 'full'] || {};
  const show = { items: true, extras: true, deductions: true, tax: true, employer: true, words: true, relief: true, ytd: false, ...(T.show || {}) };
  const ef = T.employee || ['department']; const cf = T.company || ['name', 'logo', 'email'];
  const doc = o.doc || await pdfInit('portrait'); if (o.doc) doc.addPage(); const startPage = doc.internal.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 13, CW = W - 2 * M, R = W - M;
  const C = { ink: '1C1D20', mut: '6B7076', line: 'E1E3E6', soft: 'F5F6F7', zebra: 'FAFAFB', or: 'E8552C', tint: 'FDF1EC', dark: '23272D' };
  const fill = h => doc.setFillColor(...rgb(h)), draw = h => doc.setDrawColor(...rgb(h)), color = h => doc.setTextColor(...rgb(h));
  const font = (f, st, sz) => { doc.setFont(f, st); doc.setFontSize(sz); };
  const tx = s => pdfText(s);
  // letter-spaced text (jsPDF doesn't count the spacing when it aligns, so measure it here)
  const spaced = (s, x, y, cs, align) => { s = tx(s); const w = doc.getTextWidth(s) + cs * Math.max(s.length - 1, 0); doc.text(s, align === 'right' ? x - w : x, y, { charSpace: cs }); return w; };
  const co = pyCo(); const money = v => pyN(+v || 0);
  const part = l.part || (l.workings || []).find(w => w.h === 'Part of the month')?.l || '';

  // ---------------------------------------------------------------- header
  let y = M; let lx = M;
  if (cf.includes('logo')) { const mk = await imageB64('brand/mark.png'); const mh = 18, mw = mh * mk.w / mk.h; doc.addImage(mk.dataUrl, 'PNG', M, y, mw, mh, 'gankco-mark', 'FAST'); lx = M + mw + 4.5; }
  font('Montserrat', 'bold', 13.5); color(C.ink); doc.text(tx(co.name), lx, y + 6.5);
  font('Barlow', 'normal', 8.1); color(C.mut); let cy = y + 11.4; const maxw = R - 66 - lx;
  if (cf.includes('address') && co.address) for (const ln of doc.splitTextToSize(tx(co.address), maxw).slice(0, 3)) { doc.text(ln, lx, cy); cy += 3.7; }
  const bits = [cf.includes('email') && co.email, cf.includes('website') && co.website, cf.includes('country') && co.country].filter(Boolean);
  if (bits.length) { doc.text(tx(bits.join('   ·   ')), lx, cy); cy += 3.7; }
  // right: what this is
  font('Barlow', 'bold', 7.8); color(C.or); spaced(run.kind === 'offcycle' ? 'OFF-CYCLE PAYSLIP' : 'PAYSLIP', R, y + 2.5, .55, 'right');
  let fs = 17; font('Montserrat', 'bold', fs); while (doc.getTextWidth(tx(run.title)) > 62 && fs > 11) { fs -= .5; doc.setFontSize(fs); }
  color(C.ink); doc.text(tx(run.title), R, y + 10.5, { align: 'right' });
  const p0 = run.period ? new Date(run.period + 'T12:00:00') : null; const p1 = p0 && new Date(p0.getFullYear(), p0.getMonth() + 1, 0, 12);
  font('Barlow', 'normal', 8.1); color(C.mut);
  if (p0) doc.text(tx(`Pay period 1 – ${p1.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`), R, y + 15.5, { align: 'right' });
  const draft = run.status && run.status !== 'closed';
  const issued = l.closed_at || run.closed_at;
  if (draft) { color(C.or); doc.text('Draft · this payroll is not closed yet', R, y + 19.4, { align: 'right' }); }
  else if (issued) doc.text(tx(`Issued ${new Date(issued).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`), R, y + 19.4, { align: 'right' });
  const chips = [l.revised && 'REVISED', l.past && 'PAST RECORD'].filter(Boolean); let chx = R;
  for (const c of chips) { font('Barlow', 'bold', 6.6); const w = doc.getTextWidth(c) + .25 * (c.length - 1) + 5; draw(C.or); doc.setLineWidth(.3); doc.roundedRect(chx - w, y + 21.6, w, 4.6, 1, 1, 'S');
    color(C.or); spaced(c, chx - 2.5, y + 24.9, .25, 'right'); chx -= w + 2; }
  const yH = Math.max(cy, y + 18, chips.length ? y + 27 : 0) + 3.5;
  draw(C.line); doc.setLineWidth(.3); doc.line(M, yH, R, yH); fill(C.or); doc.rect(M, yH - .45, 30, .9, 'F');
  y = yH + 6;

  // ---------------------------------------------------------------- building blocks
  const bar = (x, yy, w, title, right) => { fill(C.dark); doc.roundedRect(x, yy, w, 7.6, 1.3, 1.3, 'F'); doc.rect(x, yy + 4, w, 3.6, 'F'); fill(C.or); doc.rect(x, yy, 1.5, 7.6, 'F');
    font('Barlow', 'bold', 7.7); color('FFFFFF'); spaced(title.toUpperCase(), x + 5, yy + 5, .32);
    if (right) { font('Barlow', 'normal', 7.6); color('C3C8CE'); doc.text(tx(right), x + w - 4, yy + 5, { align: 'right' }); } return yy + 7.6; };
  const box = (x, y0, w, y1) => { draw(C.line); doc.setLineWidth(.25); doc.line(x, y0, x, y1); doc.line(x + w, y0, x + w, y1); doc.line(x, y1, x + w, y1); };
  const table = (x, yy, w, title, rows, total, n) => {
    let ty = bar(x, yy, w, title); const t0 = ty; const rowH = 6.6;
    fill(C.soft); doc.rect(x, ty, w, 6.4, 'F'); font('Barlow', 'bold', 6.8); color(C.mut);
    spaced('DESCRIPTION', x + 4, ty + 4.2, .22); spaced('AMOUNT (NGN)', x + w - 4, ty + 4.2, .22, 'right'); ty += 6.4;
    for (let i = 0; i < (n || rows.length); i++) { const r = rows[i];
      if (i % 2 === 1) { fill(C.zebra); doc.rect(x, ty, w, rowH, 'F'); }
      if (r) { font('Barlow', 'normal', 9); color(C.ink); const amt = money(r[1]); const aw = doc.getTextWidth(amt); const lim = w - 12 - aw;
        const lab = doc.splitTextToSize(tx(r[0]), lim)[0] || ''; doc.text(lab, x + 4, ty + 4.4);
        if (r[2]) { const lw = doc.getTextWidth(lab); font('Barlow', 'normal', 7.4); color(C.mut); const room = lim - lw - 2; const note = room > 10 ? doc.splitTextToSize(tx(r[2]), room)[0] : ''; if (note) doc.text(note, x + 4 + lw + 2, ty + 4.4); font('Barlow', 'normal', 9); color(C.ink); }
        doc.text(amt, x + w - 4, ty + 4.4, { align: 'right' }); }
      draw('ECEEF0'); doc.setLineWidth(.15); doc.line(x, ty + rowH, x + w, ty + rowH); ty += rowH; }
    if (total) { fill(C.tint); doc.rect(x, ty, w, 8, 'F'); fill(C.or); doc.rect(x, ty, w, .5, 'F');
      font('Barlow', 'bold', 9.4); color(C.ink); doc.text(tx(total[0]), x + 4, ty + 5.4); doc.text(money(total[1]), x + w - 4, ty + 5.4, { align: 'right' }); ty += 8; }
    box(x, t0, w, ty); return ty; };
  const room = need => { if (y + need > H - 22) { doc.addPage(); y = M; } };

  // ---------------------------------------------------------------- employee information
  const B = l.bank || {};
  const job = l.job_role || (S.pc?.look?.jobs || []).find(j => j.id === l.job_role_id)?.name;
  const dept = l.department || (typeof hrUnit === 'function' ? hrUnit(l.unit_id)?.name : '');
  const grade = typeof pyGrade === 'function' ? pyGrade(l.grade_id)?.name : '';
  const F = [['Name', l.name], ['Employee code', l.emp_no],
    ...(ef.includes('job_role') ? [['Job role', job]] : []), ...(ef.includes('department') ? [['Department', dept]] : []),
    ...(ef.includes('pay_grade') ? [['Paygrade', grade]] : []),
    ...(ef.includes('bank') ? [['Bank name', B.bank || l.bank_name], ['Account number', B.account_no || (l.account_no ? '····' + l.account_no : '')], ['Account name', B.account_name || l.name]] : []),
    ...(ef.includes('pfa') ? [['Pension (PFA)', B.pfa], ['RSA PIN', B.rsa_pin]] : []),
    ...(ef.includes('tax_number') ? [['Tax ID', B.tin]] : [])];
  y = bar(M, y, CW, 'Employee information'); const e0 = y; const c3 = CW / 3; y += 6.2;
  F.forEach(([k, v], i) => { const cx = M + 5 + (i % 3) * c3, ry = y + Math.floor(i / 3) * 11.2;
    font('Barlow', 'bold', 6.8); color(C.mut); spaced(k.toUpperCase(), cx, ry, .22);
    font('Barlow', 'bold', 9.6); color(C.ink); doc.text(doc.splitTextToSize(tx(v || '—'), c3 - 8)[0] || '—', cx, ry + 5); });
  y += Math.ceil(F.length / 3) * 11.2 - 2.4; box(M, e0, CW, y); y += 6;

  // ---------------------------------------------------------------- earnings | deductions
  const items = l.items || []; const sum = a => a.reduce((s, i) => s + (+i.amount || 0), 0);
  const pays = items.filter(i => i.kind === 'pay'), extras = items.filter(i => i.kind === 'extra'), dItems = items.filter(i => i.kind === 'deduction');
  const earn = show.items !== false ? pays.map(i => [i.name, i.amount, i.note]) : (pays.length ? [['Salary', sum(pays)]] : []);
  if (show.extras !== false) extras.forEach(i => earn.push([i.name, i.amount, i.note])); else if (extras.length) earn.push(['Other pay', sum(extras)]);
  const ded = [];
  const taxName = l.tax_type === 'wht' ? 'Withholding tax' : 'Tax (PAYE)';
  if (show.tax !== false) { if (+l.tax || l.tax_type !== 'none') ded.push([taxName, l.tax]); if (+l.pension_ee) ded.push(['Pension', l.pension_ee]); }
  else if (+l.tax + +l.pension_ee) ded.push(['Tax and pension', +l.tax + +l.pension_ee]);
  if (+l.nhf) ded.push(['National Housing Fund', l.nhf]); if (+l.nhis_ee) ded.push(['Health insurance (NHIS)', l.nhis_ee]);
  if (show.deductions !== false) dItems.forEach(i => ded.push([i.name, i.amount, i.note])); else if (dItems.length) ded.push(['Other deductions', sum(dItems)]);
  const dedTotal = (+l.pension_ee || 0) + (+l.nhf || 0) + (+l.nhis_ee || 0) + (+l.tax || 0) + (+l.other_ded || 0);
  const half = (CW - 6) / 2; const n = Math.max(earn.length, ded.length, 1);
  const yE = table(M, y, half, 'Earnings', earn, ['Gross earnings', l.gross], n);
  const yD = table(M + half + 6, y, half, 'Deductions', ded, ['Total deductions', dedTotal], n);
  y = Math.max(yE, yD) + 6;

  // ---------------------------------------------------------------- net pay
  const words = show.words !== false ? pyWords(l.net) : ''; font('Barlow', 'normal', 8.2); const wl = words ? doc.splitTextToSize(tx(words), CW - 82).slice(0, 2) : [];
  const bh = 13 + wl.length * 3.8; room(bh + 4);
  fill(C.dark); doc.roundedRect(M, y, CW, bh, 1.6, 1.6, 'F'); fill(C.or); doc.rect(M, y, 1.8, bh, 'F');
  font('Barlow', 'bold', 7.8); color('FFFFFF'); spaced('NET PAY', M + 6.5, y + 6.6, .5);
  font('Barlow', 'normal', 8.2); color('BFC4CA'); wl.forEach((t, i) => doc.text(t, M + 6.5, y + 11.2 + i * 3.8));
  font('Montserrat', 'bold', 18); color('FFFFFF'); const amt = money(l.net); const aw = doc.getTextWidth(amt); const ay = y + bh / 2 + 3.1;
  doc.text(amt, R - 6, ay, { align: 'right' }); font('Barlow', 'bold', 9); color('F4A486'); doc.text('NGN', R - 6 - aw - 2.2, ay, { align: 'right' });
  y += bh + 6;

  // ---------------------------------------------------------------- employer contributions | year to date
  const er = []; if (+l.pension_er) er.push(['Pension', l.pension_er]); if (+l.nhis_er) er.push(['Health insurance (NHIS)', l.nhis_er]);
  const Y = o.ytd; const ytd = show.ytd && Y ? [['Gross earnings', Y.gross], ['Tax', Y.tax], ...(Y.pension != null ? [['Pension', Y.pension]] : [])] : null;
  const blocks = [...(show.employer !== false && er.length ? [['Employer contributions', er, ['Total contributions', er.reduce((s, r) => s + +r[1], 0)]]] : []),
    ...(ytd ? [[`Year to date${p0 ? ' · ' + p0.getFullYear() : ''}`, ytd, ['Net pay to date', Y.net]]] : [])];
  if (blocks.length) { const nb = Math.max(...blocks.map(b => b[1].length)); room(24 + nb * 6.6);
    const bw = blocks.length > 1 ? half : CW; let yb = y;
    blocks.forEach((b, i) => { yb = Math.max(yb, table(M + i * (half + 6), y, bw, b[0], b[1], b[2], nb)); });
    y = yb + 6; }

  // ---------------------------------------------------------------- notes
  const notes = [];
  if (part) notes.push(`Paid for part of the month: ${part}.`);
  if (show.relief !== false && +l.relief) { const rent = +l.relief > (+l.pension_ee + +l.nhf + +l.nhis_ee) * 12 / Math.max(+l.days || 1, .01) + 1;
    notes.push(`Tax reliefs for the year: NGN ${money(l.relief)} (pension${+l.nhf ? ', NHF' : ''}${+l.nhis_ee ? ', NHIS' : ''}${rent ? ', rent relief' : ''}).`); }
  if (l.revised) notes.push('This payslip replaces the one sent earlier for the same month.');
  if (l.past) notes.push('Past record, brought in from SeamlessHR.');
  if (notes.length) { room(notes.length * 4.2 + 2); font('Barlow', 'normal', 7.9); color(C.mut); for (const t of notes) { fill(C.or); doc.circle(M + 1, y - 1, .55, 'F'); doc.text(tx(t), M + 3.5, y); y += 4.2; } }

  // ---------------------------------------------------------------- footer (every page)
  const pages = doc.internal.getNumberOfPages();
  for (let pg = startPage; pg <= pages; pg++) { doc.setPage(pg); const fy = H - 13;
    draw(C.line); doc.setLineWidth(.25); doc.line(M, fy, R, fy);
    font('Barlow', 'normal', 7.2); color(C.mut);
    doc.text('Private and confidential. This payslip is computer generated and needs no signature.', M, fy + 4.3);
    doc.text(tx(`© ${new Date().getFullYear()} ${co.name}`), M, fy + 7.8);
    doc.text(tx(`Generated by GANKCO Nest · ${pdfStamp(Date.now())}`), R, fy + 4.3, { align: 'right' }); }

  if (o.output === 'doc') return doc;
  if (o.output === 'base64') return doc.output('datauristring').split(',')[1];
  doc.save(`Payslip ${run.period ? run.period.slice(0, 7) : ''} ${l.emp_no || l.name}.pdf`.replace(/\s+/g, ' '));
}

// ================================================================ downloads
async function pyDownload(kind, d) {
  const r = d.run; const L = d.lines; const base = `${r.title}`; const cfg = pyCfg();
  const unit = id => hrUnit(id)?.name || '';
  if (kind === 'payslips') { let doc = null; for (const l of L) doc = await pyPayslipPdf(l, r, { output: 'doc', doc, ytd: l.ytd }); return doc && doc.save(`Payslips ${r.period.slice(0, 7)}.pdf`); }
  if (kind === 'bank') return pcXlsx(`Bank schedule ${base}.xlsx`, [{ k: 'emp_no', l: 'Staff ID', w: 13 }, { k: 'name', l: 'Name', w: 28 }, { k: 'bank', l: 'Bank', w: 22 }, { k: 'account_no', l: 'Account number', w: 16 },
      { k: 'account_name', l: 'Account name', w: 28 }, { k: 'sort_code', l: 'Sort code', w: 12 }, { k: 'net', l: 'Amount (NGN)', w: 16 }, { k: 'narration', l: 'Narration', w: 24 }],
    L.filter(l => +l.net > 0).map(l => ({ emp_no: l.emp_no, name: l.name, bank: l.bank?.bank || '', account_no: l.bank?.account_no || '', account_name: l.bank?.account_name || l.name, sort_code: l.bank?.sort_code || '',
      net: +l.net, narration: `Salary ${r.title}` })), { sheet: 'Bank schedule' });
  if (kind === 'paye') return pcXlsx(`PAYE schedule ${base}.xlsx`, [{ k: 'state', l: 'State', w: 14 }, { k: 'emp_no', l: 'Staff ID', w: 13 }, { k: 'name', l: 'Name', w: 28 }, { k: 'tin', l: 'TIN', w: 16 },
      { k: 'type', l: 'Tax type', w: 12 }, { k: 'gross', l: 'Gross (NGN)', w: 15 }, { k: 'relief', l: 'Reliefs for the year', w: 18 }, { k: 'taxable', l: 'Taxable for the year', w: 18 }, { k: 'tax', l: 'Tax this month (NGN)', w: 18 }],
    L.filter(l => +l.tax > 0).sort((a, b) => (a.tax_state || '').localeCompare(b.tax_state || '') || a.name.localeCompare(b.name)).map(l => ({ state: l.tax_state || 'Not set', emp_no: l.emp_no, name: l.name, tin: l.bank?.tin || '',
      type: l.tax_type === 'wht' ? 'WHT' : 'PAYE', gross: +l.gross, relief: +l.relief, taxable: +l.taxable, tax: +l.tax })),
    { sheet: 'PAYE', notes: Object.entries(L.reduce((a, l) => { if (+l.tax > 0) { const k = l.tax_state || 'Not set'; a[k] = (a[k] || 0) + +l.tax; } return a; }, {})).map(([s, t]) => [s, `NGN ${pyN(t)} · payer ID ${(cfg.company?.paye_ids || {})[s] || 'not set in Payroll settings'}`]) });
  if (kind === 'pension') return pcXlsx(`Pension schedule ${base}.xlsx`, [{ k: 'pfa', l: 'PFA', w: 30 }, { k: 'emp_no', l: 'Staff ID', w: 13 }, { k: 'name', l: 'Name', w: 28 }, { k: 'rsa_pin', l: 'RSA PIN', w: 18 },
      { k: 'ee', l: 'Employee (NGN)', w: 15 }, { k: 'er', l: 'Employer (NGN)', w: 15 }, { k: 'total', l: 'Total (NGN)', w: 15 }],
    L.filter(l => +l.pension_ee + +l.pension_er > 0).sort((a, b) => (a.bank?.pfa || '').localeCompare(b.bank?.pfa || '') || a.name.localeCompare(b.name)).map(l => ({ pfa: l.bank?.pfa || 'Not set', emp_no: l.emp_no, name: l.name,
      rsa_pin: l.bank?.rsa_pin || '', ee: +l.pension_ee, er: +l.pension_er, total: +l.pension_ee + +l.pension_er })), { sheet: 'Pension', notes: [['Pension employer code', cfg.company?.pension_code || 'Not set in Payroll settings']] });
  if (kind === 'stat') { const s = k => L.reduce((a, l) => a + (+l[k] || 0), 0);
    return pcXlsx(`Statutory summary ${base}.xlsx`, [{ k: 'what', l: 'Item', w: 34 }, { k: 'amt', l: 'Amount (NGN)', w: 18 }, { k: 'note', l: 'Note', w: 50 }], [
      { what: 'Gross pay', amt: s('gross') }, { what: 'PAYE and WHT', amt: s('tax'), note: 'To each state’s revenue service by the 10th of next month' }, { what: 'Pension (employee)', amt: s('pension_ee') },
      { what: 'Pension (employer)', amt: s('pension_er'), note: 'Pension total goes to each PFA' }, { what: 'NHF', amt: s('nhf') }, { what: 'NHIS (employee)', amt: s('nhis_ee') }, { what: 'NHIS (employer)', amt: s('nhis_er') },
      { what: `NSITF (${cfg.nsitf ?? 1}% of gross, employer)`, amt: s('nsitf') }, { what: `ITF (${cfg.itf ?? 1}% of gross, employer)`, amt: s('itf'), note: 'ITF is due yearly on the year’s payroll' },
      { what: 'Net pay', amt: s('net') }, { what: 'Cost to the company', amt: s('gross') + s('pension_er') + s('nhis_er') + s('nsitf') + s('itf') }], { sheet: 'Summary' }); }
  if (kind === 'full') {
    const names = [...new Set(L.flatMap(l => (l.items || []).filter(i => i.kind !== 'deduction').map(i => i.name)))]; const dnames = [...new Set(L.flatMap(l => (l.items || []).filter(i => i.kind === 'deduction').map(i => i.name)))];
    const cols = [{ k: 'no', l: 'No', w: 5 }, { k: 'emp_no', l: 'Employee code', w: 13 }, { k: 'name', l: 'Name', w: 26 }, { k: 'dept', l: 'Department', w: 22 }, { k: 'grade', l: 'Paygrade', w: 11 }, { k: 'group', l: 'Pay group', w: 18 },
      { k: 'start', l: 'Employment date', w: 13 }, ...names.map((n, i) => ({ k: 'a' + i, l: n, w: 13 })), { k: 'gross', l: 'Gross', w: 14 }, { k: 'pen', l: 'Pension (employee)', w: 14 }, { k: 'pener', l: 'Pension (employer)', w: 14 },
      { k: 'nhf', l: 'NHF', w: 10 }, { k: 'tax', l: 'Tax', w: 13 }, ...dnames.map((n, i) => ({ k: 'd' + i, l: n, w: 13 })), { k: 'net', l: 'Net', w: 14 }];
    return pcXlsx(`Payroll report ${base}.xlsx`, cols, L.map((l, i) => { const o = { no: i + 1, emp_no: l.emp_no, name: l.name, dept: unit(l.unit_id), grade: pyGrade(l.grade_id)?.name || '', group: pyGroup(l.pay_group_id)?.name || '',
      start: l.start_date || '', gross: +l.gross, pen: +l.pension_ee, pener: +l.pension_er, nhf: +l.nhf, tax: +l.tax, net: +l.net };
      names.forEach((n, k) => { o['a' + k] = (l.items || []).filter(x => x.kind !== 'deduction' && x.name === n).reduce((a, x) => a + +x.amount, 0) || ''; });
      dnames.forEach((n, k) => { o['d' + k] = (l.items || []).filter(x => x.kind === 'deduction' && x.name === n).reduce((a, x) => a + +x.amount, 0) || ''; }); return o; }), { sheet: 'Payroll' });
  }
}

// compare with another payroll's report (the parallel run with SeamlessHR)
function pyCompare(id) {
  const cols = [{ k: 'who', l: 'who', w: 18 }, { k: 'gross', l: 'gross', w: 14 }, { k: 'tax', l: 'tax', w: 14 }, { k: 'pension', l: 'pension', w: 14 }, { k: 'net', l: 'net', w: 14 }];
  const notes = [['who', 'Staff ID (Employee code in SeamlessHR), work email or name.'], ['gross, tax, pension, net', 'From SeamlessHR’s payroll report for the same month. Pension is the employee’s share.']];
  return modal({ title: 'Compare with SeamlessHR', wide: true, submit: 'Compare',
    sub: 'Upload SeamlessHR’s payroll report for the same month. Nest lists everyone whose gross, tax, pension or net differs by ₦1 or more.',
    body: `<ol class="pc-up-steps"><li>Export the payroll report from SeamlessHR, or fill in our template. <button class="btn small" type="button" data-tpl>${ico('down')}Template</button></li>${notes.map(([k, v]) => `<li><b>${esc(k)}</b>: ${esc(v)}</li>`).join('')}</ol>
      <label class="f wide">File (.xlsx or .csv)<input type="file" name="file" accept=".xlsx,.csv" required></label><div data-out></div>`,
    onOpen: d => {
      $('[data-tpl]', d).onclick = () => pcXlsx('Compare template.xlsx', cols, [], { sheet: 'Report', notes });
      $('[name=file]', d).onchange = async e => { try { d._rows = (await pfReadSheet(e.target.files[0], true)).map(x => ({ ...x, who: x.who || x.employee_code || x.staff_id })).filter(x => x.who); $('[data-out]', d).innerHTML = `<div class="notice ok">${plural(d._rows.length, 'row')} read.</div>`; }
        catch (x) { $('[data-out]', d).innerHTML = `<div class="notice warn">${esc(x.message)}</div>`; } };
    },
    onSubmit: async (_, d) => { if (!d._rows?.length) throw new Error('Choose the file first');
      const r = await q(sb.rpc('hr_pay_compare', { p_run: id, p_rows: d._rows }));
      const lab = { gross: 'Gross', tax: 'Tax', pension: 'Pension', net: 'Net' };
      $('[data-out]', d).innerHTML = `<div class="notice ${r.issues.length ? 'warn' : 'ok'}">${r.same} of ${r.compared} match exactly.${r.issues.length ? ` ${plural(r.issues.length, 'difference')} below.` : ' Nest and SeamlessHR agree.'}</div>
        ${r.issues.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Employee</th><th>Difference</th></tr></thead><tbody>${r.issues.map(x => `<tr><td>${esc(x.who || '')}</td><td>${x.why ? esc(x.why)
          : Object.entries(x.diff).map(([k, v]) => `${lab[k]}: SeamlessHR ${pyM(v.other)} · Nest ${pyM(v.nest)}`).join('<br>')}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
      throw Object.assign(new Error(''), { quiet: true }); } });
}

// ================================================================ Pay records
PY.pages.records = { perms: ['view-payroll', 'manage-pay-records', 'run-payroll'],
  async load(rest, params) {
    const f = params.get?.('f') || '';
    const [rows] = await Promise.all([q(sb.rpc('hr_pay_people')), pyLook()]); this.rows = rows;
    const list = f === 'missing' ? rows.filter(r => r.missing.length) : f === 'rent' ? rows.filter(r => r.rent_status === 'pending') : rows;
    return topbar('Pay records', 'Each person’s gross, paygrade, tax, bank and pension details, their own allowance amounts and recurring changes.', pyEyeBtn()) +
      `<nav class="pc-tabs"><a href="#/people/admin/pay/records" class="${!f ? 'on' : ''}">Everyone (${rows.length})</a><a href="#/people/admin/pay/records?f=missing" class="${f === 'missing' ? 'on' : ''}">Missing details (${rows.filter(r => r.missing.length).length})</a>
        <a href="#/people/admin/pay/records?f=rent" class="${f === 'rent' ? 'on' : ''}">Rent relief to check (${rows.filter(r => r.rent_status === 'pending').length})</a></nav>` +
      pcTable('pyrec', [{ l: 'Employee', v: r => r.name, f: r => pcPerson(hrCard(r.id) || r, esc(r.emp_no || '') + (r.status === 'exited' ? ' · left ' + fd(r.exit_date) : '')) },
        { l: 'Paygrade', v: r => pyGrade(r.grade_id)?.name || '', f: r => esc(pyGrade(r.grade_id)?.name || '—') + (r.pay_group_id ? `<br><small class="muted">${esc(pyGroup(r.pay_group_id)?.name || '')}</small>` : '') },
        { l: 'Annual gross pay', cls: 'num', v: r => +r.gross || 0, f: r => r.gross ? pyHid(r.gross) : '<span class="muted">—</span>', csv: r => r.gross ?? '' },
        { l: 'Tax', v: r => r.tax_type, f: r => esc(PY_TAX[r.tax_type]) + (r.tax_state ? `<br><small class="muted">${esc(r.tax_state)}</small>` : '') },
        { l: 'Rent relief', v: r => r.rent_status || '', f: r => r.rent_status ? pcChip(r.rent_status === 'approved' ? 'ok' : r.rent_status === 'pending' ? 'pending' : 'rejected', { approved: 'Approved', pending: 'To check', declined: 'Declined' }[r.rent_status]) : '' },
        { l: 'Own amounts / recurring', v: r => r.own + r.recurring, f: r => [r.own ? `${r.own} own` : '', r.recurring ? `${r.recurring} recurring` : '', r.arrears ? 'arrears due' : ''].filter(Boolean).join(' · ') || '' },
        { l: 'Missing', v: r => r.missing.join(', '), f: r => r.missing.map(m => pcChip('pending', m)).join(' ') }], list,
        { noun: 'person', csv: 'Pay records', onRow: r => pyRecord(r.id), empty: f ? 'Nothing here.' : 'Nobody yet.',
          filters: [{ k: 'g', l: 'Paygrade', opts: pcLists('grade').map(g => [g.id, g.name]), test: (r, v) => r.grade_id === +v }, { k: 't', l: 'Tax', opts: Object.entries(PY_TAX), test: (r, v) => r.tax_type === v }] });
  },
  bind(main) { pyEyeBind(main); }
};

async function pyRecord(empId) {
  const [d, L] = await Promise.all([q(sb.rpc('hr_pay_record_get', { p_emp: empId })), pyLook()]); const p = d.private || {}; const can = pcCan('manage-pay-records');
  const own = Object.fromEntries((d.own || []).map(o => [o.item_id, o.value])); const nm = pcName(empId);
  const allow = (d.annual?.items || []);
  const ownRows = allow.map(a => `<tr><td>${esc(a.name)}<br><small class="muted">${esc(PY_FREQ[a.frequency] || '')}${a.on_request ? ', on request' : ''}</small></td><td class="num">${pyM(a.annual)}<br><small class="muted">${esc(a.how)}</small></td>
    <td>${can && a.code !== 'gross_pay' ? `<span class="pc-money"><i>₦</i><input type="number" min="0" step="0.01" data-own="${a.id}" value="${own[a.id] ?? ''}" placeholder="Paygrade"></span>` : ''}</td></tr>`).join('');
  const rec = (d.recurring || []).map(r => `<li><div class="main"><div class="name">${esc(r.label)} · ${pyM(r.amount)} a month</div><div class="sub">From ${pyMonth(r.start_month)}${r.months ? ` · ${r.paid} of ${r.months} paid` : ' · until stopped'}${r.note ? ' · ' + esc(r.note) : ''}</div></div>
    ${pcChip(r.active ? 'ok' : 'muted', r.active ? 'Running' : 'Finished')}${can && r.active ? `<button class="btn small" type="button" data-stoprec="${r.id}">Stop</button>` : ''}</li>`).join('');
  const rent = p.annual_rent ? `<div class="py-rent"><b>Rent ${pyM(p.annual_rent)} a year</b> → relief ${pyM(Math.min(p.annual_rent * (pyCfg().rent_pct ?? 20) / 100, pyCfg().rent_cap ?? 500000))}
      ${pcChip(p.rent_status === 'approved' ? 'ok' : p.rent_status === 'pending' ? 'pending' : 'rejected', { approved: 'Approved', pending: 'To check', declined: 'Declined' }[p.rent_status] || '')}
      ${d.rent_doc ? `<button class="btn small" type="button" data-rentdoc="${d.rent_doc.id}">${ico('down')}${esc(d.rent_doc.file_name || 'Proof')}</button>` : ''}
      ${pcCan('approve-rent-relief') && p.rent_status === 'pending' ? `<button class="btn small primary" type="button" data-rent="ok">Approve</button><button class="btn small" type="button" data-rent="no">Decline</button>` : ''}
      ${p.rent_note ? `<small class="muted">${esc(p.rent_note)}</small>` : ''}</div>` : '<span class="muted">No rent sent yet.</span>';
  const F = [{ k: 'gross_annual', l: 'Annual gross pay', t: 'money', hint: d.grade?.min_gross ? `Paygrade minimum ${pyM(d.grade.min_gross)}` : '' }, { k: 'tax_type', l: 'Tax', t: 'select', blank: false, opts: Object.entries(PY_TAX) },
    { k: 'tax_state', l: 'State for PAYE', t: 'select', opts: NG_STATES.map(s => [s, s]) }, { k: 'pay_arrears', l: 'Pay arrears', t: 'switch', hint: 'They joined (or were added) after a month was paid: the next payroll adds what they missed.' },
    { k: 'bank_name', l: 'Bank' }, { k: 'account_no', l: 'Account number' }, { k: 'account_name', l: 'Account name' }, { k: 'sort_code', l: 'Sort code' }, { k: 'bvn', l: 'BVN' },
    { k: 'tin', l: 'Tax ID (TIN)' }, { k: 'jrb_tax_id', l: 'JRB Tax ID' }, { k: 'pfa', l: 'PFA', t: 'select', opts: pcLists('pfa').map(x => [x.name, x.name]) }, { k: 'rsa_pin', l: 'RSA PIN' }, { k: 'nhf_no', l: 'NHF number' },
    { k: 'medical_aid', l: 'Medical aid plan' },
    { k: 'own', l: 'This person’s amounts', t: 'html', html: `<p class="muted">Leave empty to use the paygrade. ${can ? 'Type an amount for the year to give them their own.' : ''}</p><div class="tablewrap"><table class="t"><thead><tr><th>Allowance</th><th class="num">For the year</th><th>Own amount</th></tr></thead><tbody>${ownRows || '<tr><td colspan="3" class="muted">No paygrade set-up and no gross yet.</td></tr>'}</tbody></table></div>` },
    { k: 'rec', l: 'Recurring changes', t: 'html', html: `${rec ? `<ul class="list">${rec}</ul>` : '<span class="muted">None.</span>'}${can ? ` <button class="btn small" type="button" data-addrec>${ico('plus')}Add a loan or recurring change</button>` : ''}` },
    { k: 'rent', l: 'Rent relief', t: 'html', html: rent + (can ? ` <button class="btn small" type="button" data-rentset>${p.annual_rent ? 'Change rent' : 'Add rent for them'}</button>` : '') }];
  const again = () => pyRecord(empId);
  return pcEdit({ title: 'Pay record · ' + nm, sub: `${esc(pyGrade((hrCard(empId) || {}).grade_id)?.name || 'No paygrade')} · locked data, every change is logged`, wide: true, fields: can ? F : F.map(f => ({ ...f, dis: true })), submit: can ? 'Save' : null,
    vals: { ...p, tax_type: p.tax_type || 'paye' },
    onOpen: (dl, close) => dl.addEventListener('click', async e => {
      const s = e.target.closest('[data-stoprec]'); if (s) { close(null); await pcTry(() => q(sb.rpc('hr_pay_recurring_save', { p: { ...d.recurring.find(r => r.id === +s.dataset.stoprec), active: false } })), 'Stopped'); return again(); }
      if (e.target.closest('[data-addrec]')) { close(null); return pyRecurringForm(empId, again); }
      const rd = e.target.closest('[data-rentdoc]'); if (rd) return hrOpenFile(await q(sb.from('hr_documents').select('file_name,mime,data').eq('id', +rd.dataset.rentdoc).single()));
      const ra = e.target.closest('[data-rent]'); if (ra) { close(null);
        if (ra.dataset.rent === 'ok') { await pcTry(() => q(sb.rpc('hr_pay_rent_decide', { p_emp: empId, p_ok: true, p_note: null })), 'Rent relief approved'); return again(); }
        return pcEdit({ title: 'Decline rent relief', wide: false, fields: [{ k: 'note', l: 'Why', t: 'textarea', req: true }], save: async v => { await q(sb.rpc('hr_pay_rent_decide', { p_emp: empId, p_ok: false, p_note: v.note })); toast('Declined'); again(); } }); }
      if (e.target.closest('[data-rentset]')) { close(null); return pyRentForm(empId, again); }
    }),
    save: async (v, dl) => { const ownv = $$('[data-own]', dl).map(i => ({ item_id: +i.dataset.own, value: i.value }));
      const { own: _o, rec: _r, rent: _t, ...rest } = v;
      await q(sb.rpc('hr_pay_record_save', { p_emp: empId, p: { ...rest, own: ownv } })); toast('Pay record saved'); render({ quiet: true }); } });
}
function pyRecurringForm(empId, after) {
  return pyLook().then(L => pcEdit({ title: 'Recurring change · ' + pcName(empId), wide: false, sub: 'Taken (or paid) every month from the first month until it has run the number of months, or until you stop it.',
    fields: [{ k: 'type_id', l: 'Change', t: 'select', req: true, opts: L.types.filter(t => t.active).map(t => [t.id, `${t.name} (${t.kind === 'pay' ? 'pay' : 'deduction'})`]) }, { k: 'amount', l: 'Amount each month', t: 'money', req: true },
      { k: 'months', l: 'For how many months', t: 'number', min: 1, hint: 'Leave empty to keep going until stopped.' }, { k: 'start_month', l: 'First month', t: 'month', req: true }, { k: 'note', l: 'Note' }],
    vals: { start_month: pyNext().slice(0, 7) },
    save: async v => { await q(sb.rpc('hr_pay_recurring_save', { p: { ...v, employee_id: empId, start_month: v.start_month + '-01' } })); toast('Saved'); after(); } }));
}
function pyRentForm(empId, after) {
  const cfg = pyCfg();
  return pcEdit({ title: 'Rent relief', wide: false, sub: `Relief is ${cfg.rent_pct ?? 20}% of the rent paid for the year, up to ${pyM(cfg.rent_cap ?? 500000)}. It needs the tenancy agreement or a rent receipt.`,
    fields: [{ k: 'annual_rent', l: 'Rent paid for the year', t: 'money', req: true }, { k: 'file', l: 'Tenancy agreement or receipt', t: 'file' }],
    save: async (v, dl) => { const f = $('[name=file]', dl)?.files?.[0]; const doc = f ? await hrReadFile10(f) : {};
      await q(sb.rpc('hr_pay_rent_submit', { p: { annual_rent: v.annual_rent, ...doc, ...(empId ? { employee_id: empId } : {}) } })); toast(empId === hrMe()?.id || !empId ? 'Sent to HR' : 'Saved: approve it to apply it'); after(); } });
}

// ================================================================ Reports & downloads
PY.pages.reports = { perms: ['view-payroll', 'download-payroll-schedules'],
  async load(rest, params) {
    const runs = this.runs = (await q(sb.rpc('hr_pay_runs_list'))).filter(r => r.status === 'closed');
    const cur = this.cur = runs.find(r => r.id === +params.get?.('run')) || runs[0];
    const years = [...new Set(runs.map(r => r.period.slice(0, 4)))];
    return topbar('Reports & downloads', 'Schedules for the bank, the tax offices and the PFAs, and the payroll report.', runs.length ? `<select id="pyrun" class="inline">${runs.map(r => opt(r.id, r.title, cur.id)).join('')}</select>` : '') +
      (cur ? `<section class="panel"><header><h2>${esc(cur.title)}</h2><span class="meta">${plural(cur.people, 'person', 'people')}</span></header><div class="body py-dl">${pyDownloadsHtml()}</div></section>
        <section class="panel"><header><h2>Year to date</h2></header><div class="body py-dl">${years.map(y => `<button class="btn py-dlb" type="button" data-ytd="${y}">${ico('down')}<span><b>${y} by person</b><small>Gross, pension, tax and net for each month</small></span></button>`).join('')}</div></section>`
        : '<section class="panel"><div class="pc-empty-hero"><b>No closed payroll yet</b>Downloads appear once a payroll is closed, or past months are uploaded.</div></section>');
  },
  bind(main) {
    const s = $('#pyrun', main); if (s) s.onchange = () => go('#/people/admin/pay/reports?run=' + s.value);
    main.addEventListener('click', async e => {
      const b = e.target.closest('[data-dl]'); if (b) { const d = await q(sb.rpc('hr_pay_run_get', { p_run: this.cur.id })); return pcTry(() => pyDownload(b.dataset.dl, d)); }
      const y = e.target.closest('[data-ytd]'); if (y) return pcTry(() => pyYtd(y.dataset.ytd, this.runs.filter(r => r.period.startsWith(y.dataset.ytd))));
    });
  }
};
async function pyYtd(year, runs) {
  const all = await Promise.all(runs.map(r => q(sb.rpc('hr_pay_run_get', { p_run: r.id })))); const by = {};
  all.forEach(d => d.lines.forEach(l => { const o = by[l.employee_id] = by[l.employee_id] || { emp_no: l.emp_no, name: l.name, gross: 0, pension: 0, tax: 0, net: 0 };
    const m = d.run.period.slice(5, 7); o['g' + m] = (o['g' + m] || 0) + +l.gross; o['n' + m] = (o['n' + m] || 0) + +l.net; o.gross += +l.gross; o.pension += +l.pension_ee; o.tax += +l.tax; o.net += +l.net; }));
  const ms = [...new Set(all.map(d => d.run.period.slice(5, 7)))].sort();
  const mn = m => new Date(`2000-${m}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'short' });
  return pcXlsx(`Payroll ${year} by person.xlsx`, [{ k: 'emp_no', l: 'Staff ID', w: 13 }, { k: 'name', l: 'Name', w: 26 }, ...ms.map(m => ({ k: 'g' + m, l: mn(m) + ' gross', w: 13 })),
    { k: 'gross', l: 'Gross for the year', w: 16 }, { k: 'pension', l: 'Pension (employee)', w: 16 }, { k: 'tax', l: 'Tax', w: 14 }, { k: 'net', l: 'Net for the year', w: 16 }],
    Object.values(by).sort((a, b) => a.name.localeCompare(b.name)), { sheet: year });
}

// ================================================================ Past payroll
PY.pages.past = { perms: ['upload-payroll-history'],
  async load() {
    const rows = (await q(sb.rpc('hr_pay_runs_list'))).filter(r => r.kind === 'past');
    return topbar('Past payroll', 'Months paid before Nest, uploaded from SeamlessHR’s payroll report. Year-to-date figures and comparisons with last month use them, and staff can download those payslips too.', pyEyeBtn() + `<button class="btn primary" id="pypast">${ico('up')}Upload past months</button>`) +
      pcTable('pypast', [{ l: 'Month', v: r => r.period, f: r => `<b>${esc(r.title)}</b>` }, { l: 'People', cls: 'num', v: r => +r.people }, { l: 'Gross', cls: 'num', v: r => +r.gross, f: r => pyHid(r.gross) },
        { l: 'Tax', cls: 'num', v: r => +r.tax, f: r => pyHid(r.tax) }, { l: 'Net', cls: 'num', v: r => +r.net, f: r => pyHid(r.net) }], rows,
        { noun: 'month', href: r => '#/people/admin/pay/run/' + r.id, empty: 'Nothing uploaded yet.' });
  },
  bind(main) { pyEyeBind(main); $('#pypast', main).onclick = async () => { const L = await pyLook();
    const al = L.items.filter(i => i.kind === 'allowance'); const de = L.items.filter(i => i.kind === 'deduction' && !['pension', 'tax'].includes(i.statutory));
    const key = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const cols = [{ k: 'month', l: 'month', w: 12 }, { k: 'who', l: 'who', w: 18 }, ...al.map(i => ({ k: key(i.name), l: key(i.name), w: 14 })), { k: 'gross', l: 'gross', w: 14 }, { k: 'pension', l: 'pension', w: 13 },
      { k: 'pension_employer', l: 'pension_employer', w: 15 }, { k: 'tax', l: 'tax', w: 13 }, ...de.map(i => ({ k: key(i.name), l: key(i.name), w: 14 })), { k: 'net', l: 'net', w: 14 }];
    const notes = [['month', 'The month paid: 2026-10 or October 2026. Several months can go in one file.'], ['who', 'Staff ID (Employee code in SeamlessHR), work email or full name.'],
      ['allowances and deductions', 'One column each, named as in Payroll settings (gross_pay, housing, loan_repayment…). Leave out any you don’t have.'],
      ['gross, pension, pension_employer, tax, net', 'From the payroll report. Net is required.']];
    pcUploadDlg({ title: 'Upload past payroll', sub: 'From SeamlessHR’s payroll report. A month already run in Nest is skipped. Uploading a month again updates it.', notes,
      template: () => pcXlsx('Past payroll template.xlsx', cols, [{ month: '2026-10', who: 'GES0042026', gross_pay: 360000, housing: 0, transport: 25000, gross: 425000, pension: 34000, pension_employer: 42500, tax: 41200, net: 349800 }], { sheet: 'Past payroll', notes }),
      run: rows => q(sb.rpc('hr_pay_past_upload', { p_rows: rows })), done: r => `${plural(r.added, 'payslip')} saved in ${plural(r.months, 'month')}` }); }; }
};

// ================================================================ Settings
const PY_SET_TABS = [['items', 'Allowances & deductions'], ['grades', 'Paygrades'], ['tax', 'Tax & statutory'], ['types', 'Change types'], ['payslips', 'Payslips'], ['company', 'Company']];
PY.pages.settings = { perms: ['manage-payroll-settings'],
  async load(rest) {
    const tab = this.tab = rest[0] || 'items'; const L = await pyLook(true); const cfg = pyCfg();
    const head = topbar('Payroll settings', 'How pay is made up at GANKCO. Loaded from SeamlessHR; amounts are for HR to fill in.') + pcTabs(PY_SET_TABS.map(([k, l]) => ['#/people/admin/pay/settings/' + k, l]), '#/people/admin/pay/settings/' + tab);
    if (tab === 'items') return head + `<p class="muted">As in SeamlessHR, tax and pension are worked out on <b>Gross pay</b> (the person’s gross). The other allowances are paid on top of it and are not taxed and carry no pension, unless you switch that on for an allowance.</p>` + ['allowance', 'deduction'].map(kind => `<section class="panel"><header><h2>${kind === 'allowance' ? 'Allowances' : 'Deductions'}</h2>
        <span class="right"><button class="btn small primary" data-item="new:${kind}">${ico('plus')}Add ${kind === 'allowance' ? 'an allowance' : 'a deduction'}</button></span></header>
        <div class="tablewrap"><table class="t"><thead><tr><th>Name</th><th>Paid</th>${kind === 'allowance' ? '<th>Taxed</th><th>Pension</th>' : ''}<th></th></tr></thead><tbody>${L.items.filter(i => i.kind === kind).map(i => `<tr>
          <td><b>${esc(i.name)}</b>${i.short ? ` <span class="chip muted">${esc(i.short)}</span>` : ''}${i.active ? '' : ' ' + pcChip('muted', 'Off')}${i.statutory ? ` <small class="muted">${{ pension: 'statutory', tax: 'statutory', loan: 'used for loans', leave: 'paid with leave' }[i.statutory] || ''}</small>` : ''}${i.description ? `<br><small class="muted">${esc(i.description)}</small>` : ''}</td>
          <td>${kind === 'deduction' ? '—' : esc(PY_FREQ[i.frequency]) + (i.frequency === 'quarterly' ? `, month ${i.pay_month} of the quarter` : i.frequency === 'annual' ? (i.on_request ? ', on request' : ', in ' + new Date(2000, (i.pay_month || 1) - 1, 1).toLocaleDateString('en-GB', { month: 'long' })) : '')}</td>
          ${kind === 'allowance' ? `<td>${pcYes(i.taxable)}</td><td>${pcYes(i.pensionable)}</td>` : ''}<td class="num"><button class="btn small" data-item="${i.id}">Edit</button></td></tr>`).join('')}</tbody></table></div></section>`).join('');
    if (tab === 'grades') {
      const grades = pcLists('grade'); const byG = {}; grades.forEach(g => { const pg = L.grades.find(x => x.grade_id === g.id); const k = pg?.pay_group_id || 0; (byG[k] = byG[k] || []).push({ g, pg }); });
      const al = L.items.filter(i => i.kind === 'allowance' && i.active);
      const desc = gid => al.map(i => { const gi = L.gitems.find(x => x.grade_id === gid && x.item_id === i.id); if (!gi) return '';
        return `<span class="chip ${gi.basis === 'fixed' && gi.value == null ? 'pending' : 'muted'}" title="${esc(i.name)}">${esc(i.short || i.name)}: ${gi.basis === 'gross' || i.code === 'gross_pay' ? 'person’s gross' : gi.basis === 'percent' ? (gi.value ?? 0) + '%' : gi.value == null ? 'no amount' : pyM(gi.value)}</span>`; }).join(' ');
      return head + `<p class="muted">Gross pay is each person’s annual gross pay (from their pay record, or the paygrade minimum). The other allowances are paid on top: a fixed yearly amount or a percentage of Gross pay. A person’s own amounts override the paygrade.</p>` +
        Object.entries(byG).sort((a, b) => (pyGroup(a[0])?.sort ?? 99) - (pyGroup(b[0])?.sort ?? 99)).map(([k, list]) => `<section class="panel"><header><h2>${esc(pyGroup(k)?.name || 'No pay group')}</h2><span class="meta">${plural(list.length, 'paygrade')}</span></header>
          <ul class="list">${list.map(({ g, pg }) => `<li><div class="main"><div class="name">${esc(g.name)} <small class="muted">${pg?.min_gross ? 'minimum gross ' + pyM(pg.min_gross) : 'no minimum gross'} · ${pg?.working_days ?? 22} working days</small></div><div class="sub py-gi">${desc(g.id)}</div></div>
            <button class="btn small" data-grade="${g.id}">Edit</button></li>`).join('')}</ul></section>`).join('');
    }
    if (tab === 'tax') {
      this.F = [{ k: 'wht_rate', l: 'Withholding tax rate (%)', t: 'number', min: 0, max: 100, hint: 'For staff whose tax type is withholding tax (contractors).' },
        { k: 'pension_ee', l: 'Pension: employee (% of gross)', t: 'number', min: 0, max: 100 }, { k: 'pension_er', l: 'Pension: company (% of gross)', t: 'number', min: 0, max: 100 },
        { k: 'nhf_on', l: 'Deduct NHF', t: 'switch', hint: 'National Housing Fund, on Gross pay. Off at GANKCO today.' }, { k: 'nhf_rate', l: 'NHF (% of Gross pay)', t: 'number', min: 0, max: 100, show: v => v.nhf_on },
        { k: 'nhis_on', l: 'Deduct NHIS', t: 'switch', hint: 'Health insurance contributions. Off at GANKCO today.' }, { k: 'nhis_ee', l: 'NHIS: employee (% of Gross pay)', t: 'number', show: v => v.nhis_on }, { k: 'nhis_er', l: 'NHIS: company (% of Gross pay)', t: 'number', show: v => v.nhis_on },
        { k: 'nsitf', l: 'NSITF (% of gross, company)', t: 'number', min: 0, max: 100 }, { k: 'itf', l: 'ITF (% of gross, company)', t: 'number', min: 0, max: 100 },
        { k: 'rent_pct', l: 'Rent relief (% of rent)', t: 'number', min: 0, max: 100 }, { k: 'rent_cap', l: 'Rent relief cap', t: 'money' }, { k: 'decimals', l: 'Decimal places', t: 'number', min: 0, max: 2 }];
      const bands = cfg.tax_bands || [];
      return head + `<form id="pytax"><section class="panel"><header><h2>PAYE bands (yearly taxable income)</h2><span class="meta">Nigeria Tax Act 2025, from 1 January 2026</span></header><div class="body">
          <p class="muted">Tax is worked out on the year: Gross pay for the year (plus any allowance switched to taxed) less reliefs (pension, NHF and NHIS when deducted, approved rent relief), through these bands, then ÷ 12.</p>
          <div class="py-bands">${bands.map((b, i) => `<div class="py-band"><span>${i === 0 ? 'First' : i === bands.length - 1 ? 'Above that' : 'Next'}</span><span class="pc-money"><i>₦</i><input type="number" min="0" data-bs="${i}" value="${b[0] ?? ''}" ${i === bands.length - 1 ? 'disabled placeholder="the rest"' : ''}></span><span class="pc-money"><input type="number" min="0" max="100" step="0.5" data-br="${i}" value="${b[1]}"><i>%</i></span></div>`).join('')}</div>
          <button type="button" class="btn small" id="pyband">${ico('plus')}Add a band</button></div></section>
        <section class="panel"><header><h2>Pension and other contributions</h2></header><div class="body">${pcForm(this.F, cfg)}</div></section><button class="btn primary">Save</button></form>`;
    }
    if (tab === 'types') return head + `<section class="panel"><header><h2>Change types</h2><span class="meta">Extra pay and deductions HR adds to a payroll</span><span class="right"><button class="btn small primary" data-type="new">${ico('plus')}Add a change type</button></span></header>
      <div class="tablewrap"><table class="t"><thead><tr><th>Name</th><th>Kind</th><th>Worked out as</th><th>Taxable</th><th></th></tr></thead><tbody>${L.types.map(t => `<tr><td><b>${esc(t.name)}</b>${t.active ? '' : ' ' + pcChip('muted', 'Off')}</td>
        <td>${t.kind === 'pay' ? 'Extra pay' : 'Deduction'}</td><td>${t.basis === 'percent' ? (t.value ?? '—') + '% of gross' : t.value ? pyM(t.value) : 'Amount typed each time'}</td><td>${t.kind === 'pay' ? pcYes(t.taxable) : '—'}</td>
        <td class="num"><button class="btn small" data-type="${t.id}">Edit</button></td></tr>`).join('')}</tbody></table></div></section>`;
    if (tab === 'payslips') {
      const P = cfg.payslips || {}; const SH = PY_PS_SHOW, EF = PY_PS_EMP, CO = PY_PS_CO;
      return head + `<form id="pyps">${['basic', 'full'].map(k => `<section class="panel"><header><h2><input class="py-tn" name="${k}_name" value="${esc(P[k]?.name || '')}"></h2><span class="right"><label class="check"><input type="radio" name="default" value="${k}" ${(P.default || 'full') === k ? 'checked' : ''}> Sent with payroll</label>
          <button class="btn small" type="button" data-preview="${k}">${ico('eye')}Preview</button></span></header><div class="body pc-grid2">
          <div><div class="pc-sec">Shows</div>${SH.map(([s, l]) => `<label class="check"><input type="checkbox" name="${k}_s_${s}" ${P[k]?.show?.[s] ?? ['words', 'employer'].includes(s) ? 'checked' : ''}> ${l}</label>`).join('')}</div>
          <div><div class="pc-sec">Company details (name and logo always show)</div>${CO.map(([s, l]) => `<label class="check"><input type="checkbox" name="${k}_c_${s}" ${(P[k]?.company || []).includes(s) ? 'checked' : ''}> ${l}</label>`).join('')}
          <div class="pc-sec">Employee details (name and employee code always show)</div>${EF.map(([s, l]) => `<label class="check"><input type="checkbox" name="${k}_e_${s}" ${(P[k]?.employee || []).includes(s) ? 'checked' : ''}> ${l}</label>`).join('')}</div></div></section>`).join('')}
        <label class="switch pc-sw"><input type="checkbox" name="email_payslips" ${cfg.email_payslips !== false ? 'checked' : ''}><span class="sw"></span><span><b>Email payslips when a payroll closes</b><span class="sub muted">Staff can always download them under Pay.</span></span></label>
        <p><button class="btn primary">Save</button></p></form>`;
    }
    if (tab === 'company') {
      const C = cfg.company || {}; const ids = Object.entries(C.paye_ids || {});
      const CD = pyCo();
      return head + `<form id="pyco"><section class="panel"><header><h2>Company details on payslips</h2><span class="meta">Printed at the top of every payslip</span></header><div class="body">${pcForm([{ k: 'co_name', l: 'Company name' },
          { k: 'co_address', l: 'Address', t: 'textarea', rows: 3 }, { k: 'co_email', l: 'Email', t: 'email' }, { k: 'co_website', l: 'Website' }, { k: 'co_country', l: 'Country' }],
          { co_name: CD.name, co_address: CD.address, co_email: CD.email, co_website: CD.website, co_country: CD.country })}</div></section>
        <section class="panel"><header><h2>Remittance details</h2></header><div class="body">${pcForm([{ k: 'pension_code', l: 'Pension employer code' }, { k: 'wht_payer_id', l: 'WHT payer ID' }], C)}
          <div class="pc-sec">PAYE payer ID for each state</div><div id="pyids">${(ids.length ? ids : [['', '']]).map(([s, v]) => pyIdRow(s, v)).join('')}</div><button type="button" class="btn small" id="pyidadd">${ico('plus')}Add a state</button></div></section>
        <section class="panel"><header><h2>Bank schedule</h2></header><div class="body"><p class="muted">The bank schedule is a plain Excel list (staff ID, name, bank, account number, account name, sort code, amount, narration). When HR agrees the bank’s own upload format, it can be added here.</p></div></section>
        <button class="btn primary">Save</button></form>`;
    }
    return head;
  },
  bind(main) {
    const t = this.tab; const done = msg => { toast(msg || 'Saved'); pyInvalidate(); pcRefresh(); };
    main.addEventListener('click', async e => {
      const it = e.target.closest('[data-item]'); if (it) return pyItemForm(it.dataset.item);
      const g = e.target.closest('[data-grade]'); if (g) return pyGradeForm(+g.dataset.grade);
      const ty = e.target.closest('[data-type]'); if (ty) return pyTypeForm(ty.dataset.type);
      const pv = e.target.closest('[data-preview]'); if (pv) { const f = $('#pyps', main); const P = pyPsRead(f);
        return pyPayslipPdf({ name: 'Sample Employee', emp_no: 'GES0000000', unit_id: hrUnitsOrdered()[0]?.id, job_role: 'Field Engineer', gross: 650000, pension_ee: 40000, pension_er: 50000, tax: 65300, nhf: 0, nhis_ee: 0, other_ded: 25000, net: 519700, relief: 480000, tax_type: 'paye',
          items: [{ kind: 'pay', name: 'Gross pay', amount: 360000 }, { kind: 'pay', name: 'Cost of living', amount: 20000 }, { kind: 'pay', name: 'Housing', amount: 225000, note: 'Quarterly' }, { kind: 'pay', name: 'Transport', amount: 25000 },
            { kind: 'pay', name: 'Meal', amount: 10000 }, { kind: 'pay', name: 'Airtime', amount: 10000 }, { kind: 'deduction', name: 'Loan repayment (3 of 10)', amount: 25000 }], bank: { bank: 'Sample Bank', account_no: '0123456789', account_name: 'Sample Employee', pfa: 'Sample PFA', rsa_pin: 'PEN100000000000', tin: '12345678-0001' } },
          { title: new Date(pyNext() + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), period: pyNext() }, { T: P[pv.dataset.preview], ytd: { gross: 6500000, tax: 653000, pension: 400000, net: 5197000 } }); }
      if (e.target.closest('#pyband')) { const box = $('.py-bands', main); const n = $$('.py-band', box).length; const last = $$('.py-band', box).at(-1); const i = $('[data-bs]', last);
        i.disabled = false; i.placeholder = ''; last.querySelector('span').textContent = 'Next';
        box.insertAdjacentHTML('beforeend', `<div class="py-band"><span>Above that</span><span class="pc-money"><i>₦</i><input type="number" data-bs="${n}" disabled placeholder="the rest"></span><span class="pc-money"><input type="number" min="0" max="100" step="0.5" data-br="${n}" value="25"><i>%</i></span></div>`); }
      if (e.target.closest('#pyidadd')) $('#pyids', main).insertAdjacentHTML('beforeend', pyIdRow('', ''));
    });
    const tf = $('#pytax', main); if (tf) { pcLiveShow(tf, this.F, pyCfg()); tf.onsubmit = async e => { e.preventDefault();
      const bands = $$('.py-band', tf).map((b, i, a) => [i === a.length - 1 ? null : +$('[data-bs]', b).value || 0, +$('[data-br]', b).value || 0]);
      await pcTry(() => q(sb.rpc('hr_pay_settings_save', { p: { ...pcRead(tf, this.F), tax_bands: bands } })).then(pyCfgSet), 'Saved'); }; }
    const pf = $('#pyps', main); if (pf) pf.onsubmit = async e => { e.preventDefault(); const P = pyPsRead(pf);
      await pcTry(() => q(sb.rpc('hr_pay_settings_save', { p: { payslips: P, email_payslips: $('[name=email_payslips]', pf).checked } })).then(pyCfgSet), 'Saved'); };
    const cf = $('#pyco', main); if (cf) cf.onsubmit = async e => { e.preventDefault();
      const paye_ids = Object.fromEntries($$('.py-idr', cf).map(r => [$('select', r).value, $('input', r).value.trim()]).filter(([s, v]) => s && v));
      const cv = k => $(`[name=co_${k}]`, cf).value.trim();
      await pcTry(() => q(sb.rpc('hr_pay_settings_save', { p: { company: { ...(pyCfg().company || {}), name: cv('name'), address: cv('address'), email: cv('email'), website: cv('website'), country: cv('country'),
        pension_code: $('[name=pension_code]', cf).value.trim(), wht_payer_id: $('[name=wht_payer_id]', cf).value.trim(), paye_ids } } })).then(pyCfgSet), 'Saved'); };
  }
};
const pyIdRow = (s, v) => `<div class="row2 py-idr"><select aria-label="State"><option value="">State…</option>${NG_STATES.map(x => opt(x, x, s)).join('')}</select><input placeholder="Payer ID" value="${esc(v)}"></div>`;
const PY_PS_SHOW = [['items', 'Each allowance (otherwise one Salary line)'], ['extras', 'Extra pay (overtime, leave allowance, bonuses)'], ['deductions', 'Extra deductions (loans)'], ['tax', 'Tax and pension on separate lines'],
  ['words', 'Net pay in words'], ['employer', 'Employer contributions (company pension)'], ['ytd', 'Year to date'], ['relief', 'Tax reliefs note']];
const PY_PS_EMP = [['job_role', 'Job role'], ['department', 'Department'], ['pay_grade', 'Paygrade'], ['bank', 'Bank name, account number and account name'], ['pfa', 'PFA and RSA PIN'], ['tax_number', 'Tax ID']];
const PY_PS_CO = [['address', 'Address'], ['email', 'Email'], ['website', 'Website'], ['country', 'Country']];
function pyPsRead(f) {
  const SH = PY_PS_SHOW.map(x => x[0]), EF = PY_PS_EMP.map(x => x[0]), CO = PY_PS_CO.map(x => x[0]); const old = pyCfg().payslips || {};
  const one = k => ({ ...(old[k] || {}), name: $(`[name=${k}_name]`, f).value.trim() || old[k]?.name, show: Object.fromEntries(SH.map(s => [s, $(`[name=${k}_s_${s}]`, f).checked])),
    company: ['name', 'logo', ...CO.filter(s => $(`[name=${k}_c_${s}]`, f).checked)],
    employee: ['first_name', 'last_name', 'emp_no', ...EF.filter(s => $(`[name=${k}_e_${s}]`, f).checked)] });
  return { basic: one('basic'), full: one('full'), default: $('[name=default]:checked', f)?.value || 'full' };
}
async function pyItemForm(key) {
  const L = await pyLook(); const [isNew, kind] = key.startsWith('new:') ? [true, key.slice(4)] : [false, null]; const i = isNew ? { kind, frequency: 'monthly', taxable: false, pensionable: false, active: true } : L.items.find(x => x.id === +key);
  const allow = i.kind === 'allowance'; const locked = ['pension', 'tax'].includes(i.statutory) || i.code === 'gross_pay';
  return pcEdit({ title: isNew ? (allow ? 'Add an allowance' : 'Add a deduction') : 'Edit ' + i.name, wide: false,
    fields: [{ k: 'name', l: 'Name', req: true }, { k: 'short', l: 'Short name', hint: 'For reports, e.g. HSG.' }, { k: 'description', l: 'Description' },
      ...(allow ? [{ k: 'frequency', l: 'Paid', t: 'radio', opts: Object.entries(PY_FREQ), def: 'monthly', dis: locked },
        { k: 'q_month', l: 'Paid in month of the quarter', t: 'select', blank: false, opts: [[1, '1st'], [2, '2nd'], [3, '3rd']], show: v => v.frequency === 'quarterly' },
        { k: 'on_request', l: 'Paid on request', t: 'switch', hint: 'Not paid by itself: it goes into a payroll when HR adds it (as leave allowance is).', show: v => v.frequency === 'annual' },
        { k: 'a_month', l: 'Paid in', t: 'select', blank: false, opts: [...Array(12)].map((_, m) => [m + 1, new Date(2000, m, 1).toLocaleDateString('en-GB', { month: 'long' })]), show: v => v.frequency === 'annual' && !v.on_request },
        { k: 'taxable', l: 'Taxed', t: 'switch', dis: i.code === 'gross_pay', hint: 'Off for add-ons (as in SeamlessHR): only Gross pay is taxed.' },
        { k: 'pensionable', l: 'Counts for pension', t: 'switch', dis: i.code === 'gross_pay', hint: 'Off for add-ons: pension is a percentage of Gross pay.' }] : []),
      ...(isNew ? [] : [{ k: 'active', l: 'In use', t: 'switch', dis: locked }])], vals: { ...i, q_month: i.frequency === 'quarterly' ? i.pay_month : 3, a_month: i.frequency === 'annual' ? i.pay_month : 12 },
    save: async v => { const { q_month, a_month, ...rest } = v; const pay_month = v.frequency === 'quarterly' ? q_month : v.frequency === 'annual' ? a_month : null;
      await q(sb.rpc('hr_pay_item_save', { p: { ...rest, frequency: v.frequency || i.frequency, pay_month, id: i.id || null, kind: i.kind } })); pyInvalidate(); toast('Saved'); render({ quiet: true }); },
    del: !isNew && !locked ? { label: 'Delete', title: 'Delete ' + esc(i.name) + '?', text: 'It comes off every paygrade. If it has been paid in a payroll, it can’t be deleted: switch it off instead.', run: async () => { await q(sb.rpc('hr_pay_item_delete', { p_id: i.id })); pyInvalidate(); } } : null });
}
async function pyGradeForm(gid) {
  const L = await pyLook(); const g = pyGrade(gid); const pg = L.grades.find(x => x.grade_id === gid) || {}; const al = L.items.filter(i => i.kind === 'allowance' && i.active);
  const row = i => { const gi = L.gitems.find(x => x.grade_id === gid && x.item_id === i.id);
    if (i.code === 'gross_pay') return `<tr data-gi="${i.id}"><td><label class="check"><input type="checkbox" data-on checked disabled> ${esc(i.name)}</label><small class="muted">Monthly · taxed · pension</small></td>
      <td><input type="hidden" data-basis value="gross"><span class="muted">The person’s annual gross pay</span></td><td><input type="hidden" data-val value=""></td></tr>`;
    return `<tr data-gi="${i.id}"><td><label class="check"><input type="checkbox" data-on ${gi ? 'checked' : ''}> ${esc(i.name)}</label><small class="muted">${esc(PY_FREQ[i.frequency])}${i.on_request ? ', on request' : ''}${i.taxable ? ' · taxed' : ''}${i.pensionable ? ' · pension' : ''}</small></td>
    <td><select data-basis>${opt('fixed', 'Fixed amount for the year', gi?.basis === 'percent' ? '' : 'fixed')}${opt('percent', '% of Gross pay', gi?.basis)}</select></td>
    <td><input type="number" min="0" step="0.01" data-val value="${gi?.value ?? ''}" placeholder="${gi?.basis === 'percent' ? '%' : '₦'}"></td></tr>`; };
  return pcEdit({ title: 'Paygrade ' + (g?.name || ''), wide: true,
    fields: [{ k: 'pay_group_id', l: 'Pay group', t: 'select', opts: pcLists('pay_group').map(x => [x.id, x.name]) }, { k: 'min_gross', l: 'Minimum annual gross pay', t: 'money', hint: 'Used when a person has no gross pay on their pay record.' },
      { k: 'working_days', l: 'Working days a month', t: 'number', min: 0, max: 31 },
      { k: 'items', l: 'Allowances', t: 'html', html: `<div class="tablewrap"><table class="t py-gt"><thead><tr><th>Allowance</th><th>Worked out as</th><th>Value</th></tr></thead><tbody>${al.map(row).join('')}</tbody></table></div>` },
      { k: 'copy', l: 'Also apply to', t: 'checks', opts: pcLists('grade').filter(x => x.id !== gid).map(x => [x.id, x.name]), hint: 'Copies the minimum gross, working days and allowances to these paygrades.' }],
    vals: { ...pg, working_days: pg.working_days ?? 22 },
    onOpen: d => d.addEventListener('change', e => { const s = e.target.closest('select[data-basis]'); if (s) $('[data-val]', s.closest('tr')).placeholder = s.value === 'percent' ? '%' : '₦'; }),
    save: async (v, d) => { const items = $$('[data-gi]', d).map(r => ({ item_id: +r.dataset.gi, on: $('[data-on]', r).checked || $('[data-basis]', r).value === 'gross', basis: $('[data-basis]', r).value, value: $('[data-val]', r).value }));
      await q(sb.rpc('hr_pay_grade_save', { p_grade: gid, p: { pay_group_id: v.pay_group_id, min_gross: v.min_gross, working_days: v.working_days, items } }));
      if (v.copy?.length) await q(sb.rpc('hr_pay_grade_copy', { p_from: gid, p_to: v.copy }));
      pyInvalidate(); toast(v.copy?.length ? `Saved and copied to ${plural(v.copy.length, 'paygrade')}` : 'Saved'); render({ quiet: true }); } });
}
async function pyTypeForm(key) {
  const L = await pyLook(); const t = key === 'new' ? { kind: 'pay', basis: 'fixed', taxable: true, active: true } : L.types.find(x => x.id === +key);
  return pcEdit({ title: key === 'new' ? 'Add a change type' : 'Edit ' + t.name, wide: false,
    fields: [{ k: 'name', l: 'Name', req: true }, { k: 'kind', l: 'Kind', t: 'radio', opts: [['pay', 'Extra pay'], ['deduction', 'Deduction']] }, { k: 'basis', l: 'Worked out as', t: 'radio', opts: [['fixed', 'An amount'], ['percent', '% of gross']] },
      { k: 'value', l: 'Default value', t: 'number', min: 0, hint: 'An amount, or a percentage of the person’s yearly Gross pay. Leave empty to type it each time.' }, { k: 'taxable', l: 'Taxable', t: 'switch', show: v => v.kind === 'pay' },
      ...(key === 'new' ? [] : [{ k: 'active', l: 'In use', t: 'switch' }])], vals: t,
    save: async v => { await q(sb.rpc('hr_pay_change_type_save', { p: { ...v, id: t.id || null } })); pyInvalidate(); toast('Saved'); render({ quiet: true }); },
    del: t.id ? { label: 'Delete', title: 'Delete ' + esc(t.name) + '?', text: 'If it has been used, it can’t be deleted: switch it off instead.', run: async () => { await q(sb.rpc('hr_pay_change_type_delete', { p_id: t.id })); pyInvalidate(); } } : null });
}

// ================================================================ Self service: Pay
PC_SELF.pay = {
  async load() {
    const me = hrMe(); if (!me) return topbar('Pay') + '<div class="notice">HR hasn’t added your PeopleCore record yet, or it isn’t linked to your sign-in. Ask HR.</div>';
    const [rows, rec] = await Promise.all([q(sb.rpc('hr_pay_mine')), q(sb.rpc('hr_pay_record_get', { p_emp: me.id })).catch(() => null), pyCfgLoad()]); this.rows = rows; const p = rec?.private || {}; const cfg = pyCfg();
    const y = rows[0]?.ytd; const yr = rows[0]?.period?.slice(0, 4);
    return topbar('Pay', 'Your payslips. Amounts stay hidden until you tap the eye.', pyEyeBtn()) +
      (rows.length ? pcKpis([[pyHid(rows[0].net), 'Last net pay · ' + rows[0].title], [pyHid(y?.gross), `Gross in ${yr}`], [pyHid(y?.tax), `Tax in ${yr}`], [pyHid(y?.pension), `Pension in ${yr}`]]) : '') +
      `<section class="panel"><header><h2>Payslips</h2><span class="meta">${plural(rows.length, 'payslip')}</span></header>${rows.length ? `<ul class="list py-mine">${rows.map((r, i) => `<li><div class="main"><div class="name">${esc(r.title)}${r.revised ? ' ' + pcChip('pending', 'Revised') : ''}${r.past ? ' ' + pcChip('muted', 'Past record') : ''}</div>
          <div class="sub">Gross ${pyHid(r.gross)} · tax ${pyHid(r.tax)} · net <b>${pyHid(r.net)}</b>${r.bank_name ? ` · to ${esc(r.bank_name)} ····${esc(r.account_no)}` : ''}</div></div>
          <button class="btn small" data-ps="${i}">${ico('down')}Download</button></li>`).join('')}</ul>` : '<div class="pc-empty">Your payslips appear here once a payroll is closed.</div>'}</section>
      <section class="panel"><header><h2>Rent relief</h2></header><div class="body">
        <p class="muted">Since January 2026, ${cfg.rent_pct ?? 20}% of the rent you pay for your home (up to ${pyM(cfg.rent_cap ?? 500000)}) comes off your taxable income. Send your rent and the tenancy agreement or a receipt; HR checks it.</p>
        ${p.annual_rent ? `<p>Rent for the year: <b>${pyHid(p.annual_rent)}</b> ${pcChip(p.rent_status === 'approved' ? 'ok' : p.rent_status === 'pending' ? 'pending' : 'rejected', { approved: 'Approved', pending: 'With HR', declined: 'Not approved' }[p.rent_status] || '')}${p.rent_note ? ` <small class="muted">${esc(p.rent_note)}</small>` : ''}</p>` : ''}
        <button class="btn" id="pyrent">${p.annual_rent ? 'Update my rent' : 'Send my rent'}</button></div></section>`;
  },
  bind(main) { pyEyeBind(main);
    main.addEventListener('click', e => { const b = e.target.closest('[data-ps]'); if (b) { const r = this.rows[+b.dataset.ps]; pcTry(() => pyPayslipPdf(r, { title: r.title, period: r.period }, { ytd: r.ytd, tpl: pyCfg().payslips?.default })); } });
    const r = $('#pyrent', main); if (r) r.onclick = () => pyRentForm(null, () => render({ quiet: true })); }
};

// ================================================================ Requisition: move approved overtime and expenses to payroll
(function () {
  ['expense', 'overtime'].forEach(kind => { const pg = RQ.pages[kind]; if (!pg) return; const load = pg.load, bind = pg.bind;
    pg.load = async function (rest, params) { let h = await load.call(this, rest, params);
      if (pcCan(`move-${kind === 'overtime' ? 'overtime-requisition' : 'expense-requisitions'}-to-payroll`)) h = h.replace('<button class="btn small primary" id="rqpay" disabled>', `<button class="btn small" id="rqtopay" disabled>${ico('pay')}Pay with payroll</button><button class="btn small primary" id="rqpay" disabled>`);
      return h; };
    pg.bind = function (main) { bind.call(this, main); const b = $('#rqtopay', main); if (!b) return;
      const tbl = 'rq_' + kind + 'requests'; const tick = () => { const s = pcSelected(tbl); b.disabled = !s.length; b.innerHTML = ico('pay') + (s.length ? `Pay ${s.length} with payroll` : 'Pay with payroll'); };
      main.addEventListener('change', () => setTimeout(tick, 0));
      b.onclick = async () => { const sel = pcSelected(tbl); const on = !sel.every(r => r.to_payroll);
        await pcTry(() => q(sb.rpc('hr_req_to_payroll', { p_ids: sel.map(r => r.id), p_on: on })), on ? `${plural(sel.length, 'request')} will be paid with the next payroll` : 'Taken off payroll'); pcRefresh(); }; };
  });
})();
