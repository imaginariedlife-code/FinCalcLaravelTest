/**
 * AssetClasses - Справочники типов активов и их характеристик
 */
class AssetClasses {
    constructor() {
        this.assetTypes = {
            stocks: {
                name: 'Фонды акций',
                icon: '📈',
                color: '#059669',
                description: 'Индексные и активные фонды акций',
                riskLevel: 'high',
                liquidity: 'high',
                inflationAdjustment: {
                    pessimistic: -1,
                    base: 5,
                    optimistic: 10
                },
                examples: ['ETF на S&P 500', 'Фонд российских акций', 'Мировые акции']
            },
            bonds: {
                name: 'Фонды облигаций',
                icon: '📄',
                color: '#2563eb',
                description: 'Фонды государственных и корпоративных облигаций',
                riskLevel: 'medium',
                liquidity: 'medium',
                inflationAdjustment: {
                    pessimistic: -2,
                    base: 1,
                    optimistic: 5
                },
                examples: ['Фонд ОФЗ', 'Корпоративные облигации', 'Зарубежные облигации']
            },
            cash: {
                name: 'Фонды денежного рынка',
                icon: '💰',
                color: '#d97706',
                description: 'Депозиты и краткосрочные инструменты денежного рынка',
                riskLevel: 'low',
                liquidity: 'high',
                inflationAdjustment: {
                    pessimistic: -1,
                    base: 0,
                    optimistic: 1
                },
                examples: ['Срочные вклады', 'ММФ', 'Краткосрочные ОФЗ']
            },
            realty: {
                name: 'Недвижимость',
                icon: '🏠',
                color: '#7c3aed',
                description: 'Прямые инвестиции в недвижимость',
                riskLevel: 'medium',
                liquidity: 'low',
                inflationAdjustment: {
                    pessimistic: -4,
                    base: 0,
                    optimistic: 2
                },
                examples: ['Жилая недвижимость', 'Коммерческая недвижимость', 'REITs']
            }
        };

        this.riskProfiles = {
            conservative: {
                name: 'Консервативный',
                description: 'Минимальный риск, стабильная доходность',
                allocation: {
                    cash: 50,
                    bonds: 40,
                    stocks: 10,
                    realty: 0
                },
                expectedReturn: 6,
                maxRisk: 15
            },
            balanced: {
                name: 'Сбалансированный',
                description: 'Умеренный риск, стабильный рост',
                allocation: {
                    cash: 20,
                    bonds: 30,
                    stocks: 40,
                    realty: 10
                },
                expectedReturn: 9,
                maxRisk: 25
            },
            aggressive: {
                name: 'Агрессивный',
                description: 'Высокий риск, высокая доходность',
                allocation: {
                    cash: 5,
                    bonds: 15,
                    stocks: 65,
                    realty: 15
                },
                expectedReturn: 13,
                maxRisk: 40
            }
        };

        this.correlations = {
            // Корреляционная матрица между типами активов (упрощенная)
            stocks: { stocks: 1.0, bonds: -0.2, cash: 0.1, realty: 0.3 },
            bonds: { stocks: -0.2, bonds: 1.0, cash: 0.4, realty: 0.1 },
            cash: { stocks: 0.1, bonds: 0.4, cash: 1.0, realty: 0.0 },
            realty: { stocks: 0.3, bonds: 0.1, cash: 0.0, realty: 1.0 }
        };
    }

    /**
     * Получить информацию о типе актива
     * @param {string} assetType - Тип актива
     * @returns {Object} Информация об активе
     */
    getAssetInfo(assetType) {
        return this.assetTypes[assetType] || null;
    }

    /**
     * Получить все типы активов
     * @returns {Object} Все типы активов
     */
    getAllAssetTypes() {
        return this.assetTypes;
    }

    /**
     * Получить профиль риска
     * @param {string} profileName - Название профиля
     * @returns {Object} Профиль риска
     */
    getRiskProfile(profileName) {
        return this.riskProfiles[profileName] || null;
    }

    /**
     * Получить все профили риска
     * @returns {Object} Все профили риска
     */
    getAllRiskProfiles() {
        return this.riskProfiles;
    }

