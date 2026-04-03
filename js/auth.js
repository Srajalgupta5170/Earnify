import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const locationInput = document.getElementById('location');
const roleSelect = document.getElementById('role-select');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const authMessage = document.getElementById('auth-message');

// Sign Up
signupBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleSelect.value;

    if (!email || !password) {
        authMessage.innerText = "Please fill in all fields.";
        return;
    }

    if (role === 'student' && !email.toLowerCase().endsWith('.edu')) {
        authMessage.innerText = "Students must use a .edu email address.";
        return;
    }

    // Save user role & location in Firestore
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            role: role,
            location: locationInput && locationInput.value ? locationInput.value.trim() : ''
        });
        
        redirectBasedOnRole(role);
    } catch (error) {
        authMessage.innerText = error.message;
    }
});

// Login
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        authMessage.innerText = "Please fill in all fields.";
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const docRef = doc(db, "users", userCredential.user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            redirectBasedOnRole(docSnap.data().role);
        } else {
            window.location.href = "index.html";
        }
    } catch (error) {
        authMessage.innerText = "Invalid credentials. Try again.";
    }
});

function redirectBasedOnRole(role) {
    if (role === 'recruiter') {
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
            redirectBasedOnRole(docSnap.data().role);
        } else {
            window.location.href = "index.html"; // Redirect if already logged in
        }
    }
});
