// --- ELEMENTY ---
const daysContainer = document.getElementById('daysContainer');
const monthDisplay = document.getElementById('monthDisplay');
const eventList = document.getElementById('eventList');
const modal = document.getElementById('eventModal');
const journalInput = document.getElementById('journalInput');
const canvas = document.getElementById('rainCanvas');
const ctx = canvas.getContext('2d');

let date = new Date();
let events = JSON.parse(localStorage.getItem('calendarEventsExtended')) || {};
let journals = JSON.parse(localStorage.getItem('calendarJournals')) || {};
let userXP = parseInt(localStorage.getItem('lofiUserXP')) || 0;

// --- SYSTEM XP ---
function addXP(amount) {
    userXP += amount;
    localStorage.setItem('lofiUserXP', userXP);
    updateXPDisplay();
}
function updateXPDisplay() {
    const level = Math.floor(userXP / 100) + 1;
    document.getElementById('xpBadge').innerText = `Level ${level} • ${userXP % 100}/100 XP`;
}
updateXPDisplay();

// --- POMODORO TIMER ---
let timerInterval;
let timeLeft = 25 * 60;
let isTimerRunning = false;

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    document.getElementById('timerDisplay').innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

document.getElementById('startTimer').onclick = () => {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        document.getElementById('startTimer').innerText = "Start";
    } else {
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                addXP(50); // Nagroda za sesję
                alert("Czas skupienia zakończony! +50 XP");
                timeLeft = 25 * 60;
                updateTimerDisplay();
            }
        }, 1000);
        document.getElementById('startTimer').innerText = "Pauza";
    }
    isTimerRunning = !isTimerRunning;
};

document.getElementById('resetTimer').onclick = () => {
    clearInterval(timerInterval);
    timeLeft = 25 * 60;
    isTimerRunning = false;
    updateTimerDisplay();
    document.getElementById('startTimer').innerText = "Start";
};

// --- SEARCH ---
document.getElementById('searchForm').onsubmit = (e) => {
    e.preventDefault();
    const query = document.getElementById('searchInput').value;
    if (query) window.open(`https://www.google.com/search?q=${query}`, '_blank');
};

// --- DESZCZ I SCENERIE ---
let raindrops = [];
function initRain() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    raindrops = [];
    for(let i=0; i<80; i++) raindrops.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, len: Math.random()*20+10, speed: Math.random()*10+5 });
}
function drawRain() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(174,194,224,0.4)";
    ctx.lineWidth = 1;
    raindrops.forEach(p => {
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.len); ctx.stroke();
        p.y += p.speed; if(p.y > canvas.height) p.y = -p.len;
    });
    if(document.body.classList.contains('theme-rainy')) requestAnimationFrame(drawRain);
}

function changeTheme(theme) {
    document.body.className = `theme-${theme}`;
    const amb = document.getElementById('ambientAudio');
    const sounds = { rainy: "https://www.soundjay.com/nature/rain-07.mp3", night: "https://www.soundjay.com/nature/crickets-chirping-01.mp3" };
    if (sounds[theme]) { amb.src = sounds[theme]; amb.play(); if(theme==='rainy'){ canvas.style.opacity="1"; initRain(); drawRain(); } }
    else { amb.pause(); canvas.style.opacity="0"; }
}

// --- POGODA, ZEGAREK, MUZYKA ---
async function fetchWeather() {
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=52.22&longitude=21.01&current_weather=true');
        const data = await res.json();
        document.getElementById('weatherTemp').innerText = `${Math.round(data.current_weather.temperature)}°C`;
    } catch (e) {}
}
fetchWeather();
setInterval(() => {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('pl-PL');
    document.getElementById('currentDateText').innerText = now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}, 1000);

document.getElementById('playBtn').onclick = function() {
    const audio = document.getElementById('lofiAudio');
    if (audio.paused) { audio.play(); this.innerText = "⏸️ Pauza"; }
    else { audio.pause(); this.innerText = "🎵 Odtwórz Muzykę"; }
};

