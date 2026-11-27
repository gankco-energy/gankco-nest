// ================================================================ 3.0.16 BOXES: items that hold other items
// A hand toolbox, a truck or a unit holds other inventory items. They stay ordinary items with their own stock;
// Nest works out how many are inside a box that's in the store (held for the box) and how many are loose.
// A box on a materials request brings its contents as lines of their own (job_lines.box_line_id).
'use strict';

async function boxLoad(force = false) {
  if (!S.box || force) S.box = await q(sb.from('item_contents').select('box_id,item_id,qty,sort').order('sort')).catch(() => []);
  return S.box;
}
const boxRows = () => S.box || [];
const boxContents = id => boxRows().filter(c => c.box_id === id).sort((a, b) => a.sort - b.sort);
const boxesHolding = id => boxRows().filter(c => c.item_id === id);
const isBox = id => boxRows().some(c => c.box_id === id);
const boxItem = id => (S.items || []).find(i => i.id === id);
const boxName = id => boxItem(id)?.name || 'a box';
// boxes of this item on the request (they bring their own contents, so they don't hold anything back from it)
const boxesOnReq = (boxId, loc, lines = []) => lines.filter(l => !l.box_line_id && l.item_id === boxId && l.location_id === +loc).reduce((a, l) => a + +l.qty, 0);
// how many of an item at a location are inside boxes that stay in the store
function boxReserved(itemId, loc, lines = []) {
  return boxesHolding(itemId).reduce((a, c) => a + +c.qty * Math.max(0, stockOf(c.box_id, loc) - boxesOnReq(c.box_id, loc, lines)), 0);
}
const looseOf = (itemId, loc, lines = []) => Math.max(0, stockOf(itemId, loc) - boxReserved(itemId, loc, lines));
// where a box is in the store (its first location with stock), or null when it's out
const boxHome = id => (S.stock || []).find(s => s.item_id === id && s.status === 'available' && +s.qty > 0)?.location_id ?? null;
// what a box in the store is short of
function boxShort(id) {
  const loc = boxHome(id); if (loc == null) return [];
  const n = stockOf(id, loc);
  return boxContents(id).map(c => ({ c, need: +c.qty * n, have: stockOf(c.item_id, loc) })).filter(x => x.have < x.need).map(x => ({ ...x, short: x.need - x.have }));
}
// "2 inside Tool Box" for an item in a box
function boxInsideText(itemId, loc, lines = []) {
  const r = boxReserved(itemId, loc, lines); if (!r) return '';
  return `${fq(r)} inside ${[...new Set(boxesHolding(itemId).filter(c => stockOf(c.box_id, loc) > 0).map(c => boxName(c.box_id)))].join(', ')}`;
}

// ---------------------------------------------------------------- the item page
function boxPanelsHtml(it, adm) {
  const cs = boxContents(it.id), holds = boxesHolding(it.id);
  let h = '';
  if (cs.length) {
    const home = boxHome(it.id), short = boxShort(it.id);
    h += `<section class="panel boxp"><header><h2>${ico('box')}What’s inside</h2><span class="meta">${plural(cs.length, 'item')}${home == null ? ' · the box is out on a job' : short.length ? ` · ${chip('soon', 'Short of ' + plural(short.length, 'item'))}` : ` · ${chip('ok', 'Complete')}`}</span>
      ${adm ? `<div class="right"><button class="btn small" id="box-edit">${ico('edit')}Change contents</button></div>` : ''}</header>
      <div class="tablewrap"><table class="t stack"><thead><tr><th>Item</th><th class="num">In the box</th><th class="num">${home == null ? 'In store now' : 'In store at ' + esc(locName(home))}</th></tr></thead><tbody>
      ${cs.map(c => { const i = boxItem(c.item_id); const s = short.find(x => x.c.item_id === c.item_id);
        return `<tr><td class="full"><a href="#/item/${c.item_id}" class="plain">${tag(i?.code)} <span class="name">${esc(i?.name || 'Item')}</span></a></td><td class="num"><b>${fq(c.qty)}</b></td>
          <td class="num">${home == null ? fq(i?.qty_available || 0) : s ? chip('soon', `Short ${fq(s.short)}`) + ` <span class="sub">${fq(s.have)} here</span>` : fq(stockOf(c.item_id, home))}</td></tr>`; }).join('')}
      </tbody></table></div>
      <div class="body muted small">${short.length ? 'Short items were used up or haven’t come back. Restock them so the box is complete for the next job. ' : ''}Put the box on a <b>materials request</b> and everything inside goes with it. Check out on this page moves the box only.</div></section>`;
  }
  if (holds.length) {
    h += `<section class="panel boxp"><header><h2>${ico('box')}In ${holds.length === 1 ? 'a box' : 'boxes'}</h2></header><ul class="list">${holds.map(c => { const loc = boxHome(c.box_id);
      return `<li><div style="flex:1;min-width:0"><div class="name"><a href="#/item/${c.box_id}">${esc(boxName(c.box_id))}</a> holds ${fq(c.qty)}</div>
        <div class="sub">${loc == null ? 'The box is out on a job' : `${fq(Math.min(+c.qty * stockOf(c.box_id, loc), stockOf(it.id, loc)))} inside it at ${esc(locName(loc))} · ${fq(looseOf(it.id, loc))} loose there`}</div></div></li>`; }).join('')}</ul>
      <div class="body muted small">What’s inside a box in the store stays with the box: only loose ones can go on a request on their own.</div></section>`;
  }
  return h;
}
function bindBoxPanels(main, it) {
  const e = $('#box-edit', main); if (e) e.onclick = () => boxEditForm(it);
  const a = $('#box-make', main); if (a) a.onclick = () => boxEditForm(it);
}

