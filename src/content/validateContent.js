(function attachContentValidation(globalScope) {
  const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

  function isDev() {
    return globalScope.location.hostname === 'localhost' || globalScope.location.hostname === '127.0.0.1';
  }

  function validateFilms(films = []) {
    films.forEach((film) => {
      if (!YOUTUBE_ID_REGEX.test(String(film.youtubeId || ''))) {
        console.warn('[content] invalid youtubeId', { title: film.title, youtubeId: film.youtubeId });
      }
    });
  }

  function validateUniqueSlugs(writings = []) {
    const seen = new Set();
    writings.forEach((writing) => {
      if (seen.has(writing.slug)) {
        console.warn('[content] duplicate writing slug', { slug: writing.slug, title: writing.title });
        return;
      }
      seen.add(writing.slug);
    });
  }

  function run({ films = [], writings = [] } = {}) {
    if (!isDev()) return;
    validateFilms(films);
    validateUniqueSlugs(writings);
  }

  globalScope.ContentValidation = { run };
})(window);
