import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, addDoc, query, where, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const navLogin = document.getElementById('nav-login');
const navLogout = document.getElementById('nav-logout');
const navPostJob = document.getElementById('nav-post-job');
const jobsContainer = document.getElementById('jobs-container');
const recommendedContainer = document.getElementById('recommended-container');
const recommendedSection = document.getElementById('recommended-section');

const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const urgencyFilter = document.getElementById('urgency-filter');
const locationFilter = document.getElementById('location-filter');
const loadingSpinner = document.getElementById('loading-spinner');
const noJobsMsg = document.getElementById('no-jobs-msg');
const navStudentDash = document.getElementById('nav-student-dash');
const navRecruiterDash = document.getElementById('nav-recruiter-dash');
const navSavedJobs = document.getElementById('nav-saved-jobs');
const navIcons = document.getElementById('nav-icons');
const profilePanel = document.getElementById('profile-panel');
const profileSummary = document.getElementById('profile-summary');
const profileSkills = document.getElementById('profile-skills');
const profileMatchBadge = document.getElementById('profile-match-badge');
const editProfileBtn = document.getElementById('edit-profile-btn');

let allJobs = [];
let currentUser = null;
let userRole = null;
let userLocation = null;
let userSkills = [];

// Auth State Check
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        navLogin.style.display = 'none';
        navLogout.style.display = 'inline-block';
        if(navIcons) navIcons.style.display = 'flex';
        
        // Fetch User Role and Location
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            userRole = docSnap.data().role;
            userLocation = docSnap.data().location;
            userSkills = parseSkills(docSnap.data().skills);

            if (userRole === 'recruiter') {
                navPostJob.style.display = 'inline-block';
                if(navRecruiterDash) navRecruiterDash.style.display = 'inline-block';
            } else if (userRole === 'student') {
                if(navStudentDash) navStudentDash.style.display = 'inline-block';
                if(navSavedJobs) navSavedJobs.style.display = 'inline-block';
            }
        }

        updateProfilePanel();
        bindProfileEditor();
        
        // Initialize Notifications
        initNotifications();

        // Re-render to show recommended jobs and correct save states if applicable
        if (allJobs.length > 0) {
            await fetchSavedJobs();
            renderRecommendedJobs();
            renderJobs(); // Ensure saved states are rendered across all jobs
        }
        
    } else {
        currentUser = null;
        userRole = null;
        userLocation = null;
        userSkills = [];
        savedJobIds.clear();
        navLogin.style.display = 'inline-block';
        navLogout.style.display = 'none';
        navPostJob.style.display = 'none';
        if(navIcons) navIcons.style.display = 'none';
        if(navStudentDash) navStudentDash.style.display = 'none';
        if(navRecruiterDash) navRecruiterDash.style.display = 'none';
        if(navSavedJobs) navSavedJobs.style.display = 'none';
        if(recommendedSection) recommendedSection.style.display = 'none';
        if(allJobs.length > 0) renderJobs(); // Render logged out mode
    }
});

let savedJobIds = new Set();

function parseSkills(skills) {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills.map(skill => String(skill).trim()).filter(Boolean);
    return String(skills)
        .split(',')
        .map(skill => skill.trim())
        .filter(Boolean);
}

function getSkillMatchScore(job) {
    if (!userSkills.length) return 0;

    const jobSkills = Array.isArray(job.requiredSkills)
        ? job.requiredSkills
        : typeof job.requiredSkills === 'string'
            ? job.requiredSkills.split(',').map(skill => skill.trim()).filter(Boolean)
            : [];

    if (!jobSkills.length) return 0;

    const normalizedUserSkills = userSkills.map(skill => skill.toLowerCase());
    const matches = jobSkills.filter(skill => normalizedUserSkills.includes(String(skill).toLowerCase()));
    const score = (matches.length / jobSkills.length) * 100;
    return Math.round(score);
}

function updateProfilePanel() {
    if (!profilePanel) return;

    if (userRole !== 'student') {
        profilePanel.style.display = 'none';
        return;
    }

    const safeSkills = userSkills.length ? userSkills : ['Add skills to improve matching'];
    profilePanel.style.display = 'block';
    profileSummary.innerText = userSkills.length
        ? `Profile matched to ${allJobs.length || 0} jobs based on your skills, location, and urgency.`
        : 'Add your skills during signup to unlock job match recommendations.';
    profileSkills.innerHTML = safeSkills
        .slice(0, 6)
        .map(skill => `<span class="skill-pill">${skill}</span>`)
        .join('');

    if (userSkills.length) {
        profileMatchBadge.innerText = 'Skills active';
        profileMatchBadge.className = 'tag tag-green';
    } else {
        profileMatchBadge.innerText = 'Profile not ready';
        profileMatchBadge.className = 'tag tag-yellow';
    }
}

