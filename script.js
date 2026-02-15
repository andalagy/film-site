const youtubeVideos = [
  {
    title: 'Never Gonna Give You Up',
    source: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    title: 'Short Film Cut',
    source: 'youtu.be/abcdEFGhijk'
  },
  {
    title: 'City Study',
    source: 'https://www.youtube.com/embed/XHOmBV4js_E'
  }
];

const cursor = document.querySelector('.cursor');
const nav = document.querySelector('.site-nav');
const menuToggle = document.querySelector('.menu-toggle');
const filmGrid = document.querySelector('.film-grid');

function extractYouTubeId(value) {
  if (!value) return null;

  const input = value.trim();
  const idOnlyPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (idOnlyPattern.test(input)) return input;

  const withProtocol = /^(https?:)?\/\//.test(input) ? input : `https://${input}`;

  try {
    const url = new URL(withProtocol);

    if (url.hostname.includes('youtu.be')) {
      const pathId = url.pathname.replace(/^\//, '').split('/')[0];
      return idOnlyPattern.test(pathId) ? pathId : null;
    }

    const vParam = url.searchParams.get('v');
    if (idOnlyPattern.test(vParam || '')) return vParam;

    const pathMatch = url.pathname.match(/\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
    if (pathMatch) return pathMatch[2];
  } catch (_error) {
    return null;
  }

  return null;
}

function getThumbnailCandidates(videoId) {
  return [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  ];
}

function createEmbedUrl(videoId) {
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0',
    modestbranding: '1'
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function renderFilmCards() {
  if (!filmGrid) return;

  const cardsMarkup = youtubeVideos
    .map((video, index) => {
      const videoId = extractYouTubeId(video.source);
      if (!videoId) return '';

      const [maxResThumb] = getThumbnailCandidates(videoId);
      const title = video.title || `YouTube Video ${index + 1}`;

      return `
        <article class="film-card" data-video-id="${videoId}">
          <div class="video-shell" data-lazy-video>
            <img
              src="${maxResThumb}"
              alt="${title} thumbnail"
              class="video-thumb"
              loading="lazy"
              decoding="async"
              data-fallback-index="0"
            />
            <button class="video-play" type="button" aria-label="Play ${title}">
              <span class="video-play-icon" aria-hidden="true"></span>
            </button>
          </div>
          <div class="film-meta">
            <h3>${title}</h3>
            <p>${videoId}</p>
          </div>
        </article>
      `;
    })
    .join('');

  filmGrid.innerHTML = cardsMarkup;
}

renderFilmCards();

filmGrid?.addEventListener('error', (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('video-thumb')) return;

  const card = img.closest('.film-card');
  const videoId = card?.dataset.videoId;
  if (!videoId) return;

  const thumbs = getThumbnailCandidates(videoId);
  const currentIndex = Number(img.dataset.fallbackIndex || 0);
  const nextIndex = currentIndex + 1;

  if (nextIndex < thumbs.length) {
    img.dataset.fallbackIndex = String(nextIndex);
    img.src = thumbs[nextIndex];
  }
}, true);

filmGrid?.addEventListener('click', (event) => {
  const playButton = event.target.closest('.video-play');
  if (!playButton) return;

  const card = playButton.closest('.film-card');
  const shell = playButton.closest('[data-lazy-video]');
  const videoId = card?.dataset.videoId;

  if (!shell || !videoId || shell.dataset.loaded === 'true') return;

  const iframe = document.createElement('iframe');
  iframe.src = createEmbedUrl(videoId);
  iframe.title = `${card.querySelector('h3')?.textContent || 'YouTube video'} player`;
  iframe.loading = 'lazy';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;

  shell.innerHTML = '';
  shell.appendChild(iframe);
  shell.dataset.loaded = 'true';
});

if (window.gsap) {
  gsap.registerPlugin(ScrollTrigger);

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
      scrollTrigger: {
        trigger: el,
        start: 'top 85%'
      },
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
      scrollTrigger: {
        trigger: card,
        scrub: true
      }
    });
  });
}

if (window.Lenis) {
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

window.addEventListener('mousemove', (event) => {
  if (!cursor) return;
  cursor.style.left = `${event.clientX}px`;
  cursor.style.top = `${event.clientY}px`;
});

document.addEventListener('mouseover', (event) => {
  if (event.target.closest('.magnetic, .film-card, .btn, .video-play')) {
    cursor?.classList.add('active');
  }
});

document.addEventListener('mouseout', (event) => {
  if (event.target.closest('.magnetic, .film-card, .btn, .video-play')) {
    cursor?.classList.remove('active');
  }
});

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
