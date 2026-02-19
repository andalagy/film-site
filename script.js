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
  status: 'in post',
  takeRange: [1, 12]
};

const SLATE_PRIMARY_FIELDS = ['scene', 'take', 'roll', 'status'];

const SLATE_LIGHT_SEED = {
  driftX: ((Math.random() * 6) - 3).toFixed(2),
  driftY: ((Math.random() * 4) - 2).toFixed(2),
  delayA: (Math.random() * -7).toFixed(2),
  delayB: (Math.random() * -11).toFixed(2),
  delayC: (Math.random() * -9).toFixed(2)
};

const WHISPER_LINES = [
  'the frame remembers what the cut forgets.',
  'light keeps a second memory in the corners.',
  'every silence is still moving.'
];

// tuning
// TRAIL_OPACITY, TEXT_FLOAT_OPACITY, MOTE_COUNT, FLICKER_OPACITY, TRANSITION_MS
const DREAM_TUNING = {
  TRAIL_OPACITY: 0.34,
  TEXT_FLOAT_OPACITY: {
    desktop: [0.04, 0.1],
    mobile: [0.03, 0.07]
  },
  MOTE_COUNT: [10, 22],
  FLICKER_OPACITY: [0.08, 0.16],
  TRANSITION_MS: 560
};

const FLOATING_TEXT_SNIPPETS = [
  'a room before the story',
  'light moves without meaning',
  'don’t explain it',
  'something is missing',
  'the cut arrives late',
  'you can hear the silence',
  'memory is a camera',
  'the ending stays',
  'the frame waits',
  'a quiet afterimage',
  'nothing resolves here',
  'the room keeps listening',
  'time slips sideways',
  'the scene keeps breathing'
];