    /**
     * Создать актив по умолчанию
     * @param {string} assetType - Тип актива
     * @param {number} value - Стоимость
     * @returns {Object} Объект актива
     */
    createDefaultAsset(assetType, value = 0) {
        const assetInfo = this.getAssetInfo(assetType);
        if (!assetInfo) {
            throw new Error(`Unknown asset type: ${assetType}`);
        }

        return {
            id: this.generateAssetId(assetType),
            type: assetType,
            name: `${assetInfo.name} актив`,
            value: value,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Генерация ID для актива
     * @param {string} assetType - Тип актива
     * @returns {string} Уникальный ID
     */
    generateAssetId(assetType) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `${assetType}_${timestamp}_${random}`;
    }

    /**
     * Получить корреляцию между типами активов
     * @param {string} assetType1 - Первый тип актива
     * @param {string} assetType2 - Второй тип актива
     * @returns {number} Коэффициент корреляции
     */
    getCorrelation(assetType1, assetType2) {
        return this.correlations[assetType1]?.[assetType2] || 0;
    }

    /**
     * Валидация распределения активов
     * @param {Object} allocation - Распределение в процентах
     * @returns {Object} Результат валидации
     */
    validateAllocation(allocation) {
        const total = Object.values(allocation).reduce((sum, value) => sum + value, 0);
        const isValid = Math.abs(total - 100) < 0.01; // Допуск на округление

        return {
            isValid,
            total,
            deviation: total - 100,
            message: isValid ? 'Распределение корректно' : `Сумма должна быть 100%, текущая: ${total.toFixed(1)}%`
        };
    }

    /**
     * Получить рекомендации по ребалансировке
     * @param {Object} currentAllocation - Текущее распределение
     * @param {string} targetProfile - Целевой профиль риска
     * @returns {Object} Рекомендации
     */
    getRebalanceRecommendations(currentAllocation, targetProfile) {
        const profile = this.getRiskProfile(targetProfile);
        if (!profile) {
            return { error: 'Unknown risk profile' };
        }

        const recommendations = [];
        const targetAllocation = profile.allocation;

        Object.entries(targetAllocation).forEach(([assetType, targetPercent]) => {
            const currentPercent = currentAllocation[assetType] || 0;
            const difference = targetPercent - currentPercent;

            if (Math.abs(difference) > 5) { // Порог для рекомендации
                recommendations.push({
                    assetType,
                    action: difference > 0 ? 'increase' : 'decrease',
                    currentPercent,
                    targetPercent,
                    difference: Math.abs(difference),
                    priority: this.calculateRebalancePriority(difference, assetType)
                });
            }
        });

        // Сортируем по приоритету
        recommendations.sort((a, b) => b.priority - a.priority);

        return {
            recommendations,
            targetProfile: profile,
            summary: this.generateRebalanceSummary(recommendations)
        };
    }

    /**
     * Расчет приоритета ребалансировки
     * @param {number} difference - Разница в процентах
     * @param {string} assetType - Тип актива
     * @returns {number} Приоритет (чем больше, тем важнее)
     */
    calculateRebalancePriority(difference, assetType) {
        const assetInfo = this.getAssetInfo(assetType);
        const riskMultiplier = {
            'high': 1.2,
            'medium': 1.0,
            'low': 0.8
        };

        return Math.abs(difference) * (riskMultiplier[assetInfo.riskLevel] || 1.0);
    }

    /**
     * Генерация сводки по ребалансировке
     * @param {Array} recommendations - Рекомендации
     * @returns {string} Текстовая сводка
     */
    generateRebalanceSummary(recommendations) {
        if (recommendations.length === 0) {
            return 'Портфель соответствует целевому распределению';
        }

        const increases = recommendations.filter(r => r.action === 'increase');
        const decreases = recommendations.filter(r => r.action === 'decrease');

        let summary = 'Рекомендации по ребалансировке:\n';

        if (increases.length > 0) {
            summary += `Увеличить: ${increases.map(r => this.getAssetInfo(r.assetType).name).join(', ')}\n`;
        }

        if (decreases.length > 0) {
            summary += `Уменьшить: ${decreases.map(r => this.getAssetInfo(r.assetType).name).join(', ')}`;
        }

        return summary;
    }

    /**
     * Получить исторические данные (заготовка для будущего API)
     * @param {string} assetType - Тип актива
     * @param {string} period - Период (1y, 3y, 5y)
     * @returns {Object} Исторические данные
     */
    getHistoricalData(assetType, period = '1y') {
        // Пока возвращаем моковые данные
        // В будущем здесь будет вызов API
        return {
            assetType,
            period,
            data: this.generateMockHistoricalData(assetType, period),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Генерация моковых исторических данных
     */
    generateMockHistoricalData(assetType, period) {
        const assetInfo = this.getAssetInfo(assetType);
        const baseReturn = assetInfo.defaultReturn.base / 100;
        const volatility = {
            'high': 0.25,
            'medium': 0.15,
            'low': 0.05
        }[assetInfo.riskLevel];

        const periodDays = { '1y': 365, '3y': 1095, '5y': 1825 }[period] || 365;
        const data = [];

        let currentValue = 100; // Базовое значение

        for (let i = 0; i < periodDays; i += 30) { // Помесячные данные
            const randomFactor = 1 + (Math.random() - 0.5) * volatility;
            const growthFactor = Math.pow(1 + baseReturn, 30/365);
            currentValue *= growthFactor * randomFactor;

            data.push({
                date: new Date(Date.now() - (periodDays - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                value: Math.round(currentValue * 100) / 100
            });
        }

        return data;
    }
}

// Создаем глобальный экземпляр
window.assetClasses = new AssetClasses();

// Экспортируем класс
window.AssetClasses = AssetClasses;