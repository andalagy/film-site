const films = Array.isArray(window.FILMS_DATA) ? window.FILMS_DATA : [];

const appRouteState = {
  previousFocus: null,
  activeFilmId: null
};

const filmRuntimeState = {
  films: []
};

function logMissingElement(name) {
  console.error(`[film-site] Required element missing: ${name}. Feature initialization was skipped safely.`);
}

function getAppRoute(pathname = window.location.pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  if (normalizedPath === '/') return { page: 'home', filmId: null };
  if (normalizedPath === '/films') return { page: 'films', filmId: null };

  const detailMatch = normalizedPath.match(/^\/films\/([^/]+)$/);
  if (detailMatch) {
    return {
      page: 'films',
      filmId: decodeURIComponent(detailMatch[1])
    };
  }

  return { page: 'home', filmId: null };
}

function applyRouteLayout(route = getAppRoute()) {
  document.body.dataset.page = route.page;
  document.querySelectorAll('[data-route-pane]').forEach((pane) => {
    const paneRoute = pane.getAttribute('data-route-pane');
    const shouldShow = paneRoute === route.page;
    pane.hidden = !shouldShow;
  });

  document.querySelectorAll('[data-route-link]').forEach((link) => {
    const href = link.getAttribute('href');
    const isActive = (route.page === 'home' && href === '/') || (route.page === 'films' && href === '/films');
    link.classList.toggle('is-active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

function initializeGlobalCursorLock(customConfig = {}) {
  const config = {
    debug: false,
    restoreKey: 'Escape',
    allowRestoreToggle: true,
    enforceIntervalMs: 1200,
    ...customConfig
  };

  const root = document.documentElement;
  const trackedSelector = [
    'a',
    'button',
    'input',
    'textarea',
    'select',
    'summary',
    'label',
    'iframe',
    '[role="button"]',
    '[style*="cursor"]'
  ].join(',');

  let observer = null;
  let auditTimer = null;

  const debugLog = (...args) => {
    if (config.debug) {
      console.info('[cursor-lock]', ...args);
    }
  };

  const forceNoneOnElement = (element) => {
    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
      return;
    }

    element.style.setProperty('cursor', 'none', 'important');
    element.querySelectorAll?.('*').forEach((child) => {
      child.style.setProperty('cursor', 'none', 'important');
    });
  };

  const lockCursor = () => {
    root.classList.remove('cursor-restored');
    root.classList.add('cursor-hidden');

    document.body?.style.setProperty('cursor', 'none', 'important');
    document.documentElement.style.setProperty('cursor', 'none', 'important');

    document.querySelectorAll(trackedSelector).forEach(forceNoneOnElement);

    const cursorNode = document.querySelector('.cursor');
    if (cursorNode instanceof HTMLElement) {
      cursorNode.hidden = false;
    }

    debugLog('Cursor hidden globally.');
  };

  const restoreCursor = () => {
    root.classList.remove('cursor-hidden');
    root.classList.add('cursor-restored');
    document.body?.style.removeProperty('cursor');
    document.documentElement.style.removeProperty('cursor');

    const cursorNode = document.querySelector('.cursor');
    if (cursorNode instanceof HTMLElement) {
      cursorNode.hidden = true;
    }

    debugLog('Cursor restored to browser default.');
  };

  const browserSupportsCursorNone =
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('cursor', 'none');

  if (!browserSupportsCursorNone) {
    root.classList.remove('cursor-hidden');
    root.classList.add('cursor-restored');
    console.warn('[cursor-lock] Browser does not support `cursor: none`; using default cursor fallback.');
    return { active: false, reason: 'unsupported-browser' };
  }

  lockCursor();

  window.setTimeout(() => {
    const cursorValue = window.getComputedStyle(document.body).cursor;
    if (cursorValue !== 'none' && !cursorValue.includes('none')) {
      console.warn('[cursor-lock] Could not enforce hidden cursor reliably; reverting to default cursor fallback.');
      restoreCursor();
    }
  }, 120);

  const enforceIfLocked = (target = null) => {
    if (!root.classList.contains('cursor-hidden')) return;

    if (target instanceof HTMLElement || target instanceof SVGElement) {
      forceNoneOnElement(target);
      return;
    }

    lockCursor();
  };

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          enforceIfLocked(node);
        });
      }

      if (mutation.type === 'attributes' && mutation.target) {
        enforceIfLocked(mutation.target);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  ['pointerover', 'mousemove', 'mouseenter', 'focusin'].forEach((eventName) => {
    document.addEventListener(
      eventName,
      (event) => {
        enforceIfLocked(event.target);
      },
      true
    );
  });

  auditTimer = window.setInterval(() => {
    if (!root.classList.contains('cursor-hidden')) return;
    document.querySelectorAll(trackedSelector).forEach(forceNoneOnElement);
    debugLog('Periodic cursor lock audit applied.');
  }, config.enforceIntervalMs);

  if (config.allowRestoreToggle) {
    document.addEventListener('keydown', (event) => {
      if (event.key !== config.restoreKey) return;

      if (root.classList.contains('cursor-hidden')) {
        restoreCursor();
      } else {
        lockCursor();
      }
    });
  }

  return {
    active: true,
    destroy() {
      observer?.disconnect();
      observer = null;
      if (auditTimer) {
        window.clearInterval(auditTimer);
        auditTimer = null;
      }
      restoreCursor();
    }
  };
}

function assertYouTubeId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id);
}

