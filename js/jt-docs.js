/* GANKCO Nest 3.0.9 — JobTrack documents: the Daily Operation Report (Excel and a one-page PDF, in GANKCO's own DOR layout from jt-dor.js),
   the unpriced job ticket (PDF and Excel), the reimbursables ticket and the Operations Breakdown. */
'use strict';

const jtTxt = s => pdfText(s).replace(/μ/g, 'µ').replace(/[″“”]/g, '"').replace(/[′‘’]/g, "'");
const JT_GREY = 'EDEEF0';
const jtFile = s => String(s || '').replace(/[\\/:*?"<>|#]+/g, '-').replace(/\s+/g, ' ').trim();
const jtOffice = k => { const o = (setting('po', {}) || {}).offices?.[k]; return o ? [o.line1, o.line2].filter(Boolean).join(', ') : ''; };

// client (or job) logos, left to right, fitted into a box
async function jtLogoImgs(ids) {
  const urls = await jtLogoData(ids || []);
  return Promise.all(urls.map(u => dataImage(u).catch(() => null))).then(a => a.filter(Boolean));
}
function jtDrawRow(doc, imgs, x, y, maxW, maxH, gap = 3) {
  if (!imgs.length) return 0;
  // same height for all, shrink together if the row is too wide
  let h = maxH; let w = imgs.reduce((a, i) => a + h * i.w / i.h, 0) + gap * (imgs.length - 1);
  if (w > maxW) { h = h * (maxW - gap * (imgs.length - 1)) / (w - gap * (imgs.length - 1)); w = maxW; }
  let cx = x; imgs.forEach((i, n) => { const iw = h * i.w / i.h; doc.addImage(i.dataUrl, undefined, cx, y + (maxH - h) / 2, iw, h, 'jtlogo' + n + i.w + i.h, 'FAST'); cx += iw + gap; });
  return w;
}
function jtFooter(doc, label) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(); const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p); doc.setDrawColor(...rgb(PDF_INK.rule)); doc.setLineWidth(.2); doc.line(10, H - 11, W - 10, H - 11);
    doc.setFont('Barlow', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...rgb(PDF_INK.muted));
    doc.text(jtTxt(`${CFG.COMPANY || 'GANKCO Energy Services Limited'} · ${CFG.MOTTO || ''}`), 10, H - 7);
    doc.text(jtTxt(`${label} · Page ${p} of ${n}`), W - 10, H - 7, { align: 'right' });
    doc.setFontSize(6.5); doc.text(jtTxt(`Generated ${pdfStamp(Date.now())} by ${S.profile?.full_name || ''} in GANKCO Nest`), 10, H - 3.8);
  }
}
const jtTableStyle = { font: 'Barlow', fontSize: 8.6, cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 }, lineColor: rgb(PDF_INK.box), lineWidth: .2, textColor: rgb(PDF_INK.ink), valign: 'middle' };
const jtLbl = t => ({ content: jtTxt(t), styles: { fillColor: rgb(JT_GREY), fontStyle: 'bold', textColor: rgb(PDF_INK.ink) } });

// ================================================================ DAILY OPERATION REPORT, in GANKCO's own DOR layout (jt-dor.js)
// One model of the sheet (its rows, cells, merges and logos) is filled from the report. The Excel file writes it as a sheet
// like the ones the team fills by hand; the PDF draws the same sheet on one A4 page, as Excel prints it with "fit sheet on one page".
const JT_COLW = 117;                    // column width in pixels, as in the team's workbook (14.63 characters of its Aptos Narrow Normal font)
const JT_PX = 0.75;                      // points per pixel
const JT_LINE = 15.6;                    // points per line of 12 pt Calibri
const jtColPt = () => JT_COLW * JT_PX;
// 07:25 → 7.25 and 1 h 25 min → 1.25, the way the DOR writes times
const jtDecTime = t => { const m = jtTm(t); return m == null ? null : Math.floor(m / 60) + (m % 60) / 100; };
const jtDecDur = m => m == null ? null : Math.floor(m / 60) + (m % 60) / 100;
function jtTextW(s, size = 12, bold = false) { const W = bold ? JT_DOR.wBold : JT_DOR.wReg; let w = 0; for (const ch of String(s)) w += W[ch.codePointAt(0)] ?? 507; return w * size / 1000; }
// break text into lines no wider than wPt (12 pt Calibri), keeping the writer's own line breaks
function jtWrap(text, wPt, size = 12, bold = false) {
  const out = [];
  String(text ?? '').replace(/\r/g, '').split('\n').forEach(par => {
    const words = par.replace(/\t/g, ' ').split(/ +/).filter((w, i, a) => w !== '' || (i > 0 && i < a.length - 1));
    let line = '';
    words.forEach(w => {
      const t = line ? line + ' ' + w : w;
      if (jtTextW(t, size, bold) <= wPt) { line = t; return; }
      if (line) out.push(line);
      line = w;
      while (jtTextW(line, size, bold) > wPt) { let k = line.length - 1; while (k > 1 && jtTextW(line.slice(0, k), size, bold) > wPt) k--; out.push(line.slice(0, k)); line = line.slice(k); }
    });
    out.push(line);
  });
  while (out.length > 1 && out[out.length - 1] === '') out.pop();
  return out;
}
const JT_ABC = 'ABCDEFGHIJK';
const jtA1 = (c, r) => JT_ABC[c] + r;
const jtRef = a => { const m = /^([A-K])(\d+)$/.exec(a); return [JT_ABC.indexOf(m[1]), +m[2]]; };

