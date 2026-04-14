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

    /** Populated when a background AI job sets AiSuggestedCategory / AiConfidence on the message. */
    function formatAiSuggestionCell(aiCat, conf) {
        var hasCat = aiCat != null && String(aiCat).trim() !== "";
        var hasConf = conf != null && conf !== "" && !isNaN(Number(conf));
        if (!hasCat && !hasConf) return "—";
        var t = hasCat ? escapeHtmlAdmin(String(aiCat).trim()) : "—";
        if (hasConf) {
            t += ' <span class="text-muted small">(' + Math.round(Number(conf) * 100) + "%)</span>";
        }
        return t;
    }

    function roleHuman(r) {
        if (r === 0 || r === "Visitor") return "Visitor";
        if (r === 1 || r === "Student") return "Student";
        if (r === 2 || r === "Admin") return "Staff";
        return String(r);
    }

    function staffForbiddenNote() {
        return "You need staff access. Sign in with a staff account.";
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
        el.textContent =
            items.length +
            " request(s)" +
            (hasAppliedFilter ? " · Filtered" : "");

        items.forEach(function (row) {
            const id = pick(row, "id", "Id");
            const pending = (pick(row, "status", "Status") === 0 || pick(row, "status", "Status") === "Pending");
            const tr = document.createElement("tr");
            const email = pick(row, "userEmail", "UserEmail");
            const name = pick(row, "userFullName", "UserFullName");
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
        statusEl.textContent = items.length + " message(s).";
        items.forEach(function (m) {
            const tr = document.createElement("tr");
            const id = pick(m, "id", "Id");
            const finalCat = pick(m, "finalCategory", "FinalCategory");
            const readAt = pick(m, "readAt", "ReadAt");
            const isRead = !!readAt;
            const contentRaw = pick(m, "content", "Content") || "";
            const preview =
                '<details class="admin-msg-details"><summary class="small text-nowrap">Show</summary><pre class="admin-msg-pre small mb-0 mt-1">' +
                escapeHtmlAdmin(contentRaw) +
                "</pre></details>";
            const senderTopic = categoryHuman(pick(m, "senderSuggestedCategory", "SenderSuggestedCategory"));
            const aiCell = formatAiSuggestionCell(
                pick(m, "aiSuggestedCategory", "AiSuggestedCategory"),
                pick(m, "aiConfidence", "AiConfidence")
            );
            tr.innerHTML =
                "<td>" + pick(m, "senderEmail", "SenderEmail") + "</td>" +
                "<td>" + pick(m, "receiverEmail", "ReceiverEmail") + "</td>" +
                "<td>" + pick(m, "subject", "Subject") + "</td>" +
                "<td>" + preview + "</td>" +
                "<td>" + senderTopic + "</td>" +
                "<td>" + aiCell + "</td>" +
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

    async function loadEnrollmentsByCourseUi() {
        const id = document.getElementById("enr-course-select").value.trim();
        const statusEl = document.getElementById("enr-status");
        const table = document.getElementById("enr-table");
        const tbody = document.getElementById("enr-body");
        if (!id) {
            statusEl.textContent = "Choose a course from the list.";
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
        statusEl.textContent = items.length + " learner(s) enrolled.";
        items.forEach(function (e) {
            const tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" + pick(e, "email", "Email") + "</td>" +
                "<td>" + (pick(e, "fullName", "FullName") || "—") + "</td>" +
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

    resetCourseRequestFilters();
    document.getElementById("cr-filter-status").value = "Pending";
    renderCourseRequests(readCourseRequestFilters());
    renderMessages({ page: 1, pageSize: 50 });
    renderCourses();
    showAdminPane("requests");
})();
