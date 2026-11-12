/* GANKCO Nest 3.0.7 — PeopleCore Reports & Analytics (HR admins): overview charts, the report library, report views with
   filters, charts and drill-down, the 3-step report builder, dashboards, scheduled reports (off until HR switches them on),
   the audit trail and settings. Staff see only the reports HR shares with them, under PeopleCore → Reports. */
'use strict';

PC_MODS.rep = { name: 'Reports & Analytics', icon: 'chart', desc: 'Staff charts, a library of ready-made reports, your own reports, dashboards and scheduled reports.',
  perms: ['view-reports', 'create-reports', 'schedule-reports', 'manage-report-settings', 'view-report-audit'], pages: {}, menu: [] };
const RP = PC_MODS.rep;
RP.menu = [['', 'Overview', 'home', ['view-reports']], ['library', 'Report library', 'plan', ['view-reports']], ['create', 'Create report', 'plus', ['create-reports']],
  ['dashboards', 'Dashboards', 'chart', ['view-reports']], ['schedules', 'Scheduled reports', 'clock', ['view-reports']], ['audit', 'Audit trail', 'audit', ['view-report-audit']],
  ['settings', 'Settings', 'gear', ['manage-report-settings']]];

const RP_MODS = [['company', 'Company', 'building'], ['hris', 'Employees', 'users'], ['leave', 'Leave', 'plan'], ['exit', 'Exit', 'out'], ['perf', 'Performance', 'target'],
  ['promo', 'Promotions & salary reviews', 'up'], ['req', 'Requisition', 'pay'], ['disc', 'Disciplinary', 'audit'], ['comp', 'Competency', 'cert'], ['survey', 'Surveys', 'chat'],
  ['onb', 'Onboarding & confirmation', 'user'], ['pay', 'Payroll', 'pay']];
const rpModName = k => (RP_MODS.find(m => m[0] === k) || [k, k])[1];

// ---------------------------------------------------------------- every field a report can show: [label, type]
const RP_F = {
  id: ['ID', 'text'], employee_id: ['Employee', 'text'], emp_no: ['Employee code', 'text'], name: ['Name', 'text'], first_name: ['First name', 'text'], last_name: ['Last name', 'text'], other_names: ['Other names', 'text'],
  work_email: ['Work email', 'text'], status: ['Status', 'text'], employee_status: ['Employee status', 'text'], personal_email: ['Personal email', 'text'], mobile: ['Mobile', 'text'], work_phone: ['Work phone', 'text'], address: ['Address', 'text'],
  gender: ['Gender', 'text'], date_of_birth: ['Date of birth', 'date'], age: ['Age', 'num'], age_band: ['Age band', 'text'], generation: ['Generation', 'text'], marital_status: ['Marital status', 'text'],
  nationality: ['Nationality', 'text'], state_of_origin: ['State of origin', 'text'], department: ['Department', 'text'], unit: ['Unit', 'text'], job_role: ['Job role', 'text'], job_family: ['Job family', 'text'],
  paygrade: ['Paygrade', 'text'], pay_group: ['Pay group', 'text'], contract_type: ['Contract type', 'text'], location: ['Location', 'text'], region: ['Region', 'text'], cost_centre: ['Cost centre', 'text'], tag: ['Tag', 'text'],
  line_manager: ['Line manager', 'text'], start_date: ['Start date', 'date'], year_joined: ['Year joined', 'text'], service_years: ['Years of service', 'num'], service_band: ['Length of service', 'text'],
  confirmation: ['Confirmation', 'text'], confirmation_due: ['Confirmation due', 'date'], confirmed_on: ['Confirmed on', 'date'], exit_date: ['Exit date', 'date'], exit_month: ['Month left', 'month'], exit_reason: ['Exit reason', 'text'],
  can_log_in: ['Can sign in to Nest', 'text'], profile_complete: ['Profile complete', 'pct'], profile_band: ['Profile completeness', 'text'], kin_name: ['Next of kin', 'text'], kin_relationship: ['Next of kin relationship', 'text'],
  kin_phone: ['Next of kin phone', 'text'], bank: ['Bank', 'text'], account_no: ['Account number', 'text'], account_name: ['Account name', 'text'], bvn: ['BVN', 'text'], nin: ['NIN', 'text'], tin: ['Tax ID (TIN)', 'text'],
  tax_state: ['PAYE state', 'text'], pfa: ['Pension fund (PFA)', 'text'], rsa_pin: ['RSA PIN', 'text'], gross_pay: ['Annual gross pay', 'money'], added_on: ['Added to PeopleCore', 'date'],
  // company
  job_familyname: ['Job family', 'text'], staff: ['Staff', 'num'], active: ['In use', 'text'], roles: ['Job roles', 'num'], code: ['Code', 'text'], locations: ['Locations', 'num'], type: ['Type', 'text'], parent: ['Part of', 'text'], head: ['Head', 'text'],
  // job history
  change: ['Change', 'text'], title: ['Title', 'text'], moved_to: ['Moved to', 'text'], from_date: ['From', 'date'], to_date: ['To', 'date'], note: ['Note', 'text'], by: ['By', 'text'],
  // leave
  leave_type: ['Leave type', 'text'], end_date: ['End date', 'date'], days: ['Days', 'num'], applied_on: ['Applied on', 'date'], approved_on: ['Approved on', 'date'], month: ['Month', 'month'],
  relief_officer: ['Relief officer', 'text'], on_leave_today: ['On leave today', 'text'], year: ['Year', 'text'], entitled: ['Entitled', 'num'], carried: ['Carried over', 'num'], taken: ['Taken', 'num'], pending: ['Waiting', 'num'], left: ['Left', 'num'],
  // exit
  mode: ['Type of exit', 'text'], reasons: ['Reasons', 'text'], request_date: ['Request date', 'date'], last_day: ['Last day', 'date'], initiated_by: ['Started by', 'text'],
  activity: ['Activity', 'text'], owner: ['Done by', 'text'], due_date: ['Due date', 'date'], completed_by: ['Completed by', 'text'], completed_on: ['Completed on', 'date'], exit_status: ['Exit status', 'text'],
  // performance
  cycle: ['Cycle', 'text'], period: ['Period', 'text'], manager: ['Manager', 'text'], stage: ['Stage', 'text'], objectives_score: ['Objectives score', 'num'], core_values_score: ['Core values score', 'num'],
  final_score: ['Final score', 'num'], rating: ['Rating', 'text'], potential: ['Potential', 'text'], recommendation: ['Recommendation', 'text'], completed: ['Completed', 'text'], started_on: ['Started on', 'date'], revealed_on: ['Revealed on', 'date'],
  objective: ['Objective', 'text'], perspective: ['Perspective', 'text'], weight: ['Weight %', 'num'], target: ['Target', 'num'], actual: ['Actual', 'num'], progress: ['Progress %', 'num'], plan_status: ['Plan status', 'text'],
  achievement: ['Achievement', 'text'], category: ['Category', 'text'], given_by: ['Given by', 'text'], verified_by: ['Verified by', 'text'],
  // promotions
  from_role: ['From job role', 'text'], to_role: ['To job role', 'text'], from_grade: ['From paygrade', 'text'], to_grade: ['To paygrade', 'text'], from_department: ['From department', 'text'], to_department: ['To department', 'text'],
  from_salary: ['Salary before', 'money'], to_salary: ['Salary after', 'money'], effective_date: ['Effective date', 'date'], raised_by: ['Raised by', 'text'], raised_on: ['Raised on', 'date'], past_record: ['Past record', 'text'],
  // requisition
  policy: ['Policy', 'text'], request: ['Request', 'text'], amount: ['Amount', 'money'], currency: ['Currency', 'text'], hours: ['Hours', 'num'], paid: ['Paid', 'text'], paid_on: ['Paid on', 'date'],
  // disciplinary
  case_no: ['Case', 'text'], offence: ['Offence', 'text'], level: ['Level', 'num'], anonymous: ['Anonymous', 'text'], reported_on: ['Reported on', 'date'], closed_on: ['Closed on', 'date'], reported_by: ['Reported by', 'text'],
  people: ['People involved', 'num'], from_whistle: ['From a whistle', 'text'], subject: ['Subject', 'text'], issued_on: ['Issued on', 'date'], response_due: ['Response due', 'date'], responded: ['Responded', 'text'],
  responded_on: ['Responded on', 'date'], overdue: ['Overdue', 'text'], issued_by: ['Issued by', 'text'], sanction: ['Sanction', 'text'],
  // competency
  competency: ['Competency', 'text'], required: ['Level needed', 'num'], assessed: ['Level assessed', 'num'], gap: ['Gap', 'num'], importance: ['Importance', 'text'], result: ['Result', 'text'], assessed_on: ['Assessed on', 'date'],
  // surveys
  survey: ['Survey', 'text'], survey_status: ['Survey status', 'text'], answered: ['Answered', 'text'], sent_on: ['Sent on', 'date'], answered_on: ['Answered on', 'date'],
  // onboarding & confirmation
  days_to_due: ['Days to due date', 'num'], due: ['When due', 'text'], review: ['Confirmation review', 'text'], tasks: ['Tasks', 'num'], tasks_done: ['Tasks done', 'num'],
  // payroll
  payroll: ['Payroll', 'text'], run_type: ['Run', 'text'], gross: ['Gross', 'money'], pension_employee: ['Pension (staff)', 'money'], pension_company: ['Pension (company)', 'money'], tax: ['Tax', 'money'],
  other_deductions: ['Other deductions', 'money'], net: ['Net', 'money'], cost_to_company: ['Cost to the company', 'money']
};
const rpL = k => (RP_F[k] || [String(k).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())])[0];
const rpT = k => (RP_F[k] || [0, 'text'])[1];
const RP_EMP = ['emp_no', 'name', 'department', 'unit', 'job_role', 'paygrade', 'pay_group', 'location', 'region', 'gender', 'line_manager', 'employee_status'];
const RP_EMPF = ['department', 'location', 'pay_group', 'paygrade', 'job_role', 'gender'];

