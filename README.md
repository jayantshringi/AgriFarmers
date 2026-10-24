# 🌾 AgriFarmers – Modern Farming Companion

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-0A66C2?style=flat&logo=githubpages&logoColor=white)](https://jayantshringi.github.io/AgriFarmers/)

> **A multi-lingual Progressive Web App (PWA) and precision agriculture platform empowering Indian farmers with real-time weather analytics, AI leaf disease diagnostics, ICAR soil prescriptions, FAO-56 irrigation planning, interactive GIS farm mapping, live Mandi market prices, and secure SMS OTP authentication.**

---

<p align="center">
  <img src="./screenshots/desktop.png" alt="AgriFarmers Platform Desktop View" width="700"/>
</p>

---

## 📖 Table of Contents

- [About The Project](#-about-the-project)
- [Key Features](#-key-features)
- [AgriFarm-Vision Precision Suite](#-agrifarm-vision-precision-suite)
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
- **Precision Diagnostics (AgriFarm-Vision / AgroVision)**: Enable instant leaf disease identification, scientific remediation plans, dynamic ICAR soil prescriptions, and smart FAO-56 irrigation scheduling.
- **Market Transparency**: Provide real-time local Mandi prices and predictive price forecasts to help farmers sell produce at optimal rates.
- **Accessibility & Inclusivity**: Easy switching across 13 Indian native languages (English, Hindi, Punjabi, Bengali, Marathi, Telugu, Tamil, Gujarati, Kannada, Malayalam, Odia, Assamese, and Urdu) with intuitive icons and high-contrast visual design.
- **Zero-Friction Authentication**: Passwordless login using SMS OTP via mobile numbers.
- **Offline Reliability**: Progressive Web App capabilities ensure core features remain accessible even with unstable rural internet connectivity.

---

## ✨ Key Features

- 🗣️ **All-India Multi-Lingual Interface**: Instant switching across **13 official native languages** (English, Hindi, Punjabi, Bengali, Marathi, Telugu, Tamil, Gujarati, Kannada, Malayalam, Odia, Assamese, and Urdu) covering all 28 States & 8 Union Territories with automatic state-based language matching.
- 📱 **Progressive Web App (PWA)**: Installable directly on Android, iOS, and Desktop home screens with offline caching (Service Worker v6.5) and standalone display.
- 🔐 **SMS OTP Authentication**: Secure SMS-based login and signup powered by **TextBee Gateway API** with HMAC-SHA256 hashed OTP tokens, 120-second expiration, rate-limiting, and attempt caps.
- 🗄️ **Persistent User Profiles**: Integrated Node.js + **Supabase PostgreSQL** storage (`users` table) with silent fallback to browser `localStorage` when offline.
- 🌦️ **Weather Forecast & Location Intelligence**: Geolocation-driven weather tracking with regional forecasts and tailored daily farming tips.
- 🌱 **Smart Seed & Fertilizer Advice**: Dynamic recommendations for crops (Wheat, Rice, Cotton, etc.) and optimal organic vs. NPK fertilizer ratios based on the user's state and district.
- 📊 **Mandi Market Prices & Forecasts**: Real-time crop price tracking and daily price trends for agricultural produce across major Indian markets.
- 🔬 **AgriFarm-Vision Precision AI Suite**: Built-in precision agriculture tools formerly known as AgroVision, providing crop disease detection, soil testing, irrigation math, and GIS farm mapping.

---

## 🌿 AgriFarm-Vision Precision Suite

AgriFarmers includes **AgriFarm-Vision** (also referenced as **AgroVision**), an isolated, high-performance precision agriculture toolset:

1. 🩺 **Crop Doctor (AgriFarm-Vision Leaf Disease Diagnosis Engine)**:
   - Instant visual leaf pathology diagnosis for **Wheat**, **Rice**, **Cotton**, and **Tomato**, plus healthy crop baselines.
   - Covers critical pathogens: Yellow Rust, Leaf Rust, Powdery Mildew, Bacterial Leaf Blight, Blast, Leaf Curl Virus, Early/Late Blight.
   - Detailed treatment prescriptions: scientific name, symptoms, organic/bio-remedies (Neem NSKE, *Trichoderma*, sour buttermilk), chemical controls (Tilt, Folicur, Mancozeb), and preventive practices.

2. 🧪 **Precision Soil Lab & Dynamic NPK Prescription**:
   - Implements Indian Council of Agricultural Research (ICAR) Soil Test Crop Response (STCR) equations.
   - Evaluates soil pH across a 7-stage spectrum (Very Acidic to Sodic Alkaline) and recommends amendments (agricultural lime or gypsum).
   - Calculates exact commercial fertilizer dosage: **Urea (46% N)**, **DAP (18:46:0)**, and **MOP (60% K₂O)** bags per acre.

3. 💧 **Smart Irrigation Planner (FAO-56 ET0 Engine)**:
   - Evapotranspiration modeling across crop growth stages ($K_c$), root depths, and 5 soil textures.
   - Compares Drip (90% efficiency), Micro-Sprinkler (80%), and Surface Flood (55%) systems.
   - Calculates gross daily water volume (liters), 5 HP pump operating run-time, and generates a 7-day watering calendar.

4. 🗺️ **Interactive GIS Farm Map**:
   - Leaflet.js geospatial mapping interface covering APMC Grain Mandis, ICAR Krishi Vigyan Kendras (KVKs), certified fertilizer dealers, and soil testing labs.
   - Live GPS distance calculation, category filtering, operating hours, commodity listings, and direct navigation links.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JS (ES6+) | Lightweight, high-performance core web stack with zero build toolchain bloat |
| **Styling** | Tailwind CSS, Font Awesome, `css/styles.css` | Modern visual design system with Indian flag accents & micro-animations |
| **GIS Mapping** | Leaflet.js (v1.9.4) & OpenStreetMap | Geospatial facility locator with custom pin markers and interactive popups |
| **PWA Engine** | Service Worker (v6.5), Web Manifest | Cache-First offline fallback, full asset precaching including AgriFarm-Vision (AgroVision), install prompts |
| **Backend API** | Modular Node.js (`node:http`, `node:crypto`) | Lightweight REST API organized into `routes/otp.js`, `routes/users.js`, `routes/agrovision.js` (AgriFarm-Vision engine) |
| **Serverless Deployment** | Vercel Serverless Functions (`api/index.js`) | Single-origin fullstack deployment with edge asset caching & URL rewrites |
| **Database** | Supabase PostgreSQL (`@supabase/supabase-js`) | Relational persistence with connection pooling, user profiles, and timestamps |
| **SMS Gateway** | TextBee Android Gateway API | Server-side SMS dispatch for 6-digit OTP verification |
| **State & Storage** | LocalStorage + ES Modules | Client-side session caching and instant offline-first renders |

---

## 📁 Project Architecture & Directory Structure

```text
AgriFarmers/
├── api/
│   └── index.js               # Vercel Serverless Function entry point (bridges to server.js)
├── css/
│   └── styles.css             # Modular auxiliary styles, animations, Leaflet pin styles
├── js/
│   ├── app.js                 # Core frontend engine (PWA, geolocation, weather, market, states)
│   ├── app-config.js          # Runtime config (auto same-origin on Vercel/localhost)
│   ├── auth.js                # Auth service layer (stateless OTP token, Supabase CRUD)
│   ├── auth-ui.js             # Authentication UI event listeners & form validators
│   ├── storage.js             # LocalStorage session caching utilities
│   ├── translations.js        # Multi-lingual translation engine (13 Indian native languages)
│   └── features/              # Modular AgriFarm-Vision (AgroVision) precision agriculture client modules
│       ├── crop-doctor.js     # AgriFarm-Vision Leaf Disease Diagnosis client module
│       ├── farm-map.js        # AgriFarm-Vision Leaflet GIS Interactive Farm & Facility Map
│       ├── irrigation-planner.js # AgriFarm-Vision FAO-56 Smart ET0 Irrigation Planner
│       └── soil-prescription.js # AgriFarm-Vision Precision Soil Lab & Dynamic NPK Calculator
├── routes/
│   ├── otp.js                 # Modular TextBee SMS OTP dispatch & HMAC verification
│   ├── users.js               # Modular Supabase user profile CRUD & last_login updates
│   └── agrovision.js          # AgriFarm-Vision backend precision engine (disease, soil, market forecast)
├── icons/                     # Centralized PWA app icons (16x16 up to 512x512)
├── screenshots/               # Application UI preview images
├── index.html                 # Main application single-page interface & modals
├── install.html               # Dedicated PWA installation page
├── script.js                  # Root backward-compatibility loader (delegates to js/app.js)
├── styles.css                 # Root backward-compatibility stylesheet (@import css/styles.css)
├── service-worker.js          # PWA Service Worker (Cache-First strategy v6.5, /api bypass)
├── manifest.json              # Web App Manifest (icons, theme colors, display modes)
├── server.js                  # Dual-mode backend API & static HTTP server (Vercel & Node.js)
├── vercel.json                # Vercel deployment rewrites and caching headers
├── package.json               # Node.js manifest & dependencies (`@supabase/supabase-js`)
├── package-lock.json          # Dependency lockfile
└── README.md                  # Project documentation
```

---

## ⚡ Deployment on Vercel (Frontend + Backend)

AgriFarmers is configured for single-project deployment on **Vercel** with zero extra build steps:

1. **Push your code to GitHub / GitLab / Bitbucket**.
2. **Import project into Vercel**:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: Leave empty (or default)
   - Output Directory: Leave empty (or default)
3. **Configure Environment Variables** in Vercel Project Settings:
   | Variable | Description | Example / Source |
   |:---|:---|:---|
   | `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
   | `SUPABASE_KEY` | Supabase anon or service role key | From Supabase Project API Settings |
   | `TEXTBEE_API_KEY` | TextBee gateway API key | TextBee Dashboard |
   | `TEXTBEE_DEVICE_ID` | TextBee device ID | TextBee Dashboard |
   | `OTP_SECRET` | Secret key used for signing OTP tokens | Any secure 32+ char string |
   | `OTP_TTL_SECONDS` | OTP expiration window (default: 120) | `120` |
   | `TEXTBEE_SIM_SUBSCRIPTION_ID` | SIM slot ID (optional) | `1` |
4. **Deploy**:
   - Vercel automatically deploys all static assets (`index.html`, `js/app.js`, `css/styles.css`, etc.) to its global Edge CDN.
   - All `/api/*` routes are handled serverlessly by [`api/index.js`](file:///d:/Projects/AgriFarmers/api/index.js).
   - Both frontend and backend run under the same origin with no CORS hurdles and zero cold-sleep delays.

---

## 📱 Progressive Web App (PWA) & Offline Mode

AgriFarmers complies with modern PWA standards:

1. **Service Worker Caching**: [`service-worker.js`](file:///d:/Projects/AgriFarmers/service-worker.js) uses a **Cache-First strategy** (`agrifarmers-static-v6.5`) to precache static HTML, CSS, JavaScript, icons, AgriFarm-Vision feature modules, and CDN assets for full offline usability while bypassing dynamic `/api/` calls.
2. **Installability**: Meets Chrome/Edge Web App criteria. Displays an interactive install prompt or banner.
3. **PWA Diagnostics**: Test app status directly from the UI using `diagnosePWA()` or `forcePWAInstall()`.
4. **Dedicated Install Page**: Visit [`install.html`](file:///d:/Projects/AgriFarmers/install.html) for step-by-step device installation guides.

---

## 🗣️ Multi-Language Support

All UI text is centralized in [`js/translations.js`](file:///d:/Projects/AgriFarmers/js/translations.js), offering full localization across **13 official Indian native languages**:

- 🇬🇧 **English (`en`)**
- 🇮🇳 **Hindi (`hi`)** — हिंदी
- 🇮🇳 **Punjabi (`pa`)** — ਪੰਜਾਬੀ
- 🇮🇳 **Bengali (`bn`)** — বাংলা
- 🇮🇳 **Marathi (`mr`)** — मराठी
- 🇮🇳 **Telugu (`te`)** — తెలుగు
- 🇮🇳 **Tamil (`ta`)** — தமிழ்
- 🇮🇳 **Gujarati (`gu`)** — ગુજરાતી
- 🇮🇳 **Kannada (`kn`)** — ಕನ್ನಡ
- 🇮🇳 **Malayalam (`ml`)** — മലയാളം
- 🇮🇳 **Odia (`or`)** — ଓଡ଼ିଆ
- 🇮🇳 **Assamese (`as`)** — অসমীয়া
- 🇮🇳 **Urdu (`ur`)** — اردو (with native RTL bidirectional rendering)

The platform features automatic state-to-language matching based on regional territory, non-destructive deep DOM node tree translation preserving icon elements, and localized calendar and crop advisories.

---

## 📜 License

Distributed under the **MIT License**. See project repository for details.

---

<p align="center">
  Built with ❤️ for Indian Agriculture | <b>AgriFarmers</b>
</p>
