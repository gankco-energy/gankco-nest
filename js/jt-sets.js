// ================================================================ 3.0.15 JOBTRACK ITEM SETS AND THE TICK LIST
// A set is a saved, named list of ticket items with quantities. It only fills a job's ticket items: it never touches Inventory.
// JobTrack admins make and change sets; everyone in JobTrack can use them. Adding a set never removes anything and skips
// items the job already has (the job's quantity stays).
'use strict';

const jtSetsList = () => S.jt.sets || [];
const jtKey = s => String(s || '').trim().toLowerCase();
// is this line already in the list (the same ticket item, or the same wording)?
const jtHasLine = (rows, r) => rows.some(x => (r.cat_id && x.cat_id === r.cat_id) || jtKey(x.description) === jtKey(r.description));
// a day item needs its equipment group on the job (groups null: any group, as in a set)
const jtNeedsGroup = (r, groups) => !!groups && r.rule === 'days' && !(r.grp && groups.includes(r.grp));
const jtLineFromCat = (i, qty = 1) => ({ cat_id: i.id, inv_item: i.inv_item || null, section: i.section, description: i.description, unit: i.unit, rule: i.rule, grp: i.grp, mode: i.mode || 'normal', qty, is_new: false });
const jtSetGroups = s => [...new Set((s.items || []).filter(i => i.rule === 'days' && i.grp).map(i => i.grp))];

// what adding a set did, in one sentence
function jtSetSummary(r) {
  const extra = [r.already ? `${plural(r.already, 'item')} already on the job` : '', r.no_group ? `${plural(r.no_group, 'day item')} left out (equipment group not on this job)` : '',
    r.hidden ? `${plural(r.hidden, 'item')} no longer on the ticket items list` : ''].filter(Boolean);
  return `Added ${plural(r.items, 'item')} from “${r.set}”${extra.length ? '. Skipped: ' + extra.join('; ') : ''}.`;
}

// a set's lines as they'd go on a job today: ticket items take the list's current wording and counting
function jtSetLines(s) {
  const out = []; let hidden = 0;
  for (const x of s.items || []) {
    const c = x.cat_id ? S.jt.items.find(i => i.id === +x.cat_id) : null;
    if (c && !c.active) { hidden++; continue; }
    out.push(c ? jtLineFromCat(c, x.qty ?? 1) : { cat_id: null, inv_item: x.inv_item || null, section: x.section, description: x.description, unit: x.unit, rule: x.rule, grp: x.grp, mode: x.mode || 'normal', qty: x.qty ?? 1, is_new: true });
  }
  return { lines: out, hidden };
}

// ---------------------------------------------------------------- the item chooser (Choose items, and a set's own list)
// ctx: { rows (changed in place), groups (the job's groups, or null for a set), j (the job, for the Inventory search), setBar, saveSet, skipSet }
function jtSetBarHtml(ctx) {
  const sets = jtSetsList().filter(s => s.id !== ctx.skipSet);
  return !ctx.setBar ? '' : sets.length
    ? `<div class="jt-setbar">${ico('kit')}<span>Add a set</span><select id="jt-setpick"><option value="">Choose a set…</option>${sets.map(s => opt(s.id, `${s.name} (${plural((s.items || []).length, 'item')})`, '')).join('')}</select>
        <button type="button" class="btn small" id="jt-setadd">Add set</button></div><div id="jt-setmsg" class="jt-setmsg" hidden></div>`
    : jtAdmin() && ctx.saveSet ? `<div class="jt-setbar muted">${ico('kit')}<span>No item sets yet. Choose the items below, then press <b>Save as a set</b> to reuse them on the next job.</span></div><div id="jt-setmsg" class="jt-setmsg" hidden></div>` : '';
}
function jtItemsEdHtml(ctx) {
  return `<div id="jt-setbarw">${jtSetBarHtml(ctx)}</div><div class="jt-jihead"><b id="jt-jicount"></b>${ctx.saveSet && jtAdmin() ? `<button type="button" class="btn small" id="jt-saveset">${ico('kit')}Save as a set</button>` : ''}</div>
    <div id="jt-ji" class="jt-ji"></div>
    <div class="jt-addhead"><span class="pjf-sec">Add</span><div class="seg" id="jt-addmode" role="group" aria-label="How to add"><button type="button" data-m="tick">Tick list</button><button type="button" data-m="search">Search</button></div></div>
    <div id="jt-tick"><input type="search" id="jt-tkq" placeholder="Filter the list (crane, nitrogen, feeding)" autocomplete="off"><div id="jt-tklist" class="jt-tklist"></div>
      <div class="jt-tkfoot"><span id="jt-tkn" class="muted"></span><button type="button" class="btn small primary" id="jt-tkadd">${ico('plus')}Add ticked</button></div></div>
    <div id="jt-srch" hidden>${jtPickerHtml('jt-jip')}<p class="hint">Also finds Inventory items, and anything not on the list can be typed in.</p></div>`;
}

