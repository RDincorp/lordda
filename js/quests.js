/* ==========================================================================
   QUESTS.JS — Движок квестов, диалогов, инвентаря и метрической книги
   ========================================================================== */

class QuestEngine {
    constructor() {
        this.quests = [
            {
                id: "q1_liturgy",
                title: "Утренняя Литургия",
                description: "Приближается время службы. Подготовьте храм к приходу сельчан: зажгите свечи у клироса и ударьте в колокол.",
                status: "active", // "active", "completed", "failed"
                steps: [
                    { id: "s1", text: "Зажечь свечи у алтаря и клироса", done: false },
                    { id: "s2", text: "Ударить в церковный колокол", done: false },
                    { id: "s3", text: "Встретить дьяка Богдана и начать литургию", done: false }
                ],
                reward: { repPeasants: 10, repChurch: 10 }
            },
            {
                id: "q2_charter",
                title: "Тайна Сожжённой Грамоты",
                description: "Пан Януш утверждает, что права казаков на земли Покровской Веси сгорели. Поговорите с атаманом Громом у лесного костра.",
                status: "active",
                steps: [
                    { id: "s1", text: "Найти казаков у костра на опушке", done: false },
                    { id: "s2", text: "Расспросить Янкеля в корчме о сгоревшем документе", done: false },
                    { id: "s3", text: "Принять решение: передать грамоту пану или укрыть у казаков", done: false }
                ],
                reward: { repSzlachta: 15, repCossacks: 15 }
            },
            {
                id: "q3_confession",
                title: "Таинство Исповеди",
                description: "Крестьянка Ганна пришла в храм со смятенной душой. Выслушайте её исповедь и дайте духовное наставление.",
                status: "active",
                steps: [
                    { id: "s1", text: "Выслушать исповедь Ганны в церкви", done: false }
                ],
                reward: { repPeasants: 15 }
            }
        ];

        // Инвентарь священника
        this.inventory = [
            { id: "item_cross", name: "Наперсный Крест", icon: "✝️", desc: "Золотой униатский крест — символ священного сана отца Стефана." },
            { id: "item_oil", name: "Святое Миро", icon: "🧴", desc: "Освящённое елеистое масло для помазания и треб." },
            { id: "item_charter", name: "Древняя Земская Грамота", icon: "📜", desc: "Старинный пергамент с печатью великих князей о правах приходских земель." }
        ];

        // Записи Метрической книги
        this.registerRecords = [
            { date: "12 Мая 1642", name: "Михась, сын Петра", status: "Крестьянин", event: "Крещение", note: "Восприемники: дьяк Богдан и Ганна." },
            { date: "28 Июня 1642", name: "Якуб и Марина", status: "Мещане", event: "Венчание", note: "Брак благословлен в храме Покрова." }
        ];
    }

    // Добавить новую запись в метрику
    addRegisterRecord(name, status, event, note) {
        const timeStr = timeManager.getFormattedTime();
        this.registerRecords.unshift({
            date: `День ${timeManager.currentDay}, ${timeStr}`,
            name, status, event, note
        });
    }

    // Выполнение шага квеста
    completeStep(questId, stepId) {
        const q = this.quests.find(item => item.id === questId);
        if (!q) return;

        const step = q.steps.find(s => s.id === stepId);
        if (step && !step.done) {
            step.done = true;
            if (window.mainGame) {
                window.mainGame.addNotification(`Задача выполнена: ${step.text}`);
            }

            // Проверка завершения всего квеста
            if (q.steps.every(s => s.done) && q.status !== "completed") {
                q.status = "completed";
                if (window.mainGame) {
                    window.mainGame.addNotification(`Квест завершён: ${q.title}!`);
                    window.mainGame.addReputation(q.reward);
                }
            }
        }
    }
}

// ДИАЛОГОВЫЕ ДЕРЕВЬЯ NPC
const DIALOGUES = {
    pan_janusz: {
        npcName: "Пан Януш Острожский",
        title: "Шляхтич и меценат прихода",
        portrait: "👑",
        text: "Приветствую вас, отец Стефан. Желаю знать, поминают ли имя моего рода на утренней службе?",
        choices: [
            {
                text: "«Ваш род Острожских всегда в молитвах нашего прихода, пан.»",
                action: (game) => {
                    game.addReputation({ szlachta: 5 });
                    game.openDialogueText("Пан Януш: «Замечательно! Вот 10 злотых на ремонт крыши храма.»");
                }
            },
            {
                text: "«Бог смотрит не на богатство рода, а на чистоту сердца и милосердие к крестьянам.»",
                action: (game) => {
                    game.addReputation({ peasants: 8, szlachta: -3 });
                    game.openDialogueText("Пан Януш (хмурясь): «Не забывайте, чей хлеб вы едите в этой плебании, священник!»");
                }
            },
            {
                text: "«До свидания, пан Януш.»",
                action: (game) => game.closeDialogue()
            }
        ]
    },

    yankel: {
        npcName: "Янкель-шинкарь",
        title: "Владелец корчмы «Под Голубем»",
        portrait: "🧔",
        text: "Шолом, отец Стефан! Не желаете ли свежего сбивня или узвара с дороги?",
        choices: [
            {
                text: "«Скажи, Янкель, что за люди собирались вчера у костра за рекой?»",
                action: (game) => {
                    game.questEngine.completeStep("q2_charter", "s2");
                    game.openDialogueText("Янкель (тихо): «Ой, ребе Стефан, то были казаки атамана Грома. Ищут старую земельную грамоту...»");
                }
            },
            {
                text: "«Всего доброго, Янкель.»",
                action: (game) => game.closeDialogue()
            }
        ]
    },

    cossack_grom: {
        npcName: "Атаман Гром",
        title: "Казачий старшина",
        portrait: "⚔️",
        text: "Здоров был, святой отец! Пришел с миром к твоему храму, да панские юноши косо смотрят.",
        choices: [
            {
                text: "«Храм Покрова открыт для всех православных и униатов, атаман.»",
                action: (game) => {
                    game.addReputation({ cossacks: 10 });
                    game.questEngine.completeStep("q2_charter", "s1");
                    game.openDialogueText("Атаман Гром: «Доброе слово и казаку приятно. Помоги нам восстановить правду о земляных правах!»");
                }
            },
            {
                text: "«Благословение вам, казаки.»",
                action: (game) => game.closeDialogue()
            }
        ]
    },

    hanna: {
        npcName: "Ганна",
        title: "Сельская прихожанка",
        portrait: "👵",
        text: "Батюшка Стефан! Дитя моё занедужило... Помолись о его здравии!",
        choices: [
            {
                text: "«Сотворим молитву и помажем святым миром. Всё будет хорошо, Ганна.»",
                action: (game) => {
                    game.questEngine.completeStep("q3_confession", "s1");
                    game.questEngine.addRegisterRecord("Дитя Ганны", "Крестьяне", "Молебен о здравии", "Помазан святым миром");
                    game.openDialogueText("Ганна (со слезами счастья): «Спасибо тебе, батюшка! Да хранит тебя Господь!»");
                }
            },
            {
                text: "«Иди с миром.»",
                action: (game) => game.closeDialogue()
            }
        ]
    }
};
