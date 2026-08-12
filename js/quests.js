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
            },
            {
                id: "q4_heresy",
                title: "Ересь или Традиция?",
                description: "Дьяк Богдан взволнован: прихожане творят народные обряды у колодца. Выясните суть спора.",
                status: "active",
                steps: [
                    { id: "s1", text: "Поговорить с дьяком Богданом у храма", done: false },
                    { id: "s2", text: "Осмотреть сельский колодец", done: false },
                    { id: "s3", text: "Разрешить спор: освятить обряд или пресечь ересь", done: false }
                ],
                reward: { repChurch: 15, repPeasants: 10 }
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
                text: "«Вот Земская Грамота, пан. Права на земли принадлежат шляхте.» (Завершить квест грамоты)",
                action: (game) => {
                    game.addReputation({ szlachta: 20, cossacks: -10 });
                    game.questEngine.completeStep("q2_charter", "s3");
                    game.openDialogueText("Пан Януш (улыбаясь): «Мудрое решение, отец Стефан! Шляхта не забудет вашей верности!»");
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

    diak_bogdan: {
        npcName: "Дьяк Богдан",
        title: "Приходской дьяк и клирик",
        portrait: "📖",
        text: "Благословите, батюшка Стефан! Прихожане собрались на утреннюю литургию.",
        choices: [
            {
                text: "«Благословен Бог наш! Начинаем литургию!» (Завершить службу)",
                action: (game) => {
                    game.questEngine.completeStep("q1_liturgy", "s3");
                    game.questEngine.completeStep("q4_heresy", "s1");
                    audioEngine.playChurchBell(180);
                    game.openDialogueText("Дьяк Богдан запевает тропарь. В храме Покрова начинается торжественная утренняя литургия!");
                }
            },
            {
                text: "«Что скажешь о народных обрядах у колодца, Богдан?»",
                action: (game) => {
                    game.questEngine.completeStep("q4_heresy", "s1");
                    game.openDialogueText("Дьяк Богдан: «Крестьяне опять ленты на ветви вяжут да воду из колодца святить просят по старому обычаю. Ересь то или традиция — вам решать, батюшка!»");
                }
            },
            {
                text: "«Бог в помощь, Богдан.»",
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
                text: "«Я отдаю Древнюю Грамоту казакам — земля принадлежит вольному люду!» (Завершить квест)",
                action: (game) => {
                    game.addReputation({ cossacks: 20, szlachta: -10 });
                    game.questEngine.completeStep("q2_charter", "s3");
                    game.openDialogueText("Атаман Гром (радостно): «Спаси Бог тебя, святой отец! Войско Запорожское этого не забудет!»");
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
    },

    traveler_kobzar: {
        npcName: "Кобзарь Тарас",
        title: "Странствующий певец из Чернигова",
        portrait: "🪕",
        text: "Мир дому сему, святой отец! Иду из Чернигова сквозь степи, пою думы о казацкой славе.",
        choices: [
            {
                text: "«Спой нам думу, Тарас, да поведай новости из дальних земель.»",
                action: (game) => {
                    audioEngine.playChurchBell(120);
                    game.addReputation({ peasants: 10, cossacks: 10 });
                    game.openDialogueText("Кобзарь Тарас берет золотые струны бандуры и запевает старинную думу. Вся весть собралась послушать пение!");
                }
            },
            {
                text: "«Вот тебе серебряный грош на дорогу.»",
                action: (game) => {
                    game.addReputation({ peasants: 5 });
                    game.openDialogueText("Кобзарь Тарас: «Спаси Бог тебя, батюшка! Буду молиться за твой приход!»");
                }
            },
            {
                text: "«Доброй дороги, кобзарь.»",
                action: (game) => game.closeDialogue()
            }
        ]
    },

    traveler_merchant: {
        npcName: "Купец Фёдор",
        title: "Заезжий купец из Львова",
        portrait: "📦",
        text: "Благословенного дня, батюшка! Привёз восковые львовские свечи, афонский ладан да шелковые рушники.",
        choices: [
            {
                text: "«Купить афонский ладан для храма.»",
                action: (game) => {
                    game.addReputation({ church: 15 });
                    game.openDialogueText("Купец Фёдор отдаёт благовонный ладан. Храм Покрова теперь наполнен святым ароматом!");
                }
            },
            {
                text: "«Какие вести с львовского ярмарка?»",
                action: (game) => {
                    game.openDialogueText("Купец Фёдор: «В городе мир, но шляхта собирает сеймики. Все говорят о вере и унии!»");
                }
            },
            {
                text: "«Бог в помощь в торговле.»",
                action: (game) => game.closeDialogue()
            }
        ]
    },

    traveler_pilgrim: {
        npcName: "Паломник Прохор",
        title: "Киевский богомолец",
        portrait: "🦯",
        text: "Мир храму вашему! Держу путь из Киево-Печерской Лавры по святым местам.",
        choices: [
            {
                text: "«Поделись благословением святых пещер, Прохор.»",
                action: (game) => {
                    game.addReputation({ church: 10, peasants: 10 });
                    game.openDialogueText("Паломник Прохор передаёт засушенную просфору из Киевских пещер. Прихожане с трепетом подходят к святыне.");
                }
            },
            {
                text: "«Отдохни с дороги в плебании, странник.»",
                action: (game) => game.closeDialogue()
            }
        ]
    }
};