function jtBindItemsEd(d, ctx) {
  const rows = ctx.rows, groups = ctx.groups;
  const tick = new Map(); const open = new Set(); let filt = '';
  const msg = t => { const m = $('#jt-setmsg', d); if (m) { m.textContent = t || ''; m.hidden = !t; } };

  const drawRows = () => {
    const box = $('#jt-ji', d);
    box.innerHTML = rows.length ? Object.keys(JT_SEC).map(k => { const a = rows.map((r, i) => [r, i]).filter(([r]) => r.section === k); return a.length ? `<div class="jt-sec">${esc(JT_SEC[k])}</div>${a.map(([r, i]) => `<div class="jt-jirow">
        <div class="jt-jid"><b>${esc(r.description)}</b>${r.is_new || !r.cat_id ? ' ' + chip('soon', 'New') : ''}<div class="sub">${esc(jtRuleText(r))}${jtNeedsGroup(r, groups) ? ` · <span class="jt-warn">the ${esc(r.grp || '—')} group isn’t on this job</span>` : ''}</div></div>
        <label class="jt-q">Qty<input type="number" min="0" step="any" value="${esc(r.qty ?? 1)}" data-qty="${i}"></label>
        <button type="button" class="btn small" data-jirm="${i}" title="Remove" aria-label="Remove ${esc(r.description)}">${ico('trash')}</button></div>`).join('')}` : ''; }).join('')
      : `<div class="empty">Nothing chosen yet. ${ctx.setBar && jtSetsList().length ? 'Add a set, or tick' : 'Tick'} items below.</div>`;
    $$('[data-qty]', d).forEach(x => x.oninput = () => { rows[+x.dataset.qty].qty = x.value; });
    $$('[data-jirm]', d).forEach(b => b.onclick = () => { rows.splice(+b.dataset.jirm, 1); drawAll(); });
    $('#jt-jicount', d).textContent = plural(rows.length, 'item');
  };

  const drawTick = () => {
    const words = jtKey(filt).split(/\s+/).filter(Boolean);
    const items = S.jt.items.filter(i => i.active && (!words.length || words.every(w => (i.description + ' ' + (i.aliases || []).join(' ')).toLowerCase().includes(w))));
    const list = $('#jt-tklist', d);
    list.innerHTML = items.length ? Object.keys(JT_SEC).map(k => {
      const a = items.filter(i => i.section === k); if (!a.length) return '';
      const nOn = a.filter(i => jtHasLine(rows, i)).length;
      return `<details class="jt-tksec" data-sec="${k}" ${words.length || open.has(k) ? 'open' : ''}><summary><span>${esc(JT_SEC[k])}</span><span class="sub">${a.length}${nOn ? ` · ${nOn} chosen` : ''}</span></summary>
        ${a.map(i => { const on = jtHasLine(rows, i), blk = !on && jtNeedsGroup(i, groups), t = tick.has(i.id);
          return `<div class="jt-tk${on ? ' on' : ''}${blk ? ' blk' : ''}${t ? ' t' : ''}"><label><input type="checkbox" data-tk="${i.id}" ${on || t ? 'checked' : ''} ${on || blk ? 'disabled' : ''}>
            <span class="jt-jid"><b>${esc(i.description)}</b><span class="sub">${on ? 'Already chosen' : blk ? `Needs the ${esc(i.grp || '—')} group, which isn’t on this job` : esc(jtRuleText(i)) + (i.unit ? ' · per ' + esc(i.unit) : '')}</span></span></label>
            ${on || blk ? '' : `<input type="number" min="0" step="any" class="jt-tkqty" data-tq="${i.id}" value="${esc(tick.get(i.id) ?? 1)}" aria-label="Quantity">`}</div>`; }).join('')}</details>`;
    }).join('') : '<div class="empty">Nothing on the list matches. Try Search: it also finds Inventory items, and lets you type a line in.</div>';
    $$('details.jt-tksec', list).forEach(s => s.ontoggle = () => { if (words.length) return; s.open ? open.add(s.dataset.sec) : open.delete(s.dataset.sec); });
    $$('[data-tk]', list).forEach(c => c.onchange = () => { const id = +c.dataset.tk; if (c.checked) tick.set(id, +($(`[data-tq="${id}"]`, list)?.value) || 1); else tick.delete(id); drawTick(); });
    $$('[data-tq]', list).forEach(x => x.oninput = () => { const id = +x.dataset.tq; tick.set(id, x.value); const c = $(`[data-tk="${id}"]`, list); if (c && !c.checked) { c.checked = true; c.closest('.jt-tk').classList.add('t'); } countTick(); });
    countTick();
  };
  const countTick = () => {
    $('#jt-tkn', d).textContent = tick.size ? `${plural(tick.size, 'item')} ticked` : 'Tick the items you need, then add them together.';
    // each section's "n ticked" badge, kept right without redrawing (so typing a quantity keeps its focus)
    $$('details.jt-tksec', d).forEach(s => { const n = $$('[data-tk]', s).filter(c => tick.has(+c.dataset.tk)).length; let bd = $('.jt-tkbadge', s);
      if (!n) { if (bd) bd.remove(); return; } if (!bd) { bd = document.createElement('span'); bd.className = 'jt-tkbadge'; $('summary', s).appendChild(bd); } bd.textContent = n + ' ticked'; });
  };
  const drawAll = () => { drawRows(); drawTick(); };

  // tick list ↔ search
  const mode = m => { S.jt.addMode = m; $$('#jt-addmode button', d).forEach(b => b.classList.toggle('on', b.dataset.m === m)); $('#jt-tick', d).hidden = m !== 'tick'; $('#jt-srch', d).hidden = m !== 'search';
    const f = m === 'tick' ? $('#jt-tkq', d) : $('#jt-jip .jt-pq', d); if (f && d.open) f.focus({ preventScroll: true }); };
  $$('#jt-addmode button', d).forEach(b => b.onclick = () => mode(b.dataset.m));
  const tq = $('#jt-tkq', d);
  tq.oninput = debounce(() => { filt = tq.value; drawTick(); }, 150);
  tq.onkeydown = e => { if (e.key === 'Enter') e.preventDefault(); };
  $('#jt-tkadd', d).onclick = () => {
    if (!tick.size) { $('#jt-tkn', d).innerHTML = '<span class="jt-warn">Tick at least one item first.</span>'; return; }
    let n = 0;
    for (const [id, qv] of tick) { const i = S.jt.items.find(x => x.id === id); if (!i || jtHasLine(rows, i)) continue; rows.push(jtLineFromCat(i, qv === '' || qv == null ? 1 : +qv)); n++; }
    tick.clear(); msg(''); drawAll();
    $('#jt-tkn', d).textContent = `Added ${plural(n, 'item')}. They’re in the list above.`;
  };

  // search (the ticket items list, Inventory, or typed in)
  jtBindPicker(d, 'jt-jip', ctx.j || { groups: groups || jtGroups() }, item => {
    const r = { cat_id: item.cat_id || null, inv_item: item.inv_item || null, section: item.section, description: item.description, unit: item.unit, rule: item.rule, grp: item.grp, mode: item.mode || 'normal', qty: item.qty ?? 1, is_new: !item.cat_id };
    if (jtHasLine(rows, r)) { toast(`“${r.description}” is already chosen`, true); return; }
    rows.push(r); drawAll();
  });

  // add a whole set
  const bindBar = () => { const add = $('#jt-setadd', d);
  if (add) add.onclick = () => {
    const s = jtSetsList().find(x => x.id === +$('#jt-setpick', d).value);
    if (!s) return msg('Choose a set first.');
    const { lines, hidden } = jtSetLines(s); let items = 0, already = 0, noGrp = 0;
    for (const r of lines) { if (jtHasLine(rows, r)) { already++; continue; } if (jtNeedsGroup(r, groups)) { noGrp++; continue; } rows.push(r); items++; }
    msg(jtSetSummary({ items, already, no_group: noGrp, hidden, set: s.name }) + (items ? ' Check the quantities, then save.' : ''));
    $('#jt-setpick', d).value = ''; drawAll();
  }; };
  bindBar();

  // save what's chosen as a set (admins)
  const sv = $('#jt-saveset', d);
  if (sv) sv.onclick = async () => {
    if (!rows.length) return toast('Choose some items first', true);
    const r = await jtSaveAsSetForm(rows);
    if (r) { $('#jt-setbarw', d).innerHTML = jtSetBarHtml(ctx); bindBar(); msg(`Saved as the set “${r}”. Other jobs can add it now.`); }
  };

  mode(S.jt.addMode || 'tick'); drawAll();
  return { draw: drawAll };
}