// the sheet, filled: { rows: [{h, c: [{s, v}]}], merges: ['A1:C3', ...] } (rows and columns from 1/0)
function jtDorModel(r, j) {
  const D = JT_DOR, cw = jtColPt();
  const clone = rr => ({ h: rr.h, c: rr.c.map(x => ({ s: x[0], v: x[1] ?? null })) });
  const rows = D.head.map(clone); const merges = [...D.headMerges];
  const set = (a, v) => { const [c, n] = jtRef(a); rows[n - 1].c[c].v = v === '' || v === undefined ? null : v; };
  const num = v => v === null || v === undefined || v === '' || isNaN(+v) ? null : +v;
  set('B4', j.client?.name || ''); set('F4', r.client_reps || ''); set('F5', r.gankco_rep || '');
  set('J5', r.well_field || j.field || ''); set('K5', r.well || '');
  set('B6', num(r.report_no)); set('D6', r.report_date ? new Date(r.report_date + 'T00:00:00Z') : null); set('G6', j.project || '');
  set('I7', j.rig_name || 'N/A'); set('J7', j.rig_owner || 'N/A'); set('K7', j.rig_type || 'N/A');
  set('B9', num(r.man_hours)); set('E9', num(r.lti_days)); set('G9', num(r.tri) ?? 0); set('I9', r.hse_comment || '');
  set('C10', r.summary || '');
  // the summary wraps across C10:K12: give it the height it needs
  const sumLines = jtWrap(r.summary || '', cw * 9 - 6).length, sumH = rows[9].h + rows[10].h + rows[11].h, need = sumLines * JT_LINE + 3;
  if (need > sumH) [9, 10, 11].forEach(i => rows[i].h = Math.ceil(rows[i].h * need / sumH * 2) / 2);
  // the activities: one line a row, long ones carried onto the next rows like the team does
  const ops = (r.ops || []).filter(o => String(o.desc || '').trim());
  const lines = [];
  ops.forEach(o => { const m = jtMins(o.from, o.to); jtWrap(o.desc, cw * 8 - 6).forEach((t, k) => lines.push(k ? { d: t } : { a: jtDecTime(o.from), b: jtDecTime(o.to), c: jtDecDur(m), d: t })); });
  const n = Math.max(D.opMinRows, lines.length + 2);
  for (let i = 0; i < n; i++) {
    const row = clone(i === 0 ? D.opFirst : i === n - 1 ? D.opLast : D.opMid); const L = lines[i];
    if (L) { row.c[0].v = L.a ?? null; row.c[1].v = L.b ?? null; row.c[2].v = L.c ?? null; row.c[3].v = L.d; }
    rows.push(row); merges.push(`D${D.opStartRow + i}:K${D.opStartRow + i}`);
  }
  // comments and the look ahead, then POB, days on well and the report page
  const f0 = rows.length + 1;
  D.foot.forEach(rr => rows.push(clone(rr)));
  D.footMerges.forEach(([a, r1, b, r2]) => merges.push(`${a}${f0 + r1}:${b}${f0 + r2}`));
  const fset = (col, k, v) => { rows[f0 - 1 + k].c[JT_ABC.indexOf(col)].v = v === '' || v === undefined ? null : v; };
  const note = [String(r.comments || '').trim(), String(r.look_ahead || '').trim() ? 'Look Ahead; ' + String(r.look_ahead).trim() : ''].filter(Boolean).join('\n');
  fset('D', 0, note);
  const nl = jtWrap(note, cw * 8 - 6).length, nh = rows[f0 - 1].h + rows[f0].h, nneed = nl * JT_LINE + 3;
  if (nneed > nh) [f0 - 1, f0].forEach(i => rows[i].h = Math.ceil(rows[i].h * nneed / nh * 2) / 2);
  fset('J', 2, num(r.report_no)); fset('H', 3, num(r.report_no)); fset('J', 3, num(r.well_reports ?? r.report_no));
  fset('A', 4, num(r.pob_client)); fset('B', 4, num(r.pob_gankco)); fset('C', 4, num(r.pob_others));
  return { rows, merges };
}
// how a value shows in a cell
const JT_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function jtCellText(v, st) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return /mmmm/.test(st.n) ? `${JT_MONTHS[v.getUTCMonth()]} ${v.getUTCDate()}, ${v.getUTCFullYear()}` : v.toISOString().slice(0, 10);
  if (typeof v === 'number') return /^0\.00$/.test(st.n) ? v.toFixed(2) : String(Math.round(v * 100) / 100);
  return String(v);
}
async function jtDorImages(j) {
  const logos = await jtLogoImgs((j.logos || []).map(l => l.id));
  const gk = await imageB64('brand/dor-gankco.png').catch(() => imageB64('brand/logo-full.png'));
  return { logos, gk };
}
// where the logos go (pixels from the sheet's top left): the client's up to 3 in A1:C3, GANKCO's in J1:K3, as on the template
function jtDorLogoBoxes(imgs) {
  const D = JT_DOR, out = []; const a = D.logoArea; const maxW = JT_COLW * 3 - a.x * 2;
  const list = imgs.logos.slice(0, 3); let h = a.h; let w = list.reduce((s, i) => s + h * i.w / i.h, 0) + a.gap * Math.max(0, list.length - 1);
  if (w > maxW) { h = h * (maxW - a.gap * (list.length - 1)) / (w - a.gap * (list.length - 1)); }
  let x = a.x; list.forEach(i => { const iw = h * i.w / i.h; out.push({ img: i, x, y: a.y + (a.h - h) / 2, w: iw, h }); x += iw + a.gap; });
  const g = D.gankco; if (imgs.gk) out.push({ img: imgs.gk, x: g.col * JT_COLW + g.colOff, y: g.row * 20 + g.rowOff, w: g.w, h: g.h, gankco: true });
  return out;
}

