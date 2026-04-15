// index.html: featured beginner courses grid.
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var row = document.getElementById('home-popular-courses');
        var status = document.getElementById('home-courses-status');
        if (!row || !window.DeepwellCourse || typeof DeepwellCourse.renderHomePopular !== 'function') return;
        DeepwellCourse.renderHomePopular(row, status, { limit: 6, level: 0 });
    });
})();
