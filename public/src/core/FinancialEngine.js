/**
 * FinancialEngine - Основной вычислительный движок
 * Содержит всю логику финансовых расчетов
 */
class FinancialEngine {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Расчет проекций портфеля по сценариям
     * @param {Object} portfolio - Портфель активов и обязательств
     * @param {Object} scenarios - Сценарии доходности
     * @param {Object} settings - Настройки расчета
     * @returns {Object} Проекции по всем сценариям
     */
    calculateProjections(portfolio, scenarios, settings) {
        const cacheKey = this.getCacheKey(portfolio, scenarios, settings);

        if (this.cache.has(cacheKey)) {
            console.log('FinancialEngine: Using cached results');
            return this.cache.get(cacheKey);
        }

        console.log('FinancialEngine: Calculating new projections');

        const projections = {
            pessimistic: this.calculateScenarioProjection(portfolio, scenarios, 'pessimistic', settings),
            base: this.calculateScenarioProjection(portfolio, scenarios, 'base', settings),
            optimistic: this.calculateScenarioProjection(portfolio, scenarios, 'optimistic', settings)
        };

        // Кэшируем результат
        this.cache.set(cacheKey, projections);

        return projections;
    }

    /**
     * Расчет проекции для конкретного сценария
     * @param {Object} portfolio - Портфель активов
     * @param {Object} scenarios - Сценарии доходности
     * @param {string} scenarioType - Тип сценария (pessimistic, base, optimistic)
     * @param {Object} settings - Настройки расчета
     * @returns {Array} Массив данных по годам
     */
    calculateScenarioProjection(portfolio, scenarios, scenarioType, settings) {
        const years = [];
        const inflationRate = settings.inflation / 100;

        // Группируем активы по типам
        const assetsByType = this.groupAssetsByType(portfolio.assets || []);

        // Обязательства остаются постоянными по сценариям, но уменьшаются со временем
        const liabilities = portfolio.liabilities || [];

        console.log(`FinancialEngine ${scenarioType} calculation:`, {
            assetsCount: portfolio.assets?.length,
            liabilitiesCount: liabilities.length,
            totalLiabilities: portfolio.totalLiabilities
        });

        for (let year = 0; year <= settings.horizonYears; year++) {
            const yearData = {
                year,
                nominal: 0,
                real: 0,
                breakdown: {},
                liabilities: 0,
                netWorth: 0
            };

            // Расчет стоимости каждого типа активов
            Object.entries(assetsByType).forEach(([assetType, assets]) => {
                // Получаем поправку к инфляции для данного типа активов
                const assetInfo = window.assetClasses?.getAssetInfo(assetType);
                const inflationAdjustment = assetInfo?.inflationAdjustment?.[scenarioType] || 0;

                // Рассчитываем итоговую доходность: инфляция + поправка
                const returnRate = this.calculateInflationAdjustedReturn(inflationRate * 100, inflationAdjustment);
                const typeValue = this.calculateAssetTypeValue(assets, returnRate, year);

                yearData.breakdown[assetType] = typeValue;
                yearData.nominal += typeValue;
            });

            // Расчет остатков обязательств
            yearData.liabilities = this.calculateLiabilitiesValue(liabilities, year);
            if (year === 0) console.log(`Year ${year} liabilities:`, yearData.liabilities);

            // Чистая стоимость = активы - обязательства
            yearData.netWorth = yearData.nominal - yearData.liabilities;

            // Расчет реальной стоимости с учетом инфляции
            const inflationFactor = Math.pow(1 + inflationRate, year);
            yearData.real = yearData.netWorth / inflationFactor;

            years.push(yearData);
        }

        return years;
    }

    /**
     * Группировка активов по типам
     * @param {Array} assets - Массив активов
     * @returns {Object} Активы, сгруппированные по типам
     */
    groupAssetsByType(assets) {
        return assets.reduce((groups, asset) => {
            if (!groups[asset.type]) {
                groups[asset.type] = [];
            }
            groups[asset.type].push(asset);
            return groups;
        }, {});
    }

