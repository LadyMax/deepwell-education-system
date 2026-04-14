(function () {
    async function fetchText(url) {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Failed to load ' + url + ' (' + res.status + ')');
        return await res.text();
    }

    function getToken() {
        return localStorage.getItem('token') || '';
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function fetchMe(token) {
        try {
            const res = await fetch(window.location.origin + '/api/Auth/me', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
            if (!res.ok) return { ok: false, status: res.status, data: null };
            return { ok: true, status: res.status, data: await res.json() };
        } catch {
            return { ok: false, status: 0, data: null };
        }
    }

    function readRole(user) {
        return user && (user.role !== undefined ? user.role : user.Role);
    }

    function readName(user) {
        const fullName = user && (user.fullName !== undefined ? user.fullName : user.FullName);
        const email = user && (user.email !== undefined ? user.email : user.Email);
        if (fullName) return fullName;
        if (email) return email;
        return 'Account';
    }

    function decodeJwtPayload(token) {
        try {
            const parts = token.split('.');
            if (parts.length < 2) return null;
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64 + '==='.slice((base64.length + 3) % 4);
            const json = atob(padded);
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    function userFromToken(token) {
        const p = decodeJwtPayload(token);
        if (!p) return null;
        const name = p.name || p.unique_name || p.email || '';
        const role = p.role || p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '';
        return { fullName: name, email: name, role: role };
    }

    function currentFileName() {
        const path = window.location.pathname;
        const last = path.split('/').pop() || '';
        return last === '' ? 'index.html' : last;
    }

    function setActiveNav(root, file) {
        if (!root) return;
        const links = root.querySelectorAll('a[data-nav]');
        links.forEach(a => a.classList.remove('active'));
        const match = root.querySelector('a[data-nav="' + file + '"]');
        if (match) match.classList.add('active');
    }

    function bindLogout(slot) {
        if (!slot) return;
        const logout = slot.querySelector('#auth-logout-link');
        if (!logout) return;
        logout.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }

    function bindAccountMenu(slot) {
        if (!slot) return;
        const menu = slot.querySelector('#auth-menu');
        const trigger = slot.querySelector('#auth-menu-trigger');
        if (!menu || !trigger) return;

        trigger.addEventListener('click', function (e) {
            e.preventDefault();
            menu.classList.toggle('open');
        });

        document.addEventListener('click', function (e) {
            if (!menu.contains(e.target)) menu.classList.remove('open');
        });
    }

    function renderAuthNav(slot, user) {
        if (!slot) return;
        const token = getToken();
        if (!token || !user) {
            slot.innerHTML = '<a href="login.html" class="nav-item nav-link">Login</a>';
            return;
        }

        const role = readRole(user);
        const isAdmin = role === 2 || role === 'Admin';
        const target = isAdmin ? 'admin.html' : 'student.html';
        const safeName = escapeHtml(readName(user));
        slot.innerHTML =
            '<div class="nav-item auth-menu" id="auth-menu">' +
            '<a href="' + target + '" class="nav-link auth-menu-trigger" id="auth-menu-trigger">Hi, ' + safeName + '</a>' +
            '<div class="auth-menu-list">' +
            '<a href="' + target + '" class="auth-menu-item">My account</a>' +
            '<a href="#" class="auth-menu-item" id="auth-logout-link">Logout</a>' +
            '</div>' +
            '</div>';
    }

    async function init() {
        const headerHost = document.getElementById('site-header');
        const footerHost = document.getElementById('site-footer');
        const tasks = [];

        if (headerHost) {
            tasks.push(
                fetchText('partials/header.html').then(html => {
                    headerHost.innerHTML = html;
                })
            );
        }
        if (footerHost) {
            tasks.push(
                fetchText('partials/footer.html').then(html => {
                    footerHost.innerHTML = html;
                })
            );
        }

        try {
            await Promise.all(tasks);
        } catch (e) {
            // Silent failure: page still usable without shared chrome.
            // Consider logging during development if needed.
        }

        const navRoot = document.querySelector('[data-site-nav]');
        const authSlot = document.getElementById('auth-nav-slot');
        let me = null;
        const token = getToken();
        if (token) {
            // Immediate UI update from token so nav does not stay on "Login".
            me = userFromToken(token);
            renderAuthNav(authSlot, me);

            const meRes = await fetchMe(token);
            if (meRes.ok && meRes.data) {
                me = meRes.data;
            } else if (meRes.status === 401) {
                localStorage.removeItem('token');
                me = null;
            }
        }
        renderAuthNav(authSlot, me);
        setActiveNav(navRoot, currentFileName());
        bindLogout(authSlot);
        bindAccountMenu(authSlot);
    }

    /** After changing username on account pages, refresh the header “Hi, …” label. */
    window.deepwellRefreshAuthNav = async function () {
        const authSlot = document.getElementById('auth-nav-slot');
        const token = getToken();
        if (!authSlot) return;
        if (!token) {
            renderAuthNav(authSlot, null);
            bindLogout(authSlot);
            bindAccountMenu(authSlot);
            return;
        }
        const meRes = await fetchMe(token);
        if (meRes.ok && meRes.data) {
            renderAuthNav(authSlot, meRes.data);
        } else if (meRes.status === 401) {
            localStorage.removeItem('token');
            renderAuthNav(authSlot, null);
        }
        bindLogout(authSlot);
        bindAccountMenu(authSlot);
    };

    init();
})();

