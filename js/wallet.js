import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

const navLogout = document.getElementById('nav-logout');
const loadingSpinner = document.getElementById('loading-spinner');
const balanceEl = document.getElementById('wallet-balance');
const pendingEl = document.getElementById('wallet-pending');
const totalEl = document.getElementById('wallet-total');
const tasksEl = document.getElementById('wallet-tasks');
const historyEl = document.getElementById('wallet-history');
const payoutBtn = document.getElementById('request-payout');

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = user;
    await loadWallet();
});

async function loadWallet() {
    if (loadingSpinner) loadingSpinner.style.display = 'block';

    try {
        const q = query(collection(db, 'applications'), where('studentId', '==', currentUser.uid));
        const appsSnap = await getDocs(q);

        let totalEarned = 0;
        let pending = 0;
        let completed = 0;
        let history = [];

        for (const appDoc of appsSnap.docs) {
            const app = appDoc.data();
            if (!app.jobId) continue;

            const jobSnap = await getDoc(doc(db, 'jobs', app.jobId));
            if (!jobSnap.exists()) continue;

            const job = jobSnap.data();
            const amount = Number(job.payment || 0);

            if (app.status === 'Accepted') {
                totalEarned += isNaN(amount) ? 0 : amount;
                completed += 1;
                history.push({ title: job.title, amount, status: 'Approved', date: app.appliedAt?.toDate ? app.appliedAt.toDate() : new Date() });
            }

            if (app.status === 'Applied') {
                pending += isNaN(amount) ? 0 : amount;
            }
        }

        const available = Math.max(totalEarned - 0, 0);

        if (balanceEl) balanceEl.innerText = `$${available}`;
        if (pendingEl) pendingEl.innerText = `$${pending}`;
        if (totalEl) totalEl.innerText = `$${totalEarned}`;
        if (tasksEl) tasksEl.innerText = completed;

        if (historyEl) {
            historyEl.innerHTML = history.length
                ? history.slice(0, 5).map(item => `
                    <div class="money-row">
                        <div>
                            <strong>${item.title}</strong><br>
                            <span class="subtle-text">${item.date.toLocaleDateString()}</span>
                        </div>
                        <span class="tag tag-green">$${item.amount}</span>
                    </div>
                `).join('')
                : '<p class="subtle-text">No approved earnings yet.</p>';
        }
    } catch (error) {
        console.error('Wallet load error:', error);
        if (historyEl) historyEl.innerHTML = '<p class="subtle-text">Unable to load wallet data.</p>';
    } finally {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

payoutBtn?.addEventListener('click', async () => {
    if (!currentUser) return;

    try {
        await addDoc(collection(db, 'notifications'), {
            userId: currentUser.uid,
            message: 'Payout requested successfully. The admin will review your transfer request shortly.',
            read: false,
            timestamp: new Date()
        });
        alert('Payout request sent successfully.');
    } catch (error) {
        console.error('Payout error:', error);
        alert('Could not request payout right now.');
    }
});

navLogout?.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
});
