(function (w) {
    "use strict";

    var countries = [
        { code: "+966", name: "Saudi Arabia", flag: "saudi-arabia.png" },
        { code: "+86", name: "China", flag: "china.png" },
        { code: "+44", name: "United Kingdom", flag: "united-kingdom.png" },
        { code: "+33", name: "France", flag: "france.png" },
        { code: "+46", name: "Sweden", flag: "sweden.png" },
        { code: "+39", name: "Italy", flag: "italy.png" },
        { code: "+81", name: "Japan", flag: "japan.png" },
        { code: "+34", name: "Spain", flag: "spain.png" },
        { code: "+49", name: "Germany", flag: "germany.png" },
        { code: "+47", name: "Norway", flag: "norway.png" },
        { code: "+45", name: "Denmark", flag: "denmark.png" },
        { code: "+31", name: "Netherlands", flag: "netherlands.png" },
        { code: "+358", name: "Finland", flag: "finland.png" },
        { code: "+30", name: "Greece", flag: "greece.png" },
        { code: "+972", name: "Israel", flag: "israel.png" },
        { code: "+354", name: "Iceland", flag: "iceland.png" },
        { code: "+82", name: "South Korea", flag: "south-korea.png" },
        { code: "+98", name: "Iran", flag: "iran.png" },
        { code: "+48", name: "Poland", flag: "poland.png" },
        { code: "+351", name: "Portugal", flag: "portugal.png" },
        { code: "+7", name: "Russia", flag: "russia.png" },
        { code: "+66", name: "Thailand", flag: "thailand.png" },
        { code: "+90", name: "Turkey", flag: "turkey.png" },
        { code: "+84", name: "Vietnam", flag: "vietnam.png" }
    ];

    var byCode = {};
    var codesByLenDesc = [];
    countries.forEach(function (c) {
        byCode[c.code] = c;
        codesByLenDesc.push(c.code);
    });
    codesByLenDesc.sort(function (a, b) {
        return b.length - a.length;
    });

    function sanitizeDigits(s) {
        return String(s || "").replace(/[^\d]/g, "");
    }

    function sanitizeCustomCode(raw) {
        var s = String(raw || "").replace(/[^\d+]/g, "");
        if (!s) return "";
        if (s.charAt(0) !== "+") return "+" + sanitizeDigits(s);
        return "+" + sanitizeDigits(s.slice(1));
    }

    function parseStoredPhone(phoneRaw, defaultCode) {
        var fallback = defaultCode || "+46";
        var raw = String(phoneRaw || "").trim();
        if (!raw) return { countryCode: fallback, local: "", customCountryCode: "" };
        var compact = raw.replace(/\s+/g, "");
        for (var i = 0; i < codesByLenDesc.length; i++) {
            var code = codesByLenDesc[i];
            if (compact.indexOf(code) === 0) {
                return {
                    countryCode: code,
                    local: sanitizeDigits(compact.slice(code.length)),
                    customCountryCode: ""
                };
            }
        }
        if (compact.indexOf("+") === 0) {
            var digits = sanitizeDigits(compact.slice(1));
            var codeLen = Math.min(3, digits.length);
            return {
                countryCode: "",
                customCountryCode: codeLen > 0 ? "+" + digits.slice(0, codeLen) : "",
                local: digits.slice(codeLen)
            };
        }
        return { countryCode: "", local: sanitizeDigits(compact), customCountryCode: "" };
    }

    function composePhoneForSave(countryCode, customCountryCode, localRaw) {
        var local = sanitizeDigits(localRaw);
        if (!local) return "";
        var code = String(countryCode || "").trim();
        if (code) return code + local;
        var custom = sanitizeCustomCode(customCountryCode);
        return custom ? custom + local : local;
    }

    function getFlagImageForCode(code) {
        var c = byCode[String(code || "").trim()];
        if (!c) return { src: "images/flags-global/international.png", alt: "International flag" };
        return { src: "images/flags-course/" + c.flag, alt: c.name + " flag" };
    }

    function getDisplayPhone(phoneRaw) {
        var p = parseStoredPhone(phoneRaw, "+46");
        var flag = getFlagImageForCode(p.countryCode);
        var c = byCode[p.countryCode] || null;
        return {
            countryCode: p.countryCode,
            local: p.local,
            customCountryCode: p.customCountryCode,
            flagSrc: flag.src,
            flagAlt: flag.alt,
            countryName: c ? c.name : "Other"
        };
    }

    async function validateFlagMappings() {
        var all = countries.map(function (c) { return "images/flags-course/" + c.flag; });
        all.push("images/flags-global/international.png");
        var missing = [];
        for (var i = 0; i < all.length; i++) {
            try {
                var res = await fetch(all[i], { method: "HEAD" });
                if (!res.ok) missing.push(all[i]);
            } catch (_) {
                missing.push(all[i]);
            }
        }
        return { ok: missing.length === 0, missing: missing };
    }

    w.DeepwellPhoneCountryConfig = {
        countries: countries,
        byCode: byCode,
        parseStoredPhone: parseStoredPhone,
        composePhoneForSave: composePhoneForSave,
        sanitizeDigits: sanitizeDigits,
        sanitizeCustomCode: sanitizeCustomCode,
        getFlagImageForCode: getFlagImageForCode,
        getDisplayPhone: getDisplayPhone,
        validateFlagMappings: validateFlagMappings
    };
})(typeof window !== "undefined" ? window : this);
