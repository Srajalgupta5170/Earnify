import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const jobsContainer = document.getElementById('posted-jobs-container');
const loadingSpinner = document.getElementById('loading-spinner');
const noJobsMsg = document.getElementById('no-jobs-msg');
const navLogout = document.getElementById('nav-logout');
const verificationStatus = document.getElementById('verification-status');
const verifyBtn = document.getElementById('verify-btn');

// Analytics Cards
const totalJobsEl = document.getElementById('total-jobs-count');
const totalAppsEl = document.getElementById('total-apps-count');
const ratioAppsEl = document.getElementById('accept-ratio-count');

let currentUser = null;

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
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            updateVerificationUI({
                verified: Boolean(userData.verified),
                requested: Boolean(userData.verificationRequested)
            });
        }
        
        if (docSnap.exists() && docSnap.data().role !== 'recruiter') {
            alert("Only recruiters can access this dashboard.");
            window.location.href = "index.html";
        } else {
            loadPostedJobs();
        }
    } else {
        window.location.href = "login.html";
    }
});

async function loadPostedJobs() {
    loadingSpinner.style.display = 'block';

    try {
        const q = query(collection(db, "jobs"), where("recruiterId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        let globalJobCount = querySnapshot.size;
        let globalAppCount = 0;
        let globalAcceptedCount = 0;
        let globalRejectedCount = 0;
        let verifiedJobs = 0;

        if (querySnapshot.empty) {
            noJobsMsg.style.display = 'block';
            loadingSpinner.style.display = 'none';
            if (totalJobsEl) totalJobsEl.innerText = '0';
            return;
        }

        jobsContainer.innerHTML = '';
        
        for (const jobDoc of querySnapshot.docs) {
            const jobData = jobDoc.data();
            const jobId = jobDoc.id;
            if (jobData.recruiterVerified || jobData.verified) verifiedJobs++;
            
            // Count applicants
            const appsQuery = query(collection(db, "applications"), where("jobId", "==", jobId));
            const appsSnapshot = await getDocs(appsQuery);
            const applicantCount = appsSnapshot.size;
            
            globalAppCount += applicantCount;

            // Get applicants details
            let applicantsHTML = '<div class="applicants-list" style="margin-top:1rem;"><h4>Applicants:</h4>';
            if (appsSnapshot.empty) {
                applicantsHTML += '<p style="color:#777; font-size:0.9rem;">No students have applied yet.</p>';
            } else {
                appsSnapshot.forEach(appDoc => {
                    const appData = appDoc.data();
                    const appId = appDoc.id;
                    const status = appData.status || 'Applied';
                    
                    if (status === 'Accepted') globalAcceptedCount++;
                    if (status === 'Rejected') globalRejectedCount++;
                    
                    let badgeClass = 'tag-yellow'; 
                    if (status === 'Accepted') badgeClass = 'tag-green';
                    if (status === 'Rejected') badgeClass = 'tag-red';

                    applicantsHTML += `
                        <div class="applicant-item" style="display:flex; justify-content:space-between; align-items:center; padding:0.8rem; background:#f9f9f9; border-radius:4px; margin-top:0.5rem; border:1px solid #ddd;">
                            <div>
                                <strong>${appData.studentEmail}</strong> <br>
                                <span class="tag ${badgeClass}" id="status-${appId}">Status: ${status}</span>
                            </div>
                            <div style="display:flex; gap:0.5rem;">
                                ${status === 'Applied' ? `
                                    <button class="btn btn-secondary update-status-btn" data-appid="${appId}" data-jobid="${jobId}" data-status="Accepted" data-studentid="${appData.studentId}" data-jobtitle="${jobData.title}" style="background:#28a745; padding:0.4rem 0.8rem;">Accept</button>
                                    <button class="btn btn-secondary update-status-btn" data-appid="${appId}" data-jobid="${jobId}" data-status="Rejected" data-studentid="${appData.studentId}" data-jobtitle="${jobData.title}" style="background:#dc3545; padding:0.4rem 0.8rem;">Reject</button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
            }
            applicantsHTML += '</div>';
            
            const card = document.createElement('div');
            card.className = 'job-card';
            card.innerHTML = `
                <div class="job-title">${jobData.title} <span class="tag tag-yellow">${jobData.urgency}</span></div>
                <div class="job-meta">
                    <span class="tag">Total Applications: ${applicantCount}</span>
                    <span class="tag">${jobData.category}</span>
                    <span class="tag ${jobData.recruiterVerified || jobData.verified ? 'tag-green' : ''}">${jobData.recruiterVerified || jobData.verified ? 'Verified employer' : 'Employer'}</span>
                </div>
                <div class="job-desc">${jobData.description}</div>
                <hr style="border:0; border-top:1px solid #eee; margin: 1rem 0;">
                ${applicantsHTML}
            `;
            jobsContainer.appendChild(card);
        }

        // Render analytics dashboard
        if (totalJobsEl) totalJobsEl.innerText = globalJobCount;
        if (totalAppsEl) totalAppsEl.innerText = globalAppCount;
        if (ratioAppsEl) ratioAppsEl.innerText = `${globalAcceptedCount} / ${globalRejectedCount}`;

        const verifiedTag = document.createElement('div');
        verifiedTag.className = 'stat-card';
        verifiedTag.innerHTML = `<h3>Verified Jobs</h3><p>${verifiedJobs}</p>`;
        const cards = document.querySelector('.analytics-cards');
        if (cards && !cards.querySelector('[data-verified-jobs]')) {
            verifiedTag.setAttribute('data-verified-jobs', 'true');
            cards.appendChild(verifiedTag);
        }

        // Attach listeners for Accept/Reject buttons
        document.querySelectorAll('.update-status-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.target;
                const appId = button.getAttribute('data-appid');
                const jobId = button.getAttribute('data-jobid');
                const newStatus = button.getAttribute('data-status');
                const studentId = button.getAttribute('data-studentid');
                const jobTitle = button.getAttribute('data-jobtitle');
                
                try {
                    const appRef = doc(db, "applications", appId);
                    await updateDoc(appRef, { status: newStatus });
                    
                    // Create Notification
                    await addDoc(collection(db, "notifications"), {
                        userId: studentId,
                        message: `Your application for "${jobTitle}" has been ${newStatus.toLowerCase()}.`,
                        read: false,
                        timestamp: new Date()
                    });

                    const chatQuery = query(collection(db, "messages"), where("jobId", "==", jobId), where("participants", "array-contains", studentId));
                    const chatSnapshot = await getDocs(chatQuery);
                    if (!chatSnapshot.empty) {
                        const existingChat = chatSnapshot.docs[0];
                        await addDoc(collection(db, "messages", existingChat.id, "thread"), {
                            text: `Your application has been ${newStatus.toLowerCase()} for ${jobTitle}.`,
                            senderId: currentUser.uid,
                            timestamp: new Date()
                        });
                        await updateDoc(doc(db, "messages", existingChat.id), {
                            lastMessage: `Your application has been ${newStatus.toLowerCase()} for ${jobTitle}.`,
                            updatedAt: new Date()
                        });
                    }

                    // Update UI locally without reloading
                    const statusSpan = document.getElementById(`status-${appId}`);
                    statusSpan.innerText = `Status: ${newStatus}`;
                    if (newStatus === 'Accepted') statusSpan.className = 'tag tag-green';
                    if (newStatus === 'Rejected') statusSpan.className = 'tag tag-red';
                    
                    // Hide action buttons for this applicant
                    button.parentElement.innerHTML = '';
                    
                } catch (error) {
                    console.error('Application status update failed:', error);
                    alert('Failed to update status. Please confirm your Firestore rules are published and that you are still signed in as the recruiter for this job.');
                }
            });
        });

    } catch (error) {
        jobsContainer.innerHTML = '<p>Error loading jobs.</p>';
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