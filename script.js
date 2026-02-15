const films = [
  {
    title: 'northern mockingbird.',
    role: '2025 • 3 min',
    statement: 'finding the bird.',
    video: 'https://www.youtube.com/embed/4uJzOTmVHKQ?autoplay=1',
    image:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80',
    alt: 'City lights and silhouette'
  },
  {
    title: 'After the Last Reel',
    role: 'Director of Photography • 2024 • 8 min',
    statement:
      'Shot on vintage lenses, this short tracks a projectionist closing down a neighborhood cinema.',
    video: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1',
    image:
      'https://images.unsplash.com/photo-1485841890310-6a055c88698a?auto=format&fit=crop&w=900&q=80',
    alt: 'Vintage projector close up'
  },
  {
    title: 'Cloudline',
    role: 'Editor • 2023 • 15 min',
    statement:
      'An experiment in fragmented memory, assembled from interviews, diaries, and urban atmospheres.',
    video: 'https://www.youtube.com/embed/tgbNymZ7vqY?autoplay=1',
    image:
      'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=900&q=80',
    alt: 'Foggy street at night'
  },
  {
    title: 'Home in Transit',
    role: 'Director / DP • 2022 • 10 min',
    statement:
      'A moving portrait of two siblings commuting across borders to keep family rituals alive.',
    video: 'https://www.youtube.com/embed/XHOmBV4js_E?autoplay=1',
    image:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
    alt: 'Filmmaker holding camera'
  }
];

const cursor = document.querySelector('.cursor');
const overlay = document.querySelector('.film-overlay');
const iframe = overlay.querySelector('iframe');
const closeOverlayBtn = document.querySelector('.close-overlay');
const nav = document.querySelector('.site-nav');
const menuToggle = document.querySelector('.menu-toggle');
const filmGrid = document.querySelector('.film-grid');

function renderFilmCards() {
  if (!filmGrid) return;

  const cardsMarkup = films
    .map(
      (film, index) => `
        <article class="film-card" data-film="${index}">
          <img src="${film.image}" alt="${film.alt || film.title}" />
          <div class="film-meta">
            <h3>${film.title}</h3>
            <p>${film.role}</p>
          </div>
        </article>
      `
    )
    .join('');

  filmGrid.innerHTML = cardsMarkup;
}

renderFilmCards();

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

document.querySelectorAll('.magnetic, .film-card, .btn').forEach((element) => {
  element.addEventListener('mouseenter', () => cursor?.classList.add('active'));
  element.addEventListener('mouseleave', () => cursor?.classList.remove('active'));
});

filmGrid?.addEventListener('click', (event) => {
  const card = event.target.closest('.film-card');
  if (!card) return;

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
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});
