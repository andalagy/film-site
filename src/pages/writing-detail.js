(function () {
  function writingContentHtml(item) {
    return item.content
      .split('\n\n')
      .map((paragraph) => `<p>${window.AppUtils.lower(paragraph)}</p>`)
      .join('');
  }

  function writingDetailView(slug) {
    const writings = window.APP_DATA?.writings || [];
    const item = writings.find((entry) => entry.slug === slug);
    if (!item) return `<section class="page-section"><h1>writing not found</h1></section>`;

    return `<section class="page-section writing-detail">
      <a class="back-link" href="${window.AppUtils.toUrl('/writings')}" data-link="/writings">back</a>
      <h1>${window.AppUtils.lower(item.title)}</h1>
      <article>
        ${writingContentHtml(item)}
      </article>
    </section>`;
  }

  window.WorkPages = window.WorkPages || {};
  window.WorkPages.writingDetailView = writingDetailView;
})();
