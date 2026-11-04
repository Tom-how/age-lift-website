(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const CONFIG_KEY = 'agelift-admin-github';
  const IMAGE_MAX = 1600;

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'value') node.value = value;
      else if (key === 'checked') node.checked = !!value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    });
    children.flat().forEach((child) => { if (child !== null && child !== undefined) node.append(child); });
    return node;
  }

  /* ---------- 草稿儲存（IndexedDB，圖片較大也放得下） ---------- */
  const dbReady = new Promise((resolve, reject) => {
    const open = indexedDB.open('agelift-admin', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  async function kv(mode, fn) {
    const db = await dbReady;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', mode);
      const req = fn(tx.objectStore('kv'));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  }
  const readDraft = () => kv('readonly', (s) => s.get('draft'));
  const writeDraft = (v) => kv('readwrite', (s) => s.put(v, 'draft'));
  const clearDraft = () => kv('readwrite', (s) => s.delete('draft'));

  /* ---------- 後台欄位定義 ---------- */
  const IMAGE_ITEM = [
    { k: 'src', l: '照片', t: 'image' },
    { k: 'caption', l: '照片說明', t: 'text' }
  ];
  const PANELS = [
    { id: 'links', label: '連結與資訊', desc: '官方 LINE、社群連結與聯絡資訊。', fields: [
      { k: 'links.line', l: '官方 LINE 連結', t: 'url', hint: '諮詢視窗複製訊息後會跳轉到這裡。' },
      { k: 'links.instagram', l: 'Instagram 連結', t: 'url' },
      { k: 'links.threads', l: 'Threads 連結', t: 'url' },
      { k: 'contact.address', l: '地址', t: 'text', hint: '沒填就不會顯示。' },
      { k: 'contact.mapUrl', l: 'Google 地圖連結', t: 'url' },
      { k: 'contact.hours', l: '營業方式', t: 'text' },
      { k: 'contact.parking', l: '停車資訊', t: 'text' }
    ] },
    { id: 'hero', label: '首頁主視覺', desc: '打開網站第一眼看到的內容。', fields: [
      { k: 'hero.eyebrow', l: '小標', t: 'text' },
      { k: 'hero.title', l: '大標語', t: 'textarea', rows: 3, hint: '換行就是分行，最後一行會變成白色。' },
      { k: 'hero.subtitle', l: '說明文字', t: 'textarea', rows: 3 },
      { k: 'hero.image', l: '主視覺照片', t: 'image' }
    ] },
    { id: 'about', label: '工作室介紹', desc: '介紹文字、影片與環境照。', fields: [
      { k: 'about.heading', l: '標題', t: 'text' },
      { k: 'about.body', l: '介紹文字', t: 'textarea', rows: 7, hint: '空一行就是新的段落。' },
      { k: 'about.videoUrl', l: '介紹影片連結', t: 'url', hint: '貼 YouTube 連結。填了影片會取代下方的介紹照片。' },
      { k: 'about.image', l: '介紹照片', t: 'image' },
      { k: 'about.points', l: '特色重點', t: 'list', add: '新增重點', title: (i) => i.title, blank: () => ({ title: '', text: '' }),
        item: [{ k: 'title', l: '重點', t: 'text' }, { k: 'text', l: '說明', t: 'text' }] },
      { k: 'about.photos', l: '環境照', t: 'list', add: '新增環境照', title: (i) => i.caption || '環境照', blank: () => ({ src: '', caption: '' }), item: IMAGE_ITEM }
    ] },
    { id: 'coaches', label: '教練', desc: '新增、修改或調整教練順序。', fields: [
      { k: 'coaches', t: 'list', add: '新增教練', title: (i) => i.name || '新教練',
        blank: () => ({ name: '', title: '', hideTitle: false, specialties: '', bio: '', photo: '', instagram: '' }),
        item: [
          { k: 'name', l: '姓名', t: 'text' },
          { k: 'title', l: '職稱', t: 'text' },
          { k: 'hideTitle', l: '不顯示職稱', t: 'check', defaultOff: true },
          { k: 'specialties', l: '專長', t: 'text', hint: '用逗號分開，例如：銀髮族訓練, 健力' },
          { k: 'bio', l: '介紹', t: 'textarea', rows: 5 },
          { k: 'photo', l: '照片', t: 'image' },
          { k: 'instagram', l: '個人 IG 連結', t: 'url' }
        ] }
    ] },
    { id: 'articles', label: '文章', desc: '首頁會自動顯示最新三篇。', fields: [
      { k: 'articles', t: 'list', add: '新增文章', prepend: true, title: (i) => (i.published === false ? '【未公開】' : '') + (i.title || '新文章'),
        blank: () => ({ slug: 'a-' + Date.now().toString(36), title: '', date: new Date().toISOString().slice(0, 10), tag: '', excerpt: '', cover: '', published: true, body: '' }),
        item: [
          { k: 'title', l: '標題', t: 'text' },
          { k: 'date', l: '日期', t: 'date' },
          { k: 'tag', l: '分類', t: 'text' },
          { k: 'excerpt', l: '摘要', t: 'textarea', rows: 2 },
          { k: 'cover', l: '封面圖', t: 'image' },
          { k: 'body', l: '內文', t: 'textarea', rows: 14, insertImage: true, hint: '## 小標｜- 清單｜**粗體**｜[文字](連結)｜空一行換段' },
          { k: 'published', l: '公開這篇文章', t: 'check' }
        ] }
    ] },
    { id: 'consult', label: '諮詢模板', desc: '客人複製到 LINE 的訊息內容。', fields: [
      { k: 'consult.heading', l: '區塊標題', t: 'text' },
      { k: 'consult.intro', l: '區塊說明', t: 'textarea', rows: 2 },
      { k: 'consult.types', l: '諮詢項目', t: 'list', add: '新增諮詢項目', title: (i) => i.title || '新項目', blank: () => ({ title: '', desc: '', template: '' }),
        item: [
          { k: 'title', l: '按鈕名稱', t: 'text' },
          { k: 'desc', l: '按鈕說明', t: 'text' },
          { k: 'template', l: '訊息模板', t: 'textarea', rows: 10 }
        ] }
    ] },
    { id: 'site', label: '網站資訊', desc: '工作室名稱與基本資料。', fields: [
      { k: 'site.name', l: '中文名稱', t: 'text' },
      { k: 'site.nameEn', l: '英文名稱', t: 'text' },
      { k: 'site.location', l: '所在地區', t: 'text' }
    ] },
    { id: 'analytics', label: '流量統計', desc: '用 Google Analytics 查看訪客數、來源與諮詢點擊。',
      link: { href: 'https://analytics.google.com/analytics/web/', label: '查看流量報表' },
      fields: [
        { k: 'site.gaId', l: 'GA 評估 ID', t: 'text', hint: '格式像 G-XXXXXXXXXX。填好後按「發布到官網」才會開始統計；清空再發布就會停止。' }
      ] },
    { id: 'publish', label: '發布設定', custom: true }
  ];

  /* ---------- 狀態 ---------- */
  let data = null;
  let current = 'links';
  let saveTimer;

  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  function setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] = o[k] || {}), obj);
    target[last] = value;
  }

  function touched() {
    $('save-state').textContent = '儲存草稿中…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
  }
  async function saveNow() {
    clearTimeout(saveTimer);
    try {
      await writeDraft(data);
      $('save-state').textContent = '草稿已儲存在這台裝置，尚未發布';
      $('draft-banner').hidden = false;
    } catch (err) {
      $('save-state').textContent = '草稿儲存失敗：' + err.message;
    }
  }

  /* ---------- 圖片處理 ---------- */
  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) { reject(new Error('請選擇圖片檔')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, IMAGE_MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('這張圖片無法讀取')); };
      img.src = url;
    });
  }

  /* ---------- 表單產生器 ---------- */
  function imageField(field, obj, key) {
    const wrap = el('div', { class: 'image-field' });
    const draw = () => {
      const value = obj[key];
      const status = el('span', { class: 'hint', role: 'status' });
      const input = el('input', { type: 'file', accept: 'image/*', onchange: async () => {
        if (!input.files[0]) return;
        status.textContent = '處理圖片中…';
        try {
          obj[key] = await resizeImage(input.files[0]);
          touched();
          draw();
        } catch (err) { status.textContent = err.message; }
      } });
      wrap.replaceChildren(
        value ? el('img', { src: value, alt: '' }) : el('div', { class: 'blank' }, '尚無圖片'),
        el('div', { class: 'image-controls' },
          el('label', { class: 'btn upload-btn' }, value ? '更換圖片' : '上傳圖片', input),
          value ? el('button', { class: 'btn btn-small', type: 'button', onclick: () => { obj[key] = ''; touched(); draw(); } }, '移除圖片') : null,
          status)
      );
    };
    draw();
    return el('div', { class: 'field' }, el('span', { class: 'field-label' }, field.l), wrap);
  }

  function renderField(field, obj, key) {
    if (field.t === 'list') return renderList(field, obj, key);
    if (field.t === 'image') return imageField(field, obj, key);
    if (field.t === 'check') {
      return el('label', { class: 'check' },
        el('input', { type: 'checkbox', checked: field.defaultOff ? obj[key] === true : obj[key] !== false, onchange: (e) => { obj[key] = e.target.checked; touched(); } }),
        field.l);
    }
    const update = (e) => { obj[key] = e.target.value; touched(); };
    const hint = field.hint ? el('span', { class: 'hint' }, field.hint) : null;
    if (field.t === 'textarea') {
      const area = el('textarea', { rows: field.rows || 4, value: obj[key] || '', oninput: update });
      let insert = null;
      if (field.insertImage) {
        const status = el('span', { class: 'hint', role: 'status' });
        const input = el('input', { type: 'file', accept: 'image/*', onchange: async () => {
          if (!input.files[0]) return;
          status.textContent = '處理圖片中…';
          try {
            const url = await resizeImage(input.files[0]);
            const pos = area.selectionStart || area.value.length;
            const id = 'img' + Date.now().toString(36);
            data.__pending = data.__pending || {};
            data.__pending[id] = url;
            area.value = area.value.slice(0, pos) + '\n\n![圖片說明](pending:' + id + ')\n\n' + area.value.slice(pos);
            obj[key] = area.value;
            status.textContent = '圖片已插入內文';
            touched();
          } catch (err) { status.textContent = err.message; }
          input.value = '';
        } });
        insert = el('div', { style: 'margin-top:8px' }, el('label', { class: 'btn btn-small upload-btn' }, '在游標處插入圖片', input), status);
      }
      return el('div', { class: 'field' }, el('label', null, el('span', { class: 'field-label' }, field.l), area), hint, insert);
    }
    return el('label', { class: 'field' }, el('span', null, field.l),
      el('input', { type: field.t === 'url' ? 'url' : field.t === 'date' ? 'date' : 'text', value: obj[key] || '', oninput: update, placeholder: field.t === 'url' ? 'https://' : null }), hint);
  }

  function renderList(field, obj, key) {
    if (!Array.isArray(obj[key])) obj[key] = [];
    const list = obj[key];
    const box = el('div', { class: 'list' });
    const open = new WeakSet();
    const draw = () => {
      box.replaceChildren(...list.map((item, index) => {
        const move = (delta) => (event) => {
          event.preventDefault();
          const to = index + delta;
          if (to < 0 || to >= list.length) return;
          [list[index], list[to]] = [list[to], list[index]];
          touched();
          draw();
        };
        const titleNode = el('span', { class: 'item-title' }, field.title(item) || '未命名');
        const body = el('div', { class: 'item-body', oninput: () => { titleNode.textContent = field.title(item) || '未命名'; } },
          field.item.map((sub) => renderField(sub, item, sub.k)));
        const details = el('details', { class: 'item', ontoggle: () => { if (details.open) open.add(item); else open.delete(item); } },
          el('summary', null, titleNode, el('span', { class: 'item-actions' },
            el('button', { class: 'btn btn-small', type: 'button', 'aria-label': '上移', onclick: move(-1) }, '↑'),
            el('button', { class: 'btn btn-small', type: 'button', 'aria-label': '下移', onclick: move(1) }, '↓'),
            el('button', { class: 'btn btn-small btn-danger', type: 'button', onclick: (event) => {
              event.preventDefault();
              if (!confirm('確定要刪除「' + (field.title(item) || '這個項目') + '」嗎？')) return;
              list.splice(index, 1);
              touched();
              draw();
            } }, '刪除'))),
          body);
        if (open.has(item)) details.open = true;
        return details;
      }));
    };
    draw();
    const add = el('button', { class: 'btn', type: 'button', onclick: () => {
      const item = field.blank();
      if (field.prepend) list.unshift(item); else list.push(item);
      open.add(item);
      touched();
      draw();
    } }, '＋ ' + field.add);
    return el('div', { class: 'field' }, field.l ? el('span', { class: 'field-label' }, field.l) : null, box, add);
  }

  function renderTabs() {
    $('tabs').replaceChildren(...PANELS.map((p) => el('button', {
      type: 'button', 'aria-current': p.id === current ? 'true' : 'false',
      onclick: () => { current = p.id; renderTabs(); renderPanel(); window.scrollTo(0, 0); }
    }, p.label)));
  }

  function renderPanel() {
    const panel = PANELS.find((p) => p.id === current);
    if (panel.custom) { renderPublishPanel(); return; }
    const nodes = [el('h1', null, panel.label), el('p', { class: 'panel-desc' }, panel.desc)];
    panel.fields.forEach((field) => {
      const keys = field.k.split('.');
      const last = keys.pop();
      const parent = keys.reduce((o, k) => (o[k] = o[k] || {}), data);
      nodes.push(renderField(field, parent, last));
    });
    if (panel.link) nodes.push(el('a', { class: 'btn', href: panel.link.href, target: '_blank', rel: 'noopener' }, panel.link.label));
    $('panel').replaceChildren(...nodes);
  }

  /* ---------- GitHub 發布 ---------- */
  function guessRepo() {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    if (!m) return { owner: '', repo: '' };
    const first = location.pathname.split('/').filter(Boolean)[0];
    return { owner: m[1], repo: first && !first.endsWith('.html') ? first : m[1] + '.github.io' };
  }
  function getConfig() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; } catch (err) { saved = {}; }
    return Object.assign({ branch: 'main', token: '' }, guessRepo(), saved);
  }
  function setConfig(cfg) {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch (err) { /* 無痕模式下每次都要重新輸入 */ }
  }
  const configReady = (cfg) => cfg.owner && cfg.repo && cfg.token;

  async function gh(cfg, path, options) {
    const base = 'https://api.github.com/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo);
    const res = await fetch(base + path, Object.assign({}, options, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + cfg.token, 'X-GitHub-Api-Version': '2022-11-28' }
    }));
    if (res.status === 404 && (!options || !options.method)) return null;
    if (!res.ok) {
      const messages = { 401: '金鑰無效或已過期，請到「發布設定」更新', 403: '金鑰沒有寫入權限，或已達 GitHub 使用上限', 404: '找不到這個儲存庫，請檢查帳號與儲存庫名稱', 409: '檔案剛被其他裝置更新，請再發布一次' };
      throw new Error(messages[res.status] || 'GitHub 回應錯誤（' + res.status + '）');
    }
    return res.json();
  }
  const contentsPath = (cfg, path) => '/contents/' + path.split('/').map(encodeURIComponent).join('/');
  async function getFile(cfg, path) {
    return gh(cfg, contentsPath(cfg, path) + '?ref=' + encodeURIComponent(cfg.branch));
  }
  async function putFile(cfg, path, base64, message) {
    const existing = await getFile(cfg, path);
    return gh(cfg, contentsPath(cfg, path), {
      method: 'PUT',
      body: JSON.stringify({ message, content: base64, branch: cfg.branch, sha: existing ? existing.sha : undefined })
    });
  }
  function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }
  function base64ToUtf8(base64) {
    const binary = atob(base64.replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  }

  // 內文插入的圖片在草稿中以 pending:代號 暫存，發布時還原後一起上傳
  function expandPendingImages() {
    const pending = data.__pending || {};
    (data.articles || []).forEach((article) => {
      article.body = String(article.body || '').replace(/pending:([a-z0-9]+)/g, (match, id) => pending[id] || match);
    });
    delete data.__pending;
  }

  // 把內容裡的 data: 圖片上傳成檔案，並換成檔案路徑
  async function uploadImages(cfg, node, log) {
    const pattern = /data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g;
    const stamp = Date.now();
    let count = 0;
    const seen = new Map();
    async function upload(dataUrl) {
      if (seen.has(dataUrl)) return seen.get(dataUrl);
      count += 1;
      const path = 'assets/uploads/' + stamp + '-' + count + '.jpg';
      log('上傳第 ' + count + ' 張圖片…');
      await putFile(cfg, path, dataUrl.split(',')[1], '後台上傳圖片');
      seen.set(dataUrl, path);
      return path;
    }
    async function walk(value) {
      if (typeof value === 'string') {
        const found = value.match(pattern);
        if (!found) return value;
        let output = value;
        for (const dataUrl of found) output = output.split(dataUrl).join(await upload(dataUrl));
        return output;
      }
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) value[i] = await walk(value[i]);
        return value;
      }
      if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) value[key] = await walk(value[key]);
      }
      return value;
    }
    await walk(node);
    return count;
  }

  function validate() {
    const problems = [];
    const line = getPath(data, 'links.line');
    if (!/^https:\/\//.test(line || '')) problems.push('官方 LINE 連結需要以 https:// 開頭');
    const gaId = String(getPath(data, 'site.gaId') || '').trim();
    if (gaId && !/^G-[A-Z0-9]+$/i.test(gaId)) problems.push('GA 評估 ID 格式不正確，應該像 G-XXXXXXXXXX');
    (data.articles || []).forEach((a) => {
      if (a.published !== false && !String(a.title || '').trim()) problems.push('有公開文章沒有標題');
    });
    return problems;
  }

  async function publish() {
    const cfg = getConfig();
    const box = $('publish-log');
    const log = (msg, cls) => { box.hidden = false; box.replaceChildren(el('span', { class: cls || null }, msg)); };
    if (!configReady(cfg)) {
      current = 'publish'; renderTabs(); renderPanel();
      log('請先完成發布設定，才能發布到官網。', 'err');
      return;
    }
    const problems = validate();
    if (problems.length) { log('無法發布：' + problems.join('；'), 'err'); return; }
    const button = $('publish-btn');
    button.disabled = true;
    button.textContent = '發布中…';
    try {
      expandPendingImages();
      const images = await uploadImages(cfg, data, log);
      await saveNow();
      log('更新網站內容…');
      await putFile(cfg, 'content.json', utf8ToBase64(JSON.stringify(data, null, 2) + '\n'), '後台更新網站內容');
      await clearDraft();
      $('draft-banner').hidden = true;
      $('save-state').textContent = '已發布';
      const siteUrl = new URL('./', location.href).href;
      box.replaceChildren(el('span', { class: 'ok' }, '發布成功' + (images ? '（含 ' + images + ' 張新圖片）' : '') + '。官網約 1～2 分鐘後更新：'), ' ', el('a', { href: siteUrl, target: '_blank', rel: 'noopener' }, '開啟官網'));
      renderPanel();
    } catch (err) {
      log('發布失敗：' + err.message + '。你的編輯內容仍保留在草稿中。', 'err');
    } finally {
      button.disabled = false;
      button.textContent = '發布到官網';
    }
  }

  function renderPublishPanel() {
    const cfg = getConfig();
    const input = (key, label, type, hint) => el('label', { class: 'field' }, el('span', null, label),
      el('input', { type, value: cfg[key] || '', autocomplete: type === 'password' ? 'off' : null, spellcheck: 'false', oninput: (e) => { cfg[key] = e.target.value.trim(); setConfig(cfg); } }),
      hint ? el('span', { class: 'hint' }, hint) : null);
    const status = el('div', { class: 'status', role: 'status' });
    const test = el('button', { class: 'btn', type: 'button', onclick: async () => {
      status.className = 'status';
      status.textContent = '測試中…';
      try {
        if (!configReady(cfg)) throw new Error('請先填完帳號、儲存庫與金鑰');
        const file = await getFile(cfg, 'content.json');
        status.className = 'status ok';
        status.textContent = file ? '連線成功，可以發布。' : '連線成功，但儲存庫裡還沒有 content.json。';
      } catch (err) {
        status.className = 'status err';
        status.textContent = '連線失敗：' + err.message;
      }
    } }, '測試連線');
    const backup = el('button', { class: 'btn', type: 'button', onclick: () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      el('a', { href: url, download: 'content.json' }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } }, '下載內容備份');
    const forget = el('button', { class: 'btn btn-danger', type: 'button', onclick: () => {
      cfg.token = '';
      setConfig(cfg);
      renderPanel();
    } }, '從這台裝置移除金鑰');
    $('panel').replaceChildren(
      el('h1', null, '發布設定'),
      el('p', { class: 'panel-desc' }, '每台裝置第一次使用時設定一次。'),
      el('div', { class: 'notice' }, '金鑰就像後台密碼，只會存在這台裝置的瀏覽器。請勿在公用電腦使用，也不要傳給別人。'),
      input('owner', 'GitHub 帳號', 'text'),
      input('repo', '儲存庫名稱', 'text'),
      input('branch', '分支', 'text', '一般維持 main。'),
      input('token', '發布金鑰（Fine-grained token）', 'password', '權限只需要這個儲存庫的 Contents：Read and write。'),
      el('div', { class: 'row' }, test, backup, forget),
      status
    );
  }

  /* ---------- 啟動 ---------- */
  async function loadOnline() {
    const cfg = getConfig();
    if (configReady(cfg)) {
      try {
        const file = await getFile(cfg, 'content.json');
        if (file && file.content) return JSON.parse(base64ToUtf8(file.content));
      } catch (err) { console.warn('改從網站讀取內容', err); }
    }
    const res = await fetch('content.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('content.json ' + res.status);
    return res.json();
  }

  async function init() {
    try {
      const draft = await readDraft();
      if (draft) {
        data = draft;
        $('draft-banner').hidden = false;
        $('save-state').textContent = '草稿尚未發布';
      } else {
        data = await loadOnline();
      }
    } catch (err) {
      $('panel').replaceChildren(el('p', { class: 'status err' }, '內容載入失敗：' + err.message));
      return;
    }
    renderTabs();
    renderPanel();
    $('publish-btn').addEventListener('click', publish);
    $('preview-btn').addEventListener('click', async () => {
      await saveNow();
      window.open('index.html?preview=1', '_blank', 'noopener');
    });
    $('discard-btn').addEventListener('click', async () => {
      if (!confirm('確定要捨棄草稿嗎？尚未發布的修改會消失。')) return;
      await clearDraft();
      data = await loadOnline();
      $('draft-banner').hidden = true;
      $('save-state').textContent = '';
      renderPanel();
    });
  }
  init();
})();
