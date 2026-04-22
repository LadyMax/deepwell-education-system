(function (w) {
    "use strict";

    w.DeepwellAdmin = w.DeepwellAdmin || {};

    w.DeepwellAdmin.staffForbiddenNote = function () {
        return "You need staff access. Sign in with a staff account.";
    };

    w.DeepwellAdmin.setInlineStatus = function (elementId, message, variant) {
        var el = document.getElementById(elementId);
        if (!el) return;
        var baseClass = el.getAttribute("data-base-class") || "app-flash mb-2";
        if (!message) {
            el.textContent = "";
            el.className = baseClass + " d-none";
            return;
        }
        var v = variant || "info";
        el.textContent = message;
        el.className = baseClass + " app-flash--" + v;
    };

    w.DeepwellAdmin.setAdminInboxUnreadBadge = function (count) {
        const el = document.getElementById("admin-msg-unread-badge");
        if (!el) return;
        if (count > 0) {
            el.textContent = count > 99 ? "99+" : String(count);
            el.classList.remove("d-none");
        } else {
            el.textContent = "";
            el.classList.add("d-none");
        }
    };

    w.DeepwellAdmin.refreshAdminInboxUnreadUi = async function (showIntroFlash) {
        if (typeof w.getInboxUnreadCount !== "function") return;
        try {
            const data = await w.getInboxUnreadCount();
            const count = Number(data.count != null ? data.count : data.Count) || 0;
            w.DeepwellAdmin.setAdminInboxUnreadBadge(count);
            if (showIntroFlash && count > 0) {
                const msg =
                    count === 1
                        ? "You have 1 unread message"
                        : "You have " + count + " unread messages";
                w.showAppFlash("admin-flash", msg, "inbox", undefined, "inbox-unread");
            }
        } catch (_) {}
    };
})(typeof window !== "undefined" ? window : this);
