// course-detail.html: load course by ?id=.
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        if (!window.DeepwellCourse || typeof DeepwellCourse.renderDetail !== 'function') return;
        var params = new URLSearchParams(window.location.search);
        var id = params.get('id');
        DeepwellCourse.renderDetail(
            document.getElementById('course-detail-status'),
            document.getElementById('course-detail-article'),
            id);
    });
})();
