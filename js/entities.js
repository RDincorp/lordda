/* ==========================================================================
   ENTITIES.JS — Персонажи: Главный Герой (Отец Стефан) и NPC
   ========================================================================== */

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.speed = 180; // Быстрое и отзывчивое движение
        
        this.facing = "down";
        this.isMoving = false;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    update(deltaTime, keysInput) {
        let dx = 0;
        let dy = 0;

        // ДВИЖЕНИЕ СТРОГО НА WASD И СТРЕЛКИ (А также на русскую раскладку ЦФЫВ)
        if (keysInput['KeyW'] || keysInput['ArrowUp'] || keysInput['w'] || keysInput['W'] || keysInput['ц'] || keysInput['Ц']) dy -= 1;
        if (keysInput['KeyS'] || keysInput['ArrowDown'] || keysInput['s'] || keysInput['S'] || keysInput['ы'] || keysInput['Ы']) dy += 1;
        if (keysInput['KeyA'] || keysInput['ArrowLeft'] || keysInput['a'] || keysInput['A'] || keysInput['ф'] || keysInput['Ф']) dx -= 1;
        if (keysInput['KeyD'] || keysInput['ArrowRight'] || keysInput['d'] || keysInput['D'] || keysInput['в'] || keysInput['В']) dx += 1;

        // Нормализация скорости при движении по диагонали
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

            // Рассчитываем следующее положение
            const moveStepX = dx * this.speed * deltaTime;
            const moveStepY = dy * this.speed * deltaTime;

            const nextX = this.x + moveStepX;
            const nextY = this.y + moveStepY;

            // Движение с проверкой коллизий
            if (!gameWorld.checkCollision(nextX, this.y, this.radius)) {
                this.x = nextX;
            }
            if (!gameWorld.checkCollision(this.x, nextY, this.radius)) {
                this.y = nextY;
            }

            // Анимация шагов
            this.animTimer += deltaTime;
            if (this.animTimer > 0.12) {
                this.animFrame = (this.animFrame + 1) % 4;
                this.animTimer = 0;
                audioEngine.playStepSound();
            }
        } else {
            this.isMoving = false;
            this.animFrame = 0;
        }
    }

    // КРУПНАЯ И ЯРКАЯ ОТРИСОВКА ОЦА СТЕФАНА
    draw(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));

        const legOffset = this.isMoving ? Math.sin(this.animFrame * Math.PI / 2) * 6 : 0;

        // 1. Указатель/маркер под ногами главного героя (чтобы сразу видеть, где священник!)
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#ffe600";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(0, 10, 20, 9, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Тень
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.ellipse(0, 10, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Сапоги
        ctx.fillStyle = "#120a04";
        ctx.fillRect(-10 + legOffset, 4, 8, 10);
        ctx.fillRect(2 - legOffset, 4, 8, 10);

        // 3. Чёрная ряса с позолоченной каймой
        ctx.fillStyle = "#1a120b";
        ctx.beginPath();
        ctx.moveTo(-16, 6);
        ctx.lineTo(-12, -26);
        ctx.lineTo(12, -26);
        ctx.lineTo(16, 6);
        ctx.closePath();
        ctx.fill();

        // Золотой подол
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-16, 5);
        ctx.lineTo(16, 5);
        ctx.stroke();

        // 4. Мантия
        ctx.fillStyle = "#2c1c11";
        ctx.fillRect(-12, -24, 24, 18);

        // 5. Лицо и пышная борода
        ctx.fillStyle = "#f8d5ab";
        ctx.beginPath();
        ctx.arc(0, -32, 10, 0, Math.PI * 2);
        ctx.fill();

        // Борода
        ctx.fillStyle = "#36200f";
        ctx.beginPath();
        ctx.arc(0, -28, 10, 0, Math.PI);
        ctx.fill();

        // Глаза
        ctx.fillStyle = "#000000";
        if (this.facing === "down" || this.facing === "right") ctx.fillRect(3, -34, 3, 3);
        if (this.facing === "down" || this.facing === "left") ctx.fillRect(-5, -34, 3, 3);

        // 6. Головной убор (Клобук)
        ctx.fillStyle = "#120c06";
        ctx.beginPath();
        ctx.arc(0, -38, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-12, -39, 24, 5);

        // 7. Золотой Сияющий Крест на груди
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "#ffe600";
        ctx.shadowBlur = 15;
        ctx.fillRect(-3, -18, 6, 12);
        ctx.fillRect(-7, -15, 14, 4);
        ctx.shadowBlur = 0;

        // Надпись "Отец Стефан" над головой
        ctx.font = "bold 14px 'Cinzel', serif";
        ctx.fillStyle = "#ffd700";
        ctx.textAlign = "center";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 5;
        ctx.fillText("Отец Стефан", 0, -52);
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

        const bob = Math.sin(this.animTimer * 3) * 1.5;

        // Тень
        ctx.fillStyle = "rgba(10, 5, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.id === "pan_janusz") {
            ctx.fillStyle = "#8b1a1a";
            ctx.fillRect(-11, -22 + bob, 22, 22);

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
            ctx.fillStyle = "#1e3a5f";
            ctx.fillRect(-10, -20 + bob, 20, 20);

            ctx.fillStyle = "#b81d1d";
            ctx.fillRect(-10, -10 + bob, 20, 4);

            ctx.fillStyle = "#e8b88b";
            ctx.beginPath();
            ctx.arc(0, -26 + bob, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#1f1811";
            ctx.beginPath();
            ctx.moveTo(-7, -23 + bob);
            ctx.lineTo(7, -23 + bob);
            ctx.lineTo(5, -17 + bob);
            ctx.lineTo(-5, -17 + bob);
            ctx.fill();

            ctx.fillStyle = "#14100c";
            ctx.beginPath();
            ctx.arc(0, -32 + bob, 9, Math.PI, 0);
            ctx.fill();

        } else if (this.id === "yankel") {
            ctx.fillStyle = "#3d5c38";
            ctx.fillRect(-10, -20 + bob, 20, 20);
            ctx.fillStyle = "#f5f0db";
            ctx.fillRect(-7, -14 + bob, 14, 14);

            ctx.fillStyle = "#e0b388";
            ctx.beginPath();
            ctx.arc(0, -26 + bob, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#291d12";
            ctx.fillRect(-8, -26 + bob, 3, 10);
            ctx.fillRect(5, -26 + bob, 3, 10);
            ctx.fillRect(-6, -22 + bob, 12, 8);

        } else {
            ctx.fillStyle = "#8a6d4b";
            ctx.beginPath();
            ctx.moveTo(-12, 4 + bob);
            ctx.lineTo(-8, -20 + bob);
            ctx.lineTo(8, -20 + bob);
            ctx.lineTo(12, 4 + bob);
            ctx.fill();

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
        ctx.fillText(this.name, 0, -42 + bob);
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}
