(function () {
    document.addEventListener('DOMContentLoaded', function () {
        if (!window.DeepwellLanguage || typeof DeepwellLanguage.renderDetail !== 'function') return;
        var params = new URLSearchParams(window.location.search);
        DeepwellLanguage.renderDetail(
            document.getElementById('lang-status'),
            document.getElementById('lang-article'),
            params.get('lang'));
    });
})();
