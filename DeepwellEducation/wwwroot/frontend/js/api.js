// Same origin as the site; works with any launch port.
const baseUrl = `${window.location.origin}/api`;

/** Prefer camelCase key `a`, fallback PascalCase `b` (.NET JSON). */
function pick(o, a, b) {
    if (!o) return "";
    return o[a] !== undefined ? o[a] : o[b];
}

function authHeaders() {
    const token = localStorage.getItem("token");
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = "Bearer " + token;
    return h;
}

async function readJsonOrText(response) {
    const text = await response.text();
    try {
        return { text, json: text ? JSON.parse(text) : null };
    } catch {
        return { text, json: null };
    }
}

async function register(email, password, fullName) {
    try {
        const response = await fetch(`${baseUrl}/Auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, fullName })
        });
        if (!response.ok) {
            const text = await response.text();
            return { success: false, message: text || response.statusText };
        }
        return { success: true };
    } catch (e) {
        return { success: false, message: "Server error: " + (e.message || "unknown") };
    }
}

async function login(email, password) {
    try {
        const response = await fetch(`${baseUrl}/Auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) return null;
        const data = await response.json();
        localStorage.setItem("token", data.token);
        return data;
    } catch {
        return null;
    }
}

function logout() {
    localStorage.removeItem("token");
}

async function getMe() {
    const response = await fetch(`${baseUrl}/Auth/me`, { headers: authHeaders() });
    if (!response.ok) return null;
    return response.json();
}

async function getCourses() {
    const response = await fetch(`${baseUrl}/Courses`);
    if (!response.ok) return [];
    return response.json();
}

async function getAdminCourses(includeInactive) {
    let url = `${baseUrl}/Courses/admin`;
    if (includeInactive) url += "?includeInactive=true";
    const response = await fetch(url, { headers: authHeaders() });
    if (response.status === 403) return { forbidden: true, items: [] };
    if (!response.ok) return { error: await response.text(), items: [] };
    const data = await response.json();
    return { items: Array.isArray(data) ? data : [] };
}

async function createCourse(payload) {
    const response = await fetch(`${baseUrl}/Courses`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
    });
    const body = await readJsonOrText(response);
    if (!response.ok) return { ok: false, message: body.text || response.statusText };
    return { ok: true, data: body.json || {} };
}

async function updateCourse(id, payload) {
    const response = await fetch(`${baseUrl}/Courses/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload)
    });
    const body = await readJsonOrText(response);
    if (!response.ok) return { ok: false, message: body.text || response.statusText };
    return { ok: true, data: body.json || {} };
}

async function setCourseActive(id, isActive) {
    const response = await fetch(`${baseUrl}/Courses/${encodeURIComponent(id)}/active`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !!isActive })
    });
    const body = await readJsonOrText(response);
    if (!response.ok) return { ok: false, message: body.text || response.statusText };
    return { ok: true, data: body.json || {} };
}

async function deleteCourse(id) {
    const response = await fetch(`${baseUrl}/Courses/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders()
    });
    const text = await response.text();
    if (!response.ok) return { ok: false, message: text || response.statusText };
    return { ok: true };
}

async function getMyEnrollments() {
    const response = await fetch(`${baseUrl}/Enrollments/me`, { headers: authHeaders() });
    if (!response.ok) return [];
    return response.json();
}

async function getEnrollmentsByCourse(courseId) {
    const response = await fetch(`${baseUrl}/Enrollments/course/${encodeURIComponent(courseId)}`, {
        headers: authHeaders()
    });
    if (response.status === 403) return { forbidden: true, items: [] };
    if (!response.ok) return { error: await response.text(), items: [] };
    const data = await response.json();
    return { items: Array.isArray(data) ? data : [] };
}

async function getInbox(page = 1, pageSize = 20) {
    const response = await fetch(`${baseUrl}/Messages/inbox?page=${page}&pageSize=${pageSize}`, {
        headers: authHeaders()
    });
    if (!response.ok) return { items: [], totalCount: 0 };
    return response.json();
}

