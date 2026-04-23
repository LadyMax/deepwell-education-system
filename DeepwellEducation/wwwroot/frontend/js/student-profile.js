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
    var personNamePattern = /^[A-Za-zÅÄÖåäö]+$/;
    var PHONE_COUNTRIES = [
        { code: "+966", name: "Saudi Arabia", flag: "saudi-arabia.png" },
        { code: "+86", name: "China", flag: "china.png" },
        { code: "+44", name: "United Kingdom", flag: "united-kingdom.png" },
        { code: "+33", name: "France", flag: "france.png" },
        { code: "+46", name: "Sweden", flag: "sweden.png" },
        { code: "+39", name: "Italy", flag: "italy.png" },
        { code: "+81", name: "Japan", flag: "japan.png" },
        { code: "+34", name: "Spain", flag: "spain.png" },
        { code: "+49", name: "Germany", flag: "germany.png" },
        { code: "+45", name: "Denmark", flag: "denmark.png" },
        { code: "+31", name: "Netherlands", flag: "netherlands.png" },
        { code: "+358", name: "Finland", flag: "finland.png" },
        { code: "+30", name: "Greece", flag: "greece.png" },
        { code: "+972", name: "Israel", flag: "israel.png" },
        { code: "+354", name: "Iceland", flag: "iceland.png" },
        { code: "+82", name: "South Korea", flag: "south-korea.png" },
        { code: "+47", name: "Norway", flag: "norway.png" },
        { code: "+98", name: "Iran", flag: "iran.png" },
        { code: "+48", name: "Poland", flag: "poland.png" },
        { code: "+351", name: "Portugal", flag: "portugal.png" },
        { code: "+7", name: "Russia", flag: "russia.png" },
        { code: "+66", name: "Thailand", flag: "thailand.png" },
        { code: "+90", name: "Turkey", flag: "turkey.png" },
        { code: "+84", name: "Vietnam", flag: "vietnam.png" }
    ];
    var phoneCountryCodes = PHONE_COUNTRIES
        .map(function (c) { return c.code; })
        .sort(function (a, b) { return b.length - a.length; });

    function normalizePersonName(raw) {
        var s = String(raw || "").trim();
        if (!s) return "";
        var lower = s.toLocaleLowerCase();
        return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
    }

    function parseStoredPhone(phoneRaw) {
        var raw = String(phoneRaw || "").trim();
        if (!raw) return { countryCode: "+46", local: "", customCountryCode: "" };
        var compact = raw.replace(/\s+/g, "");
        for (var i = 0; i < phoneCountryCodes.length; i++) {
            var code = phoneCountryCodes[i];
            if (compact.indexOf(code) === 0) {
                return {
                    countryCode: code,
                    local: compact.slice(code.length).replace(/[^\d]/g, ""),
                    customCountryCode: ""
                };
            }
        }
        if (compact.indexOf("+") === 0) {
            var digits = compact.slice(1).replace(/[^\d]/g, "");
            var codeLen = Math.min(3, digits.length);
            var customCode = codeLen > 0 ? "+" + digits.slice(0, codeLen) : "";
            return {
                countryCode: "",
                customCountryCode: customCode,
                local: digits.slice(codeLen)
            };
        }
        return { countryCode: "", local: compact.replace(/[^\d]/g, ""), customCountryCode: "" };
    }

    function composePhoneForSave() {
        var localEl = document.getElementById("profile-phone");
        var countryEl = document.getElementById("profile-phone-country");
        var customCountryEl = document.getElementById("profile-phone-custom-country");
        var localDigits = (localEl && localEl.value ? localEl.value : "").replace(/[^\d]/g, "");
        var countryCode = countryEl ? String(countryEl.value || "").trim() : "";
        var customCountryCode = customCountryEl ? String(customCountryEl.value || "").trim() : "";
        customCountryCode = customCountryCode.replace(/[^\d+]/g, "");
        if (customCountryCode && customCountryCode.charAt(0) !== "+") {
            customCountryCode = "+" + customCountryCode.replace(/[^\d]/g, "");
        } else if (customCountryCode) {
            customCountryCode = "+" + customCountryCode.slice(1).replace(/[^\d]/g, "");
        }
        if (!localDigits) return "";
        if (!countryCode) {
            if (customCountryCode) return customCountryCode + localDigits;
            return localDigits;
        }
        return countryCode + localDigits;
    }

    function phoneCountryByCode(code) {
        var normalized = String(code || "").trim();
        for (var i = 0; i < PHONE_COUNTRIES.length; i++) {
            if (PHONE_COUNTRIES[i].code === normalized) return PHONE_COUNTRIES[i];
        }
        return null;
    }

    function flagImageForCountryCode(code) {
        var c = phoneCountryByCode(code);
        if (!c) return { src: "images/flags-global/international.png", alt: "International flag" };
        return { src: "images/flags-course/" + c.flag, alt: c.name + " flag" };
    }

    St.updatePhoneCountryFlag = function () {
        var localEl = document.getElementById("profile-phone");
        var countryEl = document.getElementById("profile-phone-country");
        var customWrapEl = document.getElementById("profile-phone-custom-wrap");
        var customCountryEl = document.getElementById("profile-phone-custom-country");
        var flagImgEl = document.getElementById("profile-phone-flag-img");
        var flagFallbackEl = document.getElementById("profile-phone-flag-fallback");
        if (!localEl) return;
        localEl.value = String(localEl.value || "").replace(/[^\d]/g, "");
        var code = countryEl ? String(countryEl.value || "") : "";
        if (customWrapEl) customWrapEl.classList.toggle("d-none", !!code);
        if (customCountryEl) {
            var cleanCustom = String(customCountryEl.value || "").replace(/[^\d+]/g, "");
            if (cleanCustom && cleanCustom.charAt(0) !== "+") {
                cleanCustom = "+" + cleanCustom.replace(/[^\d]/g, "");
            } else if (cleanCustom) {
                cleanCustom = "+" + cleanCustom.slice(1).replace(/[^\d]/g, "");
            }
            customCountryEl.value = cleanCustom;
        }
        if (flagImgEl) {
            var flag = flagImageForCountryCode(code);
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
        var firstName = pick(p, "firstName", "FirstName") || "";
        var lastName = pick(p, "lastName", "LastName") || "";
        var phone = pick(p, "phone", "Phone") || "";
        var dob = toDateInputValue(pick(p, "dateOfBirth", "DateOfBirth"));
        var city = pick(p, "city", "City") || "";
        var address = pick(p, "address", "Address") || "";
        document.getElementById("profile-first-name").value = firstName;
        document.getElementById("profile-last-name").value = lastName;
        var parsedPhone = parseStoredPhone(phone);
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

    St.onCancelProfileDetailsClick = function () {
        if (!St._lastSavedStudentProfile) return;
        St.fillStudentProfileForm(St._lastSavedStudentProfile);
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
        var firstNameRaw = normalizePersonName(document.getElementById("profile-first-name").value);
        var lastNameRaw = normalizePersonName(document.getElementById("profile-last-name").value);
        if (firstNameRaw && !personNamePattern.test(firstNameRaw)) {
            showAppFlash(
                "student-flash",
                "First name may only contain letters (A-Z, plus Swedish letters å/ä/ö; no spaces, digits, or special characters).",
                "warning",
                6000
            );
            return;
        }
        if (lastNameRaw && !personNamePattern.test(lastNameRaw)) {
            showAppFlash(
                "student-flash",
                "Last name may only contain letters (A-Z, plus Swedish letters å/ä/ö; no spaces, digits, or special characters).",
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
                "City may only contain letters (A-Z, plus Swedish letters å/ä/ö; no spaces, digits, or special characters).",
                "warning",
                6000
            );
            return;
        }
        document.getElementById("profile-first-name").value = firstNameRaw;
        document.getElementById("profile-last-name").value = lastNameRaw;
        var cityEl = document.getElementById("profile-city");
        if (cityEl) cityEl.value = cityRaw;
        const payload = {
            firstName: firstNameRaw,
            lastName: lastNameRaw,
            phone: composePhoneForSave(),
            dateOfBirth: document.getElementById("profile-dob").value || null,
            city: cityRaw,
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

