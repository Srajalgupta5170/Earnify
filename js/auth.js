import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const fullNameInput = document.getElementById('full-name');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const locationInput = document.getElementById('location');
const skillsInput = document.getElementById('skills');
const bioInput = document.getElementById('bio');
const roleSelect = document.getElementById('role-select');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const authMessage = document.getElementById('auth-message');
const authModeButtons = document.querySelectorAll('.auth-toggle-btn');
const roleBadgeButtons = document.querySelectorAll('.role-badge');
const authPanels = {
    login: document.getElementById('login-panel'),
    signup: document.getElementById('signup-panel')
};

const ADMIN_EMAILS = ['harshit@gmail.com'];

function isAdminEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email.trim().toLowerCase());
}

function resolveRole(role, email) {
    if (role === 'admin' || isAdminEmail(email)) {
        return 'admin';
    }
    if (role === 'recruiter') {
        return 'recruiter';
    }
    return 'student';
}

function setRoleSelection(role) {
    if (!roleSelect) return;

    roleSelect.value = role;
    roleBadgeButtons.forEach(button => {
        const active = button.dataset.role === role;
        button.classList.toggle('active', active);
    });
}

function setAuthMode(mode) {
    authModeButtons.forEach(button => {
        const active = button.dataset.authMode === mode;
        button.classList.toggle('active', active);
    });

    Object.entries(authPanels).forEach(([panelKey, panel]) => {
        if (panel) {
            panel.classList.toggle('active', panelKey === mode);
        }
    });

    if (authMessage) {
        authMessage.innerText = '';
    }
}

roleBadgeButtons.forEach(button => {
    button.addEventListener('click', () => setRoleSelection(button.dataset.role));
});

if (roleSelect) {
    roleSelect.addEventListener('change', (event) => {
        setRoleSelection(event.target.value);
    });
}

authModeButtons.forEach(button => {
    button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
});

if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
        const fullName = fullNameInput ? fullNameInput.value.trim() : '';
        const email = signupEmailInput ? signupEmailInput.value.trim() : '';
        const password = signupPasswordInput ? signupPasswordInput.value.trim() : '';
        const role = roleSelect ? roleSelect.value : 'student';
        const location = locationInput && locationInput.value ? locationInput.value.trim() : '';
        const skills = skillsInput && skillsInput.value ? skillsInput.value.trim() : '';
        const bio = bioInput && bioInput.value ? bioInput.value.trim() : '';

        if (!fullName || !email || !password) {
            if (authMessage) {
                authMessage.innerText = "Please fill in your name, email and password.";
            }
            return;
        }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            fullName,
            email: user.email,
            role,
            location,
            skills,
            bio,
            verified: role === 'recruiter',
            verificationRequested: false,
            verificationStatus: 'not_verified',
            createdAt: new Date(),
            profileComplete: true
        });

        redirectBasedOnRole(role);
    } catch (error) {
        const code = error.code || '';

        if (authMessage) {
            if (code === 'auth/email-already-in-use') {
                authMessage.innerText = 'This email is already registered. Please use the Login button instead.';
            } else if (code === 'auth/weak-password') {
                authMessage.innerText = 'Password should be at least 6 characters long.';
            } else if (code === 'auth/invalid-email') {
                authMessage.innerText = 'Please enter a valid email address.';
            } else {
                authMessage.innerText = 'Unable to create account. Please try again.';
            }
        }
    }
    });
}

// Login
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = loginEmailInput ? loginEmailInput.value.trim() : '';
        const password = loginPasswordInput ? loginPasswordInput.value.trim() : '';
        const selectedRole = roleSelect ? roleSelect.value : 'student';

        if (!email || !password) {
            if (authMessage) {
                authMessage.innerText = "Please fill in all fields.";
            }
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const docRef = doc(db, "users", userCredential.user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const savedRole = docSnap.data().role || selectedRole;
                redirectBasedOnRole(savedRole);
            } else {
                window.location.href = "index.html";
            }
        } catch (error) {
            const code = error.code || '';

            if (authMessage) {
                if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                    authMessage.innerText = 'Invalid email or password. Please check your details or sign up first.';
                } else if (code === 'auth/too-many-requests') {
                    authMessage.innerText = 'Too many login attempts. Please try again later.';
                } else if (code === 'auth/invalid-email') {
                    authMessage.innerText = 'Please enter a valid email address.';
                } else {
                    authMessage.innerText = 'Login failed. Please try again.';
                }
            }
        }
    });
}

function redirectBasedOnRole(role, email) {
    const resolvedRole = resolveRole(role, email);

    if (resolvedRole === 'admin') {
        window.location.href = "admin-dashboard.html";
    } else if (resolvedRole === 'recruiter') {
        window.location.href = "recruiter-dashboard.html";
    } else {
        window.location.href = "student-dashboard.html";
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user && window.location.pathname.includes('login.html')) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const role = data && data.role ? data.role : 'student';
            redirectBasedOnRole(role, user.email || data.email);
            return;
        }

        if (isAdminEmail(user.email)) {
            window.location.href = 'admin-dashboard.html';
            return;
        }

        window.location.href = 'index.html';
    }
});