// ---------------------------------------------------------------- the Excel file: one sheet a report, named like the team's (19-7-26)
const jtXlBorder = s => s ? { style: s, color: { argb: 'FF000000' } } : undefined;
function jtDorSheet(wb, name, model, imgs, ids) {
  const D = JT_DOR;
  const ws = wb.addWorksheet(name, { views: [{ zoomScale: 70 }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { ...D.margins } } });
  for (let c = 1; c <= D.cols; c++) ws.getColumn(c).width = (JT_COLW - 5) / 7;           // the same 117 px with Excel's default font
  model.rows.forEach((rr, i) => {
    const row = ws.getRow(i + 1); row.height = rr.h;
    rr.c.forEach((cell, c) => {
      const st = D.styles[cell.s]; const x = row.getCell(c + 1);
      if (cell.v !== null && cell.v !== undefined) x.value = cell.v;
      x.font = { name: st.f[0], size: st.f[1], bold: st.f[2] || undefined, ...(st.c ? { color: { argb: 'FF' + st.c } } : {}) };
      const b = {}; ['left', 'top', 'right', 'bottom'].forEach((k, n) => { const v = jtXlBorder(st.b[n]); if (v) b[k] = v; }); if (Object.keys(b).length) x.border = b;
      const al = {}; if (st.h) al.horizontal = st.h; if (st.v) al.vertical = st.v === 'center' ? 'middle' : st.v; if (st.w) al.wrapText = true; if (Object.keys(al).length) x.alignment = al;
      if (st.n) x.numFmt = st.n;
    });
  });
  model.merges.forEach(m => { try { ws.mergeCells(m); } catch (e) { } });
  ws.pageSetup.printArea = `A1:K${model.rows.length}`;
  // logos, placed exactly (in EMU: 9525 to a pixel) from the top left of their cell
  jtDorLogoBoxes(imgs).forEach(b => {
    const id = ids.get(b.img); const col = Math.floor(b.x / JT_COLW);
    ws.addImage(id, { tl: { nativeCol: col, nativeColOff: Math.round((b.x - col * JT_COLW) * 9525), nativeRow: 0, nativeRowOff: Math.round(b.y * 9525) }, ext: { width: b.w, height: b.h }, editAs: 'oneCell' });
  });
  return ws;
}
const jtSheetDate = d => { const x = new Date(d + 'T00:00:00'); return `${x.getDate()}-${x.getMonth() + 1}-${String(x.getFullYear()).slice(2)}`; };
const jtShortDate = d => { const x = new Date(d + 'T00:00:00'); return `${jtOrd(x.getDate())} ${x.toLocaleDateString('en-GB', { month: 'short' })}`; };
// all the job's reports, or just the ones given
async function jtDorWorkbook(j, onlyIds) {
  await loadScript('vendor/exceljs.min.js');
  const X = window.ExcelJS, wb = new X.Workbook(); wb.creator = S.profile?.full_name || ''; wb.lastModifiedBy = S.profile?.full_name || '';
  const ids = (onlyIds?.length ? j.reports.filter(r => onlyIds.includes(r.id)) : j.reports).slice().sort((a, b) => a.report_date.localeCompare(b.report_date) || a.well.localeCompare(b.well)).map(r => r.id);
  if (!ids.length) return toast('There are no daily reports yet.', true);
  const full = []; for (const id of ids) full.push(await q(sb.rpc('jt_report_get', { p_id: id })));
  const imgs = await jtDorImages(j);
  const imgIds = new Map();
  [...imgs.logos, imgs.gk].filter(Boolean).forEach(i => imgIds.set(i, wb.addImage({ base64: i.dataUrl.split(',')[1], extension: /image\/png/.test(i.dataUrl.slice(0, 30)) ? 'png' : 'jpeg' })));
  const perDay = {}; full.forEach(r => { perDay[r.report_date] = (perDay[r.report_date] || 0) + 1; });
  const used = new Set();
  for (const r of full) {
    let name = safeSheet(jtSheetDate(r.report_date) + (perDay[r.report_date] > 1 ? `(${r.well})` : ''));
    let k = 2; while (used.has(name)) name = safeSheet(`${name.slice(0, 26)} ${k++}`); used.add(name);
    jtDorSheet(wb, name, jtDorModel(r, j), imgs, imgIds);
  }
  const buf = await wb.xlsx.writeBuffer();
  const d1 = full[0].report_date, d2 = full[full.length - 1].report_date;
  const label = j.job_type || j.project || j.job_no;
  const fname = full.length === 1 ? `DOR - ${full[0].well} - ${jtShortDate(d1)} ${d1.slice(0, 4)}.xlsx` : `General DOR - ${label} ${jtShortDate(d1)} - ${jtShortDate(d2)} ${d2.slice(0, 4)}.xlsx`;
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), jtFile(fname));
}

