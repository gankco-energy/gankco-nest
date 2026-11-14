/* GANKCO Nest 3.0.10 — phone notifications (web push) and notification emails:
   the "Get Nest notifications on this phone" card, My account → Notifications, and Nest settings → Phone and email notifications. */
'use strict';

const PUSH_SNOOZE = 'nest.push.snooze', PUSH_OFF = 'nest.push.off';
const pushOK = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
const isPhone = () => window.matchMedia?.('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
const pushLS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
const deviceLabel = () => {
  const ua = navigator.userAgent; const os = /android/i.test(ua) ? 'Android' : isIOS() ? (/ipad/i.test(ua) ? 'iPad' : 'iPhone') : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux' : 'Device';
  const br = /edg\//i.test(ua) ? 'Edge' : /samsungbrowser/i.test(ua) ? 'Samsung Internet' : /firefox|fxios/i.test(ua) ? 'Firefox' : /crios|chrome/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? (isStandalone() ? 'Home Screen app' : 'Safari') : 'Browser';
  return `${os} · ${br}`;
};
const b64u = s => { const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...b].map(c => c.charCodeAt(0))); };

let pushReg = null;
async function pushRegister() {
  if (!pushOK()) return null;
  if (pushReg) return pushReg;
  try { pushReg = await navigator.serviceWorker.register('sw.js', { scope: './' }); await navigator.serviceWorker.ready; } catch (e) { console.warn('Nest: notifications helper not registered', e); pushReg = null; }
  return pushReg;
}
// the sending key: from Nest, or (the very first time) from the nest-push function, which makes it
async function pushKey() {
  let k = await q(sb.rpc('push_public_key')).catch(() => null);
  if (k) return k;
  const url = setting('push', {})?.function_url; if (!url) throw new Error('Phone notifications aren’t set up yet. Ask the Developer.');
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ init: true }) }).catch(() => null);
  const j = r && r.ok ? await r.json().catch(() => null) : null;
  if (!j?.public_key) throw new Error('Phone notifications aren’t switched on in Supabase yet (the nest-push function). Ask the Developer.');
  return j.public_key;
}
async function pushSave(sub) {
  const j = sub.toJSON();
  await q(sb.rpc('push_device_save', { p: { endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, label: deviceLabel(), ua: navigator.userAgent } }));
}
// switch on for this device (called from a tap: phones only ask with a tap)
async function pushEnable() {
  if (!pushOK()) throw new Error(isIOS() && !isStandalone() ? 'On iPhone, add Nest to your Home Screen first, then open Nest from that icon.' : 'This browser can’t show Nest notifications.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications are blocked for Nest on this device. Allow them in the phone’s settings, then try again.' : 'Notifications weren’t allowed.');
  const reg = await pushRegister(); if (!reg) throw new Error('Nest couldn’t start notifications on this device.');
  const key = await pushKey();
  let sub = await reg.pushManager.getSubscription();
  if (sub && sub.options?.applicationServerKey) {
    const cur = new Uint8Array(sub.options.applicationServerKey), want = b64u(key);
    if (cur.length !== want.length || cur.some((x, i) => x !== want[i])) { await sub.unsubscribe().catch(() => { }); sub = null; }
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(key) });
  await pushSave(sub);
  pushLS(PUSH_OFF, null); pushLS(PUSH_SNOOZE, null);
  return sub;
}
async function pushDisable() {
  pushLS(PUSH_OFF, '1');
  const reg = await pushRegister(); const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) { await q(sb.rpc('push_device_delete', { p_id: 0, p_endpoint: sub.endpoint })).catch(() => { }); await sub.unsubscribe().catch(() => { }); }
}
async function pushState() {
  if (!pushOK()) return { ok: false, reason: isIOS() && !isStandalone() ? 'ios' : 'browser' };
  if (Notification.permission === 'denied') return { ok: true, on: false, blocked: true };
  const reg = await pushRegister(); const sub = reg ? await reg.pushManager.getSubscription() : null;
  return { ok: true, on: !!sub && Notification.permission === 'granted' && !pushLS(PUSH_OFF), sub };
}
// on every start: keep this device linked to whoever is signed in
async function pushSync() {
  if (!pushOK() || Notification.permission !== 'granted' || pushLS(PUSH_OFF)) return;
  try { const reg = await pushRegister(); const sub = reg && await reg.pushManager.getSubscription(); if (sub) await pushSave(sub); else await pushEnable(); } catch (e) { console.warn('Nest: notifications sync', e); }
}
// signing out: this device stops getting your notifications
async function pushForget() {
  try { const reg = pushOK() ? await navigator.serviceWorker.getRegistration() : null; const sub = reg && await reg.pushManager.getSubscription();
    if (sub) await sb.rpc('push_device_delete', { p_id: 0, p_endpoint: sub.endpoint }); } catch (e) { }
}
(() => { const out = sb.auth.signOut.bind(sb.auth); sb.auth.signOut = async (...a) => { await Promise.race([pushForget(), new Promise(r => setTimeout(r, 1500))]); return out(...a); }; })();
// a tapped notification while Nest is open: go to its page
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data?.type === 'nest-open' && e.data.url) { const h = new URL(e.data.url).hash; if (h && h !== location.hash) location.hash = h; } });
// the number on the Nest icon (where the phone supports it)
function pushBadge(n) { try { if (navigator.setAppBadge) (n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => { }); } catch (e) { } }

