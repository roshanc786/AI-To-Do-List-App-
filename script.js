// State Management
let tasks = JSON.parse(localStorage.getItem('studentTasks')) || [];
let currentView = 'today';
let searchQuery = '';

// Selectors
const taskList = document.getElementById('taskList');
const taskInput = document.getElementById('taskInput');
const taskDate = document.getElementById('taskDate');
const addBtn = document.getElementById('addBtn');
const viewTitle = document.getElementById('viewTitle');
const suggestionBox = document.getElementById('suggestionBox');
const navItems = document.querySelectorAll('.nav-item');
const searchInput = document.getElementById('searchInput');
const completedCountEl = document.getElementById('completedCount');
const clearBtn = document.getElementById('clearAllBtn');

// Set default date to Today
taskDate.valueAsDate = new Date();

// --- Navigation ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        currentView = item.id.replace('view-', '');
        renderTasks();
    });
});

// --- Search ---
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderTasks();
});

// --- Add Task ---
addBtn.addEventListener('click', () => {
    const text = taskInput.value.trim();
    const dateValue = taskDate.value;

    if (text) {
        tasks.push({
            id: Date.now(),
            text: text,
            date: dateValue,
            completed: false
        });
        taskInput.value = '';
        saveAndRender();
        generateAISuggestion(text);
    }
});

// --- Clear All Function (FIXED) ---
clearBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all tasks?")) {
        tasks = [];
        localStorage.removeItem('studentTasks');
        suggestionBox.innerText = "All tasks cleared. Start fresh!";
        saveAndRender();
    }
});

// --- Render UI ---
function renderTasks() {
    taskList.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];

    // Filter Logic
    const filtered = tasks.filter(task => {
        const matchesSearch = task.text.toLowerCase().includes(searchQuery);
        if (currentView === 'today') return task.date === today && matchesSearch;
        if (currentView === 'upcoming') return task.date > today && matchesSearch;
        return matchesSearch; // All tasks
    });

    // Update Headers & Stats
    const displayTitle = currentView.charAt(0).toUpperCase() + currentView.slice(1);
    viewTitle.innerHTML = `${displayTitle} <span>${filtered.length}</span>`;
    
    const doneCount = tasks.filter(t => t.completed).length;
    completedCountEl.innerText = doneCount;

    // Create List
    filtered.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <div>
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
                <span>${task.text} <small style="display:block; color:#999; font-size:0.7em;">${task.date}</small></span>
            </div>
            <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
        `;
        taskList.appendChild(li);
    });
}

// --- Logic Helpers ---
window.toggleTask = function(id) {
    tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveAndRender();
};

window.deleteTask = function(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveAndRender();
};

function saveAndRender() {
    localStorage.setItem('studentTasks', JSON.stringify(tasks));
    renderTasks();
}

function generateAISuggestion(text) {
    suggestionBox.innerText = "AI is thinking...";
    setTimeout(() => {
        suggestionBox.innerText = `To master "${text}", try the 5-minute rule: commit to working on it for just 5 minutes. Usually, you'll keep going!`;
    }, 600);
}

// Initial Load
renderTasks();