<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/bba89fc2-1eb8-4056-bb90-e7397f5e601a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key — **optional**; users can also paste their own key in the in-app Settings panel on first run.
3. Run the app:
   `npm run dev`

## BYOK (Bring Your Own Key)

EduSpark is **zero-ops**: deploys work with no server-side AI credentials. On first run the app walks each visitor through either:

- **Gemini** — paste a free Google AI Studio key (stored only in their browser's `localStorage`; never sent to our server), **or**
- **Ollama** — run open-source models locally. The onboarding flow handles install, `ollama serve`, and a real byte-progress model pull entirely inside the app.

OpenAI is still supported, tucked behind the *Advanced providers* accordion in Settings.

### Deploying to Vercel

One-click deploy works with **no environment variables set**. First-time visitors will be guided through the BYOK onboarding and the app will gate all generation behind a usable credential.

### Ollama from the browser (CORS)

When running `ollama serve`, export `OLLAMA_ORIGINS="*"` so the browser page can reach your local instance:

```
OLLAMA_ORIGINS="*" ollama serve
```