// --- JOURNAL ---
journalInput.oninput = () => {
    const key = `${date.getFullYear()}-${date.getMonth()+1}-${new Date().getDate()}`;
    journals[key] = journalInput.value;
    localStorage.setItem('calendarJournals', JSON.stringify(journals));
};

// --- KALENDARZ ---
function renderCalendar() {
    daysContainer.innerHTML = "";
    const year = date.getFullYear(), month = date.getMonth();
    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    monthDisplay.innerText = `${monthNames[month]} ${year}`;

    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < firstDay; i++) daysContainer.appendChild(document.createElement('div'));

    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
        const div = document.createElement('div');
        div.className = 'day';
        div.innerHTML = `<span>${i}</span>`;
        const key = `${year}-${month + 1}-${i}`;
        if (events[key]) {
            const dot = document.createElement('div');
            dot.className = `event-mark mark-${events[key].category}`;
            div.appendChild(dot);
        }
        if (i === new Date().getDate() && month === new Date().getMonth()) div.classList.add('today');
        div.onclick = () => openModal(key);
        daysContainer.appendChild(div);
    }
    updateEventList();
    const todayKey = `${year}-${month+1}-${new Date().getDate()}`;
    journalInput.value = journals[todayKey] || "";
}

function updateEventList() {
    eventList.innerHTML = "";
    const keys = Object.keys(events).filter(k => k.startsWith(`${date.getFullYear()}-${date.getMonth() + 1}-`));
    keys.sort((a,b) => a.split('-')[2] - b.split('-')[2]).forEach(k => {
        const item = document.createElement('div');
        item.className = `event-item widget item-${events[k].category}`;
        item.style.marginBottom = "8px";
        item.innerHTML = `<strong>${k.split('-')[2]}:</strong> ${events[k].title}`;
        eventList.appendChild(item);
    });
}

// --- MODAL ---
let currentTodos = [];
let activeDateKey = "";
function openModal(key) {
    activeDateKey = key;
    document.getElementById('selectedDateText').innerText = key;
    const ev = events[key] || { title: "", category: "chill", todos: [] };
    document.getElementById('eventTitle').value = ev.title;
    document.getElementById('eventCategory').value = ev.category;
    currentTodos = ev.todos;
    renderTodos();
    modal.style.display = "block";
}
function renderTodos() {
    const container = document.getElementById('todoListContainer');
    container.innerHTML = "";
    currentTodos.forEach((t, i) => {
        const d = document.createElement('div');
        d.className = `todo-item ${t.done ? 'done' : ''}`;
        d.innerHTML = `<input type="checkbox" ${t.done?'checked':''} onchange="toggleT(${i})"> <span>${t.text}</span>`;
        container.appendChild(d);
    });
}
window.toggleT = (i) => {
    currentTodos[i].done = !currentTodos[i].done;
    if(currentTodos[i].done) addXP(10); // +10 XP za zadanie
    renderTodos();
};
document.getElementById('addTodoBtn').onclick = () => {
    const val = document.getElementById('todoInput').value;
    if (val) { currentTodos.push({text: val, done: false}); document.getElementById('todoInput').value = ""; renderTodos(); }
};
document.getElementById('saveEvent').onclick = () => {
    const title = document.getElementById('eventTitle').value;
    if (title || currentTodos.length) events[activeDateKey] = { title, category: document.getElementById('eventCategory').value, todos: currentTodos };
    else delete events[activeDateKey];
    localStorage.setItem('calendarEventsExtended', JSON.stringify(events));
    modal.style.display = "none"; renderCalendar();
};
document.getElementById('deleteEvent').onclick = () => { delete events[activeDateKey]; localStorage.setItem('calendarEventsExtended', JSON.stringify(events)); modal.style.display = "none"; renderCalendar(); };
document.getElementById('closeModal').onclick = () => modal.style.display = "none";
document.getElementById('prevMonth').onclick = () => { date.setMonth(date.getMonth() - 1); renderCalendar(); };
document.getElementById('nextMonth').onclick = () => { date.setMonth(date.getMonth() + 1); renderCalendar(); };

renderCalendar();