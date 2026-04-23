(function (w) {
    "use strict";

    function bindPasswordToggles(root) {
        var scope = root || document;
        scope.querySelectorAll("[data-password-toggle]").forEach(function (btn) {
            if (btn.dataset.boundPwd === "1") return;
            btn.dataset.boundPwd = "1";
            btn.addEventListener("click", function () {
                var id = btn.getAttribute("data-password-toggle");
                var input = document.getElementById(id);
                if (!input) return;
                var show = input.type === "password";
                input.type = show ? "text" : "password";
                btn.setAttribute("aria-pressed", show ? "true" : "false");
                var icon = btn.querySelector("i");
                if (icon) icon.className = show ? "fa fa-eye-slash" : "fa fa-eye";
            });
        });
    }

    function wireChangePasswordButton(cfg) {
        var btn = document.getElementById(cfg.submitId);
        if (!btn) return;
        btn.addEventListener("click", async function () {
            var curEl = document.getElementById(cfg.currentId);
            var nextEl = document.getElementById(cfg.nextId);
            var confEl = document.getElementById(cfg.confirmId);
            if (!curEl || !nextEl || !confEl) return;

            var cur = curEl.value.trim();
            var next = nextEl.value.trim();
            var conf = confEl.value.trim();
            cfg.flash("", "info");
            if (!cur) {
                cfg.flash("Enter your current password", "warning");
                return;
            }
            if (!next || !conf) {
                if (typeof w.verifyCurrentPassword !== "function") {
                    cfg.flash("Enter your new password", "warning");
                    return;
                }
                btn.disabled = true;
                var vr = await w.verifyCurrentPassword(cur);
                btn.disabled = false;
                if (!vr.ok) {
                    cfg.flash(vr.message || "Current password is incorrect", "danger");
                    return;
                }
                if (!next) {
                    cfg.flash("Enter your new password", "warning");
                    return;
                }
                var perrPartial =
                    typeof w.validatePasswordPolicy === "function" ? w.validatePasswordPolicy(next) : "";
                if (perrPartial) {
                    cfg.flash(perrPartial, "warning");
                    return;
                }
                if (!conf) {
                    cfg.flash("Enter your new password again to confirm", "warning");
                    return;
                }
            }
            if (next !== conf) {
                cfg.flash("New password and confirmation do not match", "warning");
                return;
            }
            var perr = typeof w.validatePasswordPolicy === "function" ? w.validatePasswordPolicy(next) : "";
            if (perr) {
                cfg.flash(perr, "warning");
                return;
            }
            if (typeof w.changeMyPassword !== "function") {
                cfg.flash("Password update is not available", "danger");
                return;
            }
            btn.disabled = true;
            var r = await w.changeMyPassword(cur, next);
            btn.disabled = false;
            if (!r.ok) {
                cfg.flash(r.message || "Could not change password", "danger");
                return;
            }
            curEl.value = "";
            nextEl.value = "";
            confEl.value = "";
            if (typeof cfg.onSuccess === "function") cfg.onSuccess();
        });
    }

    w.DeepwellPasswordUi = {
        bindPasswordToggles: bindPasswordToggles,
        wireChangePasswordButton: wireChangePasswordButton
    };
})(typeof window !== "undefined" ? window : this);
