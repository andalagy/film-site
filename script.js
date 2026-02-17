const APP_BASE_PATH = '/andalagy';
const FILMS = Array.isArray(window.FILMS_DATA) ? window.FILMS_DATA : [];
const WRITINGS = Array.isArray(window.WRITINGS_DATA) ? window.WRITINGS_DATA : [];
const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const EMBED_LOAD_TIMEOUT_MS = 3200;

const app = document.querySelector('#app');
const cursor = document.querySelector('.cursor');
const ambientLeak = document.querySelector('.ambient-leak');
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let homeExpanded = false;
let activeWritingSlug = '';
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
        <img src="${thumbs[0]}" alt="${lower(film.title)} thumbnail" data-thumbs="${thumbs.join('|')}" data-thumb-index="0" loading="lazy" />
        <span class="film-overlay">
          <span>${lower(film.statement)}</span>
          <small>${lower(details)}</small>
        </span>
      </a>
      <h3 data-title="${lower(film.title)}">${lower(film.title)}</h3>
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
      <a href="https://www.instagram.com/andrewyyan/" target="_blank" rel="noopener noreferrer" aria-label="instagram">instagram</a>
      ·
      <a href="https://www.youtube.com/@AndrewYan-z8d" target="_blank" rel="noopener noreferrer" aria-label="youtube">youtube</a>
    </p>
  </section>`;
}

function homeView() {
  const shown = homeExpanded ? FILMS : FILMS.slice(0, 4);
  const writingPreview = WRITINGS.slice(0, 3);
  return `<section class="slate-wrap" id="slate">
      <article class="slate" data-slate>
        <span class="slate-glow" aria-hidden="true"></span>
        <p>director's slate</p>
        <h1>andrew yan</h1>
        <p>minimal, atmospheric films about memory, tension, and what remains unsaid.</p>
        <button class="quiet-btn" data-slate-action>enter</button>
      </article>
    </section>
    <section id="films" class="home-films">
      <div class="heading-row">
        <h2>work</h2>
      </div>
      <div class="film-grid">${shown.map(filmCard).join('')}</div>
      <button class="quiet-btn" data-toggle-home>${homeExpanded ? 'show less' : 'show more'}</button>
    </section>
    <section class="home-writings">
      <div class="heading-row">
        <h2>writings</h2>
      </div>
      <div class="writing-preview-list">
        ${writingPreview
          .map(
            (item) => `<a class="writing-preview-item" href="${toUrl(`/writings?work=${encodeURIComponent(item.slug)}`)}" data-link="/writings?work=${encodeURIComponent(item.slug)}">
              <h3>${lower(item.title)}</h3>
              <p>${lower(item.excerpt)}</p>
            </a>`
          )
          .join('')}
      </div>
      <a class="view-all-link" href="${toUrl('/writings')}" data-link="/writings">view all writings</a>
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
  const thumb = thumbCandidates(film.id)[0];
  const safeReason = lower(reason || 'embed failed');
  return `<div class="film-fallback" data-film-fallback data-reason="${safeReason}">
    <img src="${thumb}" alt="${lower(film.title)} thumbnail" loading="lazy" />
    <div class="film-fallback-copy">
      <p>this video can’t be embedded. watch on youtube.</p>
      <a class="quiet-btn" target="_blank" rel="noopener noreferrer" href="${buildWatchUrl(film.id)}">watch on youtube</a>
    </div>
  </div>`;
}

function getRequestedWritingSlug(routeSlug = '') {
  const fromRoute = routeSlug && WRITINGS.find((entry) => entry.slug === routeSlug) ? routeSlug : '';
  const query = new URLSearchParams(window.location.search);
  const fromQuery = query.get('work') || '';
  const fromHash = decodeURIComponent(window.location.hash.replace('#', ''));
  if (WRITINGS.find((entry) => entry.slug === fromRoute)) return fromRoute;
  if (WRITINGS.find((entry) => entry.slug === fromQuery)) return fromQuery;
  if (WRITINGS.find((entry) => entry.slug === fromHash)) return fromHash;
  return WRITINGS[0]?.slug || '';
}

function writingContentHtml(item) {
  return item.content
    .split('\n\n')
    .map((paragraph) => `<p>${lower(paragraph)}</p>`)
    .join('');
}

function writingsView(routeSlug = '') {
  const selectedSlug = getRequestedWritingSlug(routeSlug);
  const selected = WRITINGS.find((entry) => entry.slug === selectedSlug) || WRITINGS[0];
  activeWritingSlug = selected?.slug || '';

  return `<section class="page-section writings" data-ambient-shift>
    <h1>writings</h1>
    <div class="writings-layout">
      <div class="writing-list" data-writing-list>
      ${WRITINGS.map(
        (item, index) => `<button class="writing-item ${item.slug === activeWritingSlug ? 'is-selected' : ''}" data-writing-select="${item.slug}" data-excerpt="${lower(item.excerpt)}" data-mood="${['amber', 'lilac', 'blue'][index % 3]}">
          <h2>${lower(item.title)}</h2>
          <p>${lower(item.excerpt)}</p>
        </button>`
      ).join('')}
      </div>
      <article class="writing-content" id="writing-content" data-writing-content>
        <h2 data-writing-title>${lower(selected?.title || '')}</h2>
        <div data-writing-body>${selected ? writingContentHtml(selected) : ''}</div>
      </article>
    </div>
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
  if (route.page === 'writing') html = writingsView(route.slug);

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

  document.querySelectorAll('img[data-thumbs]').forEach((img) => {
    img.addEventListener('error', () => {
      const list = (img.dataset.thumbs || '').split('|').filter(Boolean);
      const index = Number(img.dataset.thumbIndex || 0);
      const next = index + 1;
      if (!list[next]) {
        img.removeAttribute('data-thumbs');
        return;
      }
      img.dataset.thumbIndex = String(next);
      img.src = list[next];
    });
  });

  const slateButton = document.querySelector('[data-slate-action]');
  slateButton?.addEventListener('click', () => {
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

  const quote = document.querySelector('[data-pull-quote]');
  if (quote) quote.remove();

  setupWritingSelection();
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

function setupWritingSelection() {
  const writingBody = document.querySelector('[data-writing-body]');
  const writingTitle = document.querySelector('[data-writing-title]');
  if (!writingBody || !writingTitle) return;

  const selectWriting = (slug, shouldScroll = false) => {
    const item = WRITINGS.find((entry) => entry.slug === slug);
    if (!item) return;
    activeWritingSlug = item.slug;
    writingTitle.textContent = lower(item.title);
    writingBody.innerHTML = writingContentHtml(item);
    document.querySelectorAll('[data-writing-select]').forEach((button) => {
      button.classList.toggle('is-selected', button.getAttribute('data-writing-select') === slug);
    });
    updateAmbientMood(document.querySelector(`[data-writing-select="${slug}"]`)?.dataset.mood || '');
    const nextPath = `${toUrl('/writings')}?work=${encodeURIComponent(slug)}`;
    history.replaceState({}, '', nextPath);
    if (shouldScroll && window.matchMedia('(max-width: 900px)').matches) {
      document.querySelector('#writing-content')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  document.querySelectorAll('[data-writing-select]').forEach((button) => {
    button.addEventListener('click', () => selectWriting(button.getAttribute('data-writing-select') || '', true));
    button.addEventListener('mouseenter', () => updateAmbientMood(button.dataset.mood || 'amber'));
    button.addEventListener('mouseleave', () => updateAmbientMood(''));
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
