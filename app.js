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
        this.currentMonth = new Date().getMonth();
        this.currentView = 'month'; // 'month' or 'year'
        this.data = this.loadData();
        this.notes = this.loadNotes();
        this.selectedCell = null;

        this.init();
    }

    init() {
        this.cacheElements();
        this.renderToday();
        this.renderWeekdayHeaders();
        this.renderMonthView();
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
            importFile: document.getElementById('importFile'),
            // View toggle
            monthViewBtn: document.getElementById('monthViewBtn'),
            yearViewBtn: document.getElementById('yearViewBtn'),
            monthView: document.getElementById('monthView'),
            yearView: document.getElementById('yearView'),
            // Month view elements
            monthTitle: document.getElementById('monthTitle'),
            prevMonth: document.getElementById('prevMonth'),
            nextMonth: document.getElementById('nextMonth'),
            weekdayHeaders: document.getElementById('weekdayHeaders'),
            monthGrid: document.getElementById('monthGrid'),
            // Share
            shareBtn: document.getElementById('shareBtn'),
            shareCanvas: document.getElementById('shareCanvas'),
            // Share Modal
            shareModal: document.getElementById('shareModal'),
            shareModalClose: document.getElementById('shareModalClose'),
            shareMonthBtn: document.getElementById('shareMonthBtn'),
            shareYearBtn: document.getElementById('shareYearBtn'),
            shareMonthLabel: document.getElementById('shareMonthLabel'),
            shareYearLabel: document.getElementById('shareYearLabel'),
            // Charts
            chartsBtn: document.getElementById('chartsBtn'),
            chartModal: document.getElementById('chartModal'),
            chartModalClose: document.getElementById('chartModalClose'),
            moodChart: document.getElementById('moodChart'),
            chartLegend: document.getElementById('chartLegend'),
            chartTimeframes: document.querySelectorAll('.timeframe-btn')
        };
        this.chartRange = 'week'; // Default chart range
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
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeChartModal();
            }
        });

        // Today note auto-save
        this.elements.todayNote.addEventListener('input', () => this.saveTodayNote());
        this.elements.todayNote.addEventListener('blur', () => this.saveTodayNote());

        // Modal note auto-save
        this.elements.modalNote.addEventListener('input', () => this.saveModalNote());
        this.elements.modalNote.addEventListener('blur', () => this.saveModalNote());

        // View toggle
        this.elements.monthViewBtn.addEventListener('click', () => this.switchView('month'));
        this.elements.yearViewBtn.addEventListener('click', () => this.switchView('year'));

        // Month navigation
        this.elements.prevMonth.addEventListener('click', () => this.changeMonth(-1));
        this.elements.nextMonth.addEventListener('click', () => this.changeMonth(1));

        // Share button - opens share modal
        this.elements.shareBtn.addEventListener('click', () => this.openShareModal());

        // Share modal handlers
        this.elements.shareModalClose.addEventListener('click', () => this.closeShareModal());
        this.elements.shareModal.addEventListener('click', (e) => {
            if (e.target === this.elements.shareModal) this.closeShareModal();
        });
        this.elements.shareMonthBtn.addEventListener('click', () => {
            this.closeShareModal();
            this.shareMonth();
        });
        this.elements.shareYearBtn.addEventListener('click', () => {
            this.closeShareModal();
            this.shareYear();
        });

        // Charts button and modal
        this.elements.chartsBtn.addEventListener('click', () => this.openChartModal());
        this.elements.chartModalClose.addEventListener('click', () => this.closeChartModal());
        this.elements.chartModal.addEventListener('click', (e) => {
            if (e.target === this.elements.chartModal) this.closeChartModal();
        });

        // Chart timeframe buttons
        this.elements.chartTimeframes.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.chartTimeframes.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.chartRange = btn.dataset.range;
                this.renderChart();
            });
        });

        // Chart tap interaction for showing tooltips
        this.elements.moodChart.addEventListener('click', (e) => this.handleChartTap(e));
        this.elements.moodChart.addEventListener('touchend', (e) => {
            if (e.changedTouches && e.changedTouches[0]) {
                const touch = e.changedTouches[0];
                this.handleChartTap({ clientX: touch.clientX, clientY: touch.clientY });
            }
        });
    }

    switchView(view) {
        this.currentView = view;

        // Update toggle buttons
        this.elements.monthViewBtn.classList.toggle('active', view === 'month');
        this.elements.yearViewBtn.classList.toggle('active', view === 'year');

        // Show/hide views
        this.elements.monthView.classList.toggle('hidden', view !== 'month');
        this.elements.yearView.classList.toggle('hidden', view !== 'year');
    }

    changeMonth(delta) {
        this.currentMonth += delta;

        // Handle year overflow
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
            this.updateYearTitle();
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
            this.updateYearTitle();
        }

        this.renderMonthView();
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
        this.renderMonthView(); // Update gray dot indicator
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

    getFirstDayOfMonth(year, month) {
        // Get day of week (0=Sun, 1=Mon, ..., 6=Sat)
        // Convert to Monday-first (0=Mon, ..., 6=Sun)
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    }

    renderWeekdayHeaders() {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const html = days.map(day => `<div class="weekday-header">${day}</div>`).join('');
        this.elements.weekdayHeaders.innerHTML = html;
    }

    renderMonthView() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        // Update month title
        this.elements.monthTitle.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;

        const daysInMonth = this.getDaysInMonth(this.currentYear, this.currentMonth);
        const firstDay = this.getFirstDayOfMonth(this.currentYear, this.currentMonth);

        let html = '';

        // Empty cells for days before first of month
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="month-day empty"></div>';
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const key = this.getKey(this.currentYear, this.currentMonth, day);
            const mood = this.data[key] || '';
            const hasNote = this.notes[key] ? 'has-note' : '';
            const isToday = this.isToday(this.currentYear, this.currentMonth, day) ? 'today' : '';

            html += `
                <div class="month-day ${isToday} ${hasNote}" 
                     data-key="${key}"
                     data-mood="${mood}"
                     data-month="${this.currentMonth}"
                     data-day="${day}">
                    ${day}
                </div>
            `;
        }

        this.elements.monthGrid.innerHTML = html;

        // Bind click events
        this.elements.monthGrid.querySelectorAll('.month-day:not(.empty)').forEach(cell => {
            cell.addEventListener('click', () => this.openModal(cell));
        });
    }

    updateYearTitle() {
        this.elements.yearTitle.textContent = this.currentYear;
    }

    changeYear(delta) {
        this.currentYear += delta;
        this.updateYearTitle();
        this.renderMonthView();
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

        // Bind click events (touchend for faster iOS response)
        this.elements.todayMoods.querySelectorAll('.today-mood-btn').forEach(btn => {
            const handler = (e) => {
                e.preventDefault();
                this.setTodayMood(btn);
            };
            btn.addEventListener('click', handler);
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
            // Track mood anonymously (only the grade, no user data)
            this.trackMoodAnonymously(mood);
        }

        this.saveData();
        this.renderToday();
        this.renderMonthView();
        this.renderGrid();
        this.updateStats();
    }

    renderMonthHeaders() {
        const html = MONTHS.map(month => `<div class="month-header">${month}</div>`);
        this.elements.monthHeaders.innerHTML = html.join('');
    }

    renderGrid() {
        const html = [];

        for (let day = 1; day <= 31; day++) {
            // Start row
            html.push('<div class="mood-row">');

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

            // End row
            html.push('</div>');
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
        // Save note before closing (in case user only edited text)
        if (this.selectedCell) {
            this.saveModalNote();
        }
        this.elements.moodModal.classList.remove('active');
        this.selectedCell = null;
    }

    setMood(mood) {
        if (!this.selectedCell) return;

        const key = this.selectedCell.dataset.key;

        if (mood) {
            this.data[key] = mood;
            this.selectedCell.dataset.mood = mood;
            // Track mood anonymously (only the grade, no user data)
            this.trackMoodAnonymously(mood);
        } else {
            delete this.data[key];
            this.selectedCell.dataset.mood = '';
        }

        this.saveData();
        this.renderMonthView();
        this.updateStats();
        this.closeModal();
    }

    // Anonymous mood tracking via GoatCounter (GDPR-compliant, no cookies)
    trackMoodAnonymously(mood) {
        if (typeof goatcounter !== 'undefined' && goatcounter.count) {
            goatcounter.count({
                path: `mood/${mood}`,
                title: `Mood: ${mood}`,
                event: true
            });
        }
    }

    // ===== CHART METHODS =====

    openChartModal() {
        this.elements.chartModal.classList.add('active');
        this.renderChart();
        this.renderChartLegend();
    }

    closeChartModal() {
        this.elements.chartModal.classList.remove('active');
    }

    moodToValue(mood) {
        // Convert mood to score points for cumulative chart
        // A+ = +3, A = +2, B = +1, C = 0 (baseline), D = -1, F = -2
        const values = { 'A+': 3, 'A': 2, 'B': 1, 'C': 0, 'D': -1, 'F': -2 };
        return values[mood] !== undefined ? values[mood] : null;
    }

    getMoodDataForRange(range) {
        const today = new Date();
        const data = [];
        let startDate;

        if (range === 'week') {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6);
        } else if (range === 'month') {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 29);
        } else { // year
            startDate = new Date(today);
            startDate.setFullYear(today.getFullYear() - 1);
            startDate.setDate(startDate.getDate() + 1);
        }

        const current = new Date(startDate);
        let cumulativeScore = 0;

        while (current <= today) {
            const key = this.getKey(current.getFullYear(), current.getMonth(), current.getDate());
            const mood = this.data[key] || null;
            const points = mood ? this.moodToValue(mood) : 0;

            // Add points to cumulative score
            cumulativeScore += points;

            data.push({
                date: new Date(current),
                mood: mood,
                points: points,
                cumulativeScore: cumulativeScore,
                label: this.formatDateLabel(current, range)
            });

            current.setDate(current.getDate() + 1);
        }

        return data;
    }

    formatDateLabel(date, range) {
        if (range === 'week') {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else if (range === 'month') {
            return date.getDate().toString();
        } else {
            return MONTHS[date.getMonth()];
        }
    }

    renderChart() {
        const canvas = this.elements.moodChart;
        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;

        // Set canvas size for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const padding = { top: 20, right: 15, bottom: 35, left: 15 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Get data for current range
        const data = this.getMoodDataForRange(this.chartRange);
        const numDays = data.length;

        // Store data for tap interaction
        this.chartData = data;
        this.chartPadding = padding;
        this.chartWidth = chartWidth;
        this.chartHeight = chartHeight;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get theme colors
        const computedStyle = getComputedStyle(document.documentElement);
        const textTertiary = computedStyle.getPropertyValue('--text-tertiary').trim() || '#5A5A5A';
        const bgTertiary = computedStyle.getPropertyValue('--bg-tertiary').trim() || '#252525';

        // Find first and last index with actual mood data
        let firstDataIndex = -1;
        let lastDataIndex = -1;
        for (let i = 0; i < data.length; i++) {
            if (data[i].mood) {
                if (firstDataIndex === -1) firstDataIndex = i;
                lastDataIndex = i;
            }
        }

        // Calculate best and worst case trajectories based on days with data
        const daysWithData = lastDataIndex - firstDataIndex + 1;
        const bestCaseMax = daysWithData * 3;  // All A+'s
        const worstCaseMin = daysWithData * -2; // All F's

        // Get actual min/max from data (only from valid range)
        const validScores = data.slice(firstDataIndex, lastDataIndex + 1).map(d => d.cumulativeScore);
        const actualMax = validScores.length > 0 ? Math.max(...validScores, 0) : 0;
        const actualMin = validScores.length > 0 ? Math.min(...validScores, 0) : 0;

        // Determine Y-axis range
        const yMax = Math.max(bestCaseMax, actualMax) + 5;
        const yMin = Math.min(worstCaseMin, actualMin) - 5;
        const yRange = yMax - yMin;

        // Store for tap interaction
        this.chartYMax = yMax;
        this.chartYMin = yMin;

        // Helper function to convert score to Y position
        const scoreToY = (score) => {
            return padding.top + chartHeight - ((score - yMin) / yRange * chartHeight);
        };

        // Calculate x positions
        const xStep = chartWidth / Math.max(numDays - 1, 1);
        this.chartXStep = xStep;

        // Draw subtle horizontal grid lines (no labels)
        const gridCount = 5;
        for (let i = 0; i <= gridCount; i++) {
            const score = yMin + (yRange * i / gridCount);
            const y = scoreToY(score);

            ctx.strokeStyle = bgTertiary;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Draw 0 baseline (grey dashed line)
        const zeroY = scoreToY(0);
        ctx.strokeStyle = textTertiary;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(width - padding.right, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Only draw reference lines and data line if we have data
        if (firstDataIndex !== -1) {
            const firstX = padding.left + firstDataIndex * xStep;
            const lastX = padding.left + lastDataIndex * xStep;
            const firstScore = data[firstDataIndex].cumulativeScore;

            // Draw best-case reference line from first data point
            ctx.strokeStyle = MOODS['A+'].color + '40';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(firstX, scoreToY(firstScore));
            ctx.lineTo(lastX, scoreToY(firstScore + bestCaseMax));
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw worst-case reference line from first data point
            ctx.strokeStyle = MOODS['F'].color + '40';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(firstX, scoreToY(firstScore));
            ctx.lineTo(lastX, scoreToY(firstScore + worstCaseMin));
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw the actual cumulative score line with smooth color blending
            // Only from first data point onwards
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            let lastMood = data[firstDataIndex].mood;

            for (let i = firstDataIndex + 1; i <= lastDataIndex; i++) {
                const prevX = padding.left + (i - 1) * xStep;
                const prevY = scoreToY(data[i - 1].cumulativeScore);
                const x = padding.left + i * xStep;
                const y = scoreToY(data[i].cumulativeScore);

                // Get moods for gradient
                const prevMood = data[i - 1].mood || lastMood;
                const currentMood = data[i].mood || lastMood;

                // Create gradient for smooth color transition
                const gradient = ctx.createLinearGradient(prevX, 0, x, 0);
                gradient.addColorStop(0, MOODS[prevMood].color);
                gradient.addColorStop(1, MOODS[currentMood].color);

                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x, y);
                ctx.strokeStyle = gradient;
                ctx.stroke();

                // Update lastMood if this day has a mood logged
                if (data[i].mood) {
                    lastMood = data[i].mood;
                }
            }
        }

        // X-axis labels
        ctx.font = '500 9px Inter, -apple-system, sans-serif';
        ctx.fillStyle = textTertiary;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        if (this.chartRange === 'year') {
            // For year view, show every other month to prevent overlap
            let lastLabelMonth = -2;
            data.forEach((d, i) => {
                const currentMonth = d.date.getMonth();
                const prevDate = i > 0 ? data[i - 1].date : null;

                // Only show label at month boundaries, and skip every other month
                if ((!prevDate || d.date.getMonth() !== prevDate.getMonth()) &&
                    (currentMonth - lastLabelMonth >= 2 || lastLabelMonth > currentMonth)) {
                    const x = padding.left + i * xStep;
                    // Use short month names (3 letters)
                    const shortMonth = MONTHS[currentMonth].substring(0, 3);
                    ctx.fillText(shortMonth, x, height - padding.bottom + 8);
                    lastLabelMonth = currentMonth;
                }
            });
        } else if (this.chartRange === 'month') {
            // Show every 5th day for month view
            data.forEach((d, i) => {
                if (i % 5 === 0 || i === data.length - 1) {
                    const x = padding.left + i * xStep;
                    ctx.fillText(d.label, x, height - padding.bottom + 8);
                }
            });
        } else {
            // Week view - show all days
            data.forEach((d, i) => {
                const x = padding.left + i * xStep;
                ctx.fillText(d.label, x, height - padding.bottom + 8);
            });
        }
    }

    handleChartTap(event) {
        if (!this.chartData || this.chartData.length === 0) return;

        const canvas = this.elements.moodChart;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const x = (event.clientX - rect.left);

        // Find the closest data point
        const dataX = x - this.chartPadding.left;
        const index = Math.round(dataX / this.chartXStep);

        if (index >= 0 && index < this.chartData.length) {
            const dataPoint = this.chartData[index];
            const dateStr = dataPoint.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const score = dataPoint.cumulativeScore;
            const mood = dataPoint.mood || 'No mood';

            // Show tooltip
            this.showChartTooltip(event.clientX, event.clientY,
                `${dateStr}\nScore: ${score >= 0 ? '+' : ''}${score}\nMood: ${mood}`);
        }
    }

    showChartTooltip(x, y, text) {
        // Remove existing tooltip
        const existing = document.querySelector('.chart-tooltip');
        if (existing) existing.remove();

        const tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.innerHTML = text.replace(/\n/g, '<br>');
        tooltip.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y - 80}px;
            transform: translateX(-50%);
            background: rgba(40, 40, 40, 0.95);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            text-align: center;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(tooltip);

        // Auto-remove after 2 seconds
        setTimeout(() => tooltip.remove(), 2000);
    }

    renderChartLegend() {
        const pointValues = { 'A+': '+3', 'A': '+2', 'B': '+1', 'C': '0', 'D': '-1', 'F': '-2' };
        const html = Object.entries(MOODS).map(([grade, { label, color }]) => `
            <div class="chart-legend-item">
                <div class="chart-legend-color" style="background: ${color}"></div>
                <span class="chart-legend-label">${grade} (${pointValues[grade]})</span>
            </div>
        `).join('');

        this.elements.chartLegend.innerHTML = html +
            '<div class="chart-baseline-label">Cumulative score • 0 = neutral baseline</div>';
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
                this.renderMonthView();
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

    openShareModal() {
        // Update labels with current month/year
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        this.elements.shareMonthLabel.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        this.elements.shareYearLabel.textContent = this.currentYear;
        this.elements.shareModal.classList.add('active');
    }

    closeShareModal() {
        this.elements.shareModal.classList.remove('active');
    }

    async shareMonth() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Instagram Story format (9:16)
        const width = 1080;
        const height = 1920;

        canvas.width = width;
        canvas.height = height;

        // Pure white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const daysInMonth = this.getDaysInMonth(this.currentYear, this.currentMonth);
        const firstDay = this.getFirstDayOfMonth(this.currentYear, this.currentMonth);

        // Calculate stats for this month
        const counts = {};
        let total = 0;
        Object.keys(MOODS).forEach(mood => counts[mood] = 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const key = this.getKey(this.currentYear, this.currentMonth, day);
            const mood = this.data[key];
            if (mood && MOODS[mood]) {
                counts[mood]++;
                total++;
            }
        }

        // === HEADER ===
        ctx.fillStyle = '#1A1A1A';
        ctx.font = '700 144px -apple-system, SF Pro Display, Helvetica Neue, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`${this.currentYear}`, width / 2, 200);

        // Month name as tagline
        ctx.fillStyle = '#999999';
        ctx.font = '400 48px -apple-system, SF Pro Text, sans-serif';
        ctx.fillText(monthNames[this.currentMonth], width / 2, 270);

        // === MONTH GRID ===
        const cellW = 130;
        const cellH = 130;
        const gap = 8;
        const gridW = 7 * cellW + 6 * gap;
        const gridX = (width - gridW) / 2;
        const gridY = 400;

        // Weekday headers
        const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        ctx.fillStyle = '#AAAAAA';
        ctx.font = '600 28px -apple-system, SF Pro Text, sans-serif';
        weekdays.forEach((day, i) => {
            const x = gridX + i * (cellW + gap) + cellW / 2;
            ctx.fillText(day, x, gridY - 30);
        });

        // Days grid
        let dayNum = 1;
        const rows = Math.ceil((firstDay + daysInMonth) / 7);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < 7; col++) {
                const cellIndex = row * 7 + col;
                const x = gridX + col * (cellW + gap);
                const y = gridY + row * (cellH + gap);

                if (cellIndex < firstDay) {
                    ctx.fillStyle = '#F8F8F8';
                    this.roundRect(ctx, x, y, cellW, cellH, 12);
                } else if (dayNum <= daysInMonth) {
                    const key = this.getKey(this.currentYear, this.currentMonth, dayNum);
                    const mood = this.data[key];

                    if (mood && MOODS[mood]) {
                        ctx.fillStyle = MOODS[mood].color;
                    } else {
                        ctx.fillStyle = '#EEEEEE';
                    }

                    this.roundRect(ctx, x, y, cellW, cellH, 12);

                    // Day number - subtle
                    ctx.fillStyle = mood && MOODS[mood] ?
                        (['C', 'B'].includes(mood) ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)') : 'rgba(0,0,0,0.2)';
                    ctx.font = '500 24px -apple-system, SF Pro Text, sans-serif';
                    ctx.textBaseline = 'top';
                    ctx.fillText(dayNum.toString(), x + 12, y + 10);
                    ctx.textBaseline = 'alphabetic';

                    dayNum++;
                }
            }
        }

        // === LEGEND ===
        const legendY = gridY + rows * (cellH + gap) + 100;
        const legendItems = Object.entries(MOODS);
        const legendGap = 110;
        const legendTotalW = (legendItems.length - 1) * legendGap;

        legendItems.forEach(([grade, { color }], i) => {
            const x = (width - legendTotalW) / 2 + i * legendGap;
            const count = counts[grade] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, legendY, 22, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = ['C', 'B'].includes(grade) ? '#333' : '#FFF';
            ctx.font = '700 14px -apple-system, SF Pro Display, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(grade, x, legendY);

            ctx.fillStyle = '#666666';
            ctx.font = '500 18px -apple-system, SF Pro Text, sans-serif';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(`${pct}%`, x, legendY + 50);
        });

        // === STATS ===
        const statY = legendY + 130;
        ctx.fillStyle = '#1A1A1A';
        ctx.font = '600 52px -apple-system, SF Pro Display, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(total.toString(), width / 2, statY);

        ctx.fillStyle = '#888888';
        ctx.font = '400 22px -apple-system, SF Pro Text, sans-serif';
        ctx.fillText('days tracked', width / 2, statY + 36);

        // === FOOTER ===
        ctx.fillStyle = '#BBBBBB';
        ctx.font = '400 20px -apple-system, SF Pro Text, sans-serif';
        ctx.fillText('lennartp-sch.github.io/MoodTracker-PWA', width / 2, height - 70);

        // Convert to blob and share
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `mood-tracker-${monthNames[this.currentMonth].toLowerCase()}-${this.currentYear}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `my mood throughout ${monthNames[this.currentMonth]} ${this.currentYear}`,
                        text: `Check out my mood tracking for ${monthNames[this.currentMonth]} ${this.currentYear}! 📊\n\n📱 Try it yourself: https://lennartp-sch.github.io/MoodTracker-PWA/\n\n📲 Install as app:\n• iOS: Safari → Share → Add to Home Screen\n• Android: Chrome → Menu (⋮) → Install app`
                    });
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        this.downloadImage(blob, `mood-tracker-${monthNames[this.currentMonth].toLowerCase()}-${this.currentYear}.png`);
                    }
                }
            } else {
                this.downloadImage(blob, `mood-tracker-${monthNames[this.currentMonth].toLowerCase()}-${this.currentYear}.png`);
            }
        }, 'image/png');
    }

    async shareYear() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Instagram Story format (9:16)
        const width = 1080;
        const height = 1920;

        canvas.width = width;
        canvas.height = height;

        // Pure white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Calculate stats first
        const counts = {};
        let total = 0;
        Object.keys(MOODS).forEach(mood => counts[mood] = 0);

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

        // === PERFECT LAYOUT ===
        // Grid: 12 cols × 31 rows with square-ish cells
        // Cell: 56x34 with 4px gap = 12*56 + 11*4 = 716px wide (centered in 1080)
        // Height: 31*34 + 30*4 = 1174px

        const cellW = 56;
        const cellH = 34;
        const gap = 4;
        const gridW = 12 * cellW + 11 * gap;
        const gridH = 31 * cellH + 30 * gap;
        const gridX = (width - gridW) / 2;
        const gridY = 340;

        // === HEADER ===
        // Year number - bold, centered
        ctx.fillStyle = '#1A1A1A';
        ctx.font = '700 144px -apple-system, SF Pro Display, Helvetica Neue, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`${this.currentYear}`, width / 2, 200);

        // Tagline
        ctx.fillStyle = '#999999';
        ctx.font = '400 28px -apple-system, SF Pro Text, sans-serif';
        ctx.fillText('My Year in Mood', width / 2, 260);

        // === MOOD GRID ===
        for (let day = 1; day <= 31; day++) {
            for (let month = 0; month < 12; month++) {
                const daysInMonth = this.getDaysInMonth(this.currentYear, month);
                const x = gridX + month * (cellW + gap);
                const y = gridY + (day - 1) * (cellH + gap);

                if (day <= daysInMonth) {
                    const key = this.getKey(this.currentYear, month, day);
                    const mood = this.data[key];

                    if (mood && MOODS[mood]) {
                        ctx.fillStyle = MOODS[mood].color;
                    } else {
                        ctx.fillStyle = '#EEEEEE';
                    }
                } else {
                    ctx.fillStyle = '#F8F8F8';
                }

                this.roundRect(ctx, x, y, cellW, cellH, 4);
            }
        }

        // === LEGEND ===
        const legendY = gridY + gridH + 60;
        const legendItems = Object.entries(MOODS);
        const legendGap = 110;
        const legendTotalW = (legendItems.length - 1) * legendGap;

        legendItems.forEach(([grade, { color }], i) => {
            const x = (width - legendTotalW) / 2 + i * legendGap;
            const count = counts[grade] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            // Circle
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, legendY, 22, 0, Math.PI * 2);
            ctx.fill();

            // Grade label inside
            ctx.fillStyle = ['C', 'B'].includes(grade) ? '#333' : '#FFF';
            ctx.font = '700 14px -apple-system, SF Pro Display, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(grade, x, legendY);

            // Percentage
            ctx.fillStyle = '#666666';
            ctx.font = '500 18px -apple-system, SF Pro Text, sans-serif';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(`${pct}%`, x, legendY + 50);
        });

        // === STATS ===
        const statY = legendY + 110;
        ctx.fillStyle = '#1A1A1A';
        ctx.font = '600 52px -apple-system, SF Pro Display, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(total.toString(), width / 2, statY);

        ctx.fillStyle = '#888888';
        ctx.font = '400 22px -apple-system, SF Pro Text, sans-serif';
        ctx.fillText('days tracked', width / 2, statY + 36);

        // === FOOTER ===
        ctx.fillStyle = '#BBBBBB';
        ctx.font = '400 20px -apple-system, SF Pro Text, sans-serif';
        ctx.fillText('lennartp-sch.github.io/MoodTracker-PWA', width / 2, height - 70);

        // Convert to blob and share
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `mood-tracker-${this.currentYear}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `my mood throughout ${this.currentYear}`,
                        text: `Check out my mood tracking for ${this.currentYear}! 📊\n\n📱 Try it yourself: https://lennartp-sch.github.io/MoodTracker-PWA/\n\n📲 Install as app:\n• iOS: Safari → Share → Add to Home Screen\n• Android: Chrome → Menu (⋮) → Install app`
                    });
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        this.downloadImage(blob);
                    }
                }
            } else {
                this.downloadImage(blob);
            }
        }, 'image/png');
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    downloadImage(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mood-tracker-${this.currentYear}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// ===== NOTIFICATION MANAGER =====
const NotificationManager = {
    ENABLED_KEY: 'moodReminderEnabled',
    TIME_KEY: 'moodReminderTime',
    timeoutId: null,

    init() {
        const toggle = document.getElementById('reminderToggle');
        const timeInput = document.getElementById('reminderTime');
        const timeRow = document.getElementById('reminderTimeRow');
        if (!toggle || !timeInput || !timeRow) return;

        // Load saved preferences
        const enabled = localStorage.getItem(this.ENABLED_KEY) === 'true';
        const savedTime = localStorage.getItem(this.TIME_KEY) || '20:00';

        toggle.checked = enabled;
        timeInput.value = savedTime;

        // Show/hide time row based on toggle
        if (enabled) {
            timeRow.classList.add('visible');
            this.scheduleReminder();
        }

        // Handle toggle change
        toggle.addEventListener('change', async (e) => {
            if (e.target.checked) {
                const granted = await this.requestPermission();
                if (granted) {
                    localStorage.setItem(this.ENABLED_KEY, 'true');
                    timeRow.classList.add('visible');
                    this.scheduleReminder();
                } else {
                    e.target.checked = false;
                    alert('Notifications blocked. Please enable them in your browser settings.');
                }
            } else {
                localStorage.setItem(this.ENABLED_KEY, 'false');
                timeRow.classList.remove('visible');
                this.cancelReminder();
            }
        });

        // Handle time change
        timeInput.addEventListener('change', (e) => {
            localStorage.setItem(this.TIME_KEY, e.target.value);
            if (toggle.checked) {
                this.scheduleReminder();
            }
        });
    },

    async requestPermission() {
        if (!('Notification' in window)) {
            alert('Your browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    },

    scheduleReminder() {
        this.cancelReminder();

        const savedTime = localStorage.getItem(this.TIME_KEY) || '20:00';
        const [hours, minutes] = savedTime.split(':').map(Number);

        const now = new Date();
        const target = new Date();
        target.setHours(hours, minutes, 0, 0);

        // If already past target time, schedule for tomorrow
        if (now >= target) {
            target.setDate(target.getDate() + 1);
        }

        const delay = target.getTime() - now.getTime();

        this.timeoutId = setTimeout(() => {
            this.checkAndNotify();
            this.scheduleReminder(); // Reschedule for next day
        }, delay);

        console.log(`Reminder scheduled for ${target.toLocaleString()}`);
    },

    cancelReminder() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    },

    checkAndNotify() {
        const today = new Date();
        const key = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

        if (!data[key]) {
            this.showNotification();
        }
    },

    showNotification() {
        if (Notification.permission === 'granted') {
            const options = {
                body: "Don't forget to log your mood for today! 📊",
                icon: 'icons/icon-512.png',
                tag: 'mood-reminder',
                renotify: true,
                requireInteraction: false
            };

            // Add vibration for Android
            if ('vibrate' in navigator) {
                options.vibrate = [200, 100, 200];
            }

            new Notification('Mood Tracker', options);
        }
    }
};

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
    NotificationManager.init();
});
