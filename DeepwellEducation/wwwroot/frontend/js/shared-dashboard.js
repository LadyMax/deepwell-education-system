(function (w) {
    "use strict";

    var dom = w.DeepwellDom;
    if (!dom || typeof dom.escapeHtml !== "function") {
        console.error("Missing shared-dom.js (load it before shared-dashboard.js).");
        return;
    }

    var S = {};

    S.escapeHtml = dom.escapeHtml;

    S.courseRequestTypeLabel = function (t) {
        if (t === 0 || t === "Join") return "Join";
        if (t === 1 || t === "Leave") return "Leave";
        return String(t);
    };

    S.courseRequestStatusLabel = function (s) {
        if (s === 0 || s === "Pending") return "Pending";
        if (s === 1 || s === "Approved") return "Approved";
        if (s === 2 || s === "Rejected") return "Rejected";
        return String(s);
    };

    S.courseRequestTypeClass = function (t) {
        if (t === 1 || t === "Leave") return "cr-type--leave";
        if (t === 0 || t === "Join") return "cr-type--join";
        return "";
    };

    S.courseRequestStatusClass = function (s) {
        if (s === 0 || s === "Pending") return "cr-status--pending";
        if (s === 1 || s === "Approved") return "cr-status--approved";
        if (s === 2 || s === "Rejected") return "cr-status--rejected";
        return "";
    };

    S.courseLevelLabel = function (v) {
        if (v === 0 || v === "0" || v === "Beginner") return "Beginner";
        if (v === 1 || v === "1" || v === "Intermediate") return "Intermediate";
        if (v === 2 || v === "2" || v === "Advanced") return "Advanced";
        return String(v);
    };

    S.messageCategoryHuman = function (v) {
        if (v === 0 || v === "CourseInquiry") return "Course inquiry";
        if (v === 1 || v === "Complaint") return "Complaint";
        if (v === 2 || v === "Feedback") return "Feedback";
        if (v === 3 || v === "Other") return "Other";
        return "—";
    };

    w.DeepwellShared = S;
})(typeof window !== "undefined" ? window : this);
