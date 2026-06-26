# <p align="center">🔍 TruthGuard AI</p>

<p align="center">
  <strong>The Ultimate Forensic AI Fraud, Deception & Fact-Checking Suite</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
</p>

---

## 🌐 Live Application

🚀 **Try the Deployed App Live:** [https://fake-dectector-frontend.vercel.app/](https://fake-dectector-frontend.vercel.app/)

*   **Frontend Deployed on:** [Vercel](https://vercel.com/)
*   **Backend Deployed on:** [Render](https://render.com/)

---

## 🌟 Overview

**TruthGuard AI** is a state-of-the-art forensic analysis platform designed to combat digital misinformation and AI-generated deception. Built using a fully decoupled **Frontend / Backend Architecture**, TruthGuard combines **Google's Gemini 3.5** models with a custom, zero-dependency, real-time web search fact-checking engine. It provides a centralized dashboard for verifying viral news, deepfake audio, fraudulent job postings, and scientific research.

> [!IMPORTANT]
> This suite runs entirely on free public APIs and advanced web scraping pipelines, making real-time fact-checking accessible without expensive API keys or subscriptions.

---

## 🎥 Demo Video

👉 [Watch Demo Video](https://drive.google.com/file/d/1sGNdWI5lcVmBTA6u5bx9k9ct7RX4ZFk8/view?t=7s)

---

## 🚀 Specialized Verification Modules

TruthGuard AI features 7 specialized detection engines:

| Module | Engine | Verification Pipeline |
| :--- | :--- | :--- |
| **📰 Fake News** | Advanced AI | Live search grounding (DuckDuckGo + Wikipedia + Snopes + PolitiFact) + Gemini analysis. |
| **🖼️ AI Image** | Vision AI | Pixel forensics & visual artifact analysis to flag synthetic or manipulated images. |
| **🎤 Deepfake Voice** | Audio Analysis | Pitch, frequency, and spectral pattern detection via Web Audio API. |
| **💼 Fake Job** | Pattern AI | Scrutinizes salary anomalies, domain legitimacy, and urgent emotional triggers. |
| **🕵️ Fraud Behavior** | Biometrics AI | Analyzes mouse dynamics, typing velocity, and device patterns for bots/fraud. |
| **🔬 Fake Research** | Scientific AI | Audits research claims against citations, sample sizes, and methodology credibility. |
| **🌤️ Weather Check** | Hybrid AI | Cross-references forecasts against real-time OpenWeather data. |

---

## ⚡ Custom Search Grounding Pipeline

The **Fake News Engine** implements a smart search-grounding architecture to supply Gemini with real-time, verified context:

1. **Noun-Phrase Extraction**: Filters out common grammar/stopwords to extract up to 6 core query entities.
2. **Comparison-Aware Splitting**: For multi-subject claims (e.g. comparing two different brands/models), it splits the terms to run multiple targeted queries in parallel.
3. **Wikipedia TF-IDF Scoring**: Fetches full article pages (no `exintro` limits) and scores paragraphs using keyword density, appending high-ranking sections to the prompt.
4. **Scraper Filtering**: Respectfully scrapes Snopes, PolitiFact, and FactCheck.org, filtering out sidebar navigation and author links to isolate real fact-check reports.
5. **Google Fact Check API**: Leverages the public Fact Check database for instant verified claims.

---

## ✨ Design & Experience

*   **🌌 Dynamic 3D Neural Web**: Built with **Three.js**, showcasing drifting mesh orbs, halo rings, and connection lines for a premium aesthetic.
*   **📊 Interactive Analytics**: Real-time confidence scores and forensic breakdowns visualized via **Chart.js** radars and bars.
*   **🌓 Dual-Theme OS**: Seamless transition between high-contrast Dark Mode and crystal-clear Light Mode.
*   **⚡ Zero-Lag Micro-Animations**: Built using **Framer Motion** for fluid page-to-page transitions and interactive card flips.

---

## 🛠️ Tech Stack & Folder Structure

### **📁 Decoupled Folder Structure**
```bash
Fake-Dectector/
├── frontend/        # React 18, Vite, Tailwind CSS, Three.js, Chart.js (Vercel)
└── backend/         # Node.js, Express.js, Google Gemini SDK, Axios, Cheerio (Render)
```

### **Frontend**
- **Framework**: React 18 (Vite build)
- **Styling**: Tailwind CSS & Framer Motion
- **Visuals**: Three.js (neural network graphics), Chart.js (forensics charts)
- **Components**: Lucide-React, custom SVG loaders

### **Backend**
- **Runtime**: Node.js & Express.js
- **AI Core**: Google Gemini 3.5 Flash / 3.1 Flash-lite (Rotated Key Chains)
- **Search & Scraping**: Axios, Cheerio, public Wikipedia API, DuckDuckGo Lite, Google Fact Check API
- **Weather API**: OpenWeatherMap integration

---

## ⚙️ Setup & Installation (Local Development)

Follow these steps to run the decoupled TruthGuard AI architecture locally:

### 1. Clone the Repository
```bash
git clone https://github.com/Thuyavan28/Fake-Dectector.git
cd Fake-Dectector
```

### 2. Configure Backend Environment
Navigate into the `backend/` folder, install dependencies, and create your `.env` file:
```bash
cd backend
npm install
```

Create a `backend/.env` file:
```env
GEMINI_API_KEY_1=your_google_gemini_api_key_1
GEMINI_API_KEY_2=your_google_gemini_api_key_2 (optional backup)
GEMINI_API_KEY_3=your_google_gemini_api_key_3 (optional backup)
OPENWEATHER_API_KEY=your_openweather_api_key
PORT=3000
```

Start the backend development server:
```bash
npm run dev
```

### 3. Configure Frontend Environment
In a new terminal window, navigate to the `frontend/` folder, install dependencies, and start the client:
```bash
cd ../frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173` (or `5174`) and automatically proxy all `/api` requests to `http://localhost:3000` via Vite's proxy configuration.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
