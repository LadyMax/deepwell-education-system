(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before admin-courses.js).");
        return;
    }

    var levelLabel = S.courseLevelLabel;
    var escapeHtml = typeof S.escapeHtml === "function" ? S.escapeHtml : function (x) { return String(x); };
    var A = (w.DeepwellAdmin = w.DeepwellAdmin || {});
    var PLACEHOLDER_COVER_SRC = "images/deepwell-course.jpg";
    A._pendingCourseCoverBlob = null;
    A._courseCoverTargetW = 960;
    A._courseCoverTargetH = 540;

    function updateCourseCoverSizeLabel() {
        var el = document.getElementById("course-cover-size-label");
        if (el) {
            el.textContent = String(A._courseCoverTargetW) + " × " + String(A._courseCoverTargetH);
        }
    }

    function drawImageCoverOnCanvas(canvas, img, w, h) {
        var ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = w;
        canvas.height = h;
        var iw = img.naturalWidth || img.width;
        var ih = img.naturalHeight || img.height;
        if (!iw || !ih) return;
        var scale = Math.max(w / iw, h / ih);
        var sw = w / scale;
        var sh = h / scale;
        var sx = (iw - sw) / 2;
        var sy = (ih - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    }

    function resizeCourseCoverToTargetSize(file) {
        return new Promise(function (resolve, reject) {
            var w = A._courseCoverTargetW;
            var h = A._courseCoverTargetH;
            var img = new Image();
            var url = URL.createObjectURL(file);
            img.onload = function () {
                URL.revokeObjectURL(url);
                try {
                    var canvas = document.createElement("canvas");
                    drawImageCoverOnCanvas(canvas, img, w, h);
                    canvas.toBlob(
                        function (blob) {
                            if (!blob) reject(new Error("Could not encode image."));
                            else resolve(blob);
                        },
                        "image/jpeg",
                        0.88
                    );
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error("Could not read image file."));
            };
            img.src = url;
        });
    }

    function setCourseCoverPreviewSrc(src) {
        var prev = document.getElementById("course-cover-preview");
        if (!prev) return;
        prev.src = src || PLACEHOLDER_COVER_SRC;
    }

    function courseCoverStoredFileBasename(path) {
        var s = String(path || "").trim().replace(/\\/g, "/");
        if (!s) return "";
        var i = s.lastIndexOf("/");
        return i >= 0 ? s.slice(i + 1) : s;
    }

    function setCourseCoverFileNameDisplay(text) {
        var el = document.getElementById("course-cover-file-name");
        if (!el) return;
        el.textContent = text || "";
    }

    A.resetCourseCoverEditor = function () {
        A._pendingCourseCoverBlob = null;
        var fin = document.getElementById("course-cover-file");
        if (fin) fin.value = "";
        setCourseCoverFileNameDisplay("");
        setCourseCoverPreviewSrc(PLACEHOLDER_COVER_SRC);
    };

    A.uploadPendingCourseCoverIfAny = async function (courseId) {
        var cid = String(courseId || "").trim();
        if (!cid || !A._pendingCourseCoverBlob) {
            return { ok: true, skipped: true };
        }
        if (typeof w.uploadCourseCover !== "function") {
            return { ok: false, message: "uploadCourseCover is not available." };
        }
        var blob = A._pendingCourseCoverBlob;
        A._pendingCourseCoverBlob = null;
        var fin = document.getElementById("course-cover-file");
        if (fin) fin.value = "";
        return w.uploadCourseCover(cid, blob);
    };

    (function initCourseCoverTargetDimensions() {
        var probe = new Image();
        probe.onload = function () {
            if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
                A._courseCoverTargetW = probe.naturalWidth;
                A._courseCoverTargetH = probe.naturalHeight;
            }
            updateCourseCoverSizeLabel();
        };
        probe.onerror = function () {
            updateCourseCoverSizeLabel();
        };
        probe.src = PLACEHOLDER_COVER_SRC;
    })();

    (function initCourseCoverFileInput() {
        var fin = document.getElementById("course-cover-file");
        if (!fin) return;
        fin.addEventListener("change", function () {
            var f = fin.files && fin.files[0];
            if (!f) {
                A.resetCourseCoverEditor();
                return;
            }
            void resizeCourseCoverToTargetSize(f)
                .then(function (blob) {
                    A._pendingCourseCoverBlob = blob;
                    setCourseCoverFileNameDisplay(f.name || "");
                    setCourseCoverPreviewSrc(URL.createObjectURL(blob));
                })
                .catch(function () {
                    A.resetCourseCoverEditor();
                    if (typeof A.setCourseStatus === "function") {
                        A.setCourseStatus("Could not process that image. Try JPG or PNG.", "warning");
                    }
                });
        });
    })();
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
        var idEl = document.getElementById("course-id");
        var hasId = !!(idEl && idEl.value.trim());
        var availableYes = !!(idEl && idEl.dataset.courseIsActive === "1");
        var editOnly = document.querySelectorAll(".course-editor-existing-only");
        for (var i = 0; i < editOnly.length; i++) {
            editOnly[i].classList.toggle("d-none", !hasId);
        }
        var permWrap = document.getElementById("wrap-btn-course-permanent-delete");
        if (permWrap) {
            permWrap.classList.toggle("d-none", !hasId || availableYes);
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
        var courseIdEl = document.getElementById("course-id");
        courseIdEl.value = id || "";
        if (!c) {
            delete courseIdEl.dataset.courseIsActive;
        } else {
            courseIdEl.dataset.courseIsActive = pick(c, "isActive", "IsActive") ? "1" : "0";
        }
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
        A._pendingCourseCoverBlob = null;
        var fin = document.getElementById("course-cover-file");
        if (fin) fin.value = "";
        var imgu = pick(c, "imageUrl", "ImageUrl");
        var imguTrim = imgu && String(imgu).trim() ? String(imgu).trim() : "";
        setCourseCoverPreviewSrc(imguTrim || PLACEHOLDER_COVER_SRC);
        setCourseCoverFileNameDisplay(imguTrim ? courseCoverStoredFileBasename(imguTrim) : "");
    };

    A.clearCourseSelection = function () {
        A.setCourseSelectionFromRow(null, null);
        document.getElementById("course-name").value = "";
        document.getElementById("course-desc").value = "";
        document.getElementById("course-language-name").value = "";
        document.getElementById("course-level").value = "";
        A.resetCourseCoverEditor();
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
        A.fillCourseRequestCourseSelect(items);
        items.forEach(function (c) {
            const tr = document.createElement("tr");
            const id = pick(c, "id", "Id");
            tr.classList.add("cursor-pointer");
            var tone = toneByLangKey[courseLanguageKey(c)] || 1;
            tr.classList.add("course-lang-tone-" + tone);
            tr.innerHTML =
                '<td><span class="fw-semibold">' +
                escapeHtml(String(pick(c, "name", "Name") || "—")) +
                "</span></td>" +
                "<td>" +
                escapeHtml(String(A.courseLanguageLine(c))) +
                "</td>" +
                "<td>" +
                escapeHtml(String(levelLabel(pick(c, "level", "Level")))) +
                "</td>" +
                "<td>" +
                escapeHtml(String(pick(c, "enrollmentCount", "EnrollmentCount") || 0)) +
                "</td>" +
                '<td class="text-nowrap">' +
                '<button type="button" class="btn btn-outline-secondary btn-sm course-roster-btn" aria-label="View course roster">View</button>' +
                "</td>" +
                "<td>" +
                (pick(c, "isActive", "IsActive") ? "Yes" : "No") +
                "</td>";
            var rosterBtn = tr.querySelector(".course-roster-btn");
            if (rosterBtn) {
                rosterBtn.addEventListener("click", function (ev) {
                    if (ev && ev.stopPropagation) ev.stopPropagation();
                    void A.openCourseRosterModal(id, pick(c, "name", "Name") || "Course");
                });
            }
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

    function rosterUsernameCellHtml(e) {
        var uid = pick(e, "userId", "UserId");
        var raw = (pick(e, "userName", "UserName") || pick(e, "fullName", "FullName") || "").trim();
        var display = raw || "—";
        if (!uid) {
            return escapeHtml(display);
        }
        return (
            '<button type="button" class="btn btn-link btn-sm p-0 align-baseline text-left roster-user-profile-btn" data-user-id="' +
            escapeHtml(String(uid)) +
            '">' +
            escapeHtml(display) +
            "</button>"
        );
    }

    function openAdminUserProfileAfterRosterIfNeeded(userId) {
        if (!userId || typeof A.openAdminUserProfile !== "function") return;
        var $ = w.jQuery;
        if ($ && $.fn && $.fn.modal) {
            var $roster = $("#admin-course-roster-modal");
            if ($roster.length && $roster.hasClass("show")) {
                $roster.one("hidden.bs.modal", function () {
                    A._resumeRosterAfterProfileClose = true;
                    void A.openAdminUserProfile(userId);
                });
                $roster.modal("hide");
                return;
            }
        }
        A._resumeRosterAfterProfileClose = false;
        void A.openAdminUserProfile(userId);
    }

    (function initRosterUserProfileClicks() {
        var tbody = document.getElementById("admin-course-roster-body");
        if (!tbody) return;
        tbody.addEventListener("click", function (ev) {
            var btn = ev.target.closest("button.roster-user-profile-btn");
            if (!btn || !tbody.contains(btn)) return;
            ev.preventDefault();
            ev.stopPropagation();
            var uid = btn.getAttribute("data-user-id");
            if (!uid) return;
            openAdminUserProfileAfterRosterIfNeeded(uid);
        });
    })();

    (function initReopenRosterAfterProfileClose() {
        if (!w.jQuery || !w.jQuery.fn || !w.jQuery.fn.modal) return;
        var $ = w.jQuery;
        var $detail = $("#admin-user-detail-modal");
        if (!$detail.length) return;
        $detail.on("hidden.bs.modal", function () {
            if (!A._resumeRosterAfterProfileClose || !A._lastRosterOpen) return;
            A._resumeRosterAfterProfileClose = false;
            var o = A._lastRosterOpen;
            if (!o || !o.courseId || typeof A.openCourseRosterModal !== "function") return;
            w.setTimeout(function () {
                void A.openCourseRosterModal(o.courseId, o.courseName);
            }, 10);
        });
    })();

    function showCourseRosterModal() {
        var el = document.getElementById("admin-course-roster-modal");
        if (!el) return;
        if (w.jQuery && w.jQuery.fn && w.jQuery.fn.modal) {
            w.jQuery(el).modal("show");
        } else {
            el.classList.add("show");
            el.style.display = "block";
            el.removeAttribute("aria-hidden");
        }
    }

    A.openCourseRosterModal = async function (courseId, courseName) {
        var titleEl = document.getElementById("admin-course-roster-title");
        var sumEl = document.getElementById("admin-course-roster-summary");
        var tbody = document.getElementById("admin-course-roster-body");
        if (!tbody || !sumEl) return;
        var cid = String(courseId || "").trim();
        if (!cid) return;
        A._lastRosterOpen = { courseId: cid, courseName: courseName || "Course" };
        if (titleEl) {
            titleEl.textContent = "Roster — " + (courseName || "Course");
        }
        sumEl.textContent = "Loading…";
        sumEl.className = "small text-muted mb-2";
        tbody.innerHTML = "";
        showCourseRosterModal();
        const res = await w.getEnrollmentsByCourse(cid);
        if (res.forbidden) {
            sumEl.textContent = A.staffForbiddenNote();
            sumEl.className = "small text-danger mb-2";
            return;
        }
        if (res.error) {
            sumEl.textContent = res.error;
            sumEl.className = "small text-danger mb-2";
            return;
        }
        const items = res.items || [];
        sumEl.textContent = enrollmentRosterSummaryText(items.length);
        sumEl.className = "small text-muted mb-2";
        items.forEach(function (e) {
            const tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" +
                escapeHtml(String(pick(e, "email", "Email") || "")) +
                "</td>" +
                "<td>" +
                rosterUsernameCellHtml(e) +
                "</td>" +
                "<td>" +
                escapeHtml(String(pick(e, "studentNumber", "StudentNumber") || "—")) +
                "</td>" +
                "<td>" +
                escapeHtml(String(A.roleHuman(pick(e, "role", "Role")))) +
                "</td>" +
                "<td>" +
                escapeHtml(new Date(pick(e, "enrolledAt", "EnrolledAt")).toLocaleString()) +
                "</td>";
            tbody.appendChild(tr);
        });
    };
})(typeof window !== "undefined" ? window : this);
