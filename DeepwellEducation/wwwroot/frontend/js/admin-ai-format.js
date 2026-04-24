(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before admin-ai-format.js).");
        return;
    }

    var escapeHtml = S.escapeHtml;

    w.DeepwellAdmin = w.DeepwellAdmin || {};
    var A = w.DeepwellAdmin;

    function normalizeAiCategoryKey(raw) {
        if (raw == null || String(raw).trim() === "") return "";
        return String(raw)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");
    }

    function aiCategoryHumanLabel(raw) {
        if (raw == null || String(raw).trim() === "") return "—";
        var k = normalizeAiCategoryKey(raw);
        var map = {
            course_inquiry: "Course inquiry",
            complaint: "Complaint",
            feedback: "Feedback",
            general_question: "General question",
            technical_support: "Technical support",
            other: "Other"
        };
        if (map[k]) return map[k];
        return String(raw)
            .trim()
            .split(/[_\s]+/)
            .filter(Boolean)
            .map(function (word) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(" ");
    }

    function aiConfidenceFootnote(conf) {
        void conf;
        return "";
    }

    function formatAiSuggestionCell(aiCat, conf) {
        var hasCat = aiCat != null && String(aiCat).trim() !== "";
        var hasConf = conf != null && conf !== "" && !isNaN(Number(conf));
        if (!hasCat && !hasConf) return "—";
        var topicKey = hasCat ? normalizeAiCategoryKey(aiCat) : "";
        var topic = hasCat ? escapeHtml(aiCategoryHumanLabel(String(aiCat).trim())) : "";
        var topicKeyAttr = topicKey ? ' data-topic-key="' + escapeHtml(topicKey) + '"' : "";
        var note = hasConf ? escapeHtml(aiConfidenceFootnote(Number(conf))) : "";
        if (hasCat && hasConf) {
            var body =
                '<div class="admin-ai-readonly-meta">' +
                '<span class="admin-ai-readonly-k">Topic guess</span> ' +
                '<span class="admin-ai-readonly-v admin-ai-topic-guess-cat"' +
                topicKeyAttr +
                ">" +
                topic +
                "</span></div>";
            if (note) {
                body +=
                    '<div class="text-muted small admin-ai-suggestion-note mt-1">' +
                    note +
                    "</div>";
            }
            return body;
        }
        if (hasCat) {
            return (
                '<div class="admin-ai-readonly-meta">' +
                '<span class="admin-ai-readonly-k">Topic guess</span> ' +
                '<span class="admin-ai-readonly-v admin-ai-topic-guess-cat"' +
                topicKeyAttr +
                ">" +
                topic +
                "</span></div>"
            );
        }
        return '<div class="text-muted small">' + note + "</div>";
    }

    A.priorityRank = function (p) {
        var v = String(p || "").toLowerCase();
        if (v === "urgent") return 3;
        if (v === "high") return 2;
        if (v === "normal") return 1;
        return 0;
    };

    A.effectiveSuggestedPriority = function (pri, aiCat, summary) {
        var ps = pri != null && pri !== "" ? String(pri).trim().toLowerCase() : "";
        if (ps === "urgent" || ps === "high" || ps === "normal") return ps;
        var hasTopic = aiCat != null && String(aiCat).trim() !== "";
        var hasSummary = summary != null && String(summary).trim() !== "";
        if (hasTopic || hasSummary) return "normal";
        return ps;
    };

    function formatPriorityLine(pri) {
        var v = String(pri || "").toLowerCase();
        var title = ' title="Priority: ' + escapeHtml(v || "—") + '"';
        if (v === "urgent") {
            return '<span class="badge badge-danger"' + title + ">Time-sensitive</span>";
        }
        if (v === "high") {
            return '<span class="badge badge-warning text-dark"' + title + ">Worth opening soon</span>";
        }
        if (v === "normal") {
            return '<span class="badge badge-secondary"' + title + ">Normal</span>";
        }
        return "";
    }

    function extractedFieldLabel(key) {
        var map = {
            time_sensitive: "Mentions an urgent deadline?",
            mentions_schedule_change: "Mentions a schedule or class change?",
            mentions_payment_or_refund: "Mentions payment or a refund?",
            student_reference: "Who / which student (if detected)",
            main_request: "Main request",
            sentiment: "Tone (very rough)",
            source: ""
        };
        if (map[key] !== undefined) return map[key];
        return key.replace(/_/g, " ").replace(/\b\w/g, function (c) {
            return c.toUpperCase();
        });
    }

    function extractedValueHuman(key, val) {
        if (val === true) return "Yes";
        if (val === false) return "No";
        if (val === null || val === undefined) return "—";
        if (typeof val === "number") return String(val);
        if (typeof val !== "string") return JSON.stringify(val);
        var s = val.trim();
        if (key === "sentiment") {
            var m = {
                calm: "Sounds calm",
                concerned: "Sounds worried",
                angry: "Sounds upset or angry",
                unknown: "Hard to tell"
            };
            if (m[s.toLowerCase()]) return m[s.toLowerCase()];
        }
        return s;
    }

    function extractedRowsForDisplay(o) {
        var rows = [];
        function push(label, valueHtml) {
            rows.push(
                '<dt class="admin-ai-extracted-dt">' +
                    escapeHtml(label) +
                    '</dt><dd class="admin-ai-extracted-dd">' +
                    valueHtml +
                    "</dd>"
            );
        }
        if (o.main_request && String(o.main_request).trim()) {
            push(extractedFieldLabel("main_request"), escapeHtml(String(o.main_request).trim()));
        }
        if (o.student_reference && String(o.student_reference).trim()) {
            push(extractedFieldLabel("student_reference"), escapeHtml(String(o.student_reference).trim()));
        }
        if (o.mentions_schedule_change === true) {
            push(extractedFieldLabel("mentions_schedule_change"), escapeHtml("Yes"));
        }
        if (o.mentions_payment_or_refund === true) {
            push(extractedFieldLabel("mentions_payment_or_refund"), escapeHtml("Yes"));
        }
        if (o.time_sensitive === true) {
            push(extractedFieldLabel("time_sensitive"), escapeHtml("Yes"));
        }
        var sent = String(o.sentiment || "").toLowerCase();
        if (sent === "concerned" || sent === "angry") {
            push(extractedFieldLabel("sentiment"), escapeHtml(extractedValueHuman("sentiment", o.sentiment)));
        }
        return rows;
    }

    function formatExtractedBlock(jsonStr) {
        if (jsonStr == null || String(jsonStr).trim() === "") return "";
        try {
            var o = JSON.parse(String(jsonStr));
            if (!o || typeof o !== "object") return "";
            var rows = extractedRowsForDisplay(o);
            if (!rows.length) return "";
            return (
                '<details class="admin-msg-details mt-1">' +
                '<summary class="small">Worth a glance</summary>' +
                '<div class="admin-staff-read-panel admin-staff-read-panel--scroll mt-1 admin-ai-extracted-wrap">' +
                '<dl class="mb-0 admin-ai-extracted-dl">' +
                rows.join("") +
                "</dl></div></details>"
            );
        } catch {
            return "";
        }
    }

    function formatPriorityAndEngineLine(pri, modelVersion) {
        void modelVersion;
        var pv = String(pri || "").toLowerCase();
        if (pv === "normal" || pv === "") {
            return "";
        }
        var badge = formatPriorityLine(pri);
        if (!badge) return "";
        return (
            '<div class="mb-2 d-flex flex-wrap align-items-center admin-ai-head admin-ai-priority-strip">' +
            '<div class="mr-2 mb-1">' +
            badge +
            "</div></div>"
        );
    }

    var SCHOOL_CATALOG_FLAG_IMAGES = {
        ar: "images/flags-course/saudi-arabia.png",
        zh: "images/flags-course/china.png",
        da: "images/flags-course/denmark.png",
        nl: "images/flags-course/netherlands.png",
        en: "images/flags-course/united-kingdom.png",
        fi: "images/flags-course/finland.png",
        fr: "images/flags-course/france.png",
        el: "images/flags-course/greece.png",
        he: "images/flags-course/israel.png",
        is: "images/flags-course/iceland.png",
        it: "images/flags-course/italy.png",
        ja: "images/flags-course/japan.png",
        de: "images/flags-course/germany.png",
        ko: "images/flags-course/south-korea.png",
        no: "images/flags-course/norway.png",
        fa: "images/flags-course/iran.png",
        pl: "images/flags-course/poland.png",
        pt: "images/flags-course/portugal.png",
        ru: "images/flags-course/russia.png",
        es: "images/flags-course/spain.png",
        sv: "images/flags-course/sweden.png",
        th: "images/flags-course/thailand.png",
        tr: "images/flags-course/turkey.png",
        vi: "images/flags-course/vietnam.png"
    };
    var SCHOOL_CATALOG_LANG_FALLBACK_NAMES = {
        ar: "Arabic",
        zh: "Chinese",
        da: "Danish",
        nl: "Dutch",
        en: "English",
        fi: "Finnish",
        fr: "French",
        el: "Greek",
        he: "Hebrew",
        is: "Icelandic",
        it: "Italian",
        ja: "Japanese",
        de: "German",
        ko: "Korean",
        no: "Norwegian",
        fa: "Persian",
        pl: "Polish",
        pt: "Portuguese",
        ru: "Russian",
        es: "Spanish",
        sv: "Swedish",
        th: "Thai",
        tr: "Turkish",
        vi: "Vietnamese"
    };

    function formatSuggestedSchoolLanguageLine(extractedJson) {
        if (extractedJson == null || String(extractedJson).trim() === "") return "";
        try {
            var o = JSON.parse(String(extractedJson));
            if (!o || typeof o !== "object") return "";
            var code = String(o.school_language_code || "")
                .trim()
                .toLowerCase();
            if (!code || code === "unknown") return "";
            var name = String(o.school_language_name || "").trim();
            if (!name) name = SCHOOL_CATALOG_LANG_FALLBACK_NAMES[code] || "";
            if (!name) return "";
            var flagSrc = SCHOOL_CATALOG_FLAG_IMAGES[code] || "";
            var flagHtml = flagSrc
                ? '<img class="app-lang-flag mr-1 align-middle" src="' +
                  escapeHtml(flagSrc) +
                  '" alt="">'
                : "";
            return (
                '<div class="admin-ai-readonly-meta">' +
                '<span class="admin-ai-readonly-k">Catalog language</span> ' +
                '<span class="admin-ai-readonly-v">' +
                flagHtml +
                "<span>" +
                escapeHtml(name) +
                "</span></span></div>"
            );
        } catch {
            return "";
        }
    }

    function formatDraftReplyBlock(draftRaw, replyContext) {
        var ctx = replyContext || {};
        var rid = ctx.receiverUserId != null ? String(ctx.receiverUserId).trim() : "";
        var draft = String(draftRaw || "");
        var subEnc =
            ctx.replySubjectBase != null && String(ctx.replySubjectBase) !== ""
                ? encodeURIComponent(String(ctx.replySubjectBase))
                : encodeURIComponent("");
        var bodyHtml =
            '<div class="admin-ai-draft-compose mt-1"' +
            (rid ? ' data-receiver-user-id="' + escapeHtml(rid) + '"' : "") +
            ' data-reply-subject-enc="' +
            escapeHtml(subEnc) +
            '">' +
            '<textarea class="form-control form-control-sm admin-ai-draft-input mb-2" rows="6" maxlength="12000" aria-label="Draft reply body">' +
            escapeHtml(draft) +
            "</textarea>" +
            '<div class="d-flex flex-wrap admin-ai-draft-actions">' +
            '<button type="button" class="btn btn-primary btn-sm admin-ai-draft-send mr-2 mb-1"' +
            (rid ? "" : " disabled") +
            ">Send</button>" +
            '<button type="button" class="btn btn-outline-secondary btn-sm admin-ai-draft-cancel mb-1">Cancel</button>' +
            "</div></div>";
        return (
            '<details class="admin-msg-details mt-1">' +
            '<summary class="small">Draft reply</summary>' +
            bodyHtml +
            "</details>"
        );
    }

    A.formatAiAssistCell = function (aiCat, conf, pri, summary, draft, extractedJson, modelVersion, replyContext) {
        var parts = [];
        var priEff = A.effectiveSuggestedPriority(pri, aiCat, summary);
        var schoolLine = formatSuggestedSchoolLanguageLine(extractedJson);
        if (schoolLine) parts.push(schoolLine);
        var head = formatPriorityAndEngineLine(priEff, modelVersion);
        if (head) parts.push(head);
        var core = formatAiSuggestionCell(aiCat, conf);
        if (core !== "—") parts.push(core);
        if (summary != null && String(summary).trim() !== "") {
            parts.push(
                '<details class="admin-msg-details mt-1">' +
                '<summary class="small">Auto summary</summary>' +
                '<div class="admin-staff-read-panel mt-1">' +
                '<pre class="admin-msg-pre small mb-0">' +
                    escapeHtml(String(summary)) +
                "</pre></div></details>"
            );
        }
        if (draft != null && String(draft).trim() !== "") {
            parts.push(formatDraftReplyBlock(draft, replyContext));
        }
        var ex = formatExtractedBlock(extractedJson);
        if (ex) parts.push(ex);
        if (!parts.length) return "—";
        return '<div class="admin-ai-assist">' + parts.join("") + "</div>";
    };
})(typeof window !== "undefined" ? window : this);
