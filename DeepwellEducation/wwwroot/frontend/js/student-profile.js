(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before student-profile.js).");
        return;
    }
    var Pcfg = w.DeepwellPhoneCountryConfig;
    if (!Pcfg) {
        console.error("Missing phone-country-config.js (load before student-profile.js).");
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
    var personNamePattern = /^[A-Za-zÅÄÖåäö]+$/;
    function normalizePersonName(raw) {
        var s = String(raw || "").trim();
        if (!s) return "";
        var lower = s.toLocaleLowerCase();
        return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
    }

    function composePhoneForSave() {
        var localEl = document.getElementById("profile-phone");
        var countryEl = document.getElementById("profile-phone-country");
        var customCountryEl = document.getElementById("profile-phone-custom-country");
        var countryCode = countryEl ? String(countryEl.value || "").trim() : "";
        var customCountryCode = customCountryEl ? String(customCountryEl.value || "") : "";
        var local = localEl ? String(localEl.value || "") : "";
        return Pcfg.composePhoneForSave(countryCode, customCountryCode, local);
    }

    function isProfileCompletionMissing(p) {
        var firstName = String(pick(p, "firstName", "FirstName") || "").trim();
        var lastName = String(pick(p, "lastName", "LastName") || "").trim();
        var phone = String(pick(p, "phone", "Phone") || "").trim();
        return !firstName || !lastName || !phone;
    }

    function profileValueOrEmpty(v) {
        return v == null ? "" : String(v).trim();
    }

    function hasProfileDetailsChanges(payload, lastSavedProfile) {
        var lastSaved = lastSavedProfile || {};
        var lastSavedDob = profileValueOrEmpty(lastSaved.dateOfBirth);
        var payloadDob = profileValueOrEmpty(payload.dateOfBirth);
        return (
            profileValueOrEmpty(payload.firstName) !== profileValueOrEmpty(lastSaved.firstName) ||
            profileValueOrEmpty(payload.lastName) !== profileValueOrEmpty(lastSaved.lastName) ||
            profileValueOrEmpty(payload.phone) !== profileValueOrEmpty(lastSaved.phone) ||
            payloadDob !== lastSavedDob ||
            profileValueOrEmpty(payload.city) !== profileValueOrEmpty(lastSaved.city) ||
            profileValueOrEmpty(payload.address) !== profileValueOrEmpty(lastSaved.address)
        );
    }

    function buildProfilePayloadFromForm() {
        var firstNameRaw = normalizePersonName(document.getElementById("profile-first-name").value);
        var lastNameRaw = normalizePersonName(document.getElementById("profile-last-name").value);
        var cityRaw = (function () {
            var el = document.getElementById("profile-city");
            return el ? el.value.trim() : "";
        })();
        return {
            firstName: firstNameRaw,
            lastName: lastNameRaw,
            phone: composePhoneForSave(),
            dateOfBirth: document.getElementById("profile-dob").value || null,
            city: cityRaw,
            address: document.getElementById("profile-address").value.trim()
        };
    }

    function initPhoneCountryOptions() {
        var sel = document.getElementById("profile-phone-country");
        if (!sel) return;
        sel.innerHTML = "";
        Pcfg.countries.forEach(function (c) {
            var opt = document.createElement("option");
            opt.value = c.code;
            opt.textContent = c.name + " (" + c.code + ")";
            sel.appendChild(opt);
        });
        var other = document.createElement("option");
        other.value = "";
        other.textContent = "Other";
        sel.appendChild(other);
    }

    St.updatePhoneCountryFlag = function () {
        var localEl = document.getElementById("profile-phone");
        var countryEl = document.getElementById("profile-phone-country");
        var customWrapEl = document.getElementById("profile-phone-custom-wrap");
        var customCountryEl = document.getElementById("profile-phone-custom-country");
        var flagImgEl = document.getElementById("profile-phone-flag-img");
        var flagFallbackEl = document.getElementById("profile-phone-flag-fallback");
        if (!localEl) return;
        localEl.value = Pcfg.sanitizeDigits(localEl.value || "");
        var code = countryEl ? String(countryEl.value || "") : "";
        if (customWrapEl) customWrapEl.classList.toggle("d-none", !!code);
        if (customCountryEl) {
            customCountryEl.value = Pcfg.sanitizeCustomCode(customCountryEl.value || "");
        }
        if (flagImgEl) {
            var flag = Pcfg.getFlagImageForCode(code);
            if (flag) {
                flagImgEl.src = flag.src;
                flagImgEl.alt = flag.alt;
                flagImgEl.classList.remove("d-none");
                if (flagFallbackEl) flagFallbackEl.classList.add("d-none");
            } else {
                flagImgEl.classList.add("d-none");
                if (flagFallbackEl) flagFallbackEl.classList.remove("d-none");
            }
        }
    };

    St.validateUsernameForChange = function (raw) {
        const s = (raw || "").trim();
        if (!s) return "Username is required.";
        if (s.length < 3 || s.length > 20) return "Username must be 3–20 characters";
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
        setOk("student-pw-rule-max", r.withinMax);
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

    St.setProfileDetailsSectionVisible = function (showSection, noteText, noteVariant) {
        const section = document.getElementById("profile-details-section");
        const note = document.getElementById("profile-details-note");
        if (section) section.classList.toggle("d-none", !showSection);
        if (note) {
            note.textContent = noteText || "";
            note.classList.toggle("d-none", !noteText);
            note.classList.remove("profile-note--info", "profile-note--warning");
            if (noteText) {
                note.classList.add(noteVariant === "warning" ? "profile-note--warning" : "profile-note--info");
            }
        }
    };

    St.fillStudentProfileForm = function (p) {
        var firstName = pick(p, "firstName", "FirstName") || "";
        var lastName = pick(p, "lastName", "LastName") || "";
        var phone = pick(p, "phone", "Phone") || "";
        var dob = toDateInputValue(pick(p, "dateOfBirth", "DateOfBirth"));
        var city = pick(p, "city", "City") || "";
        var address = pick(p, "address", "Address") || "";
        document.getElementById("profile-first-name").value = firstName;
        document.getElementById("profile-last-name").value = lastName;
        var parsedPhone = Pcfg.parseStoredPhone(phone, "+46");
        var countryEl = document.getElementById("profile-phone-country");
        if (countryEl) countryEl.value = parsedPhone.countryCode;
        var customCountryEl = document.getElementById("profile-phone-custom-country");
        if (customCountryEl) customCountryEl.value = parsedPhone.customCountryCode || "";
        document.getElementById("profile-phone").value = parsedPhone.local;
        St.updatePhoneCountryFlag();
        document.getElementById("profile-dob").value = dob;
        var cityEl = document.getElementById("profile-city");
        if (cityEl) cityEl.value = city;
        document.getElementById("profile-address").value = address;
        St._lastSavedStudentProfile = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            dateOfBirth: dob || null,
            city: city,
            address: address
        };
    };

    initPhoneCountryOptions();

    St.onCancelProfileDetailsClick = function () {
        if (!St._lastSavedStudentProfile) return;
        St.fillStudentProfileForm(St._lastSavedStudentProfile);
    };

    St.hasUnsavedProfileDetailsChanges = function () {
        return hasProfileDetailsChanges(buildProfilePayloadFromForm(), St._lastSavedStudentProfile);
    };

    St.loadStudentProfileDetails = async function (roleRaw) {
        const isStudent = roleRaw === 1 || roleRaw === "Student";
        if (!isStudent) {
            St.setProfileDetailsSectionVisible(false, "");
            return;
        }
        if (typeof getMyStudentProfile !== "function") {
            St.setProfileDetailsSectionVisible(false, "Student profile service is not available", "info");
            return;
        }
        const r = await getMyStudentProfile();
        if (!r.ok) {
            const msg = r.notFound
                ? "Student profile is not ready yet. Please contact staff if this persists"
                : r.message || "Could not load student profile";
            St.setProfileDetailsSectionVisible(false, msg, "info");
            return;
        }
        var profileData = r.data || {};
        St.fillStudentProfileForm(profileData);
        var needsCompletion = isProfileCompletionMissing(profileData);
        St.setProfileDetailsSectionVisible(
            true,
            needsCompletion ? "Please complete your student profile" : "",
            needsCompletion ? "warning" : "info"
        );
        if (needsCompletion) {
            showAppFlash(
                "student-flash",
                "Please complete your student profile",
                "warning",
                9000
            );
        }
    };

    St.loadProfile = async function () {
        const meRes = await getMe();
        document.getElementById("profile-loading").classList.add("d-none");
        if (!meRes.ok) return;
        const me = meRes.data || {};
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
            St.showUsernameFlash("That is already your username", "info");
            return;
        }
        if (typeof changeMyUsername !== "function") {
            St.showUsernameFlash("Username update is not available", "danger");
            return;
        }
        btn.disabled = true;
        const r = await changeMyUsername(next);
        btn.disabled = false;
        if (!r.ok) {
            St.showUsernameFlash(r.message || "Could not update username", "danger");
            return;
        }
        const updated = pick(r.data, "userName", "UserName") || pick(r.data, "fullName", "FullName");
        St.applyUsernameToUi(updated);
        St.setUsernameEditorVisible(false);
        showAppFlash("student-flash", "Username updated", "success", 3500);
        if (typeof window.deepwellRefreshAuthNav === "function") {
            window.deepwellRefreshAuthNav();
        }
    };

    St.onSaveProfileDetailsClick = async function () {
        const btn = document.getElementById("btn-save-profile-details");
        var firstNameRaw = normalizePersonName(document.getElementById("profile-first-name").value);
        var lastNameRaw = normalizePersonName(document.getElementById("profile-last-name").value);
        if (!firstNameRaw) {
            showAppFlash("student-flash", "First name is required", "warning", 5000);
            return;
        }
        if (!lastNameRaw) {
            showAppFlash("student-flash", "Last name is required", "warning", 5000);
            return;
        }
        if (firstNameRaw && !personNamePattern.test(firstNameRaw)) {
            showAppFlash(
                "student-flash",
                "First name may only contain letters (no spaces, digits, or special characters)",
                "warning",
                6000
            );
            return;
        }
        if (lastNameRaw && !personNamePattern.test(lastNameRaw)) {
            showAppFlash(
                "student-flash",
                "Last name may only contain letters (no spaces, digits, or special characters)",
                "warning",
                6000
            );
            return;
        }
        var cityRaw = (function () {
            var el = document.getElementById("profile-city");
            return el ? el.value.trim() : "";
        })();
        if (cityRaw && !personNamePattern.test(cityRaw)) {
            showAppFlash(
                "student-flash",
                "City may only contain letters (no spaces, digits, or special characters)",
                "warning",
                6000
            );
            return;
        }
        document.getElementById("profile-first-name").value = firstNameRaw;
        document.getElementById("profile-last-name").value = lastNameRaw;
        var cityEl = document.getElementById("profile-city");
        if (cityEl) cityEl.value = cityRaw;
        const payload = buildProfilePayloadFromForm();
        if (!payload.phone) {
            showAppFlash("student-flash", "Phone is required", "warning", 5000);
            return;
        }
        if (payload.phone.length > 20) {
            showAppFlash("student-flash", "Phone must be 20 characters or fewer", "warning", 5000);
            return;
        }
        if (!hasProfileDetailsChanges(payload, St._lastSavedStudentProfile)) {
            showAppFlash("profile-details-flash", "No changes to save", "info", 2500);
            return;
        }
        showAppFlash("profile-details-flash", "", "info", 0);
        btn.disabled = true;
        const r = await updateMyStudentProfile(payload);
        btn.disabled = false;
        if (!r.ok) {
            showAppFlash("student-flash", r.message || "Failed to save student profile", "danger", 6000);
            return;
        }
        St.fillStudentProfileForm(r.data || payload);
        showAppFlash("student-flash", "Student profile saved", "success", 3500);
        if (window.jQuery) {
            jQuery("#collapse-profile-details").collapse("hide");
        }
    };
})(typeof window !== "undefined" ? window : this);

