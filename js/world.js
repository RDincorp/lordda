/* ==========================================================================
   WORLD.JS — Карта мира, строения, объекты и коллизии (XVII век)
   ========================================================================== */

class GameWorld {
    constructor() {
        this.width = CONFIG.MAP_COLS * CONFIG.MAP_TILE_SIZE;
        this.height = CONFIG.MAP_ROWS * CONFIG.MAP_TILE_SIZE;

        // Здания на карте
        this.buildings = [
            {
                id: "church",
                name: "Храм Покрова Пресвятой Богородицы (Униатский)",
                x: 350, y: 180, width: 280, height: 220,
                doorX: 490, doorY: 390,
                color: "#7a5938", roofColor: "#3a2618",
                type: "wooden_church",
                description: "Главный деревянный храм прихода с куполом и луковицей. Здесь проходят литургии и исповеди."
            },
            {
                id: "parsonage",
                name: "Плебания (Дом Священника)",
                x: 100, y: 220, width: 180, height: 160,
                doorX: 190, doorY: 370,
                color: "#8c6543", roofColor: "#452e1c",
                type: "house",
                description: "Скромное жилище отца Стефана. Здесь хранится Метрическая книга и библиотека богословских трудов."
            },
            {
                id: "tavern",
                name: "Корчма «Под Голубем»",
                x: 750, y: 500, width: 240, height: 180,
                doorX: 870, doorY: 670,
                color: "#6b4a2d", roofColor: "#3d2b17",
                type: "tavern",
                description: "Шинок Янкеля. Вечером здесь собираются местные крестьяне, проезжие купцы и казаки."
            },
            {
                id: "manor",
                name: "Усадьба Пана Януша Острожского",
                x: 1200, y: 150, width: 320, height: 240,
                doorX: 1350, doorY: 380,
                color: "#a88b63", roofColor: "#593322",
                type: "estate",
                description: "Пышная шляхетская усадьба местного мецената и владельца Покровской Веси."
            },
            {
                id: "hermitage",
                name: "Лесной Скит у Дубравы",
                x: 1400, y: 850, width: 160, height: 140,
                doorX: 1480, doorY: 980,
                color: "#54402a", roofColor: "#2b1f13",
                type: "skit",
                description: "Уединённая изба у старого дуба. Здесь укрываются сторонники старой веры."
            }
        ];

        // Интерактивные объекты мира
        this.interactiveObjects = [
            {
                id: "altar",
                name: "Алтарный Иконостас",
                x: 490, y: 230, radius: 40,
                icon: "☦️",
                actionText: "Осмотреть алтарь и иконостас",
                description: "Деревянный иконостас с образом Покрова Богородицы. Святые свечи тихо мерцают в полумраке."
            },
            {
                id: "candles_church",
                name: "Подсвечник у клироса",
                x: 430, y: 280, radius: 35,
                icon: "🕯️",
                actionText: "Зажечь святые свечи",
                description: "Восковые свечи для молитвы о здравии и упокоении прихожан."
            },
            {
                id: "desk_parsonage",
                name: "Письменный стол и Метрики",
                x: 150, y: 260, radius: 35,
                icon: "📜",
                actionText: "Открыть Метрическую книгу (M)",
                description: "Дубовый стол, покрытый записями о рождениях, браках и кончинах жителей села."
            },
            {
                id: "bell_tower",
                name: "Колокольня",
                x: 320, y: 190, radius: 40,
                icon: "🔔",
                actionText: "Ударить в колокол",
                description: "Бронзовый колокол, отлитый на средства пана Януша. Его звон разносится по всей округе."
            },
            {
                id: "well",
                name: "Сельский колодец",
                x: 550, y: 580, radius: 35,
                icon: "🪣",
                actionText: "Зачерпнуть святой воды",
                description: "Глубокий колодец с прохладной ключевой водой."
            },
            {
                id: "cossack_fire",
                name: "Казачий костёр на опушке",
                x: 1100, y: 900, radius: 50,
                icon: "🔥",
                actionText: "Подойти к костру казаков",
                description: "У костра греются казаки из отряда атамана Грома."
            }
        ];

        // Источники света для ночной отрисовки (x, y, radius, color)
        this.lightSources = [
            { x: 490, y: 230, radius: 120, color: "rgba(255, 190, 80, 0.8)", isCandle: true }, // Алтарь
            { x: 430, y: 280, radius: 90, color: "rgba(255, 170, 60, 0.75)", isCandle: true }, // Клирос
            { x: 190, y: 270, radius: 100, color: "rgba(255, 180, 70, 0.7)", isCandle: true }, // Плебания
            { x: 870, y: 600, radius: 180, color: "rgba(255, 150, 50, 0.85)", isCandle: false }, // Корчма
            { x: 1350, y: 280, radius: 200, color: "rgba(255, 210, 100, 0.9)", isCandle: false }, // Усадьба
            { x: 1100, y: 900, radius: 160, color: "rgba(255, 120, 30, 0.9)", isFlickering: true } // Костёр
        ];

        // Деревья, заборы и декорации
        this.decorations = [];
        this.generateEnvironment();
    }

    generateEnvironment() {
        // Генерируем деревья вокруг леса и реку
        for (let i = 0; i < 40; i++) {
            this.decorations.push({
                type: "tree",
                x: 1300 + Math.random() * 500,
                y: 500 + Math.random() * 800,
                size: 30 + Math.random() * 20
            });
        }
    }

    // Проверка коллизий со зданиями
    checkCollision(x, y, radius = 16) {
        // Границы карты
        if (x - radius < 0 || x + radius > this.width || y - radius < 0 || y + radius > this.height) {
            return true;
        }

        // Прямоугольники зданий
        for (let b of this.buildings) {
            if (x + radius > b.x && x - radius < b.x + b.width &&
                y + radius > b.y && y - radius < b.y + b.height) {
                return true;
            }
        }
        return false;
    }

    // Получить ближайший интерактивный объект
    getNearestInteractable(x, y, maxDistance = 65) {
        let nearest = null;
        let minDist = maxDistance;

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
