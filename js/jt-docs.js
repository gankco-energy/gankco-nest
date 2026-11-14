/* GANKCO Nest 3.0.8 — JobTrack documents: the Daily Operation Report (PDF and Excel, in GANKCO's DOR layout),
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

// ================================================================ DAILY OPERATION REPORT (PDF)
async function jtDorBuild(doc, r, j, first) {
  const W = doc.internal.pageSize.getWidth();
  if (!first) doc.addPage();
  const logos = await jtLogoImgs((j.logos || []).map(l => l.id));
  const gk = await imageB64('brand/logo-full.png');
  jtDrawRow(doc, logos, 10, 8, 62, 15);
  const gh = 11, gw = gh * gk.w / gk.h; doc.addImage(gk.dataUrl, 'PNG', W - 10 - gw, 10, gw, gh, 'gankco-logo', 'FAST');
  doc.setFont('Montserrat', 'bold'); doc.setFontSize(15); doc.setTextColor(...rgb(PDF_INK.ink)); doc.text('Daily Operation Report', W / 2, 17.5, { align: 'center' });
  doc.setFillColor(...rgb(PDF_INK.orange)); doc.rect(10, 25.5, W - 20, .6, 'F');
  const tbl = (body, opts = {}) => { doc.autoTable({ startY: (doc.lastAutoTable && !opts.fresh ? doc.lastAutoTable.finalY : 29) + (opts.gap ?? 2.5), margin: { left: 10, right: 10, bottom: 16 }, theme: 'grid', styles: jtTableStyle, body, ...opts.t }); };
  const v = x => jtTxt(x ?? '');
  tbl([
    [jtLbl('Client'), { content: v(j.client?.name), colSpan: 3 }, jtLbl('Field'), v(r.well_field || j.field), jtLbl('Well'), v(r.well)],
    [jtLbl('Client Rep(s)'), { content: v(r.client_reps), colSpan: 3 }, jtLbl('GANKCO Rep'), { content: v(r.gankco_rep), colSpan: 3 }],
    [jtLbl('Report No'), String(r.report_no ?? ''), jtLbl('Date'), v(fd(r.report_date)), jtLbl('Project / Operation'), { content: v(j.project), colSpan: 3 }],
    [jtLbl('Rig Name'), v(j.rig_name || 'N/A'), jtLbl('Rig Owner'), v(j.rig_owner || 'N/A'), jtLbl('Rig Type'), v(j.rig_type || 'N/A'), jtLbl('Job No'), v(j.job_no)]
  ], { fresh: true, t: { columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 16 }, 4: { cellWidth: 26 }, 6: { cellWidth: 16 } } } });
  doc.autoTable({ startY: doc.lastAutoTable.finalY + 2.5, margin: { left: 10, right: 10, bottom: 16 }, theme: 'grid', styles: jtTableStyle,
    head: [[{ content: 'GANKCO HSE Statistics', colSpan: 7, styles: { fillColor: rgb('1E1F22'), textColor: [255, 255, 255], fontStyle: 'bold' } }]],
    body: [[jtLbl('Total Man Hr'), v(jtNum(r.man_hours)), jtLbl('Days Without LTI'), String(r.lti_days ?? ''), jtLbl('TRI'), String(r.tri ?? 0), { content: v(r.hse_comment || 'No incident / accident'), styles: { fontStyle: 'bold' } }]],
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 27 }, 4: { cellWidth: 10 } } });
  doc.autoTable({ startY: doc.lastAutoTable.finalY + 2.5, margin: { left: 10, right: 10, bottom: 16 }, theme: 'grid', styles: jtTableStyle,
    body: [[{ content: 'Daily Operations Summary (24hr)', styles: { fillColor: rgb(JT_GREY), fontStyle: 'bold', cellWidth: 34 } }, v(r.summary)]] });
  const tot = (r.ops || []).reduce((a, o) => a + (jtMins(o.from, o.to) || 0), 0);
  doc.autoTable({ startY: doc.lastAutoTable.finalY + 2.5, margin: { left: 10, right: 10, bottom: 16 }, theme: 'grid', styles: jtTableStyle,
    head: [[{ content: 'Operations Breakdown (24 hr)', colSpan: 4, styles: { fillColor: rgb('1E1F22'), textColor: [255, 255, 255], fontStyle: 'bold' } }],
      [{ content: 'Time from', styles: { fillColor: rgb(JT_GREY) } }, { content: 'Time to', styles: { fillColor: rgb(JT_GREY) } }, { content: 'Total (hr)', styles: { fillColor: rgb(JT_GREY) } }, { content: 'Operation Description', styles: { fillColor: rgb(JT_GREY) } }]],
    headStyles: { textColor: rgb(PDF_INK.ink), fontStyle: 'bold' },
    body: [...(r.ops || []).map(o => [v(o.from), v(o.to), jtHm(jtMins(o.from, o.to)), v(o.desc)]), ...(r.ops?.length ? [[{ content: 'Total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } }, { content: jtHm(tot), styles: { fontStyle: 'bold' } }, '']] : [['', '', '', 'None recorded']])],
    columnStyles: { 0: { cellWidth: 17, halign: 'center' }, 1: { cellWidth: 17, halign: 'center' }, 2: { cellWidth: 17, halign: 'center' } } });
  const eq = (j.groups || []);
  if (eq.length) doc.autoTable({ startY: doc.lastAutoTable.finalY + 2.5, margin: { left: 10, right: 10, bottom: 16 }, theme: 'grid', styles: { ...jtTableStyle, halign: 'center' },
    head: [[{ content: 'Equipment Status', styles: { fillColor: rgb(JT_GREY), textColor: rgb(PDF_INK.ink), halign: 'left' } }, ...eq.map(g => ({ content: jtTxt(g), styles: { fillColor: rgb(JT_GREY), textColor: rgb(PDF_INK.ink) } }))]],
    headStyles: { fontStyle: 'bold' }, body: [['', ...eq.map(g => JT_EQ[r.equipment?.[g]]?.[2] || '—')]], columnStyles: { 0: { cellWidth: 34 } } });
  doc.autoTable({ startY: doc.lastAutoTable.finalY + 2.5, margin: { left: 10, right: 10, bottom: 16 }, theme: 'grid', styles: jtTableStyle,
    body: [[{ content: 'General Comment / Observations', styles: { fillColor: rgb(JT_GREY), fontStyle: 'bold', cellWidth: 34 } }, v(r.comments)],
      [{ content: 'Look Ahead', styles: { fillColor: rgb(JT_GREY), fontStyle: 'bold' } }, v(r.look_ahead)]] });
  doc.autoTable({ startY: doc.lastAutoTable.finalY + 2.5, margin: { left: 10, right: 10, bottom: 16 }, theme: 'grid', styles: { ...jtTableStyle, halign: 'center' },
    head: [[{ content: 'POB', colSpan: 3 }, { content: 'Days on Well', rowSpan: 2 }, { content: 'Report Page', rowSpan: 2 }], ['Client', 'GANKCO', 'Others']],
    headStyles: { fillColor: rgb(JT_GREY), textColor: rgb(PDF_INK.ink), fontStyle: 'bold', halign: 'center' },
    body: [[String(r.pob_client ?? ''), String(r.pob_gankco ?? ''), String(r.pob_others ?? ''), String(r.report_no ?? ''), `${r.report_no ?? ''} of ${r.well_reports ?? r.report_no ?? ''}`]] });
  // photos, on their own page(s) after the report
  const ph = r.photos || [];
  if (ph.length) {
    const rows = await q(sb.from('jt_files').select('id,mime,data,caption').in('id', ph.map(p => p.id)));
    const imgs = (await Promise.all(rows.map(f => dataImage(`data:${f.mime};base64,${f.data}`).then(i => ({ ...i, caption: f.caption })).catch(() => null)))).filter(Boolean);
    const H = doc.internal.pageSize.getHeight(); const cw = (W - 26) / 2, chh = 78; let y = 0, col = 0;
    const head = () => { doc.addPage(); doc.setFont('Barlow', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...rgb(PDF_INK.ink)); doc.text(jtTxt(`Photos · ${r.well} · ${fd(r.report_date)} · Report ${r.report_no ?? ''}`), 10, 14); y = 18; col = 0; };
    head();
    imgs.forEach(im => {
      if (col === 0 && y + chh > H - 16) head();
      const k = Math.min(cw / im.w, (chh - 6) / im.h); const iw = im.w * k, ih = im.h * k; const x = 10 + col * (cw + 6);
      doc.addImage(im.dataUrl, 'JPEG', x + (cw - iw) / 2, y, iw, ih, undefined, 'FAST');
      if (im.caption) { doc.setFont('Barlow', 'normal'); doc.setFontSize(8); doc.setTextColor(...rgb(PDF_INK.muted)); doc.text(jtTxt(im.caption).slice(0, 90), x, y + ih + 4); }
      if (col === 1) { y += chh; col = 0; } else col = 1;
    });
  }
}
async function jtDorPdf(r, j) {
  const doc = await pdfInit('portrait');
  await jtDorBuild(doc, r, j, true);
  jtFooter(doc, `${j.job_no} · Daily Operation Report ${r.report_no ?? ''}`);
  doc.save(jtFile(`DOR ${r.well} ${r.report_date} (Report ${r.report_no}).pdf`));
}

// ================================================================ DAILY OPERATION REPORTS (Excel: one sheet a day, like the DOR workbook, plus the Operations Breakdown)
async function jtDorWorkbook(j) {
  await loadScript('vendor/exceljs.min.js');
  const X = window.ExcelJS, wb = new X.Workbook(); wb.creator = 'GANKCO Nest';
  const ids = j.reports.slice().sort((a, b) => a.report_date.localeCompare(b.report_date) || a.well.localeCompare(b.well)).map(r => r.id);
  const full = []; for (const id of ids) full.push(await q(sb.rpc('jt_report_get', { p_id: id })));
  const gk = await imageB64('brand/logo-full.png'); const gkId = wb.addImage({ base64: gk.base64, extension: 'png' });
  const logos = await jtLogoImgs((j.logos || []).map(l => l.id));
  const logoIds = logos.map(l => ({ id: wb.addImage({ base64: l.dataUrl.split(',')[1], extension: /png/.test(l.dataUrl.slice(0, 30)) ? 'png' : 'jpeg' }), w: l.w, h: l.h }));
  const thin = { style: 'thin', color: { argb: 'FFBFC1C5' } }; const box = { top: thin, left: thin, bottom: thin, right: thin };
  const grey = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEEF0' } }; const dark = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1F22' } };
  const used = {};
  for (const r of full) {
    let name = safeSheet(`${new Date(r.report_date + 'T00:00:00').getDate()}-${new Date(r.report_date + 'T00:00:00').getMonth() + 1}-${String(r.report_date).slice(2, 4)}${j.wells.length > 1 ? ' ' + r.well : ''}`);
    while (used[name]) name = safeSheet(name.slice(0, 28) + ' ' + (used[name] = (used[name] || 1) + 1)); used[name] = 1;
    const ws = wb.addWorksheet(name, { views: [{ showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .4, right: .4, top: .5, bottom: .5, header: .2, footer: .2 } } });
    [12, 12, 12, 14, 14, 14, 12, 14].forEach((w, i) => ws.getColumn(i + 1).width = w);
    ws.getRow(1).height = 46;
    let lx = 0; logoIds.forEach(l => { const h = 42, w = h * l.w / l.h; ws.addImage(l.id, { tl: { col: lx / 64, row: 0.1 }, ext: { width: w, height: h } }); lx += w + 6; });
    ws.addImage(gkId, { tl: { col: 6.1, row: 0.25 }, ext: { width: 150, height: 150 * gk.h / gk.w } });
    ws.mergeCells('C2:F2'); Object.assign(ws.getCell('C2'), { value: 'Daily Operation Report' }); ws.getCell('C2').font = { name: 'Calibri', size: 16, bold: true }; ws.getCell('C2').alignment = { horizontal: 'center' };
    let row = 4;
    const put = (cells) => { cells.forEach(([addr, val, o = {}]) => { const c = ws.getCell(addr); c.value = val ?? ''; c.border = box; c.alignment = { vertical: 'middle', wrapText: true, ...(o.al || {}) }; if (o.lbl) { c.fill = grey; c.font = { bold: true }; } if (o.merge) ws.mergeCells(o.merge); }); };
    put([[`A${row}`, 'Client', { lbl: 1 }], [`B${row}`, j.client?.name, { merge: `B${row}:D${row}` }], [`E${row}`, 'Field', { lbl: 1 }], [`F${row}`, r.well_field || j.field], [`G${row}`, 'Well', { lbl: 1 }], [`H${row}`, r.well]]); row++;
    put([[`A${row}`, 'Client Rep(s)', { lbl: 1 }], [`B${row}`, r.client_reps, { merge: `B${row}:D${row}` }], [`E${row}`, 'GANKCO Rep', { lbl: 1 }], [`F${row}`, r.gankco_rep, { merge: `F${row}:H${row}` }]]); row++;
    put([[`A${row}`, 'Report No', { lbl: 1 }], [`B${row}`, r.report_no], [`C${row}`, 'Date', { lbl: 1 }], [`D${row}`, new Date(r.report_date + 'T00:00:00Z'), {}], [`E${row}`, 'Project / Operation', { lbl: 1 }], [`F${row}`, j.project, { merge: `F${row}:H${row}` }]]);
    ws.getCell(`D${row}`).numFmt = 'dd-mmm-yy'; row++;
    put([[`A${row}`, 'Rig Name', { lbl: 1 }], [`B${row}`, j.rig_name || 'N/A'], [`C${row}`, 'Rig Owner', { lbl: 1 }], [`D${row}`, j.rig_owner || 'N/A'], [`E${row}`, 'Rig Type', { lbl: 1 }], [`F${row}`, j.rig_type || 'N/A'], [`G${row}`, 'Job No', { lbl: 1 }], [`H${row}`, j.job_no]]); row += 2;
    ws.mergeCells(`A${row}:H${row}`); Object.assign(ws.getCell(`A${row}`), { value: 'GANKCO HSE Statistics', fill: dark, font: { bold: true, color: { argb: 'FFFFFFFF' } } }); row++;
    put([[`A${row}`, 'Total Man Hr', { lbl: 1 }], [`B${row}`, r.man_hours == null ? '' : +r.man_hours], [`C${row}`, 'Days Without LTI', { lbl: 1 }], [`D${row}`, r.lti_days], [`E${row}`, 'TRI', { lbl: 1 }], [`F${row}`, r.tri ?? 0], [`G${row}`, r.hse_comment || 'No incident / accident', { merge: `G${row}:H${row}` }]]); row += 2;
    put([[`A${row}`, 'Daily Operations Summary (24hr)', { lbl: 1, merge: `A${row}:B${row}` }], [`C${row}`, r.summary, { merge: `C${row}:H${row}` }]]);
    ws.getRow(row).height = Math.max(30, Math.ceil(String(r.summary || '').length / 90) * 15); row += 2;
    ws.mergeCells(`A${row}:H${row}`); Object.assign(ws.getCell(`A${row}`), { value: 'Operations Breakdown (24 hr)', fill: dark, font: { bold: true, color: { argb: 'FFFFFFFF' } } }); row++;
    put([[`A${row}`, 'Time from', { lbl: 1 }], [`B${row}`, 'Time to', { lbl: 1 }], [`C${row}`, 'Total (hr)', { lbl: 1 }], [`D${row}`, 'Operation Description', { lbl: 1, merge: `D${row}:H${row}` }]]); row++;
    let tot = 0;
    (r.ops || []).forEach(o => { const m = jtMins(o.from, o.to) || 0; tot += m; put([[`A${row}`, o.from, { al: { horizontal: 'center' } }], [`B${row}`, o.to, { al: { horizontal: 'center' } }], [`C${row}`, jtHm(m), { al: { horizontal: 'center' } }], [`D${row}`, o.desc, { merge: `D${row}:H${row}` }]]);
      ws.getRow(row).height = Math.max(15, Math.ceil(String(o.desc || '').length / 70) * 15); row++; });
    put([[`A${row}`, 'Total', { lbl: 1, merge: `A${row}:B${row}` }], [`C${row}`, jtHm(tot), { al: { horizontal: 'center' } }], [`D${row}`, '', { merge: `D${row}:H${row}` }]]); row += 2;
    if ((j.groups || []).length) { put([[`A${row}`, 'Equipment Status', { lbl: 1, merge: `A${row}:B${row}` }], ...(j.groups || []).slice(0, 6).map((g, i) => [`${String.fromCharCode(67 + i)}${row}`, `${g}: ${JT_EQ[r.equipment?.[g]]?.[1] || '—'}`])]); row += 2; }
    put([[`A${row}`, 'General Comment/Observations', { lbl: 1, merge: `A${row}:B${row}` }], [`C${row}`, r.comments, { merge: `C${row}:H${row}` }]]); row++;
    put([[`A${row}`, 'Look Ahead', { lbl: 1, merge: `A${row}:B${row}` }], [`C${row}`, r.look_ahead, { merge: `C${row}:H${row}` }]]); row += 2;
    put([[`A${row}`, 'POB', { lbl: 1, merge: `A${row}:C${row}` }], [`D${row}`, 'Days on Well', { lbl: 1 }], [`E${row}`, 'Report Page', { lbl: 1 }]]); row++;
    put([[`A${row}`, 'Client', { lbl: 1 }], [`B${row}`, 'GANKCO', { lbl: 1 }], [`C${row}`, 'Others', { lbl: 1 }], [`D${row}`, r.report_no], [`E${row}`, `${r.report_no} of ${r.well_reports ?? r.report_no}`]]); row++;
    put([[`A${row}`, r.pob_client ?? ''], [`B${row}`, r.pob_gankco ?? ''], [`C${row}`, r.pob_others ?? '']]);
  }
  // the Operations Breakdown, as the last sheet
  const bd = await q(sb.rpc('jt_breakdown', { p_job: j.id }));
  jtBreakdownSheet(wb, j, bd, gkId, gk);
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), jtFile(`General DOR - ${j.job_no} ${j.field || ''}.xlsx`));
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
