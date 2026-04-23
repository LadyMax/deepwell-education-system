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
        typeof St.onCancelProfileDetailsClick !== "function" ||
        typeof St.hasUnsavedProfileDetailsChanges !== "function" ||
        typeof St.updatePhoneCountryFlag !== "function" ||
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

    function showStudentConfirm(message) {
        if (typeof jQuery === "undefined") return Promise.resolve(window.confirm(message));
        return new Promise(function (resolve) {
            var $m = jQuery("#student-confirm-modal");
            var okBtn = document.getElementById("student-confirm-ok");
            var cancelBtn = document.getElementById("student-confirm-cancel");
            var msgEl = document.getElementById("student-confirm-message");
            if (!$m.length || !okBtn || !cancelBtn || !msgEl) {
                resolve(window.confirm(message));
                return;
            }
            msgEl.textContent = message || "Please confirm.";
            var done = false;
            function finalize(v) {
                if (done) return;
                done = true;
                okBtn.removeEventListener("click", onOk);
                cancelBtn.removeEventListener("click", onCancel);
                $m.off("hidden.bs.modal", onHidden);
                resolve(v);
            }
            function onOk() {
                finalize(true);
                $m.modal("hide");
            }
            function onCancel() {
                finalize(false);
            }
            function onHidden() {
                finalize(false);
            }
            okBtn.addEventListener("click", onOk);
            cancelBtn.addEventListener("click", onCancel);
            $m.on("hidden.bs.modal", onHidden);
            $m.modal("show");
        });
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
    var btnClosePassword = document.getElementById("btn-close-password-settings");
    if (btnClosePassword && typeof jQuery !== "undefined") {
        btnClosePassword.addEventListener("click", function () {
            jQuery("#collapse-password-settings").collapse("hide");
        });
    }

    document.getElementById("btn-save-profile-details").addEventListener("click", function () {
        St.onSaveProfileDetailsClick();
    });
    var btnCloseProfile = document.getElementById("btn-close-profile-details");
    if (btnCloseProfile && typeof jQuery !== "undefined") {
        btnCloseProfile.addEventListener("click", async function () {
            if (typeof St.hasUnsavedProfileDetailsChanges === "function" && St.hasUnsavedProfileDetailsChanges()) {
                var ok = await showStudentConfirm("Discard unsaved changes?");
                if (!ok) return;
                if (typeof St.onCancelProfileDetailsClick === "function") {
                    St.onCancelProfileDetailsClick();
                }
            }
            jQuery("#collapse-profile-details").collapse("hide");
        });
    }
    var profilePhone = document.getElementById("profile-phone");
    if (profilePhone) {
        profilePhone.addEventListener("input", St.updatePhoneCountryFlag);
        profilePhone.addEventListener("change", St.updatePhoneCountryFlag);
    }
    var profilePhoneCountry = document.getElementById("profile-phone-country");
    if (profilePhoneCountry) {
        profilePhoneCountry.addEventListener("change", St.updatePhoneCountryFlag);
    }
    var profilePhoneCustomCountry = document.getElementById("profile-phone-custom-country");
    if (profilePhoneCustomCountry) {
        profilePhoneCustomCountry.addEventListener("input", St.updatePhoneCountryFlag);
        profilePhoneCustomCountry.addEventListener("change", St.updatePhoneCountryFlag);
    }

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
            St.showPasswordChangeFlash("Your password has been updated", "success");
            showAppFlash("student-flash", "Your password has been updated", "success", 5000);
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
    St.updatePhoneCountryFlag();
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
            } else if (href === "#sc-pane-account") {
                // Re-entering account tab should restore last saved profile state.
                if (typeof St.onCancelProfileDetailsClick === "function") {
                    St.onCancelProfileDetailsClick();
                }
            }
        });
    }
})();
