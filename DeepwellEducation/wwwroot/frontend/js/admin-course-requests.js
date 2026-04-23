(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before admin-course-requests.js).");
        return;
    }

    var typeLabel = S.courseRequestTypeLabel;
    var statusLabel = S.courseRequestStatusLabel;
    var typeClass = S.courseRequestTypeClass;
    var statusClass = S.courseRequestStatusClass;

    var A = (w.DeepwellAdmin = w.DeepwellAdmin || {});
    var setInlineStatus = A.setInlineStatus || function (id, message) {
        var el = document.getElementById(id);
        if (el) el.textContent = message || "";
    };

    A.readCourseRequestFilters = function () {
        return {
            type: document.getElementById("cr-filter-type").value,
            status: document.getElementById("cr-filter-status").value,
            courseId: document.getElementById("cr-filter-course").value,
            applicant: document.getElementById("cr-filter-applicant").value.trim(),
            created: document.getElementById("cr-sort-created").value || "desc"
        };
    };

    A.resetCourseRequestFilters = function () {
        document.getElementById("cr-filter-type").value = "";
        document.getElementById("cr-filter-status").value = "";
        document.getElementById("cr-filter-course").value = "";
        document.getElementById("cr-filter-applicant").value = "";
        document.getElementById("cr-sort-created").value = "desc";
    };

    function courseRequestQueueSummaryText(count, hasAppliedFilter) {
        if (!hasAppliedFilter) {
            if (count === 0) return "No requests";
            if (count === 1) return "1 request";
            return count + " requests";
        }
        if (count === 0) return "No matching requests";
        if (count === 1) return "1 matching request";
        return count + " matching requests";
    }

    function showCourseRequestConfirm(message, title) {
        return new Promise(function (resolve) {
            var modalEl = document.getElementById("admin-confirm-modal");
            var msgEl = document.getElementById("admin-confirm-message");
            var titleEl = document.getElementById("admin-confirm-title");
            var okEl = document.getElementById("admin-confirm-ok");
            if (!modalEl || !msgEl || !titleEl || !okEl || !window.jQuery) {
                resolve(window.confirm(message || "Confirm action?"));
                return;
            }
            msgEl.textContent = message || "Confirm action?";
            titleEl.textContent = title || "Please confirm";
            okEl.onclick = null;
            okEl.onclick = function () {
                window.jQuery(modalEl).modal("hide");
                resolve(true);
            };
            window.jQuery(modalEl).off("hidden.bs.modal.courseRequestConfirm");
            window.jQuery(modalEl).on("hidden.bs.modal.courseRequestConfirm", function () {
                window.jQuery(modalEl).off("hidden.bs.modal.courseRequestConfirm");
                resolve(false);
            });
            window.jQuery(modalEl).modal("show");
        });
    }

    A.renderCourseRequests = async function (filters) {
        const table = document.getElementById("cr-table");
        const tbody = document.getElementById("cr-body");
        const activeFilters = filters || A.readCourseRequestFilters();
        setInlineStatus("cr-status", "Loading…", "info");
        tbody.innerHTML = "";
        table.classList.add("d-none");

        const res = await w.getCourseRequests(activeFilters);
        if (res.forbidden) {
            setInlineStatus("cr-status", A.staffForbiddenNote(), "danger");
            return;
        }
        if (res.error) {
            setInlineStatus("cr-status", res.error, "danger");
            return;
        }
        const items = res.items || [];
        const hasAppliedFilter =
            !!activeFilters.type ||
            !!activeFilters.status ||
            !!activeFilters.courseId ||
            !!activeFilters.applicant;
        var statusVariant = hasAppliedFilter && items.length === 0 ? "warning" : "info";
        setInlineStatus(
            "cr-status",
            courseRequestQueueSummaryText(items.length, hasAppliedFilter),
            statusVariant
        );

        items.forEach(function (row) {
            const id = pick(row, "id", "Id");
            const pending =
                pick(row, "status", "Status") === 0 || pick(row, "status", "Status") === "Pending";
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
                    '<button type="button" class="btn btn-success btn-sm mr-1 cr-approve" data-id="' +
                    id +
                    '">Approve</button>' +
                    '<button type="button" class="btn btn-outline-danger btn-sm cr-reject" data-id="' +
                    id +
                    '">Reject</button>';
            } else {
                actions = "—";
            }

            tr.innerHTML =
                "<td>" +
                (name || "—") +
                '<br><small class="text-muted">' +
                email +
                "</small></td>" +
                "<td>" +
                (sn || "—") +
                "</td>" +
                "<td>" +
                course +
                "</td>" +
                '<td><span class="cr-type ' +
                typeClass(type) +
                '">' +
                typeLabel(type) +
                "</span></td>" +
                '<td><span class="cr-status ' +
                statusClass(status) +
                '">' +
                statusLabel(status) +
                "</span></td>" +
                "<td><small>" +
                created +
                "</small></td>" +
                "<td>" +
                actions +
                "</td>";
            tbody.appendChild(tr);
        });

        if (items.length) table.classList.remove("d-none");

        tbody.querySelectorAll(".cr-approve").forEach(function (btn) {
            btn.addEventListener("click", async function (e) {
                e.stopPropagation();
                const id = btn.getAttribute("data-id");
                const r = await w.reviewCourseRequest(id, true);
                if (!r.ok) {
                    w.showAppFlash("admin-flash", r.message || "Failed to approve.", "danger", 6000);
                    return;
                }
                w.showAppFlash("admin-flash", "Request approved.", "success", 4000);
                await A.renderCourseRequests(activeFilters);
            });
        });
        tbody.querySelectorAll(".cr-reject").forEach(function (btn) {
            btn.addEventListener("click", async function (e) {
                e.stopPropagation();
                const id = btn.getAttribute("data-id");
                var confirmed = await showCourseRequestConfirm("Reject this request?", "Reject request");
                if (!confirmed) return;
                const r = await w.reviewCourseRequest(id, false);
                if (!r.ok) {
                    w.showAppFlash("admin-flash", r.message || "Failed to reject.", "danger", 6000);
                    return;
                }
                w.showAppFlash("admin-flash", "Request rejected.", "warning", 4000);
                await A.renderCourseRequests(activeFilters);
            });
        });
    };
})(typeof window !== "undefined" ? window : this);
