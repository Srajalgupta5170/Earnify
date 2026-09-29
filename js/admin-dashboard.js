import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const verificationList = document.getElementById('verification-list');
const navLogout = document.getElementById('nav-logout');
const ADMIN_EMAILS = ['harshit@gmail.com'];

function isAdminEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email.trim().toLowerCase());
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const userDoc = await getDocs(collection(db, 'users'));
    const currentUserDoc = userDoc.docs.find(docSnap => docSnap.id === user.uid);
    const isAuthorizedAdmin = currentUserDoc?.data()?.role === 'admin' || isAdminEmail(user.email);

    if (!isAuthorizedAdmin) {
        alert('Only admins can access this page.');
        window.location.href = 'index.html';
        return;
    }

    loadPendingVerificationRequests();
});

async function loadPendingVerificationRequests() {
    const usersSnap = await getDocs(collection(db, 'users'));
    const pendingUsers = usersSnap.docs.filter(docSnap => {
        const data = docSnap.data();
        return data.role === 'student' && data.verificationRequested === true && data.verified !== true;
    });

    if (!verificationList) return;

    if (pendingUsers.length === 0) {
        verificationList.innerHTML = '<p>No student verification requests right now.</p>';
        return;
    }

    verificationList.innerHTML = pendingUsers.map(docSnap => {
        const user = docSnap.data();
        return `
            <div class="job-card" style="margin-top:1rem;">
                <div class="job-title">${user.fullName || 'Student'}</div>
                <div class="job-meta">
                    <span class="tag">${user.email || 'No email'}</span>
                    <span class="tag">${user.location || 'Location not added'}</span>
                </div>
                <div class="job-desc">
                    <strong>Skills:</strong> ${user.skills || 'Not provided'}<br>
                    <strong>Bio:</strong> ${user.bio || 'No bio added'}
                </div>
                <div class="job-actions">
                    <button class="btn approve-btn" data-userid="${docSnap.id}">Approve</button>
                    <button class="btn btn-secondary reject-btn" data-userid="${docSnap.id}">Reject</button>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.approve-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const userId = button.dataset.userid;
            await updateDoc(doc(db, 'users', userId), {
                verified: true,
                verificationRequested: false,
                verificationStatus: 'verified',
                verifiedAt: new Date()
            });
            alert('Student verified successfully.');
            loadPendingVerificationRequests();
        });
    });

    document.querySelectorAll('.reject-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const userId = button.dataset.userid;
            await updateDoc(doc(db, 'users', userId), {
                verified: false,
                verificationRequested: false,
                verificationStatus: 'rejected',
                rejectedAt: new Date()
            });
            alert('Verification request rejected.');
            loadPendingVerificationRequests();
        });
    });
}

navLogout?.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
});
