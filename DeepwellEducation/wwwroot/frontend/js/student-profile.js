(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before student-profile.js).");
        return;
    }

    var St = (w.DeepwellStudent = w.DeepwellStudent || {});

    function roleLabel(role) {
        if (role === 2 || role === "Admin") return "Admin";
        if (role === 1 || role === "Student") return "Student";
        return "Visitor";
    }

    function toDateInputValue(v) {
        if (!v) return "";
        const s = String(v);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const d = new Date(s);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().slice(0, 10);
    }

    var usernamePattern = /^[A-Za-z0-9._-]+$/;

    St.validateUsernameForChange = function (raw) {
        const s = (raw || "").trim();
        if (!s) return "Username is required.";
        if (s.length < 3 || s.length > 32) return "Username must be 3–32 characters.";
        if (!usernamePattern.test(s)) return "Username may only contain letters, digits, and . _ -";
        return "";
    };

    St.showUsernameFlash = function (message, variant) {
        const el = document.getElementById("profile-username-flash");
        if (!el) return;
        if (!message) {
            el.classList.add("d-none");
            el.textContent = "";
            return;
        }
        const v = variant || "danger";
        el.textContent = message;
        el.className = "app-flash app-flash--" + v + " mb-2";
        el.classList.remove("d-none");
    };

    St.setUsernameEditorVisible = function (show) {
        const editor = document.getElementById("profile-username-editor");
        const input = document.getElementById("profile-username-input");
        if (!editor) return;
        editor.classList.toggle("d-none", !show);
        if (!show) {
            St.showUsernameFlash("", "info");
            if (input) input.value = "";
        }
    };

    St.applyUsernameToUi = function (name) {
        const disp = document.getElementById("profile-username-display");
        if (disp) disp.textContent = name && String(name).trim() ? String(name).trim() : "—";
    };

    St.updateStudentPasswordChecklist = function () {
        if (typeof evaluatePasswordRules !== "function") return;
        const p = document.getElementById("student-new-password");
        const pwd = p ? p.value : "";
        const r = evaluatePasswordRules(pwd);
        function setOk(id, ok) {
            const el = document.getElementById(id);
            if (!el) return;
            el.className = ok ? "ok" : "bad";
        }
        setOk("student-pw-rule-len", r.minLen);
        setOk("student-pw-rule-upper", r.upper);
        setOk("student-pw-rule-lower", r.lower);
        setOk("student-pw-rule-digit", r.digit);
        setOk("student-pw-rule-special", r.special);
    };

    St.showPasswordChangeFlash = function (message, variant) {
        const el = document.getElementById("password-change-flash");
        if (!el) return;
        if (!message) {
            el.classList.add("d-none");
            el.textContent = "";
            return;
        }
        const v = variant || "danger";
        el.textContent = message;
        el.className = "app-flash app-flash--" + v + " mb-3";
        el.classList.remove("d-none");
    };

    St.initStudentPasswordCollapse = function () {
        if (!window.jQuery) return;
        jQuery("#collapse-password-settings").on(
            "show.bs.collapse shown.bs.collapse hide.bs.collapse hidden.bs.collapse",
            function (e) {
                const chev = document.getElementById("student-password-chevron");
                if (!chev) return;
                if (e.type === "show" || e.type === "shown") {
                    chev.className = "fa fa-chevron-up small text-muted";
                } else if (e.type === "hide" || e.type === "hidden") {
                    chev.className = "fa fa-chevron-down small text-muted";
                }
            }
        );
    };

    St.initStudentProfileDetailsCollapse = function () {
        if (!window.jQuery) return;
        jQuery("#collapse-profile-details").on(
            "show.bs.collapse shown.bs.collapse hide.bs.collapse hidden.bs.collapse",
            function (e) {
                const chev = document.getElementById("student-profile-details-chevron");
                if (!chev) return;
                if (e.type === "show" || e.type === "shown") {
                    chev.className = "fa fa-chevron-up small text-muted";
                } else if (e.type === "hide" || e.type === "hidden") {
                    chev.className = "fa fa-chevron-down small text-muted";
                }
            }
        );
    };

    St.setProfileDetailsSectionVisible = function (showSection, noteText) {
        const section = document.getElementById("profile-details-section");
        const note = document.getElementById("profile-details-note");
        if (section) section.classList.toggle("d-none", !showSection);
        if (note) {
            note.textContent = noteText || "";
            note.classList.toggle("d-none", !noteText);
        }
    };

    St.fillStudentProfileForm = function (p) {
        document.getElementById("profile-first-name").value = pick(p, "firstName", "FirstName") || "";
        document.getElementById("profile-last-name").value = pick(p, "lastName", "LastName") || "";
        document.getElementById("profile-phone").value = pick(p, "phone", "Phone") || "";
        document.getElementById("profile-dob").value = toDateInputValue(pick(p, "dateOfBirth", "DateOfBirth"));
        var cityEl = document.getElementById("profile-city");
        if (cityEl) cityEl.value = pick(p, "city", "City") || "";
        document.getElementById("profile-address").value = pick(p, "address", "Address") || "";
    };

    St.loadStudentProfileDetails = async function (roleRaw) {
        const isStudent = roleRaw === 1 || roleRaw === "Student";
        if (!isStudent) {
            St.setProfileDetailsSectionVisible(false, "");
            return;
        }
        if (typeof getMyStudentProfile !== "function") {
            St.setProfileDetailsSectionVisible(false, "Student profile service is not available.");
            return;
        }
        const r = await getMyStudentProfile();
        if (!r.ok) {
            const msg = r.notFound
                ? "Student profile is not ready yet. Please contact staff if this persists."
                : r.message || "Could not load student profile.";
            St.setProfileDetailsSectionVisible(false, msg);
            return;
        }
        St.fillStudentProfileForm(r.data || {});
        St.setProfileDetailsSectionVisible(true, "");
    };

    St.loadProfile = async function () {
        const me = await getMe();
        document.getElementById("profile-loading").classList.add("d-none");
        if (!me) return;
        St.applyUsernameToUi(pick(me, "userName", "UserName") || pick(me, "fullName", "FullName"));
        document.getElementById("profile-email").textContent = pick(me, "email", "Email") || "—";
        const sn = pick(me, "studentNumber", "StudentNumber");
        const snRow = document.getElementById("profile-student-number-row");
        const snEl = document.getElementById("profile-student-number");
        if (snRow && snEl) {
            const hasSn = sn != null && String(sn).trim() !== "";
            snEl.textContent = hasSn ? String(sn).trim() : "";
            snRow.classList.toggle("d-none", !hasSn);
        }
        const roleRaw = pick(me, "role", "Role");
        document.getElementById("profile-role").textContent = roleLabel(roleRaw);
        document.getElementById("profile-card").classList.remove("d-none");
        await St.loadStudentProfileDetails(roleRaw);
    };

    St.onToggleUsernameClick = function () {
        const editor = document.getElementById("profile-username-editor");
        const open = editor && !editor.classList.contains("d-none");
        if (open) {
            St.setUsernameEditorVisible(false);
            return;
        }
        St.setUsernameEditorVisible(true);
        const input = document.getElementById("profile-username-input");
        const current = document.getElementById("profile-username-display");
        if (input && current && current.textContent && current.textContent !== "—") {
            input.value = current.textContent.trim();
        }
        if (input) input.focus();
    };

    St.onSaveUsernameClick = async function () {
        const btn = document.getElementById("btn-save-username");
        const input = document.getElementById("profile-username-input");
        const next = input ? input.value : "";
        const err = St.validateUsernameForChange(next);
        if (err) {
            St.showUsernameFlash(err, "danger");
            return;
        }
        const currentEl = document.getElementById("profile-username-display");
        const current = currentEl && currentEl.textContent !== "—" ? currentEl.textContent.trim() : "";
        if (current && current.toLowerCase() === next.trim().toLowerCase()) {
            St.showUsernameFlash("That is already your username.", "info");
            return;
        }
        if (typeof changeMyUsername !== "function") {
            St.showUsernameFlash("Username update is not available.", "danger");
            return;
        }
        btn.disabled = true;
        const r = await changeMyUsername(next);
        btn.disabled = false;
        if (!r.ok) {
            St.showUsernameFlash(r.message || "Could not update username.", "danger");
            return;
        }
        const updated = pick(r.data, "userName", "UserName") || pick(r.data, "fullName", "FullName");
        St.applyUsernameToUi(updated);
        St.setUsernameEditorVisible(false);
        showAppFlash("student-flash", "Username updated.", "success", 3500);
        if (typeof window.deepwellRefreshAuthNav === "function") {
            window.deepwellRefreshAuthNav();
        }
    };

    St.onSaveProfileDetailsClick = async function () {
        const btn = document.getElementById("btn-save-profile-details");
        const payload = {
            firstName: document.getElementById("profile-first-name").value.trim(),
            lastName: document.getElementById("profile-last-name").value.trim(),
            phone: document.getElementById("profile-phone").value.trim(),
            dateOfBirth: document.getElementById("profile-dob").value || null,
            city: (function () {
                var el = document.getElementById("profile-city");
                return el ? el.value.trim() : "";
            })(),
            address: document.getElementById("profile-address").value.trim()
        };
        btn.disabled = true;
        const r = await updateMyStudentProfile(payload);
        btn.disabled = false;
        if (!r.ok) {
            showAppFlash("student-flash", r.message || "Failed to save student profile.", "danger", 6000);
            return;
        }
        St.fillStudentProfileForm(r.data || payload);
        showAppFlash("student-flash", "Student profile saved.", "success", 3500);
    };
})(typeof window !== "undefined" ? window : this);
