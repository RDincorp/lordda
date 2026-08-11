/* ==========================================================================
   ENTITIES.JS — Сущности: Главный Герой (Отец Стефан) и Персонажи (NPC)
   ========================================================================== */

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.speed = CONFIG.PLAYER_SPEED;
        
        this.facing = "down"; // "down", "up", "left", "right"
        this.isMoving = false;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    update(deltaTime, keysInput) {
        let dx = 0;
        let dy = 0;

        if (keysInput['KeyW'] || keysInput['ArrowUp']) dy -= 1;
        if (keysInput['KeyS'] || keysInput['ArrowDown']) dy += 1;
        if (keysInput['KeyA'] || keysInput['ArrowLeft']) dx -= 1;
        if (keysInput['KeyD'] || keysInput['ArrowRight']) dx += 1;

        // Нормализация вектора по диагонали
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        if (dx !== 0 || dy !== 0) {
            this.isMoving = true;

            // Направление взгляда
            if (Math.abs(dx) > Math.abs(dy)) {
                this.facing = dx > 0 ? "right" : "left";
            } else {
                this.facing = dy > 0 ? "down" : "up";
            }

            // Проверка коллизий перед перемещением
            const nextX = this.x + dx * this.speed * deltaTime;
            const nextY = this.y + dy * this.speed * deltaTime;

            if (!gameWorld.checkCollision(nextX, this.y, this.radius)) {
                this.x = nextX;
            }
            if (!gameWorld.checkCollision(this.x, nextY, this.radius)) {
                this.y = nextY;
            }

            // Анимация шагов
            this.animTimer += deltaTime;
            if (this.animTimer > 0.2) {
                this.animFrame = (this.animFrame + 1) % 4;
                this.animTimer = 0;
                audioEngine.playStepSound();
            }
        } else {
            this.isMoving = false;
            this.animFrame = 0;
        }
    }

    // Отрисовка Священника (Отец Стефан)
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Тень под ногами
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(0, 10, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Чёрная ряса священника
        ctx.fillStyle = "#1c140d";
        ctx.beginPath();
        ctx.arc(0, -10, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-12, -10, 24, 20);

        // Лицо / Борода
        ctx.fillStyle = "#e5c3a6";
        ctx.beginPath();
        ctx.arc(0, -26, 9, 0, Math.PI * 2);
        ctx.fill();

        // Тёмная борода
        ctx.fillStyle = "#2e1d11";
        ctx.beginPath();
        ctx.arc(0, -22, 9, 0, Math.PI);
        ctx.fill();

        // Наперсный Золотой Крест
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(0, -4);
        ctx.moveTo(-5, -10);
        ctx.lineTo(5, -10);
        ctx.stroke();

        // Ореол / Свечение священного сана
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 8;
        ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -26, 12, 0, Math.PI * 2);
        ctx.stroke();

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
        this.color = data.color || "#6b4a2d";
        this.dialogueTree = data.dialogueTree;
        this.schedule = data.schedule || []; // Расписание перемещений
    }

    update(deltaTime, gameHours) {
        // Проверка расписания перемещений в зависимости от времени суток
        for (let item of this.schedule) {
            if (gameHours >= item.startHour && gameHours < item.endHour) {
                // Плавное приближение к целевой точке
                const dx = item.targetX - this.x;
                const dy = item.targetY - this.y;
                const dist = Math.hypot(dx, dy);

                if (dist > 5) {
                    this.x += (dx / dist) * 40 * deltaTime;
                    this.y += (dy / dist) * 40 * deltaTime;
                }
                break;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Тень
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(0, 8, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Одежда NPC
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, -10, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-10, -10, 20, 18);

        // Голова
        ctx.fillStyle = "#e5c3a6";
        ctx.beginPath();
        ctx.arc(0, -24, 8, 0, Math.PI * 2);
        ctx.fill();

        // Имя над головой
        ctx.font = "bold 12px 'Cormorant Garamond', serif";
        ctx.fillStyle = "#f3e5ab";
        ctx.textAlign = "center";
        ctx.fillText(this.name, 0, -38);

        ctx.restore();
    }
}
