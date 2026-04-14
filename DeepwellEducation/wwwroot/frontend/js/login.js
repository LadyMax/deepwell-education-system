// Login/Register page behavior (formerly auth.js)
(function () {
    const paneLogin = document.getElementById('login-pane-login');
    const paneRegister = document.getElementById('login-pane-register');
    const showRegisterLink = document.getElementById('login-show-register-link');
    const showLoginLink = document.getElementById('login-show-login-link');

    const usernamePattern = /^[A-Za-z0-9._-]+$/;

    function bindPasswordToggles(root) {
        var scope = root || document;
        scope.querySelectorAll('[data-password-toggle]').forEach(function (btn) {
            if (btn.dataset.boundPwd === '1') return;
            btn.dataset.boundPwd = '1';
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-password-toggle');
                var input = document.getElementById(id);
                if (!input) return;
                var show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                btn.setAttribute('aria-pressed', show ? 'true' : 'false');
                var icon = btn.querySelector('i');
                if (icon) icon.className = show ? 'fa fa-eye-slash' : 'fa fa-eye';
            });
        });
    }

    function updateRegisterPasswordRules() {
        if (typeof evaluatePasswordRules !== 'function') return;
        var p = document.getElementById('register-password');
        var pwd = p ? p.value : '';
        var r = evaluatePasswordRules(pwd);
        function setOk(id, ok) {
            var el = document.getElementById(id);
            if (!el) return;
            el.className = ok ? 'ok' : 'bad';
        }
        setOk('register-pw-rule-len', r.minLen);
        setOk('register-pw-rule-upper', r.upper);
        setOk('register-pw-rule-lower', r.lower);
        setOk('register-pw-rule-digit', r.digit);
        setOk('register-pw-rule-special', r.special);
    }

    function validateUsername(raw) {
        const s = (raw || '').trim();
        if (!s) return 'Username is required.';
        if (s.length < 3 || s.length > 32) return 'Username must be 3–32 characters.';
        if (!usernamePattern.test(s)) return 'Username may only contain letters, digits, and . _ -';
        return '';
    }

    function flash(message, variant) {
        if (typeof showAppFlash === 'function') {
            if (!message) {
                const el = document.getElementById('login-flash');
                if (el) {
                    el.classList.add('d-none');
                    el.textContent = '';
                }
                return;
            }
            showAppFlash('login-flash', message, variant || 'danger', 6000);
            return;
        }
        if (message) window.alert(message);
    }

    function setMode(mode, replaceHistory) {
        const isRegister = mode === 'register';
        paneLogin.classList.toggle('active', !isRegister);
        paneRegister.classList.toggle('active', isRegister);

        const url = new URL(window.location.href);
        url.searchParams.set('mode', isRegister ? 'register' : 'login');
        if (replaceHistory) history.replaceState({}, '', url);
        else history.pushState({}, '', url);
    }

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', function (e) {
            e.preventDefault();
            setMode('register', false);
        });
    }
    if (showLoginLink) {
        showLoginLink.addEventListener('click', function (e) {
            e.preventDefault();
            setMode('login', false);
        });
    }

    const mode = new URLSearchParams(window.location.search).get('mode');
    setMode(mode === 'register' ? 'register' : 'login', true);

    bindPasswordToggles(document);
    var regPw = document.getElementById('register-password');
    if (regPw) {
        regPw.addEventListener('input', updateRegisterPasswordRules);
        regPw.addEventListener('change', updateRegisterPasswordRules);
    }

    document.getElementById('login-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        flash('', 'info');
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const data = await login(email, password);
        if (!data) {
            flash('Invalid email or password.', 'danger');
            return;
        }
        const role = data.user && (data.user.role !== undefined ? data.user.role : data.user.Role);
        if (role === 2 || role === 'Admin') window.location.href = './admin.html';
        else window.location.href = './student.html';
    });

    document.getElementById('register-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        flash('', 'info');
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        const uerr = validateUsername(username);
        if (uerr) {
            flash(uerr, 'warning');
            return;
        }

        if (password !== confirm) {
            flash('Passwords do not match.', 'warning');
            return;
        }

        if (typeof validatePasswordPolicy === 'function') {
            var perr = validatePasswordPolicy(password);
            if (perr) {
                flash(perr, 'warning');
                return;
            }
        }

        const result = await register(email, password, username);
        if (result.success) {
            flash('Registered successfully. Please log in.', 'success');
            setMode('login', true);
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').focus();
        } else {
            flash(result.message || 'Registration failed.', 'danger');
        }
    });
})();
