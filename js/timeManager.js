/* ==========================================================================
   TIMEMANAGER.JS — Менеджер суточного цикла (24 минуты = 24 часа)
   ========================================================================== */

class TimeManager {
    constructor() {
        // Игровое время в часах (0.00 .. 23.99)
        this.gameHours = CONFIG.INITIAL_TIME_HOURS;
        this.currentDay = 1;
        this.timeSpeed = 1; // 1x, 5x, 20x
        this.lastBellHour = -1;
    }

    update(deltaTimeSeconds) {
        // За 1 реальную секунду при скорости 1x проходит:
        // (24 часа / 1440 секунд) = 0.0166667 игровых часа в секунду.
        const hoursPassed = (deltaTimeSeconds * this.timeSpeed * 24) / CONFIG.REAL_SECONDS_PER_GAME_DAY;
        
        this.gameHours += hoursPassed;

        if (this.gameHours >= 24) {
            this.gameHours -= 24;
            this.currentDay++;
            if (window.mainGame) {
                window.mainGame.addNotification(`Наступил День ${this.currentDay}`);
            }
        }

        // Автоматический звон колокола на зарю и обед (7:00 и 18:00)
        const currentIntHour = Math.floor(this.gameHours);
        if ((currentIntHour === 7 || currentIntHour === 12 || currentIntHour === 18) && currentIntHour !== this.lastBellHour) {
            this.lastBellHour = currentIntHour;
            audioEngine.playChurchBell(currentIntHour === 12 ? 180 : 220);
        }

        this.updateUIWidget();
    }

    // Возвращает форматированную строку времени "ЧЧ:ММ"
    getFormattedTime() {
        const hours = Math.floor(this.gameHours);
        const minutes = Math.floor((this.gameHours - hours) * 60);
        const hh = hours < 10 ? '0' + hours : hours;
        const mm = minutes < 10 ? '0' + minutes : minutes;
        return `${hh}:${mm}`;
    }

    // Возвращает текущую фазу суток
    getCurrentPhase() {
        const h = this.gameHours;
        for (let phase of CONFIG.DAY_PHASES) {
            if (phase.startHour < phase.endHour) {
                if (h >= phase.startHour && h < phase.endHour) return phase;
            } else {
                // ДЛЯ ночных фаз (например, с 23:00 до 05:00)
                if (h >= phase.startHour || h < phase.endHour) return phase;
            }
        }
        return CONFIG.DAY_PHASES[1]; // По умолчанию "Утро"
    }

    // Рассчитывает цвет и темноту ночного освещения для холста
    getAmbientLighting() {
        const h = this.gameHours;
        let color = "#000000";
        let alpha = 0.0;

        if (h >= 5 && h < 8) { // Рассвет
            const t = (h - 5) / 3;
            color = "#f29238";
            alpha = 0.5 * (1 - t);
        } else if (h >= 8 && h < 16) { // День
            alpha = 0.0;
        } else if (h >= 16 && h < 19) { // Золотой час
            const t = (h - 16) / 3;
            color = "#e67e22";
            alpha = 0.25 * t;
        } else if (h >= 19 && h < 22) { // Закат / Сумерки
            const t = (h - 19) / 3;
            color = "#2c1e4a";
            alpha = 0.25 + 0.55 * t;
        } else { // Глубокая ночь (22:00 .. 05:00)
            color = "#070814";
            alpha = 0.85;
        }

        return { color, alpha };
    }

    toggleSpeed() {
        if (this.timeSpeed === 1) this.timeSpeed = 5;
        else if (this.timeSpeed === 5) this.timeSpeed = 20;
        else this.timeSpeed = 1;
        return this.timeSpeed;
    }

    updateUIWidget() {
        const clockEl = document.getElementById('clockDisplay');
        const phaseEl = document.getElementById('phaseDisplay');
        const dayEl = document.getElementById('dayDisplay');
        const celestialEl = document.getElementById('celestialBody');

        if (clockEl) clockEl.innerText = this.getFormattedTime();
        if (phaseEl) phaseEl.innerText = this.getCurrentPhase().name;
        if (dayEl) dayEl.innerText = `День ${this.currentDay} • Покровская Весь`;

        // Вращение тела на циферблате
        if (celestialEl) {
            const angle = (this.gameHours / 24) * 360;
            const isNight = this.gameHours < 5 || this.gameHours >= 20;
            celestialEl.style.transform = `rotate(${angle}deg) translate(14px) rotate(-${angle}deg)`;
            celestialEl.style.background = isNight ? '#e2e8f0' : '#ffd700';
            celestialEl.style.boxShadow = isNight ? '0 0 10px #cbd5e1' : '0 0 12px #ffe600';
        }
    }
}

const timeManager = new TimeManager();
