// Void — frontend logic
// Reads config from window.VOID_CONFIG (see config.example.js).

const cfg = window.VOID_CONFIG;
if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
  alert("Missing config.js — copy config.example.js to config.js and fill it in.");
}

const supabase = window.supabase.createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_ANON_KEY
);
const API = cfg.API_BASE_URL;

// --- Element refs ---
const els = {
  authPanel: document.getElementById("auth-panel"),
  composer: document.getElementById("composer"),
  authStatus: document.getElementById("auth-status"),
  tabSignin: document.getElementById("tab-signin"),
  tabSignup: document.getElementById("tab-signup"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  username: document.getElementById("username"),
  authSubmit: document.getElementById("auth-submit"),
  authError: document.getElementById("auth-error"),
  postContent: document.getElementById("post-content"),
  charCount: document.getElementById("char-count"),
  postSubmit: document.getElementById("post-submit"),
  feed: document.getElementById("feed"),
};

let mode = "signin";

// --- Auth UI toggling ---
function setMode(next) {
  mode = next;
  els.tabSignin.classList.toggle("active", next === "signin");
  els.tabSignup.classList.toggle("active", next === "signup");
  els.username.classList.toggle("hidden", next !== "signup");
  els.authSubmit.textContent = next === "signin" ? "Sign in" : "Sign up";
  els.authError.textContent = "";
}

els.tabSignin.onclick = () => setMode("signin");
els.tabSignup.onclick = () => setMode("signup");

els.authSubmit.onclick = async () => {
  els.authError.textContent = "";
  const email = els.email.value.trim();
  const password = els.password.value;

  try {
    if (mode === "signup") {
      const username = els.username.value.trim();
      if (!username) throw new Error("Username is required");
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (e) {
    els.authError.textContent = e.message || "Authentication failed";
  }
};

// --- Session handling ---
async function refreshUI(session) {
  const signedIn = !!session;
  els.authPanel.classList.toggle("hidden", signedIn);
  els.composer.classList.toggle("hidden", !signedIn);

  if (signedIn) {
    els.authStatus.innerHTML = `<button id="signout" class="post-delete">sign out</button>`;
    document.getElementById("signout").onclick = () => supabase.auth.signOut();
  } else {
    els.authStatus.textContent = "";
  }
  loadFeed();
}

supabase.auth.onAuthStateChange((_event, session) => refreshUI(session));

// --- Helper: authed fetch to backend ---
async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// --- Composer ---
els.postContent.addEventListener("input", () => {
  els.charCount.textContent = `${els.postContent.value.length}/500`;
});

els.postSubmit.onclick = async () => {
  const content = els.postContent.value.trim();
  if (!content) return;
  try {
    await apiFetch("/api/posts", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    els.postContent.value = "";
    els.charCount.textContent = "0/500";
    loadFeed();
  } catch (e) {
    alert(e.message);
  }
};

// --- Feed ---
function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

async function loadFeed() {
  try {
    const posts = await apiFetch("/api/posts");
    const { data } = await supabase.auth.getSession();
    const myId = data.session?.user?.id;

    els.feed.innerHTML = posts
      .map((p) => {
        const username = p.profiles?.username || "anon";
        const canDelete = p.user_id === myId;
        return `
          <article class="post">
            <div class="post-head">
              <span class="post-user">@${escapeHtml(username)}</span>
              <span class="post-time">${timeAgo(p.created_at)}</span>
            </div>
            <div class="post-body">${escapeHtml(p.content)}</div>
            ${canDelete ? `<button class="post-delete" data-id="${p.id}">delete</button>` : ""}
          </article>`;
      })
      .join("");

    els.feed.querySelectorAll(".post-delete[data-id]").forEach((btn) => {
      btn.onclick = async () => {
        try {
          await apiFetch(`/api/posts/${btn.dataset.id}`, { method: "DELETE" });
          loadFeed();
        } catch (e) {
          alert(e.message);
        }
      };
    });
  } catch (e) {
    els.feed.innerHTML = `<p class="error">${escapeHtml(e.message)}</p>`;
  }
}

// --- Boot ---
setMode("signin");
supabase.auth.getSession().then(({ data }) => refreshUI(data.session));
