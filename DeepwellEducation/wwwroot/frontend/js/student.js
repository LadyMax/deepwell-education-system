(function () {
    if (!localStorage.getItem("token")) {
        window.location.href = "./login.html";
        return;
    }

    // Learner account page: staff should use the staff dashboard only.
    if (typeof isStaffAdminAccount === "function" && isStaffAdminAccount()) {
        window.location.href = "./admin.html";
        return;
    }

    let enrollmentRows = [];
    const leaveRequestIdKey = "deepwell_last_leave_request_id";

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

    let lastLeaveRequestId = readStoredLeaveRequestId();

    function messageTopicHuman(v) {
        if (v === 0 || v === "CourseInquiry") return "Course inquiry";
        if (v === 1 || v === "Complaint") return "Complaint";
        if (v === 2 || v === "Feedback") return "Feedback";
        if (v === 3 || v === "Other") return "Other";
        return "—";
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

    function requestStatusBadgeClass(s) {
        if (s === 0 || s === "Pending") return "badge-warning text-dark";
        if (s === 1 || s === "Approved") return "badge-success";
        if (s === 2 || s === "Rejected") return "badge-danger";
        return "badge-secondary";
    }

    function courseLevelDisplay(v) {
        if (v === 0 || v === "0" || v === "Beginner") return "Beginner";
        if (v === 1 || v === "1" || v === "Intermediate") return "Intermediate";
        if (v === 2 || v === "2" || v === "Advanced") return "Advanced";
        return String(v);
    }

    function renderRequestDetailCard(d) {
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
    }

    function hideRequestDetailCard() {
        document.getElementById("request-detail-card").classList.add("d-none");
    }

    function roleLabel(role) {
        if (role === 2 || role === "Admin") return "Admin";
        if (role === 1 || role === "Student") return "Student";
        return "Visitor";
    }

    function toDateInputValue(v) {
        if (!v) return "";
        const s = String(v);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const d = new Date(s);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().slice(0, 10);
    }

    function setProfileDetailsUi(showEditor, noteText) {
        const editor = document.getElementById("profile-details-editor");
        const note = document.getElementById("profile-details-note");
        if (editor) editor.classList.toggle("d-none", !showEditor);
        if (note) {
            note.textContent = noteText || "";
            note.classList.toggle("d-none", !noteText);
        }
    }

    function fillStudentProfileForm(p) {
        document.getElementById("profile-first-name").value = pick(p, "firstName", "FirstName") || "";
        document.getElementById("profile-last-name").value = pick(p, "lastName", "LastName") || "";
        document.getElementById("profile-phone").value = pick(p, "phone", "Phone") || "";
        document.getElementById("profile-dob").value = toDateInputValue(pick(p, "dateOfBirth", "DateOfBirth"));
        document.getElementById("profile-address").value = pick(p, "address", "Address") || "";
    }

    async function loadStudentProfileDetails(roleRaw) {
        const isStudent = roleRaw === 1 || roleRaw === "Student";
        if (!isStudent) {
            setProfileDetailsUi(false, "Detailed student profile becomes available after your first approved Join request.");
            return;
        }
        if (typeof getMyStudentProfile !== "function") {
            setProfileDetailsUi(false, "Student profile service is not available.");
            return;
        }
        const r = await getMyStudentProfile();
        if (!r.ok) {
            const msg = r.notFound
                ? "Student profile is not ready yet. Please contact staff if this persists."
                : (r.message || "Could not load student profile.");
            setProfileDetailsUi(false, msg);
            return;
        }
        fillStudentProfileForm(r.data || {});
        setProfileDetailsUi(true, "");
    }

    function showMessagesTabAndSent() {
        if (!window.jQuery || typeof jQuery.fn.tab !== "function") return;
        jQuery("#sc-tab-messages").tab("show");
        window.setTimeout(function () {
            jQuery("#msg-tab-sent").tab("show");
        }, 0);
    }

    async function loadProfile() {
        const me = await getMe();
        document.getElementById("profile-loading").classList.add("d-none");
        if (!me) return;
        document.getElementById("profile-name").textContent = pick(me, "fullName", "FullName") || "—";
        document.getElementById("profile-email").textContent = pick(me, "email", "Email") || "—";
        const sn = pick(me, "studentNumber", "StudentNumber");
        const snRow = document.getElementById("profile-student-number-row");
        const snEl = document.getElementById("profile-student-number");
        if (snRow && snEl) {
            const hasSn = sn != null && String(sn).trim() !== "";
            snEl.textContent = hasSn ? String(sn).trim() : "";
            snRow.classList.toggle("d-none", !hasSn);
        }
        const roleRaw = pick(me, "role", "Role");
        document.getElementById("profile-role").textContent = roleLabel(roleRaw);
        document.getElementById("profile-card").classList.remove("d-none");
        await loadStudentProfileDetails(roleRaw);
    }

    function fillLeaveCourseOptions(list) {
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
    }

    async function loadEnrollments() {
        const list = await getMyEnrollments();
        enrollmentRows = Array.isArray(list) ? list : [];
        document.getElementById("enrollments-loading").classList.add("d-none");
        if (!list || list.length === 0) {
            document.getElementById("enrollments-empty").classList.remove("d-none");
            document.getElementById("enrollments-table").classList.add("d-none");
            document.getElementById("enrollments-table").classList.remove("d-table");
            fillLeaveCourseOptions([]);
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
            tr.innerHTML = "<td>" + pick(row, "courseName", "CourseName") + "</td>" +
                "<td>" + subjectCell + "</td>" +
                "<td>" + courseLevelDisplay(pick(row, "level", "Level")) + "</td>" +
                "<td>" + new Date(pick(row, "enrolledAt", "EnrolledAt")).toLocaleString() + "</td>";
            tbody.appendChild(tr);
        });
        document.getElementById("enrollments-table").classList.remove("d-none");
        document.getElementById("enrollments-table").classList.add("d-table");
        fillLeaveCourseOptions(list);
    }

    async function loadInbox() {
        const page = await getInbox(1, 50);
        document.getElementById("inbox-loading").classList.add("d-none");
        const items = page.items || page.Items || [];
        if (items.length === 0) {
            document.getElementById("inbox-empty").classList.remove("d-none");
            document.getElementById("inbox-table").classList.add("d-none");
            document.getElementById("inbox-table").classList.remove("d-table");
            return;
        }
        document.getElementById("inbox-empty").classList.add("d-none");
        const tbody = document.getElementById("inbox-body");
        tbody.innerHTML = "";
        items.forEach(function (m) {
            const id = pick(m, "id", "Id");
            const tr = document.createElement("tr");
            const readAt = pick(m, "readAt", "ReadAt");
            tr.innerHTML = "<td>" + pick(m, "senderEmail", "SenderEmail") + "</td>" +
                "<td>" + pick(m, "subject", "Subject") + "</td>" +
                "<td>" + new Date(pick(m, "createdAt", "CreatedAt")).toLocaleString() + "</td>" +
                "<td>" + (readAt ? "Yes" : "No") + "</td>" +
                "<td>" + (readAt ? "—" : ('<button type="button" class="btn btn-outline-primary btn-sm mark-read" data-id="' + id + '">Mark read</button>')) + "</td>";
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll(".mark-read").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                const id = btn.getAttribute("data-id");
                const r = await markMessageRead(id);
                if (!r.ok) {
                    alert(r.message || "Failed to mark as read.");
                    return;
                }
                await loadInbox();
            });
        });
        document.getElementById("inbox-table").classList.remove("d-none");
        document.getElementById("inbox-table").classList.add("d-table");
    }

    async function loadSent() {
        const page = await getSent(1, 50);
        document.getElementById("sent-loading").classList.add("d-none");
        const items = page.items || page.Items || [];
        if (!items.length) {
            document.getElementById("sent-empty").classList.remove("d-none");
            document.getElementById("sent-table").classList.add("d-none");
            document.getElementById("sent-table").classList.remove("d-table");
            return;
        }
        document.getElementById("sent-empty").classList.add("d-none");
        const tbody = document.getElementById("sent-body");
        tbody.innerHTML = "";
        items.forEach(function (m) {
            const tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" + pick(m, "receiverEmail", "ReceiverEmail") + "</td>" +
                "<td>" + messageTopicHuman(pick(m, "senderSuggestedCategory", "SenderSuggestedCategory")) + "</td>" +
                "<td>" + pick(m, "subject", "Subject") + "</td>" +
                "<td>" + new Date(pick(m, "createdAt", "CreatedAt")).toLocaleString() + "</td>";
            tbody.appendChild(tr);
        });
        document.getElementById("sent-table").classList.remove("d-none");
        document.getElementById("sent-table").classList.add("d-table");
    }

    function setLeaveRefreshVisible(show) {
        const btn = document.getElementById("btn-refresh-leave-request");
        if (!btn) return;
        btn.classList.toggle("d-none", !show);
    }

    async function refreshLeaveRequestStatus() {
        const statusEl = document.getElementById("request-status");
        if (!lastLeaveRequestId) {
            statusEl.textContent = "";
            return;
        }
        const r = await getCourseRequestById(lastLeaveRequestId);
        if (!r.ok) {
            statusEl.textContent = r.message || "Could not load request status.";
            showAppFlash("student-flash", r.message || "Could not load request status.", "danger", 6000);
            hideRequestDetailCard();
            lastLeaveRequestId = null;
            writeStoredLeaveRequestId(null);
            setLeaveRefreshVisible(false);
            return;
        }
        const d = r.data || {};
        statusEl.textContent =
            typeLabel(pick(d, "type", "Type")) +
            " · " + statusLabel(pick(d, "status", "Status"));
        renderRequestDetailCard(d);
    }

    document.getElementById("btn-leave").addEventListener("click", async function () {
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
            hideRequestDetailCard();
            return;
        }
        const reqId = pick(r.data, "id", "Id");
        lastLeaveRequestId = reqId || null;
        writeStoredLeaveRequestId(lastLeaveRequestId);
        statusEl.textContent = "Leave request submitted.";
        showAppFlash("student-flash", "Leave request submitted.", "success", 4000);
        if (r.data) renderRequestDetailCard(r.data);
        setLeaveRefreshVisible(!!lastLeaveRequestId);
    });

    document.getElementById("btn-refresh-leave-request").addEventListener("click", async function () {
        await refreshLeaveRequestStatus();
    });

    document.getElementById("btn-send").addEventListener("click", async function () {
        const subject = document.getElementById("msg-subject").value.trim();
        const content = document.getElementById("msg-content").value.trim();
        const topicSel = document.getElementById("msg-topic");
        const topic = topicSel ? topicSel.value : "";
        if (!subject || !content) {
            showAppFlash("student-flash", "Subject and message content are required.", "warning", 4500);
            return;
        }
        try {
            await sendMessage(subject, content, null, topic || undefined);
            showAppFlash("student-flash", "Message sent.", "success", 3500);
            document.getElementById("msg-subject").value = "";
            document.getElementById("msg-content").value = "";
            if (topicSel) topicSel.value = "";
            await loadInbox();
            await loadSent();
            showMessagesTabAndSent();
        } catch (err) {
            showAppFlash("student-flash", err.message || "Failed to send message.", "danger", 6000);
        }
    });

    document.getElementById("btn-save-profile-details").addEventListener("click", async function () {
        const btn = document.getElementById("btn-save-profile-details");
        const payload = {
            firstName: document.getElementById("profile-first-name").value.trim(),
            lastName: document.getElementById("profile-last-name").value.trim(),
            phone: document.getElementById("profile-phone").value.trim(),
            dateOfBirth: document.getElementById("profile-dob").value || null,
            address: document.getElementById("profile-address").value.trim()
        };
        btn.disabled = true;
        const r = await updateMyStudentProfile(payload);
        btn.disabled = false;
        if (!r.ok) {
            showAppFlash("student-flash", r.message || "Failed to save student profile.", "danger", 6000);
            return;
        }
        fillStudentProfileForm(r.data || payload);
        showAppFlash("student-flash", "Student profile saved.", "success", 3500);
    });

    if (lastLeaveRequestId) {
        setLeaveRefreshVisible(true);
        refreshLeaveRequestStatus();
    }

    loadProfile();
    loadEnrollments();
    loadInbox();
    loadSent();
})();
