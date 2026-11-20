// ================================================================ 3.0.12 OPERATION RECORDS
// End-of-job reports, technical proposals and other documents, in folders. The files live in the Nest Gmail's Google Drive,
// but everything is done here: the nest-records function talks to Drive, the database keeps the folders, tags and versions.
// Admin: folders, rename, move, delete, empty the bin. Contributor: upload, new versions, make folders, tag, and rename or delete
// (to the recycle bin) what they uploaded or made themselves. Viewer: open and download.
S.rec = S.rec || { open: new Set(), sel: new Set(), selF: new Set(), filter: {} };
const recRole = () => appRole('records');
const recAdmin = () => recRole() === 'admin' && !S.viewAs;
const recWriter = () => ['admin', 'contributor'].includes(recRole()) && !S.viewAs;
const recUrl = () => String(CFG.SUPABASE_URL || '').replace(/\/$/, '') + '/functions/v1/nest-records';
// 3.0.12: any kind of file uploads. These are the ones Nest can preview (and Google can search inside).
const recExt = n => ((String(n).match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase();
const recKind = n => { const e = recExt(n); return e === 'pdf' ? 'pdf' : /^(docx?|docm|dotx|rtf)$/.test(e) ? 'word' : /^(xlsx?|xlsm|xlsb|csv)$/.test(e) ? 'excel' : /^(pptx?|ppsx|pptm)$/.test(e) ? 'ppt' : /^(jpe?g|png)$/.test(e) ? 'img' : 'file'; };
const REC_KIND = { pdf: 'PDF', word: 'W', excel: 'X', ppt: 'P', img: 'IMG', file: 'FILE' };
const REC_KIND_NAME = { pdf: 'PDF', word: 'Word document', excel: 'Excel workbook', ppt: 'PowerPoint', img: 'Photo', file: 'File' };
const recKindName = n => recKind(n) === 'file' ? (recExt(n) ? `.${recExt(n)} file` : 'File') : REC_KIND_NAME[recKind(n)];
// other kinds of file show their own ending (DWG, ZIP…)
const recBadge = n => { const k = recKind(n); const t = k === 'file' ? (recExt(n).slice(0, 4).toUpperCase() || 'FILE') : REC_KIND[k]; return `<span class="rec-ft ${k}${t.length > 3 ? ' long' : ''}" aria-hidden="true">${esc(t)}</span>`; };
const recSize = b => { b = +b || 0; return b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : b < 1073741824 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1073741824).toFixed(2) + ' GB'; };
const recTags = (f, opts = {}) => [f.doc_type ? `<span class="rec-tag type">${esc(f.doc_type)}</span>` : '', f.client ? `<span class="rec-tag">${esc(f.client)}</span>` : '',
  f.job_no ? `<span class="rec-tag">${esc(f.job_no)}</span>` : '', f.well ? `<span class="rec-tag">${esc(f.well)}</span>` : '', f.year && !opts.noYear ? `<span class="rec-tag">${f.year}</span>` : ''].join('');
const recCrumbs = (path, last) => `<nav class="rec-crumbs" aria-label="Folder"><a href="#/rec">Operation Records</a>${path.map((x, i) => i === path.length - 1 && last ? ` <span>›</span> <b>${esc(x.name)}</b>` : ` <span>›</span> <a href="#/rec/f/${x.id}">${esc(x.name)}</a>`).join('')}</nav>`;
const recNetErr = e => !navigator.onLine || /failed to fetch|networkerror|load failed|network request failed/i.test(String(e?.message || e));

// the nest-records function, as the signed-in person
async function recFn(body, raw) {
  const { data } = await sb.auth.getSession(); const tok = data?.session?.access_token;
  if (!tok) throw new Error('Your session has ended. Sign in again.');
  let r;
  try { r = await fetch(recUrl(), { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok, apikey: CFG.SUPABASE_ANON_KEY }, body: JSON.stringify(body) }); }
  catch (e) { throw new Error(navigator.onLine ? 'Nest couldn’t reach Google Drive just now. Try again in a moment.' : 'There’s no signal. Try again when you’re back online.'); }
  if (raw && r.ok) return r;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || (r.status === 404 ? 'The Operation Records function isn’t set up yet. The Developer installs it (see the 3.0.12 install steps).' : `Google Drive didn’t answer (${r.status}). Try again.`));
  return j;
}
// a file from Drive (current or an earlier version), as a blob with its name
async function recBlob(id, version, purpose) {
  const r = await recFn({ action: 'file', id, version: version || null, purpose: purpose || 'open' }, true);
  return { blob: await r.blob(), name: decodeURIComponent(r.headers.get('x-file-name') || 'document'), type: r.headers.get('content-type') || '' };
}
async function recDownload(id, version) {
  await withProgress('Getting the file from Google Drive…', async () => {
    try { const f = await recBlob(id, version, 'download'); const u = URL.createObjectURL(f.blob); const a = document.createElement('a');
      a.href = u; a.download = f.name; a.dataset.nolog = '1'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); }
    catch (e) { toast(niceError(e), true); }
  });
}

// ---------------------------------------------------------------- menu, phone bar, home tile
function recNav() {
  const main = [['rec', 'All folders', 'folder'], ['rec/search', 'Search', 'search'], ...(recAdmin() ? [['rec/bin', 'Recycle bin', 'trash']] : [])];
  const setup = [...(recAdmin() || isSuper() ? [['rec/settings', 'Records settings', 'gear']] : []), ...(isSuper() ? [['team', 'Nest admin', 'users']] : [])];
  return { main, setup };
}
const recNavKey = parts => !parts[1] || ['f', 'file'].includes(parts[1]) ? 'rec' : 'rec/' + parts[1];
function recBottomBar() {
  const items = [['rec', 'Folders', 'folder'], ['rec/search', 'Search', 'search'], ...(recAdmin() ? [['rec/bin', 'Bin', 'trash']] : []), ...(recAdmin() || isSuper() ? [['rec/settings', 'Settings', 'gear']] : []), ['', 'Apps', 'grid']];
  return `<nav class="bottombar" style="grid-template-columns:repeat(${items.length},1fr)">${items.map(([r, l, i]) => `<a href="#/${r}" data-r="${r || 'home'}">${ico(i)}${l}</a>`).join('')}</nav>`;
}
async function recTileMeta(el) {
  try { const s = await q(sb.rpc('rec_status'));
    el.textContent = !s.connected ? 'Not connected to Google Drive yet' : `${plural(s.files, 'document')} in ${plural(s.folders, 'folder')}`; }
  catch (e) { el.textContent = 'Open'; }
}

// ---------------------------------------------------------------- router
ROUTES.rec = {
  async load(parts, params) {
    if (!recRole()) return topbar('Operation Records') + `<div class="notice">You don’t have access to Operation Records. Ask the Developer if you need it.</div><a class="btn" href="#/">Back to Nest home</a>`;
    const p1 = parts[1];
    this.page = !p1 || p1 === 'f' ? recFolder : p1 === 'file' ? recFile : p1 === 'search' ? recSearch : p1 === 'bin' ? recBin : p1 === 'settings' ? recSettings : recFolder;
    return this.page.load(parts, params);
  },
  bind(main, parts, params) { if (recRole() && this.page) this.page.bind(main, parts, params); }
};

