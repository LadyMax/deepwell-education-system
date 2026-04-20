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

    function aiCategoryHumanLabel(raw) {
        if (raw == null || String(raw).trim() === "") return "—";
        var k = String(raw)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");
        var map = {
            course_inquiry: "Course inquiry",
            complaint: "Complaint",
            feedback: "Feedback",
            general_question: "Other — general / unclear",
            technical_support: "Other — account or tech",
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
        var n = Number(conf);
        if (isNaN(n) || n >= 0.72) return "";
        if (n >= 0.5) return "This topic guess might be wrong — read the message to decide.";
        if (n >= 0.35) return "The guess is unreliable — trust what you read, not the label.";
        return "Only a rough guess — choose the category from the message yourself.";
    }

    function formatAiSuggestionCell(aiCat, conf) {
        var hasCat = aiCat != null && String(aiCat).trim() !== "";
        var hasConf = conf != null && conf !== "" && !isNaN(Number(conf));
        if (!hasCat && !hasConf) return "—";
        var topic = hasCat ? escapeHtml(aiCategoryHumanLabel(String(aiCat).trim())) : "";
        var note = hasConf ? escapeHtml(aiConfidenceFootnote(Number(conf))) : "";
        if (hasCat && hasConf) {
            var body =
                '<div class="admin-ai-suggestion-topic">' +
                '<span class="text-muted small font-weight-normal">Topic guess</span> · ' +
                topic +
                "</div>";
            if (note) {
                body +=
                    '<div class="text-muted small admin-ai-suggestion-note mt-1">' +
                    note +
                    "</div>";
            }
            return '<div class="admin-ai-suggestion">' + body + "</div>";
        }
        if (hasCat) {
            return (
                '<div class="admin-ai-suggestion">' +
                '<div class="admin-ai-suggestion-topic">' +
                '<span class="text-muted small font-weight-normal">Topic guess</span> · ' +
                topic +
                "</div></div>"
            );
        }
        return '<div class="admin-ai-suggestion"><div class="text-muted small">' + note + "</div></div>";
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
            main_request: "Main request (if detected)",
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
                '<dt class="col-sm-5 text-muted small">' +
                    escapeHtml(label) +
                    '</dt><dd class="col-sm-7 small">' +
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
                '<details class="admin-ai-block mt-1"><summary class="small">Worth a glance</summary>' +
                '<dl class="row small mb-0 mt-2">' +
                rows.join("") +
                "</dl></details>"
            );
        } catch {
            return "";
        }
    }

    function formatPriorityAndEngineLine(pri, modelVersion) {
        var badge = formatPriorityLine(pri);
        var v = String(modelVersion || "").trim();
        var short = "Quick hint for this message.";
        if (/rule/i.test(v)) {
            short = "We looked for a few common words in the text.";
        } else if (/langchain|openai|gpt/i.test(v)) {
            short = "We used the fuller AI read of the message.";
        } else if (/unknown/i.test(v)) {
            short = "Older message — we did not keep how this was sorted.";
        }
        var hint = '<span class="text-muted small">' + escapeHtml(short) + "</span>";
        if (!badge && !v) return "";
        if (!badge) {
            return '<div class="mb-2 admin-ai-head">' + hint + "</div>";
        }
        return (
            '<div class="mb-2 d-flex flex-wrap align-items-center admin-ai-head">' +
            '<div class="mr-2 mb-1">' +
            badge +
            "</div>" +
            '<div class="mb-1">' +
            hint +
            "</div></div>"
        );
    }

    A.formatAiAssistCell = function (aiCat, conf, pri, summary, draft, extractedJson, modelVersion) {
        var parts = [];
        var priEff = A.effectiveSuggestedPriority(pri, aiCat, summary);
        var head = formatPriorityAndEngineLine(priEff, modelVersion);
        if (head) parts.push(head);
        var core = formatAiSuggestionCell(aiCat, conf);
        if (core !== "—") parts.push(core);
        if (summary != null && String(summary).trim() !== "") {
            parts.push(
                '<details class="admin-ai-block mt-1"><summary class="small">Auto summary</summary><p class="small mb-0 mt-2 text-muted">' +
                    escapeHtml(String(summary)) +
                    "</p></details>"
            );
        }
        if (draft != null && String(draft).trim() !== "") {
            parts.push(
                '<details class="admin-ai-block mt-1"><summary class="small">Draft reply (for you to edit or ignore)</summary><p class="small mb-0 mt-2 admin-ai-draft">' +
                    escapeHtml(String(draft)) +
                    "</p></details>"
            );
        }
        var ex = formatExtractedBlock(extractedJson);
        if (ex) parts.push(ex);
        if (!parts.length) return "—";
        return '<div class="admin-ai-assist">' + parts.join("") + "</div>";
    };
})(typeof window !== "undefined" ? window : this);
