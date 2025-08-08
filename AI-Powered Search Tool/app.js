/* app.js — frontend logic */
const API_ENDPOINT = '/api/search'; // in production point to your deployed server URL if needed

// DOM
const form = document.getElementById('search-form');
const input = document.getElementById('query');
const responseArea = document.getElementById('response-area');
const responseEl = document.getElementById('response');
const loader = document.getElementById('loader');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const copyBtn = document.getElementById('copy-btn');
const saveHistoryBtn = document.getElementById('save-history-btn');
const toggleThemeBtn = document.getElementById('toggle-theme');

let typingInterval = null;

// --- Theme ---
const THEME_KEY = 'ai_theme';
function loadTheme(){
  const t = localStorage.getItem(THEME_KEY) || 'light';
  document.body.classList.toggle('dark', t === 'dark');
  toggleThemeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
}
function toggleTheme(){
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  toggleThemeBtn.textContent = isDark ? '☀️' : '🌙';
}
toggleThemeBtn.addEventListener('click', toggleTheme);
loadTheme();

// --- History ---
const HISTORY_KEY = 'ai_search_history';
function getHistory(){ return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
function saveHistoryItem(q, ans){
  const h = getHistory();
  h.unshift({q, ans, at: new Date().toISOString()});
  if(h.length > 50) h.length = 50;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  renderHistory();
}
function clearHistory(){
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}
clearHistoryBtn.addEventListener('click', ()=>{
  if(confirm('Clear search history?')) clearHistory();
});

function renderHistory(){
  const h = getHistory();
  historyList.innerHTML = '';
  if(h.length === 0){
    historyList.innerHTML = '<li style="opacity:0.7">No history yet — try a search</li>';
    return;
  }
  h.forEach((item, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${escapeHtml(item.q)}</strong><div style="font-size:12px;color:var(--muted)">${(new Date(item.at)).toLocaleString()}</div>`;
    li.addEventListener('click', ()=> {
      input.value = item.q;
      displayResponse(item.ans);
    });
    historyList.appendChild(li);
  });
}
renderHistory();

// --- Helpers ---
function escapeHtml(text){
  return text.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// Typing effect: gradually show text
function typeText(targetEl, text, speed = 18){
  clearInterval(typingInterval);
  targetEl.textContent = '';
  let i = 0;
  typingInterval = setInterval(() => {
    i++;
    targetEl.textContent = text.slice(0, i);
    if(i >= text.length) clearInterval(typingInterval);
  }, speed);
}

// Display response (no API)
function displayResponse(text){
  responseArea.classList.remove('hidden');
  responseEl.textContent = '';
  typeText(responseEl, text, 14);
}

// Copy
copyBtn.addEventListener('click', async ()=>{
  const txt = responseEl.textContent || '';
  try{
    await navigator.clipboard.writeText(txt);
    copyBtn.textContent = 'Copied!';
    setTimeout(()=> copyBtn.textContent = 'Copy', 1200);
  }catch(e){
    alert('Copy failed: ' + e.message);
  }
});

// Save currently displayed response to history
saveHistoryBtn.addEventListener('click', ()=>{
  const q = input.value.trim();
  const ans = responseEl.textContent || '';
  if(!q || !ans) return alert('No query/response to save');
  saveHistoryItem(q, ans);
  saveHistoryBtn.textContent = 'Saved!';
  setTimeout(()=> saveHistoryBtn.textContent = 'Save', 1100);
});

// --- Submit handler ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if(!q) return;
  // UI changes
  loader.classList.remove('hidden');
  responseArea.classList.add('hidden');
  responseEl.textContent = '';
  try{
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ query: q })
    });
    if(!res.ok){
      const msg = await res.text();
      throw new Error(msg || `Server error: ${res.status}`);
    }
    const data = await res.json();
    const aiText = data?.answer ?? 'No answer returned.';
    // show typing
    displayResponse(aiText);
    // save to history automatically
    saveHistoryItem(q, aiText);
  }catch(err){
    responseArea.classList.remove('hidden');
    responseEl.textContent = `Error: ${err.message}`;
  }finally{
    loader.classList.add('hidden');
  }
});


// --- On load, focus input ---
window.addEventListener('load', ()=> input.focus());
