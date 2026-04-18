(function () {
    if (!localStorage.getItem("token")) {
        window.location.href = "./login.html";
        return;
    }

    function typeLabel(t) {
        if (t === 0 || t === "Join") return "Join";
        if (t === 1 || t === "Leave") return "Leave";
        return String(t);
    }

    function statusLabel(s) {
        if (s === 0 || s === "Pending") return "Pending";
        if (s === 1 || s === "Approved") return "Approved";
        if (s === 2 || s === "Rejected") return "Rejected";
        return String(s);
    }

    function typeClass(t) {
        if (t === 1 || t === "Leave") return "cr-type--leave";
        if (t === 0 || t === "Join") return "cr-type--join";
        return "";
    }

    function statusClass(s) {
        if (s === 0 || s === "Pending") return "cr-status--pending";
        if (s === 1 || s === "Approved") return "cr-status--approved";
        if (s === 2 || s === "Rejected") return "cr-status--rejected";
        return "";
    }

    function levelLabel(v) {
        if (v === 0 || v === "Beginner") return "Beginner";
        if (v === 1 || v === "Intermediate") return "Intermediate";
        if (v === 2 || v === "Advanced") return "Advanced";
        return String(v);
    }

    function categoryHuman(v) {
        if (v === 0 || v === "CourseInquiry") return "Course inquiry";
        if (v === 1 || v === "Complaint") return "Complaint";
        if (v === 2 || v === "Feedback") return "Feedback";
        if (v === 3 || v === "Other") return "Other";
        return "—";
    }

    function escapeHtmlAdmin(s) {
        if (s == null || s === "") return "";
        var d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
    }

    /**
     * Maps classifier slugs to labels that line up with the Final category dropdown (4 options).
     * AI service uses five buckets; technical_support + general_question both roll up to Final "Other".
     */
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
            .map(function (w) {
                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            })
            .join(" ");
    }

    /** Short note when the topic guess looks weak (plain English for non-technical staff). */
    function aiConfidenceFootnote(conf) {
        var n = Number(conf);
        if (isNaN(n) || n >= 0.72) return "";
        if (n >= 0.5) return "This topic guess might be wrong — read the message to decide.";
        if (n >= 0.35) return "The guess is unreliable — trust what you read, not the label.";
        return "Only a rough guess — choose the category from the message yourself.";
    }

    /** Populated when a background AI job sets AiSuggestedCategory / AiConfidence on the message. */
    function formatAiSuggestionCell(aiCat, conf) {
        var hasCat = aiCat != null && String(aiCat).trim() !== "";
        var hasConf = conf != null && conf !== "" && !isNaN(Number(conf));
        if (!hasCat && !hasConf) return "—";
        var topic = hasCat ? escapeHtmlAdmin(aiCategoryHumanLabel(String(aiCat).trim())) : "";
        var note = hasConf ? escapeHtmlAdmin(aiConfidenceFootnote(Number(conf))) : "";
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

    function priorityRank(p) {
        var v = String(p || "").toLowerCase();
        if (v === "urgent") return 3;
        if (v === "high") return 2;
        if (v === "normal") return 1;
        return 0;
    }

    /**
     * Older rows may have topic/summary but null AiSuggestedPriority (column added later or partial save).
     * Treat that as normal priority for display so the badge matches user expectation.
     */
    function effectiveSuggestedPriority(pri, aiCat, summary) {
        var ps = pri != null && pri !== "" ? String(pri).trim().toLowerCase() : "";
        if (ps === "urgent" || ps === "high" || ps === "normal") return ps;
        var hasTopic = aiCat != null && String(aiCat).trim() !== "";
        var hasSummary = summary != null && String(summary).trim() !== "";
        if (hasTopic || hasSummary) return "normal";
        return ps;
    }

    function formatPriorityLine(pri) {
        var v = String(pri || "").toLowerCase();
        var title = ' title="Priority: ' + escapeHtmlAdmin(v || "—") + '"';
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

    /** Only show “flags” when at least one is actually useful (skip pages of “No / hard to tell”). */
    function extractedRowsForDisplay(o) {
        var rows = [];
        function push(label, valueHtml) {
            rows.push(
                '<dt class="col-sm-5 text-muted small">' +
                    escapeHtmlAdmin(label) +
                    '</dt><dd class="col-sm-7 small">' +
                    valueHtml +
                    "</dd>"
            );
        }
        if (o.main_request && String(o.main_request).trim()) {
            push(extractedFieldLabel("main_request"), escapeHtmlAdmin(String(o.main_request).trim()));
        }
        if (o.student_reference && String(o.student_reference).trim()) {
            push(extractedFieldLabel("student_reference"), escapeHtmlAdmin(String(o.student_reference).trim()));
        }
        if (o.mentions_schedule_change === true) {
            push(extractedFieldLabel("mentions_schedule_change"), escapeHtmlAdmin("Yes"));
        }
        if (o.mentions_payment_or_refund === true) {
            push(extractedFieldLabel("mentions_payment_or_refund"), escapeHtmlAdmin("Yes"));
        }
        if (o.time_sensitive === true) {
            push(extractedFieldLabel("time_sensitive"), escapeHtmlAdmin("Yes"));
        }
        var sent = String(o.sentiment || "").toLowerCase();
        if (sent === "concerned" || sent === "angry") {
            push(extractedFieldLabel("sentiment"), escapeHtmlAdmin(extractedValueHuman("sentiment", o.sentiment)));
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

    /** One row: queue badge + plain explanation (no version codes — staff are not engineers). */
    function formatPriorityAndEngineLine(pri, modelVersion) {
        var badge = formatPriorityLine(pri);
        var v = String(modelVersion || "").trim();
        var short = "Quick hint for this message.";
        if (/rule/i.test(v)) {
            short = "We looked for a few common words in the text.";
        } else if (/langchain|openai|gpt/i.test(v)) {
            short = "We used the fuller AI read of the message.";
        } else if (/unknown/i.test(v)) {
            short = "Older message — we didn’t keep how this was sorted.";
        }
        var hint = '<span class="text-muted small">' + escapeHtmlAdmin(short) + "</span>";
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

    /** Category, confidence, optional priority, summary, draft (not sent), extracted JSON hints. */
    function formatAiAssistCell(aiCat, conf, pri, summary, draft, extractedJson, modelVersion) {
        var parts = [];
        var priEff = effectiveSuggestedPriority(pri, aiCat, summary);
        var head = formatPriorityAndEngineLine(priEff, modelVersion);
        if (head) parts.push(head);
        var core = formatAiSuggestionCell(aiCat, conf);
        if (core !== "—") parts.push(core);
        if (summary != null && String(summary).trim() !== "") {
            parts.push(
                '<details class="admin-ai-block mt-1"><summary class="small">Auto summary</summary><p class="small mb-0 mt-2 text-muted">' +
                    escapeHtmlAdmin(String(summary)) +
                    "</p></details>"
            );
        }
        if (draft != null && String(draft).trim() !== "") {
            parts.push(
                '<details class="admin-ai-block mt-1"><summary class="small">Draft reply (for you to edit or ignore)</summary><p class="small mb-0 mt-2 admin-ai-draft">' +
                    escapeHtmlAdmin(String(draft)) +
                    "</p></details>"
            );
        }
        var ex = formatExtractedBlock(extractedJson);
        if (ex) parts.push(ex);
        if (!parts.length) return "—";
        return '<div class="admin-ai-assist">' + parts.join("") + "</div>";
    }

    function roleHuman(r) {
        if (r === 0 || r === "Visitor") return "Visitor";
        if (r === 1 || r === "Student") return "Student";
        if (r === 2 || r === "Admin") return "Staff";
        return String(r);
    }

    function formatAdminDateTime(iso) {
        if (!iso) return "—";
        try {
            var d = new Date(iso);
            if (isNaN(d.getTime())) return String(iso);
            return d.toLocaleString();
        } catch {
            return String(iso);
        }
    }

    function formatAdminDateOnly(iso) {
        if (!iso) return "—";
        try {
            var d = new Date(iso);
            if (isNaN(d.getTime())) return String(iso);
            return d.toLocaleDateString();
        } catch {
            return String(iso);
        }
    }

    function renderAdminUserDetailHtml(d) {
        var email = pick(d, "email", "Email") || "—";
        var userName = pick(d, "userName", "UserName") || "—";
        var role = roleHuman(pick(d, "role", "Role"));
        var active = pick(d, "isActive", "IsActive");
        var created = formatAdminDateTime(pick(d, "createdAt", "CreatedAt"));
        var sp = d.studentProfile != null ? d.studentProfile : d.StudentProfile;
        var profileHtml = "";
        if (sp) {
            var fn = pick(sp, "firstName", "FirstName") || "";
            var ln = pick(sp, "lastName", "LastName") || "";
            var sn = pick(sp, "studentNumber", "StudentNumber") || "—";
            var phone = pick(sp, "phone", "Phone") || "—";
            var addr = pick(sp, "address", "Address") || "—";
            var dob = pick(sp, "dateOfBirth", "DateOfBirth");
            var dobStr = dob ? formatAdminDateOnly(dob) : "—";
            profileHtml =
                '<h6 class="text-muted text-uppercase small mt-3 mb-2">Student record</h6>' +
                '<dl class="row small mb-0">' +
                '<dt class="col-sm-4">Student number</dt><dd class="col-sm-8">' +
                escapeHtmlAdmin(sn) +
                "</dd>" +
                '<dt class="col-sm-4">Name</dt><dd class="col-sm-8">' +
                escapeHtmlAdmin((fn + " " + ln).trim() || "—") +
                "</dd>" +
                '<dt class="col-sm-4">Phone</dt><dd class="col-sm-8">' +
                escapeHtmlAdmin(phone) +
                "</dd>" +
                '<dt class="col-sm-4">Date of birth</dt><dd class="col-sm-8">' +
                escapeHtmlAdmin(dobStr) +
                "</dd>" +
                '<dt class="col-sm-4">Address</dt><dd class="col-sm-8">' +
                escapeHtmlAdmin(addr) +
                "</dd>" +
                "</dl>";
        } else {
            profileHtml =
                '<p class="text-muted small mt-3 mb-0">No student profile on file (common for visitors or before first approved enrollment).</p>';
        }
        return (
            '<dl class="row small mb-0">' +
            '<dt class="col-sm-4">Username</dt><dd class="col-sm-8">' +
            escapeHtmlAdmin(userName) +
            "</dd>" +
            '<dt class="col-sm-4">Email</dt><dd class="col-sm-8">' +
            escapeHtmlAdmin(email) +
            "</dd>" +
            '<dt class="col-sm-4">Role</dt><dd class="col-sm-8">' +
            escapeHtmlAdmin(role) +
            "</dd>" +
            '<dt class="col-sm-4">Account</dt><dd class="col-sm-8">' +
            (active ? "Active" : "Disabled") +
            "</dd>" +
            '<dt class="col-sm-4">Joined</dt><dd class="col-sm-8">' +
            escapeHtmlAdmin(created) +
            "</dd>" +
            "</dl>" +
            profileHtml
        );
    }

    async function openAdminUserProfile(userId) {
        if (!userId || typeof window.$ === "undefined") return;
        var $ = window.$;
        var $m = $("#admin-user-detail-modal");
        $("#admin-user-detail-body").html('<p class="text-muted small mb-0">Loading…</p>');
        $("#admin-user-detail-title").text("User profile");
        $m.modal("show");
        if (typeof getAdminUserDetail !== "function") {
            $("#admin-user-detail-body").html(
                '<p class="text-danger small mb-0">Profile lookup is not available. Refresh the page.</p>'
            );
            return;
        }
        var r = await getAdminUserDetail(userId);
        if (r.forbidden) {
            $("#admin-user-detail-body").html(
                '<p class="text-danger small mb-0">You do not have permission to view this profile.</p>'
            );
            return;
        }
        if (r.notFound) {
            $("#admin-user-detail-body").html('<p class="text-muted small mb-0">User not found.</p>');
            return;
        }
        if (r.error || !r.ok) {
            $("#admin-user-detail-body").html(
                '<p class="text-danger small mb-0">' +
                    escapeHtmlAdmin(String(r.error || "Could not load profile.")) +
                    "</p>"
            );
            return;
        }
        var d = r.data;
        var titleName = (pick(d, "userName", "UserName") || "").trim();
        $("#admin-user-detail-title").text(titleName ? "Profile: " + titleName : "User profile");
        $("#admin-user-detail-body").html(renderAdminUserDetailHtml(d));
    }

    function staffForbiddenNote() {
        return "You need staff access. Sign in with a staff account.";
    }

    function setAdminInboxUnreadBadge(count) {
        const el = document.getElementById("admin-msg-unread-badge");
        if (!el) return;
        if (count > 0) {
            el.textContent = count > 99 ? "99+" : String(count);
            el.classList.remove("d-none");
        } else {
            el.textContent = "";
            el.classList.add("d-none");
        }
    }

    async function refreshAdminInboxUnreadUi(showIntroFlash) {
        if (typeof getInboxUnreadCount !== "function") return;
        try {
            const data = await getInboxUnreadCount();
            const count = Number(data.count != null ? data.count : data.Count) || 0;
            setAdminInboxUnreadBadge(count);
            if (showIntroFlash && count > 0) {
                const msg =
                    count === 1
                        ? "You have 1 unread message in your inbox."
                        : "You have " + count + " unread messages in your inbox.";
                showAppFlash("admin-flash", msg, "inbox", undefined, "inbox-unread");
            }
        } catch (_) {}
    }

    function bindAdminPasswordToggles() {
        document.querySelectorAll("[data-password-toggle]").forEach(function (btn) {
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

    function updateAdminPasswordChecklist() {
        if (typeof evaluatePasswordRules !== "function") return;
        var p = document.getElementById("admin-new-password");
        var pwd = p ? p.value : "";
        var r = evaluatePasswordRules(pwd);
        function setOk(id, ok) {
            var el = document.getElementById(id);
            if (!el) return;
            el.className = ok ? "ok" : "bad";
        }
        setOk("admin-pw-rule-len", r.minLen);
        setOk("admin-pw-rule-upper", r.upper);
        setOk("admin-pw-rule-lower", r.lower);
        setOk("admin-pw-rule-digit", r.digit);
        setOk("admin-pw-rule-special", r.special);
    }

    function showAdminPasswordFlash(message, variant) {
        var el = document.getElementById("admin-password-flash");
        if (!el) return;
        if (!message) {
            el.classList.add("d-none");
            el.textContent = "";
            return;
        }
        var v = variant || "danger";
        el.textContent = message;
        el.className = "app-flash app-flash--" + v + " mb-3";
        el.classList.remove("d-none");
    }

    function showAdminPane(paneId) {
        document.querySelectorAll("[data-admin-pane-id]").forEach(function (section) {
            var id = section.getAttribute("data-admin-pane-id");
            section.classList.toggle("d-none", id !== paneId);
        });
        document.querySelectorAll("[data-admin-pane-btn]").forEach(function (btn) {
            var active = btn.getAttribute("data-admin-pane-btn") === paneId;
            btn.classList.toggle("active", active);
            btn.setAttribute("aria-selected", active ? "true" : "false");
        });
        if (paneId === "messages" && typeof dismissFlashByKind === "function") {
            dismissFlashByKind("admin-flash", "inbox-unread");
        }
    }

    function courseLanguageLine(c) {
        var lang =
            pick(c, "languageName", "LanguageName") || pick(c, "subjectName", "SubjectName") || "";
        var code = pick(c, "languageCode", "LanguageCode") || pick(c, "subjectCode", "SubjectCode") || "";
        return lang ? lang + (code ? " (" + code + ")" : "") : code || "—";
    }

    function setCourseEditEnabled(on) {
        ["btn-course-update", "btn-course-delete"].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.disabled = !on;
        });
        if (!on) {
            var ba = document.getElementById("btn-course-set-active");
            if (ba) ba.disabled = true;
            var bl = document.getElementById("btn-course-apply-level");
            if (bl) bl.disabled = true;
        }
    }

    function syncCourseLevelConfirmButton() {
        var id = document.getElementById("course-id").value.trim();
        var sel = document.getElementById("course-level");
        var btn = document.getElementById("btn-course-apply-level");
        if (!sel || !btn) return;
        var saved = sel.dataset.savedLevel;
        if (!id || saved === undefined) {
            btn.disabled = true;
            return;
        }
        btn.disabled = sel.value === saved;
    }

    function syncCourseVisibilityConfirmButton() {
        var id = document.getElementById("course-id").value.trim();
        var sel = document.getElementById("course-active-select");
        var btn = document.getElementById("btn-course-set-active");
        if (!sel || !btn) return;
        var saved = sel.dataset.savedActive;
        if (!id || saved === undefined) {
            btn.disabled = true;
            return;
        }
        btn.disabled = sel.value === saved;
    }

    function setCourseSelectionFromRow(c, tr) {
        if (selectedCourseRow) selectedCourseRow.classList.remove("table-active");
        if (tr) {
            tr.classList.add("table-active");
            selectedCourseRow = tr;
        } else {
            selectedCourseRow = null;
        }
        var id = c ? pick(c, "id", "Id") : "";
        document.getElementById("course-id").value = id || "";
        var summaryEl = document.getElementById("course-selected-summary");
        var clearBtn = document.getElementById("btn-course-clear-selection");
        if (!c) {
            summaryEl.textContent = "No course selected — click a row in the table below.";
            clearBtn.classList.add("d-none");
            var levelSel0 = document.getElementById("course-level");
            if (levelSel0) delete levelSel0.dataset.savedLevel;
            var activeSel0 = document.getElementById("course-active-select");
            if (activeSel0) {
                activeSel0.value = "true";
                delete activeSel0.dataset.savedActive;
            }
            setCourseEditEnabled(false);
            return;
        }
        var name = pick(c, "name", "Name") || "Course";
        var level = levelLabel(pick(c, "level", "Level"));
        var langLine = courseLanguageLine(c);
        summaryEl.textContent =
            name + " · " + level + (langLine && langLine !== "—" ? " · " + langLine : "");
        clearBtn.classList.remove("d-none");
        setCourseEditEnabled(true);
        document.getElementById("course-name").value = pick(c, "name", "Name") || "";
        document.getElementById("course-desc").value = pick(c, "description", "Description") || "";
        document.getElementById("course-language-code").value =
            pick(c, "languageCode", "LanguageCode") || pick(c, "subjectCode", "SubjectCode") || "";
        document.getElementById("course-language-name").value =
            pick(c, "languageName", "LanguageName") || pick(c, "subjectName", "SubjectName") || "";
        var levelRaw = pick(c, "level", "Level");
        var levelEl = document.getElementById("course-level");
        levelEl.value = String(levelRaw !== undefined && levelRaw !== null ? levelRaw : 0);
        levelEl.dataset.savedLevel = String(levelRaw !== undefined && levelRaw !== null ? levelRaw : 0);
        var isActive = !!(pick(c, "isActive", "IsActive"));
        var activeEl = document.getElementById("course-active-select");
        activeEl.value = isActive ? "true" : "false";
        activeEl.dataset.savedActive = isActive ? "true" : "false";
        syncCourseLevelConfirmButton();
        syncCourseVisibilityConfirmButton();
    }

    function clearCourseSelection() {
        setCourseSelectionFromRow(null, null);
        document.getElementById("course-name").value = "";
        document.getElementById("course-desc").value = "";
        document.getElementById("course-language-code").value = "";
        document.getElementById("course-language-name").value = "";
        document.getElementById("course-level").value = "0";
    }

    function fillEnrollmentCourseSelect(items) {
        var sel = document.getElementById("enr-course-select");
        var keep = sel.value;
        sel.innerHTML = "";
        var opt0 = document.createElement("option");
        opt0.value = "";
        opt0.textContent = "Choose a course…";
        sel.appendChild(opt0);
        (items || []).forEach(function (c) {
            var id = pick(c, "id", "Id");
            var name = pick(c, "name", "Name") || "Course";
            var o = document.createElement("option");
            o.value = id;
            o.textContent = name;
            sel.appendChild(o);
        });
        if (keep && [].some.call(sel.options, function (o) { return o.value === keep; })) {
            sel.value = keep;
        }
    }

    function fillCourseRequestCourseSelect(items) {
        var sel = document.getElementById("cr-filter-course");
        if (!sel) return;
        var keep = sel.value;
        sel.innerHTML = "";
        var opt0 = document.createElement("option");
        opt0.value = "";
        opt0.textContent = "All courses";
        sel.appendChild(opt0);
        (items || []).forEach(function (c) {
            var id = pick(c, "id", "Id");
            var name = pick(c, "name", "Name") || "Course";
            var o = document.createElement("option");
            o.value = id;
            o.textContent = name;
            sel.appendChild(o);
        });
        if (keep && [].some.call(sel.options, function (o) { return o.value === keep; })) {
            sel.value = keep;
        }
    }

    function readCourseRequestFilters() {
        return {
            type: document.getElementById("cr-filter-type").value,
            status: document.getElementById("cr-filter-status").value,
            courseId: document.getElementById("cr-filter-course").value,
            applicant: document.getElementById("cr-filter-applicant").value.trim(),
            created: document.getElementById("cr-sort-created").value || "desc"
        };
    }

    function resetCourseRequestFilters() {
        document.getElementById("cr-filter-type").value = "";
        document.getElementById("cr-filter-status").value = "";
        document.getElementById("cr-filter-course").value = "";
        document.getElementById("cr-filter-applicant").value = "";
        document.getElementById("cr-sort-created").value = "desc";
    }

    function courseRequestQueueSummaryText(count, hasAppliedFilter) {
        if (!hasAppliedFilter) {
            if (count === 0) return "No requests in the queue right now.";
            if (count === 1) return "1 request in the list.";
            return count + " requests in the list.";
        }
        if (count === 0) return "No matching requests.";
        if (count === 1) return "1 matching request.";
        return count + " matching requests.";
    }

    async function renderCourseRequests(filters) {
        const el = document.getElementById("cr-status");
        const table = document.getElementById("cr-table");
        const tbody = document.getElementById("cr-body");
        const activeFilters = filters || readCourseRequestFilters();
        el.textContent = "Loading…";
        tbody.innerHTML = "";
        table.classList.add("d-none");

        const res = await getCourseRequests(activeFilters);
        if (res.forbidden) {
            el.textContent = staffForbiddenNote();
            return;
        }
        if (res.error) {
            el.textContent = res.error;
            return;
        }
        const items = res.items || [];
        const hasAppliedFilter =
            !!activeFilters.type ||
            !!activeFilters.status ||
            !!activeFilters.courseId ||
            !!activeFilters.applicant;
        el.textContent = courseRequestQueueSummaryText(items.length, hasAppliedFilter);

        items.forEach(function (row) {
            const id = pick(row, "id", "Id");
            const pending = (pick(row, "status", "Status") === 0 || pick(row, "status", "Status") === "Pending");
            const tr = document.createElement("tr");
            const email = pick(row, "userEmail", "UserEmail");
            const name = pick(row, "userName", "UserName") || pick(row, "userFullName", "UserFullName");
            const sn = pick(row, "studentNumber", "StudentNumber");
            const course = pick(row, "courseName", "CourseName");
            const type = pick(row, "type", "Type");
            const status = pick(row, "status", "Status");
            const created = new Date(pick(row, "createdAt", "CreatedAt")).toLocaleString();

            let actions = "";
            if (pending) {
                actions =
                    '<button type="button" class="btn btn-success btn-sm mr-1 cr-approve" data-id="' + id + '">Approve</button>' +
                    '<button type="button" class="btn btn-outline-danger btn-sm cr-reject" data-id="' + id + '">Reject</button>';
            } else {
                actions = "—";
            }

            tr.innerHTML =
                "<td>" + (name || "—") + "<br><small class=\"text-muted\">" + email + "</small></td>" +
                "<td>" + (sn || "—") + "</td>" +
                "<td>" + course + "</td>" +
                "<td><span class=\"cr-type " + typeClass(type) + "\">" + typeLabel(type) + "</span></td>" +
                "<td><span class=\"cr-status " + statusClass(status) + "\">" + statusLabel(status) + "</span></td>" +
                "<td><small>" + created + "</small></td>" +
                "<td>" + actions + "</td>";
            tbody.appendChild(tr);
        });

        if (items.length) table.classList.remove("d-none");

        tbody.querySelectorAll(".cr-approve").forEach(function (btn) {
            btn.addEventListener("click", async function (e) {
                e.stopPropagation();
                const id = btn.getAttribute("data-id");
                const r = await reviewCourseRequest(id, true);
                if (!r.ok) {
                    showAppFlash("admin-flash", r.message || "Failed to approve.", "danger", 6000);
                    return;
                }
                showAppFlash("admin-flash", "Request approved.", "success", 4000);
                await renderCourseRequests(activeFilters);
            });
        });
        tbody.querySelectorAll(".cr-reject").forEach(function (btn) {
            btn.addEventListener("click", async function (e) {
                e.stopPropagation();
                const id = btn.getAttribute("data-id");
                if (!confirm("Reject this request?")) return;
                const r = await reviewCourseRequest(id, false);
                if (!r.ok) {
                    showAppFlash("admin-flash", r.message || "Failed to reject.", "danger", 6000);
                    return;
                }
                showAppFlash("admin-flash", "Request rejected.", "warning", 4000);
                await renderCourseRequests(activeFilters);
            });
        });
    }

    /** Confirm is always visible; enabled only when value differs from saved one. */
    function syncMsgCatConfirmState(row, loading) {
        if (!row) return;
        var sel = row.querySelector(".msg-cat");
        var btn = row.querySelector(".msg-cat-confirm");
        if (!sel || !btn) return;
        var v = sel.value;
        var prev = sel.getAttribute("data-prev-final") || "";
        var dirty = v !== "" && v !== prev;
        if (loading) {
            btn.disabled = true;
            return;
        }
        btn.disabled = !dirty;
    }

    function contactMessagesSummaryText(count) {
        if (count === 0) return "No messages in this view.";
        if (count === 1) return "1 message.";
        return count + " messages.";
    }

    async function renderMessages(options) {
        const statusEl = document.getElementById("status");
        const msgTable = document.getElementById("msg-table");
        const tbody = document.getElementById("msg-body");
        statusEl.textContent = "Loading…";
        tbody.innerHTML = "";
        msgTable.classList.add("d-none");

        const page = await getAdminMessages(options || { page: 1, pageSize: 50 });
        if (page.forbidden) {
            statusEl.textContent = staffForbiddenNote();
            return;
        }
        if (page.error) {
            statusEl.textContent = page.error;
            return;
        }
        const items = page.items || page.Items || [];
        statusEl.textContent = contactMessagesSummaryText(items.length);
        items.sort(function (a, b) {
            var pa = priorityRank(
                effectiveSuggestedPriority(
                    pick(a, "aiSuggestedPriority", "AiSuggestedPriority"),
                    pick(a, "aiSuggestedCategory", "AiSuggestedCategory"),
                    pick(a, "aiSummary", "AiSummary")
                )
            );
            var pb = priorityRank(
                effectiveSuggestedPriority(
                    pick(b, "aiSuggestedPriority", "AiSuggestedPriority"),
                    pick(b, "aiSuggestedCategory", "AiSuggestedCategory"),
                    pick(b, "aiSummary", "AiSummary")
                )
            );
            if (pb !== pa) return pb - pa;
            var da = new Date(pick(a, "createdAt", "CreatedAt") || 0).getTime();
            var dbe = new Date(pick(b, "createdAt", "CreatedAt") || 0).getTime();
            return dbe - da;
        });
        items.forEach(function (m) {
            const tr = document.createElement("tr");
            const id = pick(m, "id", "Id");
            const finalCat = pick(m, "finalCategory", "FinalCategory");
            const readAt = pick(m, "readAt", "ReadAt");
            const isRead = !!readAt;
            const contentRaw = pick(m, "content", "Content") || "";
            const preview =
                '<details class="admin-msg-details"><summary class="small">Show</summary><pre class="admin-msg-pre small mb-0 mt-1">' +
                escapeHtmlAdmin(contentRaw) +
                "</pre></details>";
            const senderTopic = categoryHuman(pick(m, "senderSuggestedCategory", "SenderSuggestedCategory"));
            const aiCatRaw = pick(m, "aiSuggestedCategory", "AiSuggestedCategory");
            const aiCell = formatAiAssistCell(
                aiCatRaw,
                pick(m, "aiConfidence", "AiConfidence"),
                pick(m, "aiSuggestedPriority", "AiSuggestedPriority"),
                pick(m, "aiSummary", "AiSummary"),
                pick(m, "aiSuggestedReplyDraft", "AiSuggestedReplyDraft"),
                pick(m, "aiExtractedJson", "AiExtractedJson"),
                pick(m, "aiModelVersion", "AiModelVersion")
            );
            const needsReassist = aiCatRaw == null || String(aiCatRaw).trim() === "";
            const reassistBlock = needsReassist
                ? '<div class="mt-1"><button type="button" class="btn btn-link btn-sm p-0 msg-reassist-ai" data-id="' +
                  escapeHtmlAdmin(String(id)) +
                  '">Get AI assist</button><div class="text-muted small">Use if this message was sent without hints.</div></div>'
                : "";
            const senderUserId = pick(m, "senderUserId", "SenderUserId");
            const senderUserName = (pick(m, "senderUserName", "SenderUserName") || "").trim();
            const senderLabel = senderUserName || "—";
            const fromCell =
                senderUserId
                    ? '<button type="button" class="btn btn-link btn-sm p-0 text-left admin-msg-sender-profile" data-user-id="' +
                      escapeHtmlAdmin(String(senderUserId)) +
                      '" title="View full profile" aria-label="View sender profile">' +
                      escapeHtmlAdmin(senderLabel) +
                      "</button>"
                    : "<span>" + escapeHtmlAdmin(senderLabel) + "</span>";
            const subjectRaw = pick(m, "subject", "Subject") || "";
            const subjectEsc = escapeHtmlAdmin(subjectRaw);
            const subjectTitleAttr =
                subjectRaw.trim() !== "" ? ' title="' + escapeHtmlAdmin(subjectRaw) + '"' : "";
            tr.innerHTML =
                "<td>" + fromCell + "</td>" +
                "<td" +
                subjectTitleAttr +
                ">" +
                subjectEsc +
                "</td>" +
                "<td>" + preview + "</td>" +
                "<td>" + senderTopic + "</td>" +
                "<td>" + aiCell + reassistBlock + "</td>" +
                "<td>" + (isRead
                    ? "Yes"
                    : ('No <button type="button" class="btn btn-outline-primary btn-sm ml-2 msg-mark-read" data-id="' + id + '">Mark read</button>')) + "</td>" +
                "<td class=\"msg-cat-cell\">" +
                '<div class="admin-select-apply">' +
                '<select class="custom-select custom-select-sm msg-cat" data-id="' +
                id +
                '">' +
                '<option value="" selected>Choose…</option>' +
                '<option value="0">Course inquiry</option>' +
                '<option value="1">Complaint</option>' +
                '<option value="2">Feedback</option>' +
                '<option value="3">Other</option>' +
                "</select>" +
                '<button type="button" class="btn btn-outline-secondary btn-sm btn-admin-confirm msg-cat-confirm" data-id="' +
                id +
                '" disabled>Confirm</button>' +
                "</div></td>";
            var msgColLabels = [
                "From",
                "Subject",
                "Message",
                "Sender topic",
                "AI assist",
                "Read",
                "Final category"
            ];
            tr.querySelectorAll("td").forEach(function (td, idx) {
                if (msgColLabels[idx]) td.setAttribute("data-label", msgColLabels[idx]);
            });
            tbody.appendChild(tr);
            const sel = tr.querySelector(".msg-cat");
            if (sel) {
                var prevVal =
                    finalCat != null && finalCat !== ""
                        ? String(finalCat)
                        : "";
                sel.value = prevVal;
                if (prevVal === "") sel.selectedIndex = 0;
                sel.setAttribute("data-prev-final", prevVal);
            }
            syncMsgCatConfirmState(tr);
        });

        tbody.querySelectorAll(".msg-cat").forEach(function (sel) {
            sel.addEventListener("change", function () {
                syncMsgCatConfirmState(sel.closest("tr"));
            });
        });

        tbody.querySelectorAll(".msg-cat-confirm").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                const tr = btn.closest("tr");
                const sel = tr ? tr.querySelector(".msg-cat") : null;
                if (!sel) return;
                const id = sel.getAttribute("data-id");
                const v = sel.value;
                const prev = sel.getAttribute("data-prev-final") || "";
                if (v === "" || v === prev) return;
                syncMsgCatConfirmState(tr, true);
                const r = await categorizeMessage(id, Number(v));
                if (!r.ok) {
                    showAppFlash("admin-flash", r.message || "Failed to update category.", "danger", 6000);
                    sel.value = prev;
                    syncMsgCatConfirmState(tr);
                    return;
                }
                sel.setAttribute("data-prev-final", v);
                showAppFlash("admin-flash", "Category saved.", "success", 3500);
                await renderMessages(options);
            });
        });

        tbody.querySelectorAll(".msg-mark-read").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                const id = btn.getAttribute("data-id");
                if (!id) return;
                btn.disabled = true;
                const r = await markMessageRead(id);
                if (!r.ok) {
                    btn.disabled = false;
                    showAppFlash(
                        "admin-flash",
                        r.message || "Only the receiver can mark this message as read.",
                        "warning",
                        5000
                    );
                    return;
                }
                showAppFlash("admin-flash", "Message marked as read.", "success", 3000);
                await renderMessages(options);
                await refreshAdminInboxUnreadUi(false);
            });
        });

        tbody.querySelectorAll(".msg-reassist-ai").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                const id = btn.getAttribute("data-id");
                if (!id) return;
                btn.disabled = true;
                const r = await reassistMessageAi(id);
                if (!r.ok) {
                    btn.disabled = false;
                    showAppFlash(
                        "admin-flash",
                        r.message || "Could not get AI assist. Is the AI service running?",
                        "danger",
                        7000
                    );
                    return;
                }
                showAppFlash("admin-flash", "AI assist updated.", "success", 3000);
                await renderMessages(options);
            });
        });

        if (items.length) msgTable.classList.remove("d-none");
    }

    let selectedCourseRow = null;

    async function renderCourses() {
        const statusEl = document.getElementById("course-status");
        const table = document.getElementById("course-table");
        const tbody = document.getElementById("course-body");
        statusEl.textContent = "Loading…";
        tbody.innerHTML = "";
        table.classList.add("d-none");
        selectedCourseRow = null;

        const res = await getAdminCourses(true);
        if (res.forbidden) {
            statusEl.textContent = staffForbiddenNote();
            return;
        }
        if (res.error) {
            statusEl.textContent = res.error;
            return;
        }
        const items = res.items || [];
        statusEl.textContent = items.length + " course(s) listed.";
        setCourseSelectionFromRow(null, null);
        fillEnrollmentCourseSelect(items);
        fillCourseRequestCourseSelect(items);
        items.forEach(function (c) {
            const tr = document.createElement("tr");
            const id = pick(c, "id", "Id");
            tr.classList.add("cursor-pointer");
            tr.innerHTML =
                "<td><span class=\"fw-semibold\">" + (pick(c, "name", "Name") || "—") + "</span></td>" +
                "<td>" + courseLanguageLine(c) + "</td>" +
                "<td>" + levelLabel(pick(c, "level", "Level")) + "</td>" +
                "<td>" + (pick(c, "isActive", "IsActive") ? "Yes" : "No") + "</td>";
            tr.addEventListener("click", function () {
                setCourseSelectionFromRow(c, tr);
            });
            tbody.appendChild(tr);
        });
        if (items.length) table.classList.remove("d-none");
    }

    function coursePayloadFromForm() {
        return {
            name: document.getElementById("course-name").value.trim(),
            description: document.getElementById("course-desc").value.trim(),
            languageCode: document.getElementById("course-language-code").value.trim().toLowerCase(),
            languageName: document.getElementById("course-language-name").value.trim(),
            level: Number(document.getElementById("course-level").value),
            category: 0
        };
    }

    function enrollmentRosterSummaryText(count) {
        if (count === 0) return "No students are enrolled in this course right now.";
        if (count === 1) return "1 student is enrolled in this course.";
        return count + " students are enrolled in this course.";
    }

    async function loadEnrollmentsByCourseUi() {
        const id = document.getElementById("enr-course-select").value.trim();
        const statusEl = document.getElementById("enr-status");
        const table = document.getElementById("enr-table");
        const tbody = document.getElementById("enr-body");
        if (!id) {
            statusEl.textContent = "Pick a course above, then click Confirm to see the class list.";
            return;
        }
        statusEl.textContent = "Loading…";
        tbody.innerHTML = "";
        table.classList.add("d-none");
        const res = await getEnrollmentsByCourse(id);
        if (res.forbidden) {
            statusEl.textContent = staffForbiddenNote();
            return;
        }
        if (res.error) {
            statusEl.textContent = res.error;
            return;
        }
        const items = res.items || [];
        statusEl.textContent = enrollmentRosterSummaryText(items.length);
        items.forEach(function (e) {
            const tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" + pick(e, "email", "Email") + "</td>" +
                "<td>" + (pick(e, "userName", "UserName") || pick(e, "fullName", "FullName") || "—") + "</td>" +
                "<td>" + (pick(e, "studentNumber", "StudentNumber") || "—") + "</td>" +
                "<td>" + roleHuman(pick(e, "role", "Role")) + "</td>" +
                "<td>" + new Date(pick(e, "enrolledAt", "EnrolledAt")).toLocaleString() + "</td>";
            tbody.appendChild(tr);
        });
        if (items.length) table.classList.remove("d-none");
    }

    document.getElementById("btn-load-pending").addEventListener("click", function () {
        document.getElementById("cr-filter-status").value = "Pending";
        renderCourseRequests(readCourseRequestFilters());
    });
    document.getElementById("btn-load-all").addEventListener("click", function () {
        resetCourseRequestFilters();
        renderCourseRequests(readCourseRequestFilters());
    });
    document.getElementById("btn-cr-apply-filters").addEventListener("click", function () {
        renderCourseRequests(readCourseRequestFilters());
    });
    document.getElementById("btn-cr-reset-filters").addEventListener("click", function () {
        resetCourseRequestFilters();
        renderCourseRequests(readCourseRequestFilters());
    });
    document.getElementById("cr-filter-applicant").addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        renderCourseRequests(readCourseRequestFilters());
    });

    document.getElementById("btn-cr-detail").addEventListener("click", async function () {
        const id = document.getElementById("cr-id-input").value.trim();
        if (!id) {
            document.getElementById("cr-status").textContent = "Paste a request reference id.";
            return;
        }
        const r = await getCourseRequestById(id);
        if (!r.ok) {
            document.getElementById("cr-status").textContent = r.message || "Not found.";
            return;
        }
        const d = r.data || {};
        document.getElementById("cr-status").textContent =
            "Detail · Type: " + typeLabel(pick(d, "type", "Type")) +
            " · Status: " + statusLabel(pick(d, "status", "Status"));
    });

    document.getElementById("btn-load-msg-all").addEventListener("click", function () {
        document.getElementById("msg-final-filter").value = "";
        renderMessages({ page: 1, pageSize: 50 });
    });
    document.getElementById("btn-load-msg-new").addEventListener("click", function () {
        document.getElementById("msg-final-filter").value = "";
        renderMessages({ unreadOnly: true, page: 1, pageSize: 50 });
    });
    document.getElementById("btn-load-msg-uncat").addEventListener("click", function () {
        document.getElementById("msg-final-filter").value = "";
        renderMessages({ uncategorizedOnly: true, page: 1, pageSize: 50 });
    });
    document.getElementById("msg-final-filter").addEventListener("change", function () {
        var v = this.value;
        if (v === "") {
            renderMessages({ page: 1, pageSize: 50 });
        } else {
            renderMessages({ finalCategory: Number(v), page: 1, pageSize: 50 });
        }
    });

    document.getElementById("course-level").addEventListener("change", syncCourseLevelConfirmButton);
    document.getElementById("course-active-select").addEventListener("change", syncCourseVisibilityConfirmButton);

    document.getElementById("btn-course-apply-level").addEventListener("click", function () {
        document.getElementById("btn-course-update").click();
    });

    document.getElementById("btn-course-load").addEventListener("click", renderCourses);
    document.getElementById("btn-course-create").addEventListener("click", async function () {
        const r = await createCourse(coursePayloadFromForm());
        document.getElementById("course-status").textContent = r.ok ? "Course created." : (r.message || "Failed");
        if (r.ok) renderCourses();
    });
    document.getElementById("btn-course-update").addEventListener("click", async function () {
        const id = document.getElementById("course-id").value.trim();
        if (!id) {
            document.getElementById("course-status").textContent = "Select a course in the table above first.";
            return;
        }
        const r = await updateCourse(id, coursePayloadFromForm());
        document.getElementById("course-status").textContent = r.ok ? "Course updated." : (r.message || "Failed");
        if (r.ok) renderCourses();
    });
    document.getElementById("btn-course-delete").addEventListener("click", async function () {
        const id = document.getElementById("course-id").value.trim();
        if (!id) {
            document.getElementById("course-status").textContent = "Select a course in the table above first.";
            return;
        }
        if (!confirm("Deactivate this course?")) return;
        const r = await deleteCourse(id);
        document.getElementById("course-status").textContent = r.ok ? "Course deactivated." : (r.message || "Failed");
        if (r.ok) renderCourses();
    });
    document.getElementById("btn-course-set-active").addEventListener("click", async function () {
        const id = document.getElementById("course-id").value.trim();
        if (!id) {
            document.getElementById("course-status").textContent = "Select a course in the table above first.";
            return;
        }
        const isActive = document.getElementById("course-active-select").value === "true";
        const r = await setCourseActive(id, isActive);
        document.getElementById("course-status").textContent = r.ok ? "Visibility updated." : (r.message || "Failed");
        if (r.ok) renderCourses();
    });

    document.getElementById("btn-enr-load").addEventListener("click", loadEnrollmentsByCourseUi);

    document.getElementById("btn-course-clear-selection").addEventListener("click", function () {
        clearCourseSelection();
    });
    document.querySelectorAll("[data-admin-pane-btn]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            showAdminPane(btn.getAttribute("data-admin-pane-btn") || "requests");
        });
    });

    bindAdminPasswordToggles();
    var adminNewPw = document.getElementById("admin-new-password");
    if (adminNewPw) {
        adminNewPw.addEventListener("input", updateAdminPasswordChecklist);
        adminNewPw.addEventListener("change", updateAdminPasswordChecklist);
    }
    document.getElementById("btn-admin-change-password").addEventListener("click", async function () {
        var cur = document.getElementById("admin-current-password").value.trim();
        var next = document.getElementById("admin-new-password").value.trim();
        var conf = document.getElementById("admin-confirm-password").value.trim();
        showAdminPasswordFlash("", "info");
        if (!cur) {
            showAdminPasswordFlash("Enter your current password.", "warning");
            return;
        }
        if (!next || !conf) {
            if (typeof verifyCurrentPassword !== "function") {
                showAdminPasswordFlash("Enter your new password.", "warning");
                return;
            }
            var btnVerify = document.getElementById("btn-admin-change-password");
            btnVerify.disabled = true;
            var vr = await verifyCurrentPassword(cur);
            btnVerify.disabled = false;
            if (!vr.ok) {
                showAdminPasswordFlash(vr.message || "Current password is incorrect.", "danger");
                return;
            }
            if (!next) {
                showAdminPasswordFlash("Enter your new password.", "warning");
                return;
            }
            var perrPartial = typeof validatePasswordPolicy === "function" ? validatePasswordPolicy(next) : "";
            if (perrPartial) {
                showAdminPasswordFlash(perrPartial, "warning");
                return;
            }
            if (!conf) {
                showAdminPasswordFlash("Enter your new password again to confirm.", "warning");
                return;
            }
        }
        if (next !== conf) {
            showAdminPasswordFlash("New password and confirmation do not match.", "warning");
            return;
        }
        var perr = typeof validatePasswordPolicy === "function" ? validatePasswordPolicy(next) : "";
        if (perr) {
            showAdminPasswordFlash(perr, "warning");
            return;
        }
        if (typeof changeMyPassword !== "function") {
            showAdminPasswordFlash("Password update is not available.", "danger");
            return;
        }
        var btn = document.getElementById("btn-admin-change-password");
        btn.disabled = true;
        var r = await changeMyPassword(cur, next);
        btn.disabled = false;
        if (!r.ok) {
            showAdminPasswordFlash(r.message || "Could not change password.", "danger");
            return;
        }
        document.getElementById("admin-current-password").value = "";
        document.getElementById("admin-new-password").value = "";
        document.getElementById("admin-confirm-password").value = "";
        updateAdminPasswordChecklist();
        showAdminPasswordFlash("Password updated.", "success");
        showAppFlash("admin-flash", "Password updated successfully.", "success", 5000);
        if (typeof window.deepwellRefreshAuthNav === "function") {
            window.deepwellRefreshAuthNav();
        }
    });

    var adminMsgTable = document.getElementById("msg-table");
    if (adminMsgTable) {
        adminMsgTable.addEventListener("click", function (ev) {
            var btn = ev.target.closest(".admin-msg-sender-profile");
            if (!btn) return;
            var uid = btn.getAttribute("data-user-id");
            if (uid) void openAdminUserProfile(uid);
        });
    }

    resetCourseRequestFilters();
    document.getElementById("cr-filter-status").value = "Pending";
    renderCourseRequests(readCourseRequestFilters());
    renderMessages({ page: 1, pageSize: 50 });
    renderCourses();
    refreshAdminInboxUnreadUi(true);
    showAdminPane("requests");
})();
