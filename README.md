# <p align="center">🔍 TruthGuard AI</p>

<p align="center">
  <strong>The Ultimate Multi-Modal AI Fraud & Manipulation Detection Suite</strong>
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

**TruthGuard AI** is a cutting-edge forensic analysis platform designed to combat the rising tide of digital misinformation and AI-generated deception. Leveraged on a fully decoupled **Frontend / Backend Architecture** and powered by **Google's Gemini 3.5 Flash** with real-time Google Search grounding, TruthGuard provides a centralized suite for verifying everything from viral news and deepfake audio to fraudulent job postings and scientific research.

> [!IMPORTANT]
> This project is designed for researchers, fact-checkers, and everyday users who need reliable, AI-powered verification in a world increasingly filled with synthetic content.

---

## 🎥 Demo Video

👉 [Watch Demo](https://drive.google.com/file/d/1sGNdWI5lcVmBTA6u5bx9k9ct7RX4ZFk8/view?t=7s)

---

## 🚀 Key Detection Modules

TruthGuard AI features 7 specialized engines to ensure digital integrity:

| Module | Engine | Description |
| :--- | :--- | :--- |
| **📰 Fake News** | Advanced AI | Real-time fact-checking and source credibility analysis. |
| **🖼️ AI Image** | Vision AI | Pixel forensics to detect AI-generated artifacts and deepfakes. |
| **🎤 Deepfake Voice** | Audio Analysis | MFA and MFCC feature extraction to identify synthetic speech. |
| **💼 Fake Job** | Pattern AI | Domain verification and urgency pattern detection in job offers. |
| **🕵️ Fraud Behavior** | Biometrics AI | Detects suspicious user activity through behavioral biometrics. |
| **🔬 Fake Research** | Scientific AI | Verifies the methodology and credibility of research claims. |
| **🌤️ Weather Check** | Hybrid AI | Cross-references predictions against real-time OpenWeather data. |

---

## ✨ Advanced Features

*   **🌌 Dynamic 3D Environment**: Powered by **Three.js**, featuring a neural network background, drifting mesh orbs, and rotating halo rings for a truly premium feel.
*   **📊 Interactive Analytics**: Real-time confidence scores and forensic breakdowns visualized via **Chart.js**.
*   **🌓 Dual-Theme OS**: Seamless transition between high-contrast Dark Mode and crystal-clear Light Mode.
*   **⚡ Zero-Latency UI**: Built with **Vite** and **Framer Motion** for lightning-fast transitions and micro-interactions.
*   **🛡️ Multi-Layer Security**: Integrated safety checks for NSFW content and automated forensic reporting.

---

## 🛠️ Technology Stack & Architecture

### **📁 Decoupled Folder Structure**
```bash
Fake-Dectector/
├── frontend/        # React 18, Vite, Tailwind CSS, Three.js, Chart.js (Hosted on Vercel)
└── backend/         # Node.js, Express.js, Google Gemini 3.5 SDK, CORS (Hosted on Render)
```

### **Frontend**
- **Framework**: React 18 (Hooks, Context, Web Audio API)
- **Styling**: Tailwind CSS & Framer Motion
- **Visuals**: Three.js (Dynamic Neural Background System), Chart.js (Forensics breakdowns)
- **Components**: Lucide-React & Custom Premium SVG Animations

### **Backend**
- **Runtime**: Node.js & Express.js
- **AI Core**: Google Gemini 3.5 Flash & 3.1 Flash-lite (Rotated Key Chains)
- **APIs**: Real-time Google Search Grounding API, OpenWeatherMap API

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
In a new terminal window, navigate to the `frontend/` folder, install dependencies, and run:
```bash
cd frontend
npm install
npm run dev
```
The frontend will run at `http://localhost:5174` (or `5173`) and automatically proxy all API requests to `http://localhost:3000` via Vite!

---

## 🧩 How It Works

1.  **Input Layer**: Users upload images, audio, or paste text/data into the specialized module interfaces.
2.  **AI Orchestrator**: The backend routes requests to specific Gemini models optimized for that data type (e.g., Vision Pro for images).
3.  **Forensic Analysis**: The system performs sub-pixel analysis (for images) or behavioral pattern matching (for fraud).
4.  **Verdict Generation**: A comprehensive report is generated, including a **VERDICT (REAL/FAKE)** and a **Confidence Score**.
5.  **Visualization**: Data is piped to interactive charts for deep-dive inspection.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
