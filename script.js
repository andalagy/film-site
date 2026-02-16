const films = [
  {
    title: 'northern mockingbird.',
    role: '2025 • 3 min',
    statement: 
      'finding the bird.',
    videoUrl: 'https://www.youtube.com/watch?v=4uJzOTmVHKQ'
  },
  {
    title: 'the man who waters concrete.',
    role: 'Director • 2025 • 2 min',
    statement:
      'An attempt to grow the concrete. The ending is extremely cornball, where a desperate attempt was made to save the film from bad planning.',
    videoUrl: 'https://www.youtube.com/watch?v=qaAV4v811j8'
  },
  {
    title: 'Bohemian Rhapsody',
    role: 'Director • 2025 • 15 min',
    statement:
      'A music video to portray the story behind the widely acclaimed song.',
    videoUrl: 'https://www.youtube.com/watch?v=-vp76Gp6zoI'
  },
  {
    title: 'Echoes of Tommorow',
    role: '2024 • 3 min',
    statement:
      'Or maybe in the future of stock footages.',
    videoUrl: 'https://www.youtube.com/watch?v=9pLS3b_b_oM'
  }
];

const appRouteState = {
  previousFocus: null,
  activeFilmId: null
};

function logMissingElement(name) {
  console.error(`[film-site] Required element missing: ${name}. Feature initialization was skipped safely.`);
}

