(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before admin-users.js).");
        return;
    }

    var escapeHtml = S.escapeHtml;
    var A = (w.DeepwellAdmin = w.DeepwellAdmin || {});
    var setInlineStatus = A.setInlineStatus || function (id, message) {
        var el = document.getElementById(id);
        if (el) el.textContent = message || "";
    };

    A.roleHuman = function (r) {
        if (r === 0 || r === "Visitor") return "Visitor";
        if (r === 1 || r === "Student") return "Student";
        if (r === 2 || r === "Admin") return "Administrator";
        return String(r);
    };

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
        var role = A.roleHuman(pick(d, "role", "Role"));
        var active = pick(d, "isActive", "IsActive");
        var created = formatAdminDateTime(pick(d, "createdAt", "CreatedAt"));
        var sp = d.studentProfile != null ? d.studentProfile : d.StudentProfile;
        var profileHtml = "";
        if (sp) {
            var fn = pick(sp, "firstName", "FirstName") || "";
            var ln = pick(sp, "lastName", "LastName") || "";
            var sn = pick(sp, "studentNumber", "StudentNumber") || "—";
            var phone = pick(sp, "phone", "Phone") || "—";
            var city = pick(sp, "city", "City") || "—";
            var addr = pick(sp, "address", "Address") || "—";
            var dob = pick(sp, "dateOfBirth", "DateOfBirth");
            var dobStr = dob ? formatAdminDateOnly(dob) : "—";
            profileHtml =
                '<h6 class="text-muted text-uppercase small mt-3 mb-2">Student details</h6>' +
                '<dl class="row small mb-0">' +
                '<dt class="col-sm-4">Student number</dt><dd class="col-sm-8">' +
                escapeHtml(sn) +
                "</dd>" +
                '<dt class="col-sm-4">Name</dt><dd class="col-sm-8">' +
                escapeHtml((fn + " " + ln).trim() || "—") +
                "</dd>" +
                '<dt class="col-sm-4">Phone</dt><dd class="col-sm-8">' +
                escapeHtml(phone) +
                "</dd>" +
                '<dt class="col-sm-4">Date of birth</dt><dd class="col-sm-8">' +
                escapeHtml(dobStr) +
                "</dd>" +
                '<dt class="col-sm-4">City</dt><dd class="col-sm-8">' +
                escapeHtml(city) +
                "</dd>" +
                '<dt class="col-sm-4">Street address</dt><dd class="col-sm-8">' +
                escapeHtml(addr) +
                "</dd>" +
                "</dl>";
        } else {
            profileHtml = '<p class="text-muted small mt-3 mb-0">No student profile</p>';
        }
        return (
            '<dl class="row small mb-0">' +
            '<dt class="col-sm-4">Username</dt><dd class="col-sm-8">' +
            escapeHtml(userName) +
            "</dd>" +
            '<dt class="col-sm-4">Email</dt><dd class="col-sm-8">' +
            escapeHtml(email) +
            "</dd>" +
            '<dt class="col-sm-4">Account type</dt><dd class="col-sm-8">' +
            escapeHtml(role) +
            "</dd>" +
            '<dt class="col-sm-4">Status</dt><dd class="col-sm-8">' +
            (active ? "Active" : "Disabled") +
            "</dd>" +
            '<dt class="col-sm-4">Joined</dt><dd class="col-sm-8">' +
            escapeHtml(created) +
            "</dd>" +
            "</dl>" +
            profileHtml
        );
    }

    A.openAdminUserProfile = async function (userId) {
        if (!userId || typeof w.$ === "undefined") return;
        var $ = w.$;
        var $m = $("#admin-user-detail-modal");
        $("#admin-user-detail-body").html('<p class="text-muted small mb-0">Loading…</p>');
        $("#admin-user-detail-title").text("User profile");
        $m.modal("show");
        if (typeof w.getAdminUserDetail !== "function") {
            $("#admin-user-detail-body").html(
                '<p class="text-danger small mb-0">Could not load. Try refreshing the page.</p>'
            );
            return;
        }
        var r = await w.getAdminUserDetail(userId);
        if (r.forbidden) {
            $("#admin-user-detail-body").html(
                '<p class="text-danger small mb-0">You do not have permission to open this account.</p>'
            );
            return;
        }
        if (r.notFound) {
            $("#admin-user-detail-body").html('<p class="text-muted small mb-0">Account could not be found.</p>');
            return;
        }
        if (r.error || !r.ok) {
            $("#admin-user-detail-body").html(
                '<p class="text-danger small mb-0">' +
                    escapeHtml(String(r.error || "Could not load profile.")) +
                    "</p>"
            );
            return;
        }
        var d = r.data;
        var titleName = (pick(d, "userName", "UserName") || "").trim();
        $("#admin-user-detail-title").text(titleName ? "Profile: " + titleName : "User profile");
        $("#admin-user-detail-body").html(renderAdminUserDetailHtml(d));
    };

    A.adminUserDirectoryState = { page: 1 };

    A.readAdminUserDirectoryFilters = function () {
        return {
            q: document.getElementById("admin-users-q").value.trim(),
            role: document.getElementById("admin-users-role").value,
            pageSize: Number(document.getElementById("admin-users-page-size").value) || 20
        };
    };

    A.renderAdminUserDirectory = async function (resetPage) {
        var statusEl = document.getElementById("admin-users-status");
        var table = document.getElementById("admin-users-table");
        var tbody = document.getElementById("admin-users-body");
        var pager = document.getElementById("admin-users-pager");
        var btnPrev = document.getElementById("btn-admin-users-prev");
        var btnNext = document.getElementById("btn-admin-users-next");
        var pageInfo = document.getElementById("admin-users-page-info");
        if (!statusEl || !table || !tbody) return;
        if (resetPage) A.adminUserDirectoryState.page = 1;
        setInlineStatus("admin-users-status", "Loading…", "info");
        tbody.innerHTML = "";
        table.classList.add("d-none");
        if (pager) pager.classList.add("d-none");

        var f = A.readAdminUserDirectoryFilters();
        if (typeof w.getAdminUsersList !== "function") {
            setInlineStatus("admin-users-status", "This list is not available. Try refreshing the page.", "danger");
            return;
        }
        var res = await w.getAdminUsersList({
            q: f.q,
            role: f.role,
            page: A.adminUserDirectoryState.page,
            pageSize: f.pageSize
        });
        if (res.forbidden) {
            setInlineStatus("admin-users-status", A.staffForbiddenNote(), "danger");
            return;
        }
        if (res.error) {
            setInlineStatus("admin-users-status", res.error, "danger");
            return;
        }
        var items = res.items || [];
        var total = res.totalCount || 0;
        var page = res.page || 1;
        var pageSize = res.pageSize || 20;
        var totalPages = res.totalPages || (pageSize > 0 ? Math.ceil(total / pageSize) : 0);
        var tp = Math.max(1, totalPages || 1);
        setInlineStatus(
            "admin-users-status",
            total === 0
                ? "No accounts match"
                : total + " " + (total === 1 ? "person" : "people") + " found · page " + page + " of " + tp,
            "info"
        );

        items.forEach(function (u) {
            var id = pick(u, "id", "Id");
            var email = pick(u, "email", "Email");
            var userName = pick(u, "userName", "UserName");
            var role = pick(u, "role", "Role");
            var active = !!(pick(u, "isActive", "IsActive"));
            var sn = pick(u, "studentNumber", "StudentNumber");
            var created = pick(u, "createdAt", "CreatedAt");
            var createdStr = created
                ? new Date(created).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                  })
                : "—";
            var tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" +
                escapeHtml(String(email)) +
                "</td>" +
                "<td>" +
                escapeHtml(String(userName)) +
                "</td>" +
                "<td>" +
                escapeHtml(A.roleHuman(role)) +
                "</td>" +
                "<td>" +
                escapeHtml(sn ? String(sn) : "—") +
                "</td>" +
                "<td>" +
                (active ? "Yes" : '<span class="text-muted">No</span>') +
                "</td>" +
                "<td>" +
                escapeHtml(createdStr) +
                "</td>" +
                '<td><button type="button" class="btn btn-link btn-sm p-0 admin-users-open-profile" data-user-id="' +
                escapeHtml(String(id)) +
                '">View</button></td>';
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll(".admin-users-open-profile").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var uid = btn.getAttribute("data-user-id");
                if (uid) {
                    A._resumeRosterAfterProfileClose = false;
                    void A.openAdminUserProfile(uid);
                }
            });
        });

        if (items.length) table.classList.remove("d-none");
        if (pager) {
            pager.classList.remove("d-none");
            btnPrev.disabled = page <= 1;
            btnNext.disabled = page >= tp || total === 0;
            pageInfo.textContent = total > 0 ? "Page " + page + " of " + tp : "";
        }
    };
})(typeof window !== "undefined" ? window : this);
