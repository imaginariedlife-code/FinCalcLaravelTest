/**
 * Calculations - Дополнительные математические и финансовые расчеты
 */
class Calculations {
    constructor() {
        this.DAYS_IN_YEAR = 365;
        this.MONTHS_IN_YEAR = 12;
    }

    /**
     * Сложные проценты
     * @param {number} principal - Основная сумма
     * @param {number} rate - Годовая процентная ставка (в процентах)
     * @param {number} time - Время в годах
     * @param {number} compoundFreq - Частота капитализации в год
     * @returns {number} Итоговая сумма
     */
    compoundInterest(principal, rate, time, compoundFreq = 1) {
        const rateDecimal = rate / 100;
        return principal * Math.pow(1 + rateDecimal / compoundFreq, compoundFreq * time);
    }

    /**
     * Аннуитетный платеж
     * @param {number} principal - Основная сумма займа
     * @param {number} rate - Годовая процентная ставка (в процентах)
     * @param {number} periods - Количество периодов
     * @returns {number} Размер аннуитетного платежа
     */
    annuityPayment(principal, rate, periods) {
        if (rate === 0) return principal / periods;

        const monthlyRate = rate / 100 / this.MONTHS_IN_YEAR;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, periods)) /
               (Math.pow(1 + monthlyRate, periods) - 1);
    }

    /**
     * Приведенная стоимость (Present Value)
     * @param {number} futureValue - Будущая стоимость
     * @param {number} rate - Дисконтная ставка (в процентах)
     * @param {number} periods - Количество периодов
     * @returns {number} Приведенная стоимость
     */
    presentValue(futureValue, rate, periods) {
        const rateDecimal = rate / 100;
        return futureValue / Math.pow(1 + rateDecimal, periods);
    }

    /**
     * Будущая стоимость (Future Value)
     * @param {number} presentValue - Текущая стоимость
     * @param {number} rate - Процентная ставка (в процентах)
     * @param {number} periods - Количество периодов
     * @returns {number} Будущая стоимость
     */
    futureValue(presentValue, rate, periods) {
        const rateDecimal = rate / 100;
        return presentValue * Math.pow(1 + rateDecimal, periods);
    }

    /**
     * Внутренняя норма доходности (IRR) - упрощенный расчет
     * @param {Array} cashFlows - Массив денежных потоков
     * @returns {number} IRR в процентах
     */
    irr(cashFlows) {
        // Метод Ньютона для поиска IRR
        let guess = 0.1; // Начальное предположение 10%
        const tolerance = 0.000001;
        const maxIterations = 100;

        for (let i = 0; i < maxIterations; i++) {
            const npv = this.npv(cashFlows, guess * 100);
            const npvDerivative = this.npvDerivative(cashFlows, guess);

            if (Math.abs(npv) < tolerance) {
                return guess * 100;
            }

            const newGuess = guess - npv / npvDerivative;
            if (Math.abs(newGuess - guess) < tolerance) {
                return newGuess * 100;
            }

            guess = newGuess;
        }

        return null; // Не удалось найти IRR
    }

    /**
     * Чистая приведенная стоимость (NPV)
     * @param {Array} cashFlows - Массив денежных потоков
     * @param {number} discountRate - Дисконтная ставка (в процентах)
     * @returns {number} NPV
     */
    npv(cashFlows, discountRate) {
        const rate = discountRate / 100;
        return cashFlows.reduce((sum, flow, index) => {
            return sum + flow / Math.pow(1 + rate, index);
        }, 0);
    }

    /**
     * Производная NPV (для расчета IRR)
     * @param {Array} cashFlows - Массив денежных потоков
     * @param {number} rate - Ставка (в долях)
     * @returns {number} Производная NPV
     */
    npvDerivative(cashFlows, rate) {
        return cashFlows.reduce((sum, flow, index) => {
            if (index === 0) return sum;
            return sum - index * flow / Math.pow(1 + rate, index + 1);
        }, 0);
    }

    /**
     * Коэффициент Шарпа
     * @param {number} portfolioReturn - Доходность портфеля (в процентах)
     * @param {number} riskFreeRate - Безрисковая ставка (в процентах)
     * @param {number} volatility - Волатильность портфеля (в процентах)
     * @returns {number} Коэффициент Шарпа
     */
    sharpeRatio(portfolioReturn, riskFreeRate, volatility) {
        if (volatility === 0) return 0;
        return (portfolioReturn - riskFreeRate) / volatility;
    }

    /**
     * Бета коэффициент
     * @param {Array} assetReturns - Доходности актива
     * @param {Array} marketReturns - Доходности рынка
     * @returns {number} Бета коэффициент
     */
    beta(assetReturns, marketReturns) {
        if (assetReturns.length !== marketReturns.length) {
            throw new Error('Arrays must have the same length');
        }

        const covariance = this.covariance(assetReturns, marketReturns);
        const marketVariance = this.variance(marketReturns);

        return marketVariance === 0 ? 0 : covariance / marketVariance;
    }

    /**
     * Ковариация
     * @param {Array} x - Первый массив значений
     * @param {Array} y - Второй массив значений
     * @returns {number} Ковариация
     */
    covariance(x, y) {
        const meanX = this.mean(x);
        const meanY = this.mean(y);
        const n = x.length;

        return x.reduce((sum, xi, i) => {
            return sum + (xi - meanX) * (y[i] - meanY);
        }, 0) / (n - 1);
    }

    /**
     * Дисперсия
     * @param {Array} values - Массив значений
     * @returns {number} Дисперсия
     */
    variance(values) {
        const meanValue = this.mean(values);
        const n = values.length;

        return values.reduce((sum, value) => {
            return sum + Math.pow(value - meanValue, 2);
        }, 0) / (n - 1);
    }

    /**
     * Стандартное отклонение
     * @param {Array} values - Массив значений
     * @returns {number} Стандартное отклонение
     */
    standardDeviation(values) {
        return Math.sqrt(this.variance(values));
    }

    /**
     * Среднее значение
     * @param {Array} values - Массив значений
     * @returns {number} Среднее значение
     */
    mean(values) {
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    /**
     * Корреляция
     * @param {Array} x - Первый массив значений
     * @param {Array} y - Второй массив значений
     * @returns {number} Коэффициент корреляции
     */
    correlation(x, y) {
        const covar = this.covariance(x, y);
        const stdX = this.standardDeviation(x);
        const stdY = this.standardDeviation(y);

        return (stdX === 0 || stdY === 0) ? 0 : covar / (stdX * stdY);
    }

    /**
     * Value at Risk (VaR) - упрощенный расчет
     * @param {Array} returns - Массив доходностей
     * @param {number} confidence - Уровень доверия (например, 0.95)
     * @returns {number} VaR
     */
    valueAtRisk(returns, confidence = 0.95) {
        const sortedReturns = [...returns].sort((a, b) => a - b);
        const index = Math.floor((1 - confidence) * sortedReturns.length);
        return sortedReturns[index] || 0;
    }

    /**
     * Максимальная просадка
     * @param {Array} values - Массив стоимостей портфеля
     * @returns {Object} Объект с информацией о просадке
     */
    maxDrawdown(values) {
        let maxValue = values[0];
        let maxDrawdown = 0;
        let maxDrawdownStart = 0;
        let maxDrawdownEnd = 0;
        let currentDrawdownStart = 0;

        for (let i = 1; i < values.length; i++) {
            if (values[i] > maxValue) {
                maxValue = values[i];
                currentDrawdownStart = i;
            } else {
                const drawdown = (maxValue - values[i]) / maxValue;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                    maxDrawdownStart = currentDrawdownStart;
                    maxDrawdownEnd = i;
                }
            }
        }

        return {
            maxDrawdown: maxDrawdown * 100, // В процентах
            startIndex: maxDrawdownStart,
            endIndex: maxDrawdownEnd,
            startValue: values[maxDrawdownStart],
            endValue: values[maxDrawdownEnd],
            duration: maxDrawdownEnd - maxDrawdownStart
        };
    }

    /**
     * Расчет эффективной границы (упрощенный)
     * @param {Array} assets - Массив активов с доходностями и рисками
     * @param {Array} weights - Веса активов в портфеле
     * @returns {Object} Ожидаемая доходность и риск портфеля
     */
    portfolioMetrics(assets, weights) {
        if (assets.length !== weights.length) {
            throw new Error('Assets and weights arrays must have the same length');
        }

        // Ожидаемая доходность портфеля
        const expectedReturn = assets.reduce((sum, asset, i) => {
            return sum + asset.expectedReturn * weights[i];
        }, 0);

        // Упрощенный расчет риска (без корреляций)
        const portfolioRisk = Math.sqrt(
            assets.reduce((sum, asset, i) => {
                return sum + Math.pow(weights[i] * asset.risk, 2);
            }, 0)
        );

        return {
            expectedReturn: expectedReturn * 100, // В процентах
            risk: portfolioRisk * 100, // В процентах
            sharpeRatio: this.sharpeRatio(expectedReturn * 100, 4, portfolioRisk * 100)
        };
    }

    /**
     * Реальная доходность с учетом инфляции
     * @param {number} nominalReturn - Номинальная доходность (в процентах)
     * @param {number} inflationRate - Уровень инфляции (в процентах)
     * @returns {number} Реальная доходность (в процентах)
     */
    realReturn(nominalReturn, inflationRate) {
        return ((1 + nominalReturn / 100) / (1 + inflationRate / 100) - 1) * 100;
    }

    /**
     * Правило 72 - время удвоения капитала
     * @param {number} rate - Годовая процентная ставка (в процентах)
     * @returns {number} Количество лет для удвоения
     */
    ruleOf72(rate) {
        return rate > 0 ? 72 / rate : Infinity;
    }

    /**
     * Расчет необходимой суммы для пенсии
     * @param {number} monthlyNeed - Ежемесячная потребность
     * @param {number} years - Количество лет пенсии
     * @param {number} inflationRate - Уровень инфляции (в процентах)
     * @param {number} withdrawalRate - Ставка изъятия (в процентах)
     * @returns {Object} Расчеты для пенсии
     */
    retirementCalculation(monthlyNeed, years, inflationRate, withdrawalRate = 4) {
        const annualNeed = monthlyNeed * 12;

        // Правило 4% - безопасная ставка изъятия
        const neededCapital = annualNeed / (withdrawalRate / 100);

        // С учетом инфляции
        const inflationAdjustedNeed = annualNeed * Math.pow(1 + inflationRate / 100, years);
        const inflationAdjustedCapital = inflationAdjustedNeed / (withdrawalRate / 100);

        return {
            currentNeeds: {
                monthly: monthlyNeed,
                annual: annualNeed,
                capitalNeeded: neededCapital
            },
            futureNeeds: {
                monthly: monthlyNeed * Math.pow(1 + inflationRate / 100, years),
                annual: inflationAdjustedNeed,
                capitalNeeded: inflationAdjustedCapital
            },
            inflationImpact: {
                totalInflation: (Math.pow(1 + inflationRate / 100, years) - 1) * 100,
                additionalCapitalNeeded: inflationAdjustedCapital - neededCapital
            }
        };
    }

    /**
     * Генерация случайных сценариев (Монте-Карло симуляция, упрощенная)
     * @param {Object} params - Параметры симуляции
     * @returns {Array} Массив сценариев
     */
    monteCarloSimulation(params) {
        const {
            initialValue,
            meanReturn,
            volatility,
            years,
            simulations = 1000
        } = params;

        const scenarios = [];

        for (let sim = 0; sim < simulations; sim++) {
            const scenario = [];
            let currentValue = initialValue;

            for (let year = 0; year <= years; year++) {
                scenario.push({
                    year,
                    value: currentValue
                });

                if (year < years) {
                    // Генерируем случайную доходность (нормальное распределение)
                    const randomReturn = this.normalRandom(meanReturn / 100, volatility / 100);
                    currentValue *= (1 + randomReturn);
                }
            }

            scenarios.push(scenario);
        }

        return scenarios;
    }

    /**
     * Генерация случайного числа с нормальным распределением (Box-Muller)
     * @param {number} mean - Среднее значение
     * @param {number} stdDev - Стандартное отклонение
     * @returns {number} Случайное число
     */
    normalRandom(mean = 0, stdDev = 1) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * stdDev + mean;
    }

    /**
     * Статистика по результатам Монте-Карло
     * @param {Array} scenarios - Результаты симуляции
     * @param {number} targetYear - Целевой год для анализа
     * @returns {Object} Статистические показатели
     */
    monteCarloStats(scenarios, targetYear) {
        const finalValues = scenarios.map(scenario =>
            scenario.find(point => point.year === targetYear)?.value || 0
        );

        finalValues.sort((a, b) => a - b);

        return {
            mean: this.mean(finalValues),
            median: finalValues[Math.floor(finalValues.length / 2)],
            min: Math.min(...finalValues),
            max: Math.max(...finalValues),
            stdDev: this.standardDeviation(finalValues),
            percentiles: {
                p10: finalValues[Math.floor(finalValues.length * 0.1)],
                p25: finalValues[Math.floor(finalValues.length * 0.25)],
                p75: finalValues[Math.floor(finalValues.length * 0.75)],
                p90: finalValues[Math.floor(finalValues.length * 0.9)]
            },
            probabilityOfLoss: finalValues.filter(v => v < scenarios[0][0].value).length / finalValues.length * 100
        };
    }
}

// Создаем глобальный экземпляр
window.calculations = new Calculations();

// Экспортируем класс
window.Calculations = Calculations;