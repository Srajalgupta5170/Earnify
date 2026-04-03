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
        const card = document.createElement('div');
        card.className = `job-card ${job.urgency === 'Urgent' ? 'urgent' : ''}`;
        card.innerHTML = `
            <div class="job-header">
                <h3>${job.title}</h3>
                <button class="save-btn saved" data-id="${job.id}">❤️</button>
            </div>
            <p><strong>Company:</strong> ${job.companyName}</p>
            <p><strong>Type:</strong> ${job.type}</p>
            <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
            <p><strong>Urgency:</strong> <span class="urgency-badge">${job.urgency}</span></p>
            <p>${job.description}</p>
            <button class="apply-btn" data-id="${job.id}">Apply</button>
            <button class="remove-saved-btn" style="background:#ff4d4d; color:white; border:none; padding:8px 12px; margin-left:10px; cursor:pointer;" data-saved-id="${job.savedId}">Remove</button>
        `;
        jobsContainer.appendChild(card);
    });

    // We don't implement handleApply again, we rely on app.js for applying
    
    // Implementing remove from saved list
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
