import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const form = document.getElementById('post-job-form');
const message = document.getElementById('post-message');
const navLogout = document.getElementById('nav-logout');
let currentUser = null;

// Ensure only recruiters can access this page
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().role !== 'recruiter') {
            alert("Only recruiters can post jobs.");
            window.location.href = "index.html";
        }
    } else {
        window.location.href = "login.html";
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) return;

    const title = document.getElementById('job-title').value.trim();
    const description = document.getElementById('job-desc').value.trim();
    const category = document.getElementById('job-category').value;
    const location = document.getElementById('job-location').value.trim();
    const paymentStr = document.getElementById('job-payment').value.trim();
    const urgency = document.getElementById('job-urgency').value;

    // Validation
    if (!title || !description || !paymentStr) {
        message.innerText = "Please fill out all required fields.";
        return;
    }

    if (category === 'Local' && !location) {
        message.innerText = "Location is required for Local jobs.";
        return;
    }

    const payment = Number(paymentStr);
    if (isNaN(payment) || payment <= 0) {
        message.innerText = "Payment must be a valid positive number.";
        return;
    }
    
    // Clear previous errors
    message.innerText = '';

    try {
        await addDoc(collection(db, "jobs"), {
            title,
            description,
            category,
            location,
            payment,
            urgency,
            recruiterId: currentUser.uid,
            createdAt: new Date()
        });
        
        alert("Job posted successfully!");
        window.location.href = "recruiter-dashboard.html";
    } catch (error) {
        message.innerText = error.message;
        console.error("Error adding document: ", error);
    }
});

navLogout.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        window.location.href = "index.html";
    });
});
