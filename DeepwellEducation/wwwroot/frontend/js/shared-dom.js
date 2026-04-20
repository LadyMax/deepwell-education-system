(function (w) {
    "use strict";

    function escapeHtml(s) {
        if (s == null || s === "") return "";
        var d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
    }

    w.DeepwellDom = { escapeHtml: escapeHtml };
})(typeof window !== "undefined" ? window : this);
