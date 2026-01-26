# Educative AI – Full Stack Prototype

This zip contains a clean version of your project with:

- React 18 frontend (`frontend/`)
- Node/Express backend (`backend/`)
- PDF upload + text extraction with `pdf-parse`
- OpenAI integration that always returns **exactly 4 MCQ questions**

## How to run

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# put your real key into .env
# OPENAI_API_KEY=sk-...
npm start
```

The backend will run on **http://localhost:3001**.

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm start
```

Visit **http://localhost:3000** in your browser.

### 3. Flow

1. Login page → click "Sign in"
2. You land on the dashboard-style Home page
3. Click **"From document (PDF)"** → Generate Quiz page
4. Upload a PDF, click **Generate Quiz**
5. Backend extracts text, calls OpenAI, and returns 4 multiple-choice questions
6. Questions show in the light grey panel on the Generate Quiz page
