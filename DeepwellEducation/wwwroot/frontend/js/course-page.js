// course.html: catalog URL sync, hide language cards when ?lang=, render via DeepwellCourse.
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var params = new URLSearchParams(window.location.search);
        var q = params.get('lang');
        var row = document.getElementById('course-catalog-row');
        var status = document.getElementById('course-catalog-status');
        var banner = document.getElementById('course-filter-banner');
        var cards = document.getElementById('course-language-cards');
        var levelSel = document.getElementById('course-level-filter');

        if (cards) {
            cards.classList.toggle('d-none', !!q);
        }

        function syncUrl() {
            var p = new URLSearchParams();
            if (q) p.set('lang', q);
            var lv = levelSel && levelSel.value !== '' ? levelSel.value : '';
            if (lv !== '') p.set('level', lv);
            var qs = p.toString();
            history.replaceState(null, '', qs ? ('course.html?' + qs) : 'course.html');
        }

        function refreshCatalog() {
            var levelArg = levelSel && levelSel.value !== '' ? levelSel.value : null;
            if (window.DeepwellCourse && typeof DeepwellCourse.renderCatalog === 'function') {
                DeepwellCourse.renderCatalog(row, status, q, banner, levelArg);
            }
            syncUrl();
        }

        if (levelSel) {
            var fromUrl = params.get('level');
            var nf = fromUrl != null && fromUrl !== '' && window.DeepwellCourse && DeepwellCourse.normalizeLevelFilter
                ? DeepwellCourse.normalizeLevelFilter(fromUrl)
                : null;
            if (nf != null) levelSel.value = String(nf);
            levelSel.addEventListener('change', refreshCatalog);
        }
        refreshCatalog();
    });
})();