async function getSent(page = 1, pageSize = 20) {
    const response = await fetch(`${baseUrl}/Messages/sent?page=${page}&pageSize=${pageSize}`, {
        headers: authHeaders()
    });
    if (!response.ok) return { items: [], totalCount: 0 };
    return response.json();
}

async function markMessageRead(id) {
    const response = await fetch(`${baseUrl}/Messages/${encodeURIComponent(id)}/read`, {
        method: "POST",
        headers: authHeaders()
    });
    if (!response.ok) return { ok: false, message: await response.text() };
    return { ok: true, data: await response.json() };
}

async function sendMessage(subject, content, receiverUserId) {
    const body = { subject, content };
    if (receiverUserId) body.receiverUserId = receiverUserId;
    const response = await fetch(`${baseUrl}/Messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text || response.statusText);
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return {};
    }
}

/** RequestType.Join = 0, Leave = 1 */
async function submitCourseRequest(courseId, type) {
    const response = await fetch(`${baseUrl}/CourseRequests`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ courseId, type })
    });
    if (!response.ok) {
        const t = await response.text();
        return { ok: false, message: t || response.statusText };
    }
    return { ok: true, data: await response.json() };
}

async function submitJoinRequest(courseId) {
    return submitCourseRequest(courseId, 0);
}

async function submitLeaveRequest(courseId) {
    return submitCourseRequest(courseId, 1);
}

async function getCourseRequestById(id) {
    const response = await fetch(`${baseUrl}/CourseRequests/${encodeURIComponent(id)}`, {
        headers: authHeaders()
    });
    if (!response.ok) return { ok: false, message: await response.text() };
    return { ok: true, data: await response.json() };
}

async function getAdminMessages(options = {}) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    let url = `${baseUrl}/Messages/admin?page=${page}&pageSize=${pageSize}`;
    if (options.uncategorizedOnly) url += "&uncategorizedOnly=true";
    if (options.finalCategory != null && options.finalCategory !== "") {
        url += `&finalCategory=${encodeURIComponent(options.finalCategory)}`;
    }
    const response = await fetch(url, { headers: authHeaders() });
    if (response.status === 403) return { forbidden: true, items: [], totalCount: 0 };
    if (!response.ok) return { error: await response.text(), items: [], totalCount: 0 };
    return response.json();
}

async function categorizeMessage(id, finalCategory) {
    const response = await fetch(`${baseUrl}/Messages/${id}/categorize`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ finalCategory: Number(finalCategory) })
    });
    if (!response.ok) return { ok: false, message: await response.text() };
    return { ok: true, data: await response.json() };
}

/** status: e.g. "Pending" | "Approved" | "Rejected", or omit for all (Admin). */
async function getCourseRequests(status) {
    let url = `${baseUrl}/CourseRequests`;
    if (status != null && status !== "") url += `?status=${encodeURIComponent(status)}`;
    const response = await fetch(url, { headers: authHeaders() });
    if (response.status === 403) return { forbidden: true, items: [] };
    if (!response.ok) return { error: await response.text(), items: [] };
    const data = await response.json();
    return { items: Array.isArray(data) ? data : [] };
}

async function reviewCourseRequest(id, approve) {
    const response = await fetch(`${baseUrl}/CourseRequests/${id}/review`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ approve })
    });
    const body = await readJsonOrText(response);
    if (!response.ok) return { ok: false, message: body.text || response.statusText };
    return { ok: true, data: body.json || {} };
}

/**
 * Inline banner (replaces alert). variant: success | danger | warning | info
 */
function showAppFlash(elementId, message, variant, autoHideMs) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const v = variant || "info";
    el.textContent = message;
    el.className = "app-flash app-flash--" + v;
    el.classList.remove("d-none");
    el.setAttribute("role", "status");
    if (el._flashTimer) clearTimeout(el._flashTimer);
    if (autoHideMs && autoHideMs > 0) {
        el._flashTimer = setTimeout(function () {
            el.classList.add("d-none");
        }, autoHideMs);
    }
}
