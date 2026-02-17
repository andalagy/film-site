(function () {
  function writingsView() {
    const writings = window.APP_DATA?.writings || [];
    return `<section class="page-section writings" data-ambient-shift>
      <h1>writings</h1>
      <div class="writing-grid">
        ${writings.map(window.AppUtils.writingCard).join('')}
      </div>
    </section>`;
  }

  window.WorkPages = window.WorkPages || {};
  window.WorkPages.writingsView = writingsView;
})();
