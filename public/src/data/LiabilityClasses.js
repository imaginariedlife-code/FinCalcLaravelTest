/**
 * LiabilityClasses - Справочники типов обязательств и их характеристик
 */
class LiabilityClasses {
    constructor() {
        this.liabilityTypes = {
            mortgage: {
                name: 'Ипотека',
                icon: '🏠',
                color: '#dc2626',
                description: 'Ипотечный кредит на недвижимость',
                category: 'secured',
                defaultRate: 8.5,
                defaultTerm: 20,
                examples: ['Ипотека на квартиру', 'Ипотека на дом', 'Рефинансирование']
            },
            consumer: {
                name: 'Потребительский кредит',
                icon: '💳',
                color: '#ea580c',
                description: 'Потребительский кредит без залога',
                category: 'unsecured',
                defaultRate: 15.0,
                defaultTerm: 5,
                examples: ['Кредит наличными', 'Целевой кредит', 'Рефинансирование']
            },
            auto: {
                name: 'Автокредит',
                icon: '🚗',
                color: '#0891b2',
                description: 'Кредит на покупку автомобиля',
                category: 'secured',
                defaultRate: 12.0,
                defaultTerm: 7,
                examples: ['Новый автомобиль', 'Подержанный автомобиль', 'Мотоцикл']
            },
            business: {
                name: 'Бизнес-кредит',
                icon: '💼',
                color: '#7c3aed',
                description: 'Кредит для развития бизнеса',
                category: 'business',
                defaultRate: 18.0,
                defaultTerm: 3,
                examples: ['Кредитная линия', 'Оборотные средства', 'Инвестиционный кредит']
            }
        };

        this.riskCategories = {
            secured: {
                name: 'Обеспеченные',
                description: 'Кредиты под залог имущества',
                riskLevel: 'low'
            },
            unsecured: {
                name: 'Необеспеченные',
                description: 'Кредиты без залога',
                riskLevel: 'medium'
            },
            business: {
                name: 'Бизнес-кредиты',
                description: 'Кредиты для коммерческой деятельности',
                riskLevel: 'high'
            }
        };
    }

    /**
     * Получить информацию о типе обязательства
     * @param {string} liabilityType - Тип обязательства
     * @returns {Object} Информация об обязательстве
     */
    getLiabilityInfo(liabilityType) {
        return this.liabilityTypes[liabilityType] || null;
    }

    /**
     * Получить все типы обязательств
     * @returns {Object} Все типы обязательств
     */
    getAllLiabilityTypes() {
        return this.liabilityTypes;
    }