// ---------------------------------------------------------------- the folder tree (menu on wide screens, and the Move picker)
function recTreeHtml(tree, cur, path) {
  const kids = {}; tree.forEach(f => (kids[f.p || 0] = kids[f.p || 0] || []).push(f));
  const open = S.rec.open; path.forEach(x => open.add(x.id));
  const node = f => { const has = !!kids[f.id]; const on = open.has(f.id);
    return `<li class="${f.id === cur ? 'cur' : ''}"><div class="rec-tn">${has ? `<button type="button" class="rec-tw ${on ? 'on' : ''}" data-tw="${f.id}" aria-label="${on ? 'Close' : 'Open'} ${esc(f.n)}"></button>` : '<span class="rec-tw none"></span>'}
      <a href="#/rec/f/${f.id}">${ico('folder')}<span>${esc(f.n)}</span></a></div>${has && on ? `<ul>${kids[f.id].map(node).join('')}</ul>` : ''}</li>`; };
  return `<ul class="rec-tree"><li class="${!cur ? 'cur' : ''}"><div class="rec-tn"><span class="rec-tw none"></span><a href="#/rec">${ico('home')}<span>Operation Records</span></a></div></li>${(kids[0] || []).map(node).join('')}</ul>`;
}
function bindRecTree(root) {
  $$('[data-tw]', root).forEach(b => b.onclick = () => { const id = +b.dataset.tw; S.rec.open.has(id) ? S.rec.open.delete(id) : S.rec.open.add(id);
    const box = b.closest('.rec-side'); if (box) { box.innerHTML = recTreeHtml(box._tree, box._cur, []); bindRecTree(box); } });
}
// choose a folder (for Move); folders being moved, and what's inside them, can't be chosen
function recPickFolder(tree, { title, sub, skip = [], allowTop = false, submit = 'Move here' }) {
  const kids = {}; tree.forEach(f => (kids[f.p || 0] = kids[f.p || 0] || []).push(f));
  const banned = new Set(); const ban = id => { banned.add(id); (kids[id] || []).forEach(k => ban(k.id)); }; skip.forEach(ban);
  const rows = []; const walk = (p, d) => (kids[p] || []).forEach(f => { if (banned.has(f.id)) return; rows.push([f, d]); walk(f.id, d + 1); }); walk(0, 0);
  return modal({ title, sub, submit, wide: true,
    body: `<input type="search" class="rec-pq" placeholder="Find a folder" aria-label="Find a folder"><div class="rec-pick">${allowTop ? `<label class="rec-pr top"><input type="radio" name="to" value="top">${ico('home')}<b>Operation Records</b> <span class="sub">(the top)</span></label>` : ''}
      ${rows.map(([f, d]) => `<label class="rec-pr" style="--d:${d}" data-n="${esc(f.n.toLowerCase())}"><input type="radio" name="to" value="${f.id}">${ico('folder')}<span>${esc(f.n)}</span></label>`).join('') || '<div class="empty">No other folders yet.</div>'}</div>`,
    onOpen: d => { const qy = $('.rec-pq', d); qy.oninput = () => { const t = qy.value.trim().toLowerCase(); $$('.rec-pr[data-n]', d).forEach(x => { x.hidden = !!t && !x.dataset.n.includes(t); }); }; },
    onSubmit: x => { if (!x.to) throw new Error('Choose a folder'); return x.to === 'top' ? 'top' : +x.to; } });
}

