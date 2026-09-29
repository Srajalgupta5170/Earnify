import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const jobsContainer = document.getElementById('jobs-container');
const loadingSpinner = document.getElementById('loading-spinner');
const noJobsMsg = document.getElementById('no-jobs-msg');

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadSavedJobs();
    } else {
        window.location.href = "login.html";
    }
});

async function loadSavedJobs() {
    if(loadingSpinner) loadingSpinner.style.display = 'block';
    
    try {
        const q = query(collection(db, "savedJobs"), where("userId", "==", currentUser.uid));
        const savedSnap = await getDocs(q);
        
        if (savedSnap.empty) {
            jobsContainer.innerHTML = '';
            if(loadingSpinner) loadingSpinner.style.display = 'none';
            if(noJobsMsg) noJobsMsg.style.display = 'block';
            return;
        }

        const savedJobs = [];
        
        for (const savedDoc of savedSnap.docs) {
            const data = savedDoc.data();
            const jobRef = doc(db, "jobs", data.jobId);
            const jobSnap = await getDoc(jobRef);
            
            if (jobSnap.exists()) {
                savedJobs.push({ 
                    savedId: savedDoc.id, 
                    id: jobSnap.id, 
                    ...jobSnap.data() 
                });
            } else {
                // Background cleanup: if the job was deleted, might as well delete the save reference
                await deleteDoc(doc(db, "savedJobs", savedDoc.id)).catch(console.error);
            }
        }
        
        renderSavedJobs(savedJobs);
        
    } catch (err) {
        console.error('Error fetching saved jobs', err);
        if(loadingSpinner) loadingSpinner.style.display = 'none';
        jobsContainer.innerHTML = '<p>Error loading saved jobs.</p>';
    }
}

function renderSavedJobs(jobs) {
    if(loadingSpinner) loadingSpinner.style.display = 'none';
    if(noJobsMsg) noJobsMsg.style.display = 'none';
    jobsContainer.innerHTML = '';

    if (jobs.length === 0) {
        if(noJobsMsg) noJobsMsg.style.display = 'block';
        return;
    }

    jobs.forEach(job => {
        const jobData = {
            ...job,
            companyName: job.companyName || 'Company',
            type: job.type || 'Part-time',
            location: job.location || 'Remote',
            urgency: job.urgency || 'Normal',
            description: job.description || 'No description provided.'
        };

        const card = document.createElement('div');
        card.className = `job-card ${jobData.urgency === 'Urgent' ? 'urgent' : ''}`;
        card.innerHTML = `
            <div class="job-header">
                <div>
                    <h3>${jobData.title}</h3>
                    <div class="job-company">${jobData.companyName}</div>
                </div>
                <button class="save-btn saved" data-id="${jobData.id}">❤️</button>
            </div>
            <div class="job-meta">
                <span class="tag">${jobData.category || 'Local'}</span>
                <span class="tag">🕒 ${jobData.type}</span>
                <span class="tag">📍 ${jobData.location}</span>
                <span class="tag">💰 $${jobData.payment ?? 'Negotiable'}</span>
                <span class="tag tag-yellow">${jobData.urgency}</span>
            </div>
            <p>${jobData.description}</p>
            <div class="job-actions">
                <button class="apply-btn" data-id="${jobData.id}">Apply</button>
                <button class="remove-saved-btn" data-saved-id="${jobData.savedId}">Remove</button>
            </div>
        `;
        jobsContainer.appendChild(card);
    });

    document.querySelectorAll('.remove-saved-btn').forEach(btn => {
        btn.addEventListener('click', handleRemoveSaved);
    });
}

async function handleRemoveSaved(e) {
    const btn = e.target;
    const savedId = btn.getAttribute('data-saved-id');
    
    try {
        await deleteDoc(doc(db, "savedJobs", savedId));
        alert("Job removed from saved list.");
        // re-render list
        loadSavedJobs();
    } catch (err) {
        console.error(err);
        alert("Failed to remove saved job.");
    }
}
