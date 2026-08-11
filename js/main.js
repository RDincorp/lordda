/* ==========================================================================
   MAIN.JS — Главный игровой цикл, обработка ввода и связи с UI
   ========================================================================== */

class Game {
    constructor() {
        this.renderer = new GameRenderer('gameCanvas');
        this.player = new Player(200, 300); // Спавн у Плебании

        // Создаем NPC
        this.npcs = [
            new NPC({
                id: "pan_janusz",
                name: "Пан Януш",
                title: "Шляхтич и меценат",
                portrait: "👑",
                x: 1350, y: 390,
                color: "#8b261d",
                schedule: [
                    { startHour: 8, endHour: 18, targetX: 1350, targetY: 390 }, // В усадьбе
                    { startHour: 18, endHour: 22, targetX: 880, targetY: 660 }   // В корчме
                ]
            }),
            new NPC({
                id: "yankel",
                name: "Янкель-шинкарь",
                title: "Владелец корчмы",
                portrait: "🧔",
                x: 870, y: 640,
                color: "#2e5436"
            }),
            new NPC({
                id: "cossack_grom",
                name: "Атаман Гром",
                title: "Казачий атаман",
                portrait: "⚔️",
                x: 1120, y: 920,
                color: "#2a3d66"
            }),
            new NPC({
                id: "hanna",
                name: "Ганна",
                title: "Крестьянка",
                portrait: "👵",
                x: 480, y: 390,
                color: "#6b593f"
            })
        ];

        this.questEngine = new QuestEngine();
        this.reputation = { ...CONFIG.INITIAL_REPUTATION };

        // Состояние ввода
        this.keys = {};
        this.lastTime = performance.now();

        // Текущий подсвеченный объект для взаимодействия
        this.currentInteractable = null;

        this.initInput();
        this.initUI();
        this.updateReputationUI();

        this.addNotification("Добро пожаловать в Покровскую Весь, отец Стефан!");

        // Запуск игрового цикла
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // ИНИЦИАЛИЗА ВВОДА КЛАВИАТУРЫ
    initInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Горячие клавиши UI
            if (e.code === 'KeyE' || e.code === 'Space') {
                this.handleInteraction();
            } else if (e.code === 'KeyJ') {
                this.toggleModal('journalModal');
                this.renderJournal();
            } else if (e.code === 'KeyI') {
                this.toggleModal('inventoryModal');
                this.renderInventory();
            } else if (e.code === 'KeyM') {
                this.toggleModal('registerModal');
                this.renderRegister();
            } else if (e.code === 'Escape') {
                this.closeAllModals();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    // ИНИЦИАЛИЗА КНОПОК UI
    initUI() {
        document.getElementById('speedToggleBtn')?.addEventListener('click', () => {
            const spd = timeManager.toggleSpeed();
            document.getElementById('speedToggleBtn').innerText = `${spd}x ⏱️`;
        });

        document.getElementById('journalBtn')?.addEventListener('click', () => {
            this.toggleModal('journalModal');
            this.renderJournal();
        });

        document.getElementById('inventoryBtn')?.addEventListener('click', () => {
            this.toggleModal('inventoryModal');
            this.renderInventory();
        });

        document.getElementById('registerBtn')?.addEventListener('click', () => {
            this.toggleModal('registerModal');
            this.renderRegister();
        });

        document.getElementById('helpBtn')?.addEventListener('click', () => {
            this.toggleModal('helpModal');
        });

        document.getElementById('audioToggleBtn')?.addEventListener('click', () => {
            const isMuted = audioEngine.toggleMute();
            document.getElementById('audioToggleBtn').innerText = isMuted ? "🔇" : "🔊";
        });

        // Кнопки закрытия модальных окон
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
    }

    // ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ (GAME LOOP)
    gameLoop(currentTime) {
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        // 1. Обновление времени
        timeManager.update(deltaTime);

        // 2. Обновление игрока и NPC
        this.player.update(deltaTime, this.keys);
        for (let npc of this.npcs) {
            npc.update(deltaTime, timeManager.gameHours);
        }

        // 3. Обновление камеры
        this.renderer.updateCamera(this.player);

        // 4. Проверка объектов рядом с игроком
        this.checkNearbyInteractions();

        // 5. Рендеринг кадра
        this.renderer.render(this.player, this.npcs);

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // ПРОВЕРКА БЛИЖАЙШИХ ОБЪЕКТОВ / NPC ДЛЯ ВЗАИМОДЕЙСТВИЯ
    checkNearbyInteractions() {
        const promptEl = document.getElementById('interactionPrompt');
        const textEl = document.getElementById('interactionText');

        // Проверка NPC
        let nearestNPC = null;
        let minDist = 65;

        for (let npc of this.npcs) {
            const dist = Math.hypot(npc.x - this.player.x, npc.y - this.player.y);
            if (dist < minDist) {
                minDist = dist;
                nearestNPC = npc;
            }
        }

        if (nearestNPC) {
            this.currentInteractable = { type: 'npc', data: nearestNPC };
            textEl.innerText = `Поговорить с ${nearestNPC.name}`;
            promptEl.classList.remove('hidden');
            return;
        }

        // Проверка объектов мира
        const nearestObj = gameWorld.getNearestInteractable(this.player.x, this.player.y);
        if (nearestObj) {
            this.currentInteractable = { type: 'object', data: nearestObj };
            textEl.innerText = nearestObj.actionText;
            promptEl.classList.remove('hidden');
            return;
        }

        this.currentInteractable = null;
        promptEl.classList.add('hidden');
    }

    // НАЖАТИЕ КЛАВИШИ ВЗАИМОДЕЙСТВИЯ (E)
    handleInteraction() {
        if (!this.currentInteractable) return;

        if (this.currentInteractable.type === 'npc') {
            const npc = this.currentInteractable.data;
            const dialogueData = DIALOGUES[npc.id];
            if (dialogueData) {
                this.openDialogue(dialogueData);
            }
        } else if (this.currentInteractable.type === 'object') {
            const obj = this.currentInteractable.data;

            // Обработка особых объектов
            if (obj.id === "desk_parsonage") {
                this.toggleModal('registerModal');
                this.renderRegister();
            } else if (obj.id === "bell_tower") {
                audioEngine.playChurchBell(200);
                this.questEngine.completeStep("q1_liturgy", "s2");
                this.addNotification("Звон колокола разносится по всей Покровской Веси!");
            } else if (obj.id === "candles_church") {
                this.questEngine.completeStep("q1_liturgy", "s1");
                this.addNotification("Вы зажгли свечи у клироса и алтаря.");
            } else {
                this.openInspect(obj.name, obj.description);
            }
        }
    }

    // ОТКРЫТИЕ ДИАЛОГА
    openDialogue(dialogueData) {
        document.getElementById('npcPortrait').innerText = dialogueData.portrait;
        document.getElementById('npcName').innerText = dialogueData.npcName;
        document.getElementById('npcTitle').innerText = dialogueData.title;
        document.getElementById('dialogueText').innerText = dialogueData.text;

        const choicesEl = document.getElementById('dialogueChoices');
        choicesEl.innerHTML = '';

        dialogueData.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerText = choice.text;
            btn.onclick = () => choice.action(this);
            choicesEl.appendChild(btn);
        });

        document.getElementById('dialogueModal').classList.remove('hidden');
    }

    openDialogueText(text) {
        document.getElementById('dialogueText').innerText = text;
        document.getElementById('dialogueChoices').innerHTML = '<button class="choice-btn" onclick="mainGame.closeDialogue()">Продолжить</button>';
    }

    closeDialogue() {
        document.getElementById('dialogueModal').classList.add('hidden');
    }

    // ИНСПЕКТИРОВАНИЕ ОБЪЕКТА
    openInspect(title, bodyText) {
        document.getElementById('inspectTitle').innerText = title;
        document.getElementById('inspectBody').innerText = bodyText;
        document.getElementById('inspectModal').classList.remove('hidden');
    }

    // УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ
    toggleModal(modalId) {
        audioEngine.playPageTurn();
        const el = document.getElementById(modalId);
        if (el.classList.contains('hidden')) {
            this.closeAllModals();
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }

    // РЕНДЕР КВЕСТОВ
    renderJournal() {
        const listEl = document.getElementById('questList');
        const detailsEl = document.getElementById('questDetails');
        listEl.innerHTML = '';

        this.questEngine.quests.forEach(q => {
            const btn = document.createElement('button');
            btn.className = `quest-item-btn ${q.status === 'completed' ? 'completed' : ''}`;
            btn.innerText = `${q.status === 'completed' ? '✅' : '📜'} ${q.title}`;
            btn.onclick = () => {
                let stepsHtml = q.steps.map(s => `<li>${s.done ? '✅' : '◽'} ${s.text}</li>`).join('');
                detailsEl.innerHTML = `
                    <h3>${q.title}</h3>
                    <p><em>${q.description}</em></p>
                    <hr>
                    <h4>Задачи:</h4>
                    <ul>${stepsHtml}</ul>
                `;
            };
            listEl.appendChild(btn);
        });
    }

    // РЕНДЕР ИНВЕНТАРЯ
    renderInventory() {
        const gridEl = document.getElementById('inventoryGrid');
        const descEl = document.getElementById('itemDescription');
        gridEl.innerHTML = '';

        this.questEngine.inventory.forEach(item => {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.innerText = item.icon;
            slot.onclick = () => {
                descEl.innerHTML = `<strong>${item.name}</strong><p>${item.desc}</p>`;
            };
            gridEl.appendChild(slot);
        });
    }

    // РЕНДЕР МЕТРИК
    renderRegister() {
        const bodyEl = document.getElementById('registerTableBody');
        bodyEl.innerHTML = '';

        this.questEngine.registerRecords.forEach(rec => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${rec.date}</td>
                <td><strong>${rec.name}</strong></td>
                <td>${rec.status}</td>
                <td>${rec.event}</td>
                <td>${rec.note}</td>
            `;
            bodyEl.appendChild(tr);
        });
    }

    // УВЕДОМЛЕНИЯ
    addNotification(text) {
        const area = document.getElementById('notificationArea');
        const notice = document.createElement('div');
        notice.className = 'toast-notice';
        notice.innerText = text;
        area.appendChild(notice);

        setTimeout(() => notice.remove(), 4000);
    }

    // ОБНОВЛЕНИЕ РЕПУТАЦИИ
    addReputation(delta) {
        for (let k in delta) {
            if (this.reputation[k] !== undefined) {
                this.reputation[k] = Math.max(0, Math.min(100, this.reputation[k] + delta[k]));
            }
        }
        this.updateReputationUI();
    }

    updateReputationUI() {
        document.getElementById('repSzlachta').innerText = this.reputation.szlachta;
        document.getElementById('repPeasants').innerText = this.reputation.peasants;
        document.getElementById('repChurch').innerText = this.reputation.church;
        document.getElementById('repCossacks').innerText = this.reputation.cossacks;
    }
}

// Запуск игры при загрузке страницы
window.addEventListener('load', () => {
    window.mainGame = new Game();
});
