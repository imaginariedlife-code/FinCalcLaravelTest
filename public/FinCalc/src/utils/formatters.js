/**
 * Formatters - Утилиты для форматирования данных
 */
class Formatters {
    constructor() {
        this.locale = 'ru-RU';
        this.currency = 'RUB';
    }

    /**
     * Форматирование валюты
     * @param {number} amount - Сумма
     * @param {Object} options - Опции форматирования
     * @returns {string} Отформатированная строка
     */
    formatCurrency(amount, options = {}) {
        const defaultOptions = {
            style: 'currency',
            currency: this.currency,
            maximumFractionDigits: 0,
            ...options
        };

        try {
            return new Intl.NumberFormat(this.locale, defaultOptions).format(amount || 0);
        } catch (error) {
            return `${(amount || 0).toLocaleString()} ₽`;
        }
    }

    /**
     * Компактное форматирование валюты
     * @param {number} amount - Сумма
     * @returns {string} Компактная строка
     */
    formatCompactCurrency(amount) {
        if (!amount) return '0₽';

        const absAmount = Math.abs(amount);

        if (absAmount >= 1000000000) {
            return `${(amount / 1000000000).toFixed(1)}B₽`;
        } else if (absAmount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M₽`;
        } else if (absAmount >= 1000) {
            return `${(amount / 1000).toFixed(0)}K₽`;
        } else {
            return `${Math.round(amount)}₽`;
        }
    }

    /**
     * Форматирование процентов
     * @param {number} value - Значение в процентах
     * @param {Object} options - Опции форматирования
     * @returns {string} Отформатированная строка
     */
    formatPercent(value, options = {}) {
        const defaultOptions = {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
            ...options
        };

        try {
            return new Intl.NumberFormat(this.locale, defaultOptions).format((value || 0) / 100);
        } catch (error) {
            return `${(value || 0).toFixed(1)}%`;
        }
    }

    /**
     * Форматирование числа
     * @param {number} value - Число
     * @param {Object} options - Опции форматирования
     * @returns {string} Отформатированная строка
     */
    formatNumber(value, options = {}) {
        const defaultOptions = {
            maximumFractionDigits: 2,
            ...options
        };

        try {
            return new Intl.NumberFormat(this.locale, defaultOptions).format(value || 0);
        } catch (error) {
            return (value || 0).toString();
        }
    }

    /**
     * Форматирование даты
     * @param {Date|string} date - Дата
     * @param {Object} options - Опции форматирования
     * @returns {string} Отформатированная дата
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options
        };

        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            return new Intl.DateTimeFormat(this.locale, defaultOptions).format(dateObj);
        } catch (error) {
            return date?.toString() || '';
        }
    }

    /**
     * Короткое форматирование даты
     * @param {Date|string} date - Дата
     * @returns {string} Короткая дата
     */
    formatShortDate(date) {
        return this.formatDate(date, {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit'
        });
    }

    /**
     * Относительное форматирование времени
     * @param {Date|string} date - Дата
     * @returns {string} Относительное время
     */
    formatRelativeTime(date) {
        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            const now = new Date();
            const diffMs = now - dateObj;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'сегодня';
            if (diffDays === 1) return 'вчера';
            if (diffDays < 7) return `${diffDays} дней назад`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} недель назад`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} месяцев назад`;
            return `${Math.floor(diffDays / 365)} лет назад`;
        } catch (error) {
            return '';
        }
    }

    /**
     * Форматирование изменения (с знаком и цветом)
     * @param {number} value - Значение изменения
     * @param {boolean} isPercent - Форматировать как проценты
     * @returns {Object} Объект с форматированным значением и классом
     */
    formatChange(value, isPercent = false) {
        const formattedValue = isPercent
            ? this.formatPercent(Math.abs(value))
            : this.formatCompactCurrency(Math.abs(value));

        const sign = value >= 0 ? '+' : '-';
        const className = value >= 0 ? 'text-success' : 'text-danger';

        return {
            text: `${sign}${formattedValue}`,
            className,
            isPositive: value >= 0
        };
    }

    /**
     * Форматирование размера файла
     * @param {number} bytes - Размер в байтах
     * @returns {string} Отформатированный размер
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }

    /**
     * Форматирование риск-скора
     * @param {number} riskScore - Риск-скор от 1 до 10
     * @returns {Object} Объект с текстом и классом
     */
    formatRiskScore(riskScore) {
        const score = Math.round(riskScore || 0);

        let level, className;
        if (score <= 3) {
            level = 'Низкий';
            className = 'text-success';
        } else if (score <= 6) {
            level = 'Средний';
            className = 'text-warning';
        } else {
            level = 'Высокий';
            className = 'text-danger';
        }

        return {
            text: `${score}/10 (${level})`,
            level,
            score,
            className
        };
    }

    /**
     * Форматирование периода времени
     * @param {number} years - Количество лет
     * @returns {string} Отформатированный период
     */
    formatTimePeriod(years) {
        if (years < 1) {
            const months = Math.round(years * 12);
            return `${months} мес.`;
        } else if (years === 1) {
            return '1 год';
        } else if (years < 5) {
            return `${years} года`;
        } else {
            return `${years} лет`;
        }
    }

    /**
     * Форматирование статуса портфеля
     * @param {Object} portfolio - Портфель
     * @returns {Object} Объект со статусом
     */
    formatPortfolioStatus(portfolio) {
        const assetCount = portfolio.assets?.length || 0;
        const totalValue = portfolio.totalValue || 0;

        if (assetCount === 0) {
            return {
                text: 'Пустой портфель',
                className: 'text-secondary',
                icon: '📭'
            };
        } else if (totalValue === 0) {
            return {
                text: 'Требует настройки',
                className: 'text-warning',
                icon: '⚠️'
            };
        } else if (assetCount === 1) {
            return {
                text: 'Недиверсифицирован',
                className: 'text-warning',
                icon: '📊'
            };
        } else {
            return {
                text: 'Активный портфель',
                className: 'text-success',
                icon: '💼'
            };
        }
    }

    /**
     * Извлечение числа из строки
     * @param {string} str - Строка с числом
     * @returns {number} Извлеченное число
     */
    parseNumber(str) {
        if (typeof str === 'number') return str;
        if (!str) return 0;

        // Удаляем все кроме цифр, точки и минуса
        const cleaned = str.toString().replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Валидация числового ввода
     * @param {string|number} value - Значение для валидации
     * @param {Object} constraints - Ограничения
     * @returns {Object} Результат валидации
     */
    validateNumber(value, constraints = {}) {
        const {
            min = -Infinity,
            max = Infinity,
            required = false,
            integer = false
        } = constraints;

        const parsed = this.parseNumber(value);

        if (required && (value === '' || value === null || value === undefined)) {
            return { isValid: false, error: 'Поле обязательно для заполнения' };
        }

        if (isNaN(parsed)) {
            return { isValid: false, error: 'Некорректное число' };
        }

        if (integer && !Number.isInteger(parsed)) {
            return { isValid: false, error: 'Должно быть целое число' };
        }

        if (parsed < min) {
            return { isValid: false, error: `Минимальное значение: ${min}` };
        }

        if (parsed > max) {
            return { isValid: false, error: `Максимальное значение: ${max}` };
        }

        return { isValid: true, value: parsed };
    }
}

// Создаем глобальный экземпляр
window.formatters = new Formatters();

// Экспортируем класс
window.Formatters = Formatters;