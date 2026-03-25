# Aura Finance PWA

Aura is a high-performance, mobile-first Progressive Web App (PWA) designed for seamless and aesthetic financial tracking. It features cross-currency budget scaling, real-time Supabase synchronization, machine-learning-lite statement parsing (via Python), and an intricate "Aura" theming system.

This repository heavily relies on local environment configurations (`.env.local`) and native Python dependencies that are explicitly ignored by Git (for security and size constraints). 

Follow these instructions to spin up the Aura local development environment.

---

## 🛠 Required Prerequisites

Before you start, ensure you have the following installed on your machine:
1. **Node.js** (v18+) and `npm`
2. **Python** (v3.9+) and `pip`
3. A **Supabase** Project (to recreate the `.env.local` keys)

---

## 🚀 Step 1: Clone & Node Modules

Due to the `.gitignore` restricting the upload of node modules, you'll need to fetch the local dependencies first.

```bash
# Clone the repository to your local machine
git clone <repository_url>

# Navigate into the core project folder
cd Aura-PWA/aura

# Install the NodeJS dependencies
npm install
```

---

## 🔑 Step 2: The Environment Matrix (`.env.local`)

For security reasons, `.env.local` is never uploaded to GitHub. If you try to run the application without it, the database connection will fail, and you cannot log in.

**1. Create the File**
Inside the `Aura-PWA/aura` directory, create a new file named exactly: `.env.local`

**2. Inject the Variables**
Open `.env.local` and paste your Supabase keys (you should request these from the project maintainer):

```text
VITE_SUPABASE_URL=https://your-supabase-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your.super.secret.anon.key.string.here
```

*Note: Without these exact keys, the Supabase authentication and Row Level Security (RLS) walls will block all requests.*

---

## 🧠 Step 3: Python Neural Engine (Statement Parser)

Aura utilizes a native Python backend middleware hidden inside Vite to parse massive PDF bank statements locally (to preserve user privacy). These Python dependencies are omitted from Git.

**1. Install Python Dependencies**
Ensure Python is in your system `PATH`, then run the following in your terminal to install the requisite parsing libraries globally or in a virtual environment:

```bash
pip install PyMuPDF thefuzz python-Levenshtein
```

Alternatively, `pip3 install PyMuPDF thefuzz python-Levenshtein` depending on your OS.

*Troubleshooting:* If you receive an execution error related to `python` when uploading a PDF statement, it means Vite failed to locate the Python executable in your system variables, or the `PyMuPDF` (`fitz`) library is missing from your python environment.

---

## ⚡ Step 4: Ignite the PWA

With your Environment Variables injected and your Python Parser primed, you are ready to boot up the central node.

```bash
# From inside the Aura-PWA/aura folder
npm run dev
```

Vite will now launch the local server (usually on `http://localhost:5173`). 

---

## 🌙 Development Notes

- **Aura Profiles:** Your local `localStorage` manages your specific UI Aura (Sakura Pink, Berserker Red, etc.) independent of the database.
- **Vite & Python:** The Vite config intercepts `POST /api/parse` from the Frontend dropzone and utilizes `child_process.exec` to run the active python parser located in the local `.agents/skills/statement-parser` module.
- **Tailwind v4:** We are utilizing the newest Tailwind iterations. Verify `index.css` is handling variables appropriately if styling fails to boot.

*Good hunting, Operative.*
