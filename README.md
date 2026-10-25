# ManiDealsCampus

ManiDealsCampus is an exclusive campus-only marketplace for college students to Buy, Sell, and Exchange products within their campus. Built as a high-fidelity static web application powered by Firebase Auth, Cloud Firestore, and Firebase Storage.

## Features

- **Auth System**: Email login, Google sign-in, account signup, email verification, password reset, and "remember me".
- **Dashboard**: Activity analytics, personal stats, notification panel, listings list, and navigation triggers.
- **Marketplace Listing**: Filter by categories (Books, Electronics, Hostel, Cycles, etc.), price range, search, and sorting.
- **Product Operations**: Add product (with multi-image upload), edit listing details, delete listing, and check seller profile contact info.
- **Campus Exchange**: Exchange mechanism with request sending, receiving list, and status updates (Accept/Reject).
- **Wishlist**: Save listings, remove listings, or purchase/exchange them directly.
- **Moderation Panel**: Admin dashboard to review and approve/reject listings.
- **Themes & Styling**: Modern Glassmorphism layout with Dark Green and Light Green styling and automatic/manual dark mode support.

## Getting Started

### Prerequisites

You will need [Node.js](https://nodejs.org) installed on your system to run the local server.

### Local Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Open `js/firebase-config.js` and update the placeholder configuration with your actual Firebase Project config:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. Run the development server:
   ```bash
   npm start
   ```
   The website will run locally at `http://localhost:3000`.

### Deployment

To deploy to Firebase Hosting:

1. Install Firebase CLI globally if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to your Firebase account:
   ```bash
   firebase login
   ```

3. Initialize your project:
   ```bash
   firebase init
   ```
   * Select **Hosting** and **Firestore** if prompted.
   * Use your existing project.
   * Choose public directory as `./` (or the root).

4. Deploy the site:
   ```bash
   firebase deploy
   ```