// ---------------------------------------------------------------- the PDF: the same sheet, fitted on one A4 page (as printed from Excel)
async function jtDorDoc() {
  await loadScript('vendor/jspdf.umd.min.js'); await loadScript('vendor/po-fonts.js');
  const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
  const F = window.PO_FONTS;
  doc.addFileToVFS('Carlito-Regular.ttf', F['Carlito-Regular']); doc.addFont('Carlito-Regular.ttf', 'Carlito', 'normal');
  doc.addFileToVFS('Carlito-Bold.ttf', F['Carlito-Bold']); doc.addFont('Carlito-Bold.ttf', 'Carlito', 'bold');
  doc.setFont('Carlito', 'normal');
  return doc;
}
function jtDorDraw(doc, model, imgs) {
  const D = JT_DOR, cw = jtColPt();
  const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
  const m = { l: D.margins.left * 72, r: D.margins.right * 72, t: D.margins.top * 72, b: D.margins.bottom * 72 };
  const ys = [0]; model.rows.forEach(rr => ys.push(ys[ys.length - 1] + rr.h));
  const sheetW = cw * D.cols, sheetH = ys[ys.length - 1];
  const k = Math.min(1, (PW - m.l - m.r) / sheetW, (PH - m.t - m.b) / sheetH);
  const X = c => m.l + c * cw * k, Y = r => m.t + ys[r] * k;           // c: column edge (0..11), r: row edge (0..n)
  // merged ranges: [c1, r1, c2, r2] (0-based, inclusive)
  const mg = model.merges.map(s => { const [a, b] = s.split(':'); const [c1, r1] = jtRef(a), [c2, r2] = jtRef(b); return [c1, r1 - 1, c2, r2 - 1]; });
  const mergeOf = (c, r) => mg.find(([c1, r1, c2, r2]) => c >= c1 && c <= c2 && r >= r1 && r <= r2);
  const same = (c, r, c2, r2) => { const a = mergeOf(c, r); return !!a && a === mergeOf(c2, r2); };
  // borders, weakest first so the stronger ones show on top
  const W = { dashed: 1, thin: 2, medium: 3, double: 4 };
  const segs = [];
  model.rows.forEach((rr, r) => rr.c.forEach((cell, c) => {
    const b = D.styles[cell.s].b;
    if (b[0] && !same(c, r, c - 1, r)) segs.push([b[0], X(c), Y(r), X(c), Y(r + 1), 'v']);
    if (b[2] && !same(c, r, c + 1, r)) segs.push([b[2], X(c + 1), Y(r), X(c + 1), Y(r + 1), 'v']);
    if (b[1] && !same(c, r, c, r - 1)) segs.push([b[1], X(c), Y(r), X(c + 1), Y(r), 'h']);
    if (b[3] && !same(c, r, c, r + 1)) segs.push([b[3], X(c), Y(r + 1), X(c + 1), Y(r + 1), 'h']);
  }));
  segs.sort((a, b) => (W[a[0]] || 0) - (W[b[0]] || 0));
  doc.setDrawColor(0, 0, 0); doc.setLineCap('butt');
  segs.forEach(([s, x1, y1, x2, y2, o]) => {
    if (s === 'double') { const g = 1.1 * k; doc.setLineDashPattern([], 0); doc.setLineWidth(0.6 * k);
      if (o === 'h') { doc.line(x1, y1 - g, x2, y2 - g); doc.line(x1, y1 + g, x2, y2 + g); } else { doc.line(x1 - g, y1, x2 - g, y2); doc.line(x1 + g, y1, x2 + g, y2); } return; }
    doc.setLineWidth((s === 'medium' ? 1.5 : 0.75) * k);
    doc.setLineDashPattern(s === 'dashed' ? [2.4 * k, 0.9 * k] : [], 0);
    doc.line(x1, y1, x2, y2);
  });
  doc.setLineDashPattern([], 0);
  // text
  const pad = 2.6 * k;
  model.rows.forEach((rr, r) => rr.c.forEach((cell, c) => {
    if (cell.v === null || cell.v === undefined || cell.v === '') return;
    const st = D.styles[cell.s]; const mm = mergeOf(c, r);
    if (mm && (mm[0] !== c || mm[1] !== r)) return;
    let [c1, r1, c2, r2] = mm || [c, r, c, r];
    const txt = jtCellText(cell.v, st); if (!txt) return;
    const size = st.f[1] * k, bold = st.f[2];
    doc.setFont('Carlito', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    if (st.c) doc.setTextColor(parseInt(st.c.slice(0, 2), 16), parseInt(st.c.slice(2, 4), 16), parseInt(st.c.slice(4, 6), 16)); else doc.setTextColor(0, 0, 0);
    const isNum = typeof cell.v === 'number' || cell.v instanceof Date;
    const h = st.h || (typeof cell.v === 'number' ? 'right' : 'left');
    // text that doesn't wrap spills into the empty cells beside it, as in Excel
    if (!mm && !st.w && h === 'left' && !isNum) { while (c2 < D.cols - 1 && (rr.c[c2 + 1].v === null || rr.c[c2 + 1].v === '') && !mergeOf(c2 + 1, r) && jtTextW(txt, st.f[1], bold) * k > (X(c2 + 1) - X(c1)) - 2 * pad) c2++; }
    const x1 = X(c1), x2 = X(c2 + 1), y1 = Y(r1), y2 = Y(r2 + 1);
    const lines = st.w ? jtWrap(txt, (x2 - x1 - 2 * pad) / k, st.f[1], bold) : [txt];
    const lh = st.f[1] * 1.22 * k, blockH = lh * lines.length;
    let y0 = st.v === 'center' ? (y1 + y2) / 2 - blockH / 2 : st.v === 'top' ? y1 + 1 * k : y2 - blockH - 1.2 * k;
    lines.forEach((ln, i) => {
      const by = y0 + lh * i + size * 0.86;
      if (h === 'center' || h === 'centerContinuous') doc.text(ln, (x1 + x2) / 2, by, { align: 'center' });
      else if (h === 'right') doc.text(ln, x2 - pad, by, { align: 'right' });
      else doc.text(ln, x1 + pad, by);
    });
  }));
  // logos
  jtDorLogoBoxes(imgs).forEach(b => {
    const x = m.l + b.x * JT_PX * k, y = m.t + b.y * JT_PX * k;
    doc.addImage(b.img.dataUrl, /image\/png/.test(b.img.dataUrl.slice(0, 30)) ? 'PNG' : 'JPEG', x, y, b.w * JT_PX * k, b.h * JT_PX * k, b.gankco ? 'dor-gankco' : undefined, 'FAST');
  });
}
async function jtDorPdf(r, j, withPhotos) {
  const doc = await jtDorDoc(); const imgs = await jtDorImages(j);
  jtDorDraw(doc, jtDorModel(r, j), imgs);
  doc.setProperties({ title: `Daily Operation Report - ${r.well} - ${fd(r.report_date)}`, author: S.profile?.full_name || '' });
  // photos only when asked for, on pages after the report
  const ph = withPhotos ? (r.photos || []) : [];
  if (ph.length) {
    const rows = await q(sb.from('jt_files').select('id,mime,data,caption').in('id', ph.map(p => p.id)));
    const ims = (await Promise.all(rows.map(f => dataImage(`data:${f.mime};base64,${f.data}`).then(i => ({ ...i, caption: f.caption })).catch(() => null)))).filter(Boolean);
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40; const cw = (W - 2 * M - 16) / 2, chh = 220; let y = 0, col = 0;
    const head = () => { doc.addPage(); doc.setFont('Carlito', 'bold'); doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.text(jtTxt(`Photos · ${r.well} · ${fd(r.report_date)} · Report ${r.report_no ?? ''}`), M, M); y = M + 14; col = 0; };
    head();
    ims.forEach(im => {
      if (col === 0 && y + chh > H - M) head();
      const kk = Math.min(cw / im.w, (chh - 18) / im.h); const iw = im.w * kk, ih = im.h * kk; const x = M + col * (cw + 16);
      doc.addImage(im.dataUrl, 'JPEG', x + (cw - iw) / 2, y, iw, ih, undefined, 'FAST');
      if (im.caption) { doc.setFont('Carlito', 'normal'); doc.setFontSize(10); doc.setTextColor(80, 80, 80); doc.text(jtTxt(im.caption).slice(0, 90), x, y + ih + 12); }
      if (col === 1) { y += chh; col = 0; } else col = 1;
    });
  }
  doc.save(jtFile(`DOR - ${r.well} - ${jtShortDate(r.report_date)} ${String(r.report_date).slice(0, 4)}.pdf`));
}
// the PDF button: asks about photos when the report has some
async function jtDorPdfAsk(id, j) {
  let r; try { r = await q(sb.rpc('jt_report_get', { p_id: id })); } catch (e) { return toast(niceError(e), true); }
  const go = async ph => { try { await withProgress('Making the PDF…', () => jtDorPdf(r, j, ph)); } catch (e) { toast(niceError(e), true); } };
  if (!r.photos?.length) return go(false);
  modal({ title: 'PDF of the daily report', submit: null, cancel: 'Close', sub: `The report is one page, like the DOR. This report has ${plural(r.photos.length, 'photo')}.`,
    body: `<div class="actionrow"><button type="button" class="btn primary" id="jt-p1">${ico('pdf')}Report only</button><button type="button" class="btn" id="jt-p2">${ico('pdf')}Report with the photos after it</button></div>`,
    onOpen: d => { $('#jt-p1', d).onclick = () => { d.close(); go(false); }; $('#jt-p2', d).onclick = () => { d.close(); go(true); }; } });
}

function jtBreakdownSheet(wb, j, rows, gkId, gk) {
  const ws = wb.addWorksheet('Operations Breakdown', { views: [{ showGridLines: false, state: 'frozen', ySplit: 4 }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const G = j.groups || [];
  [6, 12, 18, 70, ...G.map(() => 11)].forEach((w, i) => ws.getColumn(i + 1).width = w);
  ws.getRow(1).height = 34; if (gkId != null) ws.addImage(gkId, { tl: { col: 0, row: 0.1 }, ext: { width: 150, height: 150 * gk.h / gk.w } });
  ws.getCell('D1').value = `Operations Breakdown · ${j.job_no}`; ws.getCell('D1').font = { bold: true, size: 14 };
  ws.getCell('D2').value = [j.client?.name, j.project, j.field].filter(Boolean).join(' · '); ws.getCell('D2').font = { color: { argb: 'FF62666C' } };
  const thin = { style: 'thin', color: { argb: 'FFBFC1C5' } }; const box = { top: thin, left: thin, bottom: thin, right: thin };
  const hdr = ['S/N', 'Date', 'Well', 'Operations Summary', ...G];
  hdr.forEach((h, i) => { const c = ws.getCell(4, i + 1); c.value = h; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1F22' } }; c.border = box; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
  const fill = { op: 'FFE2F3EA', stdby: 'FFFFF1D1', mob: 'FFE3ECFB', demob: 'FFE3ECFB', off: 'FFEDEEF0' };
  rows.forEach((r, n) => {
    const y = 5 + n; const vals = [n + 1, new Date(r.date + 'T00:00:00Z'), r.wells, r.summary, ...G.map(g => JT_EQ[r.status?.[g]]?.[1] || '')];
    vals.forEach((v, i) => { const c = ws.getCell(y, i + 1); c.value = v; c.border = box; c.alignment = { vertical: 'top', wrapText: true, horizontal: i >= 4 || i === 0 ? 'center' : 'left' };
      if (i === 1) c.numFmt = 'dd-mmm-yy'; if (i >= 4 && fill[r.status?.[G[i - 4]]]) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill[r.status[G[i - 4]]] } }; });
    ws.getRow(y).height = Math.max(16, Math.ceil(String(r.summary || '').length / 85) * 15);
  });
  const y = 5 + rows.length; ws.getCell(y, 4).value = 'Operating / standby days'; ws.getCell(y, 4).font = { bold: true }; ws.getCell(y, 4).alignment = { horizontal: 'right' };
  G.forEach((g, i) => { const c = ws.getCell(y, 5 + i); c.value = `${rows.filter(r => r.status?.[g] === 'op').length} / ${rows.filter(r => r.status?.[g] === 'stdby').length}`; c.font = { bold: true }; c.alignment = { horizontal: 'center' }; c.border = box; });
  return ws;
}
async function jtBreakdownXlsx(j, rows) {
  await loadScript('vendor/exceljs.min.js');
  const wb = new window.ExcelJS.Workbook(); const gk = await imageB64('brand/logo-full.png'); const gkId = wb.addImage({ base64: gk.base64, extension: 'png' });
  jtBreakdownSheet(wb, j, rows, gkId, gk);
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), jtFile(`Operations Breakdown - ${j.job_no}.xlsx`));
}
async function jtBreakdownPdf(j, rows) {
  const G = j.groups || [];
  await brandPdf({ file: jtFile(`Operations Breakdown - ${j.job_no}.pdf`), title: 'Operations Breakdown', subtitle: `${j.job_no} · ${[j.client?.name, j.project, j.field].filter(Boolean).join(' · ')}`,
    meta: [['Job', j.job_no], ['Client', j.client?.name || ''], ['Client PO', j.client_po || '—']],
    kpis: G.map(g => ({ label: `${g}: operating / standby days`, value: `${rows.filter(r => r.status?.[g] === 'op').length} / ${rows.filter(r => r.status?.[g] === 'stdby').length}` })),
    sections: [{ heading: 'Day by day', columns: [{ header: 'S/N', dataKey: 'n', width: 10 }, { header: 'Date', dataKey: 'd', width: 22 }, { header: 'Well', dataKey: 'w', width: 30 }, { header: 'Operations summary', dataKey: 's' },
        ...G.map(g => ({ header: g, dataKey: 'g_' + g, width: 18, align: 'center' }))],
      rows: rows.map((r, i) => ({ n: i + 1, d: fd(r.date), w: r.wells, s: r.summary, ...Object.fromEntries(G.map(g => ['g_' + g, JT_EQ[r.status?.[g]]?.[1] || ''])) })) }] });
}

// ================================================================ THE UNPRICED TICKET
const JT_ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx', 'xxi', 'xxii', 'xxiii', 'xxiv', 'xxv', 'xxvi', 'xxvii', 'xxviii', 'xxix', 'xxx'];
const jtDateRange = (a, b) => { if (!a) return ''; const f = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); return !b || a === b ? f(a) : `${f(a)} - ${f(b)}`; };
async function jtTicketPdf(t) {
  const doc = await pdfInit('portrait'); const W = doc.internal.pageSize.getWidth();
  const gk = await imageB64('brand/logo-full.png'); const gh = 13, gw = gh * gk.w / gk.h;
  doc.addImage(gk.dataUrl, 'PNG', 10, 9, gw, gh, 'gankco-logo', 'FAST');
  doc.setFont('Montserrat', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...rgb(PDF_INK.ink)); doc.text('GANKCO Energy Services Limited', W - 10, 11.5, { align: 'right' });
  doc.setFont('Barlow', 'normal'); doc.setFontSize(7.6); doc.setTextColor(...rgb(PDF_INK.muted));
  const lines = [jtOffice('abuja') ? 'Corp. Office: ' + jtOffice('abuja') : '', jtOffice('ph') ? 'Operational Base: ' + jtOffice('ph') : ''].filter(Boolean);
  let yy = 15.5; lines.forEach(l => doc.splitTextToSize(jtTxt(l), 120).forEach(s => { doc.text(s, W - 10, yy, { align: 'right' }); yy += 3.4; }));
  doc.setFillColor(...rgb(PDF_INK.orange)); doc.rect(10, Math.max(yy, 24) + 1, W - 20, .6, 'F');
  const top = Math.max(yy, 24) + 4;
  doc.setFont('Montserrat', 'bold'); doc.setFontSize(13); doc.setTextColor(...rgb(PDF_INK.ink));
  doc.text(t.kind === 'reimb' ? 'REIMBURSABLES TICKET' : 'JOB TICKET', W / 2, top + 4, { align: 'center' });
  const v = x => jtTxt(x ?? '');
  doc.autoTable({ startY: top + 7, margin: { left: 10, right: 10 }, theme: 'grid', styles: jtTableStyle,
    body: [[jtLbl('To'), { content: v(t.job.client?.name), colSpan: 3 }],
      [jtLbl('Address'), { content: v(t.job.client?.address), colSpan: 3 }],
      [jtLbl('Job Type'), v(t.job.job_type || t.job.project), jtLbl('Date'), v(jtDateRange(t.date_from, t.date_to))],
      [jtLbl('Job Ticket'), v(t.ticket_no), jtLbl('Client PO'), v(t.job.client_po || '')],
      [jtLbl('Field/Well'), { content: v([t.job.field, t.well_names.join(' & ')].filter(Boolean).join(' / ')), colSpan: 3 }]],
    columnStyles: { 0: { cellWidth: 24 }, 2: { cellWidth: 22 } } });
  if (t.kind === 'reimb') {
    const tot = t.lines.reduce((a, l) => a + (+l.amount || 0), 0);
    doc.autoTable({ startY: doc.lastAutoTable.finalY + 3, margin: { left: 10, right: 10, bottom: 50 }, theme: 'grid', styles: jtTableStyle,
      head: [['S/N', 'Description', 'From', 'To', 'Amount (NGN)']], headStyles: { fillColor: rgb(JT_GREY), textColor: rgb(PDF_INK.ink), fontStyle: 'bold' },
      body: [...t.lines.map((l, i) => [String(i + 1), v(l.description), v(fd(l.date_from)), v(fd(l.date_to)), { content: jtNaira(l.amount).replace('₦', 'N '), styles: { halign: 'right' } }]),
        [{ content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: jtNaira(tot).replace('₦', 'N '), styles: { halign: 'right', fontStyle: 'bold' } }]],
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { cellWidth: 24 }, 3: { cellWidth: 24 }, 4: { cellWidth: 34 } } });
    doc.autoTable({ startY: doc.lastAutoTable.finalY + 2, margin: { left: 10, right: 10 }, theme: 'grid', styles: jtTableStyle,
      body: [[jtLbl('Amount in Words'), v(typeof poWords === 'function' ? poWords(tot, 'NGN') : '')]], columnStyles: { 0: { cellWidth: 30 } } });
  } else {
    const secs = Object.keys(JT_SEC).map(k => [k, t.lines.filter(l => l.section === k)]).filter(([, a]) => a.length);
    const body = [];
    if (t.title) body.push([{ content: v(t.title), colSpan: 5, styles: { fontStyle: 'bold', halign: 'center', fillColor: rgb('FBFBFC') } }]);
    secs.forEach(([k, a], si) => {
      body.push([{ content: 'ABCDEFGHIJ'[si], styles: { fontStyle: 'bold', halign: 'center', fillColor: rgb(JT_GREY) } }, { content: v(JT_SEC[k]), colSpan: 4, styles: { fontStyle: 'bold', fillColor: rgb(JT_GREY) } }]);
      a.forEach((l, i) => {
        const days = ['days', 'location'].includes(l.rule);
        body.push([{ content: JT_ROMAN[i] || String(i + 1), styles: { halign: 'center' } }, v(l.description), { content: days ? jtNum(l.op_days) || '0' : 'N/A', styles: { halign: 'center' } },
          { content: l.rule === 'days' ? jtNum(l.sb_days) || '0' : 'N/A', styles: { halign: 'center' } }, { content: jtNum(l.qty) || '0', styles: { halign: 'center' } }]);
      });
    });
    doc.autoTable({ startY: doc.lastAutoTable.finalY + 3, margin: { left: 10, right: 10, bottom: 45 }, theme: 'grid', styles: jtTableStyle,
      head: [[{ content: 'S/N', rowSpan: 2 }, { content: 'DESCRIPTION', rowSpan: 2 }, { content: 'No of Days', colSpan: 2 }, { content: 'QTY', rowSpan: 2 }], ['Operating', 'Standby']],
      headStyles: { fillColor: rgb('1E1F22'), textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle' },
      body, columnStyles: { 0: { cellWidth: 11 }, 2: { cellWidth: 20 }, 3: { cellWidth: 20 }, 4: { cellWidth: 14 } } });
    const changed = t.lines.filter(l => l.reason);
    if (changed.length) doc.autoTable({ startY: doc.lastAutoTable.finalY + 2, margin: { left: 10, right: 10, bottom: 45 }, theme: 'plain', styles: { ...jtTableStyle, fontSize: 7.4, textColor: rgb(PDF_INK.muted), lineWidth: 0 },
      body: changed.map(l => [`Note on "${jtTxt(l.description).slice(0, 60)}": ${jtTxt(l.reason)}`]) });
  }
  // signatures
  const H = doc.internal.pageSize.getHeight(); let y = doc.lastAutoTable.finalY + 6;
  if (y > H - 46) { doc.addPage(); y = 16; }
  const sw = (W - 26) / 2; const imgs = t.signature_id ? await sigImages([t.signature_id]) : {};
  const sig = imgs[t.signature_id];
  [[`GANKCO Rep's Name, Signature & Date`, t.signed_name ? `${t.signed_name}${t.signed_title ? ' · ' + t.signed_title : ''}` : '', t.signed_at ? fd(t.signed_at) : '', sig],
   [`Client's Rep's Name, Signature & Date`, '', '', null]].forEach(([lbl, nm, dt, im], i) => {
    const x = 10 + i * (sw + 6);
    doc.setDrawColor(...rgb(PDF_INK.box)); doc.setLineWidth(.2); doc.rect(x, y, sw, 30);
    doc.setFillColor(...rgb(JT_GREY)); doc.rect(x, y, sw, 6, 'F'); doc.rect(x, y, sw, 6);
    doc.setFont('Barlow', 'bold'); doc.setFontSize(8.4); doc.setTextColor(...rgb(PDF_INK.ink)); doc.text(jtTxt(lbl), x + 2, y + 4.2);
    if (im) { const ih = 13 * (im.scale || 1), iw = Math.min(sw - 8, ih * im.w / im.h); doc.addImage(im.dataUrl, 'PNG', x + 3, y + 7.5 + (im.dy || 0), iw, iw * im.h / im.w, undefined, 'FAST'); }
    doc.setFont('Barlow', 'normal'); doc.setFontSize(8.2);
    doc.text(jtTxt(nm || 'Name:'), x + 2, y + 24.5); doc.text(jtTxt(dt ? 'Date: ' + dt : 'Date:'), x + 2, y + 28.3);
  });
  jtFooter(doc, `${t.ticket_no} · ${t.kind === 'reimb' ? 'Reimbursables' : 'Unpriced job ticket'}`);
  doc.save(jtFile(`${t.ticket_no} ${t.kind === 'reimb' ? 'Reimbursables' : 'Job Ticket'} ${t.well_names.join(' & ')}.pdf`));
}

// the ticket as an Excel file (unpriced), in the same order as GANKCO's ticket workbooks
async function jtTicketXlsx(t) {
  await loadScript('vendor/exceljs.min.js');
  const wb = new window.ExcelJS.Workbook(); wb.creator = 'GANKCO Nest';
  const ws = wb.addWorksheet(safeSheet(t.well_names.join(' & ') || t.ticket_no), { views: [{ showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  [7, 64, 12, 12, 9].forEach((w, i) => ws.getColumn(i + 1).width = w);
  const gk = await imageB64('brand/logo-full.png'); ws.addImage(wb.addImage({ base64: gk.base64, extension: 'png' }), { tl: { col: 0, row: 0.2 }, ext: { width: 170, height: 170 * gk.h / gk.w } });
  ws.getRow(1).height = 22; ws.getRow(2).height = 22;
  ws.getCell('C1').value = 'GANKCO Energy Services Limited'; ws.getCell('C1').font = { bold: true, size: 12 };
  ws.getCell('C2').value = [jtOffice('abuja') && 'Corp. Office: ' + jtOffice('abuja')].filter(Boolean).join(''); ws.getCell('C2').font = { size: 8 };
  ws.getCell('C3').value = [jtOffice('ph') && 'Operational Base: ' + jtOffice('ph')].filter(Boolean).join(''); ws.getCell('C3').font = { size: 8 };
  const thin = { style: 'thin', color: { argb: 'FF8E9196' } }; const box = { top: thin, left: thin, bottom: thin, right: thin };
  const grey = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEEF0' } };
  let r = 5;
  const kv = (k, v, k2, v2) => { const a = ws.getCell(r, 1); a.value = k; a.font = { bold: true }; a.fill = grey; a.border = box;
    if (k2) { ws.getCell(r, 2).value = v; ws.getCell(r, 2).border = box; ws.mergeCells(r, 3, r, 3); const c = ws.getCell(r, 3); c.value = k2; c.font = { bold: true }; c.fill = grey; c.border = box; ws.mergeCells(r, 4, r, 5); ws.getCell(r, 4).value = v2; ws.getCell(r, 4).border = box; }
    else { ws.mergeCells(r, 2, r, 5); ws.getCell(r, 2).value = v; ws.getCell(r, 2).border = box; } r++; };
  kv('To', t.job.client?.name || ''); kv('Address', t.job.client?.address || ''); kv('Job Type', t.job.job_type || t.job.project || '', 'Date', jtDateRange(t.date_from, t.date_to));
  kv('Job Ticket', t.ticket_no, 'Client PO', t.job.client_po || ''); kv('Field/Well', [t.job.field, t.well_names.join(' & ')].filter(Boolean).join(' / '));
  r++;
  if (t.title) { ws.mergeCells(r, 1, r, 5); Object.assign(ws.getCell(r, 1), { value: t.title, font: { bold: true }, alignment: { horizontal: 'center' } }); r++; }
  const hd = (c, v) => { const x = ws.getCell(r, c); x.value = v; x.font = { bold: true, color: { argb: 'FFFFFFFF' } }; x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1F22' } }; x.border = box; x.alignment = { horizontal: 'center', vertical: 'middle' }; };
  hd(1, 'S/N'); hd(2, 'DESCRIPTION'); hd(3, 'No of Days'); hd(4, ''); hd(5, 'QTY'); ws.mergeCells(r, 3, r, 4); r++;
  hd(1, ''); hd(2, ''); hd(3, 'Operating'); hd(4, 'Standby'); hd(5, ''); r++;
  Object.keys(JT_SEC).map(k => [k, t.lines.filter(l => l.section === k)]).filter(([, a]) => a.length).forEach(([k, a], si) => {
    [['ABCDEFGHIJ'[si], JT_SEC[k]]].forEach(([l, s]) => { const c1 = ws.getCell(r, 1); c1.value = l; const c2 = ws.getCell(r, 2); c2.value = s; [1, 2, 3, 4, 5].forEach(c => { ws.getCell(r, c).fill = grey; ws.getCell(r, c).border = box; ws.getCell(r, c).font = { bold: true }; }); r++; });
    a.forEach((l, i) => { const days = ['days', 'location'].includes(l.rule);
      [JT_ROMAN[i] || i + 1, l.description, days ? +l.op_days || 0 : 'N/A', l.rule === 'days' ? +l.sb_days || 0 : 'N/A', +l.qty || 0].forEach((v, c) => { const x = ws.getCell(r, c + 1); x.value = v; x.border = box; x.alignment = { vertical: 'middle', wrapText: c === 1, horizontal: c === 1 ? 'left' : 'center' }; });
      ws.getRow(r).height = Math.max(15, Math.ceil(String(l.description).length / 62) * 15); r++; });
  });
  r += 2;
  ws.getCell(r, 1).value = "GANKCO Rep's Name, Signature & Date"; ws.getCell(r, 1).font = { bold: true }; ws.getCell(r, 3).value = t.signed_name ? `${t.signed_name} · ${t.signed_at ? fd(t.signed_at) : ''}` : ''; r += 2;
  ws.getCell(r, 1).value = "Client's Rep's Name, Signature & Date"; ws.getCell(r, 1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), jtFile(`${t.ticket_no} Job Ticket ${t.well_names.join(' & ')}.xlsx`));
}
