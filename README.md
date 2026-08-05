# 🌾 AgriFarmers – SIH 2025 Prototype

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-SIH_2025-blue?style=flat)](#license)
[![Live Demo](https://img.shields.io/badge/Live_Demo-0A66C2?style=flat&logo=githubpages&logoColor=white)](https://jayantshringi.github.io/AgriFarmers-SIH-2025)

> **A multi‑lingual web platform connecting Indian farmers with weather insights, seed recommendations, market prices, and more – designed for Smart India Hackathon 2025.**

<p align="center">
  <img src="./screenshots/desktop.png" alt="AgriFarmers Platform - Desktop View" width="600"/>
</p>

---

## 📖 About The Project

AgriFarmers is a **front‑end prototype** built during **Smart India Hackathon 2025** to empower farmers with data‑driven decisions. It offers a simple, accessible interface in multiple Indian languages, delivering:

- Real‑time weather (simulated)
- Personalized seed and fertilizer recommendations
- Crop calendar and market price awareness
- Soil health tips

The platform follows a **mobile‑first, responsive** design using **HTML5, CSS3, JavaScript, and Tailwind CSS**, with translations managed via structured JSON files.

---

## ✨ Key Features

- 🗣️ **Multi‑language Support** – Hindi, English, and Punjabi with easy toggle. Translations stored in structured JSON.
- 📱 **Mobile Responsive** – Works flawlessly on phones, tablets, and desktops. Mobile‑first approach.
- 🎨 **Intuitive UI/UX** – Clean navigation, Indian‑flag‑inspired color palette, cards, visual hierarchy, and loading indicators.
- 🌦️ **Weather Forecasting** – Displays region‑specific weather data (currently mock, ready for real API integration).
- 🌱 **Smart Recommendations** – Crop calendar, seed/fertilizer advice, soil health insights based on user’s state and district.
- 📊 **Market Price Insights** – Simulated local mandi prices, easily switchable to live data.
- 🔐 **SMS OTP Login** – Sends and verifies mobile OTPs through a server-side TextBee integration.
- 💾 **Local Storage** – Saves user preferences and selections with Firestore/local fallback.
- ✅ **Form Validation & Error Handling** – Client‑side validation with user feedback and secure input handling.

---

## 🛠️ Tech Stack

| Area              | Technologies                                  |
|-------------------|-----------------------------------------------|
| **Frontend**      | HTML5, CSS3, JavaScript (ES6+), Tailwind CSS  |
| **OTP API**       | Node.js HTTP server, TextBee SMS API          |
| **Data**          | Firebase Firestore with Local Storage fallback |
| **Icons & Assets** | Custom CSS + Emoji (optionally integrate Font Awesome) |
| **Hosting**       | GitHub Pages for static UI; Node host required for OTP API |
| **Tools**         | VS Code, Git                                  |

---

## 🔐 TextBee OTP Setup

The TextBee API key must stay server-side. This repo includes `server.js`, which serves the static app and exposes:

- `POST /api/otp/send` – Generates a 6-digit OTP and sends it through TextBee.
- `POST /api/otp/verify` – Verifies the OTP before completing login/signup.

### Local run

1. Copy `.env.example` to `.env`.
2. Fill `TEXTBEE_API_KEY`, `TEXTBEE_DEVICE_ID`, and a strong `OTP_SECRET`.
3. Run `npm start`.
4. Open `http://localhost:3000`.

### Static hosting with a separate API

If the frontend remains on GitHub Pages and the OTP API is deployed elsewhere, set the API origin in `js/app-config.js`:

```js
window.AGRIFARMERS_CONFIG = {
  otpApiBaseUrl: 'https://your-otp-api.example.com'
};
```

Set `CORS_ORIGIN` on the API server to the GitHub Pages origin.

---

## 🚀 Live Demo

Try it out now → [**AgriFarmers Live**](https://jayantshringi.github.io/AgriFarmers-SIH-2025)

---

