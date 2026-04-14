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

    const usernamePattern = /^[A-Za-z0-9._-]+$/;

    function validateUsernameForChange(raw) {
        const s = (raw || "").trim();
        if (!s) return "Username is required.";
        if (s.length < 3 || s.length > 32) return "Username must be 3–32 characters.";
        if (!usernamePattern.test(s)) return "Username may only contain letters, digits, and . _ -";
        return "";
    }

    function showUsernameFlash(message, variant) {
        const el = document.getElementById("profile-username-flash");
        if (!el) return;
        if (!message) {
            el.classList.add("d-none");
            el.textContent = "";
            return;
        }
        const v = variant || "danger";
        el.textContent = message;
        el.className = "app-flash app-flash--" + v + " mb-2";
        el.classList.remove("d-none");
    }

    function setUsernameEditorVisible(show) {
        const editor = document.getElementById("profile-username-editor");
        const input = document.getElementById("profile-username-input");
        if (!editor) return;
        editor.classList.toggle("d-none", !show);
        if (!show) {
            showUsernameFlash("", "info");
            if (input) input.value = "";
        }
    }

    function applyUsernameToUi(name) {
        const disp = document.getElementById("profile-username-display");
        if (disp) disp.textContent = name && String(name).trim() ? String(name).trim() : "—";
    }

    function bindPasswordToggles(root) {
        const scope = root || document;
        scope.querySelectorAll("[data-password-toggle]").forEach(function (btn) {
            if (btn.dataset.boundPwd === "1") return;
            btn.dataset.boundPwd = "1";
            btn.addEventListener("click", function () {
                const id = btn.getAttribute("data-password-toggle");
                const input = document.getElementById(id);
                if (!input) return;
                const show = input.type === "password";
                input.type = show ? "text" : "password";
                btn.setAttribute("aria-pressed", show ? "true" : "false");
                const icon = btn.querySelector("i");
                if (icon) icon.className = show ? "fa fa-eye-slash" : "fa fa-eye";
            });
        });
    }

    function updateStudentPasswordChecklist() {
        if (typeof evaluatePasswordRules !== "function") return;
        const p = document.getElementById("student-new-password");
        const pwd = p ? p.value : "";
        const r = evaluatePasswordRules(pwd);
        function setOk(id, ok) {
            const el = document.getElementById(id);
            if (!el) return;
            el.className = ok ? "ok" : "bad";
        }
        setOk("student-pw-rule-len", r.minLen);
        setOk("student-pw-rule-upper", r.upper);
        setOk("student-pw-rule-lower", r.lower);
        setOk("student-pw-rule-digit", r.digit);
        setOk("student-pw-rule-special", r.special);
    }

    function showPasswordChangeFlash(message, variant) {
        const el = document.getElementById("password-change-flash");
        if (!el) return;
        if (!message) {
            el.classList.add("d-none");
            el.textContent = "";
            return;
        }
        const v = variant || "danger";
        el.textContent = message;
        el.className = "app-flash app-flash--" + v + " mb-3";
        el.classList.remove("d-none");
    }

    function initStudentPasswordCollapse() {
        if (!window.jQuery) return;
        jQuery("#collapse-password-settings").on(
            "show.bs.collapse shown.bs.collapse hide.bs.collapse hidden.bs.collapse",
            function (e) {
                const chev = document.getElementById("student-password-chevron");
                if (!chev) return;
                if (e.type === "show" || e.type === "shown") {
                    chev.className = "fa fa-chevron-up small text-muted";
                } else if (e.type === "hide" || e.type === "hidden") {
                    chev.className = "fa fa-chevron-down small text-muted";
                }
            }
        );
    }

    function initStudentProfileDetailsCollapse() {
        if (!window.jQuery) return;
        jQuery("#collapse-profile-details").on(
            "show.bs.collapse shown.bs.collapse hide.bs.collapse hidden.bs.collapse",
            function (e) {
                const chev = document.getElementById("student-profile-details-chevron");
                if (!chev) return;
                if (e.type === "show" || e.type === "shown") {
                    chev.className = "fa fa-chevron-up small text-muted";
                } else if (e.type === "hide" || e.type === "hidden") {
                    chev.className = "fa fa-chevron-down small text-muted";
                }
            }
        );
    }

    function setProfileDetailsSectionVisible(showSection, noteText) {
        const section = document.getElementById("profile-details-section");
        const note = document.getElementById("profile-details-note");
        if (section) section.classList.toggle("d-none", !showSection);
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
            setProfileDetailsSectionVisible(false, "");
            return;
        }
        if (typeof getMyStudentProfile !== "function") {
            setProfileDetailsSectionVisible(false, "Student profile service is not available.");
            return;
        }
        const r = await getMyStudentProfile();
        if (!r.ok) {
            const msg = r.notFound
                ? "Student profile is not ready yet. Please contact staff if this persists."
                : (r.message || "Could not load student profile.");
            setProfileDetailsSectionVisible(false, msg);
            return;
        }
        fillStudentProfileForm(r.data || {});
        setProfileDetailsSectionVisible(true, "");
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
        applyUsernameToUi(pick(me, "fullName", "FullName"));
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

    document.getElementById("btn-toggle-username-inline").addEventListener("click", function () {
        const editor = document.getElementById("profile-username-editor");
        const open = editor && !editor.classList.contains("d-none");
        if (open) {
            setUsernameEditorVisible(false);
            return;
        }
        setUsernameEditorVisible(true);
        const input = document.getElementById("profile-username-input");
        const current = document.getElementById("profile-username-display");
        if (input && current && current.textContent && current.textContent !== "—") {
            input.value = current.textContent.trim();
        }
        if (input) input.focus();
    });

    document.getElementById("btn-cancel-username").addEventListener("click", function () {
        setUsernameEditorVisible(false);
    });

    document.getElementById("btn-save-username").addEventListener("click", async function () {
        const btn = document.getElementById("btn-save-username");
        const input = document.getElementById("profile-username-input");
        const next = input ? input.value : "";
        const err = validateUsernameForChange(next);
        if (err) {
            showUsernameFlash(err, "danger");
            return;
        }
        const currentEl = document.getElementById("profile-username-display");
        const current = currentEl && currentEl.textContent !== "—" ? currentEl.textContent.trim() : "";
        if (current && current.toLowerCase() === next.trim().toLowerCase()) {
            showUsernameFlash("That is already your username.", "info");
            return;
        }
        if (typeof changeMyUsername !== "function") {
            showUsernameFlash("Username update is not available.", "danger");
            return;
        }
        btn.disabled = true;
        const r = await changeMyUsername(next);
        btn.disabled = false;
        if (!r.ok) {
            showUsernameFlash(r.message || "Could not update username.", "danger");
            return;
        }
        const updated = pick(r.data, "fullName", "FullName");
        applyUsernameToUi(updated);
        setUsernameEditorVisible(false);
        showAppFlash("student-flash", "Username updated.", "success", 3500);
        if (typeof window.deepwellRefreshAuthNav === "function") {
            window.deepwellRefreshAuthNav();
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

    bindPasswordToggles(document);
    initStudentPasswordCollapse();
    initStudentProfileDetailsCollapse();
    const studentNewPw = document.getElementById("student-new-password");
    if (studentNewPw) {
        studentNewPw.addEventListener("input", updateStudentPasswordChecklist);
        studentNewPw.addEventListener("change", updateStudentPasswordChecklist);
    }

    document.getElementById("btn-student-change-password").addEventListener("click", async function () {
        const cur = document.getElementById("student-current-password").value.trim();
        const next = document.getElementById("student-new-password").value.trim();
        const conf = document.getElementById("student-confirm-password").value.trim();
        showPasswordChangeFlash("", "info");
        if (!cur) {
            showPasswordChangeFlash("Enter your current password.", "warning");
            return;
        }
        if (!next || !conf) {
            if (typeof verifyCurrentPassword !== "function") {
                showPasswordChangeFlash("Enter your new password.", "warning");
                return;
            }
            const btnVerify = document.getElementById("btn-student-change-password");
            btnVerify.disabled = true;
            const vr = await verifyCurrentPassword(cur);
            btnVerify.disabled = false;
            if (!vr.ok) {
                showPasswordChangeFlash(vr.message || "Current password is incorrect.", "danger");
                return;
            }
            if (!next) {
                showPasswordChangeFlash("Enter your new password.", "warning");
                return;
            }
            const perrPartial =
                typeof validatePasswordPolicy === "function" ? validatePasswordPolicy(next) : "";
            if (perrPartial) {
                showPasswordChangeFlash(perrPartial, "warning");
                return;
            }
            if (!conf) {
                showPasswordChangeFlash("Enter your new password again to confirm.", "warning");
                return;
            }
        }
        if (next !== conf) {
            showPasswordChangeFlash("New password and confirmation do not match.", "warning");
            return;
        }
        const perr = typeof validatePasswordPolicy === "function" ? validatePasswordPolicy(next) : "";
        if (perr) {
            showPasswordChangeFlash(perr, "warning");
            return;
        }
        if (typeof changeMyPassword !== "function") {
            showPasswordChangeFlash("Password update is not available.", "danger");
            return;
        }
        const btn = document.getElementById("btn-student-change-password");
        btn.disabled = true;
        const r = await changeMyPassword(cur, next);
        btn.disabled = false;
        if (!r.ok) {
            showPasswordChangeFlash(r.message || "Could not change password.", "danger");
            return;
        }
        document.getElementById("student-current-password").value = "";
        document.getElementById("student-new-password").value = "";
        document.getElementById("student-confirm-password").value = "";
        updateStudentPasswordChecklist();
        showPasswordChangeFlash("Your password has been updated.", "success");
        showAppFlash("student-flash", "Your password has been updated.", "success", 5000);
        if (typeof window.deepwellRefreshAuthNav === "function") {
            window.deepwellRefreshAuthNav();
        }
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
