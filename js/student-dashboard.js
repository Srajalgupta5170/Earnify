import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const appsContainer = document.getElementById('applications-container');
const loadingSpinner = document.getElementById('loading-spinner');
const noAppsMsg = document.getElementById('no-apps-msg');
const navLogout = document.getElementById('nav-logout');
const totalAppsEl = document.getElementById('student-total-apps');
const acceptedAppsEl = document.getElementById('student-accepted-apps');
const pendingAppsEl = document.getElementById('student-pending-apps');
const walletEl = document.getElementById('student-wallet');
const verificationStatus = document.getElementById('verification-status');
const verifyBtn = document.getElementById('verify-btn');

let currentUser = null;
const ADMIN_EMAILS = ['harshit@gmail.com'];

function isAdminEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email.trim().toLowerCase());
}

function updateVerificationUI({ verified, requested }) {
    if (!verificationStatus || !verifyBtn) return;

    if (verified) {
        verificationStatus.innerText = 'Status: Verified';
        verifyBtn.innerText = 'Verified';
        verifyBtn.disabled = true;
    } else if (requested) {
        verificationStatus.innerText = 'Status: Pending Admin Approval';
        verifyBtn.innerText = 'Requested';
        verifyBtn.disabled = true;
    } else {
        verificationStatus.innerText = 'Status: Not Verified';
        verifyBtn.innerText = 'Request Verification';
        verifyBtn.disabled = false;
    }
}

verifyBtn?.addEventListener('click', async () => {
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            verificationRequested: true,
            verified: false,
            verificationRequestedAt: new Date()
        });
        updateVerificationUI({ verified: false, requested: true });
        alert('Your verification request has been sent. Admin approval is pending.');
    } catch (error) {
        console.error('Verification request failed:', error);
        alert('Verification request failed. Please try again.');
    }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;

        if (isAdminEmail(user.email)) {
            window.location.href = 'admin-dashboard.html';
            return;
        }

        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const userData = docSnap.data();
            updateVerificationUI({
                verified: Boolean(userData.verified),
                requested: Boolean(userData.verificationRequested)
            });
        }
        
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

        let total = 0;
        let accepted = 0;
        let pending = 0;
        let wallet = 0;

        if (querySnapshot.empty) {
            noAppsMsg.style.display = 'block';
            loadingSpinner.style.display = 'none';
            if (totalAppsEl) totalAppsEl.innerText = '0';
            if (acceptedAppsEl) acceptedAppsEl.innerText = '0';
            if (pendingAppsEl) pendingAppsEl.innerText = '0';
            if (walletEl) walletEl.innerText = '$0';
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
                total++;
                if (appData.status === 'Accepted') {
                    accepted++;
                    const payout = Number(job.payment || 0);
                    wallet += isNaN(payout) ? 0 : payout;
                }
                if (appData.status === 'Applied') pending++;
                
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
                        <span class="tag">${job.taskCategory || job.category || 'Local'}</span>
                        <span class="tag">💰 $${job.payment || 0}</span>
                    </div>
                `;
                appsContainer.appendChild(card);
            }
        }

        if (totalAppsEl) totalAppsEl.innerText = total;
        if (acceptedAppsEl) acceptedAppsEl.innerText = accepted;
        if (pendingAppsEl) pendingAppsEl.innerText = pending;
        if (walletEl) walletEl.innerText = `$${wallet}`;
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
