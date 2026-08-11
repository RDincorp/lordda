/* ==========================================================================
   RENDERER.JS — Движок отрисовки уличной карты и интерьеров зданий
   ========================================================================== */

class GameRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
        this.particles = [];
        this.fadeAlpha = 0; // Для затемнения при переходе в здания

        this.initPatterns();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    initPatterns() {
        const canvasGrass = document.createElement('canvas');
        canvasGrass.width = 64;
        canvasGrass.height = 64;
        const ctxG = canvasGrass.getContext('2d');

        ctxG.fillStyle = "#3d542a";
        ctxG.fillRect(0, 0, 64, 64);

        for (let i = 0; i < 30; i++) {
            const gx = Math.random() * 64;
            const gy = Math.random() * 64;
            ctxG.fillStyle = Math.random() < 0.5 ? "#48662d" : "#324520";
            ctxG.fillRect(gx, gy, 2, 4);

            if (Math.random() < 0.15) {
                ctxG.fillStyle = Math.random() < 0.5 ? "#f7d75a" : "#ffffff";
                ctxG.fillRect(gx, gy, 2, 2);
            }
        }
        this.grassPattern = this.ctx.createPattern(canvasGrass, 'repeat');
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    updateCamera(player) {
        if (gameWorld.currentLocation === "outdoor") {
            this.camera.targetX = player.x - this.canvas.width / 2;
            this.camera.targetY = player.y - this.canvas.height / 2;

            this.camera.x += (this.camera.targetX - this.camera.x) * 0.12;
            this.camera.y += (this.camera.targetY - this.camera.y) * 0.12;

            this.camera.x = Math.max(0, Math.min(gameWorld.width - this.canvas.width, this.camera.x));
            this.camera.y = Math.max(0, Math.min(gameWorld.height - this.canvas.height, this.camera.y));
        } else {
            // Камера зафиксирована по центру интерьера
            const interior = gameWorld.interiors[gameWorld.currentLocation];
            if (interior) {
                this.camera.x = interior.width / 2 - this.canvas.width / 2;
                this.camera.y = interior.height / 2 - this.canvas.height / 2;
            }
        }
    }

    render(player, npcs) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

        if (gameWorld.currentLocation === "outdoor") {
            // Отрисовка улицы
            this.drawGround();

            const renderQueue = [];

            for (let b of gameWorld.buildings) {
                renderQueue.push({
                    y: b.y + b.height - 5,
                    draw: () => this.drawDetailedBuilding(b)
                });
            }

            for (let obj of gameWorld.interactiveObjects) {
                renderQueue.push({
                    y: obj.y,
                    draw: () => this.drawObject(obj)
                });
            }

            renderQueue.push({
                y: player.y,
                draw: () => player.draw(this.ctx)
            });

            for (let npc of npcs) {
                renderQueue.push({
                    y: npc.y,
                    draw: () => npc.draw(this.ctx)
                });
            }

            for (let dec of gameWorld.decorations) {
                renderQueue.push({
                    y: dec.y,
                    draw: () => this.drawDecoration(dec)
                });
            }

            renderQueue.sort((a, b) => a.y - b.y);

            for (let item of renderQueue) {
                item.draw();
            }

            this.updateAndDrawParticles();
            this.drawDayNightLighting();

        } else {
            // Отрисовка интерьера
            this.drawInterior(gameWorld.currentLocation, player);
        }

        // Затеменение перехода
        if (this.fadeAlpha > 0) {
            this.ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
            this.ctx.fillRect(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);
        }

        this.ctx.restore();
    }

    drawGround() {
        this.ctx.fillStyle = this.grassPattern || "#3d542a";
        this.ctx.fillRect(0, 0, gameWorld.width, gameWorld.height);

        // Грунтовая дорога
        this.ctx.fillStyle = "#826543";
        this.ctx.beginPath();
        this.ctx.moveTo(80, 360);
        this.ctx.lineTo(1380, 360);
        this.ctx.lineTo(1380, 430);
        this.ctx.lineTo(880, 700);
        this.ctx.lineTo(80, 400);
        this.ctx.fill();

        // Булыжники на площади
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

        // Деревянный пирс
        this.ctx.fillStyle = "#422e1b";
        this.ctx.fillRect(1380, 960, 60, 20);
    }

    // РЕНДЕР ИНТЕРЬЕРОВ
    drawInterior(interiorId, player) {
        const interior = gameWorld.interiors[interiorId];
        if (!interior) return;

        // Пол комнаты (Деревянные доски)
        this.ctx.fillStyle = "#3d2716";
        this.ctx.fillRect(0, 0, interior.width, interior.height);

        // Узор половиц
        this.ctx.strokeStyle = "#24180d";
        this.ctx.lineWidth = 2;
        for (let py = 20; py < interior.height; py += 24) {
            this.ctx.beginPath();
            this.ctx.moveTo(20, py);
            this.ctx.lineTo(interior.width - 20, py);
            this.ctx.stroke();
        }

        // Стены комнаты
        this.ctx.fillStyle = "#1e130a";
        this.ctx.fillRect(0, 0, interior.width, 30); // Верхняя стена
        this.ctx.fillRect(0, 0, 20, interior.height); // Левая стена
        this.ctx.fillRect(interior.width - 20, 0, 20, interior.height); // Правая стена
        this.ctx.fillRect(0, interior.height - 20, interior.width, 20); // Нижняя стена

        // Название комнаты
        this.ctx.font = "bold 16px 'Cinzel', serif";
        this.ctx.fillStyle = "#ffd700";
        this.ctx.textAlign = "center";
        this.ctx.fillText(interior.name, interior.width / 2, 22);

        // Отрисовка объектов интерьера
        for (let obj of interior.objects) {
            this.ctx.font = "32px sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.fillText(obj.icon, obj.x, obj.y);

            this.ctx.font = "12px 'Cormorant Garamond', serif";
            this.ctx.fillStyle = "#fce8c3";
            this.ctx.fillText(obj.name, obj.x, obj.y - 25);
        }

        // Игрок внутри
        player.draw(this.ctx);

        // Внутреннее теплое освещение
        for (let light of interior.lights || []) {
            let rad = light.radius;
            if (light.isFlickering) rad += (Math.random() * 8 - 4);

            const grad = this.ctx.createRadialGradient(light.x, light.y, 5, light.x, light.y, rad);
            grad.addColorStop(0, light.color);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(light.x, light.y, rad, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawDetailedBuilding(b) {
        const shadowAngle = (timeManager.gameHours - 12) * 0.15;
        this.ctx.fillStyle = "rgba(10, 5, 0, 0.35)";
        this.ctx.beginPath();
        this.ctx.moveTo(b.x, b.y + b.height);
        this.ctx.lineTo(b.x + b.width, b.y + b.height);
        this.ctx.lineTo(b.x + b.width + shadowAngle * 40, b.y + b.height + 25);
        this.ctx.lineTo(b.x + shadowAngle * 40, b.y + b.height + 25);
        this.ctx.fill();

        this.ctx.fillStyle = "#4a4238";
        this.ctx.fillRect(b.x, b.y + b.height - 15, b.width, 15);

        this.ctx.fillStyle = b.color;
        this.ctx.fillRect(b.x, b.y + 35, b.width, b.height - 50);

        this.ctx.strokeStyle = "#2e1e12";
        this.ctx.lineWidth = 2;
        for (let ly = b.y + 45; ly < b.y + b.height - 15; ly += 14) {
            this.ctx.beginPath();
            this.ctx.moveTo(b.x, ly);
            this.ctx.lineTo(b.x + b.width, ly);
            this.ctx.stroke();
        }

        // Окна
        const isNight = timeManager.gameHours < 6 || timeManager.gameHours >= 20;
        this.ctx.fillStyle = isNight ? "#ffd700" : "#a2c4c9";
        this.ctx.fillRect(b.x + 30, b.y + 60, 24, 32);
        this.ctx.fillRect(b.x + b.width - 54, b.y + 60, 24, 32);

        // Крыша
        this.ctx.fillStyle = b.roofColor;
        this.ctx.beginPath();
        this.ctx.moveTo(b.x - 20, b.y + 35);
        this.ctx.lineTo(b.x + b.width / 2, b.y - 30);
        this.ctx.lineTo(b.x + b.width + 20, b.y + 35);
        this.ctx.closePath();
        this.ctx.fill();

        if (b.type === "wooden_church") {
            const cx = b.x + b.width / 2;
            const cy = b.y - 45;

            this.ctx.fillStyle = "#d4af37";
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 22, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.strokeStyle = "#ffd700";
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy - 45);
            this.ctx.lineTo(cx, cy - 20);
            this.ctx.moveTo(cx - 12, cy - 35);
            this.ctx.lineTo(cx + 12, cy - 35);
            this.ctx.moveTo(cx - 8, cy - 26);
            this.ctx.lineTo(cx + 8, cy - 22);
            this.ctx.stroke();
        }

        // Дверь
        this.ctx.fillStyle = "#29180c";
        this.ctx.fillRect(b.doorX - 16, b.doorY - 40, 32, 40);
        this.ctx.strokeStyle = "#d4af37";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.doorX - 16, b.doorY - 40, 32, 40);

        this.ctx.font = "bold 14px 'Cinzel', serif";
        this.ctx.fillStyle = "#ffe0a3";
        this.ctx.textAlign = "center";
        this.ctx.fillText(b.name, b.x + b.width / 2, b.y + 20);
    }

    drawDecoration(dec) {
        if (dec.type === "tree") {
            this.ctx.fillStyle = "rgba(10, 5, 0, 0.35)";
            this.ctx.beginPath();
            this.ctx.ellipse(dec.x, dec.y, dec.size * 0.9, dec.size * 0.35, 0, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = "#382313";
            this.ctx.fillRect(dec.x - 8, dec.y - 35, 16, 35);

            this.ctx.fillStyle = "#274218";
            this.ctx.beginPath();
            this.ctx.arc(dec.x - 12, dec.y - 50, dec.size * 0.7, 0, Math.PI * 2);
            this.ctx.arc(dec.x + 12, dec.y - 50, dec.size * 0.7, 0, Math.PI * 2);
            this.ctx.arc(dec.x, dec.y - 65, dec.size * 0.85, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (dec.type === "fence") {
            this.ctx.fillStyle = "#4a3321";
            this.ctx.fillRect(dec.x, dec.y, dec.width, 10);
        } else if (dec.type === "cart") {
            this.ctx.font = "28px sans-serif";
            this.ctx.fillText("🛒", dec.x, dec.y);
        } else if (dec.type === "grave") {
            this.ctx.font = "24px sans-serif";
            this.ctx.fillText("🪦", dec.x, dec.y);
        }
    }

    drawObject(obj) {
        this.ctx.font = "32px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText(obj.icon, obj.x, obj.y);

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