function getDeterministicThumbnailFallbacks(videoId) {
  if (!assertYouTubeId(videoId)) return [];

  return [
    `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/default.jpg`
  ];
}

function buildEmbedSrc(videoId) {
  if (!assertYouTubeId(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}

function parseVideoIdFromUrl(url) {
  const parsedId = window.YouTubeUtils?.extractYouTubeVideoId(url) || null;
  return assertYouTubeId(parsedId) ? parsedId : null;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeFilmData(rawFilms) {
  return rawFilms.map((film) => {
    const normalizedId = assertYouTubeId(film.id) ? film.id : parseVideoIdFromUrl(film.videoUrl || '');
    const yearLabel = Number.isInteger(film.year) ? String(film.year) : null;
    const runtimeLabel = typeof film.runtime === 'string' && film.runtime.trim() ? film.runtime.trim() : null;
    const roleLabel = typeof film.role === 'string' && film.role.trim() ? film.role.trim() : 'Director';
    const details = [roleLabel, yearLabel, runtimeLabel].filter(Boolean).join(' • ');

    return {
      ...film,
      videoId: normalizedId,
      details,
      thumbnailCandidates: getDeterministicThumbnailFallbacks(normalizedId),
      thumbnailUrl: assertYouTubeId(normalizedId)
        ? `https://img.youtube.com/vi/${encodeURIComponent(normalizedId)}/hqdefault.jpg`
        : null
    };
  });
}

function getFilmByVideoId(videoId) {
  return filmRuntimeState.films.find((film) => film.videoId === videoId) || null;
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

  if (shouldNavigate && getAppRoute().filmId) {
    history.pushState({}, '', '/films');
    applyRouteLayout(getAppRoute());
  }

  if (returnFocus && appRouteState.previousFocus?.focus) {
    appRouteState.previousFocus.focus();
  }
}

function renderVideoDetailFullScreen(film) {
  const embedSrc = buildEmbedSrc(film.videoId);
  const playerMarkup = embedSrc
    ? `<iframe src="${embedSrc}" title="Player for ${escapeHtml(film.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"></iframe>`
    : `<div class="video-detail-fallback"><p>Video unavailable.</p></div>`;

  return `
    <section class="video-detail" role="dialog" aria-modal="true" aria-labelledby="video-detail-title">
      <button class="video-detail-close clickable" type="button" aria-label="Close video details">← Back</button>
      <div class="video-detail-content">
        <div class="video-detail-player-wrap">${playerMarkup}</div>
        <div class="video-detail-meta draft-panel">
          <p class="eyebrow">Video Detail</p>
          <h2 id="video-detail-title">${escapeHtml(film.title)}</h2>
          <p>${escapeHtml(film.statement || 'No description available.')}</p>
          <p class="video-detail-role">${escapeHtml(film.details || film.role || 'Metadata unavailable')}</p>
        </div>
      </div>
    </section>`;
}

function openVideoDetail(videoId, { shouldNavigate = true, triggerElement = null } = {}) {
  const film = getFilmByVideoId(videoId);
  if (!film) {
    const container = ensureVideoDetailContainer();
    container.hidden = false;
    container.innerHTML = `
      <section class="video-detail" role="dialog" aria-modal="true" aria-labelledby="video-detail-title">
        <button class="video-detail-close clickable" type="button" aria-label="Back to films">← Back</button>
        <div class="video-detail-content">
          <div class="video-detail-meta draft-panel video-not-found">
            <p class="eyebrow">Video Detail</p>
            <h2 id="video-detail-title">Film not found</h2>
            <p>This film could not be found in the shared film catalogue.</p>
            <p class="video-detail-role">Check the film ID in the URL or update <code>films.js</code>.</p>
          </div>
        </div>
      </section>`;
    container.classList.add('open');
    document.body.classList.add('video-detail-open');
    appRouteState.activeFilmId = null;
    if (shouldNavigate && getAppRoute().filmId !== videoId) {
      history.pushState({ videoId }, '', `/films/${encodeURIComponent(videoId)}`);
      applyRouteLayout(getAppRoute());
    }
    return;
  }

  appRouteState.activeFilmId = videoId;
  appRouteState.previousFocus = triggerElement || document.activeElement;

  const container = ensureVideoDetailContainer();
  container.hidden = false;
  container.innerHTML = renderVideoDetailFullScreen(film);
  container.classList.add('open');
  document.body.classList.add('video-detail-open');

  container.querySelector('.video-detail-close')?.focus();

  if (shouldNavigate && getAppRoute().filmId !== videoId) {
    history.pushState({ videoId }, '', `/films/${encodeURIComponent(videoId)}`);
    applyRouteLayout(getAppRoute());
  }
}

function createVideoCard(film) {
  const id = film.videoId;
  if (!id || !film.thumbnailUrl) return '';

  return `
    <article class="film-card draft-panel" data-video-id="${id}" data-video-detail-link="${id}" role="link" tabindex="0" aria-label="Open details for ${escapeHtml(film.title)}">
      <span class="micro-label">PROJECT ${escapeHtml(id.slice(0, 4).toUpperCase())}</span>
      <div class="video-shell">
        <a class="video-thumb-link clickable" href="/films/${id}" data-video-detail-link="${id}" aria-label="Open details for ${escapeHtml(film.title)}">
          <img src="${film.thumbnailUrl}" alt="${escapeHtml(film.title)}" loading="lazy" decoding="async" data-thumb-fallback-index="0" data-thumb-fallbacks="${escapeHtml((film.thumbnailCandidates || []).join('|'))}" />
          <span class="video-overlay"><span class="play-button-overlay" role="img" aria-label="Play video"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="31" class="play-button-ring" /><path d="M26 21.5L44.5 32L26 42.5V21.5Z" class="play-button-triangle" /></svg></span></span>
        </a>
      </div>
      <div class="film-meta">
        <h3><a class="film-title-link clickable" href="/films/${id}" data-video-detail-link="${id}">${escapeHtml(film.title)}</a></h3>
        <p>${escapeHtml(film.details || film.role || '')}</p>
      </div>
    </article>`;
}

function initializeThumbnailFallbacks(container) {
  container.addEventListener(
    'error',
    (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      if (image.dataset.thumbFallbackComplete === 'true') return;

      const fallbackList = (image.dataset.thumbFallbacks || '').split('|').filter(Boolean);
      if (!fallbackList.length) return;

      const currentIndex = Number(image.dataset.thumbFallbackIndex || '0');
      const nextIndex = currentIndex + 1;

      if (nextIndex >= fallbackList.length) {
        image.dataset.thumbFallbackComplete = 'true';
        return;
      }

      image.dataset.thumbFallbackIndex = String(nextIndex);
      image.src = fallbackList[nextIndex];
    },
    true
  );
}

function initializeFilmShowcase() {
  const filmGrid = document.querySelector('.film-grid');
  if (!filmGrid) {
    logMissingElement('.film-grid');
    return;
  }

  filmRuntimeState.films = normalizeFilmData(films);
  filmGrid.innerHTML = filmRuntimeState.films.map(createVideoCard).join('');
  initializeThumbnailFallbacks(filmGrid);

  filmGrid.addEventListener('click', (event) => {
    const detailLink = event.target.closest('[data-video-detail-link]');
    if (!detailLink) return;

    event.preventDefault();
    openVideoDetail(detailLink.dataset.videoDetailLink, {
      triggerElement: detailLink,
      shouldNavigate: true
    });
  });

  filmGrid.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('[data-video-id]');
    if (!card) return;

    event.preventDefault();
    openVideoDetail(card.dataset.videoId, {
      triggerElement: card,
      shouldNavigate: true
    });
  });

  const syncDetailToRoute = () => {
    const route = getAppRoute();
    applyRouteLayout(route);

    if (route.filmId) {
      openVideoDetail(route.filmId, { shouldNavigate: false });
      return;
    }

    closeVideoDetail({ shouldNavigate: false, returnFocus: false });
  };

  window.addEventListener('popstate', syncDetailToRoute);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && appRouteState.activeFilmId) {
      closeVideoDetail();
    }
  });

  document.body.addEventListener('click', (event) => {
    const closeButton = event.target.closest('.video-detail-close');
    if (closeButton) closeVideoDetail();
  });

  syncDetailToRoute();
}

