const films = [
  {
    id: '4uJzOTmVHKQ',
    title: 'northern mockingbird.',
    role: '2025 • 3 min',
    statement: 
      'finding the bird.',
    videoUrl: 'https://www.youtube.com/embed/4uJzOTmVHKQ'
  },
  {
    id: 'qaAV4v811j8',
    title: 'the man who waters concrete.',
    role: 'Director • 2025 • 2 min',
    statement:
      'An attempt to grow the concrete. The ending is extremely cornball, where a desperate attempt was made to save the film from bad planning.',
    videoUrl: 'https://www.youtube.com/embed/qaAV4v811j8'
  },
  {
    id: '-vp76Gp6zoI',
    title: 'Bohemian Rhapsody',
    role: 'Director • 2025 • 15 min',
    statement:
      'A music video to portray the story behind the widely acclaimed song.',
    videoUrl: 'https://www.youtube.com/embed/-vp76Gp6zoI'
  },
  {
    id: '9pLS3b_b_oM',
    title: 'Echoes of Tommorow',
    role: '2024 • 3 min',
    statement:
      'Or maybe in the future of stock footages.',
    videoUrl: 'https://www.youtube.com/embed/9pLS3b_b_oM'
  }
];

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

    // Force key roots to `cursor: none` to mitigate inline style overrides from third-party widgets.
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
    // Fallback: when a browser does not support `cursor: none`, we keep the default cursor
    // and avoid a broken "half-hidden" state.
    root.classList.remove('cursor-hidden');
    root.classList.add('cursor-restored');
    console.warn('[cursor-lock] Browser does not support `cursor: none`; using default cursor fallback.');
    return {
      active: false,
      reason: 'unsupported-browser'
    };
  }

  lockCursor();

  // Verify once after styles settle. If cursor still resolves to non-`none`, fallback cleanly.
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

  // Some embedded or dynamic components change cursor on interaction events.
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

function parseVideoId(url) {
  const parsedId = window.YouTubeUtils?.extractYouTubeVideoId(url) || null;
  return assertYouTubeId(parsedId) ? parsedId : null;
}

function assertYouTubeId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id);
}

