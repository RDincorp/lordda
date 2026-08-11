/* ==========================================================================
   WORLD.JS — Карта мира, интерьеры зданий, объекты и локации
   ========================================================================== */

class GameWorld {
    constructor() {
        this.width = CONFIG.MAP_COLS * CONFIG.MAP_TILE_SIZE;
        this.height = CONFIG.MAP_ROWS * CONFIG.MAP_TILE_SIZE;

        // Текущее местоположение игрока: "outdoor" или "church_interior", "parsonage_interior", "tavern_interior", "manor_interior"
        this.currentLocation = "outdoor";

        // СТРОЕНИЯ НА УЛИЦЕ
        this.buildings = [
            {
                id: "church",
                name: "Храм Покрова Пресвятой Богородицы",
                x: 350, y: 180, width: 280, height: 220,
                doorX: 490, doorY: 390,
                color: "#7a5938", roofColor: "#3a2618",
                type: "wooden_church",
                interiorId: "church_interior",
                description: "Главный деревянный храм прихода."
            },
            {
                id: "parsonage",
                name: "Плебания (Дом Священника)",
                x: 100, y: 220, width: 180, height: 160,
                doorX: 190, doorY: 370,
                color: "#8c6543", roofColor: "#452e1c",
                type: "house",
                interiorId: "parsonage_interior",
                description: "Скромное жилище отца Стефана."
            },
            {
                id: "tavern",
                name: "Корчма «Под Голубем»",
                x: 750, y: 500, width: 240, height: 180,
                doorX: 870, doorY: 670,
                color: "#6b4a2d", roofColor: "#3d2b17",
                type: "tavern",
                interiorId: "tavern_interior",
                description: "Шинок Янкеля."
            },
            {
                id: "manor",
                name: "Усадьба Пана Януша",
                x: 1200, y: 150, width: 320, height: 240,
                doorX: 1350, doorY: 380,
                color: "#a88b63", roofColor: "#593322",
                type: "estate",
                interiorId: "manor_interior",
                description: "Пышная шляхетская усадьба."
            }
        ];

        // ИНТЕРЬЕРЫ ЗДАНИЙ
        this.interiors = {
            church_interior: {
                name: "Интерьер Храма Покрова Богородицы",
                width: 600, height: 500,
                exitX: 300, exitY: 460, // Точка выхода из здания
                returnX: 490, returnY: 410, // Точка при возврате на улицу
                objects: [
                    { id: "altar", name: "Алтарный Иконостас", x: 300, y: 120, radius: 45, icon: "☦️", actionText: "Помолиться у иконостаса", description: "Главный иконостас с образом Покрова Богородицы." },
                    { id: "candles_church", name: "Подсвечник у клироса", x: 220, y: 180, radius: 35, icon: "🕯️", actionText: "Зажечь свечи", description: "Восковые свечи для молитвы." },
                    { id: "confessional", name: "Исповедальня", x: 450, y: 220, radius: 40, icon: "🪑", actionText: "Выслушать исповедь прихожан", description: "Деревянная исповедальня." },
                    { id: "church_exit", name: "Выход из храма", x: 300, y: 470, radius: 40, icon: "🚪", actionText: "Выйти на улицу (E)", isExit: true }
                ],
                lights: [
                    { x: 300, y: 120, radius: 180, color: "rgba(255, 200, 100, 0.9)" },
                    { x: 220, y: 180, radius: 120, color: "rgba(255, 170, 60, 0.8)" }
                ]
            },

            parsonage_interior: {
                name: "Интерьер Плебании",
                width: 500, height: 400,
                exitX: 250, exitY: 360,
                returnX: 190, returnY: 400,
                objects: [
                    { id: "desk_parsonage", name: "Письменный стол и Метрики", x: 150, y: 150, radius: 35, icon: "📜", actionText: "Открыть Метрическую книгу (B)", description: "Дубовый стол с метрической книгой." },
                    { id: "parsonage_fireplace", name: "Камин плебании", x: 350, y: 120, radius: 40, icon: "🔥", actionText: "Подогреть узвар у камина", description: "Уютный камин, дарующий тепло." },
                    { id: "parsonage_bed", name: "Ложе священника", x: 400, y: 250, radius: 40, icon: "🛏️", actionText: "Отдохнуть (Сменить время суток)", description: "Скромное деревянное ложе." },
                    { id: "parsonage_exit", name: "Выход из плебании", x: 250, y: 370, radius: 40, icon: "🚪", actionText: "Выйти на улицу (E)", isExit: true }
                ],
                lights: [
                    { x: 350, y: 120, radius: 160, color: "rgba(255, 140, 40, 0.85)", isFlickering: true },
                    { x: 150, y: 150, radius: 100, color: "rgba(255, 180, 80, 0.7)" }
                ]
            },

            tavern_interior: {
                name: "Интерьер Корчмы «Под Голубем»",
                width: 550, height: 450,
                exitX: 275, exitY: 410,
                returnX: 870, returnY: 690,
                objects: [
                    { id: "tavern_bar", name: "Шинкарская стойка Янкеля", x: 275, y: 130, radius: 40, icon: "🍺", actionText: "Поговорить с Янкелем", description: "Стойка с дубовыми бочками." },
                    { id: "tavern_table", name: "Стол прихожан и купцов", x: 150, y: 260, radius: 45, icon: "🍷", actionText: "Послушать разговоры крестьян", description: "За этим столом обсуждают сельские вести." },
                    { id: "tavern_exit", name: "Выход из корчмы", x: 275, y: 420, radius: 40, icon: "🚪", actionText: "Выйти на улицу (E)", isExit: true }
                ],
                lights: [
                    { x: 275, y: 130, radius: 150, color: "rgba(255, 160, 50, 0.8)" }
                ]
            },

            manor_interior: {
                name: "Парадный Зал Усадьбы Пана Януша",
                width: 600, height: 450,
                exitX: 300, exitY: 410,
                returnX: 1350, returnY: 410,
                objects: [
                    { id: "manor_throne", name: "Кресло Пана Януша", x: 300, y: 120, radius: 40, icon: "🪑", actionText: "Аудиенция у Пана Януша", description: "Дубовое резное кресло с гербом Острожских." },
                    { id: "manor_exit", name: "Выйти из усадьбы", x: 300, y: 420, radius: 40, icon: "🚪", actionText: "Выйти на улицу (E)", isExit: true }
                ],
                lights: [
                    { x: 300, y: 120, radius: 180, color: "rgba(255, 210, 100, 0.9)" }
                ]
            }
        };

        // ИНТЕРАКТИВНЫЕ ОБЪЕКТЫ НА УЛИЦЕ
        this.interactiveObjects = [
            { id: "bell_tower", name: "Колокольня", x: 320, y: 190, radius: 40, icon: "🔔", actionText: "Ударить в колокол", description: "Бронзовый колокол." },
            { id: "well", name: "Сельский колодец", x: 550, y: 580, radius: 35, icon: "🪣", actionText: "Зачерпнуть святой воды", description: "Колодец с прохладной водой." },
            { id: "graveyard_cross", name: "Кладбищенский Крест", x: 260, y: 160, radius: 35, icon: "✝️", actionText: "Сотворить молитву у могил", description: "Старинные деревянные кресты приходского кладбища." },
            { id: "market_stall", name: "Ярмарочная лавка", x: 670, y: 450, radius: 40, icon: "🛒", actionText: "Осмотреть ярмарочные товары", description: "Телега с зерном, воском и медовыми сотами." },
            { id: "cossack_fire", name: "Казачий костёр на опушке", x: 1100, y: 900, radius: 50, icon: "🔥", actionText: "Подойти к костру казаков", description: "У костра греются казаки." },
            { id: "pier_boat", name: "Причальная лодка у реки", x: 1420, y: 980, radius: 40, icon: "🚣", actionText: "Осмотреть лодку", description: "Деревянный челн для переправы через реку." }
        ];

        // ИСТОЧНИКИ СВЕТА НА УЛИЦЕ
        this.lightSources = [
            { x: 490, y: 230, radius: 120, color: "rgba(255, 190, 80, 0.8)" },
            { x: 190, y: 270, radius: 100, color: "rgba(255, 180, 70, 0.7)" },
            { x: 870, y: 600, radius: 180, color: "rgba(255, 150, 50, 0.85)" },
            { x: 1350, y: 280, radius: 200, color: "rgba(255, 210, 100, 0.9)" },
            { x: 1100, y: 900, radius: 160, color: "rgba(255, 120, 30, 0.9)", isFlickering: true }
        ];

        this.decorations = [];
        this.generateEnvironment();
    }

