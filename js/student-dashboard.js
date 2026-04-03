import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const appsContainer = document.getElementById('applications-container');
const loadingSpinner = document.getElementById('loading-spinner');
const noAppsMsg = document.getElementById('no-apps-msg');
const navLogout = document.getElementById('nav-logout');

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().role !== 'student') {
            alert("Only students can access this dashboard.");
            window.location.href = "index.html";
        } else {
            loadApplications();
        }
    } else {
        window.location.href = "login.html";
    }
});

async function loadApplications() {
    loadingSpinner.style.display = 'block';

    try {
        const q = query(collection(db, "applications"), where("studentId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            noAppsMsg.style.display = 'block';
            loadingSpinner.style.display = 'none';
            return;
        }

        appsContainer.innerHTML = '';
        
        for (const application of querySnapshot.docs) {
            const appData = application.data();
            
            // Fetch job details
            const jobRef = doc(db, "jobs", appData.jobId);
            const jobSnap = await getDoc(jobRef);
            
            if (jobSnap.exists()) {
                const job = jobSnap.data();
                
                const card = document.createElement('div');
                card.className = 'job-card';
                
                let badgeClass = 'tag-yellow'; // Applied
                if (appData.status === 'Accepted') badgeClass = 'tag-green';
                if (appData.status === 'Rejected') badgeClass = 'tag-red';

                card.innerHTML = `
                    <div class="job-title">${job.title}</div>
                    <div class="job-meta">
                        <span class="tag ${badgeClass}">Status: ${appData.status || 'Applied'}</span>
                        <span class="tag">Applied: ${appData.appliedAt.toDate().toLocaleDateString()}</span>
                    </div>
                `;
                appsContainer.appendChild(card);
            }
        }
    } catch (error) {
        appsContainer.innerHTML = '<p>Error loading applications.</p>';
        console.error(error);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

navLogout?.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        window.location.href = "index.html";
    });
});
