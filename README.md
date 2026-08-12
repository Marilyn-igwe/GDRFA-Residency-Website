# GDRFA Voice Assistant

This project is organized into two applications:

```text
gdrfa_voice_assistant/
  frontend/   Vite + Preact website, typed chat, microphone and spoken replies
  backend/    Express API, Gemini integration and local chatbot fallback
```

The chatbot retrieves the official GDRFA services catalog from
`https://gdrfad.gov.ae/en/services`, gives that content to Gemini, and asks it
to answer only from that source. Typed questions and microphone transcripts use
the same endpoint. Replies appear in the chat and can be read aloud.

## 1. Get a free Gemini API key

Create a key at `https://aistudio.google.com/apikey`. Do not commit or paste the
key into frontend code.

## 2. Configure and start the backend

Open a terminal in `backend/`, copy `.env.example` to `.env`, and replace the
placeholder with your key:

```env
GEMINI_API_KEY=your_real_key
GEMINI_MODEL=gemini-2.5-flash-lite
PORT=4000
```

Then run:

```bash
npm install
npm start
```

The health endpoint is `http://localhost:4000/api/health`.

## 3. Start the frontend

Open a second terminal in `frontend/` and run:

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Voice usage

Use Chrome or Edge, open the chat bubble, click the microphone, and allow
microphone access. Click the volume button to enable or mute spoken replies.
Recognition and playback use the browser Web Speech APIs and do not consume
Gemini audio tokens.

## Safety and fallback

- The Gemini key stays in the backend.
- If no key is configured or Gemini/GDRFA is temporarily unavailable, the
  existing local service matcher answers supported questions.
- Free-tier Gemini data may be used by Google to improve its products. Do not
  send passport scans, Emirates IDs, application records, or personal data.
- This prototype is not an official GDRFA channel. Users should verify important
  requirements and fees on the linked official service page.
