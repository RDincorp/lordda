/* ==========================================================================
   CONFIG.JS — Настройки и константы игры «Уния»
   ========================================================================== */

const CONFIG = {
    // ВРЕМЯ И СУТОЧНЫЙ ЦИКЛ
    // 1 игровые сутки = 24 реальные минуты = 1440 секунд.
    // Следовательно, 1 часовой игровой интервал = 60 реальных секунд.
    REAL_SECONDS_PER_GAME_DAY: 1440,
    INITIAL_TIME_HOURS: 6.5, // Игра начинается в 06:30 утра (Утренняя заря)
    
    // КАРТА И СЕТКА
    MAP_TILE_SIZE: 48,
    MAP_COLS: 40,
    MAP_ROWS: 30,

    // СКОРОСТЬ ДВИЖЕНИЯ
    PLAYER_SPEED: 140, // пикселей в секунду

    // ФРАКЦИИ И НАЧАЛЬНАЯ РЕПУТАЦИЯ (0..100)
    INITIAL_REPUTATION: {
        szlachta: 50,  // Местная Шляхта (Пан Януш)
        peasants: 50,  // Крестьяне-прихожане (Ганна, дьяк)
        church: 50,    // Униатско-католический иерарх
        cossacks: 50   // Казаки / Православное братство
    },

    // НАЗВАНИЯ И КОНСТАНТЫ СУТОЧНЫХ ФАЗ
    DAY_PHASES: [
        { name: "Рассвет", startHour: 5, endHour: 8, skyColor: "#f7b05b", ambientAlpha: 0.25 },
        { name: "Утро", startHour: 8, endHour: 12, skyColor: "#fff2a1", ambientAlpha: 0.05 },
        { name: "Полдень", startHour: 12, endHour: 16, skyColor: "#ffffff", ambientAlpha: 0.0 },
        { name: "Золотой час", startHour: 16, endHour: 19, skyColor: "#ffaa44", ambientAlpha: 0.2 },
        { name: "Закат", startHour: 19, endHour: 21, skyColor: "#d94e34", ambientAlpha: 0.5 },
        { name: "Сумерки", startHour: 21, endHour: 23, skyColor: "#3a2d54", ambientAlpha: 0.75 },
        { name: "Глубокая ночь", startHour: 23, endHour: 5, skyColor: "#0b0c1a", ambientAlpha: 0.88 }
    ]
};