// ================================================================ FOLDERS
const recFolder = {
  async load(parts) {
    const id = parts[1] === 'f' ? +parts[2] || null : null;
    const d = this.d = await q(sb.rpc('rec_browse', { p_folder: id }));
    this.id = id; S.rec.sel.clear(); S.rec.selF.clear();
    const f = d.folder, w = recWriter(), admin = recAdmin();
    const flt = S.rec.filter[id || 0] || {}; this.flt = flt;
    const types = [...new Set(d.files.map(x => x.doc_type).filter(Boolean))], years = [...new Set(d.files.map(x => x.year).filter(Boolean))].sort((a, b) => b - a);
    const files = d.files.filter(x => (!flt.type || x.doc_type === flt.type) && (!flt.year || x.year === +flt.year));
    const canFolder = 'webkitdirectory' in document.createElement('input');
    const empty = !d.folders.length && !d.files.length;
    return topbar(f ? esc(f.name) : 'Operation Records', f ? recCrumbs(d.path, true) : 'End-of-job reports, technical proposals and other documents, kept in folders.',
        w && d.connected ? `<div class="rec-upmenu"><button class="btn tagbtn" id="rec-up" aria-haspopup="menu">${ico('up')}Upload</button>
          <div class="rec-upm" id="rec-upm" hidden role="menu">${f ? `<label role="menuitem">${ico('file')}Files<input type="file" multiple id="rec-upf" hidden></label>` : ''}
            ${canFolder ? `<label role="menuitem">${ico('folder')}A whole folder<input type="file" webkitdirectory multiple id="rec-upd" hidden></label>` : ''}</div></div>
          <button class="btn" id="rec-mk">${ico('plus')}New folder</button>` : '') +
      (!d.connected ? `<div class="notice">${isSuper() ? `Operation Records isn’t connected to Google Drive yet. Connect it in <a href="#/rec/settings">Records settings</a>.` : 'Operation Records isn’t connected to Google Drive yet. The Developer connects it, then documents can be uploaded.'}</div>` : '') +
      `<div class="rec-wrap"><aside class="rec-side" id="rec-side"></aside><div class="rec-main">
        <form class="rec-find" id="rec-find" role="search"><span>${ico('search')}</span><input type="search" name="q" placeholder="Search names, tags and the words inside documents" aria-label="Search Operation Records"><button class="btn small" type="submit">Search</button></form>
        ${f && (w || admin) ? `<div class="rec-ftools">${w && d.files.length + d.folders.length ? `<button class="btn small" id="rec-tagall">${ico('label')}Tag everything in this folder</button>` : ''}
          ${admin || f.mine ? `<button class="btn small" id="rec-ren">${ico('edit')}Rename</button>` : ''}${admin ? `<button class="btn small" id="rec-mv">${ico('move')}Move</button>` : ''}
          ${admin || f.all_mine ? `<button class="btn small danger" id="rec-del">${ico('trash')}Delete folder</button>` : ''}</div>` : ''}
        <section class="panel rec-list" id="rec-drop">
          <header><h2>${f ? 'In this folder' : 'Folders'}</h2><span class="meta">${[d.folders.length ? plural(d.folders.length, 'folder') : '', f ? plural(d.files.length, 'document') : ''].filter(Boolean).join(' · ')}</span>
            ${d.files.length > 6 ? `<span class="right rec-flt">${types.length ? `<select id="rec-ft" aria-label="Type"><option value="">Every type</option>${types.map(t => opt(t, t, flt.type)).join('')}</select>` : ''}
              ${years.length > 1 ? `<select id="rec-fy" aria-label="Year"><option value="">Every year</option>${years.map(y => opt(y, y, flt.year)).join('')}</select>` : ''}</span>` : ''}</header>
          ${empty ? `<div class="empty rec-empty">${ico('folder')}<b>${f ? 'This folder is empty' : 'No folders yet'}</b>
              <span>${w && d.connected ? (f ? 'Drop documents or a whole folder here, or press <b>Upload</b>.' : 'Drop a whole folder here (its folders inside come too), or press <b>New folder</b>.') : f ? 'Documents put here will show up in this folder.' : 'Folders made by contributors will show here.'}</span></div>`
          : `<ul class="rec-rows">${d.folders.map(x => this.folderRow(x)).join('')}${files.map(x => this.fileRow(x)).join('')}</ul>
            ${files.length < d.files.length ? `<div class="body muted small">${plural(d.files.length - files.length, 'document')} hidden by the filter. <a href="#" id="rec-fclr">Show all</a></div>` : ''}`}
          <div class="rec-dropov" aria-hidden="true">${ico('up')}<b>Drop to upload into ${esc(f ? f.name : 'Operation Records')}</b></div>
        </section>
        <div class="rec-selbar" id="rec-selbar" hidden><b id="rec-seln"></b><span class="jt-sp"></span>
          ${w ? `<button class="btn small" id="rec-stag">${ico('label')}Tag</button>` : ''}${admin ? `<button class="btn small" id="rec-smv">${ico('move')}Move</button>` : ''}${w ? `<button class="btn small danger" id="rec-sdel">${ico('trash')}Delete</button>` : ''}
          <span class="rec-selnote" id="rec-selnote" hidden>You can delete only documents you uploaded.</span>
          <button class="btn small" id="rec-sclr">Clear</button></div>
      </div></div>`;
  },
  folderRow(x) {
    return `<li class="rec-row folder">${recAdmin() ? `<label class="rec-ck"><input type="checkbox" data-sf="${x.id}" aria-label="Select ${esc(x.name)}"></label>` : ''}
      <a class="rec-main-a" href="#/rec/f/${x.id}"><span class="rec-fi">${ico('folder')}</span><span class="rec-nm"><b>${esc(x.name)}</b>
        <span class="sub">${[x.folders ? plural(x.folders, 'folder') : '', plural(x.files, 'document')].filter(Boolean).join(' · ')}</span></span></a></li>`;
  },
  fileRow(x) {
    return `<li class="rec-row">${recWriter() ? `<label class="rec-ck"><input type="checkbox" data-s="${x.id}" aria-label="Select ${esc(x.name)}"></label>` : ''}
      <a class="rec-main-a" href="#/rec/file/${x.id}">${recBadge(x.name)}<span class="rec-nm"><b>${esc(x.name)}</b>
        <span class="rec-tags">${recTags(x)}${x.version > 1 ? `<span class="rec-tag ver">v${x.version}</span>` : ''}</span></span>
        <span class="rec-meta"><span>${recSize(x.size)}</span><span class="sub">${fd(x.uploaded_at)}${x.uploaded_by ? ' · ' + esc(String(x.uploaded_by).replace(/ \(brought back.*$/, '')) : ''}</span></span></a>
      <button type="button" class="btn small ghost rec-dl" data-dl="${x.id}" title="Download">${ico('down')}</button></li>`;
  },
  bind(main) {
    const d = this.d, id = this.id, self = this;
    const side = $('#rec-side', main); side._tree = d.tree; side._cur = id; side.innerHTML = recTreeHtml(d.tree, id, d.path); bindRecTree(side);
    $('#rec-find', main).onsubmit = e => { e.preventDefault(); const v = e.target.q.value.trim(); if (v) go('#/rec/search?q=' + encodeURIComponent(v)); };
    $$('[data-dl]', main).forEach(b => b.onclick = e => { e.preventDefault(); recDownload(+b.dataset.dl); });
    // filters
    const setF = (k, v) => { S.rec.filter[id || 0] = { ...self.flt, [k]: v }; render({ quiet: true }); };
    const ft = $('#rec-ft', main); if (ft) ft.onchange = () => setF('type', ft.value);
    const fy = $('#rec-fy', main); if (fy) fy.onchange = () => setF('year', fy.value);
    const fc = $('#rec-fclr', main); if (fc) fc.onclick = e => { e.preventDefault(); S.rec.filter[id || 0] = {}; render({ quiet: true }); };
    // upload
    const up = $('#rec-up', main), menu = $('#rec-upm', main);
    if (up) {
      up.onclick = e => { e.stopPropagation(); if (!d.folder && !$('#rec-upd', main)) return toast('Open a folder first: documents go inside a folder.', true); menu.hidden = !menu.hidden; };
      document.addEventListener('click', function off(e) { if (!menu.isConnected) return document.removeEventListener('click', off); if (!e.target.closest('.rec-upmenu')) menu.hidden = true; });
      const uf = $('#rec-upf', main); if (uf) uf.onchange = () => { menu.hidden = true; recUpload(d, [...uf.files].map(file => ({ file, path: file.name })), []); uf.value = ''; };
      const ud = $('#rec-upd', main); if (ud) ud.onchange = () => { menu.hidden = true; recUpload(d, [...ud.files].map(file => ({ file, path: file.webkitRelativePath || file.name })), []); ud.value = ''; };
    }
    // drag and drop (files, or whole folders with everything inside)
    const zone = $('#rec-drop', main);
    if (recWriter() && d.connected) {
      let depth = 0;
      zone.addEventListener('dragenter', e => { if (![...(e.dataTransfer?.types || [])].includes('Files')) return; e.preventDefault(); depth++; zone.classList.add('drag'); });
      zone.addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
      zone.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; zone.classList.remove('drag'); } });
      zone.addEventListener('drop', async e => { e.preventDefault(); depth = 0; zone.classList.remove('drag'); const got = await recDropped(e.dataTransfer); if (got.items.length || got.dirs.length) recUpload(d, got.items, got.dirs); });
    }
    const mk = $('#rec-mk', main); if (mk) mk.onclick = () => modal({ title: 'New folder', sub: d.folder ? `Inside ${esc(d.folder.name)}` : 'At the top of Operation Records', submit: 'Make folder',
      body: '<label class="f">Name<input name="name" required maxlength="200" placeholder="e.g. Heritage (HEOSL)"></label>',
      onSubmit: async x => { const r = await recFn({ action: 'mkdirs', parent_id: id, paths: [x.name.trim()] }); toast('Folder made'); const nid = Object.values(r.folders)[0]; render({ quiet: true }); return nid; } });
    // this folder
    const tagall = $('#rec-tagall', main); if (tagall) tagall.onclick = () => recTagForm({ folder: d.folder, count: null });
    const ren = $('#rec-ren', main); if (ren) ren.onclick = () => recRename('folder', d.folder);
    const mv = $('#rec-mv', main); if (mv) mv.onclick = () => recMove(d.tree, [d.folder.id], [], d.folder.name);
    const del = $('#rec-del', main); if (del) del.onclick = () => recDelete([d.folder.id], [], `the folder ${d.folder.name} and everything in it`, d.folder.parent_id ? '#/rec/f/' + d.folder.parent_id : '#/rec');
    // selecting several
    const bar = $('#rec-selbar', main); const mine = new Set(d.files.filter(x => x.mine).map(x => x.id));
    const sync = () => { const n = S.rec.sel.size + S.rec.selF.size; bar.hidden = !n;
      $('#rec-seln', main).textContent = [S.rec.selF.size ? plural(S.rec.selF.size, 'folder') : '', S.rec.sel.size ? plural(S.rec.sel.size, 'document') : ''].filter(Boolean).join(' and ') + ' selected';
      const t = $('#rec-stag', main); if (t) t.hidden = !S.rec.sel.size || !!S.rec.selF.size;
      // a Contributor deletes only what they uploaded themselves
      const sd = $('#rec-sdel', main); if (sd && !recAdmin()) { const others = [...S.rec.sel].some(id => !mine.has(id)); sd.hidden = !n || others; $('#rec-selnote', main).hidden = !others; } };
    $$('[data-s]', main).forEach(c => c.onchange = () => { c.checked ? S.rec.sel.add(+c.dataset.s) : S.rec.sel.delete(+c.dataset.s); c.closest('li').classList.toggle('sel', c.checked); sync(); });
    $$('[data-sf]', main).forEach(c => c.onchange = () => { c.checked ? S.rec.selF.add(+c.dataset.sf) : S.rec.selF.delete(+c.dataset.sf); c.closest('li').classList.toggle('sel', c.checked); sync(); });
    $('#rec-sclr', main).onclick = () => { S.rec.sel.clear(); S.rec.selF.clear(); $$('.rec-ck input', main).forEach(c => { c.checked = false; c.closest('li').classList.remove('sel'); }); sync(); };
    const st = $('#rec-stag', main); if (st) st.onclick = () => recTagForm({ ids: [...S.rec.sel] });
    const smv = $('#rec-smv', main); if (smv) smv.onclick = () => recMove(d.tree, [...S.rec.selF], [...S.rec.sel], `${S.rec.sel.size + S.rec.selF.size} items`);
    const sdel = $('#rec-sdel', main); if (sdel) sdel.onclick = () => recDelete([...S.rec.selF], [...S.rec.sel], [S.rec.selF.size ? plural(S.rec.selF.size, 'folder') + ' (with everything in them)' : '', S.rec.sel.size ? plural(S.rec.sel.size, 'document') : ''].filter(Boolean).join(' and '));
  }
};

