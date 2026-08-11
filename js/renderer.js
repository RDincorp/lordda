/* ==========================================================================
   RENDERER.JS — Процедурный движок графики (Уровень Cult of the Lamb / Factorio)
   ========================================================================== */

class GameRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
        this.particles = [];
        this.timeTick = 0;

        // Генерация высокодетализированных процедурных текстур
        this.generateProceduralTextures();

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // ГЕНЕРАЦИЯ ПРОЦЕДУРНЫХ ТЕКСТУР И ПАТТЕРНОВ
    generateProceduralTextures() {
        // 1. ТЕКСТУРА ТРАВЫ И ПОЛЕВЫХ ЦВЕТОВ (Grass & Wildflowers)
        const cGrass = document.createElement('canvas');
        cGrass.width = 128;
        cGrass.height = 128;
        const ctxG = cGrass.getContext('2d');

        // Базовый сочный дерн
        ctxG.fillStyle = "#2c401d";
        ctxG.fillRect(0, 0, 128, 128);

        // Градиентные пятна почвы и мха
        for (let i = 0; i < 200; i++) {
            const gx = Math.random() * 128;
            const gy = Math.random() * 128;
            ctxG.fillStyle = Math.random() < 0.6 ? "#355222" : "#223315";
            ctxG.fillRect(gx, gy, 3, 5);

            // Травинки с бликами
            if (Math.random() < 0.3) {
                ctxG.fillStyle = "#4a7329";
                ctxG.fillRect(gx, gy, 1, 6);
            }

            // Полевые цветы (маки, васильки, лютики)
            if (Math.random() < 0.08) {
                const flowerColor = ["#e63946", "#f4a261", "#e9c46a", "#a8dadc"][Math.floor(Math.random() * 4)];
                ctxG.fillStyle = flowerColor;
                ctxG.beginPath();
                ctxG.arc(gx, gy, 1.5, 0, Math.PI * 2);
                ctxG.fill();
            }
        }
        this.grassPattern = this.ctx.createPattern(cGrass, 'repeat');

        // 2. ТЕКСТУРА КАМЕННОЙ БРУСЧАТКИ (Cobblestone)
        const cCobble = document.createElement('canvas');
        cCobble.width = 64;
        cCobble.height = 64;
        const ctxC = cCobble.getContext('2d');

        ctxC.fillStyle = "#4a3c2e";
        ctxC.fillRect(0, 0, 64, 64);

        for (let x = 0; x < 64; x += 16) {
            for (let y = 0; y < 64; y += 10) {
                const shift = (y / 10 % 2) * 8;
                ctxC.fillStyle = "#635443";
                ctxC.fillRect(x + shift + 1, y + 1, 14, 8);
                ctxC.fillStyle = "#7a6855"; // Блик
                ctxC.fillRect(x + shift + 2, y + 2, 12, 3);
                ctxC.fillStyle = "#33271d"; // Тень шва
                ctxC.fillRect(x + shift, y + 8, 16, 2);
            }
        }
        this.cobblePattern = this.ctx.createPattern(cCobble, 'repeat');

        // 3. ТЕКСТУРА ДЕРЕВЯННОГО СРУБА И ДОСОК (Wood Planks)
        const cWood = document.createElement('canvas');
        cWood.width = 64;
        cWood.height = 64;
        const ctxW = cWood.getContext('2d');

        ctxW.fillStyle = "#5c3e21";
        ctxW.fillRect(0, 0, 64, 64);

        for (let y = 0; y < 64; y += 12) {
            ctxW.fillStyle = "#472c15";
            ctxW.fillRect(0, y, 64, 2); // Стыки брёвен
            ctxW.fillStyle = "#6e4b2a";
            ctxW.fillRect(0, y + 2, 64, 4); // Светлая полоса

            // Текстурные древесные спирали и волокна
            for (let x = 0; x < 64; x += 8) {
                if (Math.random() < 0.2) {
                    ctxW.fillStyle = "#38200d";
                    ctxW.fillRect(x, y + 5, 4, 2); // Железный кованый гвоздь
                }
            }
        }
        this.woodPattern = this.ctx.createPattern(cWood, 'repeat');
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
            const interior = gameWorld.interiors[gameWorld.currentLocation];
            if (interior) {
                this.camera.x = interior.width / 2 - this.canvas.width / 2;
                this.camera.y = interior.height / 2 - this.canvas.height / 2;
            }
        }
    }

    render(player, npcs) {
        this.timeTick += 0.02;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

        if (gameWorld.currentLocation === "outdoor") {
            // 1. Уличный ландшафт
            this.drawOutdoorGround();

            // 2. Y-сортировка всех элементов мира
            const renderQueue = [];

            // Здания
            for (let b of gameWorld.buildings) {
                renderQueue.push({
                    y: b.y + b.height - 5,
                    draw: () => this.drawCultStyleBuilding(b)
                });
            }

            // Интерактивные объекты
            for (let obj of gameWorld.interactiveObjects) {
                renderQueue.push({
                    y: obj.y,
                    draw: () => this.drawInteractiveObject(obj)
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

            // Декорации
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

            // 3. Атмосферные частицы (дым из труб, пыльцы, искорки)
            this.updateAndDrawParticles();

            // 4. Объемное суточное освещение и световые лучи (Bloom & God Rays)
            this.drawAtmosphericLighting();

        } else {
            // Интерьер комнаты
            this.drawDetailedInterior(gameWorld.currentLocation, player);
        }

        this.ctx.restore();
    }

    // УЛИЧНЫЙ ЛАНДШАФТ
    drawOutdoorGround() {
        // Трава с процедурным рисунком
        this.ctx.fillStyle = this.grassPattern;
        this.ctx.fillRect(0, 0, gameWorld.width, gameWorld.height);

        // Просёлочная дорога с мягкими градиентными краями
        this.ctx.fillStyle = "#806242";
        this.ctx.beginPath();
        this.ctx.moveTo(80, 360);
        this.ctx.lineTo(1380, 360);
        this.ctx.lineTo(1380, 430);
        this.ctx.lineTo(880, 700);
        this.ctx.lineTo(80, 400);
        this.ctx.fill();

        // Каменная площади пред храмом
        this.ctx.fillStyle = this.cobblePattern;
        this.ctx.beginPath();
        this.ctx.rect(320, 370, 300, 80);
        this.ctx.fill();
        this.ctx.strokeStyle = "#2b1f14";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(320, 370, 300, 80);

        // Река с анимированными волнами
        const waveOffset = Math.sin(this.timeTick) * 5;
        this.ctx.fillStyle = "#224766";
        this.ctx.beginPath();
        this.ctx.arc(1600, 1000, 260 + waveOffset, 0, Math.PI * 2);
        this.ctx.fill();

        // Блики на воде
        this.ctx.fillStyle = "rgba(180, 220, 255, 0.25)";
        for (let i = 0; i < 8; i++) {
            const wx = 1420 + i * 25 + Math.sin(this.timeTick + i) * 10;
            const wy = 900 + i * 20;
            this.ctx.fillRect(wx, wy, 45, 4);
        }
    }

    // ЗДАНИЯ В СТИЛЕ CULT OF THE LAMB (Обводка, текстуры, объем, детали)
    drawCultStyleBuilding(b) {
        // 1. Объемная падающая тень
        const shadowAngle = (timeManager.gameHours - 12) * 0.12;
        this.ctx.fillStyle = "rgba(8, 4, 0, 0.4)";
        this.ctx.beginPath();
        this.ctx.moveTo(b.x, b.y + b.height);
        this.ctx.lineTo(b.x + b.width, b.y + b.height);
        this.ctx.lineTo(b.x + b.width + shadowAngle * 50, b.y + b.height + 30);
        this.ctx.lineTo(b.x + shadowAngle * 50, b.y + b.height + 30);
        this.ctx.fill();

        // 2. Цоколь и фундамент
        this.ctx.fillStyle = "#3d342a";
        this.ctx.fillRect(b.x - 4, b.y + b.height - 18, b.width + 8, 18);
        this.ctx.strokeStyle = "#1a140d";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(b.x - 4, b.y + b.height - 18, b.width + 8, 18);

        // 3. Фасад из резных бревен
        this.ctx.fillStyle = b.color;
        this.ctx.fillRect(b.x, b.y + 30, b.width, b.height - 48);

        // Обводка фасада
        this.ctx.strokeStyle = "#1a1009";
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(b.x, b.y + 30, b.width, b.height - 48);

        // Послойный сруб
        this.ctx.strokeStyle = "rgba(20, 10, 5, 0.4)";
        this.ctx.lineWidth = 3;
        for (let ly = b.y + 42; ly < b.y + b.height - 18; ly += 14) {
            this.ctx.beginPath();
            this.ctx.moveTo(b.x, ly);
            this.ctx.lineTo(b.x + b.width, ly);
            this.ctx.stroke();
        }

        // 4. Витражные сияющие окна
        const isNight = timeManager.gameHours < 6 || timeManager.gameHours >= 20;
        this.ctx.fillStyle = isNight ? "#ffd700" : "#7bb3c4";

        if (isNight) {
            this.ctx.shadowColor = "#ffaa00";
            this.ctx.shadowBlur = 20;
        }

        this.ctx.fillRect(b.x + 30, b.y + 55, 26, 36);
        this.ctx.fillRect(b.x + b.width - 56, b.y + 55, 26, 36);
        this.ctx.shadowBlur = 0;

        // Переплет оконных рам
        this.ctx.strokeStyle = "#24150a";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(b.x + 30, b.y + 55, 26, 36);
        this.ctx.strokeRect(b.x + b.width - 56, b.y + 55, 26, 36);

        // 5. Двускатная гонтовая крыша с мхом
        this.ctx.fillStyle = b.roofColor;
        this.ctx.beginPath();
        this.ctx.moveTo(b.x - 24, b.y + 32);
        this.ctx.lineTo(b.x + b.width / 2, b.y - 36);
        this.ctx.lineTo(b.x + b.width + 24, b.y + 32);
        this.ctx.closePath();
        this.ctx.fill();

        // Чёрная сочная обводка крыши
        this.ctx.strokeStyle = "#140b05";
        this.ctx.lineWidth = 5;
        this.ctx.stroke();

        // Мох на крыше
        this.ctx.fillStyle = "#3b5c22";
        this.ctx.fillRect(b.x - 10, b.y + 20, 30, 8);
        this.ctx.fillRect(b.x + b.width - 25, b.y + 15, 25, 8);

        // Труба и дым
        if (b.id === "parsonage" || b.id === "tavern") {
            const tx = b.x + 30;
            const ty = b.y - 20;
            this.ctx.fillStyle = "#4a3c30";
            this.ctx.fillRect(tx, ty, 16, 20);
            this.ctx.strokeStyle = "#120a04";
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(tx, ty, 16, 20);

            // Дым из трубы
            if (Math.random() < 0.4) {
                this.particles.push({
                    x: tx + 8,
                    y: ty - 4,
                    vx: Math.random() * 0.6 - 0.3,
                    vy: -Math.random() * 1.5 - 0.8,
                    size: 6 + Math.random() * 6,
                    life: 1.0,
                    color: "rgba(220, 210, 200, 0.4)"
                });
            }
        }

        // ХРАМ: ПОЗОЛОЧЕННЫЙ КУПОЛ И СИЯЮЩИЙ КРЕСТ
        if (b.type === "wooden_church") {
            const cx = b.x + b.width / 2;
            const cy = b.y - 52;

            // Блик на золотом куполе
            this.ctx.fillStyle = "#ffd700";
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 24, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "#1a1005";
            this.ctx.lineWidth = 4;
            this.ctx.stroke();

            // Крест
            this.ctx.strokeStyle = "#ffe600";
            this.ctx.shadowColor = "#ffd700";
            this.ctx.shadowBlur = 15;
            this.ctx.lineWidth = 5;
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy - 48);
            this.ctx.lineTo(cx, cy - 20);
            this.ctx.moveTo(cx - 14, cy - 38);
            this.ctx.lineTo(cx + 14, cy - 38);
            this.ctx.moveTo(cx - 9, cy - 28);
            this.ctx.lineTo(cx + 9, cy - 24);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }

        // ДВЕРНОЙ ПОРТАЛ С ЗОЛОТОЙ РАМОЙ
        this.ctx.fillStyle = "#1e1007";
        this.ctx.fillRect(b.doorX - 18, b.doorY - 42, 36, 42);
        this.ctx.strokeStyle = "#d4af37";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(b.doorX - 18, b.doorY - 42, 36, 42);

        // Название здания
        this.ctx.font = "bold 15px 'Cinzel', serif";
        this.ctx.fillStyle = "#fff2b3";
        this.ctx.textAlign = "center";
        this.ctx.shadowColor = "#000";
        this.ctx.shadowBlur = 6;
        this.ctx.fillText(b.name, b.x + b.width / 2, b.y + 18);
        this.ctx.shadowBlur = 0;
    }

    // ИНТЕРЬЕРЫ ЗДАНИЙ (Сочный уют)
    drawDetailedInterior(interiorId, player) {
        const interior = gameWorld.interiors[interiorId];
        if (!interior) return;

        // Половицы
        this.ctx.fillStyle = "#422a18";
        this.ctx.fillRect(0, 0, interior.width, interior.height);

        this.ctx.strokeStyle = "#26170d";
        this.ctx.lineWidth = 3;
        for (let py = 24; py < interior.height; py += 24) {
            this.ctx.beginPath();
            this.ctx.moveTo(20, py);
            this.ctx.lineTo(interior.width - 20, py);
            this.ctx.stroke();
        }

        // Ковёр по центру для храма / усадьбы
        if (interiorId === "church_interior" || interiorId === "manor_interior") {
            this.ctx.fillStyle = "#8b1a1a";
            this.ctx.fillRect(interior.width / 2 - 40, 60, 80, interior.height - 120);
            this.ctx.strokeStyle = "#ffd700";
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(interior.width / 2 - 40, 60, 80, interior.height - 120);
        }

        // Стены
        this.ctx.fillStyle = "#1f1208";
        this.ctx.fillRect(0, 0, interior.width, 35);
        this.ctx.fillRect(0, 0, 20, interior.height);
        this.ctx.fillRect(interior.width - 20, 0, 20, interior.height);
        this.ctx.fillRect(0, interior.height - 20, interior.width, 20);

        this.ctx.strokeStyle = "#0d0603";
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(0, 0, interior.width, interior.height);

        // Название
        this.ctx.font = "bold 17px 'Cinzel', serif";
        this.ctx.fillStyle = "#ffd700";
        this.ctx.textAlign = "center";
        this.ctx.fillText(interior.name, interior.width / 2, 24);

        // Объекты
        for (let obj of interior.objects) {
            this.ctx.font = "36px sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.fillText(obj.icon, obj.x, obj.y);

            this.ctx.font = "13px 'Cormorant Garamond', serif";
            this.ctx.fillStyle = "#fff0c9";
            this.ctx.fillText(obj.name, obj.x, obj.y - 28);
        }

        player.draw(this.ctx);

        // Теплый уютный свет в комнате
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

    drawDecoration(dec) {
        if (dec.type === "tree") {
            this.ctx.fillStyle = "rgba(8, 4, 0, 0.4)";
            this.ctx.beginPath();
            this.ctx.ellipse(dec.x, dec.y, dec.size * 0.9, dec.size * 0.35, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Ствол
            this.ctx.fillStyle = "#382313";
            this.ctx.fillRect(dec.x - 8, dec.y - 35, 16, 35);
            this.ctx.strokeStyle = "#120a04";
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(dec.x - 8, dec.y - 35, 16, 35);

            // Пышные кроны с сочной обводкой
            const wind = Math.sin(this.timeTick + dec.x) * 2;

            this.ctx.fillStyle = "#274218";
            this.ctx.beginPath();
            this.ctx.arc(dec.x - 12 + wind, dec.y - 50, dec.size * 0.7, 0, Math.PI * 2);
            this.ctx.arc(dec.x + 12 + wind, dec.y - 50, dec.size * 0.7, 0, Math.PI * 2);
            this.ctx.arc(dec.x + wind, dec.y - 65, dec.size * 0.85, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Блик светлых листьев
            this.ctx.fillStyle = "#3d6324";
            this.ctx.beginPath();
            this.ctx.arc(dec.x + wind, dec.y - 70, dec.size * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (dec.type === "fence") {
            this.ctx.fillStyle = "#4a3321";
            this.ctx.fillRect(dec.x, dec.y, dec.width, 10);
            this.ctx.strokeStyle = "#1a0f08";
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(dec.x, dec.y, dec.width, 10);
        } else if (dec.type === "cart") {
            this.ctx.font = "32px sans-serif";
            this.ctx.fillText("🛒", dec.x, dec.y);
        } else if (dec.type === "grave") {
            this.ctx.font = "26px sans-serif";
            this.ctx.fillText("🪦", dec.x, dec.y);
        }
    }

    drawInteractiveObject(obj) {
        this.ctx.font = "34px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText(obj.icon, obj.x, obj.y);

        if (obj.id === "cossack_fire" && Math.random() < 0.6) {
            this.particles.push({
                x: obj.x + (Math.random() * 20 - 10),
                y: obj.y - 14,
                vx: Math.random() * 1.6 - 0.8,
                vy: -Math.random() * 2.5 - 1.2,
                size: 3,
                life: 1.0,
                color: Math.random() < 0.5 ? "#ffaa00" : "#ff3300"
            });
        }
    }

    updateAndDrawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size || 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }
    }

    drawAtmosphericLighting() {
        const lighting = timeManager.getAmbientLighting();
        if (lighting.alpha <= 0.01) return;

        this.ctx.save();
        this.ctx.fillStyle = lighting.color;
        this.ctx.globalAlpha = lighting.alpha;
        this.ctx.fillRect(0, 0, gameWorld.width, gameWorld.height);

        this.ctx.globalCompositeOperation = 'destination-out';

        for (let light of gameWorld.lightSources) {
            let rad = light.radius;
            if (light.isFlickering) rad += (Math.random() * 14 - 7);

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
