(function () {
  function filmDetailView(id) {
    const films = window.APP_DATA?.films || [];
    const cleanId = window.AppUtils.cleanVideoId(id);
    if (!cleanId) return `<section class="page-section"><h1>film not found</h1></section>`;

    const film = films.find((item) => window.AppUtils.cleanVideoId(item.youtubeId) === cleanId);
    if (!film) return `<section class="page-section"><h1>film not found</h1></section>`;

    const validId = window.AppUtils.isValidVideoId(cleanId);
    const embedSrc = validId ? window.AppUtils.buildEmbedSrc(cleanId) : '';
    window.AppUtils.logDev('render detail', { id: cleanId, embedSrc, validId });

    return `<section class="page-section detail">
      <a class="back-link" href="${window.AppUtils.toUrl('/films')}" data-link="/films">back</a>
      <div class="player-wrap" data-player-wrap data-film-id="${cleanId}" data-state="${validId ? 'embed' : 'fallback'}">
        <div class="player-ratio">
          ${
            validId
              ? `<iframe key="${cleanId}" data-film-iframe data-film-id="${cleanId}" src="${embedSrc}" title="${window.AppUtils.lower(
                  film.title
                )}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
              : window.AppUtils.filmFallbackView(film, 'invalid id')
          }
        </div>
      </div>
      <h1>${window.AppUtils.lower(film.title)}</h1>
      <p>${window.AppUtils.lower(film.statement)}</p>
      <p class="meta">${window.AppUtils.lower(film.year)} · ${window.AppUtils.lower(film.runtime)} · ${window.AppUtils.lower(film.role)}</p>
    </section>`;
  }

  window.WorkPages = window.WorkPages || {};
  window.WorkPages.filmDetailView = filmDetailView;
})();
