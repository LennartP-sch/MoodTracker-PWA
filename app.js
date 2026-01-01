/**
 * Mood Tracker PWA
 * Personal mood tracking with localStorage persistence
 */

const MOODS = {
    'A+': { label: 'Positive core memory', color: '#2D5016' },
    'A': { label: 'Very positive', color: '#4CAF50' },
    'B': { label: 'Positive', color: '#8BC34A' },
    'C': { label: 'Neutral (or the positive offset the negative)', color: '#FFEB3B' },
    'D': { label: 'Negative', color: '#FF9800' },
    'F': { label: 'Very negative', color: '#E91E63' }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STORAGE_KEY = 'moodTrackerData';
const NOTES_STORAGE_KEY = 'moodTrackerNotes';

class MoodTracker {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.data = this.loadData();
        this.notes = this.loadNotes();
        this.selectedCell = null;

        this.init();
    }

    init() {
        this.cacheElements();
        this.renderToday();
        this.renderMonthHeaders();
        this.renderGrid();
        this.renderLegend();
        this.renderMoodOptions();
        this.updateStats();
        this.bindEvents();
        this.updateYearTitle();
    }

    cacheElements() {
        this.elements = {
            yearTitle: document.getElementById('yearTitle'),
            prevYear: document.getElementById('prevYear'),
            nextYear: document.getElementById('nextYear'),
            todayDate: document.getElementById('todayDate'),
            todayMoods: document.getElementById('todayMoods'),
            monthHeaders: document.getElementById('monthHeaders'),
            moodGrid: document.getElementById('moodGrid'),
            statsGrid: document.getElementById('statsGrid'),
            legendGrid: document.getElementById('legendGrid'),
            moodModal: document.getElementById('moodModal'),
            modalTitle: document.getElementById('modalTitle'),
            modalClose: document.getElementById('modalClose'),
            moodOptions: document.getElementById('moodOptions'),
            clearMood: document.getElementById('clearMood'),
            modalNote: document.getElementById('modalNote'),
            todayNote: document.getElementById('todayNote'),
            exportBtn: document.getElementById('exportBtn'),
            importBtn: document.getElementById('importBtn'),
            importFile: document.getElementById('importFile')
        };
    }

    bindEvents() {
        // Year navigation
        this.elements.prevYear.addEventListener('click', () => this.changeYear(-1));
        this.elements.nextYear.addEventListener('click', () => this.changeYear(1));

        // Modal
        this.elements.modalClose.addEventListener('click', () => this.closeModal());
        this.elements.moodModal.addEventListener('click', (e) => {
            if (e.target === this.elements.moodModal) this.closeModal();
        });
        this.elements.clearMood.addEventListener('click', () => this.setMood(null));

        // Export/Import
        this.elements.exportBtn.addEventListener('click', () => this.exportData());
        this.elements.importBtn.addEventListener('click', () => this.elements.importFile.click());
        this.elements.importFile.addEventListener('change', (e) => this.importData(e));

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        // Today note auto-save
        this.elements.todayNote.addEventListener('input', () => this.saveTodayNote());

        // Modal note auto-save
        this.elements.modalNote.addEventListener('input', () => this.saveModalNote());
    }

    loadData() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Error loading data:', e);
            return {};
        }
    }

    saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }

    loadNotes() {
        try {
            const saved = localStorage.getItem(NOTES_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Error loading notes:', e);
            return {};
        }
    }

    saveNotes() {
        try {
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(this.notes));
        } catch (e) {
            console.error('Error saving notes:', e);
        }
    }

    saveTodayNote() {
        const today = new Date();
        const key = this.getKey(today.getFullYear(), today.getMonth(), today.getDate());
        const note = this.elements.todayNote.value.trim();

        if (note) {
            this.notes[key] = note;
        } else {
            delete this.notes[key];
        }
        this.saveNotes();
    }

    saveModalNote() {
        if (!this.selectedCell) return;
        const key = this.selectedCell.dataset.key;
        const note = this.elements.modalNote.value.trim();

        if (note) {
            this.notes[key] = note;
        } else {
            delete this.notes[key];
        }
        this.saveNotes();
    }

    getKey(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    isToday(year, month, day) {
        const today = new Date();
        return today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
    }

    updateYearTitle() {
        this.elements.yearTitle.textContent = this.currentYear;
    }

    changeYear(delta) {
        this.currentYear += delta;
        this.updateYearTitle();
        this.renderGrid();
        this.updateStats();
    }

    renderToday() {
        const today = new Date();
        const day = today.getDate();
        const month = today.getMonth();
        const year = today.getFullYear();

        // Format date like "Wednesday, Jan 1"
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dateStr = `${dayNames[today.getDay()]}, ${MONTHS[month]} ${day}`;
        this.elements.todayDate.textContent = dateStr;

        // Get today's key and current mood
        const todayKey = this.getKey(year, month, day);
        const currentMood = this.data[todayKey] || '';

        // Render mood buttons
        const html = Object.entries(MOODS).map(([grade, { label, color }]) => {
            const isSelected = currentMood === grade;
            return `
                <button class="today-mood-btn ${isSelected ? 'selected' : ''}" data-mood="${grade}" data-key="${todayKey}">
                    <div class="today-mood-color" style="background: ${color}">${grade}</div>
                </button>
            `;
        }).join('');

        this.elements.todayMoods.innerHTML = html;

        // Bind click events
        this.elements.todayMoods.querySelectorAll('.today-mood-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setTodayMood(btn));
        });

        // Load today's note
        const todayNote = this.notes[todayKey] || '';
        this.elements.todayNote.value = todayNote;
    }

    setTodayMood(btn) {
        const mood = btn.dataset.mood;
        const key = btn.dataset.key;

        // Toggle if already selected
        if (this.data[key] === mood) {
            delete this.data[key];
        } else {
            this.data[key] = mood;
        }

        this.saveData();
        this.renderToday();
        this.renderGrid();
        this.updateStats();
    }

    renderMonthHeaders() {
        const html = ['<div class="day-label-header"></div>'];
        MONTHS.forEach(month => {
            html.push(`<div class="month-header">${month}</div>`);
        });
        this.elements.monthHeaders.innerHTML = html.join('');
    }

    renderGrid() {
        const html = [];

        for (let day = 1; day <= 31; day++) {
            // Day label
            html.push(`<div class="day-label">${day}</div>`);

            // Cells for each month
            for (let month = 0; month < 12; month++) {
                const daysInMonth = this.getDaysInMonth(this.currentYear, month);

                if (day <= daysInMonth) {
                    const key = this.getKey(this.currentYear, month, day);
                    const mood = this.data[key] || '';
                    const isToday = this.isToday(this.currentYear, month, day);

                    html.push(`
                        <div class="mood-cell ${isToday ? 'today' : ''}" 
                             data-key="${key}"
                             data-mood="${mood}"
                             data-month="${month}"
                             data-day="${day}">
                        </div>
                    `);
                } else {
                    html.push('<div class="mood-cell empty"></div>');
                }
            }
        }

        this.elements.moodGrid.innerHTML = html.join('');

        // Bind click events
        this.elements.moodGrid.querySelectorAll('.mood-cell:not(.empty)').forEach(cell => {
            cell.addEventListener('click', () => this.openModal(cell));
        });
    }

    renderLegend() {
        const html = Object.entries(MOODS).map(([grade, { label, color }]) => `
            <div class="legend-item">
                <div class="legend-color" style="background: ${color}">${grade}</div>
                <span class="legend-text">${label}</span>
            </div>
        `).join('');

        this.elements.legendGrid.innerHTML = html;
    }

    renderMoodOptions() {
        const html = Object.entries(MOODS).map(([grade, { label, color }]) => `
            <button class="mood-option" data-mood="${grade}">
                <div class="mood-option-color" style="background: ${color}">${grade}</div>
                <span class="mood-option-label">${label}</span>
            </button>
        `).join('');

        this.elements.moodOptions.innerHTML = html;

        // Bind events
        this.elements.moodOptions.querySelectorAll('.mood-option').forEach(btn => {
            btn.addEventListener('click', () => this.setMood(btn.dataset.mood));
        });
    }

    updateStats() {
        const counts = {};
        let total = 0;

        Object.keys(MOODS).forEach(mood => counts[mood] = 0);

        // Count moods for current year
        for (let month = 0; month < 12; month++) {
            const daysInMonth = this.getDaysInMonth(this.currentYear, month);
            for (let day = 1; day <= daysInMonth; day++) {
                const key = this.getKey(this.currentYear, month, day);
                const mood = this.data[key];
                if (mood && MOODS[mood]) {
                    counts[mood]++;
                    total++;
                }
            }
        }

        const html = Object.entries(MOODS).map(([grade, { color }]) => {
            const count = counts[grade];
            const percent = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
            return `
                <div class="stat-item">
                    <div class="stat-color" style="background: ${color}"></div>
                    <div class="stat-info">
                        <span class="stat-count">${count}</span>
                        <span class="stat-percent">${percent}%</span>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.statsGrid.innerHTML = html;
    }

    openModal(cell) {
        this.selectedCell = cell;
        const month = MONTHS[parseInt(cell.dataset.month)];
        const day = cell.dataset.day;
        const key = cell.dataset.key;

        this.elements.modalTitle.textContent = `${month} ${day}, ${this.currentYear}`;

        // Load note for this day
        this.elements.modalNote.value = this.notes[key] || '';

        this.elements.moodModal.classList.add('active');
    }

    closeModal() {
        this.elements.moodModal.classList.remove('active');
        this.selectedCell = null;
    }

    setMood(mood) {
        if (!this.selectedCell) return;

        const key = this.selectedCell.dataset.key;

        if (mood) {
            this.data[key] = mood;
            this.selectedCell.dataset.mood = mood;
        } else {
            delete this.data[key];
            this.selectedCell.dataset.mood = '';
        }

        this.saveData();
        this.updateStats();
        this.closeModal();
    }

    exportData() {
        const exportObj = {
            moods: this.data,
            notes: this.notes
        };
        const dataStr = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `mood-tracker-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);

                // Handle both old format (just moods) and new format (moods + notes)
                if (imported.moods) {
                    this.data = { ...this.data, ...imported.moods };
                    if (imported.notes) {
                        this.notes = { ...this.notes, ...imported.notes };
                    }
                } else {
                    // Old format - just mood data
                    this.data = { ...this.data, ...imported };
                }

                this.saveData();
                this.saveNotes();
                this.renderToday();
                this.renderGrid();
                this.updateStats();
                alert('Data imported successfully!');
            } catch (err) {
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

// Theme Manager - Auto light/dark based on time
function updateTheme() {
    const hour = new Date().getHours();
    // Light mode from 7am (7) to 7pm (19)
    const isDay = hour >= 7 && hour < 19;
    document.documentElement.setAttribute('data-theme', isDay ? 'light' : 'dark');
}

// Initialize theme and update every minute
updateTheme();
setInterval(updateTheme, 60000);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new MoodTracker();
});
