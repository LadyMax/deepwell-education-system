async function joinCourse(courseId) {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please login first.");
        window.location.href = "./login.html";
        return;
    }
    const res = await submitJoinRequest(courseId);
    if (res.ok) {
        alert("Application submitted. An administrator will review your request.");
    } else {
        alert(res.message || "Request failed");
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    const courses = await getCourses();
    const map = {};
    for (const c of courses) {
        const key = (c.languageName || "").trim().toLowerCase();
        if (!map[key]) map[key] = c.id;
    }
    document.querySelectorAll(".apply-course-btn").forEach(function (btn) {
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
