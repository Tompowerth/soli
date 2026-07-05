# SOLI — Deploy Guide (Step 1)

## What's new in v2.0
- ✅ Chat engine switched from Claude → **Gemini Flash** (96% cheaper)
- ✅ Chat UI built (`/app` route)
- ✅ Auth system (signup + login via Supabase)
- ✅ Updated dependencies & env vars

## Deploy Steps

### 1. Replace files
Copy these files into your `soli/` folder (overwrite existing):
```
soli/
├── api/
│   ├── chat.js          ← UPDATED (Gemini Flash)
│   └── auth.js          ← NEW
├── public/
│   ├── index.html       ← UPDATED (CTA → /app)
│   └── app.html         ← NEW (chat UI)
├── lib/
│   ├── system-prompt.js  (unchanged)
│   └── schema.sql        (unchanged)
├── package.json         ← UPDATED
└── vercel.json          ← UPDATED
```

### 2. Add Gemini API Key to Vercel
Open terminal in the `soli/` folder:
```bash
vercel env add GEMINI_API_KEY
```
Paste your Gemini API key from aistudio.google.com

### 3. Verify Supabase env vars exist
```bash
vercel env ls
```
You should see: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

### 4. Deploy
```bash
npm install
vercel --prod
```

### 5. Test
- Open heysoli.ai → Landing page
- Click "Start talking to SOLI" → Goes to /app
- Sign up with email + password
- Send a message → SOLI responds via Gemini Flash
