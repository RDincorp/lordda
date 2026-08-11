/* ==========================================================================
   RENDERER.JS — Высокодетализированная Canvas 2D графика и атмосфера
   ========================================================================== */

class GameRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
        this.particles = [];

        // Текстурный паттерн травы и каменных брусчаток
        this.initPatterns();

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    initPatterns() {
        // Создаём процедурную текстуру травы с цветами
        const canvasGrass = document.createElement('canvas');
        canvasGrass.width = 64;
        canvasGrass.height = 64;
        const ctxG = canvasGrass.getContext('2d');

        ctxG.fillStyle = "#3d542a";
        ctxG.fillRect(0, 0, 64, 64);

        // Травинки и цветы
        for (let i = 0; i < 30; i++) {
            const gx = Math.random() * 64;
            const gy = Math.random() * 64;
            ctxG.fillStyle = Math.random() < 0.5 ? "#48662d" : "#324520";
            ctxG.fillRect(gx, gy, 2, 4);

            if (Math.random() < 0.15) {
                ctxG.fillStyle = Math.random() < 0.5 ? "#f7d75a" : "#ffffff";
                ctxG.fillRect(gx, gy, 2, 2); // Полевые цветы
            }
        }
        this.grassPattern = this.ctx.createPattern(canvasGrass, 'repeat');
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    updateCamera(player) {
        this.camera.targetX = player.x - this.canvas.width / 2;
        this.camera.targetY = player.y - this.canvas.height / 2;

        this.camera.x += (this.camera.targetX - this.camera.x) * 0.12;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.12;

        this.camera.x = Math.max(0, Math.min(gameWorld.width - this.canvas.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(gameWorld.height - this.canvas.height, this.camera.y));
    }

    render(player, npcs) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

        // 1. Детализированный ландшафт
        this.drawGround();

        // 2. Y-сортировка всех объектов мира
        const renderQueue = [];

        // Здания
        for (let b of gameWorld.buildings) {
            renderQueue.push({
                y: b.y + b.height - 5,
                draw: () => this.drawDetailedBuilding(b)
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

        // Деревья и декор
        for (let dec of gameWorld.decorations) {
            renderQueue.push({
                y: dec.y,
                draw: () => this.drawDetailedTree(dec)
            });
        }

        // Сортировка по Y
        renderQueue.sort((a, b) => a.y - b.y);

        for (let item of renderQueue) {
            item.draw();
        }

        // 3. Анимация дыма, искорок и тумана
        this.updateAndDrawParticles();

        // 4. Суточное освещение и световые блики
        this.drawDayNightLighting();

        this.ctx.restore();
    }

    // Детализированный ландшафт
    drawGround() {
        // Трава с текстурным рисунком
        this.ctx.fillStyle = this.grassPattern || "#3d542a";
        this.ctx.fillRect(0, 0, gameWorld.width, gameWorld.height);

        // Грунтовая дорога с гравием и булыжниками
        this.ctx.fillStyle = "#826543";
        this.ctx.beginPath();
        this.ctx.moveTo(80, 360);
        this.ctx.lineTo(1380, 360);
        this.ctx.lineTo(1380, 430);
        this.ctx.lineTo(880, 700);
        this.ctx.lineTo(80, 400);
        this.ctx.fill();

        // Обочина дороги
        this.ctx.strokeStyle = "#5e452a";
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Булыжники на площади перед храмом и корчмой
        this.ctx.fillStyle = "#6b563d";
        for (let cx = 320; cx < 620; cx += 25) {
            for (let cy = 370; cy < 450; cy += 18) {
                this.ctx.beginPath();
                this.ctx.ellipse(cx + (cy % 5), cy, 8, 5, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Река
        this.ctx.fillStyle = "#274a6b";
        this.ctx.beginPath();
        this.ctx.arc(1600, 1000, 260, 0, Math.PI * 2);
        this.ctx.fill();

        // Водные блики
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        for (let i = 0; i < 5; i++) {
            this.ctx.fillRect(1450 + i * 30, 920 + i * 20, 40, 3);
        }
    }

    // ВЫСОКОДЕТАЛИЗИРОВАННЫЕ ЗДАНИЯ
    drawDetailedBuilding(b) {
        // Динамическая длинная тень в зависимости от времени суток
        const shadowAngle = (timeManager.gameHours - 12) * 0.15;
        this.ctx.fillStyle = "rgba(10, 5, 0, 0.35)";
        this.ctx.beginPath();
        this.ctx.moveTo(b.x, b.y + b.height);
        this.ctx.lineTo(b.x + b.width, b.y + b.height);
        this.ctx.lineTo(b.x + b.width + shadowAngle * 40, b.y + b.height + 25);
        this.ctx.lineTo(b.x + shadowAngle * 40, b.y + b.height + 25);
        this.ctx.fill();

        // Каменный фундамент
        this.ctx.fillStyle = "#4a4238";
        this.ctx.fillRect(b.x, b.y + b.height - 15, b.width, 15);
        this.ctx.strokeStyle = "#2b251d";
        this.ctx.lineWidth = 1;
        for (let fx = b.x; fx < b.x + b.width; fx += 20) {
            this.ctx.strokeRect(fx, b.y + b.height - 15, 20, 15);
        }

        // Деревянный сруб
        this.ctx.fillStyle = b.color;
        this.ctx.fillRect(b.x, b.y + 35, b.width, b.height - 50);

        // Объёмные тёмные брёвна с выемками
        this.ctx.strokeStyle = "#2e1e12";
        this.ctx.lineWidth = 2;
        for (let ly = b.y + 45; ly < b.y + b.height - 15; ly += 14) {
            this.ctx.beginPath();
            this.ctx.moveTo(b.x, ly);
            this.ctx.lineTo(b.x + b.width, ly);
            this.ctx.stroke();

            // Железные кованые гвозди
            this.ctx.fillStyle = "#120b06";
            this.ctx.fillRect(b.x + 8, ly - 3, 2, 2);
            this.ctx.fillRect(b.x + b.width - 8, ly - 3, 2, 2);
        }

        // Окна здания с резными наличниками
        const isNight = timeManager.gameHours < 6 || timeManager.gameHours >= 20;
        const windowGlow = isNight ? "#ffd700" : "#a2c4c9";

        this.ctx.fillStyle = windowGlow;
        if (isNight) {
            this.ctx.shadowColor = "#ffa500";
            this.ctx.shadowBlur = 15;
        }

        // 2 Окна по бокам
        this.ctx.fillRect(b.x + 30, b.y + 60, 24, 32);
        this.ctx.fillRect(b.x + b.width - 54, b.y + 60, 24, 32);
        this.ctx.shadowBlur = 0;

        // Деревянная оконная рама
        this.ctx.strokeStyle = "#382314";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.x + 30, b.y + 60, 24, 32);
        this.ctx.strokeRect(b.x + b.width - 54, b.y + 60, 24, 32);

        // Черепичная / гонтовая Крыша
        this.ctx.fillStyle = b.roofColor;
        this.ctx.beginPath();
        this.ctx.moveTo(b.x - 20, b.y + 35);
        this.ctx.lineTo(b.x + b.width / 2, b.y - 30);
        this.ctx.lineTo(b.x + b.width + 20, b.y + 35);
        this.ctx.closePath();
        this.ctx.fill();

        // Рельеф гонта/гонтовой черепицы
        this.ctx.strokeStyle = "rgba(0,0,0,0.3)";
        for (let ry = b.y - 20; ry < b.y + 35; ry += 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(b.x - 10, ry);
            this.ctx.lineTo(b.x + b.width + 10, ry);
            this.ctx.stroke();
        }

        // ОСОБЕННОСТИ ДЛЯ ЦЕРКВИ
        if (b.type === "wooden_church") {
            // Позолоченный Восьмиконечный Униатский Купол
            const cx = b.x + b.width / 2;
            const cy = b.y - 45;

            // Купол
            this.ctx.fillStyle = "#d4af37";
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 22, 0, Math.PI * 2);
            this.ctx.fill();

            // Золотой Сияющий Крест
            this.ctx.strokeStyle = "#ffd700";
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy - 45);
            this.ctx.lineTo(cx, cy - 20);
            this.ctx.moveTo(cx - 12, cy - 35);
            this.ctx.lineTo(cx + 12, cy - 35);
            this.ctx.moveTo(cx - 8, cy - 26);
            this.ctx.lineTo(cx + 8, cy - 22); // Косая перекладина
            this.ctx.stroke();
        }

        // Дверной портал
        this.ctx.fillStyle = "#29180c";
        this.ctx.fillRect(b.doorX - 16, b.doorY - 40, 32, 40);
        this.ctx.strokeStyle = "#d4af37";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.doorX - 16, b.doorY - 40, 32, 40);

        // Позолоченное название
        this.ctx.font = "bold 14px 'Cinzel', serif";
        this.ctx.fillStyle = "#ffe0a3";
        this.ctx.textAlign = "center";
        this.ctx.shadowColor = "#000";
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(b.name, b.x + b.width / 2, b.y + 20);
        this.ctx.shadowBlur = 0;
    }

    // Деревья с кроной
    drawDetailedTree(t) {
        // Тень
        this.ctx.fillStyle = "rgba(10, 5, 0, 0.35)";
        this.ctx.beginPath();
        this.ctx.ellipse(t.x, t.y, t.size * 0.9, t.size * 0.35, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Ствол дуба
        this.ctx.fillStyle = "#382313";
        this.ctx.fillRect(t.x - 8, t.y - 35, 16, 35);

        // Пышная крона из 3 шаров
        this.ctx.fillStyle = "#274218";
        this.ctx.beginPath();
        this.ctx.arc(t.x - 12, t.y - 50, t.size * 0.7, 0, Math.PI * 2);
        this.ctx.arc(t.x + 12, t.y - 50, t.size * 0.7, 0, Math.PI * 2);
        this.ctx.arc(t.x, t.y - 65, t.size * 0.85, 0, Math.PI * 2);
        this.ctx.fill();

        // Светлые блики на кроне
        this.ctx.fillStyle = "#3a5c23";
        this.ctx.beginPath();
        this.ctx.arc(t.x - 5, t.y - 70, t.size * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawObject(obj) {
        this.ctx.font = "32px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText(obj.icon, obj.x, obj.y);

        // Дым/искорки
        if (obj.id === "cossack_fire" && Math.random() < 0.5) {
            this.particles.push({
                x: obj.x + (Math.random() * 20 - 10),
                y: obj.y - 12,
                vx: Math.random() * 1.5 - 0.75,
                vy: -Math.random() * 2.5 - 1,
                life: 1.0,
                color: Math.random() < 0.5 ? "#ffaa00" : "#ff4400"
            });
        }
    }

    updateAndDrawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.025;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }
    }

    drawDayNightLighting() {
        const lighting = timeManager.getAmbientLighting();
        if (lighting.alpha <= 0.01) return;

        this.ctx.save();
        this.ctx.fillStyle = lighting.color;
        this.ctx.globalAlpha = lighting.alpha;
        this.ctx.fillRect(0, 0, gameWorld.width, gameWorld.height);

        // Вырезание света фонарей и свечей
        this.ctx.globalCompositeOperation = 'destination-out';

        for (let light of gameWorld.lightSources) {
            let rad = light.radius;
            if (light.isFlickering) rad += (Math.random() * 12 - 6);

            const grad = this.ctx.createRadialGradient(light.x, light.y, 5, light.x, light.y, rad);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(light.x, light.y, rad, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }
}
