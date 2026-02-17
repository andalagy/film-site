const APP_BASE_PATH = '/andalagy';
const FILMS = Array.isArray(window.FILMS_DATA) ? window.FILMS_DATA : [];
const WRITINGS = Array.isArray(window.WRITINGS_DATA) ? window.WRITINGS_DATA : [];
const LIST_CTA_LABEL = 'show more';
const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const EMBED_LOAD_TIMEOUT_MS = 3200;
const SLATE_META = {
  scene: '01',
  take: 4,
  rollPrefix: 'a',
  roll: 5,
  date: '',
  time: '',
  format: '24fps',
  lens: '35mm',
  location: 'los angeles',
  status: 'in post',
  takeRange: [1, 12]
};

const app = document.querySelector('#app');
const cursor = document.querySelector('.cursor');
const ambientLeak = document.querySelector('.ambient-leak');
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let homeExpanded = false;
let homeWritingsExpanded = false;
let ambientRaf = 0;
const ambientMotion = {
  tx: window.innerWidth * 0.5,
  ty: window.innerHeight * 0.4,
  x: window.innerWidth * 0.5,
  y: window.innerHeight * 0.4
};

function normalize(path) {
  return path.replace(/\/+$/, '') || '/';
}

function stripBase(pathname = window.location.pathname) {
  const base = normalize(APP_BASE_PATH);
  const path = normalize(pathname);
  if (path === base) return '/';
  if (path.startsWith(`${base}/`)) return path.slice(base.length) || '/';
  return path;
}

function toUrl(path = '/', hash = '') {
  const fullPath = path === '/' ? `${APP_BASE_PATH}/` : `${APP_BASE_PATH}${path}`;
  return `${fullPath}${hash}`;
}

function routeFromLocation() {
  const path = stripBase();
  if (path === '/') return { page: 'home' };
  if (path === '/films') return { page: 'films' };
  if (path.startsWith('/films/')) return { page: 'film', id: decodeURIComponent(path.split('/')[2] || '') };
  if (path === '/writings') return { page: 'writings' };
  if (path.startsWith('/writings/')) return { page: 'writing', slug: decodeURIComponent(path.split('/')[2] || '') };
  return { page: 'home' };
}

function lower(text) {
  return String(text || '').toLowerCase();
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatSlateDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })
    .format(date)
    .toLowerCase();
}

function formatSlateTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function initSlateMeta() {
  if (SLATE_META.date && SLATE_META.time) return;
  const now = new Date();
  SLATE_META.date = formatSlateDate(now);
  SLATE_META.time = formatSlateTime(now);
}

function currentSlateValues() {
  initSlateMeta();
  return {
    scene: lower(SLATE_META.scene),
    take: pad2(SLATE_META.take),
    roll: `${lower(SLATE_META.rollPrefix)}${pad2(SLATE_META.roll)}`,
    date: lower(SLATE_META.date),
    time: lower(SLATE_META.time),
    format: lower(SLATE_META.format),
    lens: lower(SLATE_META.lens),
    location: lower(SLATE_META.location),
    status: lower(SLATE_META.status)
  };
}

function slateMetaMarkup() {
  const values = currentSlateValues();
  const fields = [
    ['scene', values.scene],
    ['take', values.take],
    ['roll', values.roll],
    ['date', values.date],
    ['time', values.time],
    ['fps', values.format],
    ['lens', values.lens],
    ['location', values.location],
    ['status', values.status]
  ];
  return `<dl class="slate-meta" aria-label="slate metadata">${fields
    .map(
      ([label, value]) =>
        `<div class="slate-chip"><dt>${label}</dt><dd class="slate-meta-value" data-slate-value="${label}">${value}</dd></div>`
    )
    .join('')}</dl>`;
}

function advanceSlateTake() {
  const [minTake, maxTake] = SLATE_META.takeRange;
  if (SLATE_META.take >= maxTake) {
    SLATE_META.take = minTake;
    SLATE_META.roll += 1;
    return;
  }
  SLATE_META.take += 1;
}

