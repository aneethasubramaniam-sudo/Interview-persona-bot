# Interview Persona Bot

AI chatbot that coaches you for three roles: **AI Product Manager**, **Forward Deployed Engineer** and **AI Researcher**.
Each role has its own system prompt, starter questions, chat history and colour theme.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/
```

On first load, paste your Gemini API key (get one at https://aistudio.google.com/apikey).

## Notes

- Stack: Vite + vanilla JS. No runtime dependencies.
- The app calls the Gemini REST API (`streamGenerateContent`) straight from the browser. There is no backend.
- Default model is `gemini-3.8-flash`. You can change it in the API key dialog.
- The key is kept in `sessionStorage` by default. "Remember on this device" moves it to `localStorage`.
- Because the key lives in the browser, do not deploy this with a shared or paid key baked in. Each user brings their own.
- Role prompts live in `src/personas.js`. Theme colours live in `src/style.css` (`:root[data-role=...]`).
