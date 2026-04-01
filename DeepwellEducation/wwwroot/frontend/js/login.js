// Login/Register page behavior (formerly auth.js)
(function () {
    const paneLogin = document.getElementById('login-pane-login');
    const paneRegister = document.getElementById('login-pane-register');
    const showRegisterLink = document.getElementById('login-show-register-link');
    const showLoginLink = document.getElementById('login-show-login-link');

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

    document.getElementById('login-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const data = await login(email, password);
        if (!data) {
            alert('Invalid email or password.');
            return;
        }
        const role = data.user && (data.user.role !== undefined ? data.user.role : data.user.Role);
        if (role === 2 || role === 'Admin') window.location.href = './admin.html';
        else window.location.href = './student.html';
    });

    document.getElementById('register-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const fullName = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (password !== confirm) {
            alert('Passwords do not match.');
            return;
        }

        const result = await register(email, password, fullName);
        if (result.success) {
            alert('Registered successfully. Please login.');
            setMode('login', true);
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').focus();
        } else {
            alert(result.message);
        }
    });
})();

document.getElementById("login-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const data = await login(email, password);
    if (!data) {
        alert("Invalid email or password.");
        return;
    }
    const role = data.user && (data.user.role !== undefined ? data.user.role : data.user.Role);
    if (role === 2 || role === "Admin") {
        window.location.href = "./admin.html";
    } else {
        window.location.href = "./student.html";
    }
});