const jtSetRows = rows => rows.map(r => ({ cat_id: r.cat_id || null, inv_item: r.inv_item || null, section: r.section, description: r.description, unit: r.unit, rule: r.rule, grp: r.grp, mode: r.mode, qty: r.qty === '' ? 1 : r.qty }));

async function jtLoadSets() { try { S.jt.sets = await q(sb.from('jt_item_sets').select('*').order('name')); } catch (e) { S.jt.sets = S.jt.sets || []; } return S.jt.sets; }

// "Save as a set": a new set, or replace the items of one already saved
async function jtSaveAsSetForm(rows) {
  const sets = jtSetsList();
  return modal({ title: 'Save as a set', submit: 'Save set', sub: `Keeps these ${plural(rows.length, 'item')} and their quantities, to add to other jobs in one go. A set is only a list: it doesn’t touch Inventory.`,
    body: `<label class="check"><input type="radio" name="how" value="new" checked> A new set</label>
      <label class="f" id="ss-new">Name<input name="name" maxlength="80" placeholder="TTSHO 2-3/8&quot; standard"></label>
      ${sets.length ? `<label class="check"><input type="radio" name="how" value="old"> Replace the items of a set</label>
      <label class="f" id="ss-old" hidden>Set<select name="set_id">${sets.map(s => opt(s.id, `${s.name} (${plural((s.items || []).length, 'item')})`, '')).join('')}</select><span class="hint">Its items become exactly this list. Jobs that already used it don’t change.</span></label>` : ''}`,
    onOpen: d => { $$('[name=how]', d).forEach(r => r.onchange = () => { const o = $('[name=how]:checked', d).value === 'old'; $('#ss-new', d).hidden = o; const s = $('#ss-old', d); if (s) s.hidden = !o; }); },
    onSubmit: async x => {
      const how = x.how || 'new';
      let p;
      if (how === 'old') { const s = sets.find(y => y.id === +x.set_id); if (!s) throw new Error('Choose the set.'); p = { id: s.id, name: s.name, note: s.note, items: jtSetRows(rows) }; }
      else { if (!x.name?.trim()) throw new Error('Give the set a name.'); p = { name: x.name.trim(), items: jtSetRows(rows) }; }
      await q(sb.rpc('jt_set_save', { p })); await jtLoadSets(); return p.name;
    } });
}

