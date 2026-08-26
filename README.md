# ReflectAI — Personal Journal & AI Reflection Studio

A production-grade, user-authenticated journaling web application featuring multi-turn AI reflections, hands-free voice dictation, speech synthesis, automatic SMART goal extraction, a "Future Self (5-Year)" mentor persona, natural language semantic search, and an emotional mood analytics dashboard.

Built with **Gemini 3.7 Flash & 3.6 Flash**, **Firebase Authentication (Google Identity)**, **Cloud Firestore (Hardened Owner-Bound Rules)**, **React 19**, **Tailwind CSS**, and **Express**.

---

## 🌟 Advanced Features Overview

1. **🎙️ Hands-Free Voice Dictation & Text-to-Speech (TTS)**:
   - **Real-Time Dictation**: Integrated Web Speech Recognition (`webkitSpeechRecognition` / `SpeechRecognition`) directly into the journal editor for seamless hands-free thought recording.
   - **AI Audio Output**: Web Speech Synthesis allows users to listen to Gemini's reflections, advice, and summaries spoken back aloud with play/pause and stop controls.

2. **🎯 SMART Goal Checklist Extractor**:
   - **Automated Extraction**: Gemini analyzes journal entries to identify actionable Specific, Measurable, Achievable, Relevant, and Time-bound (SMART) commitments.
   - **Interactive Management**: Users can track goals, mark completion, view target deadlines, and see categorized badges (Career, Health, Relationships, Personal).

3. **🔮 "Future Self (5-Year)" AI Persona**:
   - **Perspective Mode**: Gemini embodies the user's wise, fulfilled self living 5 years in the future, providing compassionate, long-term retrospective guidance on current anxieties and challenges.

4. **🔍 Natural Language Semantic Search**:
   - **Conversational Queries**: Search reflections by asking conceptual questions (e.g., *"When did I feel stressed?"*, *"Moments of gratitude"*, *"Lessons from setbacks"*).
   - **AI Relevance Scoring**: Highlights matching entries with relevance match percentages (`95% Match`), AI explanations of why they match, and direct extracted quote snippets.

5. **📊 Dynamic AI Mood Themes & Trend Dashboard**:
   - **Ambient Theme Accents**: Moods are classified into `calm`, `optimistic`, `reflective`, `determined`, and `neutral` categories, dynamically applying subtle color themes across the UI.
   - **Visual Analytics**: Interactive timeline graphing emotional trajectories across reflections and distribution breakdowns.

---

## 🔒 Security Architecture & Threat Model

| Threat Zone | Risk Scenario | Countermeasure Implemented |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection or malformed payload. | Strict parameter sanitization, recursive `stripUndefined` payload hygiene, and null-safe request destructuring. |
| **Planning & Reasoning** | Prompt injection/hijacking. | Server-side defensive framing separating user notes from system instructions. |
| **Tool & API Execution** | API Key leakage or single point of model failure. | Server-side proxy (`/api/reflect`, `/api/extract-smart-goals`, `/api/semantic-search`) with 4-tier model fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`). |
| **Memory & Storage** | Cross-tenant data leaks or unauthorized reads. | Hardened Owner-bound Firestore Security Rules matching `request.auth.uid == userId`. |
| **Inter-System Auth** | Stolen credentials or password attacks. | Passwordless federated Google Sign-In via Firebase Auth. No raw credentials stored. |

---

## 📁 Firestore Security Rules

All journal entries and interactions are stored strictly under `/users/{userId}/...` and protected with owner-bound rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🛠️ Google Cloud Prerequisites & Secret Management

### 1. Enable Required Google Cloud APIs

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

### 2. Secret Manager Configuration for Gemini API Key

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚀 Google Cloud Run Deployment Flow

### 1. Build and Deploy Service

```bash
gcloud run deploy reflect-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

### 2. Mandatory Campaign Verification Labeling

Register the service for automated challenge verification:

```bash
gcloud run services update reflect-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Walkthrough & Step-by-Step Test Guide

### Test Case 1: Landing Page & Google Authentication
1. Navigate to the application root.
2. Verify the landing page displays feature guarantees, security assertions, and a "Sign In with Google" action.
3. Click **"Sign In with Google"** and complete the federated Google Identity login.
4. **Expected Result**: Successfully redirects to the private dashboard with an active draft and displays a welcome notification toast.

### Test Case 2: Voice Dictation & Text-to-Speech
1. In the Journal Editor, click the **"Dictate"** microphone button.
2. Speak into the microphone: *"Today was challenging, but I learned how to prioritize high-impact goals."*
3. Verify that spoken words transcribe live into the journal canvas.
4. After generating an AI reflection, click the **"Listen"** (speaker) button next to the Gemini response.
5. **Expected Result**: Speech synthesis reads Gemini's advice aloud with play/pause and stop controls.

### Test Case 3: SMART Goal Extraction
1. Write an entry containing commitments: *"I need to run 5k three times this week and submit the financial report by Friday afternoon."*
2. Click the **"Extract SMART Goals"** button in the Goal Checklist panel.
3. **Expected Result**: Gemini automatically identifies discrete goals with categories (Health, Career) and target deadlines. Toggle checkbox updates goal completion and saves to Firestore.

### Test Case 4: Future Self (5-Year) Reflection Persona
1. Select the **"Future Self (5-Yr)"** persona from the reflection mode selector.
2. Click **"Reflect with Gemini"**.
3. **Expected Result**: Gemini responds from the perspective of your future self in 5 years, providing reassuring, long-term wisdom and perspective.

### Test Case 5: Natural Language Semantic Search
1. In the left sidebar, click the **"AI Search"** mode button.
2. Type a conceptual query: *"When did I feel overwhelmed?"* or click one of the suggested chips.
3. Press Enter or click **"Search"**.
4. **Expected Result**: Displays ranked matching reflections with match percentages (`95% Match`), AI explanation for why it matches, and quoted snippets. Clicking any result opens the reflection.

### Test Case 6: Mood Analytics Dashboard
1. In the top navigation bar, click the **"Mood Analytics"** button.
2. **Expected Result**: Opens the emotional analytics modal displaying dominant emotional trajectories over time, mood distribution percentages, and reflection counts.

### Test Case 7: Cross-User Data Isolation
1. Write and save an entry.
2. Sign out via the profile dropdown.
3. Sign in with a secondary Google account.
4. **Expected Result**: The dashboard initializes empty or with the second user's distinct records. Zero cross-user data leakage occurs due to Firestore owner-bound security rules.

---

## 🧪 Unit Testing

Run the automated test suite verifying payload sanitization, SMART goal logic, fallback ladder sequence, and persona directives:

```bash
npm test
```