    generateEnvironment() {
        // Деревья леса
        for (let i = 0; i < 40; i++) {
            this.decorations.push({
                type: "tree",
                x: 1280 + Math.random() * 520,
                y: 480 + Math.random() * 800,
                size: 32 + Math.random() * 18
            });
        }

        // Заборы вокруг Плебании и Храма
        this.decorations.push(
            { type: "fence", x: 80, y: 390, width: 140 },
            { type: "fence", x: 280, y: 390, width: 120 },
            { type: "cart", x: 620, y: 520 }, // Ярмарочная телега с сеном
            { type: "grave", x: 240, y: 140 }, // Кладбищенские могилы
            { type: "grave", x: 280, y: 130 }
        );
    }

    // Проверка коллизий
    checkCollision(x, y, radius = 16) {
        if (this.currentLocation !== "outdoor") {
            // Коллизии внутри здания (границы комнаты)
            const interior = this.interiors[this.currentLocation];
            if (interior) {
                if (x - radius < 30 || x + radius > interior.width - 30 ||
                    y - radius < 30 || y + radius > interior.height - 30) {
                    return true;
                }
            }
            return false;
        }

        // Границы улицы
        if (x - radius < 0 || x + radius > this.width || y - radius < 0 || y + radius > this.height) {
            return true;
        }

        // Здания
        for (let b of this.buildings) {
            if (x + radius > b.x && x - radius < b.x + b.width &&
                y + radius > b.y && y - radius < b.y + b.height) {
                return true;
            }
        }
        return false;
    }

    getNearestInteractable(x, y, maxDistance = 65) {
        let nearest = null;
        let minDist = maxDistance;

        // Если находимся ВНУТРИ здания
        if (this.currentLocation !== "outdoor") {
            const interior = this.interiors[this.currentLocation];
            if (interior) {
                for (let obj of interior.objects) {
                    const dist = Math.hypot(obj.x - x, obj.y - y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = obj;
                    }
                }
            }
            return nearest;
        }

        // Если находимся НА УЛИЦЕ — проверяем входы в здания
        for (let b of this.buildings) {
            const dist = Math.hypot(b.doorX - x, b.doorY - y);
            if (dist < 45) {
                return {
                    id: `enter_${b.id}`,
                    name: `Вход в ${b.name}`,
                    actionText: `Войти в ${b.name} (E)`,
                    isBuildingEntrance: true,
                    building: b
                };
            }
        }

        // Объекты улицы
        for (let obj of this.interactiveObjects) {
            const dist = Math.hypot(obj.x - x, obj.y - y);
            if (dist < minDist) {
                minDist = dist;
                nearest = obj;
            }
        }

        return nearest;
    }
}

const gameWorld = new GameWorld();
