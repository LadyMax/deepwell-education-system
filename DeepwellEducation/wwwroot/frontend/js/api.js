const baseUrl = `${window.location.origin}/api`;

/** Keep in sync with AuthController.MaxPasswordLength (C#). */
var maxPasswordLength = 128;

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

function getAuthRoleFromToken() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "===".slice((base64.length + 3) % 4);
        const p = JSON.parse(atob(padded));
        return p.role != null
            ? p.role
            : p["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? null;
    } catch {
        return null;
    }
}

function isStaffAdminAccount() {
    const r = getAuthRoleFromToken();
    return r === "Admin" || r === 2;
}

async function readJsonOrText(response) {
    const text = await response.text();
    try {
        return { text, json: text ? JSON.parse(text) : null };
    } catch {
        return { text, json: null };
    }
}

function apiErrorMessage(body, fallback) {
    if (!body) return fallback || "Request failed";
    if (body.text && String(body.text).trim()) return body.text;
    if (body.json) {
        if (typeof body.json === "string") return body.json;
        if (body.json.message) return String(body.json.message);
        if (body.json.error) return String(body.json.error);
        if (body.json.title) return String(body.json.title);
    }
    return fallback || "Request failed";
}

async function requestJson(url, options) {
    try {
        const response = await fetch(url, options || {});
        const body = await readJsonOrText(response);
        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                message: apiErrorMessage(body, response.statusText),
                data: body.json
            };
        }
        return { ok: true, status: response.status, data: body.json || {} };
    } catch (e) {
        return { ok: false, status: 0, message: "Server error: " + (e.message || "unknown"), data: null };
    }
}

async function register(email, password, userName) {
    try {
        const response = await fetch(`${baseUrl}/Auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, userName })
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
    const r = await requestJson(`${baseUrl}/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    if (!r.ok) return r;
    const data = r.data || {};
    if (data.token) localStorage.setItem("token", data.token);
    return { ok: true, data };
}

function logout() {
    localStorage.removeItem("token");
}

async function getMe() {
    return requestJson(`${baseUrl}/Auth/me`, { headers: authHeaders() });
}

function evaluatePasswordRules(password) {
    const p = password || "";
    return {
        withinMax: p.length <= maxPasswordLength,
        minLen: p.length >= 8,
        upper: /[A-Z]/.test(p),
        lower: /[a-z]/.test(p),
        digit: /\d/.test(p),
        special: /[^A-Za-z0-9]/.test(p)
    };
}

function validatePasswordPolicy(password) {
    const p = password || "";
    if (p.length > maxPasswordLength) {
        return "Password must be " + maxPasswordLength + " characters or fewer.";
    }
    const r = evaluatePasswordRules(password);
    if (!r.minLen) return "Password must be at least 8 characters.";
    if (!r.upper) return "Password must contain at least one uppercase letter.";
    if (!r.lower) return "Password must contain at least one lowercase letter.";
    if (!r.digit) return "Password must contain at least one digit.";
    if (!r.special) return "Password must contain at least one special character.";
    return "";
}

async function verifyCurrentPassword(password) {
    const response = await fetch(`${baseUrl}/Auth/verify-current-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ password: (password || "").trim() })
    });
    const body = await readJsonOrText(response);
    if (!response.ok) return { ok: false, message: body.text || response.statusText };
    return { ok: true };
}

async function changeMyPassword(currentPassword, newPassword) {
    const response = await fetch(`${baseUrl}/Auth/change-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
    });
    const body = await readJsonOrText(response);
    if (!response.ok) return { ok: false, message: body.text || response.statusText };
    const json = body.json;
    if (json && json.token) localStorage.setItem("token", json.token);
    return { ok: true, data: json };
}

async function changeMyUsername(username) {
    const response = await fetch(`${baseUrl}/Auth/change-username`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ username: (username || "").trim() })
    });
    const body = await readJsonOrText(response);
    if (!response.ok) return { ok: false, message: body.text || response.statusText };
    return { ok: true, data: body.json || {} };
}