// ---------------------------------------------------------------- rename, move, delete (Admins)
function recRename(kind, x) {
  const ext = kind === 'file' ? recExt(x.name) : '';
  return modal({ title: kind === 'file' ? 'Rename document' : 'Rename folder', submit: 'Rename',
    body: `<label class="f">Name<input name="name" required maxlength="200" value="${esc(x.name)}"></label>${ext ? `<p class="muted small">Keep the .${esc(ext)} at the end so it still opens.</p>` : ''}`,
    onOpen: d => { const i = $('[name=name]', d); if (ext) setTimeout(() => i.setSelectionRange(0, x.name.length - ext.length - 1), 0); },
    onSubmit: async v => { await recFn({ action: 'rename', kind, id: x.id, name: v.name.trim() }); toast('Renamed'); render({ quiet: true }); } });
}
async function recMove(tree, folders, files, what) {
  const to = await recPickFolder(tree, { title: `Move ${what}`, sub: 'Choose where it goes. It moves in Google Drive too.', skip: folders, allowTop: !files.length });
  if (!to) return;
  try { const r = await recFn({ action: 'move', folders, files, to: to === 'top' ? null : to }); toast(r.moved ? `Moved ${plural(r.moved, 'item')}` : 'Nothing to move: it’s already there'); S.rec.sel.clear(); S.rec.selF.clear(); render({ quiet: true }); }
  catch (e) { toast(niceError(e), true); }
}
async function recDelete(folders, files, what, after) {
  if (!confirm(`Move ${what} to the recycle bin?\n\n${recAdmin() ? 'You' : 'An Operation Records admin'} can bring it back from the recycle bin for 30 days. After that it’s deleted for good, from Google Drive too.`)) return;
  try { const n = await q(sb.rpc('rec_delete', { p_folders: folders, p_files: files })); toast(`Moved to the recycle bin${n > 1 ? ` (${plural(n, 'item')})` : ''}`); S.rec.sel.clear(); S.rec.selF.clear();
    if (after) go(after); else render({ quiet: true }); }
  catch (e) { toast(niceError(e), true); }
}

// ---------------------------------------------------------------- tags: one document, several, or a whole folder
let recPickCache = null;
async function recTagForm({ file, ids, folder }) {
  const pk = recPickCache && Date.now() - recPickCache.at < 120000 ? recPickCache : (recPickCache = { ...(await q(sb.rpc('rec_pick'))), at: Date.now() });
  const types = (file || {}).types || (recFolder.d || {}).types || (await q(sb.rpc('rec_browse', { p_folder: null }))).types;
  const one = !!file; const keep = one ? '' : '<option value="__keep" selected>Leave as it is</option>';
  const v = file || {};
  const jobOpt = j => `<option value="${j.id}" data-c="${j.client_id || ''}" ${v.job_id === j.id ? 'selected' : ''}>${esc(j.job_no)}${j.project ? ' · ' + esc(j.project) : ''}</option>`;
  const title = one ? 'Tags' : folder ? `Tag everything in ${folder.name}` : `Tag ${plural(ids.length, 'document')}`;
  return modal({ title, submit: 'Save tags', wide: true,
    sub: one ? 'Tags help people find documents. They’re all optional.' : folder ? 'Every document in this folder and the folders inside it gets these tags. Fields left as they are don’t change.' : 'Fields left as they are don’t change.',
    body: `<div class="row2"><label class="f">Type<select name="doc_type">${keep}<option value="">None</option>${types.map(t => opt(t, t, one ? v.doc_type : '__keep')).join('')}</select></label>
      <label class="f">Year<input name="year" inputmode="numeric" maxlength="4" pattern="\\d{4}" value="${esc(v.year || '')}" placeholder="${one ? 'e.g. 2026' : 'Leave as it is'}"></label></div>
      <div class="row2"><label class="f">Client<select name="client_id">${keep}<option value="">None</option>${pk.clients.map(c => opt(c.id, c.name, one ? v.client_id : '__keep')).join('')}</select></label>
      <label class="f">Job no.<select name="job_id">${keep}<option value="">None</option>${pk.jobs.map(jobOpt).join('')}</select><span class="hint">From JobTrack. Choosing a job fills its client.</span></label></div>
      <label class="f">Well<input name="well" list="rec-wells" value="${esc(v.well || '')}" placeholder="${one ? 'e.g. Uzere 5L' : 'Leave as it is'}"><datalist id="rec-wells"></datalist></label>`,
    onOpen: d => {
      const js = $('[name=job_id]', d), cs = $('[name=client_id]', d), wl = $('#rec-wells', d);
      const wells = () => { const j = pk.jobs.find(x => x.id === +js.value); wl.innerHTML = (j?.wells || []).map(w => `<option value="${esc(w)}">`).join(''); };
      const narrow = () => { const c = cs.value; $$('option[data-c]', js).forEach(o => { o.hidden = !!c && c !== '__keep' && o.dataset.c !== c; }); };
      js.onchange = () => { const o = js.selectedOptions[0]; if (o?.dataset.c) { cs.value = o.dataset.c; narrow(); } wells(); };
      cs.onchange = () => { narrow(); const o = js.selectedOptions[0]; if (o?.dataset.c && cs.value !== o.dataset.c && cs.value !== '__keep') js.value = one ? '' : '__keep'; };
      narrow(); wells();
    },
    onSubmit: async x => {
      const p = {};
      for (const k of ['doc_type', 'client_id', 'job_id']) if (x[k] !== '__keep') p[k] = x[k];
      for (const k of ['well', 'year']) if (one || x[k].trim()) p[k] = x[k].trim();
      if (p.year && !/^\d{4}$/.test(p.year)) throw new Error('Give the year as four digits, for example 2026');
      if (!Object.keys(p).length) throw new Error('Nothing to change: set at least one tag');
      const n = await q(sb.rpc('rec_tags', { p_files: one ? [file.id] : ids || null, p_folder: folder ? folder.id : null, p }));
      toast(one ? 'Tags saved' : `Tags saved on ${plural(n, 'document')}`); S.rec.sel.clear(); render({ quiet: true });
    } });
}

