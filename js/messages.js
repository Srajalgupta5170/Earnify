import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, serverTimestamp, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

const conversationList = document.getElementById('conversation-list');
const chatThread = document.getElementById('chat-thread');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const navLogout = document.getElementById('nav-logout');

let currentUser = null;
let activeChat = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = user;
    await loadConversations();
    if (!activeChat) {
        const first = conversationList?.querySelector('.conversation-item');
        if (first) first.click();
    }
});

async function loadConversations() {
    if (!conversationList) return;

    try {
        const q = query(collection(db, 'messages'), where('participants', 'array-contains', currentUser.uid));
        const snapshot = await getDocs(q);
        const conversations = [];

        for (const messageDoc of snapshot.docs) {
            const data = messageDoc.data();
            const otherUserId = data.participants.find(id => id !== currentUser.uid);
            if (!otherUserId) continue;

            const userSnap = await getDoc(doc(db, 'users', otherUserId));
            const userData = userSnap.exists() ? userSnap.data() : null;
            conversations.push({
                id: messageDoc.id,
                otherUserId,
                otherName: userData?.fullName || data.jobTitle || 'Support Team',
                lastMessage: data.lastMessage || 'No messages yet',
                jobTitle: data.jobTitle || 'Task chat'
            });
        }

        conversationList.innerHTML = '<h3>Chats</h3>';

        if (!conversations.length) {
            conversationList.innerHTML += '<p class="subtle-text">No conversations yet.</p>';
            return;
        }

        conversations.forEach((chat) => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.dataset.chatId = chat.id;
            item.dataset.otherId = chat.otherUserId;
            item.innerHTML = `<strong>${chat.otherName}</strong><br><span class="subtle-text">${chat.jobTitle}</span><br><span class="subtle-text">${chat.lastMessage}</span>`;
            item.addEventListener('click', () => {
                activeChat = chat;
                document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                renderChat(chat);
            });
            conversationList.appendChild(item);
        });
    } catch (error) {
        console.error('Conversation load error:', error);
    }
}

async function renderChat(chat) {
    if (!chatThread) return;

    chatThread.innerHTML = '<p class="subtle-text">Loading messages...</p>';

    try {
        const q = query(collection(db, 'messages', chat.id, 'thread'));
        const snapshot = await getDocs(q);
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        chatThread.innerHTML = '';
        messages.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;
            bubble.innerText = msg.text;
            chatThread.appendChild(bubble);
        });

        if (!messages.length) {
            chatThread.innerHTML = '<p class="subtle-text">Start the conversation.</p>';
        }
    } catch (error) {
        console.error('Chat render error:', error);
    }
}

messageForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeChat || !messageInput) return;

    const text = messageInput.value.trim();
    if (!text) return;

    try {
        const messageRef = collection(db, 'messages', activeChat.id, 'thread');
        await addDoc(messageRef, {
            text,
            senderId: currentUser.uid,
            timestamp: new Date()
        });

        const chatRef = doc(db, 'messages', activeChat.id);
        await updateDoc(chatRef, {
            lastMessage: text,
            updatedAt: new Date()
        });

        messageInput.value = '';
        await renderChat(activeChat);
    } catch (error) {
        console.error('Failed to send message:', error);
        alert('Message could not be sent.');
    }
});

navLogout?.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
});
