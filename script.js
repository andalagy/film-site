const APP_BASE_PATH = '/andalagy';
const FILMS = Array.isArray(window.FILMS_DATA) ? window.FILMS_DATA : [];
const WRITINGS = Array.isArray(window.WRITINGS_DATA) ? window.WRITINGS_DATA : [];

const app = document.querySelector('#app');
const cursor = document.querySelector('.cursor');
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let homeExpanded = false;

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

function thumbCandidates(id) {
  return ['maxresdefault', 'hqdefault', 'mqdefault', 'default'].map(
    (size) => `https://img.youtube.com/vi/${encodeURIComponent(id)}/${size}.jpg`
  );
}

function filmCard(film) {
  const details = `${film.year} · ${film.runtime} · ${film.role}`;
  return `<article class="film-card">
      <a href="${toUrl(`/films/${encodeURIComponent(film.id)}`)}" data-link="/films/${encodeURIComponent(film.id)}" class="film-link">
        <img src="${thumbCandidates(film.id)[0]}" alt="${lower(film.title)} thumbnail" data-thumbs="${thumbCandidates(film.id).join('|')}" data-thumb-index="0" loading="lazy" />
        <span class="film-overlay">
          <span>${lower(film.statement)}</span>
          <small>${lower(details)}</small>
        </span>
      </a>
      <h3>${lower(film.title)}</h3>
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
  return `<section class="slate-wrap" id="slate">
      <article class="slate" data-slate>
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
    ${aboutBlock()}`;
}

function filmsView() {
  return `<section class="page-section"><h1>films</h1><div class="film-grid">${FILMS.map(filmCard).join('')}</div></section>`;
}

function filmDetailView(id) {
  const film = FILMS.find((item) => item.id === id);
  if (!film) return `<section class="page-section"><h1>film not found</h1></section>`;
  return `<section class="page-section detail">
    <a class="back-link" href="${toUrl('/films')}" data-link="/films">back to films</a>
    <div class="player-wrap">
      <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        film.id
      )}" title="${lower(film.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div>
    <h1>${lower(film.title)}</h1>
    <p>${lower(film.statement)}</p>
    <p class="meta">${lower(film.year)} · ${lower(film.runtime)} · ${lower(film.role)}</p>
  </section>`;
}

function writingsView() {
  const quote = WRITINGS[0]?.excerpt || '';
  return `<section class="page-section writings">
    <h1>writings</h1>
    <p class="pull-quote" data-pull-quote>${lower(quote)}</p>
    <div class="writing-list">
      ${WRITINGS.map(
        (item) => `<article class="writing-item" data-excerpt="${lower(item.excerpt)}">
          <h2>${lower(item.title)}</h2>
          <p>${lower(item.excerpt)}</p>
          <a href="${toUrl(`/writings/${encodeURIComponent(item.slug)}`)}" data-link="/writings/${encodeURIComponent(item.slug)}">read</a>
        </article>`
      ).join('')}
    </div>
  </section>`;
}

function writingDetailView(slug) {
  const item = WRITINGS.find((entry) => entry.slug === slug);
  if (!item) return `<section class="page-section"><h1>writing not found</h1></section>`;
  return `<section class="page-section writing-detail">
    <a class="back-link" href="${toUrl('/writings')}" data-link="/writings">back to writings</a>
    <h1>${lower(item.title)}</h1>
    <article>${item.content
      .split('\n\n')
      .map((paragraph) => `<p>${lower(paragraph)}</p>`)
      .join('')}</article>
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
      (page === 'writings' && target === '/writings') ||
      (page === 'writing' && target.startsWith('/writings'));
    link.classList.toggle('is-active', active);
  });
}

function bindDynamicInteractions() {
  document.querySelectorAll('img[data-thumbs]').forEach((img) => {
    img.addEventListener('error', () => {
      const list = (img.dataset.thumbs || '').split('|').filter(Boolean);
      const index = Number(img.dataset.thumbIndex || 0);
      const next = index + 1;
      if (!list[next]) return;
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
    window.setTimeout(() => {
      const filmsSection = document.querySelector('#films');
      filmsSection?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }, reduceMotion ? 0 : 180);
  });

  const toggle = document.querySelector('[data-toggle-home]');
  toggle?.addEventListener('click', () => {
    homeExpanded = !homeExpanded;
    render();
    const filmsSection = document.querySelector('#films');
    filmsSection?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  const quote = document.querySelector('[data-pull-quote]');
  if (quote) {
    document.querySelectorAll('.writing-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        quote.style.opacity = '0';
        window.setTimeout(() => {
          quote.textContent = item.dataset.excerpt || '';
          quote.style.opacity = '1';
        }, reduceMotion ? 0 : 140);
      });
    });
  }
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

setupNavigation();
setupCursor();
render();