// ================================================================ ONE DOCUMENT
const recFile = {
  async load(parts) {
    const f = this.f = await q(sb.rpc('rec_file_get', { p_id: +parts[2] }));
    const w = recWriter(), admin = recAdmin(), gone = !!f.deleted_at, k = recKind(f.name);
    return topbar(esc(f.name), recCrumbs(f.path, false), `<button class="btn" id="rf-dl">${ico('down')}Download</button>
        ${w && !gone ? `<label class="btn filebtn">${ico('up')}New version<input type="file" id="rf-nv" hidden></label>` : ''}`) +
      (gone ? `<div class="notice bad">This document is in the recycle bin (deleted by ${esc(f.deleted_by || '—')} ${fdt(f.deleted_at)}). It’s deleted for good on ${fd(new Date(new Date(f.deleted_at).getTime() + 30 * 864e5))}. ${admin ? '<button class="btn small" id="rf-res">Bring it back</button>' : ''}</div>` : '') +
      `<div class="rec-doc"><section class="panel rec-pv"><header><h2>Preview</h2><span class="meta" id="rf-pvm">${esc(recKindName(f.name))}</span></header><div class="rec-pvb" id="rf-pv"><div class="loading">Getting the preview…</div></div></section>
      <div class="rec-side2">
        <section class="panel"><header><h2>Details</h2></header><div class="body jt-facts rec-facts">
          <div><span>Type of file</span><b>${esc(recKindName(f.name))} · ${recSize(f.size)}</b></div>
          <div><span>Version</span><b>${f.version}${f.versions.length ? ` <span class="sub">(${plural(f.versions.length, 'earlier version')} below)</span>` : ''}</b></div>
          <div><span>${f.version > 1 ? 'This version uploaded' : 'Uploaded'}</span><b>${fdt(f.uploaded_at)}</b><span class="sub">${esc(f.uploaded_by || '')}</span></div>
          <div><span>Downloads</span><b>${f.downloads ? plural(f.downloads, 'time') : 'Not yet'}</b></div></div>
          ${(admin || (w && f.mine)) && !gone ? `<div class="body actionrow"><button class="btn small" id="rf-ren">${ico('edit')}Rename</button>${admin ? `<button class="btn small" id="rf-mv">${ico('move')}Move</button>` : ''}<button class="btn small danger" id="rf-del">${ico('trash')}Delete</button></div>` : ''}</section>
        <section class="panel"><header><h2>Tags</h2>${w && !gone ? `<span class="right"><button class="btn small" id="rf-tag">${ico('label')}${f.doc_type || f.client || f.job_no || f.well ? 'Change' : 'Add tags'}</button></span>` : ''}</header>
          <div class="body">${f.doc_type || f.client || f.job_no || f.well || f.year ? `<div class="jt-facts rec-facts"><div><span>Type</span><b>${esc(f.doc_type || '—')}</b></div><div><span>Year</span><b>${f.year || '—'}</b></div>
            <div><span>Client</span><b>${esc(f.client || '—')}</b></div><div><span>Job no.</span><b>${f.job_id ? `<a href="#/jt/job/${f.job_id}">${esc(f.job_no)}</a>` : '—'}</b></div><div><span>Well</span><b>${esc(f.well || '—')}</b></div></div>`
            : `<p class="muted">No tags yet.${w ? ' Tags (type, client, job, well, year) help people find it.' : ''}</p>`}</div></section>
        <section class="panel"><header><h2>Versions</h2><span class="meta">${f.version === 1 ? 'Only one' : plural(f.version, 'version')}</span></header>
          <ul class="list rec-vers"><li><div class="main"><div class="name">Version ${f.version} ${chip('ok', 'Current')}</div><div class="sub">${fdt(f.uploaded_at)} · ${esc(f.uploaded_by || '')} · ${recSize(f.size)}</div></div></li>
            ${f.versions.map(v => `<li><div class="main"><div class="name">Version ${v.version}${v.name !== f.name ? ` <span class="sub">(${esc(v.name)})</span>` : ''}</div><div class="sub">${fdt(v.at)} · ${esc(v.by || '')} · ${recSize(v.size)}</div></div>
              <div class="end"><button class="btn small" data-vdl="${v.version}" title="Download version ${v.version}">${ico('down')}</button>${w && !gone ? `<button class="btn small" data-vres="${v.version}">Bring back</button>` : ''}</div></li>`).join('')}</ul>
          ${w && !gone ? '<div class="body muted small">Uploading a document with the same name into this folder adds a new version. Older versions are kept.</div>' : ''}</section>
      </div></div>`;
  },
  bind(main) {
    const f = this.f;
    $('#rf-dl', main).onclick = () => recDownload(f.id);
    $$('[data-vdl]', main).forEach(b => b.onclick = () => recDownload(f.id, +b.dataset.vdl));
    $$('[data-vres]', main).forEach(b => b.onclick = async () => { if (!confirm(`Bring back version ${b.dataset.vres}? It becomes the newest version. Nothing is lost: the current one stays in the list.`)) return;
      try { await q(sb.rpc('rec_version_restore', { p_file: f.id, p_version: +b.dataset.vres })); toast(`Version ${b.dataset.vres} brought back`); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } });
    const tg = $('#rf-tag', main); if (tg) tg.onclick = () => recTagForm({ file: f });
    const rn = $('#rf-ren', main); if (rn) rn.onclick = () => recRename('file', f);
    const mv = $('#rf-mv', main); if (mv) mv.onclick = () => recMove(f.tree, [], [f.id], f.name);
    const dl = $('#rf-del', main); if (dl) dl.onclick = () => recDelete([], [f.id], f.name, '#/rec/f/' + f.folder_id);
    const rs = $('#rf-res', main); if (rs) rs.onclick = async () => { try { await q(sb.rpc('rec_restore', { p_kind: 'file', p_id: f.id })); toast('Brought back'); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } };
    const nv = $('#rf-nv', main); if (nv) nv.onchange = () => { const file = nv.files[0]; nv.value = ''; if (!file) return;
      if (recExt(file.name) !== recExt(f.name)) return toast(`Choose a .${recExt(f.name)} file: a new version is the same kind of document.`, true);
      // a new version keeps the document's name
      const named = new File([file], f.name, { type: file.type });
      recUpload({ folder: { id: f.folder_id, name: f.path.slice(-1)[0]?.name || '' }, files: [], max_mb: 0 }, [{ file: named, path: f.name }], [], { replace: true, done: () => { if (location.hash === '#/rec/file/' + f.id) render({ quiet: true }); } }); };
    recPreview($('#rf-pv', main), f, $('#rf-pvm', main));
  }
};
// the preview: PDFs page by page (pdf.js), photos as they are, Word/Excel/PowerPoint as a PDF Google makes once and Nest keeps
async function recPreview(box, f, meta) {
  const k = recKind(f.name);
  if (recExt(f.name) === 'csv') { box.innerHTML = '<div class="empty">No preview for CSV files. Download it to open it in Excel.</div>'; return; }
  if (k === 'file') { box.innerHTML = `<div class="empty rec-nopv">${recBadge(f.name)}<b>No preview for ${esc(recKindName(f.name))}s</b><span>Download it to open it in its own program.</span><button class="btn small" id="rf-pvdl">${ico('down')}Download</button></div>`; $('#rf-pvdl', box).onclick = () => recDownload(f.id); return; }
  if (k !== 'pdf' && k !== 'img') box.innerHTML = `<div class="loading">Making a preview of the ${esc(REC_KIND_NAME[k])}… the first time takes a few seconds.</div>`;
  let r;
  try { r = await recFn({ action: 'preview', id: f.id }, true); }
  catch (e) { if (box.isConnected) box.innerHTML = `<div class="empty">${esc(niceError(e))}<br><button class="btn small" id="rf-pvdl">${ico('down')}Download it instead</button></div>`; const b = $('#rf-pvdl', box); if (b) b.onclick = () => recDownload(f.id); return; }
  const blob = await r.blob(); if (!box.isConnected) return;
  if (/^image\//.test(blob.type) || k === 'img') { const u = URL.createObjectURL(blob); box.innerHTML = `<img class="rec-img" src="${u}" alt="${esc(f.name)}">`; return; }
  try {
    await loadScript('vendor/pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    if (meta) meta.textContent = `${REC_KIND_NAME[k]} · ${plural(pdf.numPages, 'page')}${k !== 'pdf' ? ' · preview made by Google' : ''}`;
    box.innerHTML = '<div class="rec-pages"></div>'; const pages = $('.rec-pages', box);
    let shown = 0; const STEP = 12;
    const more = async () => {
      $('.rec-more', box)?.remove();
      const to = Math.min(pdf.numPages, shown + STEP);
      for (let i = shown + 1; i <= to; i++) {
        if (!box.isConnected) return;
        const pg = await pdf.getPage(i); const w = Math.min(pages.clientWidth || 800, 1100); const v1 = pg.getViewport({ scale: 1 });
        const sc = (w / v1.width) * Math.min(2, window.devicePixelRatio || 1); const vp = pg.getViewport({ scale: sc });
        const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.className = 'rec-page'; c.setAttribute('aria-label', `Page ${i}`);
        pages.appendChild(c); await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      }
      shown = to;
      if (shown < pdf.numPages) { pages.insertAdjacentHTML('afterend', `<div class="rec-more"><button class="btn" type="button">Show more pages (${shown} of ${pdf.numPages} shown)</button></div>`); $('.rec-more button', box).onclick = more; }
    };
    await more();
  } catch (e) { console.error(e); if (box.isConnected) box.innerHTML = `<div class="empty">The preview couldn’t be shown. Download the document to open it.</div>`; }
}

// ================================================================ UPLOADS
// What was dropped: files, and whole folders read all the way down (empty folders too)
async function recDropped(dt) {
  const items = [], dirs = [];
  const entries = [...(dt.items || [])].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (!entries.length) { [...(dt.files || [])].forEach(file => items.push({ file, path: file.name })); return { items, dirs }; }
  const readAll = dir => new Promise(res => { const r = dir.createReader(), out = []; const step = () => r.readEntries(b => { if (!b.length) return res(out); out.push(...b); step(); }, () => res(out)); step(); });
  const fileOf = e => new Promise(res => e.file(res, () => res(null)));
  const walk = async (e, base) => {
    const path = base ? base + '/' + e.name : e.name;
    if (e.isFile) { const f = await fileOf(e); if (f) items.push({ file: f, path }); return; }
    dirs.push(path); for (const c of await readAll(e)) await walk(c, path);
  };
  for (const e of entries) await walk(e, '');
  return { items, dirs };
}

const REC_UP = { q: [], running: false, cancel: false };
// d: the folder page's data; items: [{file, path}] with paths like "Heritage/2026/report.pdf"; dirs: folders that were dropped (even empty ones)
async function recUpload(d, items, dirs, opts = {}) {
  if (REC_UP.running) return toast('An upload is already going. Wait for it to finish, then upload the rest.', true);
  const here = d.folder ? d.folder.id : null;
  const maxB = (d.max_mb || (recFolder.d || {}).max_mb || 300) * 1048576;
  const skipped = [];
  let list = items.filter(x => { if (/(^|\/)(\.|~\$|Thumbs\.db$|desktop\.ini$)/i.test(x.path)) return false;   // hidden and temporary files
    if (!x.file.size) { skipped.push([x.path, 'empty']); return false; }
    if (x.file.size > maxB) { skipped.push([x.path, `bigger than ${Math.round(maxB / 1048576)} MB`]); return false; }
    return true; });
  if (here === null && list.some(x => !x.path.includes('/'))) {
    const loose = list.filter(x => !x.path.includes('/')); loose.forEach(x => skipped.push([x.path, 'documents go inside a folder']));
    list = list.filter(x => x.path.includes('/'));
  }
  const dirOf = p => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
  // every level, so folders that only hold other folders are counted and made too
  const ups = p => p.split('/').map((_, i, a) => a.slice(0, i + 1).join('/'));
  const allDirs = [...new Set([...dirs, ...list.map(x => dirOf(x.path)).filter(Boolean)].flatMap(ups))].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  if (!list.length && !allDirs.length) return recUpDone({ ok: 0, same: 0, ver: 0, failed: [], skipped, folders: 0 });
  const total = list.reduce((a, x) => a + x.file.size, 0);
  if (list.length > 1 || allDirs.length) {
    const ok = await modal({ title: allDirs.length ? 'Upload this folder?' : `Upload ${plural(list.length, 'document')}?`, submit: 'Upload',
      sub: `Into ${esc(d.folder ? d.folder.name : 'Operation Records (the top)')}`,
      body: `<div class="jt-facts"><div><span>Documents</span><b>${fq(list.length)}</b></div><div><span>Size</span><b>${recSize(total)}</b></div>${allDirs.length ? `<div><span>Folders</span><b>${fq(allDirs.length)}</b><span class="sub">made as they are</span></div>` : ''}</div>
        ${skipped.length ? `<p class="muted small">${plural(skipped.length, 'file')} will be left out (empty or too big). The list shows at the end.</p>` : ''}
        <p class="muted small">Documents already here with the same name and size are skipped, so you can upload the same folder again to finish one that stopped. A same-named document that has changed becomes a new version.</p>
        ${total > 200 * 1048576 ? '<p class="muted small">This is a big upload. Keep this tab open until it finishes; you can keep using Nest meanwhile.</p>' : ''}`, onSubmit: () => true });
    if (!ok) return;
  }
  REC_UP.running = true; REC_UP.cancel = false;
  const ui = recUpUi(d.folder ? d.folder.name : 'Operation Records');
  const res = { ok: 0, same: 0, ver: 0, failed: [], skipped, folders: 0 };
  const warn = e => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', warn);
  try {
    // the folders first, all levels, in Nest and in Drive
    const ids = { '': here };
    if (allDirs.length) {
      ui.step(`Making ${plural(allDirs.length, 'folder')}…`);
      for (let i = 0; i < allDirs.length; i += 150) {
        const r = await recFn({ action: 'mkdirs', parent_id: here, paths: allDirs.slice(i, i + 150) }); Object.assign(ids, r.folders);
        ui.step(`Making folders… ${Math.min(i + 150, allDirs.length)} of ${allDirs.length}`);
      }
      res.folders = allDirs.length;
    }
    // what's already there
    const fids = [...new Set(list.map(x => ids[dirOf(x.path)]).filter(Boolean))];
    const have = new Map(); for (let i = 0; i < fids.length; i += 500) (await q(sb.rpc('rec_names', { p_folders: fids.slice(i, i + 500) }))).forEach(x => have.set(x.f + '|' + x.n, x.s));
    const jobs = []; let skipB = 0;
    for (const x of list) {
      const fid = ids[dirOf(x.path)]; if (!fid) { res.failed.push([x.path, 'its folder couldn’t be made']); continue; }
      const k = fid + '|' + x.file.name.toLowerCase();
      if (have.has(k) && have.get(k) === x.file.size && !opts.replace) { res.same++; skipB += x.file.size; continue; }
      jobs.push({ ...x, fid, ver: have.has(k) });
    }
    let doneB = 0; const upB = jobs.reduce((a, x) => a + x.file.size, 0); let n = 0; const live = new Map();
    const tick = () => ui.prog(n, jobs.length, doneB + [...live.values()].reduce((a, v) => a + v, 0), upB, [...live.keys()].map(x => x.path).join(', '));
    tick();
    const one = async x => {
      live.set(x, 0); tick();
      try { const r = await recPut(x.file, x.fid, b => { live.set(x, b); tick(); }); r.replaced ? res.ver++ : res.ok++; }
      catch (e) { if (e.cancel) throw e; res.failed.push([x.path, niceError(e)]); }
      finally { live.delete(x); doneB += x.file.size; n++; tick(); }
    };
    // two at a time
    let next = 0; const lane = async () => { while (next < jobs.length && !REC_UP.cancel) await one(jobs[next++]); };
    await Promise.all([lane(), lane()]);
    if (REC_UP.cancel) res.cancelled = jobs.length - n;
  } catch (e) { if (!e.cancel) res.failed.push(['', niceError(e)]); else res.cancelled = true; }
  finally { REC_UP.running = false; window.removeEventListener('beforeunload', warn); }
  ui.close(); recUpDone(res);
  if (opts.done) opts.done(res); else if (location.hash.startsWith('#/rec')) render({ quiet: true });
}
// one file to Drive, in pieces (a piece that fails for want of signal is tried again)
async function recPut(file, folderId, onBytes) {
  const b = await recFn({ action: 'begin', folder_id: folderId, name: file.name, size: file.size, mime: file.type || '' });
  const size = b.chunk || 4194304; let off = 0;
  for (;;) {
    if (REC_UP.cancel) throw Object.assign(new Error('Stopped'), { cancel: true });
    const piece = file.slice(off, off + size); let r, tries = 0;
    for (;;) {
      try { r = await recChunk(b.upload_id, off, piece); break; }
      catch (e) { if (++tries > 5 || (!recNetErr(e) && !/\(5\d\d\)/.test(e.message))) throw e; await new Promise(x => setTimeout(x, 2000 * tries)); }
    }
    if (r.done) return r.file || {};
    off = r.received ?? off + piece.size; onBytes(off);
  }
}
async function recChunk(id, off, piece) {
  const { data } = await sb.auth.getSession();
  const r = await fetch(`${recUrl()}?action=chunk&upload=${encodeURIComponent(id)}&offset=${off}`, { method: 'PUT', body: piece,
    headers: { authorization: 'Bearer ' + data?.session?.access_token, apikey: CFG.SUPABASE_ANON_KEY, 'content-type': 'application/octet-stream' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Google Drive didn’t take that piece (${r.status})`);
  return j;
}
// the progress card (bottom right; it stays while you move around Nest)
function recUpUi(where) {
  $('.rec-upcard')?.remove();
  const el = document.createElement('div'); el.className = 'rec-upcard'; el.setAttribute('role', 'status');
  el.innerHTML = `<div class="rec-uph"><b>Uploading to ${esc(where)}</b><button type="button" class="btn small" data-stop>Stop</button></div>
    <div class="rec-bar"><i style="width:0%"></i></div><div class="rec-upt">Getting ready…</div><div class="rec-upn sub"></div>`;
  document.body.appendChild(el);
  $('[data-stop]', el).onclick = () => { if (confirm('Stop the upload? Documents already uploaded stay. Upload the same folder again later to carry on.')) { REC_UP.cancel = true; $('[data-stop]', el).disabled = true; $('.rec-upt', el).textContent = 'Stopping after the documents in progress…'; } };
  const t0 = Date.now();
  return {
    step: t => { $('.rec-upt', el).textContent = t; },
    prog(n, N, b, B, cur) {
      const pct = B ? Math.min(100, b / B * 100) : N ? n / N * 100 : 100; $('.rec-bar i', el).style.width = pct.toFixed(1) + '%';
      const secs = (Date.now() - t0) / 1000, rate = b / Math.max(1, secs), left = rate > 0 && B > b ? (B - b) / rate : 0;
      if (!REC_UP.cancel) $('.rec-upt', el).textContent = `${fq(Math.min(n + 1, N))} of ${fq(N)} · ${recSize(b)} of ${recSize(B)}${left > 30 && secs > 10 ? ` · about ${left > 5400 ? Math.round(left / 3600) + ' hours' : Math.max(1, Math.round(left / 60)) + ' min'} left` : ''}`;
      $('.rec-upn', el).textContent = cur || '';
    },
    close: () => el.remove()
  };
}
function recUpDone(r) {
  const bits = [r.ok ? plural(r.ok, 'document') + ' uploaded' : '', r.ver ? plural(r.ver, 'new version') : '', r.folders ? plural(r.folders, 'folder') + ' made or matched' : '',
    r.same ? `${plural(r.same, 'document')} already there (skipped)` : ''].filter(Boolean);
  const issues = [...r.failed.map(([p, m]) => [p, m, 'bad']), ...r.skipped.map(([p, m]) => [p, m, ''])];
  if (!issues.length && !r.cancelled) return toast(bits.join(' · ') || 'Nothing new to upload');
  modal({ title: r.cancelled ? 'Upload stopped' : r.failed.length ? 'Upload finished, with problems' : 'Upload finished', submit: null, cancel: 'Close', wide: true,
    body: `<p>${esc(bits.join(' · ') || 'Nothing was uploaded.')}${r.cancelled ? ' Upload the same folder again to carry on: what’s already there is skipped.' : ''}</p>
      ${r.failed.length ? `<p><b>${plural(r.failed.length, 'document')} didn’t upload.</b> Try those again: what’s already there is skipped.</p>` : ''}
      ${issues.length ? `<div class="rec-issues"><table class="t"><thead><tr><th>File</th><th>Why</th></tr></thead><tbody>${issues.slice(0, 300).map(([p, m, c]) => `<tr class="${c}"><td>${esc(p || '—')}</td><td>${c ? chip('overdue', 'Failed') + ' ' : ''}${esc(m)}</td></tr>`).join('')}</tbody></table>
        ${issues.length > 300 ? `<p class="muted small">…and ${issues.length - 300} more.</p>` : ''}</div>` : ''}` });
}

// ================================================================ SEARCH
const recSearch = {
  async load(parts, params) {
    const p = this.p = { q: params?.get('q') || '', doc_type: params?.get('type') || '', client_id: params?.get('client') || '', year: params?.get('year') || '', inside: params?.get('inside') !== '0' };
    const pk = recPickCache && Date.now() - recPickCache.at < 120000 ? recPickCache : (recPickCache = { ...(await q(sb.rpc('rec_pick'))), at: Date.now() });
    const any = p.q || p.doc_type || p.client_id || p.year;
    let ids = [], note = '';
    if (p.q && p.inside) { try { ids = (await recFn({ action: 'search', q: p.q })).ids || []; } catch (e) { note = `Only names and tags were searched: ${niceError(e)}`; } }
    const r = any ? await q(sb.rpc('rec_search', { p: { q: p.q, ids, doc_type: p.doc_type, client_id: p.client_id, year: p.year } })) : { files: [], types: (await q(sb.rpc('rec_browse', { p_folder: null }))).types };
    // folders whose names match
    const tree = r.tree || (this.tree = this.tree || (await q(sb.rpc('rec_browse', { p_folder: null }))).tree);
    const words = p.q.toLowerCase().split(/\s+/).filter(Boolean);
    const folders = words.length ? tree.filter(f => words.every(w => f.n.toLowerCase().includes(w))).slice(0, 30) : [];
    const yr = new Date().getFullYear();
    return topbar('Search', 'Names, tags and the words inside documents (Google Drive reads PDFs, Word, Excel and PowerPoint files).') +
      `<form class="rec-sform panel" id="rec-sf"><div class="body"><div class="rec-sq"><span>${ico('search')}</span><input type="search" name="q" value="${esc(p.q)}" placeholder="e.g. Uzere 5L screen hang-off" aria-label="Search for"><button class="btn primary" type="submit">Search</button></div>
        <div class="rec-sfl"><select name="type" aria-label="Type"><option value="">Every type</option>${r.types.map(t => opt(t, t, p.doc_type)).join('')}</select>
          <select name="client" aria-label="Client"><option value="">Every client</option>${pk.clients.map(c => opt(c.id, c.name, p.client_id)).join('')}</select>
          <select name="year" aria-label="Year"><option value="">Every year</option>${Array.from({ length: 15 }, (_, i) => yr - i).map(y => opt(y, y, p.year)).join('')}</select>
          <label class="check"><input type="checkbox" name="inside" ${p.inside ? 'checked' : ''}> Search inside documents</label></div></div></form>
      ${note ? `<div class="notice">${esc(note)}</div>` : ''}
      ${!any ? `<div class="empty">Type what you’re looking for, or choose a type, client or year.</div>` : `
      ${folders.length ? `<section class="panel"><header><h2>Folders</h2><span class="meta">${plural(folders.length, 'folder')}</span></header><ul class="rec-rows">${folders.map(f => `<li class="rec-row folder"><a class="rec-main-a" href="#/rec/f/${f.id}"><span class="rec-fi">${ico('folder')}</span><span class="rec-nm"><b>${esc(f.n)}</b><span class="sub">${esc(this.where(tree, f))}</span></span></a></li>`).join('')}</ul></section>` : ''}
      <section class="panel"><header><h2>Documents</h2><span class="meta">${r.files.length >= 300 ? 'The first 300' : plural(r.files.length, 'document')}</span></header>
        ${r.files.length ? `<ul class="rec-rows">${r.files.map(x => `<li class="rec-row"><a class="rec-main-a" href="#/rec/file/${x.id}">${recBadge(x.name)}<span class="rec-nm"><b>${esc(x.name)}</b>
            <span class="sub">${esc(x.path.map(y => y.name).join(' › '))}</span><span class="rec-tags">${x.inside ? '<span class="rec-tag hit">Found inside the document</span>' : ''}${recTags(x)}</span></span>
            <span class="rec-meta"><span>${recSize(x.size)}</span><span class="sub">${fd(x.uploaded_at)}</span></span></a><button type="button" class="btn small ghost rec-dl" data-dl="${x.id}" title="Download">${ico('down')}</button></li>`).join('')}</ul>`
          : `<div class="empty">Nothing found${p.q ? ` for “${esc(p.q)}”` : ''}. Try fewer words, or clear a filter.</div>`}</section>`}`;
  },
  where(tree, f) { const by = new Map(tree.map(x => [x.id, x])); const out = []; let c = by.get(f.p); while (c) { out.unshift(c.n); c = by.get(c.p); } return ['Operation Records', ...out].join(' › '); },
  bind(main) {
    const f = $('#rec-sf', main);
    const run = () => { const x = new FormData(f); const u = new URLSearchParams(); for (const k of ['q', 'type', 'client', 'year']) if (String(x.get(k) || '').trim()) u.set(k, String(x.get(k)).trim());
      if (!x.get('inside')) u.set('inside', '0'); go('#/rec/search' + (u.toString() ? '?' + u : '')); };
    f.onsubmit = e => { e.preventDefault(); run(); };
    $$('select, [name=inside]', f).forEach(s => s.onchange = run);
    if (!this.p.q) setTimeout(() => $('[name=q]', f)?.focus(), 0);
    $$('[data-dl]', main).forEach(b => b.onclick = e => { e.preventDefault(); recDownload(+b.dataset.dl); });
  }
};

// ================================================================ RECYCLE BIN (Admins)
const recBin = {
  async load() {
    if (!recAdmin()) return topbar('Recycle bin') + '<div class="notice">Only Operation Records admins can see the recycle bin.</div>';
    const b = this.b = await q(sb.rpc('rec_bin'));
    const left = at => { const d = Math.ceil((new Date(at).getTime() + 30 * 864e5 - Date.now()) / 864e5); return d <= 1 ? 'deleted for good tonight' : `${d} days left`; };
    const n = b.folders.length + b.files.length;
    return topbar('Recycle bin', 'Deleted folders and documents stay here for 30 days, then they’re deleted for good (from Google Drive too).',
        n ? `<button class="btn danger" id="rb-empty">${ico('trash')}Empty the recycle bin</button>` : '') +
      (!n ? '<div class="empty">The recycle bin is empty.</div>' : `<section class="panel"><ul class="rec-rows">
        ${b.folders.map(f => `<li class="rec-row folder"><div class="rec-main-a"><span class="rec-fi">${ico('folder')}</span><span class="rec-nm"><b>${esc(f.name)}</b>
          <span class="sub">Was in ${esc(['Operation Records', ...f.path.map(x => x.name)].join(' › '))} · ${plural(f.files, 'document')} inside</span>
          <span class="sub">Deleted by ${esc(f.deleted_by || '—')} ${fdt(f.deleted_at)} · ${left(f.deleted_at)}</span></span></div>
          <button class="btn small" data-res="folder:${f.id}">${ico('undo')}Bring back</button></li>`).join('')}
        ${b.files.map(f => `<li class="rec-row"><a class="rec-main-a" href="#/rec/file/${f.id}">${recBadge(f.name)}<span class="rec-nm"><b>${esc(f.name)}</b>
          <span class="sub">Was in ${esc(['Operation Records', ...f.path.map(x => x.name)].join(' › '))} · ${recSize(f.size)}</span>
          <span class="sub">Deleted by ${esc(f.deleted_by || '—')} ${fdt(f.deleted_at)} · ${left(f.deleted_at)}</span></span></a>
          <button class="btn small" data-res="file:${f.id}">${ico('undo')}Bring back</button></li>`).join('')}</ul></section>`);
  },
  bind(main) {
    $$('[data-res]', main).forEach(b => b.onclick = async () => { const [k, id] = b.dataset.res.split(':');
      try { await q(sb.rpc('rec_restore', { p_kind: k, p_id: +id })); toast('Brought back'); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } });
    const em = $('#rb-empty', main); if (em) em.onclick = async () => {
      if (!confirm('Delete everything in the recycle bin for good?\n\nIt’s removed from Google Drive too, and can’t be brought back.')) return;
      await withProgress('Emptying the recycle bin…', async () => { try { const r = await recFn({ action: 'empty' }); toast(`Deleted for good: ${plural(r.files, 'document')}${r.folders ? ', ' + plural(r.folders, 'folder') : ''}`); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } });
    };
  }
};

// ================================================================ RECORDS SETTINGS
const recSettings = {
  async load(parts, params) {
    if (!recAdmin() && !isSuper()) return topbar('Records settings') + '<div class="notice">Only Operation Records admins can change these settings.</div>';
    const msg = params?.get('drive') || '';
    let st, err = '';
    try { st = await recFn({ action: 'status' }); } catch (e) { err = niceError(e); st = await q(sb.rpc('rec_status')).catch(() => ({})); }
    const cfg = setting('records', null) || (await q(sb.from('app_settings').select('value').eq('key', 'records')).catch(() => []))[0]?.value || {};
    const types = (await q(sb.rpc('rec_browse', { p_folder: null }))).types;
    const MSG = { connected: ['ok', 'Google Drive is connected. Documents can now be uploaded.'], expired: ['bad', 'That took too long (over 15 minutes). Press Connect Google Drive again.'],
      failed: ['bad', 'Google didn’t connect. Check the Google Cloud settings in the 3.0.12 install steps, then try again.'],
      'no-refresh': ['bad', 'Google didn’t give Nest a lasting key. In the Nest Gmail, open myaccount.google.com → Security → Third-party connections, remove Nest, then connect again.'], denied: ['bad', 'Access wasn’t given on the Google screen, so nothing changed.'] };
    const q_ = st.quota;
    return topbar('Records settings', 'Operation Records keeps its documents in the Nest Gmail’s Google Drive. Nobody needs to open Drive: everything is done in Nest.') +
      (msg && MSG[msg] ? `<div class="notice ${MSG[msg][0]}">${esc(MSG[msg][1])}</div>` : '') +
      `<section class="panel"><header><h2>Google Drive</h2><span class="right">${st.connected ? chip('ok', 'Connected') : chip('pending', 'Not connected')}</span></header><div class="body">
        ${err ? `<div class="notice bad">${esc(err)}</div>` : ''}
        ${st.drive_error ? `<div class="notice bad">Google Drive isn’t answering Nest: ${esc(st.drive_error)} If it keeps happening, press <b>Connect again</b>.</div>` : ''}
        ${st.connected ? `<div class="jt-facts"><div><span>Google account</span><b>${esc(st.email || '—')}</b></div><div><span>Connected</span><b>${st.connected_at ? fdt(st.connected_at) : '—'}</b><span class="sub">${esc(st.connected_by || '')}</span></div>
          <div><span>In Operation Records</span><b>${plural(st.files || 0, 'document')} · ${plural(st.folders || 0, 'folder')}</b><span class="sub">${recSize(st.bytes || 0)} with earlier versions</span></div>
          ${q_ ? `<div><span>Google Drive space</span><b>${recSize(q_.usage)} of ${q_.limit ? recSize(q_.limit) : 'unlimited'}</b>${q_.limit ? `<div class="rec-bar small"><i style="width:${Math.min(100, q_.usage / q_.limit * 100).toFixed(1)}%"></i></div>` : ''}</div>` : ''}</div>
          <p class="muted small">Nest makes a folder called <b>Nest Operation Records</b> in that Drive and only touches what it made. Previews of Word, Excel and PowerPoint files go in <b>_Nest previews</b>. Don’t move or rename things there by hand.</p>`
        : `<p>${isSuper() ? 'Sign in to the Nest Gmail on the Google screen that opens, and allow Nest to keep its documents in that Drive.' : 'The Developer connects the Nest Gmail’s Google Drive here.'}</p>`}
        ${isSuper() ? (st.secrets === false ? `<div class="notice">The Google keys aren’t set on the nest-records function yet. Add <b>GOOGLE_CLIENT_ID</b> and <b>GOOGLE_CLIENT_SECRET</b> as function secrets in Supabase (see the 3.0.12 install steps), then come back here.</div>`
          : `<div class="actionrow"><button class="btn ${st.connected ? '' : 'tagbtn'}" id="rs-conn">${ico('folder')}${st.connected ? 'Connect again' : 'Connect Google Drive'}</button>${st.connected ? '<span class="muted small">Only if Nest says the connection has stopped working.</span>' : ''}</div>`) : ''}</div></section>
      <section class="panel"><header><h2>Document types</h2><span class="meta">${plural(types.length, 'type')}</span></header><div class="body">
        <p class="muted small">The list people choose from when they tag a document. One per line. Renaming a type here doesn’t change documents already tagged.</p>
        <form id="rs-types"><textarea name="types" rows="${Math.max(6, types.length + 1)}">${esc(types.join('\n'))}</textarea><div class="acc-save"><button class="btn primary" type="submit">Save types</button></div></form></div></section>
      ${isSuper() ? `<section class="panel"><header><h2>Uploads</h2></header><div class="body"><form id="rs-up">
        <div class="row2"><label class="f">Largest document (MB)<input type="number" name="max_mb" min="1" max="2000" value="${esc(cfg.max_mb || 300)}"></label>
        <label class="f">Function address<input name="function_url" value="${esc(cfg.function_url || '')}"><span class="hint">Used by the nightly clear-out of the recycle bin.</span></label></div>
        <div class="acc-save"><button class="btn primary" type="submit">Save</button></div></form></div></section>` : ''}`;
  },
  bind(main) {
    const c = $('#rs-conn', main); if (c) c.onclick = async () => {
      try { const r = await recFn({ action: 'connect', return: location.href.split('#')[0] }); location.href = r.url; } catch (e) { toast(niceError(e), true); } };
    const t = $('#rs-types', main); if (t) t.onsubmit = async e => { e.preventDefault();
      try { await q(sb.rpc('rec_settings_save', { p: { types: t.types.value.split('\n').map(x => x.trim()).filter(Boolean) } })); toast('Types saved'); render({ quiet: true }); } catch (er) { toast(niceError(er), true); } };
    const u = $('#rs-up', main); if (u) u.onsubmit = async e => { e.preventDefault();
      try { await q(sb.rpc('rec_settings_save', { p: { max_mb: +u.max_mb.value, function_url: u.function_url.value } })); toast('Saved'); await loadLookups().catch(() => { }); render({ quiet: true }); } catch (er) { toast(niceError(er), true); } };
    // the address keeps ?drive=… only for the first look
    if (location.hash.includes('?drive=')) history.replaceState(null, '', '#/rec/settings');
  }
};
