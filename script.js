const films = [
  {
    title: 'northern mockingbird.',
    role: '2025 • 3 min',
    statement: 'finding the bird.',
    videoUrl: 'https://www.youtube.com/watch?v=4uJzOTmVHKQ'
  },
  {
    title: 'After the Last Reel',
    role: 'Director of Photography • 2024 • 8 min',
    statement:
      'Shot on vintage lenses, this short tracks a projectionist closing down a neighborhood cinema.',
    videoUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk'
  },
  {
    title: 'Cloudline',
    role: 'Editor • 2023 • 15 min',
    statement:
      'An experiment in fragmented memory, assembled from interviews, diaries, and urban atmospheres.',
    videoUrl: 'https://www.youtube.com/watch?v=tgbNymZ7vqY'
  },
  {
    title: 'Home in Transit',
    role: 'Director / DP • 2022 • 10 min',
    statement:
      'A moving portrait of two siblings commuting across borders to keep family rituals alive.',
    videoUrl: 'https://www.youtube.com/watch?v=XHOmBV4js_E'
  }
];

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
        <h3>${film.title}</h3>
        <p>${film.role}</p>
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
  initializeCursorAndNav();
});
