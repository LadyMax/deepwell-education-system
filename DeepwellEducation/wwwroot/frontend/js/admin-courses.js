(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before admin-courses.js).");
        return;
    }

    var levelLabel = S.courseLevelLabel;
    var A = (w.DeepwellAdmin = w.DeepwellAdmin || {});

    A.selectedCourseRow = null;

    A.courseLanguageLine = function (c) {
        var lang =
            pick(c, "languageName", "LanguageName") || pick(c, "subjectName", "SubjectName") || "";
        var code =
            pick(c, "languageCode", "LanguageCode") || pick(c, "subjectCode", "SubjectCode") || "";
        return lang ? lang + (code ? " (" + code + ")" : "") : code || "—";
    };

    A.setCourseEditEnabled = function (on) {
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

    A.syncCourseVisibilityConfirmButton = function () {
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
            var activeSel0 = document.getElementById("course-active-select");
            if (activeSel0) {
                activeSel0.value = "true";
                delete activeSel0.dataset.savedActive;
            }
            A.setCourseEditEnabled(false);
            return;
        }
        var name = pick(c, "name", "Name") || "Course";
        var level = levelLabel(pick(c, "level", "Level"));
        var langLine = A.courseLanguageLine(c);
        summaryEl.textContent =
            name + " · " + level + (langLine && langLine !== "—" ? " · " + langLine : "");
        clearBtn.classList.remove("d-none");
        A.setCourseEditEnabled(true);
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
        var isActive = !!pick(c, "isActive", "IsActive");
        var activeEl = document.getElementById("course-active-select");
        activeEl.value = isActive ? "true" : "false";
        activeEl.dataset.savedActive = isActive ? "true" : "false";
        A.syncCourseLevelConfirmButton();
        A.syncCourseVisibilityConfirmButton();
    };

    A.clearCourseSelection = function () {
        A.setCourseSelectionFromRow(null, null);
        document.getElementById("course-name").value = "";
        document.getElementById("course-desc").value = "";
        document.getElementById("course-language-code").value = "";
        document.getElementById("course-language-name").value = "";
        document.getElementById("course-level").value = "0";
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
        const statusEl = document.getElementById("course-status");
        const table = document.getElementById("course-table");
        const tbody = document.getElementById("course-body");
        statusEl.textContent = "Loading…";
        tbody.innerHTML = "";
        table.classList.add("d-none");
        A.selectedCourseRow = null;

        const res = await w.getAdminCourses(true);
        if (res.forbidden) {
            statusEl.textContent = A.staffForbiddenNote();
            return;
        }
        if (res.error) {
            statusEl.textContent = res.error;
            return;
        }
        const items = res.items || [];
        statusEl.textContent = items.length + " course(s) listed.";
        A.setCourseSelectionFromRow(null, null);
        A.fillEnrollmentCourseSelect(items);
        A.fillCourseRequestCourseSelect(items);
        items.forEach(function (c) {
            const tr = document.createElement("tr");
            const id = pick(c, "id", "Id");
            tr.classList.add("cursor-pointer");
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
        return {
            name: document.getElementById("course-name").value.trim(),
            description: document.getElementById("course-desc").value.trim(),
            languageCode: document.getElementById("course-language-code").value.trim().toLowerCase(),
            languageName: document.getElementById("course-language-name").value.trim(),
            level: Number(document.getElementById("course-level").value),
            category: 0
        };
    };

    function enrollmentRosterSummaryText(count) {
        if (count === 0) return "No students are enrolled in this course right now.";
        if (count === 1) return "1 student is enrolled in this course.";
        return count + " students are enrolled in this course.";
    }

    A.loadEnrollmentsByCourseUi = async function () {
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
        const res = await w.getEnrollmentsByCourse(id);
        if (res.forbidden) {
            statusEl.textContent = A.staffForbiddenNote();
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