// ---------------------------------------------------------------- Setup → Item sets (admins)
const jtSetsPage = {
  async load() {
    await jtLoad(true);
    if (!jtAdmin() && !isSuper()) return topbar('Item sets') + '<div class="notice">Only JobTrack admins make item sets. Everyone can add them to a job in <b>Choose items</b>.</div>';
    const sets = await jtLoadSets();
    return topbar('Item sets', 'Saved lists of ticket items with their quantities. A job adds one in <b>Choose items</b>, or a new job starts from one. Sets are only lists: they don’t touch Inventory.', `<button class="btn tagbtn" id="set-new">${ico('plus')}New set</button>`) +
      `<section class="panel">${sets.length ? `<ul class="list">${sets.map(s => { const g = jtSetGroups(s); const hid = (s.items || []).filter(x => x.cat_id && S.jt.items.some(i => i.id === +x.cat_id && !i.active)).length;
        return `<li class="clickrow" data-set="${s.id}"><div style="flex:1;min-width:0"><div class="name">${esc(s.name)}</div>
          <div class="sub">${plural((s.items || []).length, 'item')}${g.length ? ' · equipment groups: ' + esc(g.join(', ')) : ''}${s.note ? ' · ' + esc(s.note) : ''}</div>
          <div class="sub muted">Changed ${esc(fd(s.updated_at))}${s.updated_by_name ? ' by ' + esc(s.updated_by_name) : ''}${hid ? ` · <span class="jt-warn">${plural(hid, 'item')} no longer on the ticket items list</span>` : ''}</div></div>${ico('next')}</li>`; }).join('')}</ul>`
        : `<div class="empty body"><b>Make your first set</b><br>Press <b>New set</b>, or open a job, choose its items and press <b>Save as a set</b>.</div>`}</section>`;
  },
  bind(main) {
    $('#set-new', main)?.addEventListener('click', () => jtSetForm());
    $$('[data-set]', main).forEach(r => r.onclick = () => jtSetForm(jtSetsList().find(s => s.id === +r.dataset.set)));
  }
};