function bindProfileEditor() {
    if (!editProfileBtn) return;

    editProfileBtn.addEventListener('click', async () => {
        if (userRole !== 'student') return;

        const currentSkills = userSkills.join(', ');
        const newSkills = window.prompt('Update your skills (comma separated):', currentSkills);
        if (newSkills === null) return;

        const newBio = window.prompt('Update your short bio:', currentUser && currentUser.bio ? currentUser.bio : '');
        if (newBio === null) return;

        const cleanedSkills = parseSkills(newSkills);

        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                skills: cleanedSkills,
                bio: newBio.trim(),
                profileComplete: true
            });

            userSkills = cleanedSkills;
            currentUser.bio = newBio.trim();
            updateProfilePanel();
            renderRecommendedJobs();
            alert('Profile updated successfully.');
        } catch (error) {
            console.error('Profile update failed:', error);
            alert('Could not update profile.');
        }
    });
}

async function fetchSavedJobs() {
    if (userRole !== 'student') return;
    try {
        const q = query(collection(db, "savedJobs"), where("userId", "==", currentUser.uid));
        const snap = await getDocs(q);
        savedJobIds.clear();
        snap.forEach(doc => {
            savedJobIds.add(doc.data().jobId);
        });
    } catch(err) {
        console.error("Error fetching saved jobs", err);
    }
}

// Logout
navLogout?.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
        window.location.reload();
    });
});

