/* GANKCO Nest 3.0.5 — PeopleCore Surveys (stage 4): question library, surveys with an anonymous switch, sending to
   everyone / departments / job roles / people, answering, results and reminders. Hooks: onboarding survey, appraisal survey. */
'use strict';

PC_MODS.survey = { name: 'Surveys', icon: 'audit', desc: 'Ask staff questions, anonymously if you want, and see the results.',
  perms: ['view-survey', 'create-survey', 'view-survey-results', 'manage-survey-questions'], pages: {}, menu: [] };
const SV = PC_MODS.survey;
SV.menu = [['', 'Surveys', 'audit', ['view-survey', 'create-survey', 'view-survey-results']], ['questions', 'Question library', 'plan', ['manage-survey-questions', 'create-survey']]];
if (typeof HR_SOON !== 'undefined') HR_SOON.surveys = ['Surveys', 'Surveys HR sends you. Anonymous ones don’t keep your name.', 'Ready'];
const SV_KIND = { short: 'Short text', long: 'Long text', single: 'One choice', multi: 'Several choices', dropdown: 'Dropdown', rating: 'Rating 1–5', yesno: 'Yes or no', date: 'Date', number: 'Number' };
const SV_ST = { draft: ['muted', 'Draft'], open: ['ok', 'Open'], closed: ['out', 'Closed'] };
const SV_PURPOSE = { general: 'General', onboarding: 'Onboarding (sent to new staff)', appraisal: 'Appraisal (sent with an appraisal)' };

// one question as a form control
function svInput(qn, val, dis) {
  const n = `sq_${qn.id}`, d = dis ? 'disabled' : '', ops = qn.options || [];
  switch (qn.kind) {
    case 'long': return `<textarea name="${n}" rows="3" ${d}>${esc(val ?? '')}</textarea>`;
    case 'single': return `<div class="sv-opts">${ops.map(o => `<label><input type="radio" name="${n}" value="${esc(o)}" ${val === o ? 'checked' : ''} ${d}><span>${esc(o)}</span></label>`).join('')}</div>`;
    case 'multi': return `<div class="sv-opts">${ops.map(o => `<label><input type="checkbox" name="${n}" value="${esc(o)}" ${(val || []).includes(o) ? 'checked' : ''} ${d}><span>${esc(o)}</span></label>`).join('')}</div>`;
    case 'dropdown': return `<select name="${n}" ${d}><option value="">Choose…</option>${ops.map(o => opt(o, o, val ?? '')).join('')}</select>`;
    case 'rating': return `<div class="sv-rate">${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="${n}" value="${v}" ${+val === v ? 'checked' : ''} ${d}><span>${v}</span></label>`).join('')}<small class="muted">1 is lowest, 5 is highest</small></div>`;
    case 'yesno': return `<div class="sv-opts">${['Yes', 'No'].map(o => `<label><input type="radio" name="${n}" value="${o}" ${val === o ? 'checked' : ''} ${d}><span>${o}</span></label>`).join('')}</div>`;
    case 'date': return `<input type="date" name="${n}" value="${esc(val ?? '')}" ${d}>`;
    case 'number': return `<input type="number" step="any" name="${n}" value="${esc(val ?? '')}" ${d}>`;
    default: return `<input name="${n}" value="${esc(val ?? '')}" ${d}>`;
  }
}
function svRead(root, qs) {
  const out = {};
  qs.forEach(qn => { const n = `sq_${qn.id}`;
    if (qn.kind === 'multi') out[qn.id] = $$(`[name="${n}"]:checked`, root).map(i => i.value);
    else if (['single', 'rating', 'yesno'].includes(qn.kind)) { const c = $(`[name="${n}"]:checked`, root); out[qn.id] = c ? (qn.kind === 'rating' ? +c.value : c.value) : null; }
    else { const el = $(`[name="${n}"]`, root); const v = el?.value.trim(); out[qn.id] = v === '' || v == null ? null : qn.kind === 'number' ? +v : v; } });
  return out;
}
function svAnswerHtml(d) {
  const s = d.survey; const dis = !d.can_answer;
  return `<section class="panel sv-head"><div class="body"><h2>${esc(s.title)}</h2>${s.description ? `<p>${esc(s.description)}</p>` : ''}
      <div class="hr-chips">${s.anonymous ? pcChip('ok', 'Anonymous: your name isn’t kept with your answers') : pcChip('muted', 'Your name is kept with your answers')}${s.due_date ? pcChip('pending', 'Due ' + fd(s.due_date)) : ''}${d.mine === 'done' ? pcChip('ok', 'Answered') : ''}${d.preview ? pcChip('muted', 'Preview') : ''}</div></div></section>
    <form id="svf" class="panel"><div class="body sv-qs">${d.questions.map((qn, i) => `<div class="sv-q"><label class="sv-ql"><span>${i + 1}</span><b>${esc(qn.text)}${qn.required ? ' <i class="req">*</i>' : ''}</b></label>${svInput(qn, s.anonymous && d.mine === 'done' ? null : qn.answer, dis)}</div>`).join('')}</div>
      ${d.can_answer ? `<div class="pf-wfoot"><span class="muted">${s.anonymous ? 'Once sent, anonymous answers can’t be changed.' : d.mine === 'done' ? 'You can change your answers while the survey is open.' : ''}</span><span class="right"><button class="btn primary">${d.mine === 'done' ? 'Update answers' : 'Send answers'}</button></span></div>`
        : `<div class="pf-wfoot"><span class="muted">${d.preview ? 'This is how staff see it.' : s.status !== 'open' ? 'This survey is closed.' : 'Thank you: your answers were sent.'}</span></div>`}</form>`;
}

// ================================================================ self service: Work → Surveys
PC_SELF.surveys = {
  async load(rest, params) { params = pfP(params); this.sid = +params.s || null;
    if (this.sid) { const d = this.d = await q(sb.rpc('hr_survey_get', { p_id: this.sid })); return topbar('Surveys', '', '<a class="btn" href="#/people/work/surveys">All surveys</a>') + svAnswerHtml(d); }
    const rows = await q(sb.rpc('hr_survey_mine'));
    return topbar('Surveys', 'Surveys HR sends you.') + (rows.length ? pcTable('svmine', [{ l: 'Survey', v: r => r.title, f: r => `<b>${esc(r.title)}</b>${r.anonymous ? ' ' + pcChip('ok', 'Anonymous') : ''}<br><small class="muted">${plural(+r.questions, 'question')}</small>` },
      { l: 'Sent', v: r => r.added_on, f: r => fd(r.added_on) }, { l: 'Due', v: r => r.due_date || '', f: r => r.due_date ? fd(r.due_date) : '—' },
      { l: 'Status', v: r => r.mine, f: r => r.mine === 'done' ? pcChip('ok', 'Answered') : r.status === 'open' ? pcChip('pending', 'Waiting for you') : pcChip('muted', 'Closed') }], rows,
      { noun: 'survey', search: false, href: r => '#/people/work/surveys?s=' + r.id }) : '<section class="panel"><div class="pc-empty-hero"><b>No surveys available</b>There are no surveys for you.</div></section>');
  },
  bind(main) { const f = $('#svf', main); if (!f || !this.d?.can_answer) return;
    f.onsubmit = async e => { e.preventDefault(); const a = svRead(f, this.d.questions);
      if (this.d.survey.anonymous && !await pcConfirm('Send your answers?', 'They are anonymous and can’t be changed afterwards.', 'Send', false)) return;
      await pcTry(() => q(sb.rpc('hr_survey_submit', { p_id: this.sid, p_answers: a })), 'Thank you: answers sent'); render({ quiet: true }); }; }
};

// ================================================================ Admin: surveys
SV.pages[''] = { perms: ['view-survey', 'create-survey', 'view-survey-results'],
  async load(rest) {
    if (rest[0] === 'edit') return this.editor(rest[1]);
    if (rest[0] === 'results') return this.results(+rest[1]);
    if (rest[0] === 'preview') { this.mode = 'preview'; const d = await q(sb.rpc('hr_survey_get', { p_id: +rest[1] })); return topbar('Preview', '', `<a class="btn" href="#/people/admin/survey">Back</a>`) + svAnswerHtml({ ...d, can_answer: false, preview: true }); }
    this.mode = 'list'; const rows = this.rows = await q(sb.rpc('hr_survey_list'));
    const acts = r => [pcCan('edit-survey', 'create-survey') ? ['edit', 'Edit'] : null, ['preview', 'Preview'], pcCan('send-survey') && r.purpose === 'general' ? ['send', r.status === 'draft' ? 'Send' : 'Send to more people'] : null,
      pcCan('view-survey-results') && r.status !== 'draft' ? ['results', 'Results'] : null, pcCan('send-survey') && r.status === 'open' && +r.sent > +r.done ? ['remind', 'Remind who hasn’t answered'] : null,
      r.status === 'open' && pcCan('edit-survey', 'send-survey') ? ['close', 'Close'] : null, r.status === 'closed' && pcCan('edit-survey', 'send-survey') ? ['reopen', 'Reopen'] : null,
      pcCan('create-survey') ? ['duplicate', 'Duplicate'] : null, pcCan('delete-survey') ? ['delete', 'Delete'] : null].filter(Boolean);
    return topbar('Surveys', 'Build a survey from the question library, choose who gets it, and follow the answers.', pcCan('create-survey') ? `<a class="btn primary" href="#/people/admin/survey/edit/new">${ico('plus')}Create survey</a>` : '') +
      pcTable('svall', [{ l: 'Survey', v: r => r.title, f: r => `<b>${esc(r.title)}</b>${r.anonymous ? ' ' + pcChip('ok', 'Anonymous') : ''}<br><small class="muted">${plural(+r.questions, 'question')} · ${esc(SV_PURPOSE[r.purpose])}${r.cycles?.length ? ' · ' + esc(r.cycles.join(', ')) : ''}</small>` },
        { l: 'Status', v: r => r.status, f: r => pcChip(...SV_ST[r.status]) + (r.due_date ? `<br><small class="muted">due ${fd(r.due_date)}</small>` : ''), csv: r => SV_ST[r.status][1] },
        { l: 'Sent to', cls: 'num', v: r => +r.sent }, { l: 'Answered', cls: 'num', v: r => +r.done, f: r => r.sent ? `${r.done} <small class="muted">(${Math.round(r.done / r.sent * 100)}%)</small>` : '—' },
        { l: '', cls: 'num', sort: false, csv: false, f: r => `<select class="inline mini" data-svact="${r.id}" aria-label="Actions"><option value="">Actions…</option>${acts(r).map(([k, l]) => opt(k, l, '')).join('')}</select>` }], rows,
        { noun: 'survey', csv: 'Surveys', empty: 'No surveys yet.' });
  },
  async editor(id) {
    this.mode = 'edit'; const [cats, lib] = await Promise.all([q(sb.from('hr_survey_categories').select('*').order('name')), q(sb.from('hr_survey_questions').select('*').eq('active', true).order('id'))]);
    const s = this.s = id && id !== 'new' ? (await q(sb.rpc('hr_survey_get', { p_id: +id }))) : null; Object.assign(this, { cats, lib });
    this.qs = s ? s.questions.map(x => ({ id: x.id, text: x.text, kind: x.kind, options: x.options, required: x.required, category_id: x.category_id })) : [{ kind: 'rating', required: true }];
    const v = s ? s.survey : { anonymous: false, purpose: 'general', remind_days: 3 };
    this.F = [{ k: 'title', l: 'Title', req: true, wide: true }, { k: 'description', l: 'Description (shown to staff)', t: 'textarea', rows: 2 },
      { k: 'anonymous', l: 'Anonymous', t: 'switch', hint: 'Answers are kept without names and results show totals only. It can’t change once people have answered.' },
      { k: 'purpose', l: 'Used for', t: 'select', blank: false, opts: Object.entries(SV_PURPOSE), hint: 'Onboarding: chosen in Onboarding settings. Appraisal: chosen when setting up an appraisal cycle.' },
      { k: 'due_date', l: 'Due', t: 'date' }, { k: 'remind_days', l: 'Remind people who haven’t answered every (days)', t: 'number', min: 0, max: 30, hint: '0 for no reminders.' }];
    return topbar(s ? 'Edit survey' : 'Create survey', s ? pcChip(...SV_ST[s.survey.status]) : 'Add questions from the library or write new ones.', '<a class="btn" href="#/people/admin/survey">Back to surveys</a>') +
      `<section class="panel"><div class="body" id="svform">${pcForm(this.F, v)}</div></section>
       <section class="panel"><header><h2>Questions</h2><span class="right"><button class="btn small" id="svlib">${ico('plan')}From the library</button><button class="btn small" id="svq">${ico('plus')}New question</button></span></header><div class="body"><div id="svqs"></div></div></section>
       <div class="pf-savebar"><button class="btn primary" id="svsave">Save survey</button></div>`;
  },
  qHtml(x, i) { const opts = ['single', 'multi', 'dropdown'].includes(x.kind);
    return `<div class="sv-qe" data-i="${i}"><span class="sv-qn">${i + 1}</span><div class="sv-qm"><input data-q="text" placeholder="Question" value="${esc(x.text || '')}" ${x.id ? 'title="From the library: changing it changes it everywhere"' : ''}>
      <div class="sv-qrow"><select data-q="kind">${Object.entries(SV_KIND).map(([k, l]) => opt(k, l, x.kind || 'short')).join('')}</select><select data-q="category_id"><option value="">No category</option>${this.cats.map(c => opt(c.id, c.name, x.category_id || '')).join('')}</select>
        <label class="pc-ck"><input type="checkbox" data-q="required" ${x.required !== false ? 'checked' : ''}><span>Required</span></label>${x.id ? pcChip('muted', 'Library') : ''}</div>
      ${opts ? `<textarea data-q="options" rows="2" placeholder="One answer per line">${esc((x.options || []).join('\n'))}</textarea>` : ''}</div>
      <span class="sv-qa"><button type="button" class="btn small pf-ib" data-qup="${i}" title="Move up">${ico('up')}</button><button type="button" class="btn small pf-ib" data-qdel="${i}" title="Remove">${ico('trash')}</button></span></div>`; },
  readQs(main) { $$('.sv-qe', main).forEach(el => { const x = this.qs[+el.dataset.i]; x.text = $('[data-q=text]', el).value; x.kind = $('[data-q=kind]', el).value; x.category_id = $('[data-q=category_id]', el).value || null; x.required = $('[data-q=required]', el).checked;
    const o = $('[data-q=options]', el); if (o) x.options = o.value.split('\n').map(s => s.trim()).filter(Boolean); }); },
  async results(id) {
    this.mode = 'results'; const r = this.r = await q(sb.rpc('hr_survey_results', { p_id: id })); const s = r.survey;
    const head = topbar(esc(s.title), `${pcChip(...SV_ST[s.status])} ${s.anonymous ? pcChip('ok', 'Anonymous') : ''}`, `<a class="btn" href="#/people/admin/survey">Back</a>${pcCan('export-survey-results') && !r.hidden ? `<button class="btn" id="svcsv">${ico('down')}Export</button>` : ''}`) +
      pcKpis([[r.sent, 'Sent to'], [r.responses, 'Responses'], [r.sent ? Math.round(r.done / r.sent * 100) + '%' : '—', 'Response rate'], [r.sent - r.done, 'Not answered yet']]);
    if (r.hidden) return head + `<section class="panel"><div class="pc-empty-hero"><b>Results appear after ${r.min} responses</b>This survey is anonymous, so results stay hidden until there are enough answers that nobody can be picked out.</div></section>`;
    return head + r.questions.map((qn, i) => { const tot = qn.counts ? Object.values(qn.counts).reduce((a, b) => a + b, 0) : 0;
      const keys = qn.kind === 'rating' ? ['1', '2', '3', '4', '5'] : qn.kind === 'yesno' ? ['Yes', 'No'] : (qn.options || []);
      return `<section class="panel"><header><h2>${i + 1}. ${esc(qn.text)}</h2><span class="meta">${esc(SV_KIND[qn.kind])}${qn.avg != null ? ` · average <b>${pfNum(qn.avg)}</b>` : ''}</span></header>
        ${qn.counts ? pcBars(keys.map(k => ({ name: k, n: qn.counts[k] || 0 })), { pct: true }) + (tot ? '' : '') : ''}
        ${qn.texts ? (qn.texts.length ? `<ul class="list sv-texts">${qn.texts.map(t => `<li><div class="main"><div class="sub">${esc(t.v)}</div>${t.name ? `<div class="name">${esc(t.name)}</div>` : ''}</div></li>`).join('')}</ul>` : '<div class="empty">No answers yet.</div>') : ''}</section>`; }).join('') +
      (r.people ? `<h2 class="pc-h2">Who has answered</h2>` + pcTable('svppl', [{ l: 'Employee', v: x => x.name }, { l: 'Department', v: x => x.unit || '' }, { l: 'Status', v: x => x.status, f: x => x.status === 'done' ? pcChip('ok', 'Answered ' + fd(x.done_on)) : pcChip('pending', 'Not yet') }], r.people, { noun: 'person', csv: 'Survey answered' }) : '');
  },
  bind(main) {
    if (this.mode === 'results') { const b = $('#svcsv', main); if (b) b.onclick = () => pcCsv(`${this.r.survey.title}.csv`, [{ l: 'Question', k: 'q' }, { l: 'Answer', k: 'a' }, { l: 'Count or name', k: 'n' }],
      this.r.questions.flatMap(qn => [...Object.entries(qn.counts || {}).map(([a, n]) => ({ q: qn.text, a, n })), ...(qn.texts || []).map(t => ({ q: qn.text, a: t.v, n: t.name || '' })), ...(qn.avg != null ? [{ q: qn.text, a: 'Average', n: qn.avg }] : [])])); return; }
    if (this.mode === 'edit') {
      const box = $('#svqs', main); const draw = () => { box.innerHTML = this.qs.map((x, i) => this.qHtml(x, i)).join('') || '<div class="empty">No questions yet.</div>'; };
      draw();
      box.addEventListener('change', e => { if (e.target.matches('[data-q=kind]')) { this.readQs(main); draw(); } });
      box.addEventListener('click', e => { const d = e.target.closest('[data-qdel]'), u = e.target.closest('[data-qup]'); if (!d && !u) return; this.readQs(main);
        if (d) this.qs.splice(+d.dataset.qdel, 1); else { const i = +u.dataset.qup; if (i > 0) [this.qs[i - 1], this.qs[i]] = [this.qs[i], this.qs[i - 1]]; } draw(); });
      $('#svq', main).onclick = () => { this.readQs(main); this.qs.push({ kind: 'short', required: true }); draw(); $$('.sv-qe [data-q=text]', box).at(-1).focus(); };
      $('#svlib', main).onclick = () => { this.readQs(main); const have = new Set(this.qs.map(x => x.id).filter(Boolean));
        pcEdit({ title: 'Add from the question library', wide: true, submit: 'Add', fields: [{ k: 'ids', l: 'Questions', t: 'checks', opts: this.lib.filter(x => !have.has(x.id)).map(x => [x.id, `${x.text} · ${SV_KIND[x.kind]}${x.category_id ? ' · ' + (this.cats.find(c => c.id === x.category_id)?.name || '') : ''}`]) }],
          save: async v => { (v.ids || []).forEach(id => { const x = this.lib.find(y => y.id === +id); this.qs.push({ id: x.id, text: x.text, kind: x.kind, options: x.options, required: x.required, category_id: x.category_id }); }); draw(); } }); };
      $('#svsave', main).onclick = async () => { this.readQs(main); const v = pcRead($('#svform', main), this.F); if (!v.title) return toast('Give the survey a title', true);
        const id = await pcTry(() => q(sb.rpc('hr_survey_save', { p: { ...v, id: this.s?.survey.id || null, questions: this.qs } })), 'Survey saved');
        go(v.purpose === 'general' && !this.s ? '#/people/admin/survey?send=' + id : '#/people/admin/survey'); };
      return;
    }
    if (this.mode !== 'list') return;
    const send = async id => { const r = this.rows.find(x => x.id === id);
      pcEdit({ title: 'Send ' + r.title, sub: r.anonymous ? 'Anonymous: answers are kept without names.' : 'Answers are kept with names.', wide: true, submit: 'Send',
        fields: [{ k: 'to', l: 'Send to', t: 'radio', def: 'all', opts: [['all', 'Everyone'], ['units', 'Departments'], ['jobs', 'Job roles'], ['emps', 'Chosen people']] },
          { k: 'units', l: 'Departments', t: 'checks', opts: pcDepts().filter(u => u.active).map(u => [u.id, u.name]), show: v => v.to === 'units' }, { k: 'jobs', l: 'Job roles', t: 'checks', opts: (S.pc.look?.jobs || []).filter(j => j.active).map(j => [j.id, j.name]), show: v => v.to === 'jobs' },
          { k: 'emps', l: 'People', t: 'checks', opts: pcPeopleList(), show: v => v.to === 'emps' }],
        save: async v => { const a = v.to === 'all' ? { all: true } : { [v.to]: v[v.to] || [] }; const n = await q(sb.rpc('hr_survey_send', { p_id: id, p_audience: a })); toast(`Sent to ${plural(n, 'person', 'people')}`); render({ quiet: true }); } }); };
    const want = +new URLSearchParams(location.hash.split('?')[1] || '').get('send'); if (want) { history.replaceState(null, '', '#/people/admin/survey'); setTimeout(() => send(want), 50); }
    main.addEventListener('change', async e => { const s = e.target.closest('[data-svact]'); if (!s || !s.value) return; const id = +s.dataset.svact, a = s.value; s.value = '';
      if (a === 'edit') return go('#/people/admin/survey/edit/' + id); if (a === 'results') return go('#/people/admin/survey/results/' + id); if (a === 'preview') return go('#/people/admin/survey/preview/' + id); if (a === 'send') return send(id);
      if (a === 'delete' && !await pcConfirm('Delete this survey?', 'Its answers are deleted too.', 'Delete')) return;
      await pcTry(() => q(sb.rpc('hr_survey_action', { p_id: id, p_action: a })), { close: 'Closed', reopen: 'Reopened', remind: 'Reminders sent', duplicate: 'Copy made', delete: 'Deleted' }[a]); render({ quiet: true }); });
  }
};
SV.pages.questions = { perms: ['manage-survey-questions', 'create-survey'],
  async load() {
    const [cats, rows] = await Promise.all([q(sb.from('hr_survey_categories').select('*').order('name')), q(sb.from('hr_survey_questions').select('*').order('id'))]); Object.assign(this, { cats, rows });
    return topbar('Question library', 'Questions you can reuse across surveys, grouped by category.', `<button class="btn" data-svc="list">${ico('grid')}Categories (${cats.length})</button><button class="btn primary" data-svq="new">${ico('plus')}New question</button>`) +
      pcTable('svq', [{ l: 'Question', v: r => r.text, f: r => `<b>${esc(r.text)}</b>${r.required ? ' <i class="req">*</i>' : ''}${r.active ? '' : ' ' + pcChip('muted', 'Off')}${r.options?.length ? `<br><small class="muted">${esc(r.options.join(' · '))}</small>` : ''}` },
        { l: 'Answer', v: r => SV_KIND[r.kind] }, { l: 'Category', v: r => cats.find(c => c.id === r.category_id)?.name || '', f: r => esc(cats.find(c => c.id === r.category_id)?.name || '—') },
        { l: '', cls: 'num', sort: false, csv: false, f: r => `<button class="btn small" data-svq="${r.id}">Edit</button>` }], rows,
        { noun: 'question', csv: 'Survey questions', filters: [{ k: 'c', l: 'Category', opts: cats.map(c => [c.id, c.name]), test: (r, v) => r.category_id === +v }] });
  },
  bind(main) { main.addEventListener('click', e => {
    const c = e.target.closest('[data-svc]'); if (c) return svCategories(this.cats, this.rows);
    const b = e.target.closest('[data-svq]'); if (!b) return; const r = b.dataset.svq === 'new' ? { kind: 'short', required: true, active: true } : this.rows.find(x => x.id === +b.dataset.svq);
    pcEdit({ title: r.id ? 'Edit question' : 'New question', wide: false, fields: [{ k: 'text', l: 'Question', req: true }, { k: 'kind', l: 'Answer', t: 'select', blank: false, opts: Object.entries(SV_KIND) },
        { k: 'options', l: 'Answers to choose from (one per line)', t: 'textarea', show: v => ['single', 'multi', 'dropdown'].includes(v.kind) }, { k: 'category_id', l: 'Category', t: 'select', opts: this.cats.map(x => [x.id, x.name]) },
        { k: 'required', l: 'Required', t: 'switch' }, ...(r.id ? [{ k: 'active', l: 'In the library', t: 'switch' }] : [])], vals: { ...r, options: (r.options || []).join('\n') },
      save: async v => { await q(sb.rpc('hr_survey_q_save', { p: { ...v, id: r.id || null, options: (v.options || '').split('\n').map(s => s.trim()).filter(Boolean) } })); toast('Saved'); render({ quiet: true }); },
      del: r.id && pcCan('manage-survey-questions') ? { label: 'Delete question', title: 'Delete this question?', yes: 'Delete question', ok: 'Question deleted',
        text: `“${esc(r.text)}” comes out of the library and of any survey it is on. If people have already answered it, it can’t be deleted: switch off “In the library” instead.`,
        run: () => q(sb.rpc('hr_survey_q_delete', { p_id: r.id })) } : null }); }); }
};

// 3.0.5u: categories: add, rename, delete (questions in a deleted category stay, with no category)
function svCategories(cats, rows) {
  const n = id => rows.filter(r => r.category_id === id).length; const man = pcCan('manage-survey-questions');
  const edit = c => pcEdit({ title: c ? 'Rename category' : 'New category', wide: false, fields: [{ k: 'name', l: 'Name', req: true }, { k: 'description', l: 'Description' }], vals: c || {},
    save: async v => { await q(sb.rpc('hr_survey_cat_save', { p: { ...v, id: c?.id || null } })); toast(c ? 'Category renamed' : 'Category added'); render({ quiet: true }); } });
  return modal({ title: 'Question categories', sub: 'Group questions so they are easier to find when you build a survey.', submit: null, cancel: 'Close',
    body: `${cats.length ? `<ul class="pc-mlist">${cats.map(c => `<li><div class="main"><b>${esc(c.name)}</b><small>${plural(n(c.id), 'question')}${c.description ? ' · ' + esc(c.description) : ''}</small></div>
        <div class="end"><button class="btn small" type="button" data-ce="${c.id}">${ico('edit')}Rename</button>${man ? `<button class="btn small danger-ghost" type="button" data-cd="${c.id}">${ico('trash')}Delete</button>` : ''}</div></li>`).join('')}</ul>`
      : '<div class="pc-empty">No categories yet.</div>'}
      <div class="mt"><button class="btn" type="button" data-cn>${ico('plus')}New category</button></div>`,
    onOpen: (d, close) => {
      $('[data-cn]', d).onclick = () => { close(null); edit(null); };
      $$('[data-ce]', d).forEach(b => b.onclick = () => { close(null); edit(cats.find(c => c.id === +b.dataset.ce)); });
      $$('[data-cd]', d).forEach(b => b.onclick = async () => { const c = cats.find(x => x.id === +b.dataset.cd); close(null);
        if (!await pcConfirm('Delete this category?', `“${esc(c.name)}” is removed.${n(c.id) ? ` Its ${plural(n(c.id), 'question')} stay in the library with no category.` : ''}`, 'Delete category')) return;
        await pcTry(() => q(sb.rpc('hr_survey_cat_delete', { p_id: c.id })), 'Category deleted'); render({ quiet: true }); });
    } });
}

// ================================================================ hooks into Performance and Onboarding
// the appraisal view shows the cycle's survey: the employee answers it, the line manager reads the answers
(function () {
  const base = paHtml;
  paHtml = function (d, ctx) {
    let h = base(d, ctx);
    if (d.mode === 'full' && d.cycle?.survey_id && d.period?.kind === 'appraisal') {
      h += `<section class="panel" id="pa-survey" data-sid="${d.cycle.survey_id}" data-emp="${d.employee.id}"><header><h2>Appraisal survey</h2></header><div class="body">${d.can.self
        ? `<p class="muted">HR asks everyone in this appraisal a few questions.${pfCfg().lm_see_survey !== false ? ' Your line manager can see your answers unless the survey is anonymous.' : ''}</p><a class="btn" href="#/people/work/surveys?s=${d.cycle.survey_id}">${ico('audit')}Open the survey</a>`
        : '<span class="muted">Loading…</span>'}</div></section>`;
    }
    return h;
  };
  const bindBase = paBind;
  paBind = function (main) {
    bindBase(main);
    const box = $('#pa-survey', main); if (!box || S.pc.pa?.can?.self) return;
    q(sb.rpc('hr_survey_answers_of', { p_survey: +box.dataset.sid, p_emp: +box.dataset.emp })).then(a => {
      $('.body', box).innerHTML = a == null ? '<span class="muted">The survey is anonymous, or you can’t see these answers.</span>' : a.length ? `<dl class="sv-dl">${a.map(x => `<dt>${esc(x.q)}</dt><dd>${esc(Array.isArray(x.v) ? x.v.join(', ') : (x.v ?? '—'))}</dd>`).join('')}</dl>` : '<span class="muted">Not answered yet.</span>';
    }).catch(() => { $('.body', box).innerHTML = '<span class="muted">Not available.</span>'; });
  };
})();
// survey sub-pages share the list page's code
['edit', 'results', 'preview'].forEach(k => { SV.pages[k] = { perms: SV.pages[''].perms, load: (rest, params, parts) => SV.pages[''].load([k, ...rest], params, parts), bind: (m, r, p, parts) => SV.pages[''].bind(m, r, p, parts) }; });
