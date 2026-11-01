import { ROLES, getRole } from "./personas.js";
import { streamChat, DEFAULT_MODEL } from "./gemini.js";
import { renderMarkdown } from "./markdown.js";

const $ = (id) => document.getElementById(id);
const els = {
  roles: $("roles"),
  roleLabel: $("roleLabel"),
  modelTag: $("modelTag"),
  messages: $("messages"),
  composer: $("composer"),
  input: $("input"),
  sendBtn: $("sendBtn"),
  clearBtn: $("clearBtn"),
  settingsBtn: $("settingsBtn"),
  modal: $("keyModal"),
  keyForm: $("keyForm"),
  keyInput: $("keyInput"),
  modelInput: $("modelInput"),
  rememberInput: $("rememberInput"),
  keyErr: $("keyErr"),
  keyCancel: $("keyCancel"),
};

const LS = { key: "ipb.apiKey", model: "ipb.model", role: "ipb.role" };

const state = {
  apiKey: localStorage.getItem(LS.key) || sessionStorage.getItem(LS.key) || "",
  model: localStorage.getItem(LS.model) || DEFAULT_MODEL,
  role: localStorage.getItem(LS.role) || "pm",
  // Each role keeps its own conversation.
  chats: Object.fromEntries(ROLES.map((r) => [r.id, []])),
  busy: false,
  abort: null,
};

/* ---------- roles ---------- */

function renderTabs() {
  els.roles.innerHTML = "";
  for (const r of ROLES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "role-tab" + (r.id === state.role ? " active" : "");
    b.dataset.role = r.id;
    b.title = r.tagline;
    b.setAttribute("aria-pressed", r.id === state.role);
    b.innerHTML = `<span class="rt-name">${r.name}</span>`;
    b.addEventListener("click", () => selectRole(r.id));
    els.roles.appendChild(b);
  }
}

function selectRole(id) {
  if (id === state.role) return;
  // Don't let a reply for one role land in another role's chat.
  state.abort?.abort();
  state.role = id;
  localStorage.setItem(LS.role, id);
  document.documentElement.dataset.role = id;
  renderTabs();
  renderChat();
}

/* ---------- chat rendering ---------- */

function bubble(role, html) {
  const d = document.createElement("div");
  d.className = `msg ${role}`;
  d.innerHTML = `<div class="bubble">${html}</div>`;
  return d;
}

function renderChat() {
  const role = getRole(state.role);
  els.roleLabel.textContent = role.name;
  els.modelTag.textContent = state.model;
  els.messages.innerHTML = "";
  const chat = state.chats[role.id];

  if (!chat.length) {
    const hero = document.createElement("div");
    hero.className = "hero";
    hero.innerHTML = `<h2>${role.name}</h2><p>${role.welcome}</p><div class="starters"></div>`;
    const box = hero.querySelector(".starters");
    for (const s of role.starters) {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "starter";
      c.textContent = s;
      c.addEventListener("click", () => send(s));
      box.appendChild(c);
    }
    els.messages.appendChild(hero);
  } else {
    for (const m of chat) {
      els.messages.appendChild(
        m.role === "user" ? bubble("user", renderMarkdown(m.text)) : bubble("bot", renderMarkdown(m.text)),
      );
    }
  }
  scrollDown();
  setBusy(false);
}

function scrollDown() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

function setBusy(b) {
  state.busy = b;
  els.sendBtn.textContent = b ? "Stop" : "Send";
  els.sendBtn.classList.toggle("stop", b);
}

/* ---------- sending ---------- */

async function send(text) {
  text = text.trim();
  if (!text || state.busy) return;
  if (!state.apiKey) return openModal(false);

  const roleId = state.role;
  const role = getRole(roleId);
  const chat = state.chats[roleId];
  chat.push({ role: "user", text });
  els.input.value = "";
  autosize();
  renderChat();

  const botEl = bubble("bot", '<span class="typing"><i></i><i></i><i></i></span>');
  els.messages.appendChild(botEl);
  const target = botEl.querySelector(".bubble");
  scrollDown();
  setBusy(true);

  const ctrl = new AbortController();
  state.abort = ctrl;
  let acc = "";

  try {
    await streamChat({
      apiKey: state.apiKey,
      model: state.model,
      system: role.system,
      history: chat.slice(-30),
      signal: ctrl.signal,
      onToken: (t) => {
        acc += t;
        if (state.role === roleId) {
          target.innerHTML = renderMarkdown(acc);
          scrollDown();
        }
      },
    });
    chat.push({ role: "model", text: acc });
  } catch (e) {
    if (e.name === "AbortError") {
      if (acc) chat.push({ role: "model", text: acc + "\n\n_(stopped)_" });
    } else {
      // Drop the unanswered user turn so history keeps alternating user/model.
      chat.pop();
      if (state.role === roleId) {
        target.classList.add("error");
        target.textContent = e.message;
        els.input.value = text;
        autosize();
        setBusy(false);
        state.abort = null;
        return;
      }
    }
  }
  state.abort = null;
  if (state.role === roleId) renderChat();
  else setBusy(false);
}

/* ---------- composer ---------- */

function autosize() {
  els.input.style.height = "auto";
  els.input.style.height = Math.min(els.input.scrollHeight, 160) + "px";
}

els.composer.addEventListener("submit", (e) => {
  e.preventDefault();
  if (state.busy) state.abort?.abort();
  else send(els.input.value);
});
els.input.addEventListener("input", autosize);
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    els.composer.requestSubmit();
  }
});
els.clearBtn.addEventListener("click", () => {
  state.abort?.abort();
  state.chats[state.role] = [];
  renderChat();
});

/* ---------- API key modal ---------- */

function openModal(cancellable) {
  els.keyInput.value = state.apiKey;
  els.modelInput.value = state.model;
  els.rememberInput.checked = !!localStorage.getItem(LS.key);
  els.keyErr.hidden = true;
  els.keyCancel.hidden = !cancellable;
  els.modal.hidden = false;
  els.keyInput.focus();
}

els.settingsBtn.addEventListener("click", () => openModal(true));
els.keyCancel.addEventListener("click", () => (els.modal.hidden = true));

els.keyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const key = els.keyInput.value.trim();
  const model = els.modelInput.value.trim() || DEFAULT_MODEL;
  if (key.length < 20 || /\s/.test(key)) {
    els.keyErr.textContent = "That does not look like a Gemini API key. Paste the full key.";
    els.keyErr.hidden = false;
    return;
  }
  state.apiKey = key;
  state.model = model;
  localStorage.removeItem(LS.key);
  sessionStorage.removeItem(LS.key);
  (els.rememberInput.checked ? localStorage : sessionStorage).setItem(LS.key, key);
  localStorage.setItem(LS.model, model);
  els.modelTag.textContent = model;
  els.modal.hidden = true;
  els.input.focus();
});

/* ---------- boot ---------- */

if (!ROLES.some((r) => r.id === state.role)) state.role = "pm";
document.documentElement.dataset.role = state.role;
renderTabs();
renderChat();
if (!state.apiKey) openModal(false);
