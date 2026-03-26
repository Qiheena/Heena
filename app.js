let downloadHistory = [];
let thumbnailsData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadDownloadHistory();
});

/* =====================
   THEME
   ===================== */
function loadTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    const isDark = saved === 'dark';
    document.body.className = isDark ? 'dark' : 'light';
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.checked = isDark;
}

function toggleTheme() {
    const isDark = document.getElementById('themeToggle').checked;
    document.body.className = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

/* =====================
   SETTINGS DRAWER
   ===================== */
function openSettings() {
    document.getElementById('settingsDrawer').classList.add('open');
    document.getElementById('overlay').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeSettings() {
    document.getElementById('settingsDrawer').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
    document.body.style.overflow = '';
}

/* =====================
   ALERTS
   ===================== */
function showAlert(message, type = 'info', duration = 3500) {
    const box = document.getElementById('alertBox');
    const el = document.createElement('div');
    el.className = `alert alert-${type}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), duration);
}

/* =====================
   VIDEO ID PARSING
   ===================== */
function getVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?#]+)/,
        /youtube\.com\/embed\/([^?&#]+)/,
        /youtube\.com\/v\/([^?&#]+)/,
        /youtube\.com\/shorts\/([^?&#]+)/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

async function getVideoTitle(videoId) {
    try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        const data = await res.json();
        if (data.title) return data.title;
    } catch (_) {}
    return `Video_${videoId}`;
}

/* =====================
   THUMBNAIL URL
   ===================== */
function thumbUrl(videoId, quality) {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

async function bestQuality(videoId, requested, fallback) {
    if (!fallback) return requested;
    const list = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
    const start = list.indexOf(requested);
    for (let i = start; i < list.length; i++) {
        try {
            const r = await fetch(thumbUrl(videoId, list[i]), { method: 'HEAD' });
            if (r.ok) return list[i];
        } catch (_) {}
    }
    return 'default';
}

function qualityLabel(q) {
    return { maxresdefault: '4K', sddefault: '480p', hqdefault: '360p', mqdefault: '320p', default: '120p' }[q] || q;
}

/* =====================
   PROCESS THUMBNAILS
   ===================== */
async function processThumbnails() {
    const input = document.getElementById('links').value;
    const links = (input.match(/https?:\/\/[^\s]+/g) || []);

    if (!links.length) {
        showAlert('No valid YouTube links found!', 'error');
        return;
    }

    const output = document.getElementById('output');
    output.innerHTML = '';
    thumbnailsData = [];

    const btn = document.getElementById('fetchBtn');
    btn.disabled = true;

    // Show skeletons
    for (let i = 0; i < links.length; i++) {
        output.appendChild(makeSkeleton());
    }

    // Fetch data
    const items = [];
    for (const link of links) {
        const id = getVideoId(link);
        if (!id) continue;
        const title = await getVideoTitle(id);
        items.push({ id, title, link });
    }

    output.innerHTML = '';
    thumbnailsData = items;

    if (!items.length) {
        showAlert('No valid video IDs found.', 'error');
        btn.disabled = false;
        return;
    }

    items.forEach(t => renderThumb(t, output));

    document.getElementById('bulkBar').style.display = 'flex';
    updateSelectionInfo();
    showAlert(`Loaded ${items.length} thumbnail${items.length > 1 ? 's' : ''}`, 'success');
    btn.disabled = false;
}

/* =====================
   RENDER CARD
   ===================== */
function renderThumb(thumb, container) {
    const gq = document.getElementById('globalQuality').value;
    const url = thumbUrl(thumb.id, gq);

    const card = document.createElement('div');
    card.className = 'thumb-card';
    card.setAttribute('data-id', thumb.id);

    card.innerHTML = `
        <div class="thumb-img-wrap">
            <img class="thumb-img" src="${url}" alt="${escapeHtml(thumb.title)}"
                 onerror="this.src='${thumbUrl(thumb.id, 'hqdefault')}'">
            <div class="quality-badge" id="badge-${thumb.id}">${qualityLabel(gq)}</div>
            <div class="thumb-select-wrap">
                <input type="checkbox" class="thumb-checkbox" data-id="${thumb.id}"
                       data-title="${escapeHtml(thumb.title)}" onchange="updateSelectionInfo()">
            </div>
        </div>
        <div class="thumb-body">
            <div class="thumb-title">${escapeHtml(thumb.title)}</div>
            <div class="thumb-id">${thumb.id}</div>
            <div class="thumb-quality-row">
                <select class="thumb-quality-select ind-quality" data-id="${thumb.id}"
                        onchange="changeIndividualQuality(this,'${thumb.id}')">
                    <option value="maxresdefault">4K</option>
                    <option value="sddefault">480p</option>
                    <option value="hqdefault" ${gq === 'hqdefault' ? 'selected' : ''}>360p</option>
                    <option value="mqdefault">320p</option>
                    <option value="default">120p</option>
                </select>
            </div>
            <button class="btn-download" onclick="downloadSingle('${thumb.id}','${escapeHtml(thumb.title).replace(/'/g,"\\'")}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
            </button>
        </div>
    `;

    container.appendChild(card);
}

function changeIndividualQuality(select, videoId) {
    const q = select.value;
    const card = select.closest('.thumb-card');
    card.querySelector('.thumb-img').src = thumbUrl(videoId, q);
    const badge = document.getElementById(`badge-${videoId}`);
    if (badge) badge.textContent = qualityLabel(q);
}

/* =====================
   SKELETON
   ===================== */
function makeSkeleton() {
    const div = document.createElement('div');
    div.className = 'thumb-card';
    div.innerHTML = `
        <div class="thumb-img-wrap"><div class="skeleton" style="position:absolute;inset:0"></div></div>
        <div class="thumb-body">
            <div class="skeleton" style="height:14px;width:80%;margin-bottom:8px"></div>
            <div class="skeleton" style="height:11px;width:50%"></div>
        </div>`;
    return div;
}

/* =====================
   SELECTION
   ===================== */
function updateSelectionInfo() {
    const all = document.querySelectorAll('.thumb-checkbox');
    const sel = document.querySelectorAll('.thumb-checkbox:checked');
    document.getElementById('selectionInfo').textContent = `${sel.length} of ${all.length} selected`;
    const sa = document.getElementById('selectAll');
    if (sa) sa.checked = sel.length === all.length && all.length > 0;
}

function toggleSelectAll() {
    const checked = document.getElementById('selectAll').checked;
    document.querySelectorAll('.thumb-checkbox').forEach(cb => cb.checked = checked);
    updateSelectionInfo();
}

/* =====================
   DOWNLOAD
   ===================== */
async function downloadSingle(videoId, title) {
    const qs = document.querySelector(`.ind-quality[data-id="${videoId}"]`);
    const q = qs ? qs.value : document.getElementById('globalQuality').value;
    const fallback = document.getElementById('fallbackQuality').checked;
    const autoRename = document.getElementById('autoRename').checked;

    const fq = await bestQuality(videoId, q, fallback);
    try {
        const res = await fetch(thumbUrl(videoId, fq));
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        const filename = autoRename
            ? `${sanitize(title)}_${videoId}.jpg`
            : `thumbnail_${videoId}.jpg`;
        saveAs(blob, filename);
        addToHistory(title, filename);
        showAlert(`Downloaded: ${filename}`, 'success');
    } catch (_) {
        showAlert(`Download failed for "${title}"`, 'error');
    }
}

async function downloadSelected() {
    const selected = Array.from(document.querySelectorAll('.thumb-checkbox:checked'));
    if (!selected.length) { showAlert('Select at least one thumbnail!', 'error'); return; }

    const mode = document.querySelector('input[name="downloadMode"]:checked').value;
    showProgress(0, selected.length);

    if (mode === 'zip') {
        await doZip(selected);
    } else {
        await doIndividual(selected);
    }

    hideProgress();
}

async function doIndividual(items) {
    const fallback = document.getElementById('fallbackQuality').checked;
    const autoRename = document.getElementById('autoRename').checked;
    let done = 0;

    for (const cb of items) {
        const id = cb.getAttribute('data-id');
        const title = cb.getAttribute('data-title');
        const qs = document.querySelector(`.ind-quality[data-id="${id}"]`);
        const q = qs ? qs.value : document.getElementById('globalQuality').value;
        const fq = await bestQuality(id, q, fallback);

        try {
            const res = await fetch(thumbUrl(id, fq));
            if (res.ok) {
                const blob = await res.blob();
                const fn = autoRename ? `${sanitize(title)}_${id}.jpg` : `thumbnail_${id}.jpg`;
                saveAs(blob, fn);
                addToHistory(title, fn);
            }
        } catch (_) {}

        done++;
        showProgress(done, items.length);
    }
    showAlert(`Downloaded ${done} thumbnail${done > 1 ? 's' : ''}`, 'success');
}

async function doZip(items) {
    const zip = new JSZip();
    const fallback = document.getElementById('fallbackQuality').checked;
    const autoRename = document.getElementById('autoRename').checked;
    let done = 0;

    for (const cb of items) {
        const id = cb.getAttribute('data-id');
        const title = cb.getAttribute('data-title');
        const qs = document.querySelector(`.ind-quality[data-id="${id}"]`);
        const q = qs ? qs.value : document.getElementById('globalQuality').value;
        const fq = await bestQuality(id, q, fallback);

        try {
            const res = await fetch(thumbUrl(id, fq));
            if (res.ok) {
                const blob = await res.blob();
                const fn = autoRename ? `${sanitize(title)}_${id}.jpg` : `thumbnail_${id}.jpg`;
                zip.file(fn, blob);
            }
        } catch (_) {}

        done++;
        showProgress(done, items.length);
    }

    try {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'YouTube_Thumbnails.zip');
        addToHistory('ZIP Archive', 'YouTube_Thumbnails.zip');
        showAlert(`ZIP created with ${done} thumbnail${done > 1 ? 's' : ''}`, 'success');
    } catch (_) {
        showAlert('Failed to create ZIP', 'error');
    }
}

/* =====================
   PROGRESS
   ===================== */
function showProgress(done, total) {
    const wrap = document.getElementById('progressWrap');
    wrap.style.display = 'block';
    const pct = total ? Math.round((done / total) * 100) : 0;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressLabel').textContent = `${done} of ${total} done`;
}

function hideProgress() {
    setTimeout(() => {
        const wrap = document.getElementById('progressWrap');
        wrap.style.display = 'none';
        document.getElementById('progressFill').style.width = '0%';
    }, 1200);
}

/* =====================
   HISTORY
   ===================== */
function addToHistory(title, filename) {
    downloadHistory.unshift({ title, filename, date: new Date().toLocaleString() });
    if (downloadHistory.length > 10) downloadHistory.pop();
    localStorage.setItem('downloadHistory', JSON.stringify(downloadHistory));
    renderHistory();
}

function renderHistory() {
    const card = document.getElementById('historyCard');
    if (!downloadHistory.length) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    const list = document.getElementById('historyList');
    list.innerHTML = downloadHistory.map(e => `
        <div class="history-item">
            <strong>${escapeHtml(e.filename)}</strong>
            <small>${escapeHtml(e.title)} · ${e.date}</small>
        </div>`).join('');
}

function loadDownloadHistory() {
    try {
        const saved = localStorage.getItem('downloadHistory');
        if (saved) { downloadHistory = JSON.parse(saved); renderHistory(); }
    } catch (_) {}
}

function clearHistory() {
    downloadHistory = [];
    localStorage.removeItem('downloadHistory');
    renderHistory();
}

/* =====================
   CLEAR ALL
   ===================== */
function clearAll() {
    document.getElementById('links').value = '';
    document.getElementById('output').innerHTML = '';
    document.getElementById('bulkBar').style.display = 'none';
    thumbnailsData = [];
    showAlert('Cleared', 'info');
}

/* =====================
   UTILS
   ===================== */
function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function sanitize(str) {
    return str.replace(/[^a-z0-9\u0900-\u097F\u0980-\u09FF]/gi, '_').substring(0, 50);
}
