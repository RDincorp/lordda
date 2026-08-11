/* ==========================================================================
   RENDERER.JS — Движок отрисовки Canvas 2D, послойной глубины и освещения
   ========================================================================== */

class GameRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Камера
        this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };

        // Частицы костра и огоньков
        this.particles = [];

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Обновление камеры с центрированием на игроке
    updateCamera(player) {
        this.camera.targetX = player.x - this.canvas.width / 2;
        this.camera.targetY = player.y - this.canvas.height / 2;

        // Плавное слежение камеры (lerp)
        this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;

        // Ограничения камеры краями карты
        this.camera.x = Math.max(0, Math.min(gameWorld.width - this.canvas.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(gameWorld.height - this.canvas.height, this.camera.y));
    }

    // РЕНДЕР ИГРОВОГО КАДРА
    render(player, npcs) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        // Смещение камеры
        this.ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

        // 1. Отрисовка ландшафта (земля, дороги, трава, река)
        this.drawGround();

        // 2. Сбор всех Y-сортируемых объектов (Здания, Деревья, Игрок, NPC, Объекты)
        const renderQueue = [];

        // Здания
        for (let b of gameWorld.buildings) {
            renderQueue.push({
                y: b.y + b.height - 10,
                draw: () => this.drawBuilding(b)
            });
        }

        // Интерактивные объекты
        for (let obj of gameWorld.interactiveObjects) {
            renderQueue.push({
                y: obj.y,
                draw: () => this.drawObject(obj)
            });
        }

        // Игрок
        renderQueue.push({
            y: player.y,
            draw: () => player.draw(this.ctx)
        });

        // NPC
        for (let npc of npcs) {
            renderQueue.push({
                y: npc.y,
                draw: () => npc.draw(this.ctx)
            });
        }

        // Деревья
        for (let dec of gameWorld.decorations) {
            renderQueue.push({
                y: dec.y,
                draw: () => this.drawTree(dec)
            });
        }

        // Сортировка по координате Y (Depth-sorting)
        renderQueue.sort((a, b) => a.y - b.y);

        // Отрисовка очереди
        for (let item of renderQueue) {
            item.draw();
        }

        // 3. Частицы костра и свечей
        this.updateAndDrawParticles();

        // 4. Отрисовка суточного освещения (Ночной фонарный слой)
        this.drawDayNightLighting();

        this.ctx.restore();
    }

    // Отрисовка ландшафта XVII века
    drawGround() {
        // Трава
        this.ctx.fillStyle = "#3d522b";
        this.ctx.fillRect(0, 0, gameWorld.width, gameWorld.height);

        // Просёлочная грунтовая дорога
        this.ctx.fillStyle = "#8a6d45";
        this.ctx.beginPath();
        // Главная улица села
        this.ctx.moveTo(100, 360);
        this.ctx.lineTo(1350, 360);
        this.ctx.lineTo(1350, 420);
        this.ctx.lineTo(870, 680);
        this.ctx.lineTo(100, 390);
        this.ctx.fill();

        // Река на севере и востоке
        this.ctx.fillStyle = "#2d526e";
        this.ctx.beginPath();
        this.ctx.arc(1600, 1000, 250, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // Отрисовка строений
    drawBuilding(b) {
        // Тень от здания
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        this.ctx.fillRect(b.x + 10, b.y + b.height - 10, b.width, 20);

        // Фасад здания
        this.ctx.fillStyle = b.color;
        this.ctx.fillRect(b.x, b.y + 40, b.width, b.height - 40);

        // Брёвна / деревянные балки
        this.ctx.strokeStyle = "rgba(0,0,0,0.25)";
        this.ctx.lineWidth = 2;
        for (let ly = b.y + 50; ly < b.y + b.height; ly += 14) {
            this.ctx.beginPath();
            this.ctx.moveTo(b.x, ly);
            this.ctx.lineTo(b.x + b.width, ly);
            this.ctx.stroke();
        }

        // Крыша
        this.ctx.fillStyle = b.roofColor;
        this.ctx.beginPath();
        this.ctx.moveTo(b.x - 15, b.y + 40);
        this.ctx.lineTo(b.x + b.width / 2, b.y - 20);
        this.ctx.lineTo(b.x + b.width + 15, b.y + 40);
        this.ctx.closePath();
        this.ctx.fill();

        // Купол и купольный крест Униатского храма
        if (b.type === "wooden_church") {
            // Купол-луковица
            this.ctx.fillStyle = "#d4af37";
            this.ctx.beginPath();
            this.ctx.arc(b.x + b.width / 2, b.y - 35, 18, 0, Math.PI * 2);
            this.ctx.fill();

            // Восьмиконечный / Униатский Крест
            this.ctx.strokeStyle = "#ffd700";
            this.ctx.lineWidth = 3;
            const cx = b.x + b.width / 2;
            const cy = b.y - 65;
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx, cy + 25);
            this.ctx.moveTo(cx - 10, cy + 8);
            this.ctx.lineTo(cx + 10, cy + 8);
            this.ctx.stroke();
        }

        // Дверь
        this.ctx.fillStyle = "#2b190e";
        this.ctx.fillRect(b.doorX - 15, b.doorY - 35, 30, 35);
        this.ctx.strokeStyle = "#d4af37";
        this.ctx.strokeRect(b.doorX - 15, b.doorY - 35, 30, 35);

        // Название здания
        this.ctx.font = "bold 13px 'Cormorant Garamond', serif";
        this.ctx.fillStyle = "#f3e5ab";
        this.ctx.textAlign = "center";
        this.ctx.fillText(b.name, b.x + b.width / 2, b.y + 25);
    }

    // Отрисовка интерактивных объектов
    drawObject(obj) {
        this.ctx.font = "28px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText(obj.icon, obj.x, obj.y);

        // Если подсвечник / костёр — пускаем искорки
        if (obj.id === "cossack_fire" && Math.random() < 0.4) {
            this.particles.push({
                x: obj.x + (Math.random() * 20 - 10),
                y: obj.y - 10,
                vx: Math.random() * 1 - 0.5,
                vy: -Math.random() * 2 - 1,
                life: 1.0,
                color: "#ffaa00"
            });
        }
    }

    // Деревья
    drawTree(t) {
        // Тень
        this.ctx.fillStyle = "rgba(0,0,0,0.3)";
        this.ctx.beginPath();
        this.ctx.ellipse(t.x, t.y, t.size * 0.8, t.size * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Ствол
        this.ctx.fillStyle = "#3d2714";
        this.ctx.fillRect(t.x - 6, t.y - 30, 12, 30);

        // Крона
        this.ctx.fillStyle = "#223d18";
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y - 45, t.size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // Анимация частиц костра
    updateAndDrawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }
    }

    // Ночная атмосфера и свечение окон/свечей
    drawDayNightLighting() {
        const lighting = timeManager.getAmbientLighting();

        if (lighting.alpha <= 0.01) return; // Днём полупрозрачную маску не накладываем

        // Создаем холст ночного теневого слоя
        this.ctx.save();
        this.ctx.fillStyle = lighting.color;
        this.ctx.globalAlpha = lighting.alpha;
        this.ctx.fillRect(0, 0, gameWorld.width, gameWorld.height);

        // Накладываем вырезание света (light-blending)
        this.ctx.globalCompositeOperation = 'destination-out';

        for (let light of gameWorld.lightSources) {
            let rad = light.radius;
            if (light.isFlickering) {
                rad += (Math.random() * 10 - 5);
            }

            const grad = this.ctx.createRadialGradient(light.x, light.y, 5, light.x, light.y, rad);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.6)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(light.x, light.y, rad, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }
}