function isDevEnvironment() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function normalizeFilmData(rawFilms) {
  return rawFilms.map((film, index) => {
    const normalizedId = assertYouTubeId(film.id) ? film.id : parseVideoId(film.videoUrl);

    if (!assertYouTubeId(normalizedId) && isDevEnvironment()) {
      console.warn(
        `[film-site] Film at index ${index} has a missing or invalid YouTube id.`,
        {
          title: film.title,
          id: film.id || null,
          videoUrl: film.videoUrl || null
        }
      );
    }

    return {
      ...film,
      videoId: assertYouTubeId(normalizedId) ? normalizedId : null,
      thumbnailCandidates: getDeterministicThumbnailFallbacks(normalizedId),
      thumbnailUrl: assertYouTubeId(normalizedId)
        ? `https://img.youtube.com/vi/${encodeURIComponent(normalizedId)}/hqdefault.jpg`
        : null
    };
  });
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

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getFilmByVideoId(videoId) {
  return filmRuntimeState.films.find((film) => film.videoId === videoId) || null;
}

function parseVideoRoute(pathname = window.location.pathname) {
  const match = pathname.match(/^\/(?:films|video)\/([^/]+)$/);
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

function renderVideoDetailFullScreen(film) {
  const embedSrc = buildEmbedSrc(film.videoId);
  const playerMarkup = embedSrc
    ? `
        <iframe
          src="${embedSrc}"
          title="Player for ${escapeHtml(film.title)}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        ></iframe>
      `
    : `
        <div class="video-detail-fallback">
          <p>Video unavailable.</p>
        </div>
      `;

  return `
    <section class="video-detail" role="dialog" aria-modal="true" aria-labelledby="video-detail-title">
      <button class="video-detail-close clickable" type="button" aria-label="Close video details">
        ← Back
      </button>
      <div class="video-detail-content">
        <div class="video-detail-player-wrap">
          ${playerMarkup}
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
  container.innerHTML = renderVideoDetailFullScreen(film);
  container.classList.add('open');
  document.body.classList.add('video-detail-open');

  const closeButton = container.querySelector('.video-detail-close');
  closeButton?.focus();

  if (shouldNavigate && parseVideoRoute() !== videoId) {
    history.pushState({ videoId }, '', `/films/${encodeURIComponent(videoId)}`);
  }
}

function createVideoCard(film) {
  const id = film.videoId;
  if (!id) {
    console.error(`[film-site] Skipping film card because video ID could not be extracted for "${film.title}".`);
    return '';
  }

  if (!film.thumbnailUrl) {
    console.error(`[film-site] Skipping film card because thumbnails could not be generated for "${film.title}".`);
    return '';
  }

  // Preview environments sometimes load scripts before HTML is fully parsed.
  // Rendering plain markup and binding click handlers later prevents live-site race conditions.
  // We generate and verify YouTube image URLs ourselves because iframe/oEmbed previews can return stale or placeholder
  // thumbnails without a network error, which makes embedded preview thumbnails unreliable.
  return `
    <article
      class="film-card"
      data-video-id="${id}"
      data-video-detail-link="${id}"
      role="link"
      tabindex="0"
      aria-label="Open details for ${escapeHtml(film.title)}"
    >
      <div class="video-shell">
        <a
          class="video-thumb-link clickable"
          href="/films/${id}"
          data-video-detail-link="${id}"
          aria-label="Open details for ${escapeHtml(film.title)}"
        >
          <img
            src="${film.thumbnailUrl}"
            alt="${escapeHtml(film.title)}"
            loading="lazy"
            decoding="async"
            data-thumb-fallback-index="0"
            data-thumb-fallbacks="${escapeHtml((film.thumbnailCandidates || []).join('|'))}"
          />
          <span class="video-overlay">
            <span class="play-button-overlay" role="img" aria-label="Play video">
              <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
                <circle cx="32" cy="32" r="31" class="play-button-ring" />
                <path d="M26 21.5L44.5 32L26 42.5V21.5Z" class="play-button-triangle" />
              </svg>
            </span>
          </span>
        </a>
      </div>
      <div class="film-meta">
        <h3>
          <a
            class="film-title-link clickable"
            href="/films/${id}"
            data-video-detail-link="${id}"
          >${escapeHtml(film.title)}</a>
        </h3>
        <p>${escapeHtml(film.role)}</p>
      </div>
    </article>
  `;
}

function initializeThumbnailFallbacks(container) {
  container.addEventListener(
    'error',
    (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) {
        return;
      }

      if (image.dataset.thumbFallbackComplete === 'true') {
        return;
      }

      const fallbackList = (image.dataset.thumbFallbacks || '').split('|').filter(Boolean);
      if (!fallbackList.length) {
        return;
      }

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
  try {
    const filmGrid = document.querySelector('.film-grid');
    if (!filmGrid) {
      logMissingElement('.film-grid');
      return;
    }

    filmRuntimeState.films = normalizeFilmData(films);

    const cardsMarkup = filmRuntimeState.films.map(createVideoCard).filter(Boolean).join('');
    filmGrid.innerHTML = cardsMarkup;

    if (!cardsMarkup) {
      console.error('[film-site] Film showcase rendered with 0 playable videos.');
      return;
    }

    initializeThumbnailFallbacks(filmGrid);

    filmGrid.addEventListener('click', (event) => {
      const detailTarget = event.target.closest('[data-video-detail-link]');
      const clickableCard = event.target.closest('.film-card[data-video-id]');
      const videoId = detailTarget?.dataset.videoDetailLink || clickableCard?.dataset.videoId;

      if (!videoId) return;

      event.preventDefault();
      openVideoDetail(videoId, {
        triggerElement: detailTarget || clickableCard
      });
    });

    filmGrid.addEventListener('keydown', (event) => {
      const card = event.target.closest('.film-card[data-video-id]');
      if (!card) return;

      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      openVideoDetail(card.dataset.videoId, {
        triggerElement: card
      });
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
  } catch (error) {
    console.error('[film-site] initializeFilmShowcase failed safely.', error);
  }
}

function initializeAnimation() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return;
  }

  if (!window.gsap) {
    console.warn('[film-site] GSAP not found. Animation setup skipped.');
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

}

function initializeSmoothScroll() {
  if (!window.Lenis) {
    console.warn('[film-site] Lenis not found. Smooth scrolling skipped.');
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
    if (feedback) {
      feedback.hidden = false;
      feedback.textContent = contactEmail
        ? `If your mail app did not open, email me at: ${contactEmail}`
        : 'If your mail app did not open, please use the contact email listed on this page.';
    }

    if (!navigator.clipboard || !contactEmail) return;

    try {
      await navigator.clipboard.writeText(contactEmail);
      if (feedback) {
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

function initializeDirectorsSlate() {
  const slate = document.querySelector('[data-directors-slate]');
  const takeButton = document.querySelector('[data-slate-take]');
  const sceneNode = document.querySelector('[data-scene]');
  const takeNode = document.querySelector('[data-take]');
  const rollNode = document.querySelector('[data-roll]');

  if (!slate || !takeButton || !sceneNode || !takeNode || !rollNode) {
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scene = 1;
  let take = 1;
  let roll = 1;

  const formatNumber = (value) => String(value).padStart(2, '0');

  takeButton.addEventListener('click', () => {
    take += 1;

    if (take > 5) {
      take = 1;
      scene = (scene % 12) + 1;
      roll += 1;
    }

    sceneNode.textContent = formatNumber(scene);
    takeNode.textContent = formatNumber(take);
    rollNode.textContent = `A${formatNumber(roll)}`;

    if (!prefersReducedMotion) {
      slate.classList.add('is-clapped');
      window.setTimeout(() => {
        slate.classList.remove('is-clapped');
      }, 210);
    }
  });
}

function initializeInteractiveLab() {
  const promptNode = document.querySelector('[data-scene-prompt]');
  const nextPromptButton = document.querySelector('[data-next-prompt]');
  const grainControl = document.querySelector('[data-grain-control]');
  const noiseLayer = document.querySelector('.noise');

  const prompts = [
    'A hallway where every footstep sounds like it belongs to someone else.',
    'A quiet kitchen lit only by a refrigerator door that never closes.',
    'Two strangers share an umbrella and both pretend not to recognize each other.',
    'A city rooftop where the wind carries last year\'s unanswered apology.'
  ];

  if (promptNode && nextPromptButton) {
    let promptIndex = 0;

    nextPromptButton.addEventListener('click', () => {
      promptIndex = (promptIndex + 1) % prompts.length;
      promptNode.textContent = prompts[promptIndex];
    });
  }

  if (grainControl && noiseLayer) {
    grainControl.addEventListener('input', () => {
      const nextOpacity = Number(grainControl.value) / 100;
      noiseLayer.style.opacity = String(nextOpacity);
    });
  }
}

// Waiting for DOMContentLoaded ensures element queries are reliable in production where scripts can execute earlier than expected.
document.addEventListener('DOMContentLoaded', () => {
  initializeGlobalCursorLock(window.CURSOR_LOCK_CONFIG);
  void initializeFilmShowcase();
  initializeDirectorsSlate();
  initializeInteractiveLab();
  initializeAnimation();
  initializeSmoothScroll();
  initializeContactCta();
  initializeCursorAndNav();
});
