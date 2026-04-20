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

    A.renderCourseRequests = async function (filters) {
        const el = document.getElementById("cr-status");
        const table = document.getElementById("cr-table");
        const tbody = document.getElementById("cr-body");
        const activeFilters = filters || A.readCourseRequestFilters();
        el.textContent = "Loading…";
        tbody.innerHTML = "";
        table.classList.add("d-none");

        const res = await w.getCourseRequests(activeFilters);
        if (res.forbidden) {
            el.textContent = A.staffForbiddenNote();
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
                if (!confirm("Reject this request?")) return;
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
