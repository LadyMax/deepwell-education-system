(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before student-enrollments.js).");
        return;
    }

    var typeLabel = S.courseRequestTypeLabel;
    var statusLabel = S.courseRequestStatusLabel;
    var courseLevelDisplay = S.courseLevelLabel;
    var St = (w.DeepwellStudent = w.DeepwellStudent || {});

    var leaveRequestIdKey = "deepwell_last_leave_request_id";

    function readStoredLeaveRequestId() {
        try {
            return sessionStorage.getItem(leaveRequestIdKey) || null;
        } catch {
            return null;
        }
    }

    function writeStoredLeaveRequestId(id) {
        try {
            if (id) sessionStorage.setItem(leaveRequestIdKey, id);
            else sessionStorage.removeItem(leaveRequestIdKey);
        } catch (_) {}
    }

    St.lastLeaveRequestId = readStoredLeaveRequestId();
    St.enrollmentRows = [];

    function requestStatusBadgeClass(s) {
        if (s === 0 || s === "Pending") return "badge-warning text-dark";
        if (s === 1 || s === "Approved") return "badge-success";
        if (s === 2 || s === "Rejected") return "badge-danger";
        return "badge-secondary";
    }

    St.renderRequestDetailCard = function (d) {
        const card = document.getElementById("request-detail-card");
        const typ = typeLabel(pick(d, "type", "Type"));
        const headingEl = document.getElementById("req-detail-heading");
        if (headingEl) {
            headingEl.textContent = typ === "Leave" || typ === "Join" ? typ + " request" : "Course request";
        }
        document.getElementById("req-detail-type").textContent = typ;
        const sEl = document.getElementById("req-detail-status");
        const st = pick(d, "status", "Status");
        sEl.textContent = statusLabel(st);
        sEl.className = "badge " + requestStatusBadgeClass(st);
        card.classList.remove("d-none");
    };

    St.hideRequestDetailCard = function () {
        document.getElementById("request-detail-card").classList.add("d-none");
    };

    St.fillLeaveCourseOptions = function (list) {
        const sel = document.getElementById("leave-course");
        sel.innerHTML = '<option value="">Select a course</option>';
        (list || []).forEach(function (row) {
            const courseId = pick(row, "courseId", "CourseId");
            const courseName = pick(row, "courseName", "CourseName");
            const opt = document.createElement("option");
            opt.value = courseId;
            opt.textContent = courseName;
            sel.appendChild(opt);
        });
    };

    St.loadEnrollments = async function () {
        const list = await getMyEnrollments();
        St.enrollmentRows = Array.isArray(list) ? list : [];
        document.getElementById("enrollments-loading").classList.add("d-none");
        if (!list || list.length === 0) {
            document.getElementById("enrollments-empty").classList.remove("d-none");
            document.getElementById("enrollments-table").classList.add("d-none");
            document.getElementById("enrollments-table").classList.remove("d-table");
            St.fillLeaveCourseOptions([]);
            return;
        }
        document.getElementById("enrollments-empty").classList.add("d-none");
        const tbody = document.getElementById("enrollments-body");
        tbody.innerHTML = "";
        list.forEach(function (row) {
            const tr = document.createElement("tr");
            const subjName = pick(row, "languageName", "LanguageName") || pick(row, "subjectName", "SubjectName");
            const subjCode = pick(row, "languageCode", "LanguageCode") || pick(row, "subjectCode", "SubjectCode");
            let subjectCell = subjName || "";
            if (subjName && subjCode) subjectCell = subjName + " (" + subjCode + ")";
            else if (!subjName && subjCode) subjectCell = subjCode;
            tr.innerHTML =
                "<td>" +
                pick(row, "courseName", "CourseName") +
                "</td>" +
                "<td>" +
                subjectCell +
                "</td>" +
                "<td>" +
                courseLevelDisplay(pick(row, "level", "Level")) +
                "</td>" +
                "<td>" +
                new Date(pick(row, "enrolledAt", "EnrolledAt")).toLocaleString() +
                "</td>";
            tbody.appendChild(tr);
        });
        document.getElementById("enrollments-table").classList.remove("d-none");
        document.getElementById("enrollments-table").classList.add("d-table");
        St.fillLeaveCourseOptions(list);
    };

    St.setLeaveRefreshVisible = function (show) {
        const btn = document.getElementById("btn-refresh-leave-request");
        if (!btn) return;
        btn.classList.toggle("d-none", !show);
    };

    St.refreshLeaveRequestStatus = async function () {
        const statusEl = document.getElementById("request-status");
        if (!St.lastLeaveRequestId) {
            statusEl.textContent = "";
            return;
        }
        const r = await getCourseRequestById(St.lastLeaveRequestId);
        if (!r.ok) {
            statusEl.textContent = r.message || "Could not load request status.";
            showAppFlash("student-flash", r.message || "Could not load request status.", "danger", 6000);
            St.hideRequestDetailCard();
            St.lastLeaveRequestId = null;
            writeStoredLeaveRequestId(null);
            St.setLeaveRefreshVisible(false);
            return;
        }
        const d = r.data || {};
        statusEl.textContent =
            typeLabel(pick(d, "type", "Type")) + " · " + statusLabel(pick(d, "status", "Status"));
        St.renderRequestDetailCard(d);
    };

    St.onLeaveSubmit = async function () {
        const courseId = document.getElementById("leave-course").value;
        const statusEl = document.getElementById("request-status");
        if (!courseId) {
            statusEl.textContent = "Please select a course first.";
            showAppFlash("student-flash", "Select an enrolled course before submitting a leave request.", "warning", 4500);
            return;
        }
        const r = await submitLeaveRequest(courseId);
        if (!r.ok) {
            statusEl.textContent = r.message || "Failed to submit leave request.";
            showAppFlash("student-flash", r.message || "Failed to submit leave request.", "danger", 6000);
            St.hideRequestDetailCard();
            return;
        }
        const reqId = pick(r.data, "id", "Id");
        St.lastLeaveRequestId = reqId || null;
        writeStoredLeaveRequestId(St.lastLeaveRequestId);
        statusEl.textContent = "Leave request submitted.";
        showAppFlash("student-flash", "Leave request submitted.", "success", 4000);
        if (r.data) St.renderRequestDetailCard(r.data);
        St.setLeaveRefreshVisible(!!St.lastLeaveRequestId);
    };
})(typeof window !== "undefined" ? window : this);