    /**
     * Расчет стоимости активов определенного типа через N лет
     * @param {Array} assets - Активы одного типа
     * @param {number} returnRate - Годовая доходность в процентах
     * @param {number} years - Количество лет
     * @returns {number} Стоимость через N лет
     */
    calculateAssetTypeValue(assets, returnRate, years) {
        const totalValue = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
        const growthFactor = Math.pow(1 + returnRate / 100, years);
        return totalValue * growthFactor;
    }

    /**
     * Расчет доходности с учетом инфляции
     * @param {number} inflationRate - Инфляция в процентах
     * @param {number} adjustment - Поправка к инфляции
     * @returns {number} Итоговая доходность в процентах
     */
    calculateInflationAdjustedReturn(inflationRate, adjustment) {
        return inflationRate + adjustment;
    }

    /**
     * Расчет ключевых метрик портфеля
     * @param {Object} portfolio - Портфель активов
     * @param {Object} projections - Проекции по сценариям
     * @param {Object} settings - Настройки
     * @returns {Object} Ключевые метрики
     */
    calculateMetrics(portfolio, projections, settings) {
        const currentValue = portfolio.totalValue || 0;
        const futureValueBase = projections.base[projections.base.length - 1]?.nominal || 0;

        // Среднегодовой рост
        const growthRate = currentValue > 0 && settings.horizonYears > 0
            ? (Math.pow(futureValueBase / currentValue, 1 / settings.horizonYears) - 1) * 100
            : 0;

        // Волатильность (упрощенный расчет на основе разброса сценариев)
        const finalYear = settings.horizonYears;
        const pessimisticValue = projections.pessimistic[finalYear]?.nominal || 0;
        const optimisticValue = projections.optimistic[finalYear]?.nominal || 0;
        const volatility = currentValue > 0
            ? ((optimisticValue - pessimisticValue) / (2 * currentValue)) * 100
            : 0;

        // Коэффициент Шарпа (упрощенный)
        const riskFreeRate = 4; // Условная безрисковая ставка
        const sharpeRatio = volatility > 0 ? (growthRate - riskFreeRate) / volatility : 0;

        // Максимальная просадка (упрощенный расчет)
        const maxDrawdown = this.calculateMaxDrawdown(projections.pessimistic);

        // Risk Score (от 1 до 10)
        const riskScore = this.calculateRiskScore(portfolio, volatility);

        return {
            currentValue,
            futureValue: {
                pessimistic: pessimisticValue,
                base: futureValueBase,
                optimistic: optimisticValue
            },
            growthRate,
            volatility,
            sharpeRatio,
            maxDrawdown,
            riskScore
        };
    }

