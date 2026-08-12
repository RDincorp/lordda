/* ==========================================================================
   RENDERER.JS — Процедурный движок графики (Уровень Cult of the Lamb / Factorio)
   ========================================================================== */

class GameRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
        this.particles = []; // Старые частицы (дым)
        this.weatherParticles = []; // Новые частицы погоды
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
        if (!timeManager.weather) timeManager.generateWeather();

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

            // 1.5 Генерация погодных частиц
            this.generateWeatherParticles();

            // 2. Y-сортировка всех элементов мира
            const renderQueue = [];

            // Здания
            for (let b of gameWorld.buildings) {
                renderQueue.push({
                    y: b.y + b.height - 5,
                    draw: () => this.drawCultStyleBuilding(b),
                    drawShadow: () => this.drawDynamicShadow(b.x, b.y + b.height, b.width, 30, true)
                });
            }

            // Интерактивные объекты
            for (let obj of gameWorld.interactiveObjects) {
                renderQueue.push({
                    y: obj.y,
                    draw: () => this.drawInteractiveObject(obj),
                    drawShadow: () => this.drawDynamicShadow(obj.x - 15, obj.y, 30, 20, false)
                });
            }

            // Игрок
            renderQueue.push({
                y: player.y,
                draw: () => player.draw(this.ctx),
                drawShadow: () => this.drawDynamicShadow(player.x - 10, player.y + 10, 20, 25, false)
            });

            // NPC
            for (let npc of npcs) {
                renderQueue.push({
                    y: npc.y,
                    draw: () => npc.draw(this.ctx),
                    drawShadow: () => this.drawDynamicShadow(npc.x - 10, npc.y + 10, 20, 25, false)
                });
            }

            // Декорации
            for (let dec of gameWorld.decorations) {
                renderQueue.push({
                    y: dec.y,
                    draw: () => this.drawDecoration(dec),
                    drawShadow: () => {
                        if (dec.type === "tree") this.drawDynamicShadow(dec.x - dec.size*0.7, dec.y, dec.size*1.4, dec.size*1.5, true);
                        else if (dec.type === "fence") this.drawDynamicShadow(dec.x, dec.y, dec.width, 10, false);
                    }
                });
            }

            // Пёс Барбос
            if (window.mainGame && window.mainGame.dog) {
                const dog = window.mainGame.dog;
                renderQueue.push({
                    y: dog.y,
                    draw: () => dog.draw(this.ctx),
                    drawShadow: () => this.drawDynamicShadow(dog.x - 10, dog.y + 5, 20, 10, false)
                });
            }

            // --- ОТРИСОВКА ДИНАМИЧЕСКИХ ТЕНЕЙ (Под всеми объектами) ---
            if (timeManager.sunIntensity > 0.05) {
                this.ctx.save();
                this.ctx.fillStyle = `rgba(0, 0, 0, ${timeManager.sunIntensity * 0.45})`;
                for (let item of renderQueue) {
                    if (item.drawShadow) item.drawShadow();
                }
                this.ctx.restore();
            }

            // --- ОСНОВНАЯ ОТРИСОВКА ОБЪЕКТОВ ---
            renderQueue.sort((a, b) => a.y - b.y);

            for (let item of renderQueue) {
                item.draw();
            }

            // 3. Атмосферные частицы (дым из труб, пыльцы, искорки)
            this.updateAndDrawParticles();

            // 3.5 Погодные частицы (дождь, листья, туман, светлячки)
            this.updateAndDrawWeatherParticles();

            // Стая птиц в небе над куполами
            if (window.mainGame && window.mainGame.birds) {
                window.mainGame.birds.draw(this.ctx);
            }

            // 4. Объемное суточное освещение и световые лучи (Bloom & God Rays)
            this.drawAtmosphericLighting();

        } else {
            // Интерьер комнаты
            this.drawDetailedInterior(gameWorld.currentLocation, player);
        }

        this.ctx.restore();

        // 5. ПОСТОБРАБОТКА (Виньетка)
        this.drawVignette();
    }

    drawDynamicShadow(x, y, width, height, isTall) {
        const angle = timeManager.sunAngle || 0;
        const lengthMultiplier = (1.5 - timeManager.sunIntensity) * 1.5; // Тени длиннее на рассвете/закате
        
        let shadowLen = height * lengthMultiplier;
        if (!isTall) shadowLen *= 0.5;

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + width, y);
        this.ctx.lineTo(x + width + Math.sin(angle) * shadowLen, y + Math.cos(angle) * shadowLen);
        this.ctx.lineTo(x + Math.sin(angle) * shadowLen, y + Math.cos(angle) * shadowLen);
        this.ctx.fill();
    }

    drawVignette() {
        const grad = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.4,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.height
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.6)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
        // Отражение неба в воде
        const isNight = timeManager.gameHours < 5 || timeManager.gameHours >= 19;
        this.ctx.fillStyle = isNight ? "#142b42" : (timeManager.gameHours > 16 && timeManager.gameHours < 19 ? "#6b3f2e" : "#224766");
        
        this.ctx.beginPath();
        this.ctx.arc(1600, 1000, 260 + waveOffset, 0, Math.PI * 2);
        this.ctx.fill();

        // Пена у берега (контур)
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(1600, 1000, 264 + waveOffset, Math.PI, Math.PI * 1.5);
        this.ctx.stroke();

        // Блики на воде и рябь
        this.ctx.fillStyle = "rgba(200, 230, 255, 0.25)";
        for (let i = 0; i < 12; i++) {
            const wx = 1420 + i * 20 + Math.sin(this.timeTick * 2 + i) * 15;
            const wy = 880 + i * 18;
            this.ctx.fillRect(wx, wy, 35 + Math.random() * 20, 3);
        }
    }

    // РЕНДЕРИНГ УНИКАЛЬНЫХ ЗДАНИЙ В СТИЛЕ CULT OF THE LAMB / FACTORIO
    drawCultStyleBuilding(b) {
        if (b.type === "wooden_church" || b.id === "church") {
            this.drawChurch(b);
        } else if (b.type === "estate" || b.id === "manor") {
            this.drawManor(b);
        } else if (b.type === "tavern" || b.id === "tavern") {
            this.drawTavern(b);
        } else if (b.id && b.id.startsWith("peasant_hut")) {
            this.drawPeasantHut(b);
        } else if (b.id === "parsonage") {
            this.drawParsonage(b);
        } else {
            this.drawDefaultBuilding(b);
        }

        // Название здания над каждым строением
        this.ctx.font = "bold 15px 'Cinzel', serif";
        this.ctx.fillStyle = "#fff2b3";
        this.ctx.textAlign = "center";
        this.ctx.shadowColor = "#000";
        this.ctx.shadowBlur = 6;
        this.ctx.fillText(b.name, b.x + b.width / 2, b.y + 16);
        this.ctx.shadowBlur = 0;
    }

    // 1. ДЕРЕВЯННАЯ УНИАТСКАЯ ЦЕРКОВЬ С 3 КУПОЛАМИ И ПРИТВОРОМ
    drawChurch(b) {
        const isNight = timeManager.gameHours < 6 || timeManager.gameHours >= 20;

        // Каменный высокий цоколь
        this.ctx.fillStyle = "#4a3e35";
        this.ctx.fillRect(b.x - 6, b.y + b.height - 20, b.width + 12, 20);
        this.ctx.strokeStyle = "#1f1811";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(b.x - 6, b.y + b.height - 20, b.width + 12, 20);

        // Основной высотный сруб (Наос)
        this.ctx.fillStyle = "#7a5435";
        this.ctx.fillRect(b.x, b.y + 20, b.width, b.height - 40);
        this.ctx.strokeStyle = "#1a0d06";
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(b.x, b.y + 20, b.width, b.height - 40);

        // Горизонтальные бревна сруба
        this.ctx.strokeStyle = "rgba(20, 10, 5, 0.35)";
        this.ctx.lineWidth = 3;
        for (let ly = b.y + 32; ly < b.y + b.height - 20; ly += 12) {
            this.ctx.beginPath(); this.ctx.moveTo(b.x, ly); this.ctx.lineTo(b.x + b.width, ly); this.ctx.stroke();
        }

        // Центральная восьмигранная башня (Барабан купола)
        const cx = b.x + b.width / 2;
        const cy = b.y - 10;
        this.ctx.fillStyle = "#5c3d22";
        this.ctx.fillRect(cx - 40, cy - 40, 80, 50);
        this.ctx.strokeStyle = "#1a0d06";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(cx - 40, cy - 40, 80, 50);

        // 3 ПОЗОЛОЧЕННЫХ КУПОЛА-ЛУКОВИЦЫС КРЕСТАМИ
        const domes = [
            { x: cx, y: cy - 55, r: 26 },         // Главный центральный купол
            { x: b.x + 40, y: b.y + 10, r: 16 },   // Левый купол
            { x: b.x + b.width - 40, y: b.y + 10, r: 16 } // Правый купол
        ];

        domes.forEach(d => {
            // Купол
            this.ctx.fillStyle = "#ffd700";
            this.ctx.beginPath();
            this.ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "#2b1a00";
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Восьмиконечный золотоносный крест
            this.ctx.strokeStyle = "#ffe600";
            this.ctx.shadowColor = "#ffd700";
            this.ctx.shadowBlur = 12;
            this.ctx.lineWidth = d.r > 20 ? 4 : 3;
            this.ctx.beginPath();
            this.ctx.moveTo(d.x, d.y - d.r - 22);
            this.ctx.lineTo(d.x, d.y - d.r + 4);
            this.ctx.moveTo(d.x - d.r * 0.6, d.y - d.r - 12);
            this.ctx.lineTo(d.x + d.r * 0.6, d.y - d.r - 12);
            this.ctx.moveTo(d.x - d.r * 0.4, d.y - d.r - 4);
            this.ctx.lineTo(d.x + d.r * 0.4, d.y - d.r - 2);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        });

        // Высокие стрельчатые витражные окна
        const winX = [b.x + 35, cx - 15, b.x + b.width - 65];
        winX.forEach(wx => {
            this.ctx.fillStyle = isNight ? "#ffaa00" : "#a2d2ff";
            if (isNight) { this.ctx.shadowColor = "#ffaa00"; this.ctx.shadowBlur = 15; }
            
            this.ctx.beginPath();
            this.ctx.arc(wx + 15, b.y + 50, 15, Math.PI, 0); // Арочный верх
            this.ctx.rect(wx, b.y + 50, 30, 45);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;

            this.ctx.strokeStyle = "#24150a";
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(wx + 15, b.y + 50, 15, Math.PI, 0);
            this.ctx.rect(wx, b.y + 50, 30, 45);
            this.ctx.moveTo(wx + 15, b.y + 35); this.ctx.lineTo(wx + 15, b.y + 95); // Переплет
            this.ctx.moveTo(wx, b.y + 65); this.ctx.lineTo(wx + 30, b.y + 65);
            this.ctx.stroke();
        });

        // Крыльцо с резным резным порталом
        this.ctx.fillStyle = "#2c180b";
        this.ctx.fillRect(b.doorX - 22, b.doorY - 48, 44, 48);
        this.ctx.strokeStyle = "#d4af37";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(b.doorX - 22, b.doorY - 48, 44, 48);

        // Резной навес крыльца
        this.ctx.fillStyle = "#4a2d16";
        this.ctx.beginPath();
        this.ctx.moveTo(b.doorX - 30, b.doorY - 48);
        this.ctx.lineTo(b.doorX, b.doorY - 65);
        this.ctx.lineTo(b.doorX + 30, b.doorY - 48);
        this.ctx.fill();
        this.ctx.stroke();
    }

    // 2. ПАРАДНАЯ ШЛЯХЕТСКАЯ УСАДЬБА ПАНА (Белый камень, колонны, черепица)
    drawManor(b) {
        const isNight = timeManager.gameHours < 6 || timeManager.gameHours >= 20;

        // Белокаменный фасад с рустовкой
        this.ctx.fillStyle = "#e8e3d8";
        this.ctx.fillRect(b.x, b.y + 30, b.width, b.height - 45);
        this.ctx.strokeStyle = "#2b231b";
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(b.x, b.y + 30, b.width, b.height - 45);

        // Рустованные угловые камни
        this.ctx.fillStyle = "#c2baa8";
        for (let ry = b.y + 30; ry < b.y + b.height - 15; ry += 20) {
            this.ctx.fillRect(b.x, ry, 16, 10);
            this.ctx.fillRect(b.x + b.width - 16, ry, 16, 10);
        }

        // Окна 2-го и 1-го этажей
        const winCols = [b.x + 30, b.x + 80, b.x + b.width - 110, b.x + b.width - 60];
        winCols.forEach(wx => {
            // Окно 2 этажа
            this.ctx.fillStyle = isNight ? "#ffd700" : "#8ac9e2";
            this.ctx.fillRect(wx, b.y + 45, 24, 30);
            this.ctx.strokeStyle = "#38291a";
            this.ctx.lineWidth = 2.5;
            this.ctx.strokeRect(wx, b.y + 45, 24, 30);

            // Окно 1 этажа
            this.ctx.fillRect(wx, b.y + 90, 24, 35);
            this.ctx.strokeRect(wx, b.y + 90, 24, 35);
        });

        // Красная черепичная крыша с фронтоном
        this.ctx.fillStyle = "#8b261d";
        this.ctx.beginPath();
        this.ctx.moveTo(b.x - 20, b.y + 30);
        this.ctx.lineTo(b.x + b.width / 2, b.y - 45);
        this.ctx.lineTo(b.x + b.width + 20, b.y + 30);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = "#1c0705";
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        // Белокаменный портик с 4 колоннами
        const cx = b.x + b.width / 2;
        this.ctx.fillStyle = "#f5f0e6";
        this.ctx.fillRect(cx - 50, b.y + 60, 100, b.height - 75);
        this.ctx.strokeRect(cx - 50, b.y + 60, 100, b.height - 75);

        // 4 белые колонны
        this.ctx.fillStyle = "#ffffff";
        this.ctx.strokeStyle = "#665f54";
        this.ctx.lineWidth = 2;
        [-40, -15, 15, 40].forEach(offset => {
            this.ctx.fillRect(cx + offset - 5, b.y + 70, 10, b.height - 85);
            this.ctx.strokeRect(cx + offset - 5, b.y + 70, 10, b.height - 85);
        });

        // Фронтон с гербом Острожских
        this.ctx.fillStyle = "#f5f0e6";
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 60, b.y + 60);
        this.ctx.lineTo(cx, b.y + 20);
        this.ctx.lineTo(cx + 60, b.y + 60);
        this.ctx.fill();
        this.ctx.stroke();

        // Герб (Золотой щит)
        this.ctx.fillStyle = "#d4af37";
        this.ctx.beginPath();
        this.ctx.arc(cx, b.y + 42, 10, 0, Math.PI * 2);
        this.ctx.fill();

        // Парадная двустворчатая дубовая дверь
        this.ctx.fillStyle = "#4a2d18";
        this.ctx.fillRect(b.doorX - 18, b.doorY - 45, 36, 45);
        this.ctx.strokeStyle = "#d4af37";
        this.ctx.lineWidth = 2.5;
        this.ctx.strokeRect(b.doorX - 18, b.doorY - 45, 36, 45);
    }

    // 3. КОРЧМА «ПОД ГОЛУБЕМ» (Фахверк, дубовые ворота, вывеска)
    drawTavern(b) {
        const isNight = timeManager.gameHours < 6 || timeManager.gameHours >= 20;

        // Фасад корчмы из бревен и балок
        this.ctx.fillStyle = "#634327";
        this.ctx.fillRect(b.x, b.y + 25, b.width, b.height - 40);
        this.ctx.strokeStyle = "#1a0d05";
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(b.x, b.y + 25, b.width, b.height - 40);

        // Поперечные фахверковые балки
        this.ctx.strokeStyle = "#2b1608";
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(b.x, b.y + 25); this.ctx.lineTo(b.x + b.width, b.y + b.height - 15);
        this.ctx.moveTo(b.x + b.width, b.y + 25); this.ctx.lineTo(b.x, b.y + b.height - 15);
        this.ctx.stroke();

        // Широкие тёплые окна корчмы
        this.ctx.fillStyle = isNight ? "#ffaa00" : "#94c5d6";
        this.ctx.fillRect(b.x + 25, b.y + 50, 35, 30);
        this.ctx.fillRect(b.x + b.width - 60, b.y + 50, 35, 30);
        this.ctx.strokeStyle = "#1a0d05";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(b.x + 25, b.y + 50, 35, 30);
        this.ctx.strokeRect(b.x + b.width - 60, b.y + 50, 35, 30);

        // Гонтовая массивная крыша
        this.ctx.fillStyle = "#3d2716";
        this.ctx.beginPath();
        this.ctx.moveTo(b.x - 20, b.y + 28);
        this.ctx.lineTo(b.x + b.width / 2, b.y - 35);
        this.ctx.lineTo(b.x + b.width + 20, b.y + 28);
        this.ctx.fill();
        this.ctx.stroke();

        // Двойные дубовые ворота
        this.ctx.fillStyle = "#3a2010";
        this.ctx.fillRect(b.doorX - 22, b.doorY - 45, 44, 45);
        this.ctx.strokeStyle = "#1a0d05";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(b.doorX - 22, b.doorY - 45, 44, 45);

        // ВЫВЕСКА «ПОД ГОЛУБЕМ» (Кованый кронштейн и дощечка)
        const sx = b.x - 10;
        const sy = b.y + 40;
        this.ctx.strokeStyle = "#111";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(sx, sy); this.ctx.lineTo(sx - 25, sy); this.ctx.lineTo(sx - 25, sy + 15);
        this.ctx.stroke();

        // Покачивающаяся дощечка с голубем
        const swing = Math.sin(this.timeTick * 2) * 3;
        this.ctx.save();
        this.ctx.translate(sx - 25, sy + 15);
        this.ctx.rotate(swing * Math.PI / 180);
        this.ctx.fillStyle = "#d4af37";
        this.ctx.fillRect(-15, 0, 30, 20);
        this.ctx.strokeRect(-15, 0, 30, 20);
        this.ctx.fillStyle = "#111";
        this.ctx.font = "12px sans-serif";
        this.ctx.fillText("🕊️", 0, 15);
        this.ctx.restore();

        // Бочка у стены корчмы
        this.ctx.fillStyle = "#5c3a21";
        this.ctx.beginPath(); this.ctx.arc(b.x + 15, b.y + b.height - 10, 12, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.stroke();
    }

    // 4. КРЕСТЬЯНСКИЕ ХАТЫ-МАЗАНКИ (Белёные стены, соломенная крыша)
    drawPeasantHut(b) {
        const isNight = timeManager.gameHours < 6 || timeManager.gameHours >= 20;

        // Белёные известью глиняные стены
        this.ctx.fillStyle = "#ede8da";
        this.ctx.fillRect(b.x, b.y + 20, b.width, b.height - 35);
        this.ctx.strokeStyle = "#383127";
        this.ctx.lineWidth = 3.5;
        this.ctx.strokeRect(b.x, b.y + 20, b.width, b.height - 35);

        // Маленькие квадратные окошки с синими ставнями
        const wx = b.x + 20;
        this.ctx.fillStyle = isNight ? "#ffaa00" : "#7bb3c4";
        this.ctx.fillRect(wx, b.y + 40, 20, 20);
        this.ctx.strokeStyle = "#1f1810";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(wx, b.y + 40, 20, 20);

        // Синие деревянные ставни
        this.ctx.fillStyle = "#2b5278";
        this.ctx.fillRect(wx - 8, b.y + 40, 8, 20);
        this.ctx.fillRect(wx + 20, b.y + 40, 8, 20);

        // Толстая пышная соломенная крыша (Стреха)
        this.ctx.fillStyle = "#c99a40";
        this.ctx.beginPath();
        this.ctx.moveTo(b.x - 18, b.y + 22);
        this.ctx.lineTo(b.x + b.width / 2, b.y - 30);
        this.ctx.lineTo(b.x + b.width + 18, b.y + 22);
        this.ctx.fill();
        this.ctx.strokeStyle = "#2b1c09";
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        // Текстурные соломенные связки
        this.ctx.strokeStyle = "rgba(60, 35, 5, 0.3)";
        this.ctx.lineWidth = 2;
        for (let ix = b.x - 10; ix < b.x + b.width + 10; ix += 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(ix, b.y + 20);
            this.ctx.lineTo(b.x + b.width / 2, b.y - 25);
            this.ctx.stroke();
        }

        // Простая деревянная дверь
        this.ctx.fillStyle = "#5c3a21";
        this.ctx.fillRect(b.doorX - 14, b.doorY - 35, 28, 35);
        this.ctx.strokeStyle = "#1c0d05";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.doorX - 14, b.doorY - 35, 28, 35);
    }

    // 5. ПЛЕБАНИЯСВЯЩЕННИКА (Аккуратный сруб с крыльцом и камином)
    drawParsonage(b) {
        const isNight = timeManager.gameHours < 6 || timeManager.gameHours >= 20;

        // Покрашенный аккуратный сруб
        this.ctx.fillStyle = "#8c5b36";
        this.ctx.fillRect(b.x, b.y + 25, b.width, b.height - 40);
        this.ctx.strokeStyle = "#241308";
        this.ctx.lineWidth = 3.5;
        this.ctx.strokeRect(b.x, b.y + 25, b.width, b.height - 40);

        // Окна с занавесками
        this.ctx.fillStyle = isNight ? "#ffaa00" : "#a2d2ff";
        this.ctx.fillRect(b.x + 25, b.y + 45, 22, 26);
        this.ctx.fillRect(b.x + b.width - 47, b.y + 45, 22, 26);
        this.ctx.strokeStyle = "#1f1006";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.x + 25, b.y + 45, 22, 26);
        this.ctx.strokeRect(b.x + b.width - 47, b.y + 45, 22, 26);

        // Крыша с мхом и каменной трубой
        this.ctx.fillStyle = "#4a2d18";
        this.ctx.beginPath();
        this.ctx.moveTo(b.x - 15, b.y + 28);
        this.ctx.lineTo(b.x + b.width / 2, b.y - 30);
        this.ctx.lineTo(b.x + b.width + 15, b.y + 28);
        this.ctx.fill();
        this.ctx.strokeStyle = "#1a0b03";
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        // Труба
        const tx = b.x + 25;
        const ty = b.y - 20;
        this.ctx.fillStyle = "#5e5246";
        this.ctx.fillRect(tx, ty, 14, 20);
        this.ctx.strokeRect(tx, ty, 14, 20);

        // Дым
        if (Math.random() < 0.4) {
            this.particles.push({
                x: tx + 7, y: ty - 4,
                vx: Math.random() * 0.4 - 0.2, vy: -Math.random() * 1.5 - 0.8,
                size: 5 + Math.random() * 5, life: 1.0, color: "rgba(220, 210, 200, 0.4)"
            });
        }

        // Крыльцо с резным крестиком
        this.ctx.fillStyle = "#3d2212";
        this.ctx.fillRect(b.doorX - 16, b.doorY - 38, 32, 38);
        this.ctx.strokeStyle = "#d4af37";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.doorX - 16, b.doorY - 38, 32, 38);
    }

    drawDefaultBuilding(b) {
        this.ctx.fillStyle = b.color || "#6b4a2d";
        this.ctx.fillRect(b.x, b.y + 20, b.width, b.height - 35);
        this.ctx.strokeStyle = "#1a0a02";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(b.x, b.y + 20, b.width, b.height - 35);
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
            this.drawHandDrawnAsset(obj.id, obj.x, obj.y);

            this.ctx.font = "13px 'Cormorant Garamond', serif";
            this.ctx.fillStyle = "#fff0c9";
            this.ctx.textAlign = "center";
            this.ctx.fillText(obj.name, obj.x, obj.y - 50);
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
            // Тень от дерева теперь рисуется в drawDynamicShadow

            // Ствол
            this.ctx.fillStyle = "#382313";
            this.ctx.fillRect(dec.x - 8, dec.y - 35, 16, 35);
            this.ctx.strokeStyle = "#120a04";
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(dec.x - 8, dec.y - 35, 16, 35);

            // Пышные кроны с сочной обводкой и анимацией ветра
            const wind = Math.sin(this.timeTick * timeManager.windStrength + dec.x * 0.1) * 4 * timeManager.windStrength;

            // Нижний ярус листвы (Темный)
            this.ctx.fillStyle = "#1e3312";
            this.ctx.beginPath();
            this.ctx.arc(dec.x - 15 + wind*0.5, dec.y - 40, dec.size * 0.75, 0, Math.PI * 2);
            this.ctx.arc(dec.x + 15 + wind*0.5, dec.y - 40, dec.size * 0.75, 0, Math.PI * 2);
            this.ctx.fill();

            // Средний ярус (Основной цвет)
            this.ctx.fillStyle = "#274218";
            this.ctx.beginPath();
            this.ctx.arc(dec.x - 12 + wind, dec.y - 50, dec.size * 0.7, 0, Math.PI * 2);
            this.ctx.arc(dec.x + 12 + wind, dec.y - 50, dec.size * 0.7, 0, Math.PI * 2);
            this.ctx.arc(dec.x + wind*1.2, dec.y - 65, dec.size * 0.85, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Верхний бликовый ярус (Светлый)
            this.ctx.fillStyle = "#3d6324";
            this.ctx.beginPath();
            this.ctx.arc(dec.x + wind*1.5, dec.y - 70, dec.size * 0.4, 0, Math.PI * 2);
            this.ctx.fill();

            // Шанс сбросить листок на ветру
            if (timeManager.windStrength > 1.0 && Math.random() < 0.02 * timeManager.windStrength) {
                this.weatherParticles.push({
                    type: "leaf",
                    x: dec.x + (Math.random() * 40 - 20) + wind,
                    y: dec.y - 50 + (Math.random() * 30 - 15),
                    vx: timeManager.windStrength * (Math.random() + 0.5),
                    vy: Math.random() * 1.5 + 0.5,
                    size: Math.random() * 3 + 2,
                    life: 1.0,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.2
                });
            }
        } else if (dec.type === "fence") {
            this.ctx.fillStyle = "#4a3321";
            this.ctx.fillRect(dec.x, dec.y, dec.width, 10);
            this.ctx.strokeStyle = "#1a0f08";
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(dec.x, dec.y, dec.width, 10);
        } else if (dec.type === "cart" || dec.type === "grave") {
            this.drawHandDrawnAsset(dec.type, dec.x, dec.y);
        }
    }

    drawInteractiveObject(obj) {
        this.drawHandDrawnAsset(obj.id, obj.x, obj.y);

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

    generateWeatherParticles() {
        const w = timeManager.weather;
        const cx = this.camera.x;
        const cy = this.camera.y;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // Генерация дождя
        if (w === "rain" && Math.random() < 0.6) {
            for (let i = 0; i < 4; i++) {
                this.weatherParticles.push({
                    type: "rain",
                    x: cx + Math.random() * cw * 1.5 - cw * 0.25,
                    y: cy - 20,
                    vx: timeManager.windStrength * 2,
                    vy: 12 + Math.random() * 5,
                    life: 1.0,
                    targetY: cy + Math.random() * ch // Точка удара о землю
                });
            }
        }

        // Генерация светлячков ночью
        const isNight = timeManager.gameHours < 4 || timeManager.gameHours >= 21;
        if (w === "clear" && isNight && Math.random() < 0.05) {
            this.weatherParticles.push({
                type: "firefly",
                x: cx + Math.random() * cw,
                y: cy + ch - Math.random() * 150, // Вблизи земли/травы
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: 1.0,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    updateAndDrawWeatherParticles() {
        const w = timeManager.weather;

        // Отрисовка тумана
        if (w === "fog") {
            const fogOffset1 = Math.sin(this.timeTick * 0.2) * 50;
            const fogOffset2 = Math.cos(this.timeTick * 0.15) * 60;
            
            this.ctx.fillStyle = "rgba(220, 230, 240, 0.15)";
            this.ctx.beginPath();
            this.ctx.arc(this.camera.x + this.canvas.width/2 + fogOffset1, this.camera.y + this.canvas.height/2, this.canvas.width, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(this.camera.x + this.canvas.width/3 + fogOffset2, this.camera.y + this.canvas.height/3, this.canvas.height, 0, Math.PI*2);
            this.ctx.fill();
        }

        for (let i = this.weatherParticles.length - 1; i >= 0; i--) {
            let p = this.weatherParticles[i];
            
            if (p.type === "leaf") {
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotSpeed;
                p.life -= 0.005;

                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.rotation);
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = "#3d6324";
                this.ctx.beginPath(); this.ctx.ellipse(0, 0, p.size, p.size*0.5, 0, 0, Math.PI*2); this.ctx.fill();
                this.ctx.restore();

            } else if (p.type === "rain") {
                p.x += p.vx;
                p.y += p.vy;

                if (p.y >= p.targetY) {
                    // Всплеск
                    this.ctx.strokeStyle = "rgba(150, 200, 255, 0.4)";
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath(); this.ctx.ellipse(p.x, p.y, 6, 2, 0, 0, Math.PI*2); this.ctx.stroke();
                    p.life = 0;
                } else {
                    // Капля
                    this.ctx.strokeStyle = "rgba(180, 210, 240, 0.6)";
                    this.ctx.lineWidth = 1.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p.x - p.vx, p.y - p.vy);
                    this.ctx.stroke();
                }

            } else if (p.type === "firefly") {
                p.x += p.vx + Math.sin(this.timeTick + p.phase) * 0.5;
                p.y += p.vy + Math.cos(this.timeTick + p.phase) * 0.3;
                p.life -= 0.002;
                
                const glow = Math.abs(Math.sin(this.timeTick * 3 + p.phase));

                this.ctx.fillStyle = `rgba(180, 255, 50, ${glow * p.life})`;
                this.ctx.shadowColor = "#ccff00";
                this.ctx.shadowBlur = 8 * glow;
                this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 1.5, 0, Math.PI*2); this.ctx.fill();
                this.ctx.shadowBlur = 0;
            } else if (p.type === "dust") {
                p.x += p.vx;
                p.y += p.vy;
                p.size += 0.1;
                p.life -= 0.03;

                this.ctx.fillStyle = `rgba(130, 100, 70, ${p.life * 0.5})`;
                this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); this.ctx.fill();
            }

            if (p.life <= 0) {
                this.weatherParticles.splice(i, 1);
            }
        }
    }

    drawHandDrawnAsset(id, x, y) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.shadowBlur = 0; // Сбрасываем тени
        
        switch(id) {
            case "altar":
                // Иконостас (Дерево, золото)
                this.ctx.fillStyle = "#5c3a21";
                this.ctx.fillRect(-30, -40, 60, 40);
                this.ctx.strokeStyle = "#d4af37";
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(-25, -35, 20, 30);
                this.ctx.strokeRect(5, -35, 20, 30);
                this.ctx.fillStyle = "#8a6642";
                this.ctx.beginPath(); this.ctx.arc(0, -40, 15, Math.PI, 0); this.ctx.fill();
                break;
            case "candles_church":
                // Подсвечник
                this.ctx.fillStyle = "#d4af37"; // Латунь
                this.ctx.fillRect(-2, -10, 4, 10);
                this.ctx.fillRect(-15, -15, 30, 5);
                this.ctx.fillStyle = "#fffdd0"; // Воск
                for(let i=-10; i<=10; i+=10) {
                    this.ctx.fillRect(i-2, -25, 4, 10);
                    // Огонек
                    this.ctx.fillStyle = "#ffaa00";
                    this.ctx.beginPath(); this.ctx.arc(i, -28, 2+Math.random(), 0, Math.PI*2); this.ctx.fill();
                }
                break;
            case "confessional":
                // Исповедальня
                this.ctx.fillStyle = "#4a2f1d";
                this.ctx.fillRect(-20, -45, 40, 45);
                this.ctx.fillStyle = "#2c1c11";
                this.ctx.fillRect(-5, -25, 10, 20); // Окошко
                this.ctx.strokeStyle = "#5c3a21";
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(-5, -15); this.ctx.lineTo(5, -15);
                this.ctx.moveTo(0, -25); this.ctx.lineTo(0, -5);
                this.ctx.stroke();
                break;
            case "church_exit":
            case "parsonage_exit":
            case "tavern_exit":
            case "manor_exit":
                // Дверь
                this.ctx.fillStyle = "#5c3e21";
                this.ctx.fillRect(-15, -40, 30, 40);
                this.ctx.strokeStyle = "#38200d";
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(-15, -40, 30, 40);
                this.ctx.fillStyle = "#1a0f08";
                this.ctx.beginPath(); this.ctx.arc(10, -20, 3, 0, Math.PI*2); this.ctx.fill(); // Ручка
                break;
            case "desk_parsonage":
                // Стол и книга
                this.ctx.fillStyle = "#6e4b2a";
                this.ctx.fillRect(-25, -20, 50, 20);
                this.ctx.fillStyle = "#472c15";
                this.ctx.fillRect(-22, 0, 6, 10);
                this.ctx.fillRect(16, 0, 6, 10);
                this.ctx.fillStyle = "#e8d8b7"; // Пергамент
                this.ctx.fillRect(-10, -22, 20, 15);
                this.ctx.fillStyle = "#2b2b2b"; // Текст
                this.ctx.fillRect(-8, -20, 16, 2);
                this.ctx.fillRect(-8, -16, 12, 2);
                this.ctx.fillStyle = "#8b0000"; // Печать
                this.ctx.beginPath(); this.ctx.arc(8, -10, 3, 0, Math.PI*2); this.ctx.fill();
                break;
            case "parsonage_fireplace":
                // Камин
                this.ctx.fillStyle = "#635443";
                this.ctx.fillRect(-25, -40, 50, 40);
                this.ctx.fillStyle = "#2b1f14";
                this.ctx.beginPath(); this.ctx.arc(0, -10, 15, Math.PI, 0); this.ctx.fill();
                // Огонь
                this.ctx.fillStyle = "#ffaa00";
                this.ctx.beginPath();
                this.ctx.moveTo(0, -25 + Math.random()*5);
                this.ctx.lineTo(8, -10);
                this.ctx.lineTo(-8, -10);
                this.ctx.fill();
                // Котелок
                this.ctx.fillStyle = "#111";
                this.ctx.fillRect(-6, -15, 12, 8);
                break;
            case "parsonage_bed":
                // Кровать
                this.ctx.fillStyle = "#5c3e21";
                this.ctx.fillRect(-20, -10, 40, 20);
                this.ctx.fillStyle = "#e0e0e0"; // Подушка
                this.ctx.fillRect(-18, -8, 12, 16);
                this.ctx.fillStyle = "#7a3131"; // Одеяло
                this.ctx.fillRect(-5, -8, 23, 16);
                break;
            case "tavern_bar":
                // Стойка
                this.ctx.fillStyle = "#4a3321";
                this.ctx.fillRect(-30, -15, 60, 30);
                // Бочки
                this.ctx.fillStyle = "#6b4a2d";
                this.ctx.beginPath(); this.ctx.arc(-15, -20, 10, 0, Math.PI*2); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.arc(15, -20, 10, 0, Math.PI*2); this.ctx.fill();
                this.ctx.strokeStyle = "#24150a";
                this.ctx.strokeRect(-30, -15, 60, 30);
                // Кружка
                this.ctx.fillStyle = "#d4a373";
                this.ctx.fillRect(-3, -12, 6, 8);
                break;
            case "tavern_table":
                // Круглый стол с едой
                this.ctx.fillStyle = "#5c3e21";
                this.ctx.beginPath(); this.ctx.arc(0, 0, 25, 0, Math.PI*2); this.ctx.fill();
                this.ctx.strokeStyle = "#38200d";
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                // Миски
                this.ctx.fillStyle = "#8a8a8a";
                this.ctx.beginPath(); this.ctx.arc(-10, -5, 4, 0, Math.PI*2); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.arc(12, 8, 4, 0, Math.PI*2); this.ctx.fill();
                this.ctx.fillStyle = "#d4a373";
                this.ctx.fillRect(8, -12, 4, 5);
                this.ctx.fillRect(-12, 10, 4, 5);
                break;
            case "manor_throne":
                // Кресло
                this.ctx.fillStyle = "#7a1a1a";
                this.ctx.fillRect(-15, -35, 30, 35);
                this.ctx.fillStyle = "#d4af37";
                this.ctx.fillRect(-18, -35, 3, 20);
                this.ctx.fillRect(15, -35, 3, 20);
                this.ctx.beginPath(); this.ctx.arc(0, -35, 15, Math.PI, 0); this.ctx.fill();
                this.ctx.fillStyle = "#7a1a1a";
                this.ctx.beginPath(); this.ctx.arc(0, -35, 12, Math.PI, 0); this.ctx.fill();
                this.ctx.fillStyle = "#5c3e21";
                this.ctx.fillRect(-18, -15, 36, 15);
                break;
            case "bell_tower":
                // Колокольня
                this.ctx.fillStyle = "#472c15";
                this.ctx.beginPath();
                this.ctx.moveTo(-20, 0); this.ctx.lineTo(-10, -40);
                this.ctx.lineTo(10, -40); this.ctx.lineTo(20, 0);
                this.ctx.fill();
                this.ctx.fillStyle = "#3d2b17";
                this.ctx.beginPath();
                this.ctx.moveTo(-15, -40); this.ctx.lineTo(0, -60); this.ctx.lineTo(15, -40);
                this.ctx.fill();
                this.ctx.fillStyle = "#d4af37"; // Колокол
                this.ctx.beginPath(); this.ctx.arc(0, -30, 8, 0, Math.PI); this.ctx.fill();
                break;
            case "well":
                // Колодец каменный с крышей
                this.ctx.fillStyle = "#635443";
                this.ctx.fillRect(-15, -15, 30, 15);
                this.ctx.fillStyle = "#4a3321";
                this.ctx.fillRect(-18, -45, 4, 30);
                this.ctx.fillRect(14, -45, 4, 30);
                this.ctx.fillStyle = "#3d2b17";
                this.ctx.beginPath();
                this.ctx.moveTo(-22, -45); this.ctx.lineTo(0, -60); this.ctx.lineTo(22, -45);
                this.ctx.fill();
                this.ctx.fillStyle = "#2c1c11"; // Дыра
                this.ctx.fillRect(-12, -15, 24, 5);
                this.ctx.fillStyle = "#777"; // Ведро
                this.ctx.fillRect(-6, -10, 12, 10);
                break;
            case "graveyard_cross":
                // Крест
                this.ctx.fillStyle = "#38200d";
                this.ctx.fillRect(-4, -40, 8, 40);
                this.ctx.fillRect(-15, -25, 30, 6);
                this.ctx.save();
                this.ctx.translate(0, -10);
                this.ctx.rotate(-Math.PI/8);
                this.ctx.fillRect(-10, -2, 20, 4);
                this.ctx.restore();
                break;
            case "market_stall":
                // Прилавок
                this.ctx.fillStyle = "#6e4b2a";
                this.ctx.fillRect(-25, -20, 50, 20);
                this.ctx.fillStyle = "#4a3321";
                this.ctx.fillRect(-22, 0, 4, 15);
                this.ctx.fillRect(18, 0, 4, 15);
                this.ctx.fillRect(-22, -45, 4, 25);
                this.ctx.fillRect(18, -45, 4, 25);
                // Навес
                this.ctx.fillStyle = "#b33939"; // Красный
                this.ctx.fillRect(-25, -50, 17, 15);
                this.ctx.fillStyle = "#e0e0e0"; // Белый
                this.ctx.fillRect(-8, -50, 16, 15);
                this.ctx.fillStyle = "#b33939";
                this.ctx.fillRect(8, -50, 17, 15);
                // Товары
                this.ctx.fillStyle = "#d4af37";
                this.ctx.beginPath(); this.ctx.arc(-10, -25, 6, 0, Math.PI*2); this.ctx.fill();
                this.ctx.fillStyle = "#e8d8b7";
                this.ctx.fillRect(5, -28, 10, 8);
                break;
            case "cossack_fire":
                // Костер
                this.ctx.fillStyle = "#2c1c11"; // Дрова
                this.ctx.fillRect(-15, -5, 30, 5);
                this.ctx.fillStyle = "#4a2f1d";
                this.ctx.save(); this.ctx.rotate(Math.PI/6); this.ctx.fillRect(-10, -5, 20, 5); this.ctx.restore();
                this.ctx.save(); this.ctx.rotate(-Math.PI/6); this.ctx.fillRect(-10, -5, 20, 5); this.ctx.restore();
                // Пламя
                this.ctx.fillStyle = "#ff5500";
                this.ctx.beginPath(); this.ctx.moveTo(-12, -2); this.ctx.lineTo(0, -25 + Math.random()*5); this.ctx.lineTo(12, -2); this.ctx.fill();
                this.ctx.fillStyle = "#ffaa00";
                this.ctx.beginPath(); this.ctx.moveTo(-6, -2); this.ctx.lineTo(0, -15 + Math.random()*5); this.ctx.lineTo(6, -2); this.ctx.fill();
                break;
            case "pier_boat":
                // Лодка
                this.ctx.fillStyle = "#5c3e21";
                this.ctx.beginPath();
                this.ctx.moveTo(-25, -10); this.ctx.lineTo(25, -10);
                this.ctx.lineTo(15, 10); this.ctx.lineTo(-15, 10);
                this.ctx.fill();
                this.ctx.fillStyle = "#38200d";
                this.ctx.fillRect(-10, -5, 20, 2); // Скамейка
                // Весло
                this.ctx.save(); this.ctx.rotate(Math.PI/6);
                this.ctx.fillStyle = "#8a6642";
                this.ctx.fillRect(-20, -2, 40, 3);
                this.ctx.fillRect(-22, -4, 6, 7);
                this.ctx.restore();
                break;
            case "cart":
                // Телега
                this.ctx.fillStyle = "#6e4b2a";
                this.ctx.fillRect(-20, -15, 40, 15);
                this.ctx.strokeStyle = "#38200d";
                this.ctx.beginPath(); this.ctx.arc(-10, 5, 12, 0, Math.PI*2); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.arc(10, 5, 12, 0, Math.PI*2); this.ctx.stroke();
                this.ctx.lineWidth = 2;
                this.ctx.beginPath(); this.ctx.moveTo(-10, -7); this.ctx.lineTo(-10, 17); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.moveTo(-22, 5); this.ctx.lineTo(2, 5); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.moveTo(10, -7); this.ctx.lineTo(10, 17); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.moveTo(-2, 5); this.ctx.lineTo(22, 5); this.ctx.stroke();
                // Сено
                this.ctx.fillStyle = "#d4c853";
                this.ctx.beginPath(); this.ctx.arc(-5, -15, 10, 0, Math.PI*2); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.arc(10, -12, 8, 0, Math.PI*2); this.ctx.fill();
                break;
            case "grave":
                // Могила
                this.ctx.fillStyle = "#707070";
                this.ctx.beginPath(); this.ctx.arc(0, -15, 12, Math.PI, 0); this.ctx.fill();
                this.ctx.fillRect(-12, -15, 24, 15);
                this.ctx.fillStyle = "#4a4a4a"; // Эпитафия
                this.ctx.fillRect(-6, -12, 12, 2);
                this.ctx.fillRect(-8, -8, 16, 2);
                // Земля холмик
                this.ctx.fillStyle = "#4a3321";
                this.ctx.beginPath(); this.ctx.ellipse(0, 5, 18, 6, 0, 0, Math.PI*2); this.ctx.fill();
                break;
            default:
                this.ctx.fillStyle = "#ff00ff";
                this.ctx.beginPath(); this.ctx.arc(0, -10, 10, 0, Math.PI*2); this.ctx.fill();
                break;
        }
        
        this.ctx.restore();
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
