// 🔑 REPLACE THIS WITH A NEW KEY FROM https://aistudio.google.com/
const GEMINI_API_KEY = "AIzaSyAdYQpUGWzjud8lP_gnE3MSwgNAMlx6r28";

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
  // Task-level AI buttons
  document.querySelectorAll('.ai-enhance-btn').forEach(btn => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.6' : '1';
    btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  });

  // Optional day summary button (if present in your HTML)
  const summarizeBtn = document.getElementById('summarizeBtn');
  if (summarizeBtn) {
    summarizeBtn.disabled = disabled;
    summarizeBtn.style.opacity = disabled ? '0.6' : '1';
    summarizeBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }
}

// --- Core API Function ---
async function callGemini(prompt, retries = 2) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("REPLACE") || GEMINI_API_KEY.includes("PASTE_YOUR_NEW_KEY_HERE")) {
    return "⚠️ Please add a valid API Key!";
  }

  if (isAiBusy) {
    return "⏳ Please wait, AI is already working...";
  }

  isAiBusy = true;
  setAiButtonsDisabled(true);

  // Supported endpoint/model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Gemini Error:", data.error);

      // Rate limit / quota handling
      if (data.error.code === 429) {
        if (retries > 0) {
          // Wait 5 seconds, then retry
          await new Promise(resolve => setTimeout(resolve, 5000));
          isAiBusy = false; // allow retry
          return await callGemini(prompt, retries - 1);
        }
        return "⚠️ Too many requests / quota limit reached. Please wait 30–60 seconds and try again.";
      }

      return "AI Error: " + data.error.message;
    }

    return data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "No response from AI. Try again!";

  } catch (error) {
    console.error("Fetch Error:", error);
    return "Connection Error. Check your internet!";
  } finally {
    isAiBusy = false;
    setAiButtonsDisabled(false);
  }
}

// --- App Logic ---
function renderTasks() {
  const taskList = document.getElementById('taskList');
  const today = new Date().toISOString().split('T')[0];
  taskList.innerHTML = '';

  const filtered = tasks.filter(t => {
    if (currentView === 'today') return t.date === today;
    if (currentView === 'upcoming') return t.date > today;
    return true; // 'all'
  });

  const viewTitle = document.getElementById('viewTitle');
  if (viewTitle) {
    viewTitle.innerHTML = `${currentView.toUpperCase()} <span>${filtered.length}</span>`;
  }

  const completedCount = document.getElementById('completedCount');
  if (completedCount) {
    completedCount.innerText = tasks.filter(t => t.completed).length;
  }

  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;

    li.innerHTML = `
      <div>
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
        <span>${escapeHtml(task.text)} <small style="color:#999">(${escapeHtml(task.date || '')})</small></span>
        <button class="ai-enhance-btn" onclick="enhanceTaskById(${task.id})">✨ AI Fix</button>
      </div>
      <button onclick="deleteTask(${task.id})" style="color:red; border:none; background:none; cursor:pointer; font-size:20px;">&times;</button>
    `;

    taskList.appendChild(li);
  });
}

// --- AI Actions ---
async function enhanceTaskById(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const box = document.getElementById('suggestionBox');
  if (box) box.innerHTML = "<em>✨ AI is thinking...</em>";

  const result = await callGemini(
    `The student has a task: "${task.text}". Suggest a more detailed and productive version of this task in 10 words or less.`
  );

  if (box) {
    box.innerHTML = `<strong>Try this instead:</strong><br>${escapeHtml(result)}`;
  }
}

async function summarizeDay() {
  const box = document.getElementById('suggestionBox');
  const activeTasks = tasks.filter(t => !t.completed);

  if (activeTasks.length === 0) {
    if (box) box.innerText = "All caught up! No active tasks to summarize.";
    return;
  }

  if (box) box.innerText = "Analyzing your day...";

  const taskList = activeTasks.map(t => t.text).join(", ");
  const result = await callGemini(
    `Here is my task list: ${taskList}. Summarize my day and give me one short tip to stay productive.`
  );

  if (box) box.innerText = result;
}

// --- Task Handlers ---
const addBtn = document.getElementById('addBtn');
if (addBtn) {
  addBtn.onclick = () => {
    const input = document.getElementById('taskInput');
    const dateInput = document.getElementById('taskDate');

    if (!input) return;

    const text = input.value.trim();
    const date = dateInput?.value || new Date().toISOString().split('T')[0];

    if (text) {
      tasks.push({
        id: Date.now(),
        text,
        date,
        completed: false
      });

      input.value = '';
      saveAndRender();
    }
  };
}

window.toggleTask = (id) => {
  tasks = tasks.map(t =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
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

window.summarizeDay = summarizeDay; // expose if your HTML button uses onclick="summarizeDay()"

function saveAndRender() {
  localStorage.setItem('studentTasks', JSON.stringify(tasks));
  renderTasks();
}

// --- Sidebar Nav ---
document.querySelectorAll('.nav-item').forEach(item => {
  item.onclick = () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    currentView = item.id.replace('view-', '');
    renderTasks();
  };
});

// --- Initialize Date ---
const taskDate = document.getElementById('taskDate');
if (taskDate) taskDate.valueAsDate = new Date();

renderTasks();
