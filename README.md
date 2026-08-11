# 🌾 AgriFarmers – Modern Farming Companion

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-0A66C2?style=flat&logo=githubpages&logoColor=white)](https://jayantshringi.github.io/AgriFarmers-SIH-2025)

> **A multi-lingual Progressive Web App (PWA) empowering Indian farmers with real-time weather analytics, regional seed & fertilizer recommendations, live Mandi market prices, and secure SMS OTP authentication.**

---

<p align="center">
  <img src="./screenshots/desktop.png" alt="AgriFarmers Platform Desktop View" width="700"/>
</p>

---

## 📖 Table of Contents

- [About The Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Architecture & Directory Structure](#-project-architecture--directory-structure)
- [Progressive Web App (PWA) & Offline Mode](#-progressive-web-app-pwa--offline-mode)
- [Multi-Language Support](#-multi-language-support)
- [Deployment Options](#-deployment-options)
- [License](#-license)

---

## 📖 About The Project

**AgriFarmers** is an intelligent, accessible farming companion designed to empower agricultural communities. It addresses key challenges faced by Indian farmers—lack of localized real-time data, complex user interfaces, and language barriers—by offering a mobile-first, high-performance web platform available in regional Indian languages.

### Core Objectives:
- **Data-Driven Farming**: Deliver location-accurate weather updates, soil-specific fertilizer mixes, and regional seed advice.
- **Market Transparency**: Provide real-time local Mandi prices to help farmers sell their produce at optimal rates.
- **Accessibility & Inclusivity**: Easy toggling between English, Hindi, and Punjabi with intuitive icons and high-contrast visual design.
- **Zero-Friction Authentication**: Passwordless login using SMS OTP via mobile numbers.
- **Offline Reliability**: Progressive Web App capabilities ensure core features remain accessible even with unstable rural internet connectivity.

---

## ✨ Key Features

- 🗣️ **Multi-Lingual Interface**: Instant switching between **English**, **Hindi (हिंदी)**, and **Punjabi (ਪੰਜਾਬੀ)** with UI translations managed via modular JSON dictionaries.
- 📱 **Progressive Web App (PWA)**: Installable directly on Android, iOS, and Desktop home screens with offline caching (Service Worker v5.4) and standalone display.
- 🔐 **SMS OTP Authentication**: Secure SMS-based login and signup powered by **TextBee Gateway API** with HMAC-SHA256 hashed OTPs, 120-second expiration, rate-limiting, and attempt caps.
- 🗄️ **Persistent User Profiles**: Integrated Node.js + MySQL database storage (`users` table) with silent fallback to browser `localStorage` when offline.
- 🌦️ **Weather Forecast & Location Intelligence**: Geolocation-driven weather tracking with regional forecasts and tailored daily farming tips.
- 🌱 **Smart Seed & Fertilizer Advice**: Dynamic recommendations for crops (Wheat, Rice, Cotton, etc.) and optimal organic vs. NPK vs. Urea fertilizer ratios based on the user's state and district.
- 📊 **Mandi Market Prices**: Real-time crop price tracking and daily price trends for agricultural produce across major Indian markets.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JS (ES6+) | Lightweight, high-performance core web stack |
| **Styling** | Tailwind CSS, Font Awesome | Modern visual design system with Indian flag accents & icons |
| **PWA Engine** | Service Worker (v5.4), Web Manifest | Cache-First offline fallback, assets precaching, install prompts |
| **Backend API** | Node.js (`node:http`, `node:crypto`) | Lightweight REST API server with zero external backend dependencies |
| **Database** | MySQL (`mysql2/promise`) | Relational persistence with connection pooling & auto-migration |
| **SMS Gateway** | TextBee API | Server-side SMS dispatch for 6-digit OTP verification |
| **State & Storage** | LocalStorage + ES Modules | Client-side session caching and fast initial renders |

---

## 📁 Project Architecture & Directory Structure

```text
AgriFarmers/
├── index.html                 # Main application single-page interface & modals
├── install.html               # Dedicated PWA installation page
├── server.js                  # Node.js backend API & static file HTTP server
├── script.js                  # PWA installation handlers, UI interactions, modals
├── styles.css                 # Custom CSS overrides and animation styling
├── service-worker.js          # PWA Service Worker (Cache-First strategy v5.4)
├── manifest.json              # Web App Manifest (icons, theme colors, display modes)
├── package.json               # Node.js manifest & dependencies (`mysql2`)
├── js/
│   ├── app-config.js          # Runtime configuration (API base URL for cross-origin setups)
│   ├── auth.js                # Auth service layer (OTP send/verify, user profile CRUD)
│   ├── auth-ui.js             # Authentication UI event listeners & form validators
│   ├── storage.js             # LocalStorage session caching utilities
│   └── translations.js        # Multi-lingual translation dictionaries (EN, HI, PA)
├── icons/                     # PWA app icons (16x16 up to 512x512)
└── screenshots/               # Application UI preview images
```

---

## 📱 Progressive Web App (PWA) & Offline Mode

AgriFarmers complies with modern PWA standards:

1. **Service Worker Caching**: [`service-worker.js`](file:///d:/Projects/AgriFarmers-SIH-2025/service-worker.js) uses a **Cache-First strategy** (`agrifarmers-static-v5.4`) to precache static HTML, CSS, JavaScript, icons, and CDN assets for full offline usability.
2. **Installability**: Meets Chrome/Edge Web App criteria. Displays an interactive install prompt or banner.
3. **PWA Diagnostics**: Test app status directly from the UI using `diagnosePWA()` or `forcePWAInstall()`.
4. **Dedicated Install Page**: Visit [`install.html`](file:///d:/Projects/AgriFarmers-SIH-2025/install.html) for step-by-step device installation guides.

---

## 🗣️ Multi-Language Support

All UI text is centralized in [`js/translations.js`](file:///d:/Projects/AgriFarmers-SIH-2025/js/translations.js). 

To add a new language key or expand language dictionaries:
```js
window.translations = {
    en: { appName: "AgriFarmers", ... },
    hi: { appName: "एग्रीफार्मर्स", ... },
    pa: { appName: "ਐਗਰੀਫਾਰਮਰਜ਼", ... }
};
```
Elements with matching `id` attributes are translated dynamically upon language selection.

---

## 🌐 Deployment Options

### 1. Unified Full-Stack Deployment (Recommended)
Deploy `server.js` to platforms like **Render**, **Railway**, or **Heroku**:
- Set environment variables (`TEXTBEE_API_KEY`, `DATABASE_URL`, etc.) in your provider dashboard.
- The Node server serves both static UI files and backend `/api/*` endpoints on a single port.

### 2. Decoupled Static Hosting + API Server
Host the static frontend on **GitHub Pages**, **Vercel**, or **Netlify**, and deploy `server.js` separately:
1. Deploy the API server (e.g. `https://api.yourdomain.com`).
2. Update `js/app-config.js`:
   ```js
   window.AGRIFARMERS_CONFIG = {
       otpApiBaseUrl: 'https://api.yourdomain.com'
   };
   ```
3. Set `CORS_ORIGIN=https://your-github-username.github.io` on your API server.

---

## 📜 License

Distributed under the **MIT License**. See project repository for details.

---

<p align="center">
  Built with ❤️ for Indian Agriculture | <b>AgriFarmers</b>
</p>
