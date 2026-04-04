# 🎓 Earnify | The Smart Job Matching Platform for Students

[![Live Demo](https://img.shields.io/badge/Demo-Live_Site-success?style=for-the-badge&logo=netlify)](https://Earnify.netlify.app)
[![Tech Stack: Vanilla JS](https://img.shields.io/badge/Frontend-ES6_JavaScript-f7df1e?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tech Stack: Firebase](https://img.shields.io/badge/Backend-Firebase_v10-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **Earnify** is a robust, two-sided marketplace engineered to bridge the gap between college students seeking flexible local income and businesses needing immediate micro-task fulfillment. This guide will walk you through the project structurally, step-by-step, making it extremely easy to understand, test, and deploy yourself!

![Earnify Banner](https://via.placeholder.com/1000x300?text=Earnify+-+Connecting+Students+with+Local+Opportunities)

---

## 📖 Table of Contents
1. [🧠 How the App Works (Step-by-Step User Flow)](#1-how-the-app-works-step-by-step-user-flow)
2. [✨ Features Overview](#2-features-overview)
3. [📂 Folder & Architecture Structure](#3-folder--architecture-structure)
4. [🗄️ Database Design Structure](#4-database-design-structure)
5. [⚙️ Detailed Setup Guide (Step-by-Step)](#5-detailed-setup-guide-step-by-step)
6. [🚀 Deployment Guide](#6-deployment-guide)

---

## 1. 🧠 How the App Works (Step-by-Step User Flow)

To understand Earnify, you just need to understand its two main users: **The Student** and **The Recruiter**.

### 💼 The Recruiter Flow:
1. **Sign Up / Login:** A local business owner creates an account and selects the `Recruiter` role.
2. **Post a Job:** They are securely routed to the Recruiter Dashboard. They fill out a form with a Job Title, Description, Location, and Urgency Level (e.g., *Normal* or *Urgent*).
3. **Review Applicants:** As students apply, the recruiter's Analytics Dashboard automatically updates. They can review applications and click **Accept** or **Reject**. 
4. **Trigger Notifications:** Clicking *Accept/Reject* instantly fires a backend process that generates a notification for the exact student who applied.

### 🎓 The Student Flow:
1. **Sign Up / Login:** A college student creates an account and specifies their city/campus location.
2. **Smart Dashboard:** The internal algorithm scans all jobs and pushes jobs matching their exact location—and flagged as *Urgent*—to the very top of their screen.
3. **Save or Apply:** The student can click the ❤️ icon to bookmark a job for later, or immediately click **Apply**.
4. **Live Notifications:** While navigating the app, if a recruiter accepts their application, a Notification Bell on their navigation bar will instantly ping with a red badge. They can click it to see their result!

---

## 2. ✨ Features Overview
*   **Role-Based Access Control (RBAC):** Distinct dashboards for Students and Recruiters.
*   **Smart Job Matching Algorithm:** Proximity and Urgency-based feed sorting.
*   **Real-Time Notification Engine:** Websocket-like alert dropdown powered by Firestore `onSnapshot`.
*   **Live Recruiter Analytics:** Real-time metrics on application volume and acceptance conversion rates.
*   **Saved/Bookmark Pipeline:** A dedicated UI for students to manage favorite roles.

---

## 3. 📂 Folder & Architecture Structure

This project completely avoids heavy frameworks (like React) to demonstrate mastery of Vanilla HTML/CSS/JS. Here is how the project manages its code:

```text
Earnify/
│
├── index.html                 # The Homepage (Job Feed & Smart Matcher)
├── login.html                 # Authentication Portal (Login / Signup)
├── post-job.html              # Recruiter Job Creation Form
├── recruiter-dashboard.html   # Recruiter Analytics & Application Review
├── student-dashboard.html     # Student View of their Active Applications
├── saved-jobs.html            # Dedicated board for Student Bookmarks
│
├── css/
│   └── style.css              # Global styling, animations, and typography
│
└── js/
    ├── firebase-config.js     # Your secret Firebase connection keys
    ├── auth.js                # Handles Sign In, Sign Up, & Role Creation
    ├── app.js                 # Core Job Feed, Matching & Notification logic
    ├── post-job.js            # Uploads new jobs to Firestore
    ├── recruiter-dashboard.js # Calculates analytics & handles Accept/Reject
    ├── student-dashboard.js   # Fetches a student's application history
    └── saved-jobs.js          # Handles Bookmark UI and orphan-job cleanup
```

---

## 4. 🗄️ Database Design Structure

We utilize **Firebase Cloud Firestore**, a NoSQL document database. Data is separated into 5 highly-optimized collections to minimize read costs:

1. **`users`** -> Stores profile info *(Role, Location, Email)*.
2. **`jobs`** -> Stores the gigs *(Title, Urgency, Recruiter ID)*.
3. **`applications`** -> Links a Student to a Job *(Status: Applied/Accepted/Rejected)*.
4. **`savedJobs`** -> A bridging collection tracking what students bookmarked.
5. **`notifications`** -> Triggered by recruiters, targeted directly to student UIDs.

---

## 5. ⚙️ Detailed Setup Guide (Step-by-Step)

Want to run this yourself? Follow these exact steps to get it running perfectly on your own computer.

### Step 1: Clone the Code
Download this folder to your machine.
```bash
git clone https://github.com/yourusername/Earnify.git
cd Earnify
```

### Step 2: Create a Firebase Backend
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and name it "Earnify-Dev".
3. Inside your new project, click on **Authentication** (left sidebar). Click **Get Started** and enable **Email/Password**.
4. Next, click **Firestore Database** (left sidebar) and click **Create Database**. Start it in **Test Mode** (temporarily).

### Step 3: Connect the Code to Firebase
1. On your Firebase Dashboard Overview, click the **Web (</>)** icon to register an app.
2. Firebase will provide you with a `firebaseConfig` block of code (containing an API key, project ID, etc.).
3. Open the downloaded code in VS Code.
4. Open the `js/firebase-config.js` file and completely **replace** the placeholder config object with the new one Firebase just gave you.

### Step 4: Secure Your Database
1. Go back to your Firebase Console -> **Firestore Database** -> **Rules** tab.
2. Open the `firestore.rules` file from this repository in your code editor, copy everything inside it, and paste it into the Firebase Rules text box.
3. Click **Publish**. Your NoSQL database is now completely secure.

### Step 5: Run the App!
Because this app relies on JavaScript modules (`import` and `export`), you cannot just double-click the HTML file. You must serve it over a local port.
1. Open your terminal inside the `Earnify` folder.
2. If you have Python installed, run: 
   ```bash
   python -m http.server 3000
   ```
   *(Alternatively, install the "Live Server" extension in VS Code and click "Go Live").*
3. Open your browser and navigate to `http://localhost:3000`. Done!

---

## 6. 🚀 Deployment Guide 

When you are ready to show this to recruiters or friends, you can put it on the public internet for free in 60 seconds!

### Using Netlify (The easiest way)
1. Go to [Netlify Drop](https://app.netlify.com/drop).
2. Simply **Drag & Drop** your entire `Earnify` folder into the browser window.
3. Netlify will instantly host it and give you a live URL!

### Using Vercel / GitHub
1. Push your `Earnify` folder to a new repository on your GitHub account.
2. Log into [Vercel](https://vercel.com/) and click **Add New Project**.
3. Select your GitHub repository.
4. Because we used standard HTML/CSS/JS, you do not need any build commands. Just click **Deploy**.
5. Within 30 seconds, your site will be live!

---
*Created by [Your Name]. Feel free to fork, expand, and utilize for your own career growth!*
