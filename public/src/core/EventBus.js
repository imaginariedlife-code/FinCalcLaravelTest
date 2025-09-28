/**
 * EventBus - Центральная система событий для связи между модулями
 */
class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * Подписаться на событие
     * @param {string} event - Название события
     * @param {function} callback - Функция обратного вызова
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * Отписаться от события
     * @param {string} event - Название события
     * @param {function} callback - Функция обратного вызова
     */
    off(event, callback) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Вызвать событие
     * @param {string} event - Название события
     * @param {*} data - Данные для передачи
     */
    emit(event, data) {
        if (!this.events[event]) return;

        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }

    /**
     * Подписаться на событие один раз
     * @param {string} event - Название события
     * @param {function} callback - Функция обратного вызова
     */
    once(event, callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
    }

    /**
     * Получить список всех активных событий
     */
    getEvents() {
        return Object.keys(this.events);
    }

    /**
     * Очистить все обработчики событий
     */
    clear() {
        this.events = {};
    }
}

// Создаем глобальный экземпляр
window.eventBus = new EventBus();

// Экспортируем класс
window.EventBus = EventBus;