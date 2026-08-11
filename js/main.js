/* ==========================================================================
   MAIN.JS — Главный цикл игры, входы/выходы в здания, интерьеры и механики
   ========================================================================== */

class Game {
    constructor() {
        this.renderer = new GameRenderer('gameCanvas');
        this.player = new Player(190, 410);

        this.npcs = [
            new NPC({
                id: "pan_janusz",
                name: "Пан Януш",
                title: "Шляхтич и меценат",
                portrait: "👑",
                x: 1350, y: 390,
                schedule: [
                    { startHour: 8, endHour: 18, targetX: 1350, targetY: 390 },
                    { startHour: 18, endHour: 22, targetX: 880, targetY: 660 }
                ]
            }),
            new NPC({
                id: "yankel",
                name: "Янкель-шинкарь",
                title: "Владелец корчмы",
                portrait: "🧔",
                x: 870, y: 640
            }),
            new NPC({
                id: "cossack_grom",
                name: "Атаман Гром",
                title: "Казачий атаман",
                portrait: "⚔️",
                x: 1120, y: 920
            }),
            new NPC({
                id: "hanna",
                name: "Ганна",
                title: "Крестьянка",
                portrait: "👵",
                x: 480, y: 390
            })
        ];

        this.questEngine = new QuestEngine();
        this.reputation = { ...CONFIG.INITIAL_REPUTATION };

        this.keys = {};
        this.lastTime = performance.now();
        this.currentInteractable = null;

        this.initInput();
        this.initUI();
        this.updateReputationUI();

        this.addNotification("Добро пожаловать в Покровскую Весь, отец Стефан!");

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.keys[e.key] = true;

            if (e.code === 'KeyE' || e.code === 'Space' || e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') {
                this.handleInteraction();
            } else if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J' || e.key === 'о' || e.key === 'О') {
                this.toggleModal('journalModal');
                this.renderJournal();
            } else if (e.code === 'KeyI' || e.key === 'i' || e.key === 'I' || e.key === 'ш' || e.key === 'Ш') {
                this.toggleModal('inventoryModal');
                this.renderInventory();
            } else if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И') {
                this.toggleModal('registerModal');
                this.renderRegister();
            } else if (e.code === 'Escape') {
                this.closeAllModals();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keys[e.key] = false;
        });
    }

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

        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
    }

    gameLoop(currentTime) {
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        timeManager.update(deltaTime);

        this.player.update(deltaTime, this.keys);
        
        if (gameWorld.currentLocation === "outdoor") {
            for (let npc of this.npcs) {
                npc.update(deltaTime, timeManager.gameHours);
            }
        }

        this.renderer.updateCamera(this.player);
        this.checkNearbyInteractions();
        this.renderer.render(this.player, this.npcs);

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    checkNearbyInteractions() {
        const promptEl = document.getElementById('interactionPrompt');
        const textEl = document.getElementById('interactionText');

        if (gameWorld.currentLocation === "outdoor") {
            let nearestNPC = null;
            let minDist = 70;

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
        }

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

            // Вход в здание
            if (obj.isBuildingEntrance) {
                const b = obj.building;
                if (b && b.interiorId) {
                    this.enterInterior(b.interiorId);
                }
            } 
            // Выход из здания
            else if (obj.isExit) {
                this.exitInterior();
            }
            // Прочие объекты
            else if (obj.id === "desk_parsonage") {
                this.toggleModal('registerModal');
                this.renderRegister();
            } else if (obj.id === "bell_tower") {
                audioEngine.playChurchBell(200);
                this.questEngine.completeStep("q1_liturgy", "s2");
                this.addNotification("Звон колокола разносится по всей Покровской Веси!");
            } else if (obj.id === "candles_church") {
                this.questEngine.completeStep("q1_liturgy", "s1");
                this.addNotification("Вы зажгли свечи у клироса и алтаря.");
            } else if (obj.id === "parsonage_bed") {
                timeManager.gameHours = (timeManager.gameHours + 6) % 24;
                this.addNotification("Отец Стефан отдохнул. Прошло 6 часов.");
            } else {
                this.openInspect(obj.name, obj.description);
            }
        }
    }

    enterInterior(interiorId) {
        audioEngine.playPageTurn();
        gameWorld.currentLocation = interiorId;
        const interior = gameWorld.interiors[interiorId];

        if (interior) {
            this.player.x = interior.exitX;
            this.player.y = interior.exitY - 40;
            this.addNotification(`Вы вошли: ${interior.name}`);
        }
    }

    exitInterior() {
        audioEngine.playPageTurn();
        const currentInt = gameWorld.interiors[gameWorld.currentLocation];
        gameWorld.currentLocation = "outdoor";

        if (currentInt) {
            this.player.x = currentInt.returnX;
            this.player.y = currentInt.returnY;
            this.addNotification("Вы вышли на улицу Покровской Веси.");
        }
    }

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

    openInspect(title, bodyText) {
        document.getElementById('inspectTitle').innerText = title;
        document.getElementById('inspectBody').innerText = bodyText;
        document.getElementById('inspectModal').classList.remove('hidden');
    }

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

    addNotification(text) {
        const area = document.getElementById('notificationArea');
        const notice = document.createElement('div');
        notice.className = 'toast-notice';
        notice.innerText = text;
        area.appendChild(notice);

        setTimeout(() => notice.remove(), 4000);
    }

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

window.addEventListener('load', () => {
    window.mainGame = new Game();
});