async function getMyStudentProfile() {
    const response = await fetch(`${baseUrl}/StudentProfiles/me`, { headers: authHeaders() });
    if (response.status === 404) return { ok: false, notFound: true, message: await response.text() };
    if (!response.ok) return { ok: false, message: await response.text() };
    return { ok: true, data: await response.json() };
}

async function updateMyStudentProfile(payload) {
    const response = await fetch(`${baseUrl}/StudentProfiles/me`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload || {})
    });
    const body = await readJsonOrText(response);
    if (!response.ok) return { ok: false, message: body.text || response.statusText };
    return { ok: true, data: body.json || {} };
}

async function getCourses() {
    const r = await requestJson(`${baseUrl}/Courses`);
    if (!r.ok) return { ok: false, message: r.message, items: [] };
    return { ok: true, items: Array.isArray(r.data) ? r.data : [] };
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

async function uploadCourseCover(courseId, blob) {
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) headers.Authorization = "Bearer " + token;
    const form = new FormData();
    form.append("file", blob, "cover.jpg");
    const response = await fetch(`${baseUrl}/Courses/${encodeURIComponent(courseId)}/cover`, {
        method: "POST",
        headers,
        body: form
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

async function deleteCourse(id, permanent = false) {
    const q = permanent ? "?permanent=true" : "";
    const response = await fetch(`${baseUrl}/Courses/${encodeURIComponent(id)}${q}`, {
        method: "DELETE",
        headers: authHeaders()
    });
    const text = await response.text();
    if (!response.ok) return { ok: false, message: text || response.statusText };
    return { ok: true };
}

async function getMyEnrollments() {
    const r = await requestJson(`${baseUrl}/Enrollments/me`, { headers: authHeaders() });
    if (!r.ok) return { ok: false, message: r.message, items: [] };
    return { ok: true, items: Array.isArray(r.data) ? r.data : [] };
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
    const r = await requestJson(`${baseUrl}/Messages/inbox?page=${page}&pageSize=${pageSize}`, {
        headers: authHeaders()
    });
    if (!r.ok) return { ok: false, message: r.message, items: [], totalCount: 0 };
    return {
        ok: true,
        items: r.data.items || r.data.Items || [],
        totalCount: r.data.totalCount ?? r.data.TotalCount ?? 0
    };
}

async function getInboxUnreadCount() {
    const response = await fetch(`${baseUrl}/Messages/inbox/unread-count`, {
        headers: authHeaders()
    });
    if (!response.ok) return { count: 0 };
    const data = await response.json();
    const n = data.count != null ? data.count : data.Count;
    return { count: typeof n === "number" ? n : parseInt(String(n), 10) || 0 };
}

async function getSent(page = 1, pageSize = 20) {
    const r = await requestJson(`${baseUrl}/Messages/sent?page=${page}&pageSize=${pageSize}`, {
        headers: authHeaders()
    });
    if (!r.ok) return { ok: false, message: r.message, items: [], totalCount: 0 };
    return {
        ok: true,
        items: r.data.items || r.data.Items || [],
        totalCount: r.data.totalCount ?? r.data.TotalCount ?? 0
    };
}

async function markMessageRead(id) {
    const response = await fetch(`${baseUrl}/Messages/${encodeURIComponent(id)}/read`, {
        method: "POST",
        headers: authHeaders()
    });
    if (!response.ok) return { ok: false, message: await response.text() };
    return { ok: true, data: await response.json() };
}

async function sendMessage(subject, content, receiverUserId, senderSuggestedCategory) {
    const body = { subject, content };
    if (receiverUserId) body.receiverUserId = receiverUserId;
    if (senderSuggestedCategory != null && senderSuggestedCategory !== "") {
        body.senderSuggestedCategory = Number(senderSuggestedCategory);
    }
    const r = await requestJson(`${baseUrl}/Messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body)
    });
    if (!r.ok) return { ok: false, message: r.message };
    return { ok: true, data: r.data || {} };
}

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
    if (isStaffAdminAccount()) {
        return { ok: false, message: "Staff accounts cannot apply for courses." };
    }
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

async function getAdminUserDetail(userId) {
    const response = await fetch(`${baseUrl}/admin/users/${encodeURIComponent(userId)}`, {
        headers: authHeaders()
    });
    if (response.status === 403) return { forbidden: true };
    if (response.status === 404) return { notFound: true };
    if (!response.ok) return { error: await response.text() };
    return { ok: true, data: await response.json() };
}

async function getAdminUsersList(options = {}) {
    const params = new URLSearchParams();
    const q = (options.q || "").trim();
    if (q) params.set("q", q);
    if (options.role !== undefined && options.role !== null && options.role !== "") {
        params.set("role", String(options.role));
    }
    params.set("page", String(options.page || 1));
    params.set("pageSize", String(options.pageSize || 20));
    const response = await fetch(`${baseUrl}/admin/users?${params.toString()}`, {
        headers: authHeaders()
    });
    if (response.status === 403) return { forbidden: true, items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 };
    if (!response.ok) return { error: await response.text(), items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 };
    const data = await response.json();
    return {
        items: data.items || data.Items || [],
        totalCount: data.totalCount ?? data.TotalCount ?? 0,
        page: data.page ?? data.Page ?? 1,
        pageSize: data.pageSize ?? data.PageSize ?? 20,
        totalPages: data.totalPages ?? data.TotalPages ?? 0
    };
}

async function getAdminMessages(options = {}) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    let url = `${baseUrl}/Messages/admin?page=${page}&pageSize=${pageSize}`;
    if (options.uncategorizedOnly) url += "&uncategorizedOnly=true";
    if (options.unreadOnly) url += "&unreadOnly=true";
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

async function reassistMessageAi(id) {
    const response = await fetch(`${baseUrl}/Messages/${encodeURIComponent(id)}/reassist-ai`, {
        method: "POST",
        headers: authHeaders()
    });
    if (response.status === 204) return { ok: true };
    if (response.status === 502) {
        const t = await response.text();
        return { ok: false, message: t || "The AI helper is not responding (check it is running)." };
    }
    if (!response.ok) return { ok: false, message: await response.text() };
    return { ok: true };
}

async function getCourseRequests(filtersOrStatus) {
    const params = new URLSearchParams();
    if (typeof filtersOrStatus === "string") {
        if (filtersOrStatus) params.set("status", filtersOrStatus);
    } else {
        const filters = filtersOrStatus || {};
        if (filters.status) params.set("status", filters.status);
        if (filters.type) params.set("type", filters.type);
        if (filters.courseId) params.set("courseId", filters.courseId);
        if (filters.applicant) params.set("applicant", filters.applicant.trim());
        if (filters.created) params.set("created", filters.created);
    }

    const query = params.toString();
    let url = `${baseUrl}/CourseRequests${query ? "?" + query : ""}`;
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

function showAppFlash(elementId, message, variant, autoHideMs, flashKind) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const v = variant || "info";
    el.textContent = message;
    el.className = "app-flash app-flash--" + v;
    el.classList.remove("d-none");
    el.setAttribute("role", "status");
    if (flashKind) {
        el.dataset.deepwellFlashKind = flashKind;
    } else {
        el.removeAttribute("data-deepwell-flash-kind");
    }
    if (el._flashTimer) clearTimeout(el._flashTimer);
    if (autoHideMs && autoHideMs > 0) {
        el._flashTimer = setTimeout(function () {
            el.classList.add("d-none");
        }, autoHideMs);
    }
}

function dismissFlashByKind(elementId, kind) {
    const el = document.getElementById(elementId);
    if (!el || el.dataset.deepwellFlashKind !== kind) return;
    el.classList.add("d-none");
    el.textContent = "";
    el.removeAttribute("data-deepwell-flash-kind");
    if (el._flashTimer) clearTimeout(el._flashTimer);
    el._flashTimer = undefined;
}