// ---------------------------------------------------------------- what reports can be built on (the builder's "starting data")
const RP_SRC = {
  job_roles: { l: 'Job roles', mod: 'company', groups: [['Job roles', ['name', 'department', 'job_family', 'staff', 'active']]], filters: ['department', 'job_family', 'active'] },
  job_families: { l: 'Job families', mod: 'company', groups: [['Job families', ['name', 'roles', 'staff']]], filters: [] },
  cost_centres: { l: 'Cost centres', mod: 'company', groups: [['Cost centres', ['name', 'code', 'staff']]], filters: [] },
  regions: { l: 'Regions', mod: 'company', groups: [['Regions', ['name', 'locations', 'staff']]], filters: [] },
  locations: { l: 'Locations', mod: 'company', groups: [['Locations', ['name', 'region', 'staff']]], filters: ['region'] },
  org: { l: 'Departments and units', mod: 'company', groups: [['Departments and units', ['name', 'type', 'parent', 'code', 'head', 'staff', 'active']]], filters: ['type', 'parent', 'active'] },
  employees: { l: 'Employees', mod: 'hris', date: ['start_date', 'exit_date', 'confirmation_due', 'confirmed_on', 'date_of_birth', 'added_on'],
    filters: ['status', 'department', 'location', 'pay_group', 'paygrade', 'job_role', 'contract_type', 'gender', 'confirmation', 'region'],
    groups: [['Employee', ['emp_no', 'name', 'first_name', 'last_name', 'other_names', 'work_email', 'status']],
      ['Job and contract', ['department', 'unit', 'job_role', 'job_family', 'paygrade', 'pay_group', 'contract_type', 'location', 'region', 'cost_centre', 'tag', 'start_date', 'year_joined', 'service_years', 'service_band']],
      ['Confirmation', ['confirmation', 'confirmation_due', 'confirmed_on']], ['Line manager', ['line_manager']],
      ['Biodata', ['gender', 'date_of_birth', 'age', 'age_band', 'generation', 'marital_status', 'nationality', 'state_of_origin']],
      ['Contact and address', ['personal_email', 'mobile', 'work_phone', 'address']], ['Next of kin', ['kin_name', 'kin_relationship', 'kin_phone']],
      ['Bank and tax', ['bank', 'account_no', 'account_name', 'bvn', 'nin', 'tin', 'tax_state']], ['Pension and pay', ['pfa', 'rsa_pin', 'gross_pay']],
      ['Profile and access', ['profile_complete', 'profile_band', 'can_log_in', 'added_on']], ['Exit', ['exit_date', 'exit_month', 'exit_reason']]] },
  job_history: { l: 'Transfer and job history', mod: 'hris', date: ['from_date', 'to_date'], filters: ['change', ...RP_EMPF], groups: [['Job changes', ['change', 'title', 'moved_to', 'from_date', 'to_date', 'note', 'by']], ['Employee details', RP_EMP]] },
  leave: { l: 'Leave requests', mod: 'leave', date: ['start_date', 'end_date', 'applied_on', 'approved_on'], filters: ['status', 'leave_type', 'on_leave_today', ...RP_EMPF],
    groups: [['Leave', ['leave_type', 'start_date', 'end_date', 'days', 'status', 'applied_on', 'approved_on', 'month', 'relief_officer', 'on_leave_today']], ['Employee details', RP_EMP]] },
  leave_balances: { l: 'Leave balances', mod: 'leave', filters: ['leave_type', ...RP_EMPF], groups: [['Balances', ['leave_type', 'year', 'entitled', 'carried', 'taken', 'pending', 'left']], ['Employee details', RP_EMP]] },
  exits: { l: 'Exit requests', mod: 'exit', date: ['request_date', 'last_day'], filters: ['status', 'mode', 'initiated_by', ...RP_EMPF],
    groups: [['Exits', ['mode', 'reasons', 'request_date', 'last_day', 'status', 'initiated_by', 'month']], ['Employee details', RP_EMP]] },
  exit_tasks: { l: 'Exit activities', mod: 'exit', date: ['due_date', 'completed_on'], filters: ['status', 'owner', 'exit_status', ...RP_EMPF],
    groups: [['Activities', ['activity', 'owner', 'due_date', 'status', 'completed_by', 'completed_on', 'exit_status']], ['Employee details', RP_EMP]] },
  appraisals: { l: 'Appraisals', mod: 'perf', date: ['started_on', 'revealed_on'], filters: ['cycle', 'period', 'stage', 'rating', 'completed', ...RP_EMPF],
    groups: [['Appraisals', ['cycle', 'period', 'manager', 'stage', 'objectives_score', 'core_values_score', 'final_score', 'rating', 'potential', 'recommendation', 'completed', 'started_on', 'revealed_on']], ['Employee details', RP_EMP]] },
  objectives: { l: 'Objectives', mod: 'perf', date: ['due_date'], filters: ['cycle', 'perspective', 'plan_status', ...RP_EMPF],
    groups: [['Objectives', ['cycle', 'objective', 'perspective', 'weight', 'target', 'actual', 'progress', 'due_date', 'plan_status']], ['Employee details', RP_EMP]] },
  achievements: { l: 'Exceptional achievements', mod: 'perf', date: ['added_on'], filters: ['status', 'category', ...RP_EMPF],
    groups: [['Achievements', ['achievement', 'category', 'status', 'given_by', 'verified_by', 'added_on']], ['Employee details', RP_EMP]] },
  promotions: { l: 'Promotions and salary reviews', mod: 'promo', date: ['effective_date', 'raised_on'], filters: ['type', 'status', 'to_grade', 'past_record', ...RP_EMPF],
    groups: [['Changes', ['type', 'status', 'from_role', 'to_role', 'from_grade', 'to_grade', 'from_department', 'to_department', 'effective_date', 'raised_by', 'raised_on', 'past_record']], ['Salary', ['from_salary', 'to_salary']], ['Employee details', RP_EMP]] },
  requisitions: { l: 'Requisitions', mod: 'req', date: ['raised_on', 'paid_on'], filters: ['type', 'policy', 'category', 'status', 'paid', ...RP_EMPF],
    groups: [['Requisitions', ['type', 'policy', 'category', 'request', 'amount', 'currency', 'hours', 'status', 'paid', 'raised_on', 'paid_on', 'month']], ['Employee details', RP_EMP]] },
  cases: { l: 'Cases, grievances and whistles', mod: 'disc', date: ['reported_on', 'closed_on'], filters: ['type', 'status', 'offence', 'anonymous', 'from_whistle', 'department'],
    groups: [['Cases', ['case_no', 'type', 'title', 'offence', 'level', 'status', 'anonymous', 'reported_on', 'closed_on', 'reported_by', 'people', 'from_whistle', 'department']]] },
  queries: { l: 'Queries', mod: 'disc', date: ['issued_on', 'response_due', 'responded_on'], filters: ['status', 'responded', 'overdue', ...RP_EMPF],
    groups: [['Queries', ['case_no', 'subject', 'issued_on', 'response_due', 'responded', 'responded_on', 'overdue', 'status', 'issued_by']], ['Employee details', RP_EMP]] },
  sanctions: { l: 'Sanctions', mod: 'disc', date: ['issued_on', 'from_date', 'to_date'], filters: ['sanction', 'status', 'past_record', ...RP_EMPF],
    groups: [['Sanctions', ['case_no', 'sanction', 'status', 'from_date', 'to_date', 'issued_on', 'issued_by', 'past_record']], ['Employee details', RP_EMP]] },
  comp_gaps: { l: 'Competency levels and gaps', mod: 'comp', date: ['assessed_on'], filters: ['competency', 'category', 'result', 'importance', ...RP_EMPF],
    groups: [['Competencies', ['competency', 'category', 'required', 'assessed', 'gap', 'importance', 'result', 'assessed_on']], ['Employee details', RP_EMP]] },
  comp_assessments: { l: 'Competency assessments', mod: 'comp', date: ['started_on', 'completed_on'], filters: ['stage', 'past_record', ...RP_EMPF],
    groups: [['Assessments', ['stage', 'started_on', 'completed_on', 'past_record']], ['Employee details', RP_EMP]] },
  survey_recipients: { l: 'Survey recipients', mod: 'survey', date: ['sent_on', 'answered_on', 'due_date'], filters: ['survey', 'answered', 'survey_status', 'anonymous', 'department'],
    groups: [['Surveys', ['survey', 'survey_status', 'anonymous', 'answered', 'sent_on', 'answered_on', 'due_date']], ['Employee details', RP_EMP]] },
  probation: { l: 'Probation and confirmation', mod: 'onb', date: ['start_date', 'confirmation_due'], filters: ['due', 'review', ...RP_EMPF],
    groups: [['Probation', ['start_date', 'confirmation_due', 'days_to_due', 'due', 'review']], ['Employee details', RP_EMP]] },
  onboarding: { l: 'Onboarding', mod: 'onb', date: ['start_date', 'completed_on'], filters: ['status', ...RP_EMPF],
    groups: [['Onboarding', ['start_date', 'status', 'tasks', 'tasks_done', 'completed_on']], ['Employee details', RP_EMP]] },
  pay_lines: { l: 'Closed payrolls', mod: 'pay', perm: 'view-payroll', filters: ['period', 'run_type', ...RP_EMPF],
    groups: [['Pay', ['payroll', 'period', 'run_type', 'gross', 'pension_employee', 'pension_company', 'tax', 'other_deductions', 'net', 'cost_to_company']], ['Employee details', RP_EMP]] }
};
const rpSrcOk = k => RP_SRC[k] && (!RP_SRC[k].perm || pcCan(RP_SRC[k].perm));
const rpFields = k => RP_SRC[k] ? RP_SRC[k].groups.flatMap(g => g[1]) : [];

// ---------------------------------------------------------------- formatting
// an axis label that wraps onto two lines when it is long
function rpTick(x, y, s) {
  s = String(s ?? ''); if (s.length <= 13) return `<text x="${x}" y="${y}" text-anchor="middle" class="rp-lab">${esc(s)}</text>`;
  const w = s.split(' '); let a = '', i = 0; while (i < w.length && (a + ' ' + w[i]).trim().length <= Math.max(10, Math.ceil(s.length / 2))) a = (a + ' ' + w[i++]).trim();
  if (!a) { a = w[0]; i = 1; } let b = w.slice(i).join(' '); if (b.length > 16) b = b.slice(0, 15) + '…';
  return `<text x="${x}" y="${y}" text-anchor="middle" class="rp-lab"><tspan x="${x}">${esc(a)}</tspan><tspan x="${x}" dy="13">${esc(b)}</tspan></text>`;
}
const RP_PAL = ['#E8552C', '#2257C9', '#217A4B', '#6B46C1', '#8A5A00', '#1D6B78', '#C93100', '#8E9196', '#B3261E', '#3B7DD8'];
const rpMonth = v => /^\d{4}-\d{2}$/.test(v || '') ? new Date(v + '-01T12:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : v;
function rpFmt(k, v, money) {
  if (v == null || v === '') return '';
  const t = rpT(k);
  if (t === 'date') return fd(v);
  if (t === 'month') return rpMonth(v);
  if (t === 'money' || money) return pcMoney(v);
  if (t === 'pct') return v + '%';
  if (t === 'num' && typeof v === 'number') return v.toLocaleString('en-NG', { maximumFractionDigits: 2 });
  return String(v);
}
const rpLabel = (k, v) => rpT(k) === 'month' ? rpMonth(v) : v;
const rpNum = (n, money) => money ? pcMoney(n) : (+n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });
const rpMLabel = m => m.l || (m.fn === 'sum' ? 'Total ' + rpL(m.f).toLowerCase() : m.fn === 'avg' ? 'Average ' + rpL(m.f).toLowerCase() : m.fn === 'distinct' ? 'Number of ' + rpL(m.f).toLowerCase() : 'Count');
const rpMeasures = def => def.measures?.length ? def.measures : [{ fn: 'count' }];
const rpMoneyM = (def, i) => { const m = rpMeasures(def)[i]; return m && (m.fn === 'sum' || m.fn === 'avg') && (rpT(m.f) === 'money' || def.money && m.f !== 'employee_id'); };
function rpSort(rows, def) {
  const o = def.order;
  if (Array.isArray(o)) { const ix = v => { const i = o.indexOf(v); return i < 0 ? 999 : i; }; return [...rows].sort((a, b) => ix(a.k1) - ix(b.k1) || String(a.k2 || '').localeCompare(String(b.k2 || ''))); }
  if (o === 'label') return [...rows].sort((a, b) => String(a.k1).localeCompare(String(b.k1), undefined, { numeric: true }) || String(a.k2 || '').localeCompare(String(b.k2 || '')));
  return [...rows].sort((a, b) => (+b.v[0] || 0) - (+a.v[0] || 0) || String(a.k1).localeCompare(String(b.k1)));
}
// a 1-dimension list of [label, value] for charts; 2 dimensions keep k2
const rpSeries = (res, def) => rpSort(res.rows || [], def);

