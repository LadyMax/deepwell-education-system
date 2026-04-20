(function () {
    "use strict";

    if (!localStorage.getItem("token")) {
        window.location.href = "./login.html";
        return;
    }

    if (typeof isStaffAdminAccount === "function" && isStaffAdminAccount()) {
        window.location.href = "./admin.html";
        return;
    }

    var S = window.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load it before student.js).");
        return;
    }
    var P = window.DeepwellPasswordUi;
    if (!P) {
        console.error("Missing shared-password-ui.js (load it after api.js, before student.js).");
        return;
    }

    var St = window.DeepwellStudent;
    if (
        !St ||
        typeof St.loadProfile !== "function" ||
        typeof St.loadEnrollments !== "function" ||
        typeof St.loadInbox !== "function" ||
        typeof St.loadSent !== "function" ||
        typeof St.refreshStudentInboxUnreadUi !== "function" ||
        typeof St.onLeaveSubmit !== "function" ||
        typeof St.refreshLeaveRequestStatus !== "function" ||
        typeof St.setLeaveRefreshVisible !== "function" ||
        typeof St.onSendMessageClick !== "function" ||
        typeof St.onToggleUsernameClick !== "function" ||
        typeof St.setUsernameEditorVisible !== "function" ||
        typeof St.onSaveUsernameClick !== "function" ||
        typeof St.onSaveProfileDetailsClick !== "function" ||
        typeof St.initStudentPasswordCollapse !== "function" ||
        typeof St.initStudentProfileDetailsCollapse !== "function" ||
        typeof St.updateStudentPasswordChecklist !== "function" ||
        typeof St.showPasswordChangeFlash !== "function"
    ) {
        console.error(
            "Missing student module scripts (load student-enrollments.js, student-messages.js, student-profile.js before student.js)."
        );
        return;
    }

    document.getElementById("btn-leave").addEventListener("click", function () {
        St.onLeaveSubmit();
    });

    document.getElementById("btn-refresh-leave-request").addEventListener("click", function () {
        St.refreshLeaveRequestStatus();
    });

    document.getElementById("btn-send").addEventListener("click", function () {
        St.onSendMessageClick();
    });

    document.getElementById("btn-toggle-username-inline").addEventListener("click", function () {
        St.onToggleUsernameClick();
    });

    document.getElementById("btn-cancel-username").addEventListener("click", function () {
        St.setUsernameEditorVisible(false);
    });

    document.getElementById("btn-save-username").addEventListener("click", function () {
        St.onSaveUsernameClick();
    });

    document.getElementById("btn-save-profile-details").addEventListener("click", function () {
        St.onSaveProfileDetailsClick();
    });

    P.bindPasswordToggles(document);
    St.initStudentPasswordCollapse();
    St.initStudentProfileDetailsCollapse();
    var studentNewPw = document.getElementById("student-new-password");
    if (studentNewPw) {
        studentNewPw.addEventListener("input", St.updateStudentPasswordChecklist);
        studentNewPw.addEventListener("change", St.updateStudentPasswordChecklist);
    }

    P.wireChangePasswordButton({
        currentId: "student-current-password",
        nextId: "student-new-password",
        confirmId: "student-confirm-password",
        submitId: "btn-student-change-password",
        flash: St.showPasswordChangeFlash,
        onSuccess: function () {
            St.updateStudentPasswordChecklist();
            St.showPasswordChangeFlash("Your password has been updated.", "success");
            showAppFlash("student-flash", "Your password has been updated.", "success", 5000);
            if (typeof window.deepwellRefreshAuthNav === "function") {
                window.deepwellRefreshAuthNav();
            }
        }
    });

    if (St.lastLeaveRequestId) {
        St.setLeaveRefreshVisible(true);
        St.refreshLeaveRequestStatus();
    }

    St.loadProfile();
    St.loadEnrollments();
    St.loadInbox();
    St.loadSent();
    St.refreshStudentInboxUnreadUi(true);

    var tabRoot = document.getElementById("student-dashboard-tabs");
    if (tabRoot && typeof jQuery !== "undefined" && typeof dismissFlashByKind === "function") {
        jQuery(tabRoot).on("shown.bs.tab", 'a[data-toggle="tab"]', function (e) {
            var href = e.target && e.target.getAttribute("href");
            if (href === "#sc-pane-messages") {
                dismissFlashByKind("student-flash", "inbox-unread");
            }
        });
    }
})();
