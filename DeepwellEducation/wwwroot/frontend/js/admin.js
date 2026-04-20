(function () {
    if (!localStorage.getItem("token")) {
        window.location.href = "./login.html";
        return;
    }

    var S = window.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load it before admin.js).");
        return;
    }
    var P = window.DeepwellPasswordUi;
    if (!P) {
        console.error("Missing shared-password-ui.js (load it after api.js, before admin.js).");
        return;
    }

    var A = window.DeepwellAdmin;
    if (
        !A ||
        typeof A.staffForbiddenNote !== "function" ||
        typeof A.renderCourseRequests !== "function" ||
        typeof A.renderMessages !== "function" ||
        typeof A.renderCourses !== "function"
    ) {
        console.error(
            "Missing admin module scripts (load admin-common.js through admin-messages.js before admin.js)."
        );
        return;
    }

    var typeLabel = S.courseRequestTypeLabel;
    var statusLabel = S.courseRequestStatusLabel;

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
        if (paneId === "users") {
            void A.renderAdminUserDirectory(true);
        }
    }

    document.getElementById("btn-load-pending").addEventListener("click", function () {
        document.getElementById("cr-filter-status").value = "Pending";
        A.renderCourseRequests(A.readCourseRequestFilters());
    });
    document.getElementById("btn-load-all").addEventListener("click", function () {
        A.resetCourseRequestFilters();
        A.renderCourseRequests(A.readCourseRequestFilters());
    });
    document.getElementById("btn-cr-apply-filters").addEventListener("click", function () {
        A.renderCourseRequests(A.readCourseRequestFilters());
    });
    document.getElementById("btn-cr-reset-filters").addEventListener("click", function () {
        A.resetCourseRequestFilters();
        A.renderCourseRequests(A.readCourseRequestFilters());
    });
    document.getElementById("cr-filter-applicant").addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        A.renderCourseRequests(A.readCourseRequestFilters());
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
            "Detail · Type: " +
            typeLabel(pick(d, "type", "Type")) +
            " · Status: " +
            statusLabel(pick(d, "status", "Status"));
    });

    document.getElementById("btn-load-msg-all").addEventListener("click", function () {
        document.getElementById("msg-final-filter").value = "";
        A.renderMessages({ page: 1, pageSize: 50 });
    });
    document.getElementById("btn-load-msg-new").addEventListener("click", function () {
        document.getElementById("msg-final-filter").value = "";
        A.renderMessages({ unreadOnly: true, page: 1, pageSize: 50 });
    });
    document.getElementById("btn-load-msg-uncat").addEventListener("click", function () {
        document.getElementById("msg-final-filter").value = "";
        A.renderMessages({ uncategorizedOnly: true, page: 1, pageSize: 50 });
    });
    document.getElementById("msg-final-filter").addEventListener("change", function () {
        var v = this.value;
        if (v === "") {
            A.renderMessages({ page: 1, pageSize: 50 });
        } else {
            A.renderMessages({ finalCategory: Number(v), page: 1, pageSize: 50 });
        }
    });

    document.getElementById("course-level").addEventListener("change", A.syncCourseLevelConfirmButton);
    document
        .getElementById("course-active-select")
        .addEventListener("change", A.syncCourseVisibilityConfirmButton);

    document.getElementById("btn-course-apply-level").addEventListener("click", function () {
        document.getElementById("btn-course-update").click();
    });

    document.getElementById("btn-course-load").addEventListener("click", A.renderCourses);
    document.getElementById("btn-course-create").addEventListener("click", async function () {
        const r = await createCourse(A.coursePayloadFromForm());
        document.getElementById("course-status").textContent = r.ok ? "Course created." : r.message || "Failed";
        if (r.ok) A.renderCourses();
    });
    document.getElementById("btn-course-update").addEventListener("click", async function () {
        const id = document.getElementById("course-id").value.trim();
        if (!id) {
            document.getElementById("course-status").textContent = "Select a course in the table above first.";
            return;
        }
        const r = await updateCourse(id, A.coursePayloadFromForm());
        document.getElementById("course-status").textContent = r.ok ? "Course updated." : r.message || "Failed";
        if (r.ok) A.renderCourses();
    });
    document.getElementById("btn-course-delete").addEventListener("click", async function () {
        const id = document.getElementById("course-id").value.trim();
        if (!id) {
            document.getElementById("course-status").textContent = "Select a course in the table above first.";
            return;
        }
        if (!confirm("Deactivate this course?")) return;
        const r = await deleteCourse(id);
        document.getElementById("course-status").textContent = r.ok ? "Course deactivated." : r.message || "Failed";
        if (r.ok) A.renderCourses();
    });
    document.getElementById("btn-course-set-active").addEventListener("click", async function () {
        const id = document.getElementById("course-id").value.trim();
        if (!id) {
            document.getElementById("course-status").textContent = "Select a course in the table above first.";
            return;
        }
        const isActive = document.getElementById("course-active-select").value === "true";
        const r = await setCourseActive(id, isActive);
        document.getElementById("course-status").textContent = r.ok ? "Visibility updated." : r.message || "Failed";
        if (r.ok) A.renderCourses();
    });

    document.getElementById("btn-enr-load").addEventListener("click", A.loadEnrollmentsByCourseUi);

    var btnUsersSearch = document.getElementById("btn-admin-users-search");
    if (btnUsersSearch) {
        btnUsersSearch.addEventListener("click", function () {
            void A.renderAdminUserDirectory(true);
        });
    }
    var btnUsersReset = document.getElementById("btn-admin-users-reset");
    if (btnUsersReset) {
        btnUsersReset.addEventListener("click", function () {
            var iq = document.getElementById("admin-users-q");
            var ir = document.getElementById("admin-users-role");
            var iz = document.getElementById("admin-users-page-size");
            if (iq) iq.value = "";
            if (ir) ir.value = "";
            if (iz) iz.value = "20";
            A.adminUserDirectoryState.page = 1;
            void A.renderAdminUserDirectory(true);
        });
    }
    var btnUsersPrev = document.getElementById("btn-admin-users-prev");
    if (btnUsersPrev) {
        btnUsersPrev.addEventListener("click", async function () {
            if (A.adminUserDirectoryState.page <= 1) return;
            A.adminUserDirectoryState.page--;
            await A.renderAdminUserDirectory(false);
        });
    }
    var btnUsersNext = document.getElementById("btn-admin-users-next");
    if (btnUsersNext) {
        btnUsersNext.addEventListener("click", async function () {
            A.adminUserDirectoryState.page++;
            await A.renderAdminUserDirectory(false);
        });
    }
    var adminUsersQ = document.getElementById("admin-users-q");
    if (adminUsersQ) {
        adminUsersQ.addEventListener("keydown", function (e) {
            if (e.key !== "Enter") return;
            e.preventDefault();
            void A.renderAdminUserDirectory(true);
        });
    }

    document.getElementById("btn-course-clear-selection").addEventListener("click", function () {
        A.clearCourseSelection();
    });
    document.querySelectorAll("[data-admin-pane-btn]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            showAdminPane(btn.getAttribute("data-admin-pane-btn") || "requests");
        });
    });

    P.bindPasswordToggles(document);
    var adminNewPw = document.getElementById("admin-new-password");
    if (adminNewPw) {
        adminNewPw.addEventListener("input", updateAdminPasswordChecklist);
        adminNewPw.addEventListener("change", updateAdminPasswordChecklist);
    }
    P.wireChangePasswordButton({
        currentId: "admin-current-password",
        nextId: "admin-new-password",
        confirmId: "admin-confirm-password",
        submitId: "btn-admin-change-password",
        flash: showAdminPasswordFlash,
        onSuccess: function () {
            updateAdminPasswordChecklist();
            showAdminPasswordFlash("Password updated.", "success");
            showAppFlash("admin-flash", "Password updated successfully.", "success", 5000);
            if (typeof window.deepwellRefreshAuthNav === "function") {
                window.deepwellRefreshAuthNav();
            }
        }
    });

    var adminMsgTable = document.getElementById("msg-table");
    if (adminMsgTable) {
        adminMsgTable.addEventListener("click", function (ev) {
            var btn = ev.target.closest(".admin-msg-sender-profile");
            if (!btn) return;
            var uid = btn.getAttribute("data-user-id");
            if (uid) void A.openAdminUserProfile(uid);
        });
    }

    A.resetCourseRequestFilters();
    document.getElementById("cr-filter-status").value = "Pending";
    A.renderCourseRequests(A.readCourseRequestFilters());
    A.renderMessages({ page: 1, pageSize: 50 });
    A.renderCourses();
    A.refreshAdminInboxUnreadUi(true);
    showAdminPane("requests");
})();
