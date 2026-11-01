# AI Interview Agent

A chatbot that helps you prepare for AI job interviews. Pick the role you are interviewing for. The bot then coaches you for that job only.

Roles covered:

1. **AI Product Manager**: product sense, metrics, AI tradeoffs, roadmap.
2. **Forward Deployed Engineer**: customer scoping, integrations, live debugging, system design.
3. **AI Researcher**: ML fundamentals, papers, experiment design, research taste.

## Features

- Three round role buttons. Each role has its own coach prompt, starter questions and chat history.
- Mock interview mode. Say "start a mock interview". The bot asks one question at a time, scores your answer out of 10 and gives a stronger version.
- Blue and neon gradient background with a grid. The accent colour shifts a little when you change role (cyan, green, violet).
- Streaming replies, with a Stop button.
- You bring your own Gemini API key. It is asked for on first load.
- No backend. The browser talks directly to the Gemini API.

## Quick start

You need Node.js 18 or newer and a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/aneethasubramaniam-sudo/interview-persona-bot.git
cd interview-persona-bot
npm install
npm run dev
```

Open http://localhost:5173 and paste your key.

Other commands:

```bash
npm run build     # production build in dist/
npm run preview   # serve the build locally
```

## Using the app

1. Paste your Gemini API key and save.
2. Click a role circle.
3. Tap a starter question, or type your own.
4. Use **Clear chat** to reset the current role. Use **API key** to change the key or model.

Switching roles does not delete the other chats. They stay until you refresh the page.

## Model

The default model is `gemini-3.8-flash`. You can change it in the API key dialog. If Google returns "model not found", check the exact model name available to your key in AI Studio.

## Project structure

```
index.html        page layout and API key dialog
src/main.js       app logic: roles, chat, key handling
src/gemini.js     streaming call to the Gemini REST API
src/personas.js   coach prompt and starters for each role
src/markdown.js   small safe markdown renderer
src/style.css     theme, grid background, per-role colours
```

To change how a coach behaves, edit `src/personas.js`. To change colours, edit the `:root[data-role=...]` blocks in `src/style.css`.

## Security notes

- Your key stays in your browser and goes only to Google.
- By default it is saved for the current tab session only. "Remember on this device" saves it in `localStorage`. Use that only on a device you trust.
- Do not deploy this with your own key built in. Anyone could read it from the page. Each user should bring their own key.
- Model replies are HTML-escaped before display.

## Limits

- Chats are not saved after a page refresh.
- Answers come from the model. Check facts before you use them in a real interview.
- The bot is told not to invent facts about specific companies, but it can still be wrong.

## Tech

Vite and plain JavaScript. No runtime dependencies.