// ---------------------------------------------------------------- the card on phones, after signing in
function pushCardWanted() {
  if (S.viewAs || !isPhone() || pushLS(PUSH_OFF)) return null;
  const sn = +(pushLS(PUSH_SNOOZE) || 0); if (sn && Date.now() < sn) return null;
  if (pushOK()) return Notification.permission === 'default' ? 'ask' : null;
  return isIOS() && !isStandalone() ? 'ios' : null;
}
function pushCard() {
  const w = pushCardWanted(); if (!w) return '';
  return w === 'ios' ? `<section class="pushcard" id="pushcard"><span class="pc-ico">${ico('bell')}</span><div><b>Get Nest notifications on this iPhone</b>
      <p>Like WhatsApp, on your lock screen. First add Nest to your Home Screen: tap <b>Share</b> <span class="ios-share" aria-hidden="true"></span> at the bottom of Safari, then <b>Add to Home Screen</b>. Open Nest from the new icon and allow notifications.</p>
      <div class="actionrow"><button class="btn small" id="push-later">Got it</button></div></div></section>`
    : `<section class="pushcard" id="pushcard"><span class="pc-ico">${ico('bell')}</span><div><b>Get Nest notifications on this phone</b>
      <p>Approvals, reports sent back, HSE to fill, payslips and everything else in your Nest bell, on your lock screen like WhatsApp. You can turn them off in My account.</p>
      <div class="actionrow"><button class="btn primary small" id="push-yes">Allow</button><button class="btn small" id="push-later">Not now</button></div></div></section>`;
}
function bindPushCard(root) {
  const card = $('#pushcard', root); if (!card) return;
  const later = $('#push-later', card); if (later) later.onclick = () => { pushLS(PUSH_SNOOZE, String(Date.now() + 4 * 864e5)); card.remove(); };
  const yes = $('#push-yes', card); if (yes) yes.onclick = async () => {
    yes.disabled = true;
    try { await pushEnable(); toast('Notifications are on for this phone'); card.remove(); }
    catch (e) { toast(niceError(e), true); yes.disabled = false; if (Notification.permission === 'denied') card.remove(); }
  };
}
function pushBoot() { if (S.viewAs) return; pushRegister().then(() => pushSync()); }

// ---------------------------------------------------------------- My account → Notifications
async function myNotifyPanel() {
  const st = await pushState(); let devs = [];
  try { devs = await q(sb.rpc('push_devices_mine')); } catch (e) { devs = []; }
  const mine = st.sub?.endpoint;
  const here = !st.ok ? `<p class="muted small">${st.reason === 'ios' ? 'On iPhone, notifications work once Nest is on your Home Screen: in Safari tap Share, then Add to Home Screen, and open Nest from that icon.' : 'This browser can’t show notifications. On Android use Chrome; on iPhone add Nest to your Home Screen.'}</p>`
    : st.blocked ? `<p class="muted small">Notifications are blocked for Nest in this browser. Allow them in the phone or browser settings for this site, then come back here.</p>`
    : `<label class="switch pc-sw"><input type="checkbox" id="np-dev" ${st.on ? 'checked' : ''}><span class="sw"></span><span><b>Notifications on this ${isPhone() ? 'phone' : 'device'}</b><span class="sub muted">Everything that rings your Nest bell, as it happens.</span></span></label>`;
  return `<section class="panel" id="notify"><header><h2>Notifications</h2>${S.profile.notify_email !== false || st.on ? chip('ok', 'On') : chip('muted', 'Off')}</header><div class="body">
    <p class="muted">Everything that rings your Nest bell, in every app, can also reach you by email and on your phone.</p>
    <label class="switch pc-sw"><input type="checkbox" id="np-mail" ${S.profile.notify_email !== false ? 'checked' : ''}><span class="sw"></span><span><b>Email me my Nest notifications</b><span class="sub muted">One email every 15 minutes at most, listing what’s new, to ${esc(S.profile.email)}.</span></span></label>
    <div class="mt">${here}</div>
    ${devs.length ? `<div class="np-devs"><div class="np-h">Your devices</div>${devs.map(d => `<div class="np-dev"><div><b>${esc(d.label || 'Device')}</b>${d.endpoint === mine ? ' ' + chip('out', 'This device') : ''}<div class="sub">Added ${fd(d.created_at)}${d.last_push_at ? ' · last notification ' + fdt(d.last_push_at) : ''}</div></div>
      <button class="btn small" type="button" data-npdel="${d.id}">Remove</button></div>`).join('')}</div>` : ''}
    <div class="actionrow mt"><button class="btn small" type="button" id="np-test">${ico('bell')}Send me a test</button></div></div></section>`;
}
function bindMyNotify(main) {
  const box = $('#notify', main); if (!box) return;
  const m = $('#np-mail', box); if (m) m.onchange = async () => { try { await q(sb.rpc('set_notify_email', { p_on: m.checked })); S.profile.notify_email = m.checked; toast(m.checked ? 'Notification emails on' : 'Notification emails off'); } catch (e) { m.checked = !m.checked; toast(niceError(e), true); } };
  const d = $('#np-dev', box); if (d) d.onchange = async () => {
    d.disabled = true;
    try { if (d.checked) { await pushEnable(); toast('Notifications are on for this device'); } else { await pushDisable(); toast('Notifications are off for this device'); } render({ quiet: true }); }
    catch (e) { d.checked = !d.checked; toast(niceError(e), true); } finally { d.disabled = false; }
  };
  $$('[data-npdel]', box).forEach(b => b.onclick = async () => { try { await q(sb.rpc('push_device_delete', { p_id: +b.dataset.npdel })); toast('Device removed'); render({ quiet: true }); } catch (e) { toast(niceError(e), true); } });
  const t = $('#np-test', box); if (t) t.onclick = async () => {
    try { const r = await q(sb.rpc('notify_test'));
      toast(r.devices ? `Test sent to ${plural(r.devices, 'device')}${r.email ? '. The email follows within 15 minutes.' : '.'}` : r.email ? 'No device has notifications on yet. A test email follows within 15 minutes.' : 'Switch on email or notifications on this device first.'); }
    catch (e) { toast(niceError(e), true); }
  };
}

