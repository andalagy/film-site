const films = [
  {
    title: 'Neon Quiet',
    role: 'Director • 2025 • 12 min',
    statement:
      'A portrait of night workers searching for stillness in a city that never powers down.',
    video: 'https://www.youtube.com/embed/6stlCkUDG_s?autoplay=1'
  },
  {
    title: 'After the Last Reel',
    role: 'Director of Photography • 2024 • 8 min',
    statement:
      'Shot on vintage lenses, this short tracks a projectionist closing down a neighborhood cinema.',
    video: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1'
  },
  {
    title: 'Cloudline',
    role: 'Editor • 2023 • 15 min',
    statement:
      'An experiment in fragmented memory, assembled from interviews, diaries, and urban atmospheres.',
    video: 'https://www.youtube.com/embed/tgbNymZ7vqY?autoplay=1'
  },
  {
    title: 'Home in Transit',
    role: 'Director / DP • 2022 • 10 min',
    statement:
      'A moving portrait of two siblings commuting across borders to keep family rituals alive.',
    video: 'https://www.youtube.com/embed/XHOmBV4js_E?autoplay=1'
  }
];

const cursor = document.querySelector('.cursor');
const magnets = document.querySelectorAll('.magnetic, .film-card, .btn');
const overlay = document.querySelector('.film-overlay');
const iframe = overlay.querySelector('iframe');
const closeOverlayBtn = document.querySelector('.close-overlay');
const nav = document.querySelector('.site-nav');
const menuToggle = document.querySelector('.menu-toggle');

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

magnets.forEach((element) => {
  element.addEventListener('mouseenter', () => cursor?.classList.add('active'));
  element.addEventListener('mouseleave', () => cursor?.classList.remove('active'));
});

document.querySelectorAll('.film-card').forEach((card) => {
  card.addEventListener('click', () => {
    const film = films[Number(card.dataset.film)];
    if (!film) return;

    document.getElementById('overlay-title').textContent = film.title;
    document.getElementById('overlay-role').textContent = film.role;
    document.getElementById('overlay-statement').textContent = film.statement;
    iframe.src = film.video;

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  });
});

function closeOverlay() {
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  iframe.src = '';
  document.body.style.overflow = '';
}

closeOverlayBtn.addEventListener('click', closeOverlay);
overlay.addEventListener('click', (event) => {
  if (event.target === overlay) closeOverlay();
});

menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => nav.classList.remove('open'));
});
