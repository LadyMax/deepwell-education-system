async function joinCourse(courseId) {
    function showHomeApplyNotice(message, variant) {
        if (typeof showAppFlash === "function") {
            showAppFlash("home-courses-status", message, variant || "info", 5000);
            return;
        }
        var el = document.getElementById("home-courses-status");
        if (el) {
            el.textContent = message || "";
            el.className = "app-flash app-flash--" + (variant || "info");
            return;
        }
        alert(message || "Request failed");
    }
    const token = localStorage.getItem("token");
    if (!token) {
        showHomeApplyNotice("Please login first", "warning");
        window.location.href = "./login.html";
        return;
    }
    const res = await submitJoinRequest(courseId);
    if (res.ok) {
        showHomeApplyNotice("Application submitted. An administrator will review your request", "success");
    } else {
        showHomeApplyNotice(res.message || "Request failed", "danger");
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    const coursesRes = await getCourses();
    const courses = coursesRes.items || [];
    const map = {};
    for (const c of courses) {
        const key = (c.languageName || "").trim().toLowerCase();
        if (!map[key]) map[key] = c.id;
    }
    const staffAdmin =
        typeof isStaffAdminAccount === "function" && isStaffAdminAccount();

    document.querySelectorAll(".apply-course-btn").forEach(function (btn) {
        if (staffAdmin) {
            btn.disabled = true;
            btn.title = "Staff accounts cannot apply for courses.";
            return;
        }
        const lang = (btn.getAttribute("data-language") || "").trim();
        const id = map[lang.toLowerCase()];
        if (!id) {
            btn.disabled = true;
            btn.title = "No matching active course in database (admin must create a course with this language).";
            return;
        }
        btn.addEventListener("click", function () {
            joinCourse(id);
        });
    });
});