// ---------------------------------------------------------------- charts (SVG, clickable for drill-down)
function rpChart(def, res, o = {}) {
  const rows = rpSeries(res, def); const g = def.group || [];
  if (!rows.length) return '<div class="rp-empty">No data for these filters.</div>';
  const money = rpMoneyM(def, 0); const pct = o.pct; const tot = rows.reduce((a, r) => a + (+r.v[0] || 0), 0) || 1;
  const val = r => pct ? Math.round((+r.v[0] || 0) / tot * 1000) / 10 + '%' : rpNum(r.v[0], money);
  const type = o.type || def.chart || 'bar';
  const lab = r => esc(rpLabel(g[0], r.k1));
  if (g.length > 1 || type === 'stacked') {
    // stacked columns: k1 along the bottom, k2 stacked
    const ks1 = [...new Set(rows.map(r => r.k1))], ks2 = [...new Set(rows.map(r => r.k2 ?? ''))];
    const cell = (a, b) => rows.find(r => r.k1 === a && (r.k2 ?? '') === b);
    const sums = ks1.map(a => ks2.reduce((s, b) => s + (+cell(a, b)?.v[0] || 0), 0)); const max = Math.max(1, ...sums);
    const W = Math.max(420, ks1.length * 64), H = 220, bw = W / ks1.length;
    return `<div class="rp-chart"><svg class="rp-svg" viewBox="0 0 ${W} ${H + 40}" role="img" aria-label="${esc(o.title || 'Chart')}"><line x1="0" x2="${W}" y1="${H}" y2="${H}" class="rp-base"/>
      ${ks1.map((a, i) => { let y = H; const x = i * bw + bw * .2, w = bw * .6;
        return ks2.map((b, j) => { const c = cell(a, b); if (!c) return ''; const h = (+c.v[0] || 0) / max * (H - 24); y -= h;
          return `<rect x="${x}" y="${y}" width="${w}" height="${Math.max(h, 0)}" fill="${RP_PAL[j % RP_PAL.length]}" class="rp-hit" data-k1="${esc(a)}" data-k2="${esc(b)}"><title>${esc(rpLabel(g[0], a))} · ${esc(rpLabel(g[1], b))}: ${val(c)}</title></rect>`; }).join('')
          + `<text x="${x + w / 2}" y="${y - 5}" text-anchor="middle" class="rp-val">${rpNum(sums[i], money)}</text>${rpTick(x + w / 2, H + 16, rpLabel(g[0], a))}`; }).join('')}</svg>
      <div class="rp-legend">${ks2.map((b, j) => `<span><i style="background:${RP_PAL[j % RP_PAL.length]}"></i>${esc(rpLabel(g[1], b) || 'Not set')}</span>`).join('')}</div></div>`;
  }
  if (type === 'donut' || type === 'pie') {
    const R = 74, r0 = type === 'donut' ? 46 : 0, cx = 90, cy = 90; let a0 = -Math.PI / 2;
    const arcs = rows.map((r, i) => { const f = (+r.v[0] || 0) / tot; const a1 = a0 + f * Math.PI * 2; const big = a1 - a0 > Math.PI ? 1 : 0;
      const p = (rad, ang) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)].map(n => n.toFixed(2)).join(' ');
      const d = f >= .9999 ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy}` + (r0 ? ` M ${cx - r0} ${cy} A ${r0} ${r0} 0 1 0 ${cx + r0} ${cy} A ${r0} ${r0} 0 1 0 ${cx - r0} ${cy}` : '')
        : `M ${p(R, a0)} A ${R} ${R} 0 ${big} 1 ${p(R, a1)} ` + (r0 ? `L ${p(r0, a1)} A ${r0} ${r0} 0 ${big} 0 ${p(r0, a0)} Z` : `L ${cx} ${cy} Z`);
      a0 = a1; return `<path d="${d}" fill="${RP_PAL[i % RP_PAL.length]}" fill-rule="evenodd" class="rp-hit" data-k1="${esc(r.k1)}"><title>${lab(r)}: ${val(r)}</title></path>`; });
    return `<div class="rp-chart rp-donut"><svg class="rp-svg" viewBox="0 0 180 180" role="img" aria-label="${esc(o.title || 'Chart')}">${arcs.join('')}${r0 ? `<text x="90" y="88" text-anchor="middle" class="rp-dn">${rpNum(tot === 1 && !rows.length ? 0 : rows.reduce((a, r) => a + (+r.v[0] || 0), 0), money)}</text><text x="90" y="106" text-anchor="middle" class="rp-dl">total</text>` : ''}</svg>
      <ul class="rp-legend v">${rows.map((r, i) => `<li class="rp-hit" data-k1="${esc(r.k1)}"><i style="background:${RP_PAL[i % RP_PAL.length]}"></i><span>${lab(r)}</span><b>${val(r)}</b></li>`).join('')}</ul></div>`;
  }
  if (type === 'column' || type === 'line') {
    const max = Math.max(1, ...rows.map(r => +r.v[0] || 0)); const W = Math.max(420, rows.length * 56), H = 210, bw = W / rows.length;
    const pts = rows.map((r, i) => [i * bw + bw / 2, H - (+r.v[0] || 0) / max * (H - 26)]);
    return `<div class="rp-chart"><svg class="rp-svg" viewBox="0 0 ${W} ${H + 40}" role="img" aria-label="${esc(o.title || 'Chart')}"><line x1="0" x2="${W}" y1="${H}" y2="${H}" class="rp-base"/>
      ${type === 'line' ? `<polyline points="${pts.map(p => p.join(',')).join(' ')}" class="rp-line"/>` : ''}
      ${rows.map((r, i) => { const h = H - pts[i][1]; const x = i * bw + bw * .2, w = bw * .6;
        return `<g class="rp-hit" data-k1="${esc(r.k1)}">${type === 'line' ? `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="4.5" class="rp-dot"/>` : `<rect x="${x}" y="${H - h}" width="${w}" height="${Math.max(h, (+r.v[0] ? 2 : 0))}" rx="2" fill="${RP_PAL[0]}"/>`}
          <text x="${pts[i][0]}" y="${pts[i][1] - 7}" text-anchor="middle" class="rp-val">${val(r)}</text>${rpTick(pts[i][0], H + 16, rpLabel(g[0], r.k1))}<title>${lab(r)}: ${val(r)}</title></g>`; }).join('')}</svg></div>`;
  }
  // horizontal bars
  const max = Math.max(1, ...rows.map(r => +r.v[0] || 0));
  return `<ul class="rp-bars">${rows.map((r, i) => `<li class="rp-hit" data-k1="${esc(r.k1)}" title="${lab(r)}: ${val(r)}"><span class="rp-bl">${lab(r)}</span><span class="rp-bt"><i style="width:${Math.max(1.5, (+r.v[0] || 0) / max * 100)}%;background:${RP_PAL[i % RP_PAL.length]}"></i></span><span class="rp-bv">${val(r)}</span></li>`).join('')}</ul>`;
}

// ---------------------------------------------------------------- the result: a table for groups (or a pivot) or rows
function rpTableCols(def, res) {
  const g = def.group || []; const ms = rpMeasures(def);
  if (res.mode === 'group') {
    const tot = (res.rows || []).reduce((a, r) => a + (+r.v[0] || 0), 0) || 1;
    return [...g.map((f, i) => ({ k: 'k' + (i + 1), l: rpL(f), v: r => rpLabel(f, r['k' + (i + 1)]) })),
      ...ms.map((m, i) => ({ k: 'm' + i, l: rpMLabel(m), cls: 'num', v: r => +r.v[i] || 0, f: r => `<a href="#" class="rp-drill" data-k1="${esc(r.k1)}" data-k2="${esc(r.k2 ?? '')}">${rpNum(r.v[i], rpMoneyM(def, i))}</a>`, x: r => +r.v[i] || 0 })),
      ...(ms.length === 1 && g.length === 1 ? [{ k: 'pct', l: 'Share', cls: 'num', v: r => Math.round((+r.v[0] || 0) / tot * 1000) / 10, f: r => Math.round((+r.v[0] || 0) / tot * 1000) / 10 + '%' }] : [])];
  }
  const keys = (def.cols?.length ? def.cols : Object.keys(res.rows?.[0] || {}).filter(k => !['id', 'employee_id'].includes(k))).filter(k => (res.rows || []).some(r => k in r) || !res.rows?.length);
  return keys.map(k => ({ k, l: rpL(k), cls: ['num', 'money', 'pct'].includes(rpT(k)) ? 'num' : '', v: r => r[k] ?? '', f: r => k === 'name' && r.employee_id && pcCan('view-employees') ? `<a href="#/people/admin/hris/employee/${r.employee_id}">${esc(r.name ?? '')}</a>` : esc(rpFmt(k, r[k])), x: r => ['date', 'month'].includes(rpT(k)) ? rpFmt(k, r[k]) : r[k] ?? '' }));
}
function rpResultHtml(id, def, res, o = {}) {
  const pii = res.pii_hidden ? `<div class="notice rp-pii">${ico('lock')}Private details (bank, pay, IDs and contacts) are left out: they show only to people allowed to see private staff data.</div>` : '';
  const trunc = res.truncated ? '<div class="notice warn">Only the first 5,000 rows are shown. Narrow the filters to see the rest.</div>' : '';
  if (res.mode === 'group' && (def.group || []).length === 2) {
    // a pivot: k1 down the side, k2 across
    const rows = rpSeries(res, def); const ks1 = [...new Set(rows.map(r => r.k1))], ks2 = [...new Set(rows.map(r => r.k2 ?? ''))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    const cell = (a, b) => rows.find(r => r.k1 === a && (r.k2 ?? '') === b); const money = rpMoneyM(def, 0); const g = def.group;
    return pii + `<section class="panel"><div class="tablewrap"><table class="t rp-pivot"><thead><tr><th>${esc(rpL(g[0]))}</th>${ks2.map(b => `<th class="num">${esc(rpLabel(g[1], b))}</th>`).join('')}<th class="num">Total</th></tr></thead>
      <tbody>${ks1.map(a => `<tr><td>${esc(rpLabel(g[0], a))}</td>${ks2.map(b => { const c = cell(a, b); return `<td class="num">${c ? `<a href="#" class="rp-drill" data-k1="${esc(a)}" data-k2="${esc(b)}">${rpNum(c.v[0], money)}</a>` : '<span class="muted">·</span>'}</td>`; }).join('')}
        <td class="num"><b>${rpNum(ks2.reduce((s, b) => s + (+cell(a, b)?.v[0] || 0), 0), money)}</b></td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td>${ks2.map(b => `<td class="num">${rpNum(ks1.reduce((s, a) => s + (+cell(a, b)?.v[0] || 0), 0), money)}</td>`).join('')}<td class="num">${rpNum(rows.reduce((s, r) => s + (+r.v[0] || 0), 0), money)}</td></tr></tfoot></table></div></section>`;
  }
  const cols = rpTableCols(def, res);
  const rows = res.mode === 'group' ? rpSeries(res, def) : res.rows || [];
  const total = res.mode === 'group' ? rpMeasures(def).map((m, i) => rows.reduce((a, r) => a + (+r.v[i] || 0), 0)) : null;
  return pii + trunc + pcTable(id, cols, rows, { noun: res.mode === 'group' ? 'group' : 'row', search: res.mode !== 'group' || rows.length > 8, per: o.per || 60, empty: 'Nothing matches these filters.',
      actions: total && rows.length ? `<span class="rp-total">${rpMeasures(def).map((m, i) => `${esc(rpMLabel(m))}: <b>${rpNum(total[i], rpMoneyM(def, i))}</b>`).join(' · ')}</span>` : '' }) ;
}

// ---------------------------------------------------------------- exports (Excel, CSV, PDF), each written to the audit trail
function rpExportRows(def, res) {
  if (res.mode === 'group') {
    const g = def.group || []; const ms = rpMeasures(def); const rows = rpSeries(res, def);
    const cols = [...g.map((f, i) => ({ k: 'k' + (i + 1), l: rpL(f), w: 28 })), ...ms.map((m, i) => ({ k: 'm' + i, l: rpMLabel(m), w: 18 }))];
    return { cols, rows: rows.map(r => Object.fromEntries([...g.map((f, i) => ['k' + (i + 1), rpLabel(f, r['k' + (i + 1)])]), ...ms.map((m, i) => ['m' + i, +r.v[i] || 0])])) };
  }
  const keys = rpTableCols(def, res).map(c => c.k);
  return { cols: keys.map(k => ({ k, l: rpL(k), w: Math.max(12, Math.min(40, rpL(k).length + 6)) })), rows: (res.rows || []).map(r => Object.fromEntries(keys.map(k => [k, ['date', 'month'].includes(rpT(k)) ? rpFmt(k, r[k]) : r[k] ?? '']))) };
}
async function rpExport(rep, def, res, kind, filt) {
  const { cols, rows } = rpExportRows(def, res); const base = `${rep.name} ${localISO(0)}`.replace(/[\\/:*?"<>|]/g, '-');
  if (kind === 'xlsx') await pcXlsx(base + '.xlsx', cols, rows, { sheet: rep.name.slice(0, 30), notes: [['Report', rep.name], ['Run on', pdfStamp(Date.now())], ['Filters', filt || 'None'], ...(res.pii_hidden ? [['Private details', 'Left out: you can’t see private staff data']] : [])] });
  else if (kind === 'csv') pcCsv(base + '.csv', cols.map(c => ({ k: c.k, l: c.l })), rows);
  else await rpWithProgress('Making the PDF…', () => brandPdf({ file: base + '.pdf', title: rep.name, subtitle: rep.description || '', orientation: cols.length > 6 ? 'landscape' : 'portrait',
    meta: [['Filters', filt || 'None'], ['Rows', String(rows.length)]],
    sections: [{ heading: rep.name, columns: cols.map(c => ({ header: c.l, dataKey: c.k, align: /^m\d/.test(c.k) || ['num', 'money', 'pct'].includes(rpT(c.k)) ? 'right' : 'left' })),
      rows: rows.map(r => Object.fromEntries(cols.map(c => [c.k, typeof r[c.k] === 'number' ? rpNum(r[c.k], /^m\d/.test(c.k) ? rpMoneyM(def, +c.k.slice(1)) : rpT(c.k) === 'money') : r[c.k]]))) }] }));
  if (rep.id) sb.rpc('hr_rep_log', { p_id: rep.id, p_action: 'exported', p_detail: { format: kind, rows: rows.length, filters: filt || '' } }).then(() => { }, () => { });
}
// a progress overlay for downloads that take a moment
async function rpWithProgress(text, fn) { return typeof withProgress === 'function' ? withProgress(text, fn) : fn(); }

// ---------------------------------------------------------------- a small action menu (Action ▾)
function rpMenu(btn, items) {
  $$('.rp-pop').forEach(x => x.remove());
  const m = document.createElement('div'); m.className = 'rp-pop'; m.setAttribute('role', 'menu');
  m.innerHTML = items.filter(Boolean).map(([k, l, ic, danger]) => `<button type="button" role="menuitem" data-k="${k}" class="${danger ? 'bad' : ''}">${ic ? ico(ic) : ''}${esc(l)}</button>`).join('');
  document.body.appendChild(m); const r = btn.getBoundingClientRect();
  m.style.top = Math.round(Math.min(r.bottom + 6, innerHeight - m.offsetHeight - 8) + scrollY) + 'px'; m.style.left = Math.round(Math.max(8, r.right - m.offsetWidth) + scrollX) + 'px';
  return new Promise(res => {
    const close = v => { m.remove(); document.removeEventListener('click', away, true); document.removeEventListener('keydown', key); res(v); };
    const away = e => { if (!m.contains(e.target)) close(null); }; const key = e => { if (e.key === 'Escape') close(null); };
    setTimeout(() => { document.addEventListener('click', away, true); document.addEventListener('keydown', key); }, 0);
    m.onclick = e => { const b = e.target.closest('[data-k]'); if (b) close(b.dataset.k); };
  });
}

// ---------------------------------------------------------------- people picker (search + ticks)
function rpPeopleHtml(sel = []) {
  const s = new Set(sel.map(Number)); const list = S.hr.dir.filter(c => c.status !== 'exited');
  return `<div class="rp-people"><input type="search" placeholder="Search people" data-pq><div class="rp-pchips" data-pchips></div>
    <ul class="rp-plist">${list.map(c => `<li data-pn="${esc((c.name + ' ' + (c.title || '') + ' ' + (c.unit || '')).toLowerCase())}"><label class="check"><input type="checkbox" data-pid="${c.id}" ${s.has(c.id) ? 'checked' : ''}> ${pcPerson(c, esc([c.title, c.unit].filter(Boolean).join(' · ')) + (c.profile_id ? '' : ' · <i class="rp-nologin">no Nest sign-in yet</i>'))}</label></li>`).join('')}</ul></div>`;
}
function rpPeopleBind(root) {
  const q_ = $('[data-pq]', root), chips = $('[data-pchips]', root);
  const draw = () => { const on = $$('[data-pid]:checked', root); chips.innerHTML = on.length ? on.map(i => `<span class="chip ok">${esc(pcName(+i.dataset.pid))}</span>`).join('') : '<span class="muted">Nobody chosen yet</span>'; };
  q_.oninput = () => { const t = q_.value.trim().toLowerCase(); $$('[data-pn]', root).forEach(li => li.hidden = t && !li.dataset.pn.includes(t)); };
  root.addEventListener('change', e => { if (e.target.matches('[data-pid]')) draw(); }); draw();
  return () => $$('[data-pid]:checked', root).map(i => +i.dataset.pid);
}

// ---------------------------------------------------------------- shared state
async function rpCfgLoad(force) { if (!S.pc.repCfg || force) S.pc.repCfg = await q(sb.rpc('hr_rep_cfg')); return S.pc.repCfg; }
async function rpList(force) { if (!S.pc.repList || force || Date.now() - (S.pc.repListAt || 0) > 20000) { S.pc.repList = await q(sb.rpc('hr_rep_list')); S.pc.repListAt = Date.now(); } return S.pc.repList; }
const rpInvalidate = () => { S.pc.repList = null; };
const rpByCode = c => (S.pc.repList || []).find(r => r.code === c);

// ---------------------------------------------------------------- one report on a page (admin view and the shared view)
// filters: date range on the report's date field, one select per filter field, and a search for lists
function rpFilterBar(def, res, st) {
  const src = RP_SRC[def.src] || {}; const dates = src.date || []; const fs = (src.filters || []).filter(f => res.facets?.[f]?.length > 1 || st.where?.[f]);
  return `<div class="rp-filters">${dates.length ? `<label class="rp-f"><span>Dates by</span><select data-df>${dates.map(d => opt(d, rpL(d), st.date || def.date || dates[0])).join('')}</select></label>
      <label class="rp-f"><span>From</span><input type="date" data-from value="${esc(st.from || '')}"></label><label class="rp-f"><span>To</span><input type="date" data-to value="${esc(st.to || '')}"></label>` : ''}
    ${fs.map(f => `<label class="rp-f"><span>${esc(rpL(f))}</span><select data-wf="${f}"><option value="">All</option>${(res.facets?.[f] || []).map(v => opt(v, rpLabel(f, v), st.where?.[f] || '')).join('')}</select></label>`).join('')}
    ${dates.length || fs.length ? `<button type="button" class="btn small quiet" data-clear ${st.from || st.to || Object.values(st.where || {}).some(Boolean) ? '' : 'hidden'}>Clear filters</button>` : ''}</div>`;
}
const rpOpts = (def, st, extra = {}) => ({ from: st.from || null, to: st.to || null, date: st.date || def.date || RP_SRC[def.src]?.date?.[0] || null,
  where: Object.entries(st.where || {}).filter(([, v]) => v).map(([f, v]) => ({ f, op: 'eq', v })), facets: RP_SRC[def.src]?.filters || [], ...extra });
const rpFiltText = (def, st) => [st.from || st.to ? `${rpL(st.date || def.date || '')} ${st.from ? 'from ' + fd(st.from) : ''} ${st.to ? 'to ' + fd(st.to) : ''}` : '',
  ...Object.entries(st.where || {}).filter(([, v]) => v).map(([f, v]) => `${rpL(f)}: ${rpLabel(f, v)}`)].filter(Boolean).join(' · ');

function rpReportHtml(rep, def, res, st, o = {}) {
  const grouped = res.mode === 'group'; const tab = grouped ? (st.tab || (def.chart && def.chart !== 'none' ? 'chart' : 'table')) : 'table';
  return `${rpFilterBar(def, res, st)}
    ${grouped ? `<nav class="pc-tabs rp-tabs"><a href="#" data-tab="chart" class="${tab === 'chart' ? 'on' : ''}">Chart</a><a href="#" data-tab="table" class="${tab === 'table' ? 'on' : ''}">Report</a>
      ${tab === 'chart' && (def.group || []).length < 2 ? `<span class="right rp-ctype">${[['bar', 'Bars'], ['column', 'Columns'], ['donut', 'Donut'], ['line', 'Line']].map(([k, l]) => `<button type="button" class="${(st.ctype || def.chart || 'bar') === k ? 'on' : ''}" data-ctype="${k}">${l}</button>`).join('')}
        <button type="button" class="${st.pct ? 'on' : ''}" data-pct>%</button></span>` : ''}</nav>` : ''}
    <div class="rp-meta"><span>${grouped ? `${plural(res.count, 'record')} in ${plural((res.rows || []).length, 'group')}` : plural(res.count, 'row')}</span>${o.note || ''}</div>
    ${tab === 'chart' ? `<section class="panel"><div class="body">${rpChart(def, res, { type: st.ctype || def.chart, pct: st.pct, title: rep.name })}</div><div class="rp-hint">Click a bar or slice to see the people and records behind it.</div></section>` : rpResultHtml('rprep', def, res)}`;
}
// wires filters, tabs and drill-down; refresh(opts) re-runs and redraws
function rpReportBind(box, ctx) {
  box.addEventListener('change', e => {
    const t = e.target; const st = ctx.st;
    if (t.matches('[data-wf]')) { st.where = { ...(st.where || {}), [t.dataset.wf]: t.value }; ctx.refresh(); }
    if (t.matches('[data-from]')) { st.from = t.value; ctx.refresh(); } if (t.matches('[data-to]')) { st.to = t.value; ctx.refresh(); } if (t.matches('[data-df]')) { st.date = t.value; if (st.from || st.to) ctx.refresh(); }
  });
  box.addEventListener('click', async e => {
    const st = ctx.st;
    const tb = e.target.closest('[data-tab]'); if (tb) { e.preventDefault(); st.tab = tb.dataset.tab; return ctx.redraw(); }
    const ct = e.target.closest('[data-ctype]'); if (ct) { st.ctype = ct.dataset.ctype; return ctx.redraw(); }
    if (e.target.closest('[data-pct]')) { st.pct = !st.pct; return ctx.redraw(); }
    if (e.target.closest('[data-clear]')) { st.from = st.to = ''; st.where = {}; return ctx.refresh(); }
    const h = e.target.closest('.rp-hit, .rp-drill'); if (h && h.dataset.k1 != null) { e.preventDefault(); return rpDrill(ctx, h.dataset.k1, h.dataset.k2); }
  });
}
async function rpDrill(ctx, k1, k2) {
  const def = ctx.def; const g = def.group || []; if (!g.length) return;
  const drill = { [g[0]]: k1 }; if (g[1] && k2 != null && k2 !== '') drill[g[1]] = k2;
  const src = RP_SRC[def.src]; const main = src?.groups[0][1] || []; const cols = [...new Set([...(main.includes('name') ? [] : (rpFields(def.src).includes('name') ? ['name'] : [])), ...main.slice(0, 7), ...g])].filter(f => rpFields(def.src).includes(f)).slice(0, 9);
  const res = await pcTry(() => ctx.run(rpOpts(def, ctx.st, { list: true, drill, cols, facets: [] })));
  const title = [rpLabel(g[0], k1), g[1] && k2 ? rpLabel(g[1], k2) : ''].filter(Boolean).join(' · ');
  const ddef = { src: def.src, cols, group: [] };
  modal({ title, sub: `${plural(res.count, 'record')} behind this number in “${esc(ctx.rep.name)}”`, wide: true, submit: null, cancel: 'Close',
    body: `<div class="rp-drillbox">${rpResultHtml('rpdrill', ddef, res, { per: 30 })}</div><p class="right"><button type="button" class="btn small" data-x2>${ico('down')}Excel</button></p>`,
    onOpen: d => { pcBindTables(d); $('[data-x2]', d).onclick = () => rpExport({ ...ctx.rep, name: ctx.rep.name + ' – ' + title }, ddef, res, 'xlsx', title); } });
}

// ================================================================ Overview
RP.pages[''] = { perms: ['view-reports'],
  async load() {
    const [L, cfg] = await Promise.all([rpList(true), rpCfgLoad()]);
    const charts = ['e_active_inactive', 'e_service', 'e_gender_dist', 'e_confirmed_vs', 'e_generation'].map(rpByCode).filter(Boolean);
    const y = new Date().getFullYear() + '-01-01';
    const [runs, staff, joined, left, onleave, scheds] = await Promise.all([
      Promise.all(charts.map(r => q(sb.rpc('hr_rep_run', { p_id: r.id, p_opts: {} })).catch(() => null))),
      q(sb.rpc('hr_rep_preview', { p_def: { src: 'employees', group: ['status'] }, p_opts: {} })).catch(() => null),
      q(sb.rpc('hr_rep_preview', { p_def: { src: 'employees', cols: ['name'] }, p_opts: { where: [{ f: 'start_date', op: 'gte', v: y }] } })).catch(() => null),
      q(sb.rpc('hr_rep_preview', { p_def: { src: 'employees', cols: ['name'] }, p_opts: { where: [{ f: 'exit_date', op: 'gte', v: y }] } })).catch(() => null),
      q(sb.rpc('hr_rep_preview', { p_def: { src: 'leave', cols: ['name'] }, p_opts: { where: [{ f: 'on_leave_today', op: 'eq', v: 'Yes' }] } })).catch(() => null),
      q(sb.rpc('hr_rep_schedules')).catch(() => [])]);
    this.charts = charts.map((r, i) => ({ r, res: runs[i] })); this.view = this.view || {};
    const n = k => (staff?.rows || []).find(x => x.k1 === k)?.v[0] || 0;
    const mine = L.filter(r => !r.is_default).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, 6);
    const next = scheds.filter(s => s.active).slice(0, 5);
    return topbar('Reports & Analytics', 'Keep a finger on the pulse of the workforce: charts, ready-made reports and your own.', pcCan('create-reports') ? `<a class="btn primary" href="#/people/admin/rep/create">${ico('plus')}Create report</a>` : '') +
      pcKpis([[n('Active'), 'Active staff', '', '#/people/admin/rep/view/' + (rpByCode('e_count')?.id || '')], [joined?.count ?? '—', 'Joined this year', '', '#/people/admin/rep/view/' + (rpByCode('e_joined')?.id || '')],
        [left?.count ?? '—', 'Left this year', '', '#/people/admin/rep/view/' + (rpByCode('e_exited')?.id || '')], [onleave?.count ?? '—', 'On leave today', '', '#/people/admin/rep/view/' + (rpByCode('l_on_leave')?.id || '')]]) +
      `<section class="panel rp-demo"><header><h2>Employee demographics</h2><span class="meta">${plural(charts.length, 'chart')}</span><span class="right"><a class="btn small" href="#/people/admin/rep/dashboards">${ico('chart')}Go to dashboards</a></span></header>
        <div class="rp-strip">${this.charts.map(({ r, res }, i) => `<div class="rp-card" data-ci="${i}"><div class="rp-cardh"><a href="#/people/admin/rep/view/${r.id}"><b>${esc(r.name)}</b></a>
          <span class="rp-ctype sm">${[['donut', 'Donut'], ['column', 'Columns'], ['bar', 'Bars']].map(([k, l]) => `<button type="button" data-cc="${i}" data-t="${k}" class="${(this.view[i]?.t || this.def(r, i)) === k ? 'on' : ''}" title="${l}">${l}</button>`).join('')}<button type="button" data-cc="${i}" data-pct class="${this.view[i]?.pct ? 'on' : ''}" title="Show percentages">%</button></span></div>
          <div class="rp-cardb">${res ? rpChart(this.rdef(r, res), res, { type: this.view[i]?.t || this.def(r, i), pct: this.view[i]?.pct, title: r.name }) : '<div class="rp-empty">Couldn’t load</div>'}</div></div>`).join('')}</div></section>
      <div class="rp-quick">${[['#/people/admin/rep/create', 'plus', 'Create report', 'Build your own from any module', 'create-reports'], ['#/people/admin/rep/library', 'plan', 'Report library', plural(L.length, 'report') + ' by module'],
        ['#/people/admin/rep/dashboards', 'chart', 'Dashboards', 'Your charts and number cards'], ['#/people/admin/rep/schedules', 'clock', 'Scheduled reports', cfg.schedules_on ? plural(scheds.filter(s => s.active).length, 'active schedule') : 'Switched off'],
        ['#/people/admin/rep/audit', 'audit', 'Audit trail', 'Who viewed, exported or shared what', 'view-report-audit']].filter(x => !x[4] || pcCan(x[4])).map(([h, i, t, s]) => `<a href="${h}" class="rp-ql">${ico(i)}<span><b>${esc(t)}</b><small>${esc(s)}</small></span></a>`).join('')}</div>
      <div class="pc-grid2"><section class="panel"><header><h2>Recently created reports</h2></header>${mine.length ? `<ul class="list">${mine.map(r => `<li><div class="main"><div class="name"><a href="#/people/admin/rep/view/${r.id}">${esc(r.name)}</a></div><div class="sub">${esc(rpModName(r.module))} · ${esc(r.created_by_name)} · ${fd(r.updated_at)}</div></div></li>`).join('')}</ul>`
          : `<div class="pc-empty-hero"><b>No reports of your own yet</b>Pick a module, tick what you want to see, and save it.${pcCan('create-reports') ? `<div class="mt"><a class="btn small primary" href="#/people/admin/rep/create">Create report</a></div>` : ''}</div>`}</section>
        <section class="panel"><header><h2>Scheduled reports</h2></header>${!cfg.schedules_on ? `<div class="pc-empty-hero"><b>Scheduled reports are off</b>HR switches them on in Settings. Until then nothing is emailed.</div>`
          : next.length ? `<ul class="list">${next.map(s => `<li><div class="main"><div class="name">${esc(s.name)}</div><div class="sub">${esc(s.report)} · ${esc(RP_FREQ[s.frequency])} · next ${s.next_at ? pdfStamp(s.next_at) : '—'}</div></div></li>`).join('')}</ul>`
          : '<div class="pc-empty-hero"><b>You have no scheduled reports</b>Open a report and choose Schedule.</div>'}</section></div>`;
  },
  def(r, i) { return ['donut', 'column', 'donut', 'donut', 'column'][i] || 'bar'; },
  rdef(r, res) { return res?.report?.def || { group: ['k1'] }; },
  bind(main) {
    main.addEventListener('click', e => {
      const b = e.target.closest('[data-cc]'); if (b) { const i = +b.dataset.cc; const v = this.view[i] = this.view[i] || {}; if (b.dataset.t) v.t = b.dataset.t; else v.pct = !v.pct;
        const c = this.charts[i]; const card = $(`[data-ci="${i}"]`, main); $('.rp-cardb', card).innerHTML = rpChart(this.rdef(c.r, c.res), c.res, { type: v.t || this.def(c.r, i), pct: v.pct });
        $$('[data-cc]', card).forEach(x => x.classList.toggle('on', x.dataset.t ? x.dataset.t === (v.t || this.def(c.r, i)) : !!v.pct)); return; }
      const h = e.target.closest('.rp-card .rp-hit'); if (h) { const i = +h.closest('[data-ci]').dataset.ci; const c = this.charts[i];
        const ctx = { rep: c.r, def: this.rdef(c.r, c.res), st: {}, run: o => q(sb.rpc('hr_rep_run', { p_id: c.r.id, p_opts: o })) }; rpDrill(ctx, h.dataset.k1, h.dataset.k2); }
    });
  }
};
const RP_FREQ = { once: 'Once', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

// ================================================================ Report library
RP.pages.library = { perms: ['view-reports'],
  async load(rest) {
    const L = this.L = await rpList(true); const mod = this.mod = rest[0] || '';
    if (!mod) {
      const counts = Object.fromEntries(RP_MODS.map(([k]) => [k, L.filter(r => r.module === k).length]));
      return topbar('Report library', 'Ready-made reports for every module, and the ones HR has built. Default reports can’t be changed: duplicate one to make it your own.', pcCan('create-reports') ? `<a class="btn primary" href="#/people/admin/rep/create">${ico('plus')}Create report</a>` : '') +
        `<div class="rp-search"><input type="search" placeholder="Search every report" data-libq></div><div class="rp-libres" hidden></div>
        <div class="hr-tiles rp-libtiles">${RP_MODS.filter(([k]) => counts[k] || k !== 'pay').map(([k, l, i]) => `<a class="hr-tile" href="#/people/admin/rep/library/${k}"><span class="t-ico">${ico(i)}</span><span class="t-name">${esc(l)}</span>
          <span class="t-meta ${counts[k] ? '' : 'muted'}">${plural(counts[k], 'report')}</span></a>`).join('')}</div>`;
    }
    const rows = L.filter(r => r.module === mod);
    return topbar(rpModName(mod) + ' reports', 'The reports in this module. Open one to filter it, see its chart and drill into the numbers.', `<a class="btn" href="#/people/admin/rep/library">${ico('undo')}All modules</a>${pcCan('create-reports') ? `<a class="btn primary" href="#/people/admin/rep/create?mod=${mod}">${ico('plus')}Create report</a>` : ''}`) +
      this.table(rows);
  },
  table(rows, id = 'rplib') {
    return pcTable(id, [{ l: 'Report name', v: r => r.name, f: r => `<a href="#/people/admin/rep/view/${r.id}"><b>${esc(r.name)}</b></a>${r.kind === 'chart' ? ' ' + pcChip('out', 'Chart') : ''}<br><small class="muted">${esc(r.description || '')}</small>` },
      { l: 'Created by', v: r => r.created_by_name, f: r => r.is_default ? pcChip('muted', 'Default') : esc(r.created_by_name) },
      { l: 'Date created', v: r => r.created_at, f: r => fd(r.created_at) }, { l: 'Last modified', v: r => r.updated_at, f: r => fd(r.updated_at) },
      { l: 'Shared', cls: 'num', v: r => +r.shares, f: r => (+r.shares ? plural(+r.shares, 'person', 'people') : '—') + (+r.schedules ? `<br><small class="muted">${plural(+r.schedules, 'schedule')}</small>` : '') },
      { l: '', sort: false, cls: 'num', f: r => `<button type="button" class="btn small" data-act="${r.id}">Action ▾</button>` }], rows,
      { noun: 'report', empty: 'No reports here yet.', search: r => r.name + ' ' + (r.description || '') });
  },
  bind(main) {
    const qi = $('[data-libq]', main); if (qi) qi.oninput = debounce(() => { const t = qi.value.trim().toLowerCase(); const box = $('.rp-libres', main);
      if (!t) { box.hidden = true; $('.rp-libtiles', main).hidden = false; return; }
      box.innerHTML = this.table(this.L.filter(r => (r.name + ' ' + (r.description || '') + ' ' + rpModName(r.module)).toLowerCase().includes(t)), 'rplibq'); box.hidden = false; $('.rp-libtiles', main).hidden = true;
      box.removeAttribute('data-bound'); pcBindTables(box); }, 200);
    main.addEventListener('click', async e => { const b = e.target.closest('[data-act]'); if (!b) return; e.preventDefault(); const r = this.L.find(x => x.id === +b.dataset.act); await rpActions(b, r); });
  }
};
// the Action menu for one report
async function rpActions(btn, r, after) {
  const k = await rpMenu(btn, [['view', 'View', 'eye'], pcCan('create-reports') && ['dup', 'Duplicate', 'plus'], pcCan('create-reports') && !r.is_default && ['edit', 'Edit', 'edit'],
    pcCan('schedule-reports') && ['share', 'Share', 'users'], pcCan('schedule-reports') && ['sched', 'Schedule', 'clock'], pcCan('create-reports') && !r.is_default && ['ren', 'Rename', 'edit'],
    pcCan('create-reports') && !r.is_default && ['del', 'Delete', 'trash', true]]);
  if (!k) return;
  if (k === 'view') return go('#/people/admin/rep/view/' + r.id);
  if (k === 'edit') return go('#/people/admin/rep/create?id=' + r.id);
  if (k === 'dup') return modal({ title: 'Duplicate “' + r.name + '”', body: `<label class="f">Name of the copy<input name="n" value="${esc(r.name + ' (copy)')}" required></label>`, submit: 'Duplicate',
    onSubmit: async v => { const id = await q(sb.rpc('hr_rep_duplicate', { p_id: r.id, p_name: v.n })); rpInvalidate(); toast('Copy made: you can change it'); go('#/people/admin/rep/create?id=' + id); } });
  if (k === 'ren') return modal({ title: 'Rename report', body: `<label class="f">Name<input name="n" value="${esc(r.name)}" required></label>`,
    onSubmit: async v => { await q(sb.rpc('hr_rep_rename', { p_id: r.id, p_name: v.n })); rpInvalidate(); toast('Renamed'); after ? after() : render({ quiet: true }); } });
  if (k === 'del') { if (!await pcConfirm('Delete “' + esc(r.name) + '”?', 'Its schedules stop and the people it was shared with lose it. Dashboards drop its chart.', 'Delete')) return;
    await pcTry(() => q(sb.rpc('hr_rep_delete', { p_id: r.id })), 'Report deleted'); rpInvalidate(); return location.hash.includes('/view/') ? go('#/people/admin/rep/library/' + r.module) : render({ quiet: true }); }
  if (k === 'share') return rpShareDlg(r, after);
  if (k === 'sched') return rpScheduleDlg({ report_id: r.id }, after);
}

// ================================================================ One report (admin)
RP.pages.view = { perms: ['view-reports'],
  async load(rest, params) {
    const id = +rest[0]; if (!id) { setTimeout(() => go('#/people/admin/rep/library'), 0); return ''; }
    if (this.id !== id) { this.st = {}; this.id = id; }
    // the first run records the view and brings the definition; the second applies its filters and lists their values
    const first = await q(sb.rpc('hr_rep_run', { p_id: id, p_opts: { log: 'view' } }));
    this.rep = first.report; this.def = first.report.def;
    this.res = await q(sb.rpc('hr_rep_run', { p_id: id, p_opts: rpOpts(this.def, this.st) }));
    const r = this.rep;
    return topbar(r.name, `${esc(r.description || '')}`, `<a class="btn" href="#/people/admin/rep/library/${r.module}">${ico('undo')}${esc(rpModName(r.module))}</a>
        <button type="button" class="btn" data-exp>${ico('down')}Export ▾</button>${pcCan('create-reports') && !r.is_default ? `<a class="btn" href="#/people/admin/rep/create?id=${r.id}">${ico('edit')}Edit report</a>` : ''}
        <button type="button" class="btn primary" data-act>Action ▾</button>`) +
      `<div class="hr-chips rp-chips">${r.is_default ? pcChip('muted', 'Default report') : pcChip('ok', 'Made by ' + (r.created_by_name || 'HR'))}${pcChip('out', rpModName(r.module))}${r.kind === 'chart' ? pcChip('out', 'Chart') : ''}<span class="muted">Data from ${esc(RP_SRC[this.def.src]?.l || this.def.src)}</span></div>
      <div id="rp-out">${rpReportHtml(r, this.def, this.res, this.st)}</div>`;
  },
  bind(main) {
    const box = $('#rp-out', main); const ctx = this.ctx = { rep: this.rep, def: this.def, st: this.st, run: o => q(sb.rpc('hr_rep_run', { p_id: this.id, p_opts: o })),
      redraw: () => { box.innerHTML = rpReportHtml(this.rep, this.def, this.res, this.st); pcBindTables(box); },
      refresh: async () => { box.classList.add('rp-busy'); try { this.res = await ctx.run(rpOpts(this.def, this.st)); ctx.redraw(); } catch (e) { toast(niceError(e), true); } box.classList.remove('rp-busy'); } };
    rpReportBind(box, ctx);
    $('[data-exp]', main).onclick = async e => { const k = await rpMenu(e.currentTarget, [['xlsx', 'Excel (.xlsx)', 'down'], ['csv', 'CSV', 'down'], ['pdf', 'PDF', 'pdf']]); if (k) pcTry(() => rpExport(this.rep, this.def, this.res, k, rpFiltText(this.def, this.st))); };
    $('[data-act]', main).onclick = e => rpActions(e.currentTarget, { ...this.rep, schedules: 0, shares: 0 }, () => render({ quiet: true }));
  }
};

// ================================================================ Share and schedule dialogs
async function rpShareDlg(r, after) {
  const cur = await q(sb.rpc('hr_rep_share_get', { p_id: r.id })); const shared = cur.filter(s => s.via === 'share').map(s => s.employee_id); const viaSched = cur.filter(s => s.via === 'schedule');
  return modal({ title: 'Share “' + r.name + '”', wide: true, submit: 'Save',
    sub: 'The people you pick see this report under PeopleCore → Reports, read-only, with the latest figures. They can download it; every view and download is in the audit trail. Private details stay hidden from anyone not allowed to see private staff data.',
    body: `${viaSched.length ? `<div class="notice">${plural(viaSched.length, 'person', 'people')} also get it on a schedule: ${viaSched.map(s => esc(s.name)).join(', ')}.</div>` : ''}${rpPeopleHtml(shared)}
      ${r.payroll ? '<div class="notice warn">This report shows payroll figures: only people with payroll permission can receive it.</div>' : ''}`,
    onOpen: d => { d._pick = rpPeopleBind(d); },
    onSubmit: async (_, d) => { const ids = d._pick(); const nw = await q(sb.rpc('hr_rep_share_set', { p_id: r.id, p_emps: ids }));
      const noLogin = ids.filter(i => !S.hr.dir.find(c => c.id === i)?.profile_id).length;
      toast((nw ? `Shared with ${plural(nw, 'more person', 'more people')}` : 'Sharing saved') + (noLogin ? `. ${plural(noLogin, 'person', 'people')} can open it once they have a Nest sign-in.` : '')); rpInvalidate(); after ? after() : render({ quiet: true }); } });
}
async function rpScheduleDlg(s, after) {
  const cfg = await rpCfgLoad(true);
  if (!cfg.schedules_on) return modal({ title: 'Scheduled reports are off', submit: pcCan('manage-report-settings') ? 'Open settings' : null, cancel: 'Close',
    body: '<p>Nothing is emailed until HR switches scheduled reports on in Reports & Analytics → Settings.</p>', onSubmit: async () => go('#/people/admin/rep/settings') });
  const L = await rpList();
  return modal({ title: s.id ? 'Edit schedule' : 'Schedule a report', wide: true, submit: s.id ? 'Save' : 'Schedule',
    sub: 'On each date the people you pick get an email with a link to the report in Nest. It opens with the latest figures after they sign in; no file goes in the inbox.',
    body: `<div class="row2"><label class="f">Name of schedule<input name="name" required value="${esc(s.name || '')}" placeholder="e.g. Monthly headcount for management"></label>
        <label class="f">Report<select name="report_id" required>${L.map(r => opt(r.id, r.name + (r.is_default ? '' : ' (custom)'), s.report_id)).join('')}</select></label></div>
      <div class="row3"><label class="f">Starts on<input type="date" name="start_date" required value="${esc(s.start_date || localISO(1))}"></label>
        <label class="f">Time<input type="time" name="at_time" value="${esc(s.at_time || '08:00')}"></label>
        <label class="f">How often<select name="frequency">${Object.entries(RP_FREQ).map(([k, l]) => opt(k, k === 'once' ? 'Does not repeat' : l, s.frequency || 'monthly')).join('')}</select></label></div>
      <div class="f wide"><b>Who receives it</b>${rpPeopleHtml(s.recipients || [])}</div>`,
    onOpen: d => { d._pick = rpPeopleBind(d); },
    onSubmit: async (v, d) => { await q(sb.rpc('hr_rep_schedule_save', { p: { id: s.id || null, report_id: +v.report_id, name: v.name, start_date: v.start_date, at_time: v.at_time, frequency: v.frequency, recipients: d._pick() } }));
      toast(s.id ? 'Schedule saved' : 'Report scheduled'); rpInvalidate(); after ? after() : (location.hash.includes('/schedules') ? render({ quiet: true }) : go('#/people/admin/rep/schedules')); } });
}

// ================================================================ The builder: 1 choose a module, 2 select properties, 3 build the report
RP.pages.create = { perms: ['create-reports'],
  async load(rest, params) {
    const id = +params.get?.('id') || null; const key = id ? 'e' + id : 'n' + (params.get?.('mod') || '');
    if (this.key !== key) {
      this.key = key; this.b = { step: 1, mod: params.get?.('mod') || '', src: '', rel: new Set(), props: [], mode: 'list', group: [], measures: [{ fn: 'count' }], where: [], chart: 'bar', date: '', name: '', desc: '' };
      if (id) { const L = await rpList(true); const r = L.find(x => x.id === id); const full = await q(sb.rpc('hr_rep_run', { p_id: id, p_opts: { list: false } })); const d = full.report.def;
        Object.assign(this.b, { id, step: 3, mod: r.module, src: d.src, name: r.name, desc: r.description || '', mode: (d.group || []).length ? 'group' : 'list', group: d.group || [], measures: d.measures || [{ fn: 'count' }],
          where: d.where || [], chart: d.chart || 'bar', date: d.date || '', props: d.cols?.length ? d.cols : rpFields(d.src).slice(0, 8), sort: d.sort, order: d.order, money: d.money });
        const g = RP_SRC[d.src]?.groups || []; this.b.rel = new Set(g.slice(1).filter(([, fs]) => [...this.b.props, ...this.b.group].some(f => fs.includes(f))).map(([l]) => l)); }
    }
    const b = this.b; const step = (n, l) => `<span class="${b.step === n ? 'on' : b.step > n ? 'done' : ''}"><i>${b.step > n ? '✓' : n}</i>${l}</span>`;
    const head = topbar(b.id ? 'Edit report' : 'Create report', 'Build a report from any module: choose the data, tick what to show, then filter, group and chart it.', `<a class="btn" href="#/people/admin/rep/library">${ico('undo')}Report library</a>`) +
      `<div class="rp-steps">${step(1, 'Choose a module')}${step(2, 'Select properties')}${step(3, 'Build report')}</div>`;
    if (b.step === 1) return head + this.step1();
    if (b.step === 2) return head + this.step2();
    this.res = null; try { this.res = await q(sb.rpc('hr_rep_preview', { p_def: this.def(), p_opts: { facets: [] } })); } catch (e) { this.err = niceError(e); }
    return head + this.step3();
  },
  def() { const b = this.b; const d = { src: b.src, group: b.mode === 'group' ? b.group.filter(Boolean) : [], cols: b.mode === 'list' ? b.props : [], where: b.where.filter(w => w.f && (['empty', 'notempty'].includes(w.op) || w.v !== '')) };
    if (b.mode === 'group') { d.measures = b.measures; d.chart = b.chart === 'none' ? null : (d.group.length > 1 ? 'stacked' : b.chart); d.order = b.order || 'value'; if (b.measures.some(m => rpT(m.f) === 'money')) d.money = true; }
    if (b.date) d.date = b.date; if (b.sort?.f && b.mode === 'list') d.sort = b.sort; return d; },
  step1() {
    const b = this.b; const mods = RP_MODS.filter(([k]) => Object.entries(RP_SRC).some(([s, x]) => x.mod === k && rpSrcOk(s)));
    const srcs = Object.entries(RP_SRC).filter(([s, x]) => x.mod === b.mod && rpSrcOk(s));
    return `<section class="panel"><header><h2>Begin by choosing a module</h2></header><div class="body"><div class="rp-mods">${mods.map(([k, l, i]) => `<button type="button" class="rp-mod ${b.mod === k ? 'on' : ''}" data-mod="${k}">${ico(i)}<span>${esc(l)}</span></button>`).join('')}</div></div></section>
      ${b.mod ? `<section class="panel"><header><h2>Starting data</h2><span class="meta">The foundation of your report</span></header><div class="body"><div class="rp-srcs">${srcs.map(([s, x]) => `<label class="rp-src ${b.src === s ? 'on' : ''}"><input type="radio" name="src" value="${s}" ${b.src === s ? 'checked' : ''}><b>${esc(x.l)}</b><small>${esc(x.groups[0][1].slice(0, 5).map(rpL).join(', '))}…</small></label>`).join('')}</div>
        ${b.src && RP_SRC[b.src].groups.length > 1 ? `<div class="pc-sec">Add related data</div><p class="muted">Add more information that belongs with ${esc(RP_SRC[b.src].l.toLowerCase())}.</p><div class="rp-rel">${RP_SRC[b.src].groups.slice(1).map(([l, fs]) => `<label class="check rp-relc"><input type="checkbox" data-rel="${esc(l)}" ${b.rel.has(l) ? 'checked' : ''}> ${esc(l)}<small>${esc(fs.slice(0, 4).map(rpL).join(', '))}${fs.length > 4 ? '…' : ''}</small></label>`).join('')}</div>` : ''}</div></section>` : ''}
      <div class="rp-nav"><span></span><button type="button" class="btn primary" data-next ${b.src ? '' : 'disabled'}>Next</button></div>`;
  },
  step2() {
    const b = this.b; const src = RP_SRC[b.src]; const groups = src.groups.filter(([l], i) => i === 0 || b.rel.has(l)); const pii = S.pc.repCfg?.pii || [];
    if (!b.props.length) b.props = groups[0][1].filter(f => !['first_name', 'last_name', 'other_names'].includes(f)).slice(0, 6);
    return `<section class="panel"><header><h2>Properties for ${esc(src.l.toLowerCase())}</h2><span class="meta">${plural(b.props.length, 'property', 'properties')} ticked</span><span class="right"><input type="search" placeholder="Search properties" data-pq class="rp-pqs"></span></header>
      <div class="body rp-props">${groups.map(([l, fs]) => `<div class="rp-pg"><div class="rp-pgh"><b>${esc(l)}</b><small>${plural(fs.filter(f => b.props.includes(f)).length, 'selected')}</small><button type="button" class="btn small quiet" data-all="${esc(l)}">Tick all</button></div>
        <div class="rp-pl">${fs.map(f => `<label class="check" data-pn="${esc(rpL(f).toLowerCase())}"><input type="checkbox" data-prop="${f}" ${b.props.includes(f) ? 'checked' : ''}> ${esc(rpL(f))}${pii.includes(f) ? ` <span class="rp-lock" title="Private: only for people allowed to see private staff data">${ico('lock')}</span>` : ''}</label>`).join('')}</div></div>`).join('')}</div></section>
      <div class="rp-nav"><button type="button" class="btn" data-back>Back</button><button type="button" class="btn primary" data-build ${b.props.length ? '' : 'disabled'}>Build report</button></div>`;
  },
  step3() {
    const b = this.b; const src = RP_SRC[b.src]; const avail = [...new Set([...b.props, ...src.groups.filter(([l], i) => i === 0 || b.rel.has(l)).flatMap(g => g[1])])];
    const textF = avail.filter(f => ['text', 'month'].includes(rpT(f)) && !['name', 'emp_no', 'work_email', 'personal_email', 'mobile', 'address', 'account_no', 'bvn', 'nin', 'rsa_pin'].includes(f));
    const numF = avail.filter(f => ['num', 'money', 'pct'].includes(rpT(f))); const dateF = (src.date || []).filter(f => avail.includes(f) || true);
    const res = this.res; const def = this.def();
    const mRow = (m, i) => `<div class="rp-mrow" data-mi="${i}"><select data-mfn>${opt('count', 'Count records', m.fn)}${numF.length ? opt('sum', 'Total of', m.fn) + opt('avg', 'Average of', m.fn) : ''}${opt('distinct', 'Number of different', m.fn)}</select>
      ${m.fn === 'count' ? '' : `<select data-mf>${(m.fn === 'distinct' ? [...textF, 'employee_id'] : numF).map(f => opt(f, f === 'employee_id' ? 'People' : rpL(f), m.f)).join('')}</select>`}${i ? `<button type="button" class="btn small quiet" data-mdel="${i}" aria-label="Remove">✕</button>` : ''}</div>`;
    const wRow = (w, i) => `<div class="rp-wrow" data-wi="${i}"><select data-wf>${opt('', 'Field…', w.f)}${avail.map(f => opt(f, rpL(f), w.f)).join('')}</select>
      <select data-wop>${[['eq', 'is'], ['ne', 'is not'], ['contains', 'contains'], ['gte', 'is on or after / at least'], ['lte', 'is on or before / at most'], ['empty', 'is empty'], ['notempty', 'is not empty']].map(([k, l]) => opt(k, l, w.op || 'eq')).join('')}</select>
      ${['empty', 'notempty'].includes(w.op) ? '<span></span>' : `<input data-wv value="${esc(w.v ?? '')}" ${['date'].includes(rpT(w.f)) ? 'type="date"' : ''} placeholder="Value">`}<button type="button" class="btn small quiet" data-wdel="${i}" aria-label="Remove">✕</button></div>`;
    return `<div class="rp-build"><section class="panel rp-side"><header><h2>Build</h2></header><div class="body">
        <div class="pc-sec">Show as</div><div class="segi rp-seg"><label><input type="radio" name="mode" value="list" ${b.mode === 'list' ? 'checked' : ''}><span>A list of rows</span></label><label><input type="radio" name="mode" value="group" ${b.mode === 'group' ? 'checked' : ''}><span>A summary with a chart</span></label></div>
        ${b.mode === 'group' ? `<div class="pc-sec">Group by</div><select data-g="0">${opt('', 'Choose…', b.group[0])}${textF.map(f => opt(f, rpL(f), b.group[0])).join('')}</select>
          <select data-g="1" class="mt">${opt('', 'And then by (optional)', b.group[1] || '')}${textF.filter(f => f !== b.group[0]).map(f => opt(f, rpL(f), b.group[1])).join('')}</select>
          <div class="pc-sec">Show</div>${b.measures.map(mRow).join('')}<button type="button" class="btn small quiet" data-madd>${ico('plus')}Another number</button>
          <div class="pc-sec">Chart</div><select data-chart>${[['bar', 'Bars'], ['column', 'Columns'], ['donut', 'Donut'], ['line', 'Line'], ['none', 'No chart']].map(([k, l]) => opt(k, b.group.filter(Boolean).length > 1 && k !== 'none' ? 'Stacked columns' : l, b.chart)).filter((x, i, a) => a.indexOf(x) === i).join('')}</select>
          <div class="pc-sec">Order</div><select data-order>${opt('value', 'Biggest first', b.order || 'value')}${opt('label', 'A to Z / oldest first', b.order)}</select>`
        : `<div class="pc-sec">Columns</div><p class="muted small">${plural(b.props.length, 'property', 'properties')} · <a href="#" data-back>change</a></p>
          <div class="pc-sec">Sort by</div><div class="row2"><select data-sf>${opt('', 'As they come', b.sort?.f || '')}${b.props.map(f => opt(f, rpL(f), b.sort?.f)).join('')}</select><select data-sd>${opt('asc', 'A to Z / oldest first', b.sort?.dir)}${opt('desc', 'Z to A / newest first', b.sort?.dir)}</select></div>`}
        <div class="pc-sec">Filters</div>${b.where.map(wRow).join('')}<button type="button" class="btn small quiet" data-wadd>${ico('plus')}Add a filter</button>
        ${dateF.length ? `<div class="pc-sec">Date filter uses</div><select data-date>${dateF.map(f => opt(f, rpL(f), b.date || dateF[0])).join('')}</select><p class="muted small">People viewing the report can pick a date range on this field.</p>` : ''}
        <div class="pc-sec">Save</div><label class="f">Report name<input data-name value="${esc(b.name)}" placeholder="e.g. Engineers by location"></label><label class="f">Description <span class="optl">(optional)</span><input data-desc value="${esc(b.desc)}"></label>
        <div class="rp-nav"><button type="button" class="btn" data-back>Back</button><button type="button" class="btn primary" data-save>${b.id ? 'Save changes' : 'Save report'}</button></div></div></section>
      <section class="rp-prev"><div class="rp-prevh"><b>Preview</b><span class="muted">${esc(src.l)}${res ? ' · ' + plural(res.count, 'record') : ''}</span></div>
        ${this.err ? `<div class="notice warn">${esc(this.err)}</div>` : res ? (res.mode === 'group' && def.chart ? `<section class="panel"><div class="body">${rpChart(def, res, {})}</div></section>` : '') + rpResultHtml('rpprev', def, res, { per: 25 }) : ''}</section></div>`;
  },
  bind(main) {
    const b = this.b; this.err = null; const re = () => render({ quiet: true });
    main.addEventListener('click', async e => {
      const m = e.target.closest('[data-mod]'); if (m) { b.mod = m.dataset.mod; b.src = ''; b.rel.clear(); b.props = []; return re(); }
      if (e.target.closest('[data-next]')) { b.step = 2; return re(); }
      if (e.target.closest('[data-back]')) { e.preventDefault(); b.step = b.step === 3 ? 2 : 1; return re(); }
      if (e.target.closest('[data-build]')) { b.step = 3; if (!b.date) b.date = (RP_SRC[b.src].date || [])[0] || ''; return re(); }
      const al = e.target.closest('[data-all]'); if (al) { const g = RP_SRC[b.src].groups.find(x => x[0] === al.dataset.all); const all = g[1].every(f => b.props.includes(f));
        b.props = all ? b.props.filter(f => !g[1].includes(f)) : [...new Set([...b.props, ...g[1]])]; return re(); }
      if (e.target.closest('[data-madd]')) { b.measures.push({ fn: 'count' }); return re(); }
      const md = e.target.closest('[data-mdel]'); if (md) { b.measures.splice(+md.dataset.mdel, 1); return re(); }
      if (e.target.closest('[data-wadd]')) { b.where.push({ f: '', op: 'eq', v: '' }); return re(); }
      const wd = e.target.closest('[data-wdel]'); if (wd) { b.where.splice(+wd.dataset.wdel, 1); return re(); }
      if (e.target.closest('[data-save]')) {
        b.name = $('[data-name]', main).value.trim(); b.desc = $('[data-desc]', main).value.trim();
        if (!b.name) { toast('Give the report a name', true); $('[data-name]', main).focus(); return; }
        const id = await pcTry(() => q(sb.rpc('hr_rep_save', { p: { id: b.id || null, name: b.name, description: b.desc, module: b.mod, def: this.def() } })), b.id ? 'Report saved' : 'Report saved to the library');
        rpInvalidate(); this.key = null; go('#/people/admin/rep/view/' + id);
      }
    });
    main.addEventListener('change', e => {
      const t = e.target;
      if (t.name === 'src') { b.src = t.value; b.rel.clear(); b.props = []; return re(); }
      if (t.matches('[data-rel]')) { t.checked ? b.rel.add(t.dataset.rel) : b.rel.delete(t.dataset.rel); return; }
      if (t.matches('[data-prop]')) { b.props = t.checked ? [...b.props, t.dataset.prop] : b.props.filter(f => f !== t.dataset.prop); const bt = $('[data-build]', main); if (bt) bt.disabled = !b.props.length;
        $$('.rp-pg', main).forEach(g => { const n = $$('[data-prop]:checked', g).length; $('.rp-pgh small', g).textContent = plural(n, 'selected'); }); $('header .meta', main).textContent = plural(b.props.length, 'property', 'properties') + ' ticked'; return; }
      if (t.name === 'mode') { b.mode = t.value; if (b.mode === 'group' && !b.group[0]) b.group = [(RP_SRC[b.src].filters || []).find(f => f !== 'status') || '']; return re(); }
      if (t.matches('[data-g]')) { b.group[+t.dataset.g] = t.value; b.group = b.group.filter((x, i) => i === 0 || x); return re(); }
      if (t.matches('[data-mfn]')) { const i = +t.closest('[data-mi]').dataset.mi; b.measures[i] = { fn: t.value, f: t.value === 'distinct' ? 'employee_id' : t.value === 'count' ? undefined : b.measures[i].f }; return re(); }
      if (t.matches('[data-mf]')) { b.measures[+t.closest('[data-mi]').dataset.mi].f = t.value; return re(); }
      if (t.matches('[data-chart]')) { b.chart = t.value; return re(); }
      if (t.matches('[data-order]')) { b.order = t.value; return re(); }
      if (t.matches('[data-sf]')) { b.sort = { f: t.value, dir: b.sort?.dir || 'asc' }; return re(); }
      if (t.matches('[data-sd]')) { b.sort = { f: b.sort?.f || '', dir: t.value }; return re(); }
      if (t.matches('[data-date]')) { b.date = t.value; return; }
      const wi = t.closest('[data-wi]'); if (wi) { const w = b.where[+wi.dataset.wi]; if (t.matches('[data-wf]')) w.f = t.value; if (t.matches('[data-wop]')) w.op = t.value; if (t.matches('[data-wv]')) w.v = t.value; return re(); }
    });
    const pq = $('[data-pq]', main); if (pq) pq.oninput = () => { const v = pq.value.trim().toLowerCase(); $$('[data-pn]', main).forEach(l => l.hidden = v && !l.dataset.pn.includes(v)); };
    ['[data-name]', '[data-desc]'].forEach(s => { const i = $(s, main); if (i) i.oninput = () => { b[s === '[data-name]' ? 'name' : 'desc'] = i.value; }; });
  }
};

// ================================================================ Dashboards
RP.pages.dashboards = { perms: ['view-reports'],
  async load(rest) {
    const [D, L] = await Promise.all([q(sb.rpc('hr_rep_dash_list')), rpList()]); this.D = D; this.L = L;
    const d = this.d = D.find(x => x.id === +rest[0]) || D[0];
    const items = (d.items || []).map(it => ({ it, r: L.find(x => x.id === it.report_id) })).filter(x => x.r);
    this.runs = await Promise.all(items.map(({ r }) => q(sb.rpc('hr_rep_run', { p_id: r.id, p_opts: {} })).catch(e => ({ error: niceError(e) }))));
    this.items = items;
    return topbar('Dashboards', 'Your own charts and number cards. Each person in HR has their own dashboards.', `<button type="button" class="btn" data-dnew>${ico('plus')}New dashboard</button>`) +
      `<nav class="pc-tabs">${D.map(x => `<a href="#/people/admin/rep/dashboards/${x.id}" class="${x.id === d.id ? 'on' : ''}">${esc(x.name)}</a>`).join('')}</nav>
      <div class="rp-dbar"><button type="button" class="btn small primary" data-add="chart">${ico('chart')}Add chart</button><button type="button" class="btn small" data-add="number">${ico('plus')}Add number card</button>
        <span class="right"><button type="button" class="btn small quiet" data-dren>${ico('edit')}Rename</button>${D.length > 1 ? `<button type="button" class="btn small quiet danger" data-ddel>${ico('trash')}Delete dashboard</button>` : ''}</span></div>
      ${items.length ? `<div class="rp-dash">${items.map(({ it, r }, i) => { const res = this.runs[i];
        const num = it.show === 'number'; const n = res?.mode === 'group' ? (res.rows || []).reduce((a, x) => a + (+x.v[0] || 0), 0) : res?.count;
        return `<div class="rp-card ${num ? 'num' : ''}" data-di="${i}"><div class="rp-cardh"><a href="#/people/admin/rep/view/${r.id}"><b>${esc(it.title || r.name)}</b></a><span class="right"><button type="button" class="btn small quiet" data-drm="${i}" aria-label="Remove from dashboard">✕</button></span></div>
          <div class="rp-cardb">${res?.error ? `<div class="rp-empty">${esc(res.error)}</div>` : num ? `<a class="rp-bign" href="#/people/admin/rep/view/${r.id}">${rpNum(n, res?.report?.def?.money)}</a><small class="muted">${esc(r.description || '')}</small>`
            : res?.mode === 'group' ? rpChart(res.report.def, res, { type: it.chart || res.report.def.chart, title: r.name }) : `<div class="rp-bign">${rpNum(res?.count)}</div><small class="muted">rows · a list report has no chart</small>`}</div></div>`; }).join('')}</div>`
        : `<section class="panel"><div class="pc-empty-hero"><b>This dashboard is empty</b>Add a chart from any summary report, or a number card from any report.</div></section>`}`;
  },
  async save(items, name) { await q(sb.rpc('hr_rep_dash_save', { p: { id: this.d.id, name: name || this.d.name, items } })); render({ quiet: true }); },
  bind(main) {
    main.addEventListener('click', async e => {
      const a = e.target.closest('[data-add]'); if (a) { const kind = a.dataset.add; const L = this.L.filter(r => kind === 'number' || r.kind === 'chart' || r.src && true).filter(r => kind === 'number' || !['e_profile'].includes(r.code));
        return modal({ title: kind === 'number' ? 'Add a number card' : 'Add a chart', body: `<label class="f">Report<select name="r">${RP_MODS.map(([m, l]) => { const rs = L.filter(r => r.module === m); return rs.length ? `<optgroup label="${esc(l)}">${rs.map(r => opt(r.id, r.name)).join('')}</optgroup>` : ''; }).join('')}</select></label>
          ${kind === 'chart' ? `<label class="f">Chart<select name="c">${[['', 'As the report sets it'], ['bar', 'Bars'], ['column', 'Columns'], ['donut', 'Donut'], ['line', 'Line']].map(([k, l]) => opt(k, l, '')).join('')}</select></label><p class="muted small">A list report shows its number of rows instead.</p>` : '<p class="muted small">The card shows the report’s total: its count, or the total of a summary.</p>'}
          <label class="f">Title <span class="optl">(optional)</span><input name="t" placeholder="The report’s name"></label>`, submit: 'Add',
          onSubmit: async v => { await this.save([...(this.d.items || []), { report_id: +v.r, show: kind, ...(v.c ? { chart: v.c } : {}), ...(v.t ? { title: v.t } : {}) }]); toast('Added'); } }); }
      const rm = e.target.closest('[data-drm]'); if (rm) { const items = [...this.d.items]; items.splice(this.d.items.indexOf(this.items[+rm.dataset.drm].it), 1); return this.save(items); }
      if (e.target.closest('[data-dnew]')) return modal({ title: 'New dashboard', body: '<label class="f">Name<input name="n" required placeholder="e.g. Leave watch"></label>', submit: 'Create',
        onSubmit: async v => { const id = await q(sb.rpc('hr_rep_dash_save', { p: { name: v.n, items: [] } })); go('#/people/admin/rep/dashboards/' + id); } });
      if (e.target.closest('[data-dren]')) return modal({ title: 'Rename dashboard', body: `<label class="f">Name<input name="n" required value="${esc(this.d.name)}"></label>`, onSubmit: async v => this.save(this.d.items, v.n) });
      if (e.target.closest('[data-ddel]')) { if (!await pcConfirm('Delete “' + esc(this.d.name) + '”?', 'Only the dashboard goes; its reports stay in the library.', 'Delete')) return;
        await pcTry(() => q(sb.rpc('hr_rep_dash_delete', { p_id: this.d.id })), 'Dashboard deleted'); return go('#/people/admin/rep/dashboards'); }
      const h = e.target.closest('.rp-card .rp-hit'); if (h) { const i = +h.closest('[data-di]').dataset.di; const { r } = this.items[i]; const res = this.runs[i];
        rpDrill({ rep: r, def: res.report.def, st: {}, run: o => q(sb.rpc('hr_rep_run', { p_id: r.id, p_opts: o })) }, h.dataset.k1, h.dataset.k2); }
    });
  }
};

// ================================================================ Scheduled reports
RP.pages.schedules = { perms: ['view-reports'],
  async load() {
    const [rows, cfg] = await Promise.all([q(sb.rpc('hr_rep_schedules')), rpCfgLoad(true)]); this.rows = rows;
    const can = pcCan('schedule-reports') && cfg.schedules_on;
    return topbar('Scheduled reports', 'Reports emailed on a timetable. Each email carries a link that opens the report in Nest with the latest figures; no file goes in the inbox.', can ? `<button type="button" class="btn primary" data-snew>${ico('plus')}Schedule a report</button>` : '') +
      (!cfg.schedules_on ? `<div class="notice">${ico('clock')}Scheduled reports are switched off, so nothing is emailed.${pcCan('manage-report-settings') ? ' <a href="#/people/admin/rep/settings">Switch them on in Settings</a>.' : ' HR can switch them on in Settings.'}</div>` : '') +
      pcTable('rpsch', [{ l: 'Schedule', v: r => r.name, f: r => `<b>${esc(r.name)}</b><br><small class="muted">${esc(r.report)}</small>` },
        { l: 'How often', v: r => r.frequency, f: r => `${esc(RP_FREQ[r.frequency])}<br><small class="muted">from ${fd(r.start_date)} at ${esc(r.at_time)}</small>` },
        { l: 'Next send', v: r => r.next_at || '', f: r => r.active && r.next_at ? pdfStamp(r.next_at) : '—' }, { l: 'Last sent', v: r => r.last_sent_at || '', f: r => r.last_sent_at ? pdfStamp(r.last_sent_at) + `<br><small class="muted">${plural(r.sent_count, 'time')}</small>` : 'Not yet' },
        { l: 'Recipients', v: r => r.recipient_names.join(', '), f: r => `${esc(r.recipient_names.slice(0, 3).join(', '))}${r.recipient_names.length > 3 ? ` and ${r.recipient_names.length - 3} more` : ''}` },
        { l: 'Status', v: r => r.active ? 1 : 0, f: r => r.active ? pcChip('ok', 'Active') : pcChip('muted', r.frequency === 'once' && r.last_sent_at ? 'Sent' : 'Paused') },
        { l: '', sort: false, cls: 'num', f: r => pcCan('schedule-reports') ? `<button type="button" class="btn small" data-sact="${r.id}">Action ▾</button>` : '' }], rows,
        { noun: 'schedule', empty: cfg.schedules_on ? 'No reports are scheduled. Open a report and choose Schedule.' : 'Nothing is scheduled.' });
  },
  bind(main) {
    main.addEventListener('click', async e => {
      if (e.target.closest('[data-snew]')) return rpScheduleDlg({});
      const b = e.target.closest('[data-sact]'); if (!b) return; const s = this.rows.find(x => x.id === +b.dataset.sact);
      const k = await rpMenu(b, [['edit', 'Edit', 'edit'], ['open', 'Open the report', 'eye'], s.active ? ['pause', 'Pause', 'clock'] : ['resume', 'Resume', 'clock'], ['del', 'Delete', 'trash', true]]);
      if (k === 'edit') return rpScheduleDlg(s);
      if (k === 'open') return go('#/people/admin/rep/view/' + s.report_id);
      if (k === 'pause' || k === 'resume') { await pcTry(() => q(sb.rpc('hr_rep_schedule_toggle', { p_id: s.id, p_on: k === 'resume' })), k === 'pause' ? 'Paused: recipients lose access until it resumes' : 'Resumed'); return render({ quiet: true }); }
      if (k === 'del') { if (!await pcConfirm('Delete “' + esc(s.name) + '”?', 'Nothing more is sent, and its recipients lose access unless the report is also shared with them.', 'Delete')) return;
        await pcTry(() => q(sb.rpc('hr_rep_schedule_delete', { p_id: s.id })), 'Schedule deleted'); render({ quiet: true }); }
    });
  }
};

// ================================================================ Audit trail
const RP_ACT = { viewed: ['muted', 'Viewed'], exported: ['out', 'Exported'], printed: ['out', 'Printed'], insert: ['ok', 'Created'], update: ['pending', 'Changed'], delete: ['rejected', 'Deleted'], sent: ['ok', 'Emailed'], settings: ['pending', 'Settings'] };
RP.pages.audit = { perms: ['view-report-audit'],
  async load(rest, params) {
    const from = params.get?.('from') || '', to = params.get?.('to') || '';
    const rows = await q(sb.rpc('hr_rep_audit', { p_from: from || null, p_to: to || null }));
    const what = r => r.table === 'hr_rep_schedules' ? 'Schedule' : r.table === 'hr_rep_shares' ? 'Sharing' : 'Report';
    return topbar('Audit trail', 'Every view, export, change, share and scheduled email for reports.') +
      `<form class="rp-filters" data-af><label class="rp-f"><span>From</span><input type="date" name="from" value="${esc(from)}"></label><label class="rp-f"><span>To</span><input type="date" name="to" value="${esc(to)}"></label><button class="btn small">Show</button></form>` +
      pcTable('rpaud', [{ l: 'Date', v: r => r.at, f: r => pdfStamp(r.at) }, { l: 'User', v: r => r.user_name, f: r => esc(r.user_name || '') }, { l: 'Action', v: r => r.action, f: r => pcChip(...(RP_ACT[r.action] || ['muted', r.action])) },
        { l: 'Description', v: r => `${what(r)} ${r.name || ''}`, f: r => `${esc(what(r))}: ${r.report_id ? `<a href="#/people/admin/rep/view/${r.report_id}">${esc(r.name || '#' + r.report_id)}</a>` : esc(r.name || '')}${r.person ? ` <small class="muted">with ${esc(r.person)}</small>` : ''}${r.detail?.format ? ` <small class="muted">as ${esc(String(r.detail.format).toUpperCase())}${r.detail.rows != null ? ', ' + plural(r.detail.rows, 'row') : ''}</small>` : ''}${r.detail?.shared ? ' <small class="muted">(shared copy)</small>' : ''}${r.detail?.recipients ? ` <small class="muted">to ${plural(r.detail.recipients, 'person', 'people')}</small>` : ''}` },
        { l: 'Module', v: r => r.module ? rpModName(r.module) : '', f: r => r.module ? esc(rpModName(r.module)) : '' }], rows,
        { noun: 'entry', csv: 'reports_audit_trail', filters: [{ k: 'a', l: 'Action', opts: Object.entries(RP_ACT).map(([k, [, l]]) => [k, l]), test: (r, v) => r.action === v }, { k: 'm', l: 'Module', opts: RP_MODS.map(([k, l]) => [k, l]), test: (r, v) => r.module === v }] });
  },
  bind(main) { const f = $('[data-af]', main); if (f) f.onsubmit = e => { e.preventDefault(); const v = Object.fromEntries(new FormData(f)); go(`#/people/admin/rep/audit?from=${v.from}&to=${v.to}`); }; }
};

// ================================================================ Settings
RP.pages.settings = { perms: ['manage-report-settings'],
  async load() {
    const cfg = await rpCfgLoad(true); const pii = new Set(cfg.pii || []);
    const groups = [['Employee details', ['date_of_birth', 'age', 'marital_status', 'state_of_origin', 'nationality']], ['Contact and address', ['personal_email', 'mobile', 'work_phone', 'address']],
      ['Next of kin', ['kin_name', 'kin_relationship', 'kin_phone']], ['Bank and tax', ['bank', 'account_no', 'account_name', 'bvn', 'nin', 'tin', 'tax_state']], ['Pension and pay', ['pfa', 'rsa_pin', 'gross_pay', 'from_salary', 'to_salary']]];
    return topbar('Report settings', 'How reports are sent and which details count as private.') +
      `<form id="rpset"><section class="panel"><header><h2>Scheduled reports</h2><span class="meta">${cfg.schedules_on ? 'On' : 'Off'}</span></header><div class="body">
          <label class="switch pc-sw"><input type="checkbox" name="schedules_on" ${cfg.schedules_on ? 'checked' : ''}><span class="sw"></span><span><b>Email reports on a schedule</b><span class="sub muted">When on, HR can schedule a report to chosen people daily, weekly, monthly or yearly. The email carries a link to the report in Nest, never the file. Switching it off stops every schedule from sending.</span></span></label></div></section>
        <section class="panel"><header><h2>Private details</h2><span class="meta">${plural(pii.size, 'field')} private</span></header><div class="body">
          <p class="muted">Ticked fields show only to people whose role lets them see private staff data (View employee private data). Everyone else sees the report without them, with a note saying so.</p>
          <div class="rp-piig">${groups.map(([l, fs]) => `<div><div class="pc-sec">${esc(l)}</div>${fs.map(f => `<label class="check"><input type="checkbox" name="pii_${f}" ${pii.has(f) ? 'checked' : ''}> ${esc(rpL(f))}</label>`).join('')}</div>`).join('')}</div></div></section>
        <p><button class="btn primary">Save</button></p></form>`;
  },
  bind(main) {
    settingsAccordion(main, 'rep-settings');
    const f = $('#rpset', main); f.onsubmit = async e => { e.preventDefault(); const pii = $$('[name^=pii_]', f).filter(i => i.checked).map(i => i.name.slice(4));
      S.pc.repCfg = await pcTry(() => q(sb.rpc('hr_rep_settings_save', { p: { schedules_on: $('[name=schedules_on]', f).checked, pii } })), 'Settings saved'); render({ quiet: true }); };
  }
};

// ================================================================ Self service: reports shared with me (PeopleCore → Reports)
PC_SELF.reports = {
  async load(rest) {
    const id = +rest[0] || null; this.id = id;
    if (id && pcAccRaw().perms?.includes('view-reports')) { setTimeout(() => go('#/people/admin/rep/view/' + id), 0); return '<div class="loading">Opening…</div>'; }
    if (!id) { const rows = await q(sb.rpc('hr_rep_mine')); S.pc.repShared = rows.length;
      return topbar('Reports', 'Reports HR has shared with you. They show the latest figures each time you open them.') + (rows.length ? pcTable('rpmine', [
        { l: 'Report', v: r => r.name, f: r => `<b>${esc(r.name)}</b><br><small class="muted">${esc(r.description || '')}</small>` }, { l: 'Module', v: r => rpModName(r.module), f: r => esc(rpModName(r.module)) },
        { l: 'Shared by', v: r => r.shared_by_name || '', f: r => `${esc(r.shared_by_name || 'HR')}${r.scheduled ? '<br><small class="muted">also emailed on a schedule</small>' : ''}` }, { l: 'Since', v: r => r.shared_at, f: r => fd(r.shared_at) }], rows,
        { noun: 'report', search: rows.length > 6, href: r => '#/people/reports/' + r.id }) : '<section class="panel"><div class="pc-empty-hero"><b>No reports shared with you</b>When HR shares a report with you, it appears here.</div></section>'); }
    if (this.rid !== id) { this.st = {}; this.rid = id; }
    let res = await q(sb.rpc('hr_rep_run', { p_id: id, p_opts: { log: 'view' } })); this.rep = res.report; this.def = res.report.def;
    res = this.res = await q(sb.rpc('hr_rep_run', { p_id: id, p_opts: rpOpts(this.def, this.st) }));
    return topbar(this.rep.name, esc(this.rep.description || ''), `<a class="btn" href="#/people/reports">${ico('undo')}All my reports</a><button type="button" class="btn" data-exp>${ico('down')}Download ▾</button>`) +
      `<div class="hr-chips rp-chips">${pcChip('out', rpModName(this.rep.module))}<span class="muted">Shared by HR · read-only · latest figures</span></div><div id="rp-out">${rpReportHtml(this.rep, this.def, res, this.st)}</div>`;
  },
  bind(main) {
    if (!this.id || !this.rep) return; const box = $('#rp-out', main); if (!box) return;
    const ctx = { rep: this.rep, def: this.def, st: this.st, run: o => q(sb.rpc('hr_rep_run', { p_id: this.id, p_opts: o })),
      redraw: () => { box.innerHTML = rpReportHtml(this.rep, this.def, this.res, this.st); pcBindTables(box); },
      refresh: async () => { box.classList.add('rp-busy'); try { this.res = await ctx.run(rpOpts(this.def, this.st)); ctx.redraw(); } catch (e) { toast(niceError(e), true); } box.classList.remove('rp-busy'); } };
    rpReportBind(box, ctx);
    $('[data-exp]', main).onclick = async e => { const k = await rpMenu(e.currentTarget, [['xlsx', 'Excel (.xlsx)', 'down'], ['pdf', 'PDF', 'pdf']]); if (k) pcTry(() => rpExport(this.rep, this.def, this.res, k, rpFiltText(this.def, this.st))); };
  }
};
const pcAccRaw = () => S.pc.acc || {};
// the Reports item in My self service only shows when something is shared with you
async function rpSharedCount() {
  if (S.pc.repSharedAt && Date.now() - S.pc.repSharedAt < 60000) return S.pc.repShared || 0;
  S.pc.repSharedAt = Date.now(); try { S.pc.repShared = (await q(sb.rpc('hr_rep_mine'))).length; } catch (e) { S.pc.repShared = 0; } return S.pc.repShared;
}
