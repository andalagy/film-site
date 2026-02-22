//render individual writing detail pages
(function () {
  function escapeHtml(text) {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function writingContentHtml(item) {
    return `<div class="writing-detail-body">${escapeHtml(item.content)}</div>`;
  }

  function writingDetailView(slug) {
    const writings = window.APP_DATA?.writings || [];
    const item = writings.find((entry) => entry.slug === slug);
    if (!item) return `<section class="page-section"><h1>writing not found</h1></section>`;

    const itemYear = Number(item.year);
    const dateYear = new Date(item.date).getFullYear();
    const year = Number.isFinite(itemYear)
      ? itemYear
      : (Number.isFinite(dateYear) ? dateYear : null);

    return `<section class="page-section writing-detail page page--writing-detail">
      <h1>${window.AppUtils.lower(item.title)}</h1>
      <p class="writing-excerpt writing-excerpt--detail">${window.AppUtils.lower(item.excerpt)}</p>
      ${year ? `<p class="writing-year" aria-label="${year}">${year}</p>` : ''}
      <article>
        ${writingContentHtml(item)}
      </article>
    </section>`;
  }

  window.WorkPages = window.WorkPages || {};
  window.WorkPages.writingDetailView = writingDetailView;
})();
