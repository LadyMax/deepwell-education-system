(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before admin-courses.js).");
        return;
    }

    var levelLabel = S.courseLevelLabel;
    var A = (w.DeepwellAdmin = w.DeepwellAdmin || {});
    var setInlineStatus = A.setInlineStatus || function (id, message) {
        var el = document.getElementById(id);
        if (el) el.textContent = message || "";
    };
    var COURSE_LANGUAGES = [
        { code: "AR", name: "Arabic" },
        { code: "ZH", name: "Chinese" },
        { code: "DA", name: "Danish" },
        { code: "NL", name: "Dutch" },
        { code: "EN", name: "English" },
        { code: "FI", name: "Finnish" },
        { code: "FR", name: "French" },
        { code: "EL", name: "Greek" },
        { code: "HE", name: "Hebrew" },
        { code: "IS", name: "Icelandic" },
        { code: "IT", name: "Italian" },
        { code: "JA", name: "Japanese" },
        { code: "DE", name: "German" },
        { code: "KO", name: "Korean" },
        { code: "NO", name: "Norwegian" },
        { code: "FA", name: "Persian" },
        { code: "PL", name: "Polish" },
        { code: "PT", name: "Portuguese" },
        { code: "RU", name: "Russian" },
        { code: "ES", name: "Spanish" },
        { code: "SV", name: "Swedish" },
        { code: "TH", name: "Thai" },
        { code: "TR", name: "Turkish" },
        { code: "VI", name: "Vietnamese" }
    ];
    COURSE_LANGUAGES.sort(function (a, b) {
        return a.name.localeCompare(b.name);
    });

    function languageByName(name) {
        var n = (name || "").trim().toLowerCase();
        if (!n) return null;
        for (var i = 0; i < COURSE_LANGUAGES.length; i++) {
            if (COURSE_LANGUAGES[i].name.toLowerCase() === n) return COURSE_LANGUAGES[i];
        }
        return null;
    }

    function ensureLanguageOption(name) {
        var sel = document.getElementById("course-language-name");
        if (!sel) return;
        var n = (name || "").trim();
        if (!n) {
            sel.value = "";
            return;
        }
        var existing = [].some.call(sel.options, function (o) { return o.value === n; });
        if (!existing) {
            var opt = document.createElement("option");
            opt.value = n;
            opt.textContent = n;
            opt.dataset.dynamic = "1";
            sel.appendChild(opt);
        }
        sel.value = n;
    }

    function courseLanguageCode(c) {
        return (
            pick(c, "languageCode", "LanguageCode") ||
            pick(c, "subjectCode", "SubjectCode") ||
            ""
        )
            .toLowerCase()
            .trim();
    }

    function courseLanguageKey(c) {
        var code = courseLanguageCode(c);
        if (code) return "code:" + code;
        var name =
            (pick(c, "languageName", "LanguageName") ||
                pick(c, "subjectName", "SubjectName") ||
                "")
                .toLowerCase()
                .trim();
        return name ? "name:" + name : "unknown";
    }

    function buildLanguageToneMap(items) {
        var maxTone = 8;
        var neighbors = {};
        var keys = [];
        var i;

        function ensureKey(k) {
            if (!neighbors[k]) {
                neighbors[k] = {};
                keys.push(k);
            }
        }

        for (i = 0; i < (items || []).length; i++) {
            var key = courseLanguageKey(items[i]);
            ensureKey(key);
            if (i === 0) continue;
            var prevKey = courseLanguageKey(items[i - 1]);
            ensureKey(prevKey);
            if (prevKey !== key) {
                neighbors[prevKey][key] = true;
                neighbors[key][prevKey] = true;
            }
        }

        keys.sort(function (a, b) {
            var da = Object.keys(neighbors[a] || {}).length;
            var db = Object.keys(neighbors[b] || {}).length;
            return db - da;
        });

        var toneByKey = {};
        for (i = 0; i < keys.length; i++) {
            var k = keys[i];
            var used = {};
            Object.keys(neighbors[k] || {}).forEach(function (n) {
                var t = toneByKey[n];
                if (t) used[t] = true;
            });
            var tone = 1;
            while (tone <= maxTone && used[tone]) tone++;
            if (tone > maxTone) tone = ((i % maxTone) + 1);
            toneByKey[k] = tone;
        }
        return toneByKey;
    }

    A.selectedCourseRow = null;
    A.isAddingCourse = false;

    A.setCourseStatus = function (message, variant) {
        var el = document.getElementById("course-status");
        if (!el) return;
        if (!message) {
            el.textContent = "";
            el.className = "app-flash d-none mb-2";
            return;
        }
        var v = variant || "info";
        el.textContent = message;
        el.className = "app-flash app-flash--" + v + " mb-2";
    };

    A.hideCourseEditor = function () {
        var el = document.getElementById("course-editor-panel");
        if (el) el.classList.add("d-none");
        var addBtn = document.getElementById("btn-course-add-open");
        if (addBtn) addBtn.classList.remove("d-none");
        var closeBtn = document.getElementById("btn-course-close-editor");
        if (closeBtn) closeBtn.classList.add("d-none");
    };

    A.showCourseEditor = function () {
        var el = document.getElementById("course-editor-panel");
        if (el) el.classList.remove("d-none");
        var addBtn = document.getElementById("btn-course-add-open");
        if (addBtn) addBtn.classList.add("d-none");
        var closeBtn = document.getElementById("btn-course-close-editor");
        if (closeBtn) closeBtn.classList.remove("d-none");
    };

    A.syncCourseEditorActionVisibility = function () {
        var hasId = !!document.getElementById("course-id").value.trim();
        var editOnly = document.querySelectorAll(".course-editor-existing-only");
        for (var i = 0; i < editOnly.length; i++) {
            editOnly[i].classList.toggle("d-none", !hasId);
        }
    };

    A.courseLanguageLine = function (c) {
        var lang =
            pick(c, "languageName", "LanguageName") || pick(c, "subjectName", "SubjectName") || "";
        var code =
            pick(c, "languageCode", "LanguageCode") || pick(c, "subjectCode", "SubjectCode") || "";
        return lang || code || "—";
    };

    A.setCourseEditEnabled = function (on) {
        ["btn-course-update", "btn-course-delete", "btn-course-permanent-delete"].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.disabled = !on;
        });
        if (!on) {
            var bl = document.getElementById("btn-course-apply-level");
            if (bl) bl.disabled = true;
        }
    };

    A.syncCourseLevelConfirmButton = function () {
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
    };

    A.setCourseSelectionFromRow = function (c, tr) {
        if (A.selectedCourseRow) A.selectedCourseRow.classList.remove("table-active");
        if (tr) {
            tr.classList.add("table-active");
            A.selectedCourseRow = tr;
        } else {
            A.selectedCourseRow = null;
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
            A.setCourseEditEnabled(false);
            var wrapCreate = document.getElementById("wrap-btn-course-create");
            if (wrapCreate) wrapCreate.classList.remove("d-none");
            A.syncCourseEditorActionVisibility();
            return;
        }
        var name = pick(c, "name", "Name") || "Course";
        var level = levelLabel(pick(c, "level", "Level"));
        var langLine = A.courseLanguageLine(c);
        summaryEl.textContent =
            name + " · " + level + (langLine && langLine !== "—" ? " · " + langLine : "");
        clearBtn.classList.remove("d-none");
        A.setCourseEditEnabled(true);
        var wrapCreate2 = document.getElementById("wrap-btn-course-create");
        if (wrapCreate2) wrapCreate2.classList.add("d-none");
        var hideBtn = document.getElementById("btn-course-delete");
        var isActive = !!pick(c, "isActive", "IsActive");
        if (hideBtn) {
            hideBtn.textContent = isActive ? "Hide" : "Show";
            hideBtn.classList.toggle("btn-outline-danger", isActive);
            hideBtn.classList.toggle("btn-outline-success", !isActive);
        }
        var permBtn = document.getElementById("btn-course-permanent-delete");
        if (permBtn) permBtn.disabled = isActive;
        document.getElementById("course-name").value = pick(c, "name", "Name") || "";
        document.getElementById("course-desc").value = pick(c, "description", "Description") || "";
        ensureLanguageOption(
            pick(c, "languageName", "LanguageName") || pick(c, "subjectName", "SubjectName") || ""
        );
        var levelRaw = pick(c, "level", "Level");
        var levelEl = document.getElementById("course-level");
        levelEl.value = String(levelRaw !== undefined && levelRaw !== null ? levelRaw : 0);
        levelEl.dataset.savedLevel = String(levelRaw !== undefined && levelRaw !== null ? levelRaw : 0);
        A.syncCourseLevelConfirmButton();
        A.syncCourseEditorActionVisibility();
        A.showCourseEditor();
        A.isAddingCourse = false;
    };

    A.clearCourseSelection = function () {
        A.setCourseSelectionFromRow(null, null);
        document.getElementById("course-name").value = "";
        document.getElementById("course-desc").value = "";
        document.getElementById("course-language-name").value = "";
        document.getElementById("course-level").value = "";
        var hideBtn = document.getElementById("btn-course-delete");
        if (hideBtn) {
            hideBtn.textContent = "Hide";
            hideBtn.classList.add("btn-outline-danger");
            hideBtn.classList.remove("btn-outline-success");
        }
    };

    A.openCourseEditorForNew = function () {
        A.clearCourseSelection();
        var summaryEl = document.getElementById("course-selected-summary");
        if (summaryEl) summaryEl.textContent = "Creating a new course";
        A.syncCourseEditorActionVisibility();
        A.showCourseEditor();
        A.isAddingCourse = true;
        var n = document.getElementById("course-name");
        if (n) n.focus();
    };

    A.closeCourseEditor = function () {
        A.clearCourseSelection();
        A.hideCourseEditor();
        A.isAddingCourse = false;
    };

    A.fillEnrollmentCourseSelect = function (items) {
        var sel = document.getElementById("enr-course-select");
        var keep = sel.value;
        sel.innerHTML = "";
        var opt0 = document.createElement("option");
        opt0.value = "";
        opt0.textContent = "Choose a course…";
        sel.appendChild(opt0);
        (items || []).forEach(function (c) {
            var cid = pick(c, "id", "Id");
            var name = pick(c, "name", "Name") || "Course";
            var o = document.createElement("option");
            o.value = cid;
            o.textContent = name;
            sel.appendChild(o);
        });
        if (keep && [].some.call(sel.options, function (o) { return o.value === keep; })) {
            sel.value = keep;
        }
    };

    A.fillCourseRequestCourseSelect = function (items) {
        var sel = document.getElementById("cr-filter-course");
        if (!sel) return;
        var keep = sel.value;
        sel.innerHTML = "";
        var opt0 = document.createElement("option");
        opt0.value = "";
        opt0.textContent = "All courses";
        sel.appendChild(opt0);
        (items || []).forEach(function (c) {
            var cid = pick(c, "id", "Id");
            var name = pick(c, "name", "Name") || "Course";
            var o = document.createElement("option");
            o.value = cid;
            o.textContent = name;
            sel.appendChild(o);
        });
        if (keep && [].some.call(sel.options, function (o) { return o.value === keep; })) {
            sel.value = keep;
        }
    };

    A.renderCourses = async function () {
        const table = document.getElementById("course-table");
        const tbody = document.getElementById("course-body");
        A.setCourseStatus("Loading courses…", "info");
        tbody.innerHTML = "";
        table.classList.add("d-none");
        A.hideCourseEditor();
        A.selectedCourseRow = null;

        const res = await w.getAdminCourses(true);
        if (res.forbidden) {
            A.setCourseStatus(A.staffForbiddenNote(), "danger");
            return;
        }
        if (res.error) {
            A.setCourseStatus(res.error, "danger");
            return;
        }
        const items = res.items || [];
        var toneByLangKey = buildLanguageToneMap(items);
        A.setCourseStatus(items.length + " courses listed", "info");
        A.setCourseSelectionFromRow(null, null);
        A.fillEnrollmentCourseSelect(items);
        A.fillCourseRequestCourseSelect(items);
        items.forEach(function (c) {
            const tr = document.createElement("tr");
            const id = pick(c, "id", "Id");
            tr.classList.add("cursor-pointer");
            var tone = toneByLangKey[courseLanguageKey(c)] || 1;
            tr.classList.add("course-lang-tone-" + tone);
            tr.innerHTML =
                '<td><span class="fw-semibold">' +
                (pick(c, "name", "Name") || "—") +
                "</span></td>" +
                "<td>" +
                A.courseLanguageLine(c) +
                "</td>" +
                "<td>" +
                levelLabel(pick(c, "level", "Level")) +
                "</td>" +
                "<td>" +
                (pick(c, "isActive", "IsActive") ? "Yes" : "No") +
                "</td>";
            tr.addEventListener("click", function () {
                A.setCourseSelectionFromRow(c, tr);
            });
            tbody.appendChild(tr);
        });
        if (items.length) table.classList.remove("d-none");
    };

    A.coursePayloadFromForm = function () {
        var languageName = document.getElementById("course-language-name").value.trim();
        var lang = languageByName(languageName);
        return {
            name: document.getElementById("course-name").value.trim(),
            description: document.getElementById("course-desc").value.trim(),
            languageCode: lang ? lang.code : "",
            languageName: languageName,
            level: Number(document.getElementById("course-level").value),
            category: 0
        };
    };

    (function initLanguageDropdown() {
        var sel = document.getElementById("course-language-name");
        if (!sel) return;
        COURSE_LANGUAGES.forEach(function (L) {
            var opt = document.createElement("option");
            opt.value = L.name;
            opt.textContent = L.name;
            sel.appendChild(opt);
        });
    })();

    function enrollmentRosterSummaryText(count) {
        if (count === 0) return "No students are enrolled in this course right now.";
        if (count === 1) return "1 student is enrolled in this course.";
        return count + " students are enrolled in this course.";
    }

    A.loadEnrollmentsByCourseUi = async function () {
        const id = document.getElementById("enr-course-select").value.trim();
        const table = document.getElementById("enr-table");
        const tbody = document.getElementById("enr-body");
        if (!id) {
            setInlineStatus("enr-status", "Pick a course above, then click Confirm to see the class list.", "warning");
            return;
        }
        setInlineStatus("enr-status", "Loading…", "info");
        tbody.innerHTML = "";
        table.classList.add("d-none");
        const res = await w.getEnrollmentsByCourse(id);
        if (res.forbidden) {
            setInlineStatus("enr-status", A.staffForbiddenNote(), "danger");
            return;
        }
        if (res.error) {
            setInlineStatus("enr-status", res.error, "danger");
            return;
        }
        const items = res.items || [];
        setInlineStatus("enr-status", enrollmentRosterSummaryText(items.length), "info");
        items.forEach(function (e) {
            const tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" +
                pick(e, "email", "Email") +
                "</td>" +
                "<td>" +
                (pick(e, "userName", "UserName") || pick(e, "fullName", "FullName") || "—") +
                "</td>" +
                "<td>" +
                (pick(e, "studentNumber", "StudentNumber") || "—") +
                "</td>" +
                "<td>" +
                A.roleHuman(pick(e, "role", "Role")) +
                "</td>" +
                "<td>" +
                new Date(pick(e, "enrolledAt", "EnrolledAt")).toLocaleString() +
                "</td>";
            tbody.appendChild(tr);
        });
        if (items.length) table.classList.remove("d-none");
    };
})(typeof window !== "undefined" ? window : this);