function extractYouTubeId(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '').split('/')[0] || null;
    }

    const fromQuery = parsed.searchParams.get('v');
    if (fromQuery) return fromQuery;

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const embedIndex = pathParts.indexOf('embed');
    if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
      return pathParts[embedIndex + 1];
    }

    return null;
  } catch (error) {
    console.error('[film-site] Could not parse YouTube URL:', url, error);
    return null;
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getFilmByVideoId(videoId) {
  return films.find((film) => extractYouTubeId(film.videoUrl) === videoId) || null;
}

function parseVideoRoute(pathname = window.location.pathname) {
  const match = pathname.match(/^\/video\/([^/]+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function getVideoDetailContainer() {
  return document.querySelector('[data-video-detail]');
}

function ensureVideoDetailContainer() {
  let container = getVideoDetailContainer();
  if (container) return container;

  container = document.createElement('div');
  container.dataset.videoDetail = 'true';
  container.className = 'video-detail-layer';
  document.body.appendChild(container);
  return container;
}

function closeVideoDetail({ shouldNavigate = true, returnFocus = true } = {}) {
  const container = getVideoDetailContainer();
  if (!container || container.hidden) return;

  container.hidden = true;
  container.innerHTML = '';
  container.classList.remove('open');
  document.body.classList.remove('video-detail-open');
  appRouteState.activeFilmId = null;

  if (shouldNavigate && parseVideoRoute()) {
    history.pushState({}, '', '/');
  }

  if (returnFocus && appRouteState.previousFocus?.focus) {
    appRouteState.previousFocus.focus();
  }
}

function renderVideoDetailFullScreen(film, videoId) {
  return `
    <section class="video-detail" role="dialog" aria-modal="true" aria-labelledby="video-detail-title">
      <button class="video-detail-close clickable" type="button" aria-label="Close video details">
        ← Back
      </button>
      <div class="video-detail-content">
        <div class="video-detail-player-wrap">
          <iframe
            src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1"
            title="Player for ${escapeHtml(film.title)}"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
        <div class="video-detail-meta">
          <p class="eyebrow">Video Detail</p>
          <h2 id="video-detail-title">${escapeHtml(film.title)}</h2>
          <p>${escapeHtml(film.statement || 'No description available.')}</p>
          <p class="video-detail-role">${escapeHtml(film.role || 'Metadata unavailable')}</p>
        </div>
      </div>
    </section>
  `;
}

function openVideoDetail(videoId, { shouldNavigate = true, triggerElement = null } = {}) {
  const film = getFilmByVideoId(videoId);
  if (!film) {
    console.error(`[film-site] Video detail requested for unknown ID "${videoId}".`);
    return;
  }

  appRouteState.activeFilmId = videoId;
  appRouteState.previousFocus = triggerElement || document.activeElement;

  const container = ensureVideoDetailContainer();
  container.hidden = false;
  container.innerHTML = renderVideoDetailFullScreen(film, videoId);
  container.classList.add('open');
  document.body.classList.add('video-detail-open');

  const closeButton = container.querySelector('.video-detail-close');
  closeButton?.focus();

  if (shouldNavigate && parseVideoRoute() !== videoId) {
    history.pushState({ videoId }, '', `/video/${encodeURIComponent(videoId)}`);
  }
}

function createVideoCard(film) {
  const id = extractYouTubeId(film.videoUrl);
  if (!id) {
    console.error(`[film-site] Skipping film card because video ID could not be extracted for "${film.title}".`);
    return '';
  }

  const maxres = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  const hq = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

  // Preview environments sometimes load scripts before HTML is fully parsed.
  // Rendering plain markup and binding click handlers later prevents live-site race conditions.
  return `
    <article class="film-card" data-video-id="${id}">
      <div class="video-shell">
        <button class="play-video clickable" type="button" aria-label="Play ${film.title}" data-video-id="${id}">
          <img
            src="${maxres}"
            data-fallback-src="${hq}"
            alt="YouTube thumbnail for ${film.title}"
            loading="lazy"
            decoding="async"
          />
          <span class="video-overlay" aria-hidden="true">
            <span class="play-icon">▶</span>
          </span>
        </button>
      </div>
      <div class="film-meta">
        <h3>
          <a class="film-title-link clickable" href="/video/${id}" data-video-detail-link="${id}">${escapeHtml(film.title)}</a>
        </h3>
        <p>${escapeHtml(film.role)}</p>
      </div>
    </article>
  `;
}

function initializeFilmShowcase() {
  const filmGrid = document.querySelector('.film-grid');
  if (!filmGrid) {
    logMissingElement('.film-grid');
    return;
  }

  const cardsMarkup = films.map(createVideoCard).filter(Boolean).join('');
  filmGrid.innerHTML = cardsMarkup;

  if (!cardsMarkup) {
    console.error('[film-site] Film showcase rendered with 0 playable videos.');
    return;
  }

  filmGrid.querySelectorAll('img[data-fallback-src]').forEach((image) => {
    image.addEventListener('error', () => {
      const fallback = image.dataset.fallbackSrc;
      if (!fallback || image.src === fallback) return;
      image.src = fallback;
    });
  });

  function stopOtherVideoPlayers(activeShell) {
    filmGrid.querySelectorAll('.video-shell iframe').forEach((iframe) => {
      const shell = iframe.closest('.video-shell');
      if (shell === activeShell) return;

      iframe.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'pauseVideo'
        }),
        '*'
      );
    });
  }

  filmGrid.addEventListener('click', (event) => {
    const titleLink = event.target.closest('[data-video-detail-link]');
    if (titleLink) {
      event.preventDefault();
      openVideoDetail(titleLink.dataset.videoDetailLink, {
        triggerElement: titleLink
      });
      return;
    }

    const button = event.target.closest('.play-video');
    if (!button) return;

    const videoId = button.dataset.videoId;
    if (!videoId) {
      console.error('[film-site] Play button clicked without a data-video-id.');
      return;
    }

    const shell = button.closest('.video-shell');
    if (!shell) {
      console.error('[film-site] Could not find .video-shell for selected video.');
      return;
    }

    stopOtherVideoPlayers(shell);

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`;
    iframe.title = 'YouTube video player';
    iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;

    shell.innerHTML = '';
    shell.appendChild(iframe);
  });

  const directVideoId = parseVideoRoute();
  if (directVideoId) {
    openVideoDetail(directVideoId, {
      shouldNavigate: false,
      triggerElement: null
    });
  }

  window.addEventListener('popstate', () => {
    const routedVideoId = parseVideoRoute();

    if (routedVideoId) {
      openVideoDetail(routedVideoId, { shouldNavigate: false });
      return;
    }

    closeVideoDetail({ shouldNavigate: false, returnFocus: false });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!appRouteState.activeFilmId) return;

    closeVideoDetail();
  });

  document.body.addEventListener('click', (event) => {
    const closeButton = event.target.closest('.video-detail-close');
    if (!closeButton) return;

    closeVideoDetail();
  });
}

function initializeAnimation() {
  if (!window.gsap) {
    console.error('[film-site] GSAP not found. Animation setup skipped.');
    return;
  }

  if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  gsap.from('.site-header', {
    y: -80,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  });

  gsap.from('.reveal', {
    y: 48,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    delay: 0.3
  });

  gsap.utils.toArray('.section h2, .section .eyebrow').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: window.ScrollTrigger
        ? {
            trigger: el,
            start: 'top 85%'
          }
        : undefined,
      y: 35,
      opacity: 0,
      duration: 0.9,
      ease: 'power2.out'
    });
  });

  gsap.utils.toArray('.parallax').forEach((card) => {
    const speed = Number(card.dataset.speed) || 0.2;
    gsap.to(card, {
      yPercent: -20 * speed * 10,
      ease: 'none',
      scrollTrigger: window.ScrollTrigger
        ? {
            trigger: card,
            scrub: true
          }
        : undefined
    });
  });
}

function initializeSmoothScroll() {
  if (!window.Lenis) {
    console.error('[film-site] Lenis not found. Smooth scrolling skipped.');
    return;
  }

  const lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    gestureOrientation: 'vertical'
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
}


function initializeContactCta() {
  const sayHelloLink = document.querySelector('[data-say-hello]');
  if (!sayHelloLink) {
    logMissingElement('[data-say-hello]');
    return;
  }

  const feedback = document.querySelector('[data-contact-feedback]');
  const contactEmail = sayHelloLink.dataset.email || '';

  sayHelloLink.addEventListener('click', async () => {
    if (!navigator.clipboard || !contactEmail) return;

    try {
      await navigator.clipboard.writeText(contactEmail);
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = `If your mail app did not open, the address was copied: ${contactEmail}`;
      }
    } catch (error) {
      // Clipboard access can fail in restricted browser contexts; mailto link still works.
    }
  });
}

function initializeCursorAndNav() {
  const cursor = document.querySelector('.cursor');
  const nav = document.querySelector('.site-nav');
  const menuToggle = document.querySelector('.menu-toggle');
  const interactiveSelector = 'button, a, [role="button"], .clickable';

  if (!cursor) {
    logMissingElement('.cursor');
  } else {
    window.addEventListener('mousemove', (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });

    document.addEventListener('pointerover', (event) => {
      if (!event.target.closest(interactiveSelector)) return;
      cursor.classList.add('active');
    });

    document.addEventListener('pointerout', (event) => {
      if (!event.target.closest(interactiveSelector)) return;
      if (event.relatedTarget?.closest(interactiveSelector)) return;
      cursor.classList.remove('active');
    });
  }

  if (!nav) {
    logMissingElement('.site-nav');
    return;
  }

  if (!menuToggle) {
    logMissingElement('.menu-toggle');
    return;
  }

  menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Waiting for DOMContentLoaded ensures element queries are reliable in production where scripts can execute earlier than expected.
document.addEventListener('DOMContentLoaded', () => {
  initializeFilmShowcase();
  initializeAnimation();
  initializeSmoothScroll();
  initializeContactCta();
  initializeCursorAndNav();
});