// Fetch and Display Jobs
async function loadJobs() {
    if(jobsContainer) jobsContainer.innerHTML = '';
    if(loadingSpinner) loadingSpinner.style.display = 'block';
    if(noJobsMsg) noJobsMsg.style.display = 'none';
    
    try {
        const querySnapshot = await getDocs(collection(db, "jobs"));
        allJobs = [];
        querySnapshot.forEach((doc) => {
            allJobs.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort urgent jobs to the top
        allJobs.sort((a, b) => {
            if (a.urgency === 'Urgent' && b.urgency !== 'Urgent') return -1;
            if (a.urgency !== 'Urgent' && b.urgency === 'Urgent') return 1;
            return 0; // maintain relative order for others
        });

        renderJobs();
        renderRecommendedJobs();

    } catch (error) {
        if(jobsContainer) jobsContainer.innerHTML = '<p>Error loading jobs.</p>';
        console.error("Error loading jobs: ", error);
    } finally {
        if(loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

function renderJobs() {
    if(!jobsContainer) return;
    jobsContainer.innerHTML = '';
    
    // Get filter values
    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
    const catVal = categoryFilter ? categoryFilter.value : 'all';
    const urgVal = urgencyFilter ? urgencyFilter.value : 'all';
    const locVal = locationFilter ? locationFilter.value.toLowerCase() : '';

    const filteredJobs = allJobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchVal) || job.description.toLowerCase().includes(searchVal);
        const matchesCat = catVal === 'all' || job.category === catVal;
        const matchesUrg = urgVal === 'all' || job.urgency === urgVal;
        const matchesLoc = locVal === '' || (job.location && job.location.toLowerCase().includes(locVal));
        
        return matchesSearch && matchesCat && matchesUrg && matchesLoc;
    });

    if (filteredJobs.length === 0) {
        if(noJobsMsg) noJobsMsg.style.display = 'block';
        return;
    } else {
        if(noJobsMsg) noJobsMsg.style.display = 'none';
    }

    filteredJobs.forEach(job => {
        const jobCard = createJobCard(job);
        jobsContainer.appendChild(jobCard);
    });

    attachApplyListeners();
}

function renderRecommendedJobs() {
    if (!recommendedSection || !recommendedContainer) return;

    if (userRole !== 'student') {
        recommendedSection.style.display = 'none';
        return;
    }

    const scoredJobs = allJobs
        .map(job => ({
            ...job,
            matchScore: getSkillMatchScore(job),
            locationMatch: job.category === 'Online'
                ? true
                : Boolean(job.location && userLocation && job.location.toLowerCase().includes(userLocation.toLowerCase()))
        }))
        .filter(job => {
            if (userSkills.length) {
                return job.matchScore > 0 || job.locationMatch;
            }
            return job.locationMatch;
        })
        .sort((a, b) => {
            if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
            if (a.urgency === 'Urgent' && b.urgency !== 'Urgent') return -1;
            if (b.urgency === 'Urgent' && a.urgency !== 'Urgent') return 1;
            return 0;
        });

    if (!scoredJobs.length) {
        recommendedSection.style.display = 'none';
        return;
    }

    recommendedContainer.innerHTML = '';
    recommendedSection.style.display = 'block';

    scoredJobs.slice(0, 3).forEach(job => {
        const jobCard = createJobCard(job);
        recommendedContainer.appendChild(jobCard);
    });

    attachApplyListeners();
}

function normalizeJobData(job = {}) {
    const type = job.type || 'Part-time';
    const companyName = job.companyName || 'Company';
    const location = job.location || 'Remote';
    const title = job.title || 'Untitled Position';
    const description = job.description || 'No description provided.';
    const payment = job.payment ?? 'Negotiable';
    const urgency = job.urgency || 'Normal';
    const requiredSkills = Array.isArray(job.requiredSkills)
        ? job.requiredSkills
        : typeof job.requiredSkills === 'string'
            ? job.requiredSkills.split(',').map(skill => skill.trim()).filter(Boolean)
            : [];

    return { type, companyName, location, title, description, payment, urgency, requiredSkills };
}

function createJobCard(job) {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';

    const normalized = normalizeJobData(job);
    const matchScore = userRole === 'student' ? getSkillMatchScore(job) : 0;
    const taskCategory = job.taskCategory || 'Other';

    let urgencyClass = 'tag-yellow';
    if (normalized.urgency === 'Urgent') urgencyClass = 'tag-red';
    if (normalized.urgency === 'Flexible') urgencyClass = 'tag-green';

    const urgencyTag = `<span class="tag ${urgencyClass}">${normalized.urgency}</span>`;
    const locationTag = job.category === 'Local' ? `<span class="tag">📍 ${normalized.location}</span>` : `<span class="tag">🌐 Remote</span>`;
    const paymentTag = `<span class="tag">💰 $${normalized.payment}</span>`;
    const typeTag = `<span class="tag">🕒 ${normalized.type}</span>`;
    const recruiterVerified = job.recruiterVerified || false;
    const verifiedTag = recruiterVerified ? '<span class="tag tag-green">Verified employer</span>' : '<span class="tag">Employer</span>';
    const matchTag = userRole === 'student' && matchScore > 0
        ? `<span class="tag tag-green">Match ${matchScore}%</span>`
        : '';
    const skillsMarkup = normalized.requiredSkills.length
        ? `<div class="skill-list">${normalized.requiredSkills.slice(0, 4).map(skill => `<span class="skill-pill">${skill}</span>`).join('')}</div>`
        : '';

    const isSaved = savedJobIds.has(job.id);
    const saveClass = isSaved ? 'saved' : '';
    const saveIcon = userRole === 'student' ? `<button class="save-btn ${saveClass}" data-jobid="${job.id}">❤️</button>` : '';

    jobCard.innerHTML = `
        <div class="job-header">
            <div>
                <div class="job-title">${normalized.title}</div>
                <div class="job-company">${normalized.companyName}</div>
            </div>
            ${saveIcon}
        </div>
        <div class="job-meta">
            <span class="tag">${job.category || 'Local'}</span>
            <span class="tag">${taskCategory}</span>
            ${typeTag}
            ${locationTag}
            ${paymentTag}
            ${urgencyTag}
            ${verifiedTag}
            ${matchTag}
        </div>
        <div class="job-desc">${normalized.description}</div>
        ${skillsMarkup}
        <button class="btn apply-btn" data-id="${job.id}">Claim This Task</button>
    `;
    return jobCard;
}

function attachApplyListeners() {
    document.querySelectorAll('.apply-btn').forEach(btn => {
        btn.removeEventListener('click', handleApply); 
        btn.addEventListener('click', handleApply);
    });

    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.removeEventListener('click', handleSaveJob);
        btn.addEventListener('click', handleSaveJob);
    });
}

