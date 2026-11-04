(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const $ = (id) => document.getElementById(id);

  function safeUrl(url) {
    const value = String(url || '').trim();
    if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
    if (/^data:image\//i.test(value)) return value;
    if (value && !/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith('//')) return value;
    return '';
  }

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else if (key === 'href' || key === 'src') node.setAttribute(key, safeUrl(value));
      else node.setAttribute(key, value === true ? '' : value);
    });
    children.flat().forEach((child) => {
      if (child !== null && child !== undefined) node.append(child);
    });
    return node;
  }

  // 後台填了 GA 評估 ID 才會載入；預覽草稿不計入流量
  function initAnalytics(data) {
    const id = String((data.site && data.site.gaId) || '').trim();
    if (params.has('preview') || !/^G-[A-Z0-9]+$/i.test(id)) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
    document.head.append(el('script', { async: true, src: 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id) }));
  }

  function track(name, detail) {
    if (window.gtag) window.gtag('event', name, detail);
  }

  function paragraphs(text) {
    return String(text || '').split(/\n\s*\n/).filter(Boolean).map((part) => el('p', null, part.trim()));
  }

  function inline(text) {
    const output = [];
    const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
    let last = 0;
    let match;
    while ((match = pattern.exec(text))) {
      if (match.index > last) output.push(text.slice(last, match.index));
      if (match[1]) output.push(el('strong', null, match[1]));
      else output.push(el('a', { href: match[3], target: '_blank', rel: 'noopener' }, match[2]));
      last = pattern.lastIndex;
    }
    if (last < text.length) output.push(text.slice(last));
    return output;
  }

  // 文章語法：## 小標、- 清單、![說明](圖片)、**粗體**、[文字](連結)
  function renderBody(text) {
    const output = [];
    let list = null;
    let para = [];
    const flushPara = () => {
      if (para.length) output.push(el('p', null, inline(para.join(' '))));
      para = [];
    };
    String(text || '').split('\n').forEach((raw) => {
      const line = raw.trim();
      const image = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (line.startsWith('- ')) {
        flushPara();
        if (!list) { list = el('ul'); output.push(list); }
        list.append(el('li', null, inline(line.slice(2))));
        return;
      }
      list = null;
      if (!line) flushPara();
      else if (line.startsWith('## ')) { flushPara(); output.push(el('h2', null, line.slice(3))); }
      else if (image) { flushPara(); output.push(el('img', { src: image[2], alt: image[1], loading: 'lazy' })); }
      else para.push(line);
    });
    flushPara();
    return output;
  }

  function videoEmbed(url) {
    const value = String(url || '').trim();
    if (!value) return null;
    const yt = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{6,})/);
    if (yt) {
      return el('div', { class: 'video' }, el('iframe', {
        src: 'https://www.youtube-nocookie.com/embed/' + yt[1],
        title: '工作室介紹影片', loading: 'lazy', allowfullscreen: true,
        allow: 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
      }));
    }
    if (/\.(mp4|webm)(\?|$)/i.test(value)) {
      return el('div', { class: 'video' }, el('video', { src: value, controls: true, playsinline: true, preload: 'metadata' }));
    }
    return null;
  }

  const ICONS = {
    ig: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.3" fill="currentColor"/>',
    threads: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M18.5 8.5C17.6 4.9 15.2 3 12 3 7.2 3 4.5 6.5 4.5 12s2.7 9 7.5 9c4 0 7-2.3 7-5.4 0-3.2-3-4.8-7-4.5-2.4.2-3.8 1.3-3.8 2.8 0 1.6 1.5 2.6 3.4 2.5 2.7-.2 3.9-2.1 3.9-5.1 0-2.2-1.3-3.6-3.3-3.6-1.4 0-2.5.6-3.1 1.6"/>',
    line: '<path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 4 3.5 7.3 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5s5.8-3.4 7.9-5.8c1.4-1.6 2.1-3.1 2.1-4.9C22 6.6 17.5 3 12 3Z"/>'
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[name];
    return svg;
  }

  function renderFooter(data) {
    const links = data.links || {};
    const items = [
      ['Instagram', '@age_lift_fitness', links.instagram, 'ig'],
      ['Threads', '訓練知識與日常', links.threads, 'threads'],
      ['LINE', '官方帳號', links.line, 'line']
    ].filter((item) => safeUrl(item[2]));
    $('footer').replaceChildren(
      el('div', { id: 'social', class: 'social' }, el('div', { class: 'social-grid' }, items.map(([name, sub, url, ic]) =>
        el('a', { class: 'social-link', href: url, target: '_blank', rel: 'noopener', onclick: () => track('social_click', { platform: name }) },
          el('span', null, name, el('small', null, sub)), icon(ic))))),
      el('div', { class: 'foot' }, el('div', { class: 'foot-inner' },
        el('div', null, el('strong', null, data.site.nameEn + '｜' + data.site.name), data.site.location),
        el('div', null, '© ' + new Date().getFullYear() + ' ' + data.site.name)))
    );
  }

  let toastTimer;
  function toast(message) {
    const node = $('toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 3200);
  }

  // 在使用者點擊的當下同步複製，避免手機瀏覽器擋下後續的跳轉
  function copyText(textarea) {
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    if (!ok && navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textarea.value).catch(() => {});
      ok = true;
    }
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    return ok;
  }

  function openConsult(data, type) {
    const dialog = $('consult-dialog');
    const textarea = el('textarea', { id: 'consult-message', spellcheck: 'false' });
    textarea.value = type.template || '';
    const lineUrl = safeUrl(data.links && data.links.line);
    const closeBtn = el('button', { class: 'dialog-close', type: 'button', 'aria-label': '關閉', onclick: () => dialog.close() }, '×');
    const lineBtn = el('a', {
      class: 'btn btn-line', href: lineUrl, target: '_blank', rel: 'noopener',
      onclick: (event) => {
        if (copyText(textarea)) {
          toast('訊息已複製，到 LINE 貼上送出');
          track('line_click', { consult_type: type.title });
        } else { event.preventDefault(); toast('無法自動複製，請手動選取訊息'); textarea.select(); }
      }
    }, '複製訊息並前往官方 LINE');
    const copyBtn = el('button', {
      class: 'btn btn-plain', type: 'button',
      onclick: () => toast(copyText(textarea) ? '訊息已複製' : '無法自動複製，請手動選取訊息')
    }, '只複製訊息');
    dialog.replaceChildren(el('div', { class: 'dialog-inner' },
      el('div', { class: 'dialog-head' }, el('h2', null, type.title), closeBtn),
      el('ol', { class: 'dialog-steps' }, el('li', null, '填寫下方訊息'), el('li', null, '複製並開啟 LINE'), el('li', null, '貼上後送出')),
      el('label', { for: 'consult-message' }, '訊息內容（可以直接修改）'),
      textarea,
      el('div', { class: 'dialog-actions' }, lineBtn, copyBtn)
    ));
    dialog.showModal();
    closeBtn.focus();
    track('consult_open', { consult_type: type.title });
  }

  function renderConsult(data) {
    const consult = data.consult || {};
    $('consult-heading').textContent = consult.heading || '';
    $('consult-intro').textContent = consult.intro || '';
    $('consult-types').replaceChildren(...(consult.types || []).map((type) =>
      el('button', { class: 'consult-card', type: 'button', onclick: () => openConsult(data, type) },
        el('strong', null, type.title), el('span', null, type.desc), el('em', null, '查看訊息模板 →'))));
    const contact = data.contact || {};
    const rows = [
      ['地址', contact.address, contact.mapUrl],
      ['預約', contact.hours],
      ['停車', contact.parking]
    ].filter((row) => row[1]);
    $('contact-info').replaceChildren(...rows.map(([label, value, url]) =>
      el('li', null, el('b', null, label), url ? el('a', { href: url, target: '_blank', rel: 'noopener' }, value) : value)));
  }

  function formatDate(value) { return String(value || '').replaceAll('-', '.'); }

  function publishedArticles(data) {
    return (data.articles || []).filter((a) => a.published !== false)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function articleCard(article) {
    return el('a', { class: 'article-card', href: 'article.html?slug=' + encodeURIComponent(article.slug) + (params.has('preview') ? '&preview=1' : '') },
      article.cover ? el('img', { src: article.cover, alt: '', loading: 'lazy' }) : null,
      el('div', { class: 'article-card-body' },
        el('div', { class: 'meta' }, article.tag ? el('b', null, article.tag) : null, formatDate(article.date)),
        el('h3', null, article.title),
        el('p', null, article.excerpt)));
  }

  function renderHome(data) {
    const hero = data.hero || {};
    const lines = String(hero.title || '').split('\n');
    $('hero-eyebrow').textContent = hero.eyebrow || '';
    $('hero-title').replaceChildren(...lines.map((line, i) => i === lines.length - 1 && lines.length > 1 ? el('span', { class: 'accent' }, line) : el('span', { style: 'display:block' }, line)));
    $('hero-sub').textContent = hero.subtitle || '';
    $('hero-image').src = safeUrl(hero.image);

    const about = data.about || {};
    $('about-heading').textContent = about.heading || '';
    $('about-body').replaceChildren(...paragraphs(about.body));
    $('about-points').replaceChildren(...(about.points || []).map((p) => el('li', null, el('strong', null, p.title), el('span', null, p.text))));
    const media = videoEmbed(about.videoUrl) || (about.image ? el('img', { src: about.image, alt: '工作室環境', loading: 'lazy' }) : null);
    $('about-media').replaceChildren(...(media ? [media] : []));
    $('gallery').replaceChildren(...(about.photos || []).filter((p) => p.src).map((p) =>
      el('figure', null, el('img', { src: p.src, alt: p.caption || '工作室環境照', loading: 'lazy' }), p.caption ? el('figcaption', null, p.caption) : null)));

    $('coach-list').replaceChildren(...(data.coaches || []).map((coach) => {
      const tags = String(coach.specialties || '').split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
      return el('article', { class: 'coach' },
        el('div', { class: 'coach-photo' }, coach.photo
          ? el('img', { src: coach.photo, alt: coach.name, loading: 'lazy' })
          : el('img', { src: 'assets/logo.png', alt: '', class: 'is-logo', loading: 'lazy' })),
        el('div', { class: 'coach-body' },
          el('h3', null, coach.name),
          coach.title && !coach.hideTitle ? el('div', { class: 'coach-title' }, coach.title) : null,
          tags.length ? el('ul', { class: 'tags' }, tags.map((t) => el('li', null, t))) : null,
          el('p', { class: 'coach-bio' }, coach.bio),
          coach.instagram ? el('a', { class: 'text-link', href: coach.instagram, target: '_blank', rel: 'noopener' }, '教練 IG →') : null));
    }));

    $('article-list').replaceChildren(...publishedArticles(data).slice(0, 3).map(articleCard));
    renderConsult(data);
  }

  function renderArticlePage(data) {
    const root = $('article-page');
    const slug = params.get('slug');
    const previewQuery = params.has('preview') ? '?preview=1' : '';
    if (!slug) {
      root.replaceChildren(el('div', { class: 'wrap' },
        el('p', { class: 'index' }, 'JOURNAL'), el('h2', null, '訓練文章'),
        el('div', { class: 'article-list' }, publishedArticles(data).map(articleCard))));
      return;
    }
    const article = (data.articles || []).find((a) => a.slug === slug && (a.published !== false || params.has('preview')));
    if (!article) {
      root.replaceChildren(el('div', { class: 'article-narrow' }, el('h2', null, '找不到這篇文章'),
        el('p', { style: 'margin-top:16px' }, el('a', { class: 'back-link', href: 'article.html' + previewQuery }, '← 回文章列表'))));
      return;
    }
    document.title = article.title + '｜艾勁健身工作室';
    const consult = (data.consult && data.consult.types) || [];
    root.replaceChildren(el('div', { class: 'article-narrow' },
      el('a', { class: 'back-link', href: 'article.html' + previewQuery }, '← 回文章列表'),
      el('article', { class: 'article-sheet' },
        el('div', { class: 'meta' }, article.tag ? el('b', null, article.tag) : null, formatDate(article.date)),
        el('h1', null, article.title),
        el('div', { class: 'article-body' }, renderBody(String(article.body || '').replace(/pending:([a-z0-9]+)/g, (match, id) => (data.__pending && data.__pending[id]) || match)))),
      consult[0] ? el('div', { class: 'article-cta' },
        el('p', null, '想開始訓練，或有問題想問教練？'),
        el('button', { class: 'btn', type: 'button', onclick: () => openConsult(data, consult[0]) }, consult[0].title)) : null));
  }

  function readDraft() {
    return new Promise((resolve) => {
      const open = indexedDB.open('agelift-admin', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('kv');
      open.onerror = () => resolve(null);
      open.onsuccess = () => {
        const get = open.result.transaction('kv').objectStore('kv').get('draft');
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => resolve(null);
      };
    });
  }

  async function load() {
    if (params.has('preview')) {
      const draft = await readDraft();
      if (draft) { $('preview-banner').hidden = false; return draft; }
    }
    const res = await fetch('content.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('content.json ' + res.status);
    return res.json();
  }

  load().then((data) => {
    initAnalytics(data);
    if ($('hero-title')) renderHome(data);
    if ($('article-page')) renderArticlePage(data);
    renderFooter(data);
    if (location.hash && $('hero-title')) {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView();
    }
    if (params.has('preview')) {
      document.querySelectorAll('a[href="article.html"]').forEach((a) => { a.href = 'article.html?preview=1'; });
      document.querySelectorAll('a[href^="index.html"]').forEach((a) => { a.href = a.getAttribute('href').replace('index.html', 'index.html?preview=1'); });
    }
    const dialog = $('consult-dialog');
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  }).catch((err) => {
    console.error(err);
    const target = $('article-page') || document.querySelector('main');
    target.replaceChildren(el('div', { class: 'load-error' }, '網站內容載入失敗，請重新整理頁面。'));
  });
})();
