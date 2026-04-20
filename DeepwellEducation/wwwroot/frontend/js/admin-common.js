(function (w) {
    "use strict";

    w.DeepwellAdmin = w.DeepwellAdmin || {};

    w.DeepwellAdmin.staffForbiddenNote = function () {
        return "You need staff access. Sign in with a staff account.";
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