// ---------------------------------------------------------------- change a box's contents (the box's service line admins)
async function boxEditForm(box) {
  await Promise.all([items(), boxLoad(true), stockRows()]);
  const rows = boxContents(box.id).map(c => ({ item_id: c.item_id, qty: +c.qty }));
  const fresh = new Set();   // just added: highlighted and scrolled into view
  const draw = d => {
    const t = $('#bx-rows', d);
    t.innerHTML = rows.length ? `<table class="t"><thead><tr><th>Item</th><th class="num">How many in the box</th><th></th></tr></thead><tbody>${rows.map((r, k) => { const i = boxItem(r.item_id);
      const others = boxesHolding(r.item_id).filter(c => c.box_id !== box.id), need = others.reduce((a, c) => a + +c.qty, 0) + (+r.qty || 0), have = (+i?.qty_available || 0) + (+i?.qty_out || 0);
      const warn = others.length && need > have ? `<div class="bx-warn">Also in ${esc(others.map(c => boxName(c.box_id)).join(', '))}: the boxes need ${fq(need)}, GANKCO has ${fq(have)}. Both boxes on one request would ask for it twice.</div>` : '';
      return `<tr class="${fresh.has(r.item_id) ? 'bx-new' : ''}"><td>${tag(i?.code)} ${esc(i?.name || '')}<div class="sub">${fq(i?.qty_available || 0)} in store${i && i.department_id !== box.department_id ? ' · ' + esc(lineShort(i.department_id)) : ''}${others.length && !warn ? ' · also in ' + esc(others.map(c => boxName(c.box_id)).join(', ')) : ''}</div>${warn}</td>
        <td class="num"><input type="number" min="0" step="any" value="${esc(r.qty)}" data-bq="${k}" style="width:84px" aria-label="How many ${esc(i?.name || '')}"></td>
        <td class="num"><button type="button" class="btn small link danger" data-brm="${k}">Take out</button></td></tr>`; }).join('')}</tbody></table>`
      : '<div class="empty">Nothing inside yet. Search below and add what lives in this box.</div>';
    $$('[data-bq]', t).forEach(x => { x.oninput = () => { rows[+x.dataset.bq].qty = x.value; }; x.onchange = () => draw(d); });
    $$('[data-brm]', t).forEach(b => b.onclick = () => { rows.splice(+b.dataset.brm, 1); draw(d); });
    $('#bx-n', d).textContent = plural(rows.length, 'item');
    const nw = $('tr.bx-new', t); if (nw) { nw.scrollIntoView({ block: 'nearest' }); setTimeout(() => { fresh.clear(); $$('tr.bx-new', t).forEach(x => x.classList.remove('bx-new')); }, 2500); }
  };
  return modal({ title: `What’s inside: ${box.name}`, wide: true, submit: 'Save contents',
    sub: 'The items that live in this box and how many of each. They go with the box on every materials request. They stay as items of their own in Inventory.',
    body: `<div class="jt-jihead"><b id="bx-n"></b></div><div id="bx-rows" class="jt-ji"></div>
      <div class="pjf-sec">Add</div><input type="search" id="bx-q" placeholder="Search code or description, or scan a label" autocomplete="off"><div id="bx-res" class="pickres"></div>`,
    onOpen: d => {
      draw(d);
      const qi = $('#bx-q', d), res = $('#bx-res', d);
      // 3.0.16b: an item comes in with how many are in the store now (1 when there are none, so the box shows it as short)
      const startQty = i => +i.qty_available > 0 ? +i.qty_available : 1;
      const take = i => { if (i && !rows.some(r => r.item_id === i.id)) { rows.push({ item_id: i.id, qty: startQty(i) }); fresh.add(i.id); return 1; } return 0; };
      const tick = new Set();
      const add = i => { take(i); draw(d); qi.value = ''; res.innerHTML = ''; qi.focus(); };
      const search = () => {
        const t = qi.value.trim().toLowerCase(); if (!t) { res.innerHTML = ''; tick.clear(); return; }
        const exact = matchCode(t); if (exact.length === 1 && t.length > 6 && exact[0].id !== box.id && !isBox(exact[0].id) && !rows.some(r => r.item_id === exact[0].id)) { add(exact[0]); return; }
        const all = S.items.filter(i => i.active && i.id !== box.id && `${i.code || ''} ${i.name}`.toLowerCase().includes(t));
        const hits = all.slice(0, 200), free = hits.filter(i => !isBox(i.id) && !rows.some(r => r.item_id === i.id));
        [...tick].forEach(id => { if (!free.some(i => i.id === id)) tick.delete(id); });
        res.innerHTML = hits.length ? `<div class="bx-bar"><label class="check inline"><input type="checkbox" id="bx-all" ${free.length && free.every(i => tick.has(i.id)) ? 'checked' : ''} ${free.length ? '' : 'disabled'}> Select all${free.length ? ` (${free.length})` : ''}</label>
            <span class="muted">${all.length > 200 ? `First 200 of ${all.length}: type more to narrow it` : plural(hits.length, 'match', 'matches')}</span>
            <button type="button" class="btn small primary" id="bx-addt">${ico('plus')}Add ticked${tick.size ? ` (${tick.size})` : ''}</button></div>`
          + hits.map(i => { const bx = isBox(i.id), on = rows.some(r => r.item_id === i.id), other = boxesHolding(i.id).filter(c => c.box_id !== box.id);
          return `<div class="bx-hit${bx || on ? ' off' : ''}${tick.has(i.id) ? ' t' : ''}"><input type="checkbox" data-tk="${i.id}" ${tick.has(i.id) || on ? 'checked' : ''} ${bx || on ? 'disabled' : ''} aria-label="Tick ${esc(i.name)}">
            <button type="button" class="pick" data-id="${i.id}" ${bx || on ? 'disabled' : ''} title="Add just this one">${tag(i.code)} <span>${esc(i.name)}</span>
            <span class="sub">${bx ? 'This is a box itself' : on ? 'Already in this box' : `${fq(i.qty_available)} in store${other.length ? ' · also in ' + other.map(c => esc(boxName(c.box_id))).join(', ') : ''}`}</span></button></div>`; }).join('') : '<div class="empty">No match.</div>';
        $$('[data-id]:not([disabled])', res).forEach(x => x.onclick = () => { take(S.items.find(i => i.id === +x.dataset.id)); tick.delete(+x.dataset.id); draw(d); search(); });
        $$('[data-tk]:not([disabled])', res).forEach(c => c.onchange = () => { c.checked ? tick.add(+c.dataset.tk) : tick.delete(+c.dataset.tk); search(); });
        const sa = $('#bx-all', res); if (sa) sa.onchange = () => { free.forEach(i => sa.checked ? tick.add(i.id) : tick.delete(i.id)); search(); };
        const at = $('#bx-addt', res); if (at) at.onclick = () => {
          if (!tick.size) { at.textContent = 'Tick some items first'; return; }
          let n = 0; [...tick].forEach(id => { n += take(S.items.find(i => i.id === id)); }); tick.clear(); draw(d); search();
          toast(`Added ${plural(n, 'item')}. Check the quantities, then save.`);
        };
      };
      qi.oninput = debounce(search, 150);
      qi.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); search(); } };
    },
    onSubmit: async () => {
      for (const r of rows) if (!(+r.qty > 0)) throw new Error(`Enter how many ${boxItem(r.item_id)?.name || 'of each item'} go in the box, or take it out.`);
      if (!rows.length && !confirm(`Empty ${box.name}? It goes back to being an ordinary item.`)) throw Object.assign(new Error(''), { quiet: true });
      const n = await q(sb.rpc('box_contents_set', { p_box: box.id, p_rows: rows.map(r => ({ item_id: r.item_id, qty: +r.qty })) }));
      await boxLoad(true); toast(n ? `Saved: ${plural(n, 'item')} inside` : 'Box emptied'); render({ quiet: true });
    } });
}

// ---------------------------------------------------------------- materials requests
// the request's lines in order: each box line followed by the lines inside it
function boxOrder(ls) {
  const out = [];
  ls.forEach(l => { if (l.box_line_id && ls.some(b => b.id === l.box_line_id)) return; out.push(l); if (!l.box_line_id) ls.filter(x => x.box_line_id === l.id).forEach(x => out.push(x)); });
  return out;
}
// the box's contents that aren't on the request (unticked, or added to the box since)
function boxNotPacked(boxLine, lines) {
  return boxContents(boxLine.item_id).filter(c => !lines.some(l => l.box_line_id === boxLine.id && l.item_id === c.item_id));
}
// pack or unpack one item of a box on a draft
async function boxPack(j, boxLine, itemId, on) {
  if (on) {
    const c = boxContents(boxLine.item_id).find(x => x.item_id === itemId); if (!c) return;
    await q(sb.from('job_lines').insert({ job_id: j.id, item_id: itemId, location_id: boxLine.location_id, qty: +c.qty * +boxLine.qty, box_line_id: boxLine.id }));
  } else await q(sb.from('job_lines').delete().eq('box_line_id', boxLine.id).eq('item_id', itemId));
}