async function jtSetForm(s) {
  await jtLoad();
  const ctx = { rows: s ? jtSetLines(s).lines : [], groups: null, setBar: true, saveSet: false, skipSet: s?.id };
  const hidden = s ? jtSetLines(s).hidden : 0;
  return modal({ title: s ? s.name : 'New item set', wide: true, submit: 'Save set',
    sub: 'The items and quantities a job gets when this set is added. Items already on a job are skipped, and day items only go on jobs that have their equipment group.',
    body: `<div class="row2"><label class="f">Name<input name="name" maxlength="80" value="${esc(s?.name || '')}" placeholder="TTSHO 2-3/8&quot; standard" required></label>
        <label class="f">Note<input name="note" value="${esc(s?.note || '')}" placeholder="When to use it (optional)"></label></div>
      ${hidden ? `<div class="notice">${plural(hidden, 'item')} in this set ${hidden === 1 ? 'is' : 'are'} no longer on the ticket items list, so ${hidden === 1 ? 'it was' : 'they were'} left out. Saving drops ${hidden === 1 ? 'it' : 'them'} from the set.</div>` : ''}
      ${jtItemsEdHtml(ctx)}
      ${s ? `<div class="actionrow"><button type="button" class="btn small danger" id="set-del">${ico('trash')}Delete set</button></div>` : ''}`,
    onOpen: (d, close) => {
      jtBindItemsEd(d, ctx);
      const del = $('#set-del', d); if (del) del.onclick = async () => {
        if (!confirm(`Delete the set “${s.name}”? Jobs that used it keep their items.`)) return;
        try { await q(sb.rpc('jt_set_delete', { p_id: s.id })); await jtLoadSets(); toast('Set deleted'); close(true); render({ quiet: true }); } catch (e) { toast(niceError(e), true); }
      };
    },
    onSubmit: async x => {
      if (!ctx.rows.length) throw new Error('Add at least one item to the set.');
      await q(sb.rpc('jt_set_save', { p: { id: s?.id || null, name: x.name, note: x.note, items: jtSetRows(ctx.rows) } }));
      await jtLoadSets(); toast(s ? 'Set saved' : 'Set made'); render({ quiet: true });
    } });
}