    /**
     * Расчет максимальной просадки
     * @param {Array} projections - Проекции по годам
     * @returns {number} Максимальная просадка в процентах
     */
    calculateMaxDrawdown(projections) {
        let maxValue = 0;
        let maxDrawdown = 0;

        projections.forEach(yearData => {
            const value = yearData.nominal;
            maxValue = Math.max(maxValue, value);

            if (maxValue > 0) {
                const drawdown = ((maxValue - value) / maxValue) * 100;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        });

        return maxDrawdown;
    }

    /**
     * Расчет риск-скора портфеля
     * @param {Object} portfolio - Портфель активов
     * @param {number} volatility - Волатильность
     * @returns {number} Риск-скор от 1 до 10
     */
    calculateRiskScore(portfolio, volatility) {
        if (!portfolio.assets || portfolio.assets.length === 0) return 1;

        // Базовый риск на основе типов активов
        const assetRiskWeights = {
            cash: 1,
            bonds: 2,
            realty: 4,
            stocks: 6
        };

        const totalValue = portfolio.totalValue || 1;
        let weightedRisk = 0;

        portfolio.assets.forEach(asset => {
            const weight = (asset.value || 0) / totalValue;
            const assetRisk = assetRiskWeights[asset.type] || 3;
            weightedRisk += weight * assetRisk;
        });

        // Корректируем на основе волатильности
        const volatilityAdjustment = Math.min(volatility / 20, 2); // Максимум +2 к риску

        return Math.min(Math.max(Math.round(weightedRisk + volatilityAdjustment), 1), 10);
    }

    /**
     * Расчет диверсификации портфеля
     * @param {Object} portfolio - Портфель активов
     * @returns {Object} Показатели диверсификации
     */
    calculateDiversification(portfolio) {
        if (!portfolio.assets || portfolio.assets.length === 0) {
            return { score: 0, distribution: {}, concentration: 100 };
        }

        const totalValue = portfolio.totalValue || 0;
        const distribution = {};

        // Группируем по типам активов
        portfolio.assets.forEach(asset => {
            if (!distribution[asset.type]) {
                distribution[asset.type] = 0;
            }
            distribution[asset.type] += (asset.value || 0);
        });

        // Конвертируем в проценты
        Object.keys(distribution).forEach(type => {
            distribution[type] = totalValue > 0 ? (distribution[type] / totalValue) * 100 : 0;
        });

        // Индекс Херфиндаля-Хиршмана (концентрация)
        const hhi = Object.values(distribution).reduce((sum, percentage) => {
            return sum + Math.pow(percentage, 2);
        }, 0);

        // Скор диверсификации (инвертированная концентрация)
        const diversificationScore = Math.max(0, 100 - (hhi / 100));

        return {
            score: Math.round(diversificationScore),
            distribution,
            concentration: Math.round(hhi / 100),
            typesCount: Object.keys(distribution).length
        };
    }

    /**
     * Генерация ключа для кэширования
     * @param {Object} portfolio - Портфель
     * @param {Object} scenarios - Сценарии
     * @param {Object} settings - Настройки
     * @returns {string} Ключ кэша
     */
    getCacheKey(portfolio, scenarios, settings) {
        const data = {
            assets: portfolio.assets?.map(a => ({ type: a.type, value: a.value })) || [],
            liabilities: portfolio.liabilities?.map(l => ({
                type: l.type,
                principal: l.principal,
                rate: l.rate,
                termYears: l.termYears
            })) || [],
            scenarios: scenarios.returnRates,
            horizon: settings.horizonYears,
            inflation: settings.inflation
        };
        return JSON.stringify(data);
    }

    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Размер кэша
     */
    getCacheSize() {
        return this.cache.size;
    }

    /**
     * Создание копии портфеля с модификациями (для будущего сравнения стратегий)
     * @param {Object} basePortfolio - Базовый портфель
     * @param {Array} modifications - Массив модификаций
     * @returns {Object} Модифицированный портфель
     */
    applyModifications(basePortfolio, modifications) {
        const modifiedPortfolio = JSON.parse(JSON.stringify(basePortfolio));

        modifications.forEach(mod => {
            switch (mod.action) {
                case 'sell':
                    this.sellAsset(modifiedPortfolio, mod);
                    break;
                case 'buy':
                    this.buyAsset(modifiedPortfolio, mod);
                    break;
                case 'rebalance':
                    this.rebalancePortfolio(modifiedPortfolio, mod);
                    break;
            }
        });

        // Пересчитываем общую стоимость
        modifiedPortfolio.totalValue = modifiedPortfolio.assets.reduce(
            (sum, asset) => sum + (asset.value || 0), 0
        );

        return modifiedPortfolio;
    }

    /**
     * Продажа актива
     */
    sellAsset(portfolio, modification) {
        const asset = portfolio.assets.find(a => a.id === modification.assetId);
        if (asset) {
            const sellAmount = (asset.value * modification.percentage) / 100;
            asset.value -= sellAmount;
            if (asset.value <= 0) {
                portfolio.assets = portfolio.assets.filter(a => a.id !== modification.assetId);
            }
        }
    }

    /**
     * Покупка актива
     */
    buyAsset(portfolio, modification) {
        const existingAsset = portfolio.assets.find(a => a.type === modification.assetType);

        if (existingAsset) {
            existingAsset.value += modification.amount;
        } else {
            portfolio.assets.push({
                id: `asset_${Date.now()}`,
                type: modification.assetType,
                name: `${modification.assetType} актив`,
                value: modification.amount
            });
        }
    }

    /**
     * Ребалансировка портфеля
     */
    rebalancePortfolio(portfolio, modification) {
        const totalValue = portfolio.totalValue;
        const targetAllocation = modification.allocation; // { stocks: 60, bonds: 40 }

        // Очищаем текущий портфель
        portfolio.assets = [];

        // Создаем новые активы согласно целевому распределению
        Object.entries(targetAllocation).forEach(([assetType, percentage]) => {
            const value = (totalValue * percentage) / 100;
            if (value > 0) {
                portfolio.assets.push({
                    id: `asset_${assetType}_${Date.now()}`,
                    type: assetType,
                    name: `${assetType} (${percentage}%)`,
                    value
                });
            }
        });
    }

    /**
     * Расчет общей стоимости обязательств через N лет
     * @param {Array} liabilities - Массив обязательств
     * @param {number} years - Количество лет
     * @returns {number} Общая стоимость обязательств
     */
    calculateLiabilitiesValue(liabilities, years) {
        if (!liabilities || liabilities.length === 0) {
            return 0;
        }

        return liabilities.reduce((totalLiabilities, liability) => {
            if (!window.liabilityClasses) {
                return totalLiabilities + (liability.currentBalance || 0);
            }

            const remainingBalance = window.liabilityClasses.calculateRemainingBalance(liability, years);
            return totalLiabilities + remainingBalance;
        }, 0);
    }

    /**
     * Обновление метрик с учетом обязательств
     * @param {Object} portfolio - Портфель активов и обязательств
     * @param {Object} projections - Проекции по сценариям
     * @param {Object} settings - Настройки
     * @returns {Object} Ключевые метрики
     */
    calculateMetricsWithLiabilities(portfolio, projections, settings) {
        const currentAssets = portfolio.totalValue || 0;
        const currentLiabilities = this.calculateLiabilitiesValue(portfolio.liabilities || [], 0);
        const currentNetWorth = currentAssets - currentLiabilities;

        const futureNetWorthBase = projections.base[projections.base.length - 1]?.netWorth || 0;

        // Среднегодовой рост чистой стоимости
        const growthRate = currentNetWorth > 0 && settings.horizonYears > 0
            ? (Math.pow(Math.abs(futureNetWorthBase) / Math.abs(currentNetWorth), 1 / settings.horizonYears) - 1) * 100
            : 0;

        // Волатильность на основе чистой стоимости
        const finalYear = settings.horizonYears;
        const pessimisticNetWorth = projections.pessimistic[finalYear]?.netWorth || 0;
        const optimisticNetWorth = projections.optimistic[finalYear]?.netWorth || 0;
        const volatility = currentNetWorth > 0
            ? ((optimisticNetWorth - pessimisticNetWorth) / (2 * Math.abs(currentNetWorth))) * 100
            : 0;

        return {
            currentAssets,
            currentLiabilities,
            currentNetWorth,
            futureNetWorth: {
                pessimistic: pessimisticNetWorth,
                base: futureNetWorthBase,
                optimistic: optimisticNetWorth
            },
            growthRate,
            volatility,
            debtToAssetsRatio: currentAssets > 0 ? (currentLiabilities / currentAssets) * 100 : 0
        };
    }

    /**
     * Расчет детальных проекций по каждому активу
     * @param {Object} portfolio - Портфель активов и обязательств
     * @param {Object} scenarios - Сценарии доходности
     * @param {Object} settings - Настройки расчета
     * @returns {Object} Детализированные проекции по активам и обязательствам
     */
    calculateDetailedProjections(portfolio, scenarios, settings) {
        console.log('FinancialEngine: Calculating detailed projections');

        const result = {
            assets: {},
            liabilities: {
                pessimistic: [],
                base: [],
                optimistic: []
            }
        };

        // Расчет по каждому активу
        if (portfolio.assets && portfolio.assets.length > 0) {
            console.log('Processing assets:', portfolio.assets.length);
            portfolio.assets.forEach((asset, index) => {
                const assetId = asset.id || `asset_${index}`;
                console.log(`Processing asset ${index}:`, asset);

                result.assets[assetId] = {
                    name: asset.name || `Актив ${index + 1}`,
                    type: asset.type,
                    value: asset.value || 0,
                    pessimistic: this.calculateAssetProjection(asset, scenarios, 'pessimistic', settings),
                    base: this.calculateAssetProjection(asset, scenarios, 'base', settings),
                    optimistic: this.calculateAssetProjection(asset, scenarios, 'optimistic', settings)
                };

                console.log(`Asset ${assetId} projections:`, result.assets[assetId]);
            });
        }

        // Расчет проекций обязательств
        if (portfolio.liabilities && portfolio.liabilities.length > 0) {
            // Обязательства одинаковы во всех сценариях (зависят только от времени)
            const liabilityProjections = this.calculateLiabilitiesProjection(portfolio.liabilities, settings);
            result.liabilities.pessimistic = liabilityProjections;
            result.liabilities.base = liabilityProjections;
            result.liabilities.optimistic = liabilityProjections;
        } else {
            // Пустые массивы если нет обязательств
            for (let year = 0; year <= settings.horizonYears; year++) {
                const yearData = { year, value: 0 };
                result.liabilities.pessimistic.push(yearData);
                result.liabilities.base.push(yearData);
                result.liabilities.optimistic.push(yearData);
            }
        }

        return result;
    }

    /**
     * Расчет проекции для отдельного актива
     * @param {Object} asset - Актив
     * @param {Object} scenarios - Сценарии доходности
     * @param {string} scenarioType - Тип сценария
     * @param {Object} settings - Настройки
     * @returns {Array} Проекция актива по годам
     */
    calculateAssetProjection(asset, scenarios, scenarioType, settings) {
        const projection = [];
        const returnRate = (scenarios.returnRates[asset.type]?.[scenarioType] || 0) / 100;
        const inflationRate = settings.inflation / 100;

        let currentValue = asset.value || 0;

        for (let year = 0; year <= settings.horizonYears; year++) {
            const nominalValue = year === 0 ? currentValue : currentValue * Math.pow(1 + returnRate, year);
            const realValue = nominalValue / Math.pow(1 + inflationRate, year);

            projection.push({
                year,
                nominal: Math.round(nominalValue),
                real: Math.round(realValue),
                value: settings.showRealValues ? realValue : nominalValue
            });
        }

        return projection;
    }

    /**
     * Расчет проекции обязательств
     * @param {Array} liabilities - Массив обязательств
     * @param {Object} settings - Настройки
     * @returns {Array} Проекция обязательств по годам
     */
    calculateLiabilitiesProjection(liabilities, settings) {
        const projection = [];

        for (let year = 0; year <= settings.horizonYears; year++) {
            let totalLiabilities = 0;

            liabilities.forEach(liability => {
                const yearsPassed = year;
                const monthsPassed = yearsPassed * 12;
                const totalMonths = liability.termYears * 12;

                if (monthsPassed < totalMonths) {
                    // Рассчитываем остаток долга
                    const monthlyRate = liability.rate / 100 / 12;
                    const remainingBalance = this.calculateRemainingBalance(
                        liability.principal,
                        monthlyRate,
                        totalMonths,
                        monthsPassed
                    );
                    totalLiabilities += remainingBalance;
                }
            });

            projection.push({
                year,
                value: Math.round(totalLiabilities)
            });
        }

        return projection;
    }

    /**
     * Расчет остатка долга по аннуитетной формуле
     * @param {number} principal - Основная сумма
     * @param {number} monthlyRate - Месячная ставка
     * @param {number} totalMonths - Общее количество месяцев
     * @param {number} paidMonths - Количество оплаченных месяцев
     * @returns {number} Остаток долга
     */
    calculateRemainingBalance(principal, monthlyRate, totalMonths, paidMonths) {
        if (monthlyRate === 0) {
            return principal * (1 - paidMonths / totalMonths);
        }

        const monthlyPayment = principal *
            (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
            (Math.pow(1 + monthlyRate, totalMonths) - 1);

        const remainingBalance = principal * Math.pow(1 + monthlyRate, paidMonths) -
            monthlyPayment * (Math.pow(1 + monthlyRate, paidMonths) - 1) / monthlyRate;

        return Math.max(0, remainingBalance);
    }
}

// Создаем глобальный экземпляр
window.financialEngine = new FinancialEngine();

// Проверяем, что все методы доступны
console.log('FinancialEngine methods available:', {
    calculateProjections: typeof window.financialEngine.calculateProjections,
    calculateDetailedProjections: typeof window.financialEngine.calculateDetailedProjections,
    calculateMetrics: typeof window.financialEngine.calculateMetrics
});

// Экспортируем класс
window.FinancialEngine = FinancialEngine;