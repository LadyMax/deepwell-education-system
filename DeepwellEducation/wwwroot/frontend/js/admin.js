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

    function levelLabel(v) {
        if (v === 0 || v === "Beginner") return "Beginner";
        if (v === 1 || v === "Intermediate") return "Intermediate";
        if (v === 2 || v === "Advanced") return "Advanced";
        return String(v);
    }

    function categoryLabel(v) {
        if (v === 0 || v === "CourseInquiry") return "CourseInquiry";
        if (v === 1 || v === "Complaint") return "Complaint";
        if (v === 2 || v === "Feedback") return "Feedback";
        if (v === 3 || v === "Other") return "Other";
        return "—";
    }

    async function renderCourseRequests(statusFilter) {
        const el = document.getElementById("cr-status");
        const table = document.getElementById("cr-table");
        const tbody = document.getElementById("cr-body");
        el.textContent = "Loading…";
        tbody.innerHTML = "";
        table.classList.add("d-none");

        const res = await getCourseRequests(statusFilter);
        if (res.forbidden) {
            el.textContent = "Forbidden — login as Admin.";
            return;
        }
        if (res.error) {
            el.textContent = res.error;
            return;
        }
        const items = res.items || [];
        el.textContent = items.length + " request(s)." + (statusFilter ? " Filter: " + statusFilter : "");

        items.forEach(function (row) {
            const id = pick(row, "id", "Id");
            const pending = (pick(row, "status", "Status") === 0 || pick(row, "status", "Status") === "Pending");
            const tr = document.createElement("tr");
            const email = pick(row, "userEmail", "UserEmail");
            const name = pick(row, "userFullName", "UserFullName");
            const course = pick(row, "courseName", "CourseName");
            const type = pick(row, "type", "Type");
            const status = pick(row, "status", "Status");
            const created = new Date(pick(row, "createdAt", "CreatedAt")).toLocaleString();

            let actions = "";
            if (pending) {
                actions =
                    '<button type="button" class="btn btn-success btn-sm me-1 cr-approve" data-id="' + id + '">Approve</button>' +
                    '<button type="button" class="btn btn-outline-danger btn-sm cr-reject" data-id="' + id + '">Reject</button>';
            } else {
                actions = "—";
            }

            tr.innerHTML =
                "<td>" + (name || "—") + "<br><small class=\"text-muted\">" + email + "</small></td>" +
                "<td>" + course + "</td>" +
                "<td>" + typeLabel(type) + "</td>" +
                "<td>" + statusLabel(status) + "</td>" +
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
                await renderCourseRequests(statusFilter);
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
                await renderCourseRequests(statusFilter);
            });
        });
    }

    async function renderMessages(options) {
        const statusEl = document.getElementById("status");
        const msgTable = document.getElementById("msg-table");
        const tbody = document.getElementById("msg-body");
        statusEl.textContent = "Loading…";
        tbody.innerHTML = "";
        msgTable.classList.add("d-none");

        const page = await getAdminMessages(options || { uncategorizedOnly: true, page: 1, pageSize: 50 });
        if (page.forbidden) {
            statusEl.textContent = "Forbidden — login as Admin.";
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
            const cat = pick(m, "finalCategory", "FinalCategory");
            const readAt = pick(m, "readAt", "ReadAt");
            tr.innerHTML =
                "<td><small>" + id + "</small></td>" +
                "<td>" + pick(m, "senderEmail", "SenderEmail") + "</td>" +
                "<td>" + pick(m, "receiverEmail", "ReceiverEmail") + "</td>" +
                "<td>" + pick(m, "subject", "Subject") + "</td>" +
                "<td>" + (cat != null ? categoryLabel(cat) : "—") + "</td>" +
                "<td>" + (readAt ? "Yes" : "No") + "</td>" +
                "<td>" +
                '<select class="form-select form-select-sm msg-cat" data-id="' + id + '">' +
                '<option value="">Set category</option>' +
                '<option value="0">CourseInquiry</option>' +
                '<option value="1">Complaint</option>' +
                '<option value="2">Feedback</option>' +
                '<option value="3">Other</option>' +
                "</select>" +
                "</td>";
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll(".msg-cat").forEach(function (sel) {
            sel.addEventListener("change", async function () {
                const id = sel.getAttribute("data-id");
                const v = sel.value;
                if (v === "") return;
                const r = await categorizeMessage(id, Number(v));
                if (!r.ok) {
                    showAppFlash("admin-flash", r.message || "Failed to categorize.", "danger", 6000);
                    sel.value = "";
                    return;
                }
                showAppFlash("admin-flash", "Message categorized.", "success", 3500);
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
            statusEl.textContent = "Forbidden — login as Admin.";
            return;
        }
        if (res.error) {
            statusEl.textContent = res.error;
            return;
        }
        const items = res.items || [];
        statusEl.textContent = items.length + " course(s).";
        items.forEach(function (c) {
            const tr = document.createElement("tr");
            const id = pick(c, "id", "Id");
            tr.classList.add("cursor-pointer");
            tr.innerHTML =
                "<td><small>" + id + "</small></td>" +
                "<td>" + pick(c, "name", "Name") + "</td>" +
                "<td>" + (pick(c, "languageName", "LanguageName") || pick(c, "subjectName", "SubjectName") || "") +
                    " (" + (pick(c, "languageCode", "LanguageCode") || pick(c, "subjectCode", "SubjectCode") || "") + ")" + "</td>" +
                "<td>" + levelLabel(pick(c, "level", "Level")) + "</td>" +
                "<td>" + (pick(c, "isActive", "IsActive") ? "Yes" : "No") + "</td>";
            tr.addEventListener("click", function () {
                if (selectedCourseRow) selectedCourseRow.classList.remove("table-active");
                tr.classList.add("table-active");
                selectedCourseRow = tr;
                document.getElementById("course-id").value = id;
                document.getElementById("course-name").value = pick(c, "name", "Name") || "";
                document.getElementById("course-desc").value = pick(c, "description", "Description") || "";
                document.getElementById("course-language-code").value =
                    pick(c, "languageCode", "LanguageCode") || pick(c, "subjectCode", "SubjectCode") || "";
                document.getElementById("course-language-name").value =
                    pick(c, "languageName", "LanguageName") || pick(c, "subjectName", "SubjectName") || "";
                document.getElementById("course-level").value = String(pick(c, "level", "Level") || 0);
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
        const id = document.getElementById("enr-course-id").value.trim();
        const statusEl = document.getElementById("enr-status");
        const table = document.getElementById("enr-table");
        const tbody = document.getElementById("enr-body");
        if (!id) {
            statusEl.textContent = "Enter course id.";
            return;
        }
        statusEl.textContent = "Loading…";
        tbody.innerHTML = "";
        table.classList.add("d-none");
        const res = await getEnrollmentsByCourse(id);
        if (res.forbidden) {
            statusEl.textContent = "Forbidden — login as Admin.";
            return;
        }
        if (res.error) {
            statusEl.textContent = res.error;
            return;
        }
        const items = res.items || [];
        statusEl.textContent = items.length + " enrollment(s).";
        items.forEach(function (e) {
            const tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" + pick(e, "email", "Email") + "</td>" +
                "<td>" + (pick(e, "fullName", "FullName") || "—") + "</td>" +
                "<td>" + String(pick(e, "role", "Role")) + "</td>" +
                "<td>" + new Date(pick(e, "enrolledAt", "EnrolledAt")).toLocaleString() + "</td>";
            tbody.appendChild(tr);
        });
        if (items.length) table.classList.remove("d-none");
    }

    document.getElementById("btn-load-pending").addEventListener("click", function () {
        renderCourseRequests("Pending");
    });
    document.getElementById("btn-load-all").addEventListener("click", function () {
        renderCourseRequests("");
    });

    document.getElementById("btn-cr-detail").addEventListener("click", async function () {
        const id = document.getElementById("cr-id-input").value.trim();
        if (!id) {
            document.getElementById("cr-status").textContent = "Enter request id.";
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

    document.getElementById("btn-load-msg-uncat").addEventListener("click", function () {
        renderMessages({ uncategorizedOnly: true, page: 1, pageSize: 50 });
    });
    document.getElementById("btn-load-msg-filter").addEventListener("click", function () {
        const v = document.getElementById("msg-final-filter").value;
        if (v === "") {
            document.getElementById("status").textContent = "Select final category.";
            return;
        }
        renderMessages({ finalCategory: Number(v), page: 1, pageSize: 50 });
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
            document.getElementById("course-status").textContent = "Course id is required for update.";
            return;
        }
        const r = await updateCourse(id, coursePayloadFromForm());
        document.getElementById("course-status").textContent = r.ok ? "Course updated." : (r.message || "Failed");
        if (r.ok) renderCourses();
    });
    document.getElementById("btn-course-delete").addEventListener("click", async function () {
        const id = document.getElementById("course-id").value.trim();
        if (!id) {
            document.getElementById("course-status").textContent = "Course id is required for deactivate.";
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
            document.getElementById("course-status").textContent = "Course id is required.";
            return;
        }
        const isActive = document.getElementById("course-active-select").value === "true";
        const r = await setCourseActive(id, isActive);
        document.getElementById("course-status").textContent = r.ok ? "Course active flag updated." : (r.message || "Failed");
        if (r.ok) renderCourses();
    });

    document.getElementById("btn-enr-load").addEventListener("click", loadEnrollmentsByCourseUi);

    renderCourseRequests("Pending");
    renderMessages({ uncategorizedOnly: true, page: 1, pageSize: 50 });
    renderCourses();
})();
