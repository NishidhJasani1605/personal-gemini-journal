# AI Journal & Reflections (ReflectAI)

A user-authenticated web application for personal journaling and multi-turn AI reflections powered by **Gemini 3.6 Flash**, **Firebase Authentication**, and **Cloud Firestore**.

---

## 🔒 Security Architecture & Threat Model

| Threat Zone | Risk Scenario | Mitigation Implemented |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection or malformed payload. | Strict parameter sanitization and null-safe request destructuring. |
| **Planning & Reasoning** | Prompt injection/hijacking. | Server-side defensive framing separating user notes from system instructions. |
| **Tool & API Execution** | API Key leakage or single point of model failure. | Server-side proxy (`/api/reflect`) with 4-tier model fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`). |
| **Memory & Storage** | Cross-tenant data leaks or unauthorized reads. | Owner-bound Firestore Security Rules matching `request.auth.uid == userId`. |
| **Inter-System Auth** | Stolen credentials or password attacks. | Passwordless federated Google Sign-In via Firebase Auth. |

---

## 📁 Firestore Security Rules

To ensure complete user data isolation, all journal entries and interaction records are stored under `/users/{userId}/...` and protected with:

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
gcloud run deploy reflect-ai-journal \
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
gcloud run services update reflect-ai-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Walkthrough & Step-by-Step Test Guide

### Test Case 1: Landing Page & Authentication
1. Navigate to the application root.
2. Verify the landing page displays feature guarantees, security assertions, and a "Sign In with Google" action.
3. Click **"Sign In with Google"** and complete the federated Google Identity login.
4. **Expected Result**: Successfully redirects to the user's private dashboard with an active draft and displays a welcome notification toast.

### Test Case 2: Writing a Journal Entry & Saving
1. In the editor, enter a title (e.g., `Overcoming Imposter Syndrome`) and write a reflection in the main canvas.
2. Add a mood tag (e.g., `Determined`) and enter hashtags (e.g., `#Growth`, `#Career`).
3. Click the **"Save"** button in the header.
4. **Expected Result**: The entry is persisted to `/users/{userId}/entries/{entryId}` in Firestore. The entry appears immediately in the left sidebar with timestamp, word count, and tags.

### Test Case 3: Generating Multi-Turn AI Reflections with Gemini 3.6 Flash
1. Select an AI reflection mode from the toolbar (e.g., **Stoic**, **Socratic**, **Summary**, or **Brainstorm**).
2. Click **"Reflect with Gemini 3.6 Flash"**.
3. **Expected Result**:
   - Backend calls `/api/reflect` with resilient model fallback.
   - An executive summary card and actionable insights are generated.
   - The reflection response is rendered with formatted markdown.
   - The entry and AI response are automatically saved to Firestore.

### Test Case 4: Continuing Multi-Turn Conversation
1. In the dialogue thread below the entry, type a follow-up query in the chat input (e.g., `How can I apply this during my team presentation tomorrow?`).
2. Click the send icon.
3. **Expected Result**: Gemini receives the full conversational context and responds contextually. Both user message and AI response are appended and persisted.

### Test Case 5: Multi-Entry Trend Synthesis
1. Click the **"Multi-Entry Synthesis"** button in the top navigation bar.
2. In the modal, click **"Run Synthesis Now"**.
3. **Expected Result**: Gemini synthesizes insights across all user entries, presenting dominant life narratives, emotional trajectory, core takeaways, and a recommended weekly focus.

### Test Case 6: Search, Tag Filtering & Isolation
1. Type a keyword or click a tag/mood filter pill in the sidebar.
2. Confirm the entry list filters in real-time.
3. Click **Sign Out** from the user profile dropdown.
4. Sign in with a different account.
5. **Expected Result**: The previous user's entries are completely isolated and inaccessible due to owner-bound Firestore security rules.
