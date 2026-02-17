(function () {
  function filmsView() {
    const films = window.APP_DATA?.films || [];
    return `<section class="page-section"><h1>films</h1><div class="film-grid">${films.map(window.AppUtils.filmCard).join('')}</div></section>`;
  }

  window.WorkPages = window.WorkPages || {};
  window.WorkPages.filmsView = filmsView;
})();
