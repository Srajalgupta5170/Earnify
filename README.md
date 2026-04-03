# 🎓 CampusEarn | The Smart Job Matching Platform for Students

[![Live Demo](https://img.shields.io/badge/Demo-Live_Site-success?style=for-the-badge&logo=netlify)](https://campusearn.netlify.app)
[![Tech Stack: Vanilla JS](https://img.shields.io/badge/Frontend-ES6_JavaScript-f7df1e?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tech Stack: Firebase](https://img.shields.io/badge/Backend-Firebase_v10-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **CampusEarn** is a robust, two-sided marketplace engineered to bridge the gap between college students seeking flexible local income and businesses needing immediate micro-task fulfillment. Constructed entirely with **Vanilla JavaScript (ES6 Modules)** and **Firebase**, it demonstrates a profound understanding of real-time multi-collection state management without relying on heavy frontend frameworks.

![CampusEarn Banner](https://via.placeholder.com/1000x300?text=CampusEarn+-+Connecting+Students+with+Local+Opportunities)

---

## 📌 The Problem
College students struggle to find flexible, short-term, or urgently needed local jobs that contour to their erratic academic schedules. Simultaneously, local businesses face friction hiring students for micro-tasks because traditional corporate job boards are excessively formal and slow. 

## 🎯 The Solution
**CampusEarn** resolves this discrepancy by functioning as a localized, urgency-driven smart-matching platform. It prioritizes geographic proximity and job urgency, alerting students exactly when high-priority roles appear and ensuring businesses can fill slots within hours, not weeks.

## ✨ Core Architecture & Features
- 🔐 **Role-Based Access Control (RBAC)**: Distinct, isolated dashboard experiences for `Students` and `Recruiters`, fully secured via Firebase Authentication and strict server-side Firestore Rules.
- 🧠 **Smart Job Matching Algorithm**: Cross-references the student's registered location with active job postings, dynamically sorting results by both geographic relevance and "Urgency" flags.
- ⚡ **Real-Time Notification Engine**: Leveraging Firestore `onSnapshot`, students receive instantaneous dropdown alerts the millisecond a recruiter accepts or rejects their application. No refreshing required.
- 📊 **Recruiter Analytics Dashboard**: Live metrics rendering total postings, applications received, and acceptance/rejection rates without unnecessary database reads.
- 🔖 **Bookmark & Pipeline Management**: A frictionless UI for students to save jobs to a dedicated board, paired with background cleanup sweeps if a recruiter deletes a bookmarked post.

## 🛠️ Tech Stack & Tooling
*   **Frontend Architecture:** HTML5, CSS3, Vanilla JavaScript (ES6 Modules, strict DOM Manipulation)
*   **Backend Services:** Firebase Authentication, Cloud Firestore (NoSQL)
*   **Version Control:** Git, GitHub
*   **Deployment & CI/CD:** Netlify / Vercel

## 🗄️ Database Schema Design (Firestore)
The database operates on a highly optimized, denormalized NoSQL multi-collection architecture to drastically reduce read latency:
1. `users` `{ uid, email, role (student/recruiter), location, createdAt }`
2. `jobs` `{ title, description, companyName, location, category, urgency, recruiterId, createdAt }`
3. `applications` `{ jobId, studentId, recruiterId, studentEmail, status (Applied/Accepted/Rejected), appliedAt }`
4. `savedJobs` `{ jobId, userId, savedAt }`
5. `notifications` `{ userId, message, read, timestamp }`

---

## ⚙️ Setup & Local Development
1. Clone the repository: `git clone https://github.com/yourusername/CampusEarn.git`
2. Go to the [Firebase Console](https://console.firebase.google.com/), create a project, and enable **Authentication** (Email/Password) and **Firestore**.
3. Copy your Firebase config object and paste it into `js/firebase-config.js`. 
   > *Note on API Keys*: Because this is a client-side Firebase app, these keys will be public. This is completely standard and safe **as long as** your Firestore Security Rules are strictly configured.
4. Deploy the Security rules from `firestore.rules` into your Firestore Rules tab.
5. Run locally via Python: `python -m http.server 3000` (or utilize the VS Code Live Server extension).
6. Open `http://localhost:3000` in your browser.

## 🚀 Deployment Pipeline (Netlify or Vercel)
Due to the lightweight, modular architecture (zero Webpack/Vite overhead), deployment is instantaneous:
1. Push your completed project to a GitHub repository.
2. Link the repository to **Vercel** or **Netlify**.
3. Keep the Root/Build commands empty. Deploy!

## 📈 Roadmap & Future Scaling
- **In-App Messaging**: Socket-based chat interface scaling off Firestore real-time rules.
- **Resume Uploading**: Integrating Firebase Cloud Storage to parse and securely host PDF resumes using signed URLs.