// Handle save/bookmark jobs
import { deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

async function handleSaveJob(e) {
    if (!currentUser || userRole !== 'student') return;

    const btn = e.target;
    const jobId = btn.getAttribute('data-jobid');
    const isCurrentlySaved = savedJobIds.has(jobId);

    try {
        if (isCurrentlySaved) {
            // Remove from saved
            const q = query(collection(db, "savedJobs"), where("userId", "==", currentUser.uid), where("jobId", "==", jobId));
            const snap = await getDocs(q);
            snap.forEach(async (docRef) => {
                await deleteDoc(doc(db, "savedJobs", docRef.id));
            });
            savedJobIds.delete(jobId);
            btn.classList.remove('saved');
        } else {
            // Add to saved
            await addDoc(collection(db, "savedJobs"), {
                userId: currentUser.uid,
                jobId: jobId,
                timestamp: new Date()
            });
            savedJobIds.add(jobId);
            btn.classList.add('saved');
        }
    } catch(err) {
        console.error("Error toggling save jobs:", err);
    }
}


// Initial Load
if (jobsContainer) {
    loadJobs();
}

// Attach Event Listeners to Filters
[searchInput, categoryFilter, urgencyFilter, locationFilter].forEach(el => {
    if (el) el.addEventListener('input', renderJobs);
});

// Handle apply
async function handleApply(e) {
    if (!currentUser) {
        alert("Please login as a student to apply.");
        window.location.href = "login.html";
        return;
    }
    
    if (userRole === 'recruiter') {
        alert("Recruiters cannot apply for jobs.");
        return;
    }

    const btn = e.target;
    const jobId = btn.getAttribute('data-id');

    try {
        const jobRef = doc(db, "jobs", jobId);
        const docSnap = await getDoc(jobRef);
        if(!docSnap.exists()){
            alert("Job not found.");
            return;
        }

        const jobData = docSnap.data();
        
        // Check for existing application
        const q = query(collection(db, "applications"), where("jobId", "==", jobId), where("studentId", "==", currentUser.uid));
        const existingDocs = await getDocs(q);
        if(!existingDocs.empty) {
            alert("You have already applied for this job.");
            return;
        }

        const applicationPayload = {
            jobId: jobId,
            studentId: currentUser.uid,
            studentEmail: currentUser.email,
            status: "Applied",
            appliedAt: new Date(),
            recruiterId: jobData.recruiterId,
            jobTitle: jobData.title,
            payment: jobData.payment || 0
        };

        const appDoc = await addDoc(collection(db, "applications"), applicationPayload);

        const recruiterId = jobData.recruiterId;
        const participants = [currentUser.uid, recruiterId].filter(Boolean);
        const chatQuery = query(collection(db, "messages"), where("jobId", "==", jobId), where("participants", "array-contains-any", participants));
        const existingChats = await getDocs(chatQuery);

        if (existingChats.empty) {
            const chatRef = await addDoc(collection(db, "messages"), {
                participants,
                jobId,
                jobTitle: jobData.title,
                lastMessage: `Application received for ${jobData.title}.`,
                updatedAt: new Date(),
                createdAt: new Date(),
                recruiterId
            });

            await addDoc(collection(db, "messages", chatRef.id, "thread"), {
                text: `Hi! I applied for your task: ${jobData.title}.`,
                senderId: currentUser.uid,
                timestamp: new Date()
            });
        }

        await addDoc(collection(db, "notifications"), {
            userId: currentUser.uid,
            message: `Your application for "${jobData.title}" has been submitted successfully.`,
            read: false,
            timestamp: new Date()
        });

        alert("Application submitted successfully!");
        btn.innerText = "Applied";
        btn.disabled = true;

        if (typeof window.initNotifications === 'function') {
            window.initNotifications();
        }
    } catch (error) {
        alert("Error applying to job.");
        console.error(error);
    }
}

// Initialize Notifications System
window.initNotifications = function() {
    if (!currentUser) return; // Only process if user exists

    const bellIcon = document.getElementById("bell-icon");
    const notifBadge = document.getElementById("notif-badge");
    const notifDropdown = document.getElementById("notif-dropdown");

    if (!bellIcon || !notifBadge || !notifDropdown) return;

    // Set up toggle logic
    bellIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.style.display = notifDropdown.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (!bellIcon.contains(e.target) && !notifDropdown.contains(e.target)) {
            notifDropdown.style.display = 'none';
        }
    });

    // Realtime Listener for Firestore path
    const q = query(collection(db, "notifications"), where("userId", "==", currentUser.uid));
    
    onSnapshot(q, (snapshot) => {
        notifDropdown.innerHTML = '';
        let unreadCount = 0;
        let hasNotifications = false;

        snapshot.forEach((docSnap) => {
            hasNotifications = true;
            const data = docSnap.data();
            const id = docSnap.id;

            if (!data.read) unreadCount++;

            const item = document.createElement('div');
            item.className = `notif-item ${!data.read ? 'unread' : ''}`;
            item.style.padding = '10px';
            item.style.borderBottom = '1px solid #eee';
            item.style.cursor = 'pointer';
            if (!data.read) item.style.backgroundColor = '#f0f8ff';
            
            // Format date if needed, fallback to current
            const dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : new Date().toLocaleDateString();

            item.innerHTML = `
                <p style="margin: 0; font-size: 0.9rem;">${data.message}</p>
                <small style="color:#aaa; font-size: 0.75rem;">${dateStr}</small>
            `;
            
            // Mark as read upon clicking item
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!data.read) {
                    try {
                        await updateDoc(doc(db, "notifications", id), { read: true });
                    } catch (err) {
                        console.error('Error updating notification', err);
                    }
                }
            });

            notifDropdown.appendChild(item);
        });
        
        if (!hasNotifications) {
            notifDropdown.innerHTML = '<div class="notif-item" style="padding:10px;text-align:center;color:#666;">No notifications yet.</div>';
        }

        // Update badge
        if (unreadCount > 0) {
            notifBadge.innerText = unreadCount;
            notifBadge.style.display = 'inline-block';
        } else {
            notifBadge.style.display = 'none';
        }
    });
};
