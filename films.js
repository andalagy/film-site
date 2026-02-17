const FILM_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

function deriveFilmId(film) {
  const directId = typeof film.id === 'string' ? film.id.trim() : '';
  if (FILM_ID_REGEX.test(directId)) return directId;

  const utils = window.YouTubeUtils;
  if (utils?.extractYouTubeVideoId) {
    const fromVideoUrl = typeof film.videoUrl === 'string' ? utils.extractYouTubeVideoId(film.videoUrl) : null;
    if (fromVideoUrl) return fromVideoUrl;

    const fromEmbedUrl = typeof film.embedUrl === 'string' ? utils.extractYouTubeVideoId(film.embedUrl) : null;
    if (fromEmbedUrl) return fromEmbedUrl;
  }

  return directId;
}

const RAW_FILMS = [
  {
    id: '4uJzOTmVHKQ',
    title: 'northern mockingbird',
    role: 'director',
    statement: 'finding the bird in a place that no longer remembers it.',
    year: 2025,
    runtime: '3 min'
  },
  {
    id: 'qaAV4v811j8',
    title: 'the man who waters concrete',
    role: 'director',
    statement: 'an attempt to grow what cannot grow.',
    year: 2025,
    runtime: '2 min'
  },
  {
    id: '-vp76Gp6zoI',
    title: 'bohemian rhapsody',
    role: 'director',
    statement: 'a music piece shaped as memory.',
    year: 2025,
    runtime: '15 min'
  },
  {
    id: '9pLS3b_b_oM',
    title: 'echoes of tomorrow',
    role: 'editor',
    statement: 'stock footage and near futures.',
    year: 2024,
    runtime: '3 min'
  }
];

window.FILMS_DATA = RAW_FILMS.map((film) => ({
  ...film,
  id: deriveFilmId(film)
}));

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.FILMS_DATA.forEach((film) => {
    if (!FILM_ID_REGEX.test(film.id)) {
      console.warn('[films] Invalid YouTube id detected.', { title: film.title, id: film.id });
    }
  });
}
