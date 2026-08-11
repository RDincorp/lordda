/* ==========================================================================
   ENTITIES.JS — Персонажи в стиле Cult of the Lamb (Обводка, детали, физика)
   ========================================================================== */

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.speed = 180;
        
        this.facing = "down";
        this.isMoving = false;
        this.animFrame = 0;
        this.animTimer = 0;
        this.idleBob = 0;
    }

    update(deltaTime, keysInput) {
        let dx = 0;
        let dy = 0;

        if (keysInput['KeyW'] || keysInput['ArrowUp'] || keysInput['w'] || keysInput['W'] || keysInput['ц'] || keysInput['Ц']) dy -= 1;
        if (keysInput['KeyS'] || keysInput['ArrowDown'] || keysInput['s'] || keysInput['S'] || keysInput['ы'] || keysInput['Ы']) dy += 1;
        if (keysInput['KeyA'] || keysInput['ArrowLeft'] || keysInput['a'] || keysInput['A'] || keysInput['ф'] || keysInput['Ф']) dx -= 1;
        if (keysInput['KeyD'] || keysInput['ArrowRight'] || keysInput['d'] || keysInput['D'] || keysInput['в'] || keysInput['В']) dx += 1;

        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        if (dx !== 0 || dy !== 0) {
            this.isMoving = true;

            if (Math.abs(dx) > Math.abs(dy)) {
                this.facing = dx > 0 ? "right" : "left";
            } else {
                this.facing = dy > 0 ? "down" : "up";
            }

            const moveStepX = dx * this.speed * deltaTime;
            const moveStepY = dy * this.speed * deltaTime;

            const nextX = this.x + moveStepX;
            const nextY = this.y + moveStepY;

            if (!gameWorld.checkCollision(nextX, this.y, this.radius)) {
                this.x = nextX;
            }
            if (!gameWorld.checkCollision(this.x, nextY, this.radius)) {
                this.y = nextY;
            }

            this.animTimer += deltaTime;
            if (this.animTimer > 0.12) {
                this.animFrame = (this.animFrame + 1) % 4;
                this.animTimer = 0;
                audioEngine.playStepSound();
            }
        } else {
            this.isMoving = false;
            this.animFrame = 0;
            this.idleBob += deltaTime * 2;
        }
    }

    // ВЫСОКОДЕТАЛИЗИРОВАННАЯ И ВЫРАЗИТЕЛЬНАЯ ОТРИСОВКА ОТЦА СТЕФАНА
    draw(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));

        const bob = this.isMoving ? Math.sin(this.animFrame * Math.PI / 2) * 4 : Math.sin(this.idleBob) * 1.5;
        const legStep = this.isMoving ? Math.sin(this.animFrame * Math.PI) * 7 : 0;

        // 1. Светящийся индикатор выявления героя на карте
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#ffe600";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(0, 10, 22, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Падающая тень
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.beginPath();
        ctx.ellipse(0, 10, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Сапоги
        ctx.fillStyle = "#120a04";
        ctx.fillRect(-10 + legStep, 3, 8, 11);
        ctx.fillRect(2 - legStep, 3, 8, 11);

        // 3. Чёрная ряса священника с сочной контурной обводкой
        ctx.fillStyle = "#1c140d";
        ctx.beginPath();
        ctx.moveTo(-16, 6);
        ctx.lineTo(-12, -26 + bob);
        ctx.lineTo(12, -26 + bob);
        ctx.lineTo(16, 6);
        ctx.closePath();
        ctx.fill();

        // Чёрный сочный контур
        ctx.strokeStyle = "#080503";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Золотой вышитый епитрахиль
        ctx.fillStyle = "#d4af37";
        ctx.fillRect(-4, -22 + bob, 8, 28);
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 1;
        ctx.strokeRect(-4, -22 + bob, 8, 28);

        // 4. Мантия
        ctx.fillStyle = "#2b1c11";
        ctx.fillRect(-12, -24 + bob, 24, 16);

        // 5. Лицо
        ctx.fillStyle = "#f8d5ab";
        ctx.beginPath();
        ctx.arc(0, -32 + bob, 10, 0, Math.PI * 2);
        ctx.fill();

        // Пышная каштановая борода
        ctx.fillStyle = "#36200f";
        ctx.beginPath();
        ctx.arc(0, -28 + bob, 10, 0, Math.PI);
        ctx.fill();

        // Выразительные глаза
        ctx.fillStyle = "#000000";
        if (this.facing === "down" || this.facing === "right") ctx.fillRect(3, -34 + bob, 3, 3);
        if (this.facing === "down" || this.facing === "left") ctx.fillRect(-5, -34 + bob, 3, 3);

        // 6. Клобук
        ctx.fillStyle = "#120c06";
        ctx.beginPath();
        ctx.arc(0, -38 + bob, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-12, -39 + bob, 24, 5);

        // 7. Золотой Наперсный Крест с сиянием
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "#ffe600";
        ctx.shadowBlur = 16;
        ctx.fillRect(-3, -18 + bob, 6, 12);
        ctx.fillRect(-7, -15 + bob, 14, 4);
        ctx.shadowBlur = 0;

        // Имя с золотой тенью
        ctx.font = "bold 14px 'Cinzel', serif";
        ctx.fillStyle = "#ffd700";
        ctx.textAlign = "center";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 6;
        ctx.fillText("Отец Стефан", 0, -54 + bob);
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}