    /**
     * Создать обязательство по умолчанию
     * @param {string} liabilityType - Тип обязательства
     * @param {number} principal - Основная сумма кредита
     * @param {number} rate - Годовая процентная ставка (%)
     * @param {number} termYears - Срок кредита в годах
     * @returns {Object} Объект обязательства
     */
    createDefaultLiability(liabilityType, principal = 0, rate = null, termYears = null) {
        const liabilityInfo = this.getLiabilityInfo(liabilityType);
        if (!liabilityInfo) {
            throw new Error(`Unknown liability type: ${liabilityType}`);
        }

        const finalRate = rate !== null ? rate : liabilityInfo.defaultRate;
        const finalTerm = termYears !== null ? termYears : liabilityInfo.defaultTerm;
        const monthlyPayment = this.calculateMonthlyPayment(principal, finalRate, finalTerm);

        return {
            id: this.generateLiabilityId(liabilityType),
            type: liabilityType,
            name: `${liabilityInfo.name}`,
            principal: principal,
            currentBalance: principal,
            rate: finalRate,
            termYears: finalTerm,
            monthlyPayment: monthlyPayment,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Расчет ежемесячного платежа (аннуитетный платеж)
     * @param {number} principal - Основная сумма кредита
     * @param {number} annualRate - Годовая процентная ставка (%)
     * @param {number} termYears - Срок кредита в годах
     * @returns {number} Ежемесячный платеж
     */
    calculateMonthlyPayment(principal, annualRate, termYears) {
        if (principal <= 0 || annualRate <= 0 || termYears <= 0) {
            return 0;
        }

        const monthlyRate = annualRate / 100 / 12;
        const numPayments = termYears * 12;

        // Формула аннуитетного платежа
        const monthlyPayment = principal *
            (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
            (Math.pow(1 + monthlyRate, numPayments) - 1);

        return Math.round(monthlyPayment * 100) / 100;
    }

    /**
     * Расчет остатка долга через N лет
     * @param {Object} liability - Обязательство
     * @param {number} years - Количество лет
     * @returns {number} Остаток долга
     */
    calculateRemainingBalance(liability, years) {
        if (years <= 0) {
            return liability.principal;
        }

        if (years >= liability.termYears) {
            return 0;
        }

        const monthlyRate = liability.rate / 100 / 12;
        const totalPayments = liability.termYears * 12;
        const paymentsMade = years * 12;
        const remainingPayments = totalPayments - paymentsMade;

        // Формула остатка долга
        const remainingBalance = liability.principal *
            (Math.pow(1 + monthlyRate, totalPayments) - Math.pow(1 + monthlyRate, paymentsMade)) /
            (Math.pow(1 + monthlyRate, totalPayments) - 1);

        return Math.max(0, Math.round(remainingBalance * 100) / 100);
    }

    /**
     * Расчет общих выплат по кредиту
     * @param {Object} liability - Обязательство
     * @returns {Object} Информация о выплатах
     */
    calculateTotalPayments(liability) {
        const totalPayments = liability.monthlyPayment * liability.termYears * 12;
        const totalInterest = totalPayments - liability.principal;

        return {
            totalPayments: Math.round(totalPayments * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            interestRate: Math.round((totalInterest / liability.principal) * 100 * 100) / 100
        };
    }

    /**
     * Генерация ID для обязательства
     * @param {string} liabilityType - Тип обязательства
     * @returns {string} Уникальный ID
     */
    generateLiabilityId(liabilityType) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `${liabilityType}_${timestamp}_${random}`;
    }

    /**
     * Валидация параметров кредита
     * @param {number} principal - Основная сумма
     * @param {number} rate - Процентная ставка
     * @param {number} termYears - Срок в годах
     * @returns {Object} Результат валидации
     */
    validateLoanParameters(principal, rate, termYears) {
        const errors = [];

        if (!principal || principal <= 0) {
            errors.push('Сумма кредита должна быть больше нуля');
        }

        if (!rate || rate <= 0 || rate > 100) {
            errors.push('Процентная ставка должна быть от 0 до 100%');
        }

        if (!termYears || termYears <= 0 || termYears > 50) {
            errors.push('Срок кредита должен быть от 1 до 50 лет');
        }

        return {
            isValid: errors.length === 0,
            errors,
            message: errors.length === 0 ? 'Параметры корректны' : errors.join('; ')
        };
    }

    /**
     * Получить график платежей (первые 12 месяцев)
     * @param {Object} liability - Обязательство
     * @returns {Array} График платежей
     */
    getPaymentSchedule(liability, months = 12) {
        const schedule = [];
        const monthlyRate = liability.rate / 100 / 12;
        let remainingBalance = liability.principal;

        for (let month = 1; month <= Math.min(months, liability.termYears * 12); month++) {
            const interestPayment = remainingBalance * monthlyRate;
            const principalPayment = liability.monthlyPayment - interestPayment;
            remainingBalance -= principalPayment;

            schedule.push({
                month,
                payment: Math.round(liability.monthlyPayment * 100) / 100,
                principal: Math.round(principalPayment * 100) / 100,
                interest: Math.round(interestPayment * 100) / 100,
                remainingBalance: Math.round(Math.max(0, remainingBalance) * 100) / 100
            });
        }

        return schedule;
    }
}

// Создаем глобальный экземпляр
window.liabilityClasses = new LiabilityClasses();

// Экспортируем класс
window.LiabilityClasses = LiabilityClasses;