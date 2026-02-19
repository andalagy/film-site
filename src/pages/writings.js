//render collective writing detail pages
(function () {
  function writingsView() {
    const writings = window.APP_DATA?.writings || [];
    return `<section class="page-section writings" data-ambient-shift data-anim-key="writings:section" data-reveal="section">
      <h1 data-anim-key="writings:heading" data-reveal="heading">writings</h1>
      <div class="writing-grid" data-anim-key="writings:grid" data-reveal="section">
        ${writings.map(window.AppUtils.writingCard).join('')}
      </div>
    </section>`;
  }

  window.WorkPages = window.WorkPages || {};
  window.WorkPages.writingsView = writingsView;
})();