class NPC {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.title = data.title;
        this.portrait = data.portrait;
        this.x = data.x;
        this.y = data.y;
        this.schedule = data.schedule || [];
        this.animTimer = Math.random();
    }

    update(deltaTime, gameHours) {
        this.animTimer += deltaTime;
        for (let item of this.schedule) {
            if (gameHours >= item.startHour && gameHours < item.endHour) {
                const dx = item.targetX - this.x;
                const dy = item.targetY - this.y;
                const dist = Math.hypot(dx, dy);

                if (dist > 5) {
                    this.x += (dx / dist) * 45 * deltaTime;
                    this.y += (dy / dist) * 45 * deltaTime;
                }
                break;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));

        const bob = Math.sin(this.animTimer * 2.5) * 1.5;

        // Тень
        ctx.fillStyle = "rgba(10, 5, 0, 0.4)";
        ctx.beginPath();
        ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.id === "pan_janusz") {
            // Шляхтич Пан Януш
            ctx.fillStyle = "#8b1a1a";
            ctx.fillRect(-12, -22 + bob, 24, 22);

            ctx.fillStyle = "#ffd700";
            ctx.fillRect(-2, -18 + bob, 4, 14);

            ctx.strokeStyle = "#c0c0c0";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(8, -10 + bob);
            ctx.lineTo(16, -2 + bob);
            ctx.stroke();

            ctx.fillStyle = "#f5d0a6";
            ctx.beginPath();
            ctx.arc(0, -28 + bob, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#3d2314";
            ctx.fillRect(-6, -26 + bob, 12, 3);

            ctx.fillStyle = "#3b2210";
            ctx.fillRect(-9, -36 + bob, 18, 8);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(4, -42 + bob, 3, 8);

        } else if (this.id === "cossack_grom") {
            // Атаман Гром
            ctx.fillStyle = "#1e3a5f";
            ctx.fillRect(-11, -20 + bob, 22, 20);

            ctx.fillStyle = "#b81d1d";
            ctx.fillRect(-11, -10 + bob, 22, 4);

            ctx.fillStyle = "#e8b88b";
            ctx.beginPath();
            ctx.arc(0, -26 + bob, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#1f1811";
            ctx.fillRect(-7, -23 + bob, 14, 4);

            ctx.fillStyle = "#14100c";
            ctx.beginPath();
            ctx.arc(0, -32 + bob, 9, Math.PI, 0);
            ctx.fill();

        } else if (this.id === "yankel") {
            // Янкель-шинкарь
            ctx.fillStyle = "#3d5c38";
            ctx.fillRect(-11, -20 + bob, 22, 20);
            ctx.fillStyle = "#f5f0db";
            ctx.fillRect(-8, -14 + bob, 16, 14);

            ctx.fillStyle = "#e0b388";
            ctx.beginPath();
            ctx.arc(0, -26 + bob, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#291d12";
            ctx.fillRect(-8, -26 + bob, 3, 10);
            ctx.fillRect(5, -26 + bob, 3, 10);

        } else {
            // Ганна
            ctx.fillStyle = "#8a6d4b";
            ctx.fillRect(-10, -20 + bob, 20, 24);

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-6, -18 + bob, 12, 10);

            ctx.fillStyle = "#ab2929";
            ctx.beginPath();
            ctx.arc(0, -28 + bob, 9, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.font = "bold 13px 'Cormorant Garamond', serif";
        ctx.fillStyle = "#fff1cf";
        ctx.textAlign = "center";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 4;
        ctx.fillText(this.name, 0, -44 + bob);
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}