function animateSlateValue(label) {
  const valueNode = document.querySelector(`[data-slate-value="${label}"]`);
  if (!valueNode) return;
  valueNode.classList.remove('is-updating');
  void valueNode.offsetWidth;
  valueNode.classList.add('is-updating');
}

function syncSlateMetaUI() {
  const values = currentSlateValues();
  Object.entries(values).forEach(([label, value]) => {
    const valueNode = document.querySelector(`[data-slate-value="${label}"]`);
    if (valueNode) valueNode.textContent = value;
  });
}

function isDev() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function logDev(message, payload = {}) {
  if (!isDev()) return;
  console.info(`[film-embed] ${message}`, payload);
}

function isValidVideoId(id) {
  return typeof id === 'string' && YOUTUBE_ID_REGEX.test(id);
}

function buildEmbedSrc(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

function buildWatchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

function thumbCandidates(id) {
  return ['maxresdefault', 'hqdefault', 'mqdefault', 'default'].map(
    (size) => `https://img.youtube.com/vi/${encodeURIComponent(id)}/${size}.jpg`
  );
}

function renderYouTubeThumbnail({ id, alt, className = '', loading = 'lazy' }) {
  const safeId = String(id || '').trim();
  const thumbs = thumbCandidates(safeId);
  const classes = className ? ` class="${className}"` : '';
  return `<img${classes} src="" alt="${alt}" loading="${loading}" data-youtube-thumb="1" data-youtube-id="${safeId}" data-thumbs="${thumbs.join('|')}" data-thumb-index="0" data-thumb-key="${safeId}-0" />`;
}

function filmDetailPath(id) {
  return `/films/${encodeURIComponent(id)}`;
}

function filmCard(film) {
  const details = `${film.year} · ${film.runtime} · ${film.role}`;
  const thumbs = thumbCandidates(film.id);
  const preview = thumbs[1] || thumbs[0];
  const filmPath = filmDetailPath(film.id);
  const offsetX = Math.round(((film.title.length % 5) - 2) * 1.3);
  const offsetY = Math.round(((film.year || 0) % 3) - 1);
  return `<article class="film-card" style="--card-shift-x:${offsetX}px;--card-shift-y:${offsetY}px">
      <a href="${toUrl(filmPath)}" data-link="${filmPath}" class="film-link" data-preview="${preview}">
        ${renderYouTubeThumbnail({ id: film.id, alt: `${lower(film.title)} thumbnail` })}
        <span class="film-overlay">
          <span>${lower(film.statement)}</span>
          <small>${lower(details)}</small>
        </span>
      </a>
      <h3 data-title="${lower(film.title)}">${lower(film.title)}</h3>
    </article>`;
}

function writingDetailPath(slug) {
  return `/writings/${encodeURIComponent(slug)}`;
}

function writingCard(item) {
  const writingPath = writingDetailPath(item.slug);
  const detailBits = [item.year, item.pages].filter(Boolean).map((bit) => lower(bit));
  return `<article class="writing-card">
    <a href="${toUrl(writingPath)}" data-link="${writingPath}" class="writing-link">
      <div class="writing-overlay">
        <h3>${lower(item.title)}</h3>
        <p>${lower(item.excerpt)}</p>
        ${detailBits.length ? `<small>${detailBits.join(' · ')}</small>` : ''}
      </div>
    </a>
  </article>`;
}

function aboutBlock() {
  return `<section id="about" class="about">
    <h2>about</h2>
    <p class="thesis">i make films and writing that stay in the quiet after the scene ends.</p>
    <p>andrew yan is a filmmaker and writer drawn to memory, silence, and unresolved feeling. the work leans toward atmosphere over explanation, and keeps meaning slightly out of reach.</p>
    <p class="contact">
      <a href="mailto:g13901913371@gmail.com?subject=hello%20andrew">g13901913371@gmail.com</a>
      ·
      <a href="https://www.instagram.com/andalagy/" target="_blank" rel="noopener noreferrer" aria-label="instagram">instagram</a>
      ·
      <a href="https://www.youtube.com/@andalagy/" target="_blank" rel="noopener noreferrer" aria-label="youtube">youtube</a>
    </p>
  </section>`;
}

function homeView() {
  const shown = homeExpanded ? FILMS : FILMS.slice(0, 4);
  const shownWritings = homeWritingsExpanded ? WRITINGS : WRITINGS.slice(0, 4);
  return `<section class="slate-wrap" id="slate">
      <article class="slate" data-slate>
        <span class="slate-glow" aria-hidden="true"></span>
        <h1>andrew yan</h1>
        <p>minimal, atmospheric films about memory, tension, and what remains unsaid.</p>
        ${slateMetaMarkup()}
        <button class="quiet-btn" data-slate-action>enter</button>
      </article>
    </section>
    <section id="films" class="home-films">
      <div class="heading-row">
        <h2>work</h2>
      </div>
      <div class="film-grid">${shown.map(filmCard).join('')}</div>
      <button class="quiet-btn" data-toggle-home>${homeExpanded ? 'show less' : LIST_CTA_LABEL}</button>
    </section>
    <section class="home-writings">
      <div class="heading-row">
        <h2>writings</h2>
      </div>
      <div class="writing-grid">
        ${shownWritings.map(writingCard).join('')}
      </div>
      <button class="quiet-btn" data-toggle-home-writings>${homeWritingsExpanded ? 'show less' : LIST_CTA_LABEL}</button>
    </section>
    ${aboutBlock()}`;
}

function filmsView() {
  return `<section class="page-section"><h1>films</h1><div class="film-grid">${FILMS.map(filmCard).join('')}</div></section>`;
}

function filmDetailView(id) {
  if (!id) return `<section class="page-section"><h1>film not found</h1></section>`;
  const film = FILMS.find((item) => item.id === id);
  if (!film) return `<section class="page-section"><h1>film not found</h1></section>`;
  const validId = isValidVideoId(film.id);
  const embedSrc = validId ? buildEmbedSrc(film.id) : '';

  logDev('render detail', { id: film.id, embedSrc, validId });

  return `<section class="page-section detail">
    <a class="back-link" href="${toUrl('/films')}" data-link="/films">back</a>
    <div class="player-wrap" data-player-wrap data-film-id="${film.id}" data-state="${validId ? 'embed' : 'fallback'}">
      <div class="player-ratio">
        ${
          validId
            ? `<iframe key="${film.id}" data-film-iframe data-film-id="${film.id}" src="${embedSrc}" title="${lower(
                film.title
              )}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
            : filmFallbackView(film, 'invalid id')
        }
      </div>
    </div>
    <h1>${lower(film.title)}</h1>
    <p>${lower(film.statement)}</p>
    <p class="meta">${lower(film.year)} · ${lower(film.runtime)} · ${lower(film.role)}</p>
  </section>`;
}

function filmFallbackView(film, reason) {
  const thumb = renderYouTubeThumbnail({ id: film.id, alt: `${lower(film.title)} thumbnail` });
  const safeReason = lower(reason || 'embed failed');
  return `<div class="film-fallback" data-film-fallback data-reason="${safeReason}">
    ${thumb}
    <div class="film-fallback-copy">
      <p>this video can’t be embedded. watch on youtube.</p>
      <a class="quiet-btn" target="_blank" rel="noopener noreferrer" href="${buildWatchUrl(film.id)}">watch on youtube</a>
    </div>
  </div>`;
}

function writingContentHtml(item) {
  return item.content
    .split('\n\n')
    .map((paragraph) => `<p>${lower(paragraph)}</p>`)
    .join('');
}

function writingsView() {
  return `<section class="page-section writings" data-ambient-shift>
    <h1>writings</h1>
    <div class="writing-grid">
      ${WRITINGS.map(writingCard).join('')}
    </div>
  </section>`;
}

function writingDetailView(slug) {
  const item = WRITINGS.find((entry) => entry.slug === slug);
  if (!item) return `<section class="page-section"><h1>writing not found</h1></section>`;
  return `<section class="page-section writing-detail">
    <a class="back-link" href="${toUrl('/writings')}" data-link="/writings">back</a>
    <h1>${lower(item.title)}</h1>
    <article>
      ${writingContentHtml(item)}
    </article>
  </section>`;
}

function render() {
  if (!app) return;
  const route = routeFromLocation();
  app.classList.remove('visible');

  let html = '';
  if (route.page === 'home') html = homeView();
  if (route.page === 'films') html = filmsView();
  if (route.page === 'film') html = filmDetailView(route.id);
  if (route.page === 'writings') html = writingsView();
  if (route.page === 'writing') html = writingDetailView(route.slug);

  app.innerHTML = html;
  document.body.classList.toggle('home-page', route.page === 'home');
  updateActiveNav(route.page);
  bindDynamicInteractions();

  requestAnimationFrame(() => app.classList.add('visible'));

  if (window.location.hash === '#about') {
    const about = document.querySelector('#about');
    about?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
}

function updateActiveNav(page) {
  document.querySelectorAll('.site-nav a[data-link], .brand[data-link]').forEach((link) => {
    const target = link.getAttribute('data-link') || '';
    const active =
      (page === 'home' && target === '/') ||
      (page === 'films' && target === '/films') ||
      (page === 'film' && target.startsWith('/films')) ||
      (page === 'writings' && target.startsWith('/writings')) ||
      (page === 'writing' && target.startsWith('/writings'));
    link.classList.toggle('is-active', active);
  });
}

function bindDynamicInteractions() {
  applyScrollDissolve();
  initYouTubeThumbnailFallbacks();

  const slateButton = document.querySelector('[data-slate-action]');
  slateButton?.addEventListener('click', () => {
    advanceSlateTake();
    syncSlateMetaUI();
    if (!reduceMotion) {
      animateSlateValue('take');
      if (SLATE_META.take === SLATE_META.takeRange[0]) animateSlateValue('roll');
    }
    const slate = document.querySelector('[data-slate]');
    slate?.classList.remove('clap');
    void slate?.offsetWidth;
    slate?.classList.add('clap');
    document.body.classList.add('slate-flash');
    window.setTimeout(() => document.body.classList.remove('slate-flash'), reduceMotion ? 0 : 420);
    window.setTimeout(() => {
      const filmsSection = document.querySelector('#films');
      filmsSection?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }, reduceMotion ? 0 : 420);
  });

  const toggle = document.querySelector('[data-toggle-home]');
  toggle?.addEventListener('click', () => {
    homeExpanded = !homeExpanded;
    render();
    const filmsSection = document.querySelector('#films');
    filmsSection?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  const writingToggle = document.querySelector('[data-toggle-home-writings]');
  writingToggle?.addEventListener('click', () => {
    homeWritingsExpanded = !homeWritingsExpanded;
    render();
    const writingsSection = document.querySelector('.home-writings');
    writingsSection?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  const quote = document.querySelector('[data-pull-quote]');
  if (quote) quote.remove();

  setupSlateLightSeed();

  document.querySelectorAll('.film-link').forEach((link) => {
    const preview = link.dataset.preview;
    if (preview) {
      link.style.setProperty('--preview-image', `url("${preview}")`);
      link.style.backgroundImage = `var(--preview-image)`;
      link.style.backgroundSize = 'cover';
      link.style.backgroundPosition = 'center';
    }

    let sharpenTimer = 0;
    link.addEventListener('mouseenter', () => {
      sharpenTimer = window.setTimeout(() => {
        link.classList.add('hover-settled');
      }, reduceMotion ? 0 : 150);
    });
    link.addEventListener('mouseleave', () => {
      window.clearTimeout(sharpenTimer);
      link.classList.remove('hover-settled');
    });
  });

  setupFilmEmbedFallback();
}

function initYouTubeThumbnailFallbacks() {
  document.querySelectorAll('img[data-youtube-thumb="1"]').forEach((img) => {
    const id = String(img.dataset.youtubeId || '').trim();
    const list = thumbCandidates(id);
    if (!list.length) return;

    const currentId = img.dataset.activeYoutubeId || '';
    if (currentId !== id) {
      img.dataset.activeYoutubeId = id;
      img.dataset.thumbIndex = '0';
      img.dataset.thumbKey = `${id}-0`;
      img.dataset.thumbs = list.join('|');
      img.removeAttribute('src');
      img.dataset.thumbResolved = '0';
    }

    if (img.dataset.thumbResolved === '1') return;

    const tryThumb = (index) => {
      const activeList = (img.dataset.thumbs || '').split('|').filter(Boolean);
      const candidate = activeList[index];
      if (!candidate) {
        img.dataset.thumbResolved = '1';
        return;
      }

      const probe = new Image();
      probe.onload = () => {
        img.dataset.thumbIndex = String(index);
        img.dataset.thumbKey = `${id}-${index}`;
        img.src = candidate;
        img.dataset.thumbResolved = '1';
      };
      probe.onerror = () => {
        tryThumb(index + 1);
      };
      probe.src = candidate;
    };

    tryThumb(Number(img.dataset.thumbIndex || 0));
  });
}

function setupSlateLightSeed() {
  const slate = document.querySelector('[data-slate]');
  if (!slate || reduceMotion) return;

  const driftX = ((Math.random() * 8) - 4).toFixed(2);
  const driftY = ((Math.random() * 6) - 3).toFixed(2);
  const delayA = (Math.random() * -7).toFixed(2);
  const delayB = (Math.random() * -11).toFixed(2);
  const delayC = (Math.random() * -9).toFixed(2);
  slate.style.setProperty('--slate-drift-x', `${driftX}%`);
  slate.style.setProperty('--slate-drift-y', `${driftY}%`);
  slate.style.setProperty('--slate-delay-a', `${delayA}s`);
  slate.style.setProperty('--slate-delay-b', `${delayB}s`);
  slate.style.setProperty('--slate-delay-c', `${delayC}s`);
}

function setupFilmEmbedFallback() {
  const wrap = document.querySelector('[data-player-wrap]');
  const iframe = document.querySelector('[data-film-iframe]');
  if (!wrap) return;

  const id = wrap.dataset.filmId || '';
  const film = FILMS.find((item) => item.id === id);
  if (!film) return;

  if (!isValidVideoId(id)) {
    wrap.dataset.state = 'fallback';
    logDev('fallback triggered', { id, reason: 'invalid id' });
    return;
  }

  if (!iframe) {
    wrap.dataset.state = 'fallback';
    replaceEmbedWithFallback(wrap, film, 'missing iframe');
    logDev('fallback triggered', { id, reason: 'missing iframe' });
    return;
  }

  let settled = false;
  const timeoutId = window.setTimeout(() => {
    if (settled) return;
    settled = true;
    replaceEmbedWithFallback(wrap, film, 'timeout');
    logDev('fallback triggered', { id, reason: 'timeout' });
  }, EMBED_LOAD_TIMEOUT_MS);

  iframe.addEventListener('load', () => {
    if (settled) return;
    settled = true;
    wrap.dataset.state = 'embed';
    window.clearTimeout(timeoutId);
    logDev('embed loaded', { id, src: iframe.src });
  });

  iframe.addEventListener('error', () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);
    replaceEmbedWithFallback(wrap, film, 'iframe error');
    logDev('fallback triggered', { id, reason: 'iframe error' });
  });
}

function replaceEmbedWithFallback(wrap, film, reason) {
  wrap.dataset.state = 'fallback';
  const ratio = wrap.querySelector('.player-ratio');
  if (!ratio) return;
  ratio.innerHTML = filmFallbackView(film, reason);
}

function setupNavigation() {
  document.body.addEventListener('click', (event) => {
    const link = event.target.closest('[data-link]');
    if (link) {
      event.preventDefault();
      const path = link.getAttribute('data-link') || '/';
      history.pushState({}, '', toUrl(path));
      window.scrollTo({ top: 0, behavior: 'auto' });
      render();
      return;
    }

    const aboutLink = event.target.closest('[data-about-link]');
    if (!aboutLink) return;
    event.preventDefault();

    if (routeFromLocation().page === 'home') {
      document.querySelector('#about')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      return;
    }

    history.pushState({}, '', toUrl('/', '#about'));
    render();
  });

  window.addEventListener('popstate', render);
}

function setupCursor() {
  if (!cursor || isTouchDevice) {
    document.documentElement.classList.remove('cursor-hidden');
    if (cursor) cursor.style.display = 'none';
    return;
  }

  document.documentElement.classList.add('cursor-hidden');
  let raf = 0;
  let x = 0;
  let y = 0;

  window.addEventListener('mousemove', (event) => {
    x = event.clientX;
    y = event.clientY;
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      cursor.style.transform = `translate(${x}px, ${y}px)`;
      raf = 0;
    });
  });

  document.addEventListener('pointerover', (event) => {
    if (event.target.closest('a, button')) cursor.classList.add('active');
  });

  document.addEventListener('pointerout', (event) => {
    if (event.target.closest('a, button')) cursor.classList.remove('active');
  });
}

function setupAmbientDrift() {
  if (reduceMotion || isTouchDevice || !ambientLeak) return;

  window.addEventListener('mousemove', (event) => {
    ambientMotion.tx = event.clientX;
    ambientMotion.ty = event.clientY;
  });

  const loop = () => {
    ambientMotion.x += (ambientMotion.tx - ambientMotion.x) * 0.045;
    ambientMotion.y += (ambientMotion.ty - ambientMotion.y) * 0.045;
    const nx = ambientMotion.x / window.innerWidth;
    const ny = ambientMotion.y / window.innerHeight;
    document.documentElement.style.setProperty('--leak-x', `${(nx * 100).toFixed(2)}vw`);
    document.documentElement.style.setProperty('--leak-y', `${(ny * 100).toFixed(2)}vh`);
    document.documentElement.style.setProperty('--float-x', `${((nx - 0.5) * 8).toFixed(2)}px`);
    document.documentElement.style.setProperty('--float-y', `${((ny - 0.5) * 10).toFixed(2)}px`);
    ambientRaf = window.requestAnimationFrame(loop);
  };

  if (!ambientRaf) ambientRaf = window.requestAnimationFrame(loop);
}

function applyScrollDissolve() {
  if (reduceMotion) return;
  const sections = document.querySelectorAll('.slate-wrap, .home-films, .about, .page-section');
  if (!sections.length) return;
  const viewportCenter = window.innerHeight * 0.5;
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const center = rect.top + rect.height * 0.5;
    const distance = Math.min(1, Math.abs(viewportCenter - center) / window.innerHeight);
    section.style.setProperty('--section-dissolve', distance.toFixed(2));
  });
}

function updateAmbientMood(mood) {
  if (!ambientLeak) return;
  if (mood === 'lilac') {
    document.documentElement.style.setProperty('--leak-opacity', '0.34');
    document.documentElement.style.setProperty('--fog-blur', '54px');
    return;
  }
  if (mood === 'blue') {
    document.documentElement.style.setProperty('--leak-opacity', '0.26');
    document.documentElement.style.setProperty('--fog-blur', '62px');
    return;
  }
  document.documentElement.style.setProperty('--leak-opacity', mood ? '0.3' : '0.28');
  document.documentElement.style.setProperty('--fog-blur', '46px');
}

setupNavigation();
setupCursor();
setupAmbientDrift();
window.addEventListener('scroll', () => window.requestAnimationFrame(applyScrollDissolve), { passive: true });
render();