const app = document.querySelector('#app');
const cursor = document.querySelector('.cursor');
const dreamStack = document.querySelector('.dream-stack');
const whisperLine = document.querySelector('[data-whisper]');
const filmGate = document.querySelector('[data-film-gate]');
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let ambientRaf = 0;
let fogRaf = 0;
let routeTransitionToken = 0;
let headingBreathObserver = null;
let memorySubtitleObserver = null;
let slateMiniObserver = null;
let memorySubtitleFadeTimeout = 0;
let activeMemoryLine = '';
let filmGateTimer = 0;
let floatingTextNearTimer = 0;
const ambientMotion = {
  tx: window.innerWidth * 0.5,
  ty: window.innerHeight * 0.4,
  x: window.innerWidth * 0.5,
  y: window.innerHeight * 0.4
};
const fogPointer = {
  tx: window.innerWidth * 0.5,
  ty: window.innerHeight * 0.5,
  x: window.innerWidth * 0.5,
  y: window.innerHeight * 0.5
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


function currentSlateValues() {
  return {
    scene: lower(SLATE_META.scene),
    take: pad2(SLATE_META.take),
    roll: `${lower(SLATE_META.rollPrefix)}${pad2(SLATE_META.roll)}`,
    status: lower(SLATE_META.status)
  };
}

function slateMetaMarkup() {
  const values = currentSlateValues();
  const primaryFields = SLATE_PRIMARY_FIELDS.map((label) => [label, values[label]]);
  return `<dl class="slate-meta" aria-label="slate metadata">${primaryFields
    .map(
      ([label, value]) =>
        `<div class="slate-meta-item"><dt>${label}</dt><dd class="slate-meta-value" data-slate-value="${label}">${value}</dd></div>`
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
  const valueNodes = document.querySelectorAll(`[data-slate-value="${label}"]`);
  valueNodes.forEach((valueNode) => {
    valueNode.classList.remove('is-updating');
    void valueNode.offsetWidth;
    valueNode.classList.add('is-updating');
  });
}

function syncSlateMetaUI() {
  const values = currentSlateValues();
  Object.entries(values).forEach(([label, value]) => {
    document.querySelectorAll(`[data-slate-value="${label}"]`).forEach((valueNode) => {
      valueNode.textContent = value;
    });
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

function cleanVideoId(id) {
  const raw = String(id || '').trim();
  if (isValidVideoId(raw)) return raw;

  const utils = window.YouTubeUtils;
  if (utils?.extractYouTubeVideoId) {
    const extracted = utils.extractYouTubeVideoId(raw);
    if (isValidVideoId(extracted)) return extracted;
  }

  const cleaned = raw.split(/[?&#/]/)[0];
  return isValidVideoId(cleaned) ? cleaned : '';
}

function buildEmbedSrc(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

function buildWatchUrl(id) {
  const safeId = cleanVideoId(id);
  return `https://www.youtube.com/watch?v=${safeId}`;
}

function thumbCandidates(id) {
  const safeId = cleanVideoId(id);
  if (!safeId) return [];
  return [`https://img.youtube.com/vi/${encodeURIComponent(safeId)}/hqdefault.jpg`];
}

function renderYouTubeThumbnail({ id, alt, className = '', loading = 'lazy' }) {
  const safeId = cleanVideoId(id);
  if (!safeId) return `<div class="thumb-placeholder" role="img" aria-label="${alt}"></div>`;
  const classes = className ? ` class="${className}"` : '';
  return `<img${classes} src="" alt="${alt}" loading="${loading}" data-youtube-thumb="1" data-youtube-id="${safeId}" />`;
}

function filmDetailPath(id) {
  const safeId = cleanVideoId(id);
  return `/films/${encodeURIComponent(safeId)}`;
}

function filmCard(film) {
  const cleanId = cleanVideoId(film.youtubeId);
  if (!cleanId) return '';
  const filmPath = filmDetailPath(cleanId);
  return workCard({
    href: filmPath,
    title: film.title,
    description: film.statement,
    mediaMarkup: renderYouTubeThumbnail({ id: cleanId, alt: `${lower(film.title)} thumbnail`, className: 'film-image' }),
    cardClass: 'film-card'
  });
}

window.APP_DATA = {
  films: FILMS,
  writings: WRITINGS
};

function writingDetailPath(slug) {
  return `/writings/${encodeURIComponent(slug)}`;
}

const WRITINGS_HERO_IMAGE =
  'linear-gradient(180deg, rgba(18, 19, 23, 0.75), rgba(10, 10, 13, 0.95))';

function writingCard(item, index = 0) {
  const writingPath = writingDetailPath(item.slug);
  const sliceIndexDesktop = ((index % 4) + 4) % 4;
  const sliceIndexTablet = ((index % 2) + 2) % 2;
  const coverImage = item.cover || item.coverImage || WRITINGS_HERO_IMAGE;
  const mediaMarkup = `<div class="writing-composite-cover" aria-hidden="true" style="--slice-index-4:${sliceIndexDesktop};--slice-index-2:${sliceIndexTablet};--writings-hero-image:${coverImage};">
      <span class="writing-haze"></span>
    </div>`;

  return workCard({
    href: writingPath,
    title: item.title,
    description: item.excerpt,
    mediaMarkup,
    cardClass: 'writing-card'
  });
}

function workCard({ href, title, description, mediaMarkup, cardClass = '' }) {
  const subtitle = lower(description || '').trim();
  return `<article class="work-card ${cardClass}">
    <a href="${toUrl(href)}" data-link="${href}" class="work-card-link" data-echo-target aria-label="${lower(title)}">
      <div class="work-tile">
        ${mediaMarkup}
      </div>
      <h3 class="work-title">${lower(title)}</h3>
      ${subtitle ? `<p class="work-subtitle">${subtitle}</p>` : ''}
    </a>
  </article>`;
}

function aboutBlock() {
  return `<section id="about" class="about">
    <h2 data-breath-heading>about</h2>
    <p class="thesis">i am a filmmaker and writer drawn to memory, silence, and unresolved feeling. the work leans toward atmosphere over explanation, and keeps meaning slightly out of reach.</p>
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
  const shown = FILMS.slice(0, 4);
  const shownWritings = WRITINGS.slice(0, 4);
  return `<section class="slate-wrap" id="slate">
      <article class="slate" data-slate>
        <span class="slate-glow" aria-hidden="true"></span>
        <h1 data-glitch="andrew yan">andrew yan</h1>
        <p class="memory-subtitle" data-memory-subtitle aria-live="polite">a room before the story</p>
        <p>the world forgetting, the world forgot.</p>
        ${slateMetaMarkup()}
      </article>
    </section>
    <article class="slate-mini" data-slate-mini hidden aria-hidden="true">
      <p class="slate-mini-title">andrew yan</p>
      ${slateMetaMarkup()}
    </article>
    <section id="films" class="home-films">
      <div class="heading-row">
        <h2 data-breath-heading>films</h2>
      </div>
      <div class="film-grid">${shown.map(filmCard).join('')}</div>
      <a class="quiet-btn section-cta" href="${toUrl('/films')}" data-link="/films">${LIST_CTA_LABEL} →</a>
    </section>
    <section class="home-writings">
      <div class="heading-row">
        <h2 data-breath-heading>writings</h2>
      </div>
      <div class="writing-grid">
        ${shownWritings.map(writingCard).join('')}
      </div>
      <a class="quiet-btn section-cta" href="${toUrl('/writings')}" data-link="/writings">${LIST_CTA_LABEL} →</a>
    </section>
    ${aboutBlock()}`;
}

function filmFallbackView(film, reason) {
  const thumb = renderYouTubeThumbnail({ id: film.youtubeId, alt: `${lower(film.title)} thumbnail` });
  const safeReason = lower(reason || 'embed failed');
  return `<div class="film-fallback" data-film-fallback data-reason="${safeReason}">
    ${thumb}
    <div class="film-fallback-copy">
      <p>this video can’t be embedded. watch on youtube.</p>
      <a class="quiet-btn" target="_blank" rel="noopener noreferrer" href="${buildWatchUrl(film.youtubeId)}">watch on youtube</a>
    </div>
  </div>`;
}

window.AppUtils = {
  toUrl,
  lower,
  cleanVideoId,
  isValidVideoId,
  buildEmbedSrc,
  filmFallbackView,
  filmCard,
  writingCard,
  logDev
};

async function render() {
  const currentToken = ++routeTransitionToken;
  if (!app) return;
  const route = routeFromLocation();

  const runTransition = !reduceMotion;
  if (runTransition && app.innerHTML.trim()) {
    app.classList.remove('visible');
    app.classList.add('is-transitioning');
    await new Promise((resolve) => window.setTimeout(resolve, DREAM_TUNING.TRANSITION_MS));
    if (currentToken !== routeTransitionToken) return;
  }

  let html = '';
  if (route.page === 'home') html = homeView();
  if (route.page === 'films') html = window.WorkPages?.filmsView?.() || '';
  if (route.page === 'film') html = window.WorkPages?.filmDetailView?.(route.id) || '';
  if (route.page === 'writings') html = window.WorkPages?.writingsView?.() || '';
  if (route.page === 'writing') html = window.WorkPages?.writingDetailView?.(route.slug) || '';

  app.innerHTML = html;
  document.body.classList.toggle('home-page', route.page === 'home');
  updateActiveNav(route.page);
  bindDynamicInteractions();

  requestAnimationFrame(() => {
    if (currentToken !== routeTransitionToken) return;
    app.classList.remove('is-transitioning');
    app.classList.add('visible');
  });

  if (window.location.hash === '#about') scrollToAnchorId('about');
  if (window.location.hash === '#films') scrollToAnchorId('films');
}

function scrollToAnchorId(id, attempt = 0) {
  const target = document.getElementById(id);
  if (!target) {
    if (attempt < 1) {
      window.setTimeout(() => scrollToAnchorId(id, attempt + 1), 100);
    }
    return;
  }

  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

function clapSlateAndAdvanceMeta() {
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
}

function handleSlateInteract() {
  clapSlateAndAdvanceMeta();

  const proceed = () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  if (routeFromLocation().page === 'home') {
    window.setTimeout(proceed, reduceMotion ? 0 : 420);
    return;
  }

  history.pushState({}, '', toUrl('/'));
  render();
  window.setTimeout(proceed, reduceMotion ? 0 : 420);
}

function setupPersistentSlate() {
  if (slateMiniObserver) {
    slateMiniObserver.disconnect();
    slateMiniObserver = null;
  }

  const heroSlate = document.querySelector('[data-slate]');
  const miniSlate = document.querySelector('[data-slate-mini]');
  if (!heroSlate || !miniSlate || routeFromLocation().page !== 'home') return;

  miniSlate.addEventListener('click', handleSlateInteract);

  const updateMiniSlate = (showMini) => {
    miniSlate.hidden = !showMini;
    miniSlate.setAttribute('aria-hidden', showMini ? 'false' : 'true');
    miniSlate.classList.toggle('is-visible', showMini);
  };

  if (window.matchMedia('(max-width: 640px)').matches) {
    updateMiniSlate(false);
    return;
  }

  slateMiniObserver = new IntersectionObserver(
    ([entry]) => {
      updateMiniSlate(!entry.isIntersecting);
    },
    { threshold: 0.25 }
  );

  slateMiniObserver.observe(heroSlate);
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

  const slate = document.querySelector('[data-slate]');
  slate?.addEventListener('click', handleSlateInteract);

  const quote = document.querySelector('[data-pull-quote]');
  if (quote) quote.remove();

  setupSlateLightSeed();
  setupClickEcho();
  setupWhisperPulse();
  setupHeadingBreath();
  setupMemorySubtitle();
  setupHoverDust();
  setupPersistentSlate();

  setupFilmEmbedFallback();
}

function initYouTubeThumbnailFallbacks() {
  document.querySelectorAll('img[data-youtube-thumb="1"]').forEach((img) => {
    const id = String(img.dataset.youtubeId || '').trim();
    const list = thumbCandidates(id);
    if (!list.length) return;

    const selected = list[0];
    if (img.getAttribute('src') !== selected) {
      img.src = selected;
    }
  });
}

function setupSlateLightSeed() {
  const slate = document.querySelector('[data-slate]');
  if (!slate || reduceMotion) return;

  slate.style.setProperty('--slate-drift-x', `${SLATE_LIGHT_SEED.driftX}%`);
  slate.style.setProperty('--slate-drift-y', `${SLATE_LIGHT_SEED.driftY}%`);
  slate.style.setProperty('--slate-delay-a', `${SLATE_LIGHT_SEED.delayA}s`);
  slate.style.setProperty('--slate-delay-b', `${SLATE_LIGHT_SEED.delayB}s`);
  slate.style.setProperty('--slate-delay-c', `${SLATE_LIGHT_SEED.delayC}s`);
}

function setupFilmEmbedFallback() {
  const wrap = document.querySelector('[data-player-wrap]');
  const iframe = document.querySelector('[data-film-iframe]');
  if (!wrap) return;

  const id = cleanVideoId(wrap.dataset.filmId || '');
  const film = FILMS.find((item) => cleanVideoId(item.youtubeId) === id);
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
  const trailNodes = reduceMotion ? [] : createCursorTrail();
  let raf = 0;
  let x = 0;
  let y = 0;
  let moving = false;
  let lastMoveAt = 0;
  const TRAIL_FADE_MS = 480;
  const trailPoints = trailNodes.map(() => ({ x: 0, y: 0 }));

  const runTrail = () => {
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    if (!trailNodes.length) {
      raf = 0;
      return;
    }
    const age = performance.now() - lastMoveAt;
    const fade = moving ? 1 : Math.max(0, 1 - (age / TRAIL_FADE_MS));
    trailPoints.forEach((point, index) => {
      const target = index === 0 ? { x, y } : trailPoints[index - 1];
      point.x += (target.x - point.x) * (0.24 - index * 0.025);
      point.y += (target.y - point.y) * (0.24 - index * 0.025);
      const node = trailNodes[index];
      node.style.transform = `translate(${point.x}px, ${point.y}px)`;
      node.style.opacity = String(fade * Math.max(0.12, DREAM_TUNING.TRAIL_OPACITY - index * 0.07));
    });

    if (!moving && age > TRAIL_FADE_MS) {
      raf = 0;
      return;
    }
    moving = false;
    raf = window.requestAnimationFrame(runTrail);
  };

  window.addEventListener('mousemove', (event) => {
    x = event.clientX;
    y = event.clientY;
    moving = true;
    lastMoveAt = performance.now();
    if (raf) return;
    raf = window.requestAnimationFrame(runTrail);
  });

  document.addEventListener('pointerover', (event) => {
    if (event.target.closest('a, button')) cursor.classList.add('active');
  });

  document.addEventListener('pointerout', (event) => {
    if (event.target.closest('a, button')) cursor.classList.remove('active');
  });
}

function createCursorTrail() {
  const count = 4;
  const nodes = [];
  for (let i = 0; i < count; i += 1) {
    const node = document.createElement('span');
    node.className = 'cursor-trail-dot';
    node.style.transitionDuration = `${160 + i * 45}ms`;
    document.body.appendChild(node);
    nodes.push(node);
  }
  return nodes;
}

function setupHeadingBreath() {
  if (reduceMotion) return;
  headingBreathObserver?.disconnect();
  const headings = document.querySelectorAll('[data-breath-heading], .about h2');
  if (!headings.length) return;
  headingBreathObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const heading = entry.target;
        if (entry.intersectionRatio < 0.42) {
          heading.dataset.breathReady = '1';
          heading.classList.remove('focus-breath');
          return;
        }
        if (!entry.isIntersecting || heading.dataset.breathReady !== '1') return;
        heading.classList.remove('focus-breath');
        void heading.offsetWidth;
        heading.classList.add('focus-breath');
        heading.dataset.breathReady = '0';
      });
    },
    { threshold: [0.42, 0.66] }
  );
  headings.forEach((heading) => {
    heading.dataset.breathReady = '1';
    headingBreathObserver.observe(heading);
  });
}

function setupMemorySubtitle() {
  const subtitleNode = document.querySelector('[data-memory-subtitle]');
  if (!subtitleNode) return;

  const states = {
    slate: 'a room before the story',
    films: 'images that remember',
    writings: 'words that don\'t explain',
    about: 'a person, not a pitch'
  };

  const setSubtitle = (line) => {
    if (!line || line === activeMemoryLine) return;
    activeMemoryLine = line;
    subtitleNode.classList.remove('is-visible');
    window.clearTimeout(memorySubtitleFadeTimeout);
    memorySubtitleFadeTimeout = window.setTimeout(() => {
      subtitleNode.textContent = lower(line);
      subtitleNode.classList.add('is-visible');
    }, reduceMotion ? 0 : 180);
  };

  setSubtitle(states.slate);

  if (reduceMotion) return;
  memorySubtitleObserver?.disconnect();
  const sections = [
    { node: document.getElementById('slate'), line: states.slate },
    { node: document.getElementById('films'), line: states.films },
    { node: document.querySelector('.home-writings'), line: states.writings },
    { node: document.getElementById('about'), line: states.about }
  ].filter((entry) => entry.node);
  if (!sections.length) return;

  memorySubtitleObserver = new IntersectionObserver(
    (entries) => {
      let winner = null;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (!winner || entry.intersectionRatio > winner.ratio) {
          winner = { ratio: entry.intersectionRatio, line: entry.target.dataset.memoryLine };
        }
      });
      if (winner) setSubtitle(winner.line);
    },
    { threshold: [0.25, 0.5, 0.75] }
  );

  sections.forEach((entry) => {
    entry.node.dataset.memoryLine = entry.line;
    memorySubtitleObserver.observe(entry.node);
  });
}

function queueFilmGateFlicker() {
  if (reduceMotion || !filmGate) return;
  const nextDelay = 10000 + Math.random() * 14000;
  filmGateTimer = window.setTimeout(() => {
    filmGate.style.setProperty('--flicker-opacity', (DREAM_TUNING.FLICKER_OPACITY[0] + Math.random() * (DREAM_TUNING.FLICKER_OPACITY[1] - DREAM_TUNING.FLICKER_OPACITY[0])).toFixed(3));
    filmGate.style.setProperty('--flicker-jitter', `${(Math.random() > 0.5 ? 1 : -1) * (1 + Math.random())}px`);
    filmGate.classList.add('is-flicker');
    const activeFor = 150 + Math.random() * 100;
    window.setTimeout(() => {
      filmGate.classList.remove('is-flicker');
      queueFilmGateFlicker();
    }, activeFor);
  }, nextDelay);
}

function setupFilmGateFlicker() {
  window.clearTimeout(filmGateTimer);
  if (!filmGate || reduceMotion) return;
  queueFilmGateFlicker();
}

function setupHoverDust() {
  if (reduceMotion) return;
  document.querySelectorAll('.work-tile').forEach((tile) => {
    const run = () => spawnDustMotes(tile);
    tile.addEventListener('mouseenter', run);
    tile.addEventListener('focusin', run);
  });
}

function spawnDustMotes(tile) {
  if (tile.querySelector('.dust-layer')) return;
  const layer = document.createElement('span');
  layer.className = 'dust-layer';
  const count = DREAM_TUNING.MOTE_COUNT[0] + Math.floor(Math.random() * (DREAM_TUNING.MOTE_COUNT[1] - DREAM_TUNING.MOTE_COUNT[0] + 1));
  let maxDurationMs = 0;
  for (let i = 0; i < count; i += 1) {
    const mote = document.createElement('span');
    mote.className = 'dust-mote';
    mote.style.setProperty('--dust-x', `${Math.random() * 100}%`);
    mote.style.setProperty('--dust-delay', `${(Math.random() * 260).toFixed(0)}ms`);
    const duration = 2.5 + Math.random() * 2.5;
    const driftX = -14 + Math.random() * 28;
    const driftY = -48 - Math.random() * 40;
    const size = 1 + Math.random() * 3;
    const blur = 0.5 + Math.random() * 1.5;
    const opacity = 0.12 + Math.random() * 0.1;
    mote.style.setProperty('--dust-duration', `${duration.toFixed(2)}s`);
    mote.style.setProperty('--dust-drift-x', `${driftX.toFixed(2)}px`);
    mote.style.setProperty('--dust-drift-y', `${driftY.toFixed(2)}px`);
    mote.style.setProperty('--dust-size', `${size.toFixed(2)}px`);
    mote.style.setProperty('--dust-blur', `${blur.toFixed(2)}px`);
    mote.style.setProperty('--dust-opacity', opacity.toFixed(2));
    maxDurationMs = Math.max(maxDurationMs, duration * 1000 + 260);
    layer.appendChild(mote);
  }
  tile.appendChild(layer);
  const removeLayer = () => layer.remove();
  window.setTimeout(removeLayer, Math.min(5600, maxDurationMs));
}

function randomFromRange([min, max]) {
  return min + Math.random() * (max - min);
}

function setupFloatingTextLayer() {
  const existing = document.querySelector('[data-floating-text-layer]');
  existing?.remove();
  if (!dreamStack) return;

  const layer = document.createElement('div');
  layer.className = 'floating-text-layer';
  layer.dataset.floatingTextLayer = '1';
  const mobile = window.matchMedia('(max-width: 900px)').matches;
  const count = reduceMotion
    ? 3 + Math.floor(Math.random() * 4)
    : mobile
      ? 4 + Math.floor(Math.random() * 4)
      : 6 + Math.floor(Math.random() * 9);
  const opacityRange = mobile ? DREAM_TUNING.TEXT_FLOAT_OPACITY.mobile : DREAM_TUNING.TEXT_FLOAT_OPACITY.desktop;
  const lanes = [
    { x: [2, 20], y: [16, 36] },
    { x: [3, 19], y: [64, 92] },
    { x: [80, 97], y: [18, 38] },
    { x: [80, 96], y: [62, 90] },
    { x: [4, 16], y: [40, 58] },
    { x: [84, 96], y: [40, 58] }
  ];

  for (let i = 0; i < count; i += 1) {
    const snippet = document.createElement('span');
    const lane = lanes[i % lanes.length];
    const phrase = FLOATING_TEXT_SNIPPETS[i % FLOATING_TEXT_SNIPPETS.length];
    const driftSeconds = randomFromRange([18, 55]);
    const rotate = randomFromRange([-2, 2]);
    const blur = randomFromRange([0, 1.5]);
    const depth = randomFromRange([0.3, 1]);

    snippet.className = 'floating-text-snippet';
    snippet.textContent = lower(phrase);
    snippet.style.left = `${randomFromRange(lane.x).toFixed(2)}%`;
    snippet.style.top = `${randomFromRange(lane.y).toFixed(2)}%`;
    snippet.style.setProperty('--text-opacity', randomFromRange(opacityRange).toFixed(3));
    snippet.style.setProperty('--text-rotation', `${rotate.toFixed(2)}deg`);
    snippet.style.setProperty('--text-blur', `${blur.toFixed(2)}px`);
    snippet.style.setProperty('--text-duration', `${driftSeconds.toFixed(2)}s`);
    snippet.style.setProperty('--text-depth', depth.toFixed(3));
    snippet.style.setProperty('--text-drift-x', `${randomFromRange([-18, 18]).toFixed(2)}px`);
    snippet.style.setProperty('--text-drift-y', `${randomFromRange([-24, 24]).toFixed(2)}px`);
    if (Math.random() > 0.72) snippet.style.mixBlendMode = 'screen';
    if (reduceMotion) snippet.classList.add('is-static');
    layer.appendChild(snippet);
  }

  dreamStack.appendChild(layer);
  if (reduceMotion || isTouchDevice) return;

  const snippets = Array.from(layer.querySelectorAll('.floating-text-snippet'));
  const updateShift = (event) => {
    const nx = (event.clientX / window.innerWidth) - 0.5;
    const ny = (event.clientY / window.innerHeight) - 0.5;
    snippets.forEach((snippet) => {
      const depth = Number(snippet.style.getPropertyValue('--text-depth'));
      snippet.style.setProperty('--text-shift-x', `${(nx * 12 * depth).toFixed(2)}px`);
      snippet.style.setProperty('--text-shift-y', `${(ny * 12 * depth).toFixed(2)}px`);
    });
  };

  window.addEventListener('mousemove', updateShift, { passive: true });
  window.addEventListener('mousemove', (event) => {
    window.clearTimeout(floatingTextNearTimer);
    floatingTextNearTimer = window.setTimeout(() => {
      snippets.forEach((snippet) => {
        const rect = snippet.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        const distance = Math.hypot(event.clientX - cx, event.clientY - cy);
        if (distance < 95) {
          snippet.classList.add('is-near');
          window.setTimeout(() => snippet.classList.remove('is-near'), 1000);
        }
      });
    }, 90);
  }, { passive: true });
}


function setupAmbientSeed() {
  const root = document.documentElement;
  root.style.setProperty('--gradient-jitter-a', `${((Math.random() * 12) - 6).toFixed(2)}%`);
  root.style.setProperty('--gradient-jitter-b', `${((Math.random() * 12) - 6).toFixed(2)}%`);
  root.style.setProperty('--leak-spin', `${((Math.random() * 4) - 2).toFixed(2)}deg`);
  root.style.setProperty('--leak-a-x', `${(Math.random() * 85).toFixed(2)}%`);
  root.style.setProperty('--leak-a-y', `${(Math.random() * 75).toFixed(2)}%`);
  root.style.setProperty('--leak-b-x', `${(Math.random() * 85).toFixed(2)}%`);
  root.style.setProperty('--leak-b-y', `${(Math.random() * 75).toFixed(2)}%`);
  root.style.setProperty('--leak-a-delay', `${(Math.random() * -30).toFixed(2)}s`);
  root.style.setProperty('--leak-b-delay', `${(Math.random() * -32).toFixed(2)}s`);
}

function setupAmbientDrift() {
  if (reduceMotion || isTouchDevice || !dreamStack) return;

  window.addEventListener('mousemove', (event) => {
    ambientMotion.tx = event.clientX;
    ambientMotion.ty = event.clientY;
  }, { passive: true });

  const loop = () => {
    ambientMotion.x += (ambientMotion.tx - ambientMotion.x) * 0.045;
    ambientMotion.y += (ambientMotion.ty - ambientMotion.y) * 0.045;
    const nx = ambientMotion.x / window.innerWidth;
    const ny = ambientMotion.y / window.innerHeight;
    document.documentElement.style.setProperty('--float-x', `${((nx - 0.5) * 5).toFixed(2)}px`);
    document.documentElement.style.setProperty('--float-y', `${((ny - 0.5) * 5).toFixed(2)}px`);
    document.documentElement.style.setProperty('--parallax-x', `${((nx - 0.5) * 8).toFixed(2)}px`);
    document.documentElement.style.setProperty('--parallax-y', `${((ny - 0.5) * 8).toFixed(2)}px`);
    ambientRaf = window.requestAnimationFrame(loop);
  };

  if (!ambientRaf) ambientRaf = window.requestAnimationFrame(loop);
}

function setupFogRevealTracking() {
  const root = document.documentElement;
  root.style.setProperty('--mx', `${fogPointer.x}px`);
  root.style.setProperty('--my', `${fogPointer.y}px`);

  if (reduceMotion || isTouchDevice) return;

  window.addEventListener(
    'mousemove',
    (event) => {
      fogPointer.tx = event.clientX;
      fogPointer.ty = event.clientY;
    },
    { passive: true }
  );

  const loop = () => {
    fogPointer.x += (fogPointer.tx - fogPointer.x) * 0.12;
    fogPointer.y += (fogPointer.ty - fogPointer.y) * 0.12;
    root.style.setProperty('--mx', `${fogPointer.x.toFixed(2)}px`);
    root.style.setProperty('--my', `${fogPointer.y.toFixed(2)}px`);
    fogRaf = window.requestAnimationFrame(loop);
  };

  if (!fogRaf) fogRaf = window.requestAnimationFrame(loop);
}


function setupClickEcho() {
  document.querySelectorAll('.echo-ring').forEach((ring) => ring.remove());
  document.querySelectorAll('[data-echo-target]').forEach((target) => {
    target.addEventListener('click', (event) => {
      const rect = target.getBoundingClientRect();
      const ring = document.createElement('span');
      ring.className = 'echo-ring';
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      ring.style.setProperty('--echo-x', `${x}px`);
      ring.style.setProperty('--echo-y', `${y}px`);
      target.appendChild(ring);
      window.setTimeout(() => ring.remove(), 520);
    }, { passive: true });
  });
}

function setupWhisperPulse() {
  if (!whisperLine) return;
  if (reduceMotion) {
    whisperLine.textContent = '';
    return;
  }

  let index = Math.floor(Math.random() * WHISPER_LINES.length);
  const swapLine = () => {
    index = (index + 1) % WHISPER_LINES.length;
    whisperLine.classList.remove('is-visible');
    window.setTimeout(() => {
      whisperLine.textContent = lower(WHISPER_LINES[index]);
      whisperLine.classList.add('is-visible');
    }, 900);
  };

  whisperLine.textContent = lower(WHISPER_LINES[index]);
  whisperLine.classList.add('is-visible');
  if (!whisperLine.dataset.bound) {
    whisperLine.dataset.bound = '1';
    window.setInterval(swapLine, 15000 + Math.floor(Math.random() * 5000));
  }
}

function applyScrollDissolve() {
  if (reduceMotion) return;
  const sections = document.querySelectorAll('.slate-wrap, .home-films, .home-writings, .about, .page-section');
  if (!sections.length) return;
  const viewportCenter = window.innerHeight * 0.5;
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const center = rect.top + rect.height * 0.5;
    const distance = Math.min(1, Math.abs(viewportCenter - center) / window.innerHeight);
    section.style.setProperty('--section-dissolve', distance.toFixed(2));
  });
}

setupNavigation();
setupCursor();
setupAmbientSeed();
setupAmbientDrift();
setupFogRevealTracking();
setupFloatingTextLayer();
setupFilmGateFlicker();
window.addEventListener('scroll', () => window.requestAnimationFrame(applyScrollDissolve), { passive: true });
render();