// ---------------------------------------------------------------- Nest settings → Phone and email notifications (Developer)
async function notifyAdminPanel() {
  let s = null; try { s = await q(sb.rpc('notify_status')); } catch (e) { s = null; }
  if (!s) return '';
  const m = s.mail || {}, p = s.push || {};
  return `<section class="panel" id="notifyadm"><header><h2>Phone and email notifications</h2>${m.on === false && p.on === false ? chip('muted', 'Off') : chip('ok', `${s.sent_today} of ${s.allowance} emails today`)}</header><div class="body">
    <p class="muted">Every bell notification, in every app, also goes to people’s phones as it happens, and by email: one email per person every 15 minutes at most, listing what’s new. Everyone can turn either off in My account. Inventory’s reminders go out as one morning summary at 07:30.</p>
    <div class="board b4 mt"><div class="kpi"><div class="n">${s.sent_today}</div><div class="l">Emails sent today</div></div><div class="kpi ${s.waiting ? 'warn' : ''}"><div class="n">${s.waiting}</div><div class="l">People with emails waiting</div></div>
      <div class="kpi"><div class="n">${s.people_with_devices}</div><div class="l">People with phone notifications</div></div><div class="kpi ${s.keys_ready ? '' : 'warn'}"><div class="n">${s.keys_ready ? 'Ready' : 'Not yet'}</div><div class="l">Phone sending</div></div></div>
    ${s.keys_ready ? '' : '<div class="notice">Phone notifications start once the <b>nest-push</b> function is in Supabase (see the 3.0.10 README) and the first person allows notifications.</div>'}
    <form id="na-form" class="mt">
      <label class="switch pc-sw"><input type="checkbox" name="mail_on" ${m.on !== false ? 'checked' : ''}><span class="sw"></span><span><b>Notification emails</b><span class="sub muted">Off pauses them for everyone. Payslips, announcements and invitations still send their own emails.</span></span></label>
      <label class="switch pc-sw mt"><input type="checkbox" name="push_on" ${p.on !== false ? 'checked' : ''}><span class="sw"></span><span><b>Phone notifications</b><span class="sub muted">Off pauses them for everyone.</span></span></label>
      <div class="row3 mt"><label class="f">Brevo emails a day<input type="number" name="limit" min="1" value="${esc(m.limit ?? 300)}"><span class="hint">The free plan allows 300.</span></label>
        <label class="f">Keep for sign-up and password emails<input type="number" name="reserve" min="0" value="${esc(m.reserve ?? 30)}"><span class="hint">Supabase sends these through the same Brevo account.</span></label>
        <label class="f">Function address<input name="function_url" value="${esc(p.function_url || '')}"><span class="hint">The nest-push function in Supabase.</span></label></div>
      <p class="muted small">When the day’s emails run out, the rest wait until the next day, the most important first (approvals, items sent back, payslips). Anything waiting 3 days is dropped: it’s already in the bell and on the phone. Emails for notifications people have already read in Nest aren’t sent.${(s.last7 || []).length ? ` Last days: ${s.last7.map(x => `${fd(x.day)} ${x.sent}`).join(' · ')}.` : ''}</p>
      <div class="acc-save"><button class="btn primary" type="submit">Save</button></div></form></div></section>`;
}
function bindNotifyAdmin(main) {
  const f = $('#na-form', main); if (!f) return;
  f.onsubmit = async e => { e.preventDefault();
    try { await q(sb.rpc('notify_settings_save', { p: { mail_on: f.mail_on.checked, push_on: f.push_on.checked, limit: +f.limit.value, reserve: +f.reserve.value, function_url: f.function_url.value.trim() } })); await loadLookups(); toast('Saved'); render({ quiet: true }); }
    catch (x) { toast(niceError(x), true); } };
}
