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
        this.targetDestination = null; // { x, y, autoInteract }
    }

    update(deltaTime, keysInput) {
        let dx = 0;
        let dy = 0;

        if (keysInput['KeyW'] || keysInput['ArrowUp'] || keysInput['w'] || keysInput['W'] || keysInput['ц'] || keysInput['Ц']) dy -= 1;
        if (keysInput['KeyS'] || keysInput['ArrowDown'] || keysInput['s'] || keysInput['S'] || keysInput['ы'] || keysInput['Ы']) dy += 1;
        if (keysInput['KeyA'] || keysInput['ArrowLeft'] || keysInput['a'] || keysInput['A'] || keysInput['ф'] || keysInput['Ф']) dx -= 1;
        if (keysInput['KeyD'] || keysInput['ArrowRight'] || keysInput['d'] || keysInput['D'] || keysInput['в'] || keysInput['В']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            this.targetDestination = null; // Клавиши сбрасывают авто-ходьбу
        } else if (this.targetDestination) {
            const dist = Math.hypot(this.targetDestination.x - this.x, this.targetDestination.y - this.y);
            if (dist > 25) {
                let dirX = (this.targetDestination.x - this.x) / dist;
                let dirY = (this.targetDestination.y - this.y) / dist;

                const stepX = this.x + dirX * this.speed * deltaTime;
                const stepY = this.y + dirY * this.speed * deltaTime;

                if (!gameWorld.checkCollision(stepX, stepY, this.radius)) {
                    dx = dirX;
                    dy = dirY;
                } else {
                    // Умный поиск обхода препятствий (огибание стен, деревьев и воды)
                    let bestAngle = null;
                    let bestDist = Infinity;
                    const directAngle = Math.atan2(dirY, dirX);

                    const anglesToTest = [
                        0.52, -0.52, // 30 градусов
                        0.78, -0.78, // 45 градусов
                        1.05, -1.05, // 60 градусов
                        1.31, -1.31, // 75 градусов
                        1.57, -1.57, // 90 градусов
                        2.09, -2.09  // 120 градусов
                    ];

                    for (let dAngle of anglesToTest) {
                        const testAngle = directAngle + dAngle;
                        const tDx = Math.cos(testAngle);
                        const tDy = Math.sin(testAngle);
                        const tX = this.x + tDx * this.speed * deltaTime;
                        const tY = this.y + tDy * this.speed * deltaTime;

                        if (!gameWorld.checkCollision(tX, tY, this.radius)) {
                            const dToTarget = Math.hypot(this.targetDestination.x - tX, this.targetDestination.y - tY);
                            if (dToTarget < bestDist) {
                                bestDist = dToTarget;
                                bestAngle = testAngle;
                            }
                        }
                    }

                    if (bestAngle !== null) {
                        dx = Math.cos(bestAngle);
                        dy = Math.sin(bestAngle);
                    } else {
                        this.targetDestination = null;
                    }
                }
            } else {
                const autoInteract = this.targetDestination.autoInteract;
                this.targetDestination = null;
                if (autoInteract && window.mainGame) {
                    window.mainGame.handleInteraction();
                }
            }
        }

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

                // Пыль от шагов (если на улице)
                if (gameWorld.currentLocation === "outdoor" && window.mainGame && window.mainGame.renderer) {
                    window.mainGame.renderer.weatherParticles.push({
                        type: "dust",
                        x: this.x + (Math.random() * 10 - 5),
                        y: this.y + 10,
                        vx: -dx * 0.5 + (Math.random() - 0.5) * 0.5,
                        vy: -dy * 0.5 - Math.random() * 0.5,
                        size: 2 + Math.random() * 2,
                        life: 1.0
                    });
                }
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

        // РЕНДЕРИНГ ЛОДКИ (Если игрок плывет по реке)
        if (gameWorld.isPlayerInBoat) {
            ctx.fillStyle = "#5c3e21";
            ctx.beginPath();
            ctx.moveTo(-35, -5); ctx.lineTo(35, -5);
            ctx.lineTo(25, 20); ctx.lineTo(-25, 20);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#2b180a";
            ctx.lineWidth = 3;
            ctx.stroke();

            // Вёсла
            const oarAngle = Math.sin(this.idleBob * 4) * 0.25;
            ctx.save();
            ctx.rotate(oarAngle);
            ctx.fillStyle = "#8a6642";
            ctx.fillRect(-45, 5, 90, 4);
            ctx.fillRect(-52, 2, 9, 10);
            ctx.fillRect(43, 2, 9, 10);
            ctx.restore();

            // Водные круги
            ctx.strokeStyle = "rgba(200, 230, 255, 0.4)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 18, 42, 10, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

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
        this.homeX = data.x;
        this.homeY = data.y;
        this.location = data.location || "outdoor"; // "outdoor", "church_interior", "tavern_interior", "manor_interior", "hut_interior_1", "parsonage_interior"
        this.schedule = data.schedule || [];
        this.speechBubble = null; // { text, timer }
        this.animTimer = Math.random();
        
        // AI гуляния и социального общения
        this.wanderTarget = null;
        this.wanderTimer = 5 + Math.random() * 10;
        this.socialCooldown = 0;
    }

    say(text, duration = 4.0) {
        this.speechBubble = { text, timer: duration };
    }

    update(deltaTime, gameHours, allNPCs = []) {
        this.animTimer += deltaTime;

        if (this.socialCooldown > 0) this.socialCooldown -= deltaTime;

        if (this.speechBubble) {
            this.speechBubble.timer -= deltaTime;
            if (this.speechBubble.timer <= 0) {
                this.speechBubble = null;
            }
        }

        // Социальное взаимодействие между жителями
        if (this.socialCooldown <= 0 && allNPCs.length > 0) {
            for (let other of allNPCs) {
                if (other !== this && other.socialCooldown <= 0) {
                    const dist = Math.hypot(other.x - this.x, other.y - this.y);
                    if (dist < 52) {
                        this.socialCooldown = 25.0;
                        other.socialCooldown = 25.0;

                        // Диалоги между персонажами
                        const key1 = `${this.id}-${other.id}`;
                        const key2 = `${other.id}-${this.id}`;
                        const pairs = {
                            "diak_bogdan-hanna": ["Помяну дитя на заутрене, Ганна!", "Спаси Бог вас, дьяк Богдан!"],
                            "hanna-diak_bogdan": ["Спаси Бог вас, дьяк Богдан!", "Помяну дитя на заутрене, Ганна!"],
                            "cossack_grom-yankel": ["Налей медовухи, шинкарь!", "Таки с удовольствием, атаман!"],
                            "yankel-cossack_grom": ["Таки с удовольствием, атаман!", "Налей медовухи, шинкарь!"],
                            "pan_janusz-diak_bogdan": ["Все ли готово к литургии, дьяк?", "Всё готово, ваша милость!"],
                            "diak_bogdan-pan_janusz": ["Всё готово, ваша милость!", "Все ли готово к литургии, дьяк?"]
                        };

                        const pair = pairs[key1] || pairs[key2] || ["Доброе здоровье, сокровище наше!", "И вам благословение!"];
                        this.say(pair[0], 4.5);
                        other.say(pair[1], 4.5);
                        this.wanderTarget = null;
                        other.wanderTarget = null;
                        break;
                    }
                }
            }
        }

        // График распорядка и входа/выхода из зданий
        let scheduled = false;
        for (let item of this.schedule) {
            if (gameHours >= item.startHour && gameHours < item.endHour) {
                scheduled = true;
                const targetLoc = item.location || "outdoor";

                if (this.location !== targetLoc) {
                    this.location = targetLoc;
                    this.x = item.targetX;
                    this.y = item.targetY;
                    this.wanderTarget = null;
                } else {
                    const dx = item.targetX - this.x;
                    const dy = item.targetY - this.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist > 5) {
                        this.x += (dx / dist) * 45 * deltaTime;
                        this.y += (dy / dist) * 45 * deltaTime;
                    }
                }
                break;
            }
        }

        // Автономное гуляние по веси (если свободен от графика)
        if (!scheduled) {
            this.wanderTimer -= deltaTime;
            if (this.wanderTimer <= 0) {
                this.wanderTimer = 8 + Math.random() * 14;
                this.wanderTarget = {
                    x: this.homeX + (Math.random() * 160 - 80),
                    y: this.homeY + (Math.random() * 120 - 60)
                };
            }

            if (this.wanderTarget) {
                const dx = this.wanderTarget.x - this.x;
                const dy = this.wanderTarget.y - this.y;
                const dist = Math.hypot(dx, dy);

                if (dist > 6) {
                    const stepX = (dx / dist) * 32 * deltaTime;
                    const stepY = (dy / dist) * 32 * deltaTime;
                    if (!gameWorld.checkCollision(this.x + stepX, this.y + stepY, 12)) {
                        this.x += stepX;
                        this.y += stepY;
                    } else {
                        this.wanderTarget = null;
                    }
                } else {
                    this.wanderTarget = null;
                }
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

        } else if (this.id === "diak_bogdan") {
            // Дьяк Богдан
            ctx.fillStyle = "#3a2a1a";
            ctx.fillRect(-10, -20 + bob, 20, 20);

            ctx.fillStyle = "#f5d0a6";
            ctx.beginPath();
            ctx.arc(0, -26 + bob, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#26150a";
            ctx.fillRect(-6, -24 + bob, 12, 3); // Усы

            ctx.fillStyle = "#d4af37";
            ctx.fillRect(-2, -18 + bob, 4, 10); // Стихарь/Пояс

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

        // РЕНДЕРИНГ ВСПЛЫВАЮЩЕГО ОБЛАЧКА МЫСЛЕЙ / РЕПЛИК (Speech Bubble)
        if (this.speechBubble) {
            ctx.save();
            ctx.font = "italic bold 13px 'Cormorant Garamond', serif";
            const textMetrics = ctx.measureText(this.speechBubble.text);
            const bw = textMetrics.width + 20;
            const bh = 24;
            const bx = -bw / 2;
            const by = -72 + bob;

            // Белоснежное облачко с темной рамкой
            ctx.fillStyle = "rgba(255, 252, 242, 0.96)";
            ctx.strokeStyle = "#38200d";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, 6);
            ctx.fill();
            ctx.stroke();

            // Хвостик облачка
            ctx.beginPath();
            ctx.moveTo(-4, by + bh);
            ctx.lineTo(0, by + bh + 6);
            ctx.lineTo(4, by + bh);
            ctx.fill();
            ctx.stroke();

            // Текст реплики
            ctx.fillStyle = "#1e1005";
            ctx.textAlign = "center";
            ctx.fillText(this.speechBubble.text, 0, by + 16);
            ctx.restore();
        }

        ctx.restore();
    }
}

// ДВОРОВЫЙ ПЁС БАРБОС
class Dog {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.animTimer = 0;
        this.barkBubble = null;
    }

    update(deltaTime) {
        this.animTimer += deltaTime;
        if (this.barkBubble) {
            this.barkBubble.timer -= deltaTime;
            if (this.barkBubble.timer <= 0) this.barkBubble = null;
        }

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
            this.x += (dx / dist) * 70 * deltaTime;
            this.y += (dy / dist) * 70 * deltaTime;
        } else if (Math.random() < 0.01) {
            this.targetX = 100 + Math.random() * 800;
            this.targetY = 380 + Math.random() * 300;
            if (Math.random() < 0.4) {
                this.barkBubble = { text: "Гав-гав! 🐕", timer: 3.0 };
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        const bob = Math.sin(this.animTimer * 10) * 1.5;

        // Рыже-коричневое тело собаки
        ctx.fillStyle = "#a8652d";
        ctx.fillRect(-10, -8 + bob, 20, 10);
        ctx.beginPath(); ctx.arc(10, -10 + bob, 6, 0, Math.PI * 2); ctx.fill(); // Голова
        ctx.fillStyle = "#221105";
        ctx.fillRect(-12, 0, 4, 8); ctx.fillRect(6, 0, 4, 8); // Лапки

        // Хвостик
        ctx.strokeStyle = "#a8652d";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-10, -6 + bob); ctx.lineTo(-16, -12 + Math.sin(this.animTimer * 15) * 4); ctx.stroke();

        if (this.barkBubble) {
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(-20, -32, 40, 18, 4); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#000";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(this.barkBubble.text, 0, -20);
        }

        ctx.restore();
    }
}

// СТАЯ ПТИЦ В НЕБЕ
class BirdsFlock {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = -100;
        this.y = 100 + Math.random() * 200;
        this.speed = 120 + Math.random() * 60;
        this.active = true;
    }

    update(deltaTime) {
        if (!this.active) return;
        this.x += this.speed * deltaTime;
        if (this.x > 2000) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.strokeStyle = "#222222";
        ctx.lineWidth = 2;
        const wing = Math.sin(performance.now() * 0.01) * 6;

        for (let i = 0; i < 5; i++) {
            const bx = this.x - i * 25;
            const by = this.y + (i % 2) * 15;
            ctx.beginPath();
            ctx.moveTo(bx - 8, by - wing);
            ctx.lineTo(bx, by);
            ctx.lineTo(bx + 8, by - wing);
            ctx.stroke();
        }
        ctx.restore();
    }
}
