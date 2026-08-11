/* ==========================================================================
   ENTITIES.JS — Высокодетализированные персонажи и анимации (XVII век)
   ========================================================================== */

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = null;
        this.targetY = null;
        this.radius = 16;
        this.speed = CONFIG.PLAYER_SPEED || 160;
        
        this.facing = "down"; // "down", "up", "left", "right"
        this.isMoving = false;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    setTarget(tx, ty) {
        this.targetX = tx;
        this.targetY = ty;
    }

    update(deltaTime, keysInput) {
        let dx = 0;
        let dy = 0;

        // Поддержка всех раскладок клавиатуры (WASD, Стрелки, Русская раскладка ЦФЫВ)
        if (keysInput['KeyW'] || keysInput['ArrowUp'] || keysInput['w'] || keysInput['W'] || keysInput['ц'] || keysInput['Ц']) dy -= 1;
        if (keysInput['KeyS'] || keysInput['ArrowDown'] || keysInput['s'] || keysInput['S'] || keysInput['ы'] || keysInput['Ы']) dy += 1;
        if (keysInput['KeyA'] || keysInput['ArrowLeft'] || keysInput['a'] || keysInput['A'] || keysInput['ф'] || keysInput['Ф']) dx -= 1;
        if (keysInput['KeyD'] || keysInput['ArrowRight'] || keysInput['d'] || keysInput['D'] || keysInput['в'] || keysInput['В']) dx += 1;

        // Если нажаты клавиши — отменяем целевую точку клика
        if (dx !== 0 || dy !== 0) {
            this.targetX = null;
            this.targetY = null;
        } else if (this.targetX !== null && this.targetY !== null) {
            // Перемещение по клику мыши
            const tdx = this.targetX - this.x;
            const tdy = this.targetY - this.y;
            const dist = Math.hypot(tdx, tdy);

            if (dist > 8) {
                dx = tdx / dist;
                dy = tdy / dist;
            } else {
                this.targetX = null;
                this.targetY = null;
            }
        }

        // Нормализация вектора по диагонали
        if (dx !== 0 && dy !== 0 && (this.targetX === null)) {
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
            if (this.animTimer > 0.15) {
                this.animFrame = (this.animFrame + 1) % 4;
                this.animTimer = 0;
                audioEngine.playStepSound();
            }
        } else {
            this.isMoving = false;
            this.animFrame = 0;
        }
    }

    // ВЫСОКОДЕТАЛИЗИРОВАННАЯ ОТРИСОВКА СВЯЩЕННИКА (Отец Стефан)
    draw(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));

        const legOffset = this.isMoving ? Math.sin(this.animFrame * Math.PI / 2) * 5 : 0;

        // 1. Динамическая тень от персонажа
        ctx.fillStyle = "rgba(10, 5, 0, 0.4)";
        ctx.beginPath();
        ctx.ellipse(0, 10, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Сапоги / Ноги
        ctx.fillStyle = "#120a04";
        ctx.fillRect(-8 + legOffset, 4, 6, 8);
        ctx.fillRect(2 - legOffset, 4, 6, 8);

        // 3. Чёрная бархатная ряса с золотой каймой
        ctx.fillStyle = "#1c140e";
        ctx.beginPath();
        ctx.moveTo(-14, 6);
        ctx.lineTo(-10, -22);
        ctx.lineTo(10, -22);
        ctx.lineTo(14, 6);
        ctx.closePath();
        ctx.fill();

        // Золотая вышитая кайма по низу рясы
        ctx.strokeStyle = "#d4af37";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-14, 5);
        ctx.lineTo(14, 5);
        ctx.stroke();

        // 4. Мантия / Складки одежды
        ctx.fillStyle = "#291b10";
        ctx.fillRect(-10, -20, 20, 16);

        // 5. Голова и лицо
        ctx.fillStyle = "#f5d0a6";
        ctx.beginPath();
        ctx.arc(0, -28, 9, 0, Math.PI * 2);
        ctx.fill();

        // Густая тёмно-каштановая борода священника
        ctx.fillStyle = "#3a2312";
        ctx.beginPath();
        ctx.arc(0, -25, 9, 0, Math.PI);
        ctx.fill();
        ctx.fillRect(-5, -25, 10, 7);

        // Глаза
        ctx.fillStyle = "#1a0f07";
        if (this.facing === "down" || this.facing === "right") ctx.fillRect(2, -30, 2, 2);
        if (this.facing === "down" || this.facing === "left") ctx.fillRect(-4, -30, 2, 2);

        // 6. Головной убор (Клобук / Скуфья)
        ctx.fillStyle = "#120c06";
        ctx.beginPath();
        ctx.arc(0, -32, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-10, -33, 20, 4);

        // 7. Золотой наперсный крест с золотой цепочкой
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -22);
        ctx.lineTo(0, -14);
        ctx.lineTo(6, -22);
        ctx.stroke();

        // Сияющий Крест
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "#ffe600";
        ctx.shadowBlur = 10;
        ctx.fillRect(-2, -14, 4, 10);
        ctx.fillRect(-5, -11, 10, 3);
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
        this.role = data.role || "peasant";
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
            // Шляхтич Пан Януш (Малиновый жупан, перо на шапке, сабля)
            ctx.fillStyle = "#8b1a1a"; // Малиновый контуш
            ctx.fillRect(-11, -22 + bob, 22, 22);

            // Золотые застёжки (аграфы)
            ctx.fillStyle = "#ffd700";
            ctx.fillRect(-2, -18 + bob, 4, 14);

            // Сабля на поясе
            ctx.strokeStyle = "#c0c0c0";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(8, -10 + bob);
            ctx.lineTo(16, -2 + bob);
            ctx.stroke();

            // Лицо и усы
            ctx.fillStyle = "#f5d0a6";
            ctx.beginPath();
            ctx.arc(0, -28 + bob, 8, 0, Math.PI * 2);
            ctx.fill();

            // Шляхетские пышные усы
            ctx.fillStyle = "#3d2314";
            ctx.fillRect(-6, -26 + bob, 12, 3);

            // Соболья шапка с пером
            ctx.fillStyle = "#3b2210";
            ctx.fillRect(-9, -36 + bob, 18, 8);
            ctx.fillStyle = "#ffffff"; // Белое перо
            ctx.fillRect(4, -42 + bob, 3, 8);

        } else if (this.id === "cossack_grom") {
            // Казак Атаман Гром (Синий жупан, папаха, оселедец)
            ctx.fillStyle = "#1e3a5f";
            ctx.fillRect(-10, -20 + bob, 20, 20);

            // Красный кушак
            ctx.fillStyle = "#b81d1d";
            ctx.fillRect(-10, -10 + bob, 20, 4);

            // Лицо, длинные усы
            ctx.fillStyle = "#e8b88b";
            ctx.beginPath();
            ctx.arc(0, -26 + bob, 8, 0, Math.PI * 2);
            ctx.fill();

            // Казачьи усы
            ctx.fillStyle = "#1f1811";
            ctx.beginPath();
            ctx.moveTo(-7, -23 + bob);
            ctx.lineTo(7, -23 + bob);
            ctx.lineTo(5, -17 + bob);
            ctx.lineTo(-5, -17 + bob);
            ctx.fill();

            // Чёрная смушковая Папаха
            ctx.fillStyle = "#14100c";
            ctx.beginPath();
            ctx.arc(0, -32 + bob, 9, Math.PI, 0);
            ctx.fill();

        } else if (this.id === "yankel") {
            // Шинкарь Янкель
            ctx.fillStyle = "#3d5c38";
            ctx.fillRect(-10, -20 + bob, 20, 20);
            ctx.fillStyle = "#f5f0db"; // Фартук
            ctx.fillRect(-7, -14 + bob, 14, 14);

            ctx.fillStyle = "#e0b388";
            ctx.beginPath();
            ctx.arc(0, -26 + bob, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#291d12"; // Пейсы и борода
            ctx.fillRect(-8, -26 + bob, 3, 10);
            ctx.fillRect(5, -26 + bob, 3, 10);
            ctx.fillRect(-6, -22 + bob, 12, 8);

        } else {
            // Крестьянка Ганна
            ctx.fillStyle = "#8a6d4b";
            ctx.beginPath();
            ctx.moveTo(-12, 4 + bob);
            ctx.lineTo(-8, -20 + bob);
            ctx.lineTo(8, -20 + bob);
            ctx.lineTo(12, 4 + bob);
            ctx.fill();

            // Белая вышиванка
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-6, -18 + bob, 12, 10);

            // Красная хустка (платок)
            ctx.fillStyle = "#ab2929";
            ctx.beginPath();
            ctx.arc(0, -28 + bob, 9, 0, Math.PI * 2);
            ctx.fill();
        }

        // Имя NPC
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
