// 🔑 Groq API Key
const GROQ_API_KEY = "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";

let tasks = JSON.parse(localStorage.getItem('studentTasks')) || [];
let currentView = 'today';
let isAiBusy = false;

// --- Helpers ---
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}

function setAiButtonsDisabled(disabled) {
  document.querySelectorAll('.ai-enhance-btn').forEach(btn => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.6' : '1';
    btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  });

  const summarizeBtn = document.getElementById('summarizeBtn');
  if (summarizeBtn) {
    summarizeBtn.disabled = disabled;
    summarizeBtn.style.opacity = disabled ? '0.6' : '1';
  }
}

// --- Groq API Function ---
async function callGroq(prompt) {
  if (!GROQ_API_KEY || GROQ_API_KEY === "") {
    return "⚠️ Missing Groq API Key!";
  }

  if (isAiBusy) return "⏳ Please wait, AI is already working...";

  isAiBusy = true;
  setAiButtonsDisabled(true);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a concise student productivity assistant. Give tips in 15 words or less." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return data.choices[0]?.message?.content || "No response.";
  } catch (error) {
    console.error("Groq Error:", error);
    return "⚠️ AI Error: " + error.message;
  } finally {
    isAiBusy = false;
    setAiButtonsDisabled(false);
  }
}

// --- App Logic ---
function renderTasks() {
  const taskList = document.getElementById('taskList');
  if (!taskList) return; // Safety check

  const today = new Date().toISOString().split('T')[0];
  taskList.innerHTML = '';

  const filtered = tasks.filter(t => {
    if (currentView === 'today') return t.date === today;
    if (currentView === 'upcoming') return t.date > today;
    return true; 
  });

  // Update Counters - Ensure these IDs match your HTML
  const viewTitle = document.getElementById('viewTitle');
  if (viewTitle) viewTitle.innerHTML = `${currentView.toUpperCase()} <span>${filtered.length}</span>`;

  const completedCount = document.getElementById('completedCount');
  if (completedCount) completedCount.innerText = tasks.filter(t => t.completed).length;

  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    // Using your exact UI structure from the "Working" screenshot
    li.innerHTML = `
      <div class="task-left">
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
        <span class="task-text">${escapeHtml(task.text)} <small>(${task.date})</small></span>
        <button class="ai-enhance-btn" onclick="enhanceTaskById(${task.id})">✨ AI Fix</button>
      </div>
      <button class="delete-btn" onclick="deleteTask(${task.id})">&times;</button>
    `;
    taskList.appendChild(li);
  });
}

// --- AI Actions ---
window.enhanceTaskById = async (id) => {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const box = document.getElementById('suggestionBox');
  if (box) box.innerHTML = "<em>⚡ Groq is thinking...</em>";

  const result = await callGroq(`Improve this task for a student: "${task.text}"`);
  if (box) box.innerHTML = `<strong>AI Suggestion:</strong><br>${escapeHtml(result)}`;
};

window.summarizeDay = async () => {
  const box = document.getElementById('suggestionBox');
  const activeTasks = tasks.filter(t => !t.completed);

  if (activeTasks.length === 0) {
    if (box) box.innerText = "All clear! Enjoy your day.";
    return;
  }

  if (box) box.innerText = "Analyzing day...";
  const taskNames = activeTasks.map(t => t.text).join(", ");
  const result = await callGroq(`Summarize these tasks and give 1 tip: ${taskNames}`);
  if (box) box.innerText = result;
};

// --- Task Handlers ---
const addBtn = document.getElementById('addBtn');
if (addBtn) {
  addBtn.onclick = () => {
    const input = document.getElementById('taskInput');
    const dateInput = document.getElementById('taskDate');
    const text = input.value.trim();
    const date = dateInput?.value || new Date().toISOString().split('T')[0];

    if (text) {
      tasks.push({ id: Date.now(), text, date, completed: false });
      input.value = '';
      saveAndRender();
    }
  };
}

window.toggleTask = (id) => {
  tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  saveAndRender();
};

window.deleteTask = (id) => {
  tasks = tasks.filter(t => t.id !== id);
  saveAndRender();
};

window.clearAll = () => {
  if (confirm("Clear all tasks?")) {
    tasks = [];
    saveAndRender();
  }
};

function saveAndRender() {
  localStorage.setItem('studentTasks', JSON.stringify(tasks));
  renderTasks();
}

// Initialize
const taskDate = document.getElementById('taskDate');
if (taskDate) taskDate.valueAsDate = new Date();
renderTasks();
