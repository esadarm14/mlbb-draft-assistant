const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let current = null;
let toastTimer;
const officialHosts = new Set(['www.mobilelegends.com', 'mobilelegends.com', 'new.mobilelegends.com', 'akmweb.youngjoygame.com']);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && officialHosts.has(url.hostname) ? url.href : null; }
  catch { return null; }
}
function formatDate(value, includeTime = true) {
  if (!value) return 'Belum ada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat('id-ID', includeTime ? { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' } : { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(date);
}
function statusClass(value) {
  if (value === 'VERIFIED') return 'verified';
  if (value === 'STALE') return 'stale';
  if (value === 'PARTIALLY VERIFIED') return 'partial';
  return 'unverified';
}
function badge(value) {
  const safe = escapeHtml(value || 'UNVERIFIED');
  return `<span class="badge badge-${statusClass(value)}">${safe}</span>`;
}
function toast(message, error = false) {
  const el = $('#toast'); el.textContent = message; el.classList.toggle('error', error); el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request gagal (${response.status})`);
  return data;
}
function sourceLink(url, label = 'Buka sumber resmi') {
  const safe = safeUrl(url);
  return safe ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>` : '<span class="muted">Sumber belum tersedia</span>';
}
function showView(view) {
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
  $$('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${view}`));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSourceGrid(db, dashboard) {
  const defs = [
    ['Situs utama', 'main', 'https://www.mobilelegends.com/'],
    ['Beranda hero (ID)', 'homeId', 'https://www.mobilelegends.com/id/home'],
    ['Patch notes', 'patchNotes', 'https://www.mobilelegends.com/news/patch-notes'],
    ['Berita resmi', 'news', 'https://www.mobilelegends.com/news/']
  ];
  $('#source-grid').innerHTML = defs.map(([name, key, url]) => {
    const state = dashboard.sourceStatuses?.[key];
    const label = state?.ok ? 'TERJANGKAU' : state ? 'GAGAL / DIBATASI' : 'BELUM DIPERIKSA';
    const color = state?.ok ? 'verified' : state ? 'stale' : 'unverified';
    return `<article class="source-card"><div class="source-card-top"><strong>${escapeHtml(name)}</strong><span class="badge badge-${color}">${label}</span></div>${sourceLink(url, 'mobilelegends.com')}<div class="source-state">${state?.checkedAt ? `Terakhir: ${formatDate(state.checkedAt)}` : 'Sumber utama Moonton'}</div></article>`;
  }).join('');
}
function renderOverview(db, dashboard) {
  $('#global-status').textContent = `DATA ${dashboard.dataStatus || 'STALE'}`;
  $('#global-status').className = `status-pill status-${statusClass(dashboard.dataStatus)}`;
  $('#live-patch').textContent = dashboard.currentLivePatch?.version || 'Belum terverifikasi';
  $('#live-date').textContent = dashboard.currentLivePatch?.releaseDate ? `Rilis ${formatDate(dashboard.currentLivePatch.releaseDate, false)} · Original Server` : 'Sumber resmi belum menetapkan Original Server';
  $('#last-sync').textContent = formatDate(dashboard.lastSuccessfulSync);
  $('#last-checked').textContent = formatDate(dashboard.lastCheckedAt);
  $('#hero-count').textContent = dashboard.verifiedHeroCount;
  $('#hero-partial').textContent = `${dashboard.partialHeroCount} data parsial dari halaman resmi`;
  $('#change-count').textContent = dashboard.recentChangeCount;
  $('#pending-count').textContent = dashboard.pendingChangeCount;
  $('#original-summary').textContent = dashboard.currentLivePatch ? `Patch ${dashboard.currentLivePatch.version} terverifikasi.` : 'Belum ada patch live yang terverifikasi.';
  $('#advance-summary').textContent = dashboard.advanceServerPatches?.length ? `${dashboard.advanceServerPatches.length} patch Advance terdaftar.` : 'Belum ada patch Advance yang terverifikasi.';
  const latest = dashboard.latestOfficialPatchNote;
  const latestScopeClass = latest?.serverScope === 'ADVANCE_SERVER' ? 'advance' : latest?.serverScope === 'ORIGINAL_SERVER' ? 'original' : 'unclassified';
  $('#latest-patch-card').innerHTML = latest ? `<div class="latest-patch-title">${escapeHtml(latest.title || latest.version)}</div><div class="latest-patch-meta">${badge(latest.verificationStatus)}<span class="server-badge ${latestScopeClass}">${escapeHtml(latest.serverScope || 'UNCLASSIFIED')}</span></div><p>Rilis tertera: ${formatDate(latest.releaseDate, false)} · Tidak otomatis dianggap patch live.</p>${sourceLink(latest.sourceUrl)}` : '<div class="empty-state">Belum ada data patch dari proses sync.</div>';
  const warn = $('#warning-banner');
  if (dashboard.dataStatus === 'STALE' || dashboard.lastError) {
    warn.textContent = dashboard.lastError || 'Data stale atau belum pernah sync. Data valid terakhir tetap dipertahankan.';
    warn.className = 'notice notice-warn';
  } else {
    warn.textContent = `Status ${dashboard.dataStatus}. Perubahan yang terdeteksi tetap pending hingga ditinjau admin.`;
    warn.className = 'notice notice-info';
  }
  $('#footer-sync').textContent = dashboard.lastCheckedAt ? `Last checked ${formatDate(dashboard.lastCheckedAt)}` : 'Belum pernah sync';
  renderSourceGrid(db, dashboard);
}
function renderPatches(db) {
  const rows = [...(db.patch_history?.records || [])].sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')));
  $('#patch-table').innerHTML = rows.length ? rows.map((patch) => {
    const changes = patch.changeSummary?.detectedCategories?.length ? patch.changeSummary.detectedCategories.join(', ') : 'Detail perubahan belum disetujui';
    const scopeClass = patch.serverScope === 'ADVANCE_SERVER' ? 'advance' : patch.serverScope === 'ORIGINAL_SERVER' ? 'original' : 'unclassified';
    return `<tr><td><strong>${escapeHtml(patch.version)}</strong><br><span class="muted">${escapeHtml(patch.title || '')}</span></td><td>${formatDate(patch.releaseDate, false)}</td><td><span class="server-badge ${scopeClass}">${escapeHtml(patch.serverScope || 'UNCLASSIFIED')}</span></td><td>${escapeHtml(changes)}</td><td>${badge(patch.verificationStatus)}</td><td>${sourceLink(patch.sourceUrl, 'Sumber')}</td></tr>`;
  }).join('') : '<tr><td colspan="6" class="empty-state">Belum ada riwayat patch.</td></tr>';
}
function renderHeroes(db, search = '') {
  const roles = new Map((db.hero_roles?.records || []).map((row) => [row.heroId, row]));
  const skills = db.hero_skills?.records || [];
  const query = search.toLowerCase().trim();
  const heroes = (db.heroes?.records || []).filter((hero) => `${hero.name} ${(hero.officialRole || []).join(' ')} ${(hero.heroSpecialty || []).join(' ')}`.toLowerCase().includes(query));
  $('#hero-grid').innerHTML = heroes.length ? heroes.map((hero) => {
    const role = roles.get(hero.id) || { roles: hero.officialRole || [], specialties: hero.heroSpecialty || [] };
    const heroSkills = skills.filter((skill) => skill.heroId === hero.id);
    const imageUrl = safeUrl(hero.officialPortrait);
    const avatar = imageUrl ? `<img class="hero-avatar" src="${escapeHtml(imageUrl)}" alt="Potret resmi ${escapeHtml(hero.name)}" loading="lazy">` : `<div class="hero-avatar" aria-hidden="true">${escapeHtml(hero.name.slice(0, 2).toUpperCase())}</div>`;
    const notes = hero.notes ? `<p class="muted">${escapeHtml(hero.notes)}</p>` : '';
    return `<article class="hero-card"><div class="hero-card-head">${avatar}<div class="hero-title"><h3>${escapeHtml(hero.name)}</h3><small>ID: ${hero.heroId ? escapeHtml(hero.heroId) : 'UNVERIFIED OFFICIAL DATA'}</small></div></div><div class="hero-data"><div>${badge(hero.verificationStatus)}</div><div class="eyebrow">ROLE</div><div class="tag-row">${(role.roles || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('') || '<span class="muted">Belum tersedia</span>'}</div><div class="eyebrow">SPECIALTY</div><div class="tag-row">${(role.specialties || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('') || '<span class="muted">Belum tersedia</span>'}</div><div class="eyebrow">SKILL NAMES</div>${heroSkills.length ? `<ul class="skill-list">${heroSkills.map((skill) => `<li>${escapeHtml(skill.name)}${skill.kind && skill.kind !== 'UNVERIFIED' ? ` · ${escapeHtml(skill.kind)}` : ''}</li>`).join('')}</ul>` : '<div class="muted">UNVERIFIED OFFICIAL DATA</div>'}${notes}</div><div class="hero-foot"><span class="muted">${escapeHtml(hero.patchVersion || 'Patch belum diverifikasi')}</span>${sourceLink(hero.sourceUrl, 'Sumber resmi')}</div></article>`;
  }).join('') : '<div class="empty-state">Tidak ada profil yang cocok. Data resmi yang belum tersedia tidak dibuat-buat.</div>';
}
function renderPending(db) {
  const records = db.pending_changes?.records || [];
  $('#pending-list').innerHTML = records.length ? records.map((item) => {
    const p = item.proposed || {};
    const detail = item.type === 'PATCH_ARTICLE'
      ? `Server: ${p.serverScope || 'UNCLASSIFIED'} · Hero changes: ${p.changeSummary?.heroes?.length || 0} · Revamp: ${p.changeSummary?.revamps?.length || 0} · Equipment/Battlefield: ${p.changeSummary?.equipmentBattlefield?.length || 0}`
      : `Role: ${(p.officialRole || []).join(', ') || 'belum diketahui'} · Specialty: ${(p.heroSpecialty || []).join(', ') || 'belum diketahui'}`;
    return `<article class="pending-item"><div class="pending-top"><input type="checkbox" class="pending-check" value="${escapeHtml(item.id)}" aria-label="Pilih ${escapeHtml(item.title)}"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(detail)}</p><p>${badge(p.verificationStatus || 'UNVERIFIED')}</p>${sourceLink(p.sourceUrl)}</div></div></article>`;
  }).join('') : '<div class="empty-state">Tidak ada perubahan menunggu review.</div>';
  $('#approve-selected').disabled = records.length === 0;
}
async function refreshLogs() {
  const data = await api('/api/logs');
  $('#log-list').innerHTML = (data.records || []).length ? data.records.map((log) => `<div class="log-item"><div><span class="log-level level-${escapeHtml(log.level || 'info')}">${escapeHtml(log.level || 'info')}</span><p>${escapeHtml(log.action || 'SYNC')} · ${escapeHtml(log.summary || (log.success ? 'Pemeriksaan selesai' : 'Pemeriksaan gagal'))}${Number.isFinite(log.detectedChangeCount) ? ` · ${log.detectedChangeCount} perubahan` : ''}</p></div><time>${formatDate(log.at)}</time></div>`).join('') : '<div class="empty-state">Belum ada sync log.</div>';
}
async function refresh() {
  const response = await api('/api/dashboard');
  current = response;
  renderOverview(response.database, response.dashboard);
  renderPatches(response.database);
  renderHeroes(response.database, $('#hero-search')?.value || '');
  renderPending(response.database);
}
async function syncNow() {
  const buttons = [$('#top-sync'), $('#sync-main'), $('#admin-sync'), ...$$('[data-action="sync"]')].filter(Boolean);
  buttons.forEach((button) => { button.disabled = true; button.dataset.originalText ||= button.textContent; button.textContent = 'Memeriksa…'; });
  try {
    const result = await api('/api/sync', { method: 'POST', body: '{}' });
    toast(result.success ? `Sync selesai · ${result.pendingChangeCount} perubahan menunggu review.` : 'Sync belum lengkap; data valid terakhir dipertahankan.', !result.success);
    await refresh(); await refreshLogs();
  } catch (error) { toast(error.message, true); }
  finally { buttons.forEach((button) => { button.disabled = false; button.textContent = button.dataset.originalText || 'Sync Now'; }); }
}

$$('.nav-item').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
$$('[data-view-link]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.viewLink)));
$$('[data-action="sync"]').forEach((button) => button.addEventListener('click', syncNow));
$('#top-sync').addEventListener('click', syncNow); $('#sync-main').addEventListener('click', syncNow); $('#admin-sync').addEventListener('click', syncNow);
$('#hero-search').addEventListener('input', () => current && renderHeroes(current.database, $('#hero-search').value));
$('#refresh-logs').addEventListener('click', () => refreshLogs().catch((error) => toast(error.message, true)));
$('#approve-selected').addEventListener('click', async () => {
  const ids = $$('.pending-check:checked').map((input) => input.value);
  if (!ids.length) return toast('Pilih perubahan yang sudah ditinjau.', true);
  if (!window.confirm(`Terapkan ${ids.length} perubahan pilihan ke database lokal?`)) return;
  try { const result = await api('/api/approve', { method: 'POST', body: JSON.stringify({ ids }) }); toast(`${result.approved} perubahan disetujui dan diterapkan.`); await refresh(); await refreshLogs(); }
  catch (error) { toast(error.message, true); }
});
$('#import-button').addEventListener('click', async () => {
  const file = $('#import-file').files[0]; if (!file) return toast('Pilih file JSON terlebih dahulu.', true);
  try {
    const document = JSON.parse(await file.text());
    const result = await api('/api/import', { method: 'POST', body: JSON.stringify({ name: $('#import-name').value, document }) });
    toast(`${result.imported}.json berhasil diimpor (${result.count} records).`); await refresh(); await refreshLogs();
  } catch (error) { toast(`Import gagal: ${error.message}`, true); }
});
$('#draft-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = new FormData(event.currentTarget);
  const split = (key) => String(form.get(key) || '').split(',').map((value) => value.trim()).filter(Boolean);
  try {
    const result = await api('/api/analyze', { method: 'POST', body: JSON.stringify({ ally: split('ally'), enemy: split('enemy'), candidates: split('candidates') }) });
    const rows = result.recommendations?.length ? `<ol>${result.recommendations.map((item) => `<li><b>${escapeHtml(item.heroId)}</b> · skor ${escapeHtml(item.score)}<br>${escapeHtml(item.reasons.join('; '))}</li>`).join('')}</ol>` : '<div class="empty-state">Tidak ada rekomendasi yang memenuhi bukti terverifikasi.</div>';
    $('#analysis-result').innerHTML = `<div class="eyebrow">${escapeHtml(result.label)}</div><h3>${escapeHtml(result.status.replaceAll('_', ' '))}</h3><p class="muted">${escapeHtml(result.message)}</p>${rows}<div class="small-note">${(result.warnings || []).map(escapeHtml).join('<br>')}</div>`;
  } catch (error) { toast(error.message, true); }
});

refresh().then(refreshLogs).catch((error) => toast(`Aplikasi belum siap: ${error.message}`, true));
setInterval(() => refresh().catch(() => {}), 60000);
