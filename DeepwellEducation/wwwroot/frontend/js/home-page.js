(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var row = document.getElementById('home-popular-courses');
        var status = document.getElementById('home-courses-status');
        var languageCategoryInner = document.getElementById('language-category-inner');
        if (
            languageCategoryInner &&
            window.DeepwellCourse &&
            typeof DeepwellCourse.renderLanguageCategoryCards === 'function'
        ) {
            DeepwellCourse.renderLanguageCategoryCards(languageCategoryInner);
        }
        if (!row || !window.DeepwellCourse || typeof DeepwellCourse.renderHomePopular !== 'function') return;
        DeepwellCourse.renderHomePopular(row, status, { limit: 6, level: 0 });
    });
})();