function initializeAnimation() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || !window.gsap) return;
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  gsap.from('.site-header', { y: -80, opacity: 0, duration: 0.8, ease: 'power2.out' });
  gsap.from('.reveal', { y: 48, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.3 });
}

function initializeSmoothScroll() {
  if (!window.Lenis) return;

  const lenis = new Lenis({ duration: 1.1, smoothWheel: true, gestureOrientation: 'vertical' });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

function initializeContactCta() {
  const sayHelloLink = document.querySelector('[data-say-hello]');
  if (!sayHelloLink) return;

  const feedback = document.querySelector('[data-contact-feedback]');
  const contactEmail = sayHelloLink.dataset.email || '';

  sayHelloLink.addEventListener('click', async () => {
    if (feedback) {
      feedback.hidden = false;
      feedback.textContent = contactEmail
        ? `If your mail app did not open, email me at: ${contactEmail}`
        : 'If your mail app did not open, please use the contact email listed on this page.';
    }

    if (!navigator.clipboard || !contactEmail) return;

    try {
      await navigator.clipboard.writeText(contactEmail);
      if (feedback) feedback.textContent = `If your mail app did not open, the address was copied: ${contactEmail}`;
    } catch (error) {
      // no-op
    }
  });
}

function initializeCursorAndNav() {
  const cursor = document.querySelector('.cursor');
  const nav = document.querySelector('.site-nav');
  const menuToggle = document.querySelector('.menu-toggle');
  const interactiveSelector = 'button, a, [role="button"], .clickable';

  if (cursor) {
    window.addEventListener('mousemove', (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });

    document.addEventListener('pointerover', (event) => {
      if (event.target.closest(interactiveSelector)) cursor.classList.add('active');
    });

    document.addEventListener('pointerout', (event) => {
      if (!event.target.closest(interactiveSelector)) return;
      if (event.relatedTarget?.closest(interactiveSelector)) return;
      cursor.classList.remove('active');
    });
  }

  if (menuToggle && nav) {
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

  document.querySelectorAll('[data-route-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('/')) return;

      event.preventDefault();
      if (window.location.pathname !== href) {
        history.pushState({}, '', href);
      }
      applyRouteLayout(getAppRoute());
      closeVideoDetail({ shouldNavigate: false, returnFocus: false });
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  });
}

function initializeDirectorSlateComponent() {
  const slate = document.querySelector('[data-directors-slate]');
  const takeButton = document.querySelector('[data-slate-take]');
  const scrollButton = document.querySelector('[data-slate-scroll]');
  const sceneNode = document.querySelector('[data-scene]');
  const takeNode = document.querySelector('[data-take]');
  const rollNode = document.querySelector('[data-roll]');
  const statementNode = document.querySelector('[data-slate-statement]');

  if (!slate || !takeButton || !scrollButton || !sceneNode || !takeNode || !rollNode || !statementNode) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scene = 1;
  let take = 1;
  let roll = 1;
  let statementIndex = 0;

  const statements = [
    'I make films that stay in the silence after the credits. My work follows memory, tension, and unresolved emotion through minimal, atmospheric frames.',
    'I frame quiet spaces where memory cracks open, and the audience discovers emotion between lines instead of inside them.',
    'I chase cinematic tension through restraint—letting sound, shadow, and stillness reveal what dialogue refuses to name.'
  ];

  const formatNumber = (value) => String(value).padStart(2, '0');

  const scrollToFilms = () => {
    history.pushState({}, '', '/films');
    applyRouteLayout(getAppRoute());
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  const handleTakeInteraction = () => {
    take += 1;
    if (take > 5) {
      take = 1;
      scene = (scene % 12) + 1;
      roll += 1;
    }

    sceneNode.textContent = formatNumber(scene);
    takeNode.textContent = formatNumber(take);
    rollNode.textContent = `A${formatNumber(roll)}`;

    statementIndex = (statementIndex + 1) % statements.length;
    statementNode.textContent = statements[statementIndex];

    slate.classList.remove('is-clapping');
    void slate.offsetWidth;
    slate.classList.add('is-clapping');

    window.setTimeout(scrollToFilms, prefersReducedMotion ? 0 : 170);
  };

  takeButton.addEventListener('click', handleTakeInteraction);
  scrollButton.addEventListener('click', scrollToFilms);
}

document.addEventListener('DOMContentLoaded', () => {
  applyRouteLayout(getAppRoute());
  initializeGlobalCursorLock(window.CURSOR_LOCK_CONFIG);
  initializeFilmShowcase();
  initializeDirectorSlateComponent();
  initializeAnimation();
  initializeSmoothScroll();
  initializeContactCta();
  initializeCursorAndNav();
});
