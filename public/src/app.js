/**
 * Main Application - Alpine.js компонент
 * Связывает все модули в единое приложение
 */
function finCalcApp() {
    return {
        // Состояние приложения
        isLoading: true,
        chartType: 'scenarios',
        activeTab: 'portfolio', // 'portfolio' | 'assets'
        selectedScenario: 'base', // 'pessimistic' | 'base' | 'optimistic'
        showAllMobileYears: false, // Для мобильного отображения всех лет
        showAddAsset: false,
        showAddLiability: false,
        showSettings: false,
        selectedAssetIndex: null,
        selectedLiabilityIndex: null,

        // Данные
        portfolio: {
            id: 'default',
            name: 'Мой портфель',
            assets: [],
            liabilities: [],
            totalValue: 0,
            totalLiabilities: 0,
            netWorth: 0
        },

        settings: {
            horizonYears: 10,
            inflation: 6.0,
            showRealValues: false
        },

        scenarios: {
            returnRates: {
                stocks: { pessimistic: 5, base: 12, optimistic: 20 },
                bonds: { pessimistic: 3, base: 8, optimistic: 12 },
                cash: { pessimistic: 4, base: 7, optimistic: 10 },
                realty: { pessimistic: 0, base: 5, optimistic: 12 }
            }
        },

        // Вычисленные данные
        projections: {
            pessimistic: [],
            base: [],
            optimistic: [],
            future: { pessimistic: 0, base: 0, optimistic: 0 },
            growthRate: 0,
            riskScore: 1
        },

        // Детальные проекции по активам
        detailedProjections: {
            assets: {},
            liabilities: {
                pessimistic: [],
                base: [],
                optimistic: []
            }
        },

        // Инициализация приложения
        async init() {
            console.log('🚀 Initializing FinCalc 2.0...');

            try {
                // Проверяем доступность необходимых методов
                console.log('Checking method availability...');
                console.log('financialEngine.calculateDetailedProjections:', typeof financialEngine?.calculateDetailedProjections);
                console.log('chartManager.createAssetComparisonChart:', typeof chartManager?.createAssetComparisonChart);

                // Загружаем данные
                await this.loadData();

                // Инициализируем графики
                this.initializeCharts();

                // Подписываемся на события
                this.setupEventListeners();

                // Выполняем первоначальные расчеты
                this.calculate();

                this.isLoading = false;
                console.log('✅ FinCalc 2.0 initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize FinCalc:', error);
                this.isLoading = false;
            }
        },

        // Загрузка данных
        async loadData() {
            try {
                const data = await dataManager.loadData();

                this.portfolio = data.portfolio;
                this.settings = data.settings;
                this.scenarios = data.scenarios;

                // Убеждаемся, что массив обязательств существует
                if (!this.portfolio.liabilities) {
                    this.portfolio.liabilities = [];
                }

                // Обновляем общую стоимость портфеля
                this.updatePortfolioValue();

                eventBus.emit('data:loaded', data);
            } catch (error) {
                console.error('Error loading data:', error);
                // Используем дефолтные данные если загрузка не удалась
            }
        },

        // Сохранение данных
        async saveData() {
            try {
                const data = {
                    portfolio: this.portfolio,
                    settings: this.settings,
                    scenarios: this.scenarios
                };

                await dataManager.saveData(data);
                eventBus.emit('data:saved', data);
            } catch (error) {
                console.error('Error saving data:', error);
                eventBus.emit('data:error', { type: 'save', error });
            }
        },

        // Настройка слушателей событий
        setupEventListeners() {
            // Автосохранение при изменении данных
            eventBus.on('portfolio:changed', () => {
                console.log('EventBus portfolio:changed triggered');
                this.calculate();
                this.saveData();
            });

            eventBus.on('settings:changed', () => {
                this.calculate();
                this.saveData();
            });

            eventBus.on('scenarios:changed', () => {
                this.calculate();
                this.saveData();
            });

            // Обновление графиков
            eventBus.on('projections:updated', (projections) => {
                this.updateCharts();
            });

            // Обработка ошибок
            eventBus.on('data:error', (error) => {
                console.error('Data error:', error);
                // TODO: Показать уведомление пользователю
            });
        },

        // Инициализация графиков
        initializeCharts() {
            this.$nextTick(() => {
                if (this.$refs.mainChart) {
                    this.updateCharts();
                }
            });
        },

        // Обновление графиков
        updateCharts() {
            console.log('updateCharts called');
            this.$nextTick(() => {
                console.log('updateCharts $nextTick executing');

                // Пробуем несколько способов получить элемент графика
                let chartElement = this.$refs.mainChart;
                if (!chartElement) {
                    console.log('No chart ref found, trying querySelector');
                    chartElement = document.querySelector('canvas[x-ref="mainChart"]');
                }

                if (!chartElement) {
                    console.log('Chart element not found at all, waiting longer...');
                    setTimeout(() => {
                        this.updateCharts();
                    }, 100);
                    return;
                }

                console.log('Chart element found, updating...');
                try {
                    // Always show scenarios chart
                    chartManager.createScenariosChart(
                        chartElement,
                        this.projections,
                        this.settings
                    );
                    console.log('Chart updated successfully');
                } catch (error) {
                    console.error('Error updating charts:', error);
                }
            });
        },

        // Основные расчеты
        calculate() {
            try {
                console.log('Starting calculations...');
                // Обновляем стоимость портфеля
                this.updatePortfolioValue();
                console.log('Portfolio updated:', {
                    assets: this.portfolio.totalValue,
                    liabilities: this.portfolio.totalLiabilities,
                    netWorth: this.portfolio.netWorth
                });

                // Рассчитываем проекции
                console.log('Calculating projections with:', {
                    assets: this.portfolio.totalValue,
                    liabilities: this.portfolio.totalLiabilities,
                    liabilitiesCount: this.portfolio.liabilities?.length
                });

                this.projections = financialEngine.calculateProjections(
                    this.portfolio,
                    this.scenarios,
                    this.settings
                );

                // Рассчитываем метрики с учетом обязательств
                const metrics = this.portfolio.liabilities && this.portfolio.liabilities.length > 0
                    ? financialEngine.calculateMetricsWithLiabilities(
                        this.portfolio,
                        this.projections,
                        this.settings
                    )
                    : financialEngine.calculateMetrics(
                        this.portfolio,
                        this.projections,
                        this.settings
                    );

                // Обновляем будущие значения
                this.projections.future = metrics.futureValue || metrics.futureNetWorth;
                this.projections.growthRate = metrics.growthRate;
                this.projections.riskScore = metrics.riskScore || 1;

                // Принудительно обновляем реактивность для таблицы
                this.projections = { ...this.projections };

                console.log('Projections updated:', {
                    base: this.projections.base?.length,
                    pessimistic: this.projections.pessimistic?.length,
                    optimistic: this.projections.optimistic?.length
                });

                eventBus.emit('projections:updated', this.projections);
            } catch (error) {
                console.error('Error calculating projections:', error);
            }
        },

        // Обновление общей стоимости портфеля
        updatePortfolioValue() {
            this.portfolio.totalValue = this.portfolio.assets.reduce(
                (sum, asset) => sum + (asset.value || 0), 0
            );

            this.portfolio.totalLiabilities = this.portfolio.liabilities.reduce(
                (sum, liability) => sum + (liability.currentBalance || 0), 0
            );

            this.portfolio.netWorth = this.portfolio.totalValue - this.portfolio.totalLiabilities;
        },

        // Добавление актива
        addAsset(assetType) {
            try {
                const newAsset = assetClasses.createDefaultAsset(assetType, 0);
                this.portfolio.assets.push(newAsset);

                // Если находимся на вкладке активов, пересчитываем детальные проекции
                if (this.activeTab === 'assets') {
                    this.calculateDetailedProjections();
                    this.updateAssetChart();
                }

                eventBus.emit('portfolio:changed', this.portfolio);

                // Фокусируемся на поле стоимости нового актива
                this.$nextTick(() => {
                    const inputs = document.querySelectorAll('.asset-value-input');
                    const lastInput = inputs[inputs.length - 1];
                    if (lastInput) lastInput.focus();
                });
            } catch (error) {
                console.error('Error adding asset:', error);
            }
        },

        // Удаление актива
        removeAsset(index) {
            if (index >= 0 && index < this.portfolio.assets.length) {
                this.portfolio.assets.splice(index, 1);

                // Если находимся на вкладке активов, пересчитываем детальные проекции
                if (this.activeTab === 'assets') {
                    this.calculateDetailedProjections();
                    this.updateAssetChart();
                }

                eventBus.emit('portfolio:changed', this.portfolio);
            }
        },

        // === МЕТОДЫ ДЛЯ ОБЯЗАТЕЛЬСТВ ===

        // Добавление обязательства
        addLiability(liabilityType, principal, rate, termYears) {
            try {
                // Убеждаемся, что массив обязательств существует
                if (!this.portfolio.liabilities) {
                    this.portfolio.liabilities = [];
                }

                const newLiability = liabilityClasses.createDefaultLiability(liabilityType, principal, rate, termYears);
                this.portfolio.liabilities.push(newLiability);

                // Немедленно пересчитываем портфель
                this.updatePortfolioValue();
                this.calculate();

                // Принудительно обновляем графики
                this.$nextTick(() => {
                    this.updateCharts();

                    // Если находимся на вкладке активов, пересчитываем детальные проекции
                    if (this.activeTab === 'assets') {
                        this.calculateDetailedProjections();
                        this.updateAssetChart();
                    }
                });

                this.saveData();
                eventBus.emit('portfolio:changed', this.portfolio);

                // Фокусируемся на поле суммы нового обязательства
                this.$nextTick(() => {
                    const inputs = document.querySelectorAll('.liability-principal-input');
                    const lastInput = inputs[inputs.length - 1];
                    if (lastInput) lastInput.focus();
                });
            } catch (error) {
                console.error('Error adding liability:', error);
            }
        },

        // Удаление обязательства
        removeLiability(index) {
            console.log('Removing liability at index:', index, 'Current liabilities:', this.portfolio.liabilities.length);

            if (index >= 0 && index < this.portfolio.liabilities.length) {
                this.portfolio.liabilities.splice(index, 1);
                console.log('Liability removed, remaining:', this.portfolio.liabilities.length);

                // Немедленно пересчитываем портфель
                this.updatePortfolioValue();
                console.log('Portfolio value updated:', this.portfolio.netWorth);

                this.calculate();
                console.log('Calculations completed');

                // Принудительно обновляем графики
                this.$nextTick(() => {
                    console.log('Updating charts...');
                    this.updateCharts();

                    // Если находимся на вкладке активов, пересчитываем детальные проекции
                    if (this.activeTab === 'assets') {
                        this.calculateDetailedProjections();
                        this.updateAssetChart();
                    }
                });

                this.saveData();
                eventBus.emit('portfolio:changed', this.portfolio);
            }
        },

        // Получение иконки обязательства
        getLiabilityIcon(liabilityType) {
            const liabilityInfo = liabilityClasses.getLiabilityInfo(liabilityType);
            return liabilityInfo ? liabilityInfo.icon : '💳';
        },

        // Получение названия типа обязательства
        getLiabilityTypeName(liabilityType) {
            const liabilityInfo = liabilityClasses.getLiabilityInfo(liabilityType);
            return liabilityInfo ? liabilityInfo.name : liabilityType;
        },

        // Получение всех типов обязательств для модального окна
        getAllLiabilityTypes() {
            return liabilityClasses.getAllLiabilityTypes();
        },

        // Получение остатка обязательства через N лет
        getLiabilityBalance(liability, years = 0) {
            return liabilityClasses.calculateRemainingBalance(liability, years);
        },

        // Обновление обязательства с пересчетом портфеля
        updateLiabilityValue(index, field, value) {
            if (this.portfolio.liabilities[index]) {
                this.portfolio.liabilities[index][field] = value;

                // Если изменились параметры кредита, пересчитываем платеж
                if (['principal', 'rate', 'termYears'].includes(field)) {
                    const liability = this.portfolio.liabilities[index];
                    liability.monthlyPayment = liabilityClasses.calculateMonthlyPayment(
                        liability.principal || 0,
                        liability.rate || 0,
                        liability.termYears || 1
                    );
                    liability.currentBalance = liability.principal || 0;
                }

                this.updatePortfolioValue();
                this.calculate();

                // Принудительно обновляем графики
                this.$nextTick(() => {
                    this.updateCharts();

                    // Если находимся на вкладке активов, нужно пересчитать детальные проекции
                    if (this.activeTab === 'assets') {
                        this.calculateDetailedProjections();
                        this.updateAssetChart();
                    }
                });

                this.saveData();
            }
        },

        // === КОНЕЦ МЕТОДОВ ДЛЯ ОБЯЗАТЕЛЬСТВ ===

        // Получение иконки актива
        getAssetIcon(assetType) {
            const assetInfo = assetClasses.getAssetInfo(assetType);
            return assetInfo ? assetInfo.icon : '📊';
        },

        // Получение доходности актива
        getAssetReturn(asset, scenario = 'base') {
            if (!asset.type) return 0;

            const assetInfo = assetClasses.getAssetInfo(asset.type);
            if (!assetInfo) return 0;

            const adjustment = assetInfo.inflationAdjustment[scenario] || 0;
            return this.settings.inflation + adjustment;
        },

        // Получение названия типа актива
        getAssetTypeName(assetType) {
            const assetInfo = assetClasses.getAssetInfo(assetType);
            return assetInfo ? assetInfo.name : assetType;
        },

        // Форматирование валюты
        formatCurrency(amount) {
            return formatters.formatCurrency(amount);
        },

        // Форматирование процентов
        formatPercent(value) {
            return formatters.formatPercent(value);
        },

        // Экспорт данных
        async exportData() {
            try {
                await dataManager.exportData();
                // TODO: Показать уведомление об успешном экспорте
            } catch (error) {
                console.error('Error exporting data:', error);
                // TODO: Показать ошибку пользователю
            }
        },

        // Импорт данных
        async importData() {
            try {
                const success = await dataManager.importData();
                if (success) {
                    await this.loadData();
                    this.calculate();
                    // TODO: Показать уведомление об успешном импорте
                }
            } catch (error) {
                console.error('Error importing data:', error);
                // TODO: Показать ошибку пользователю
            }
        },

        // Получение всех типов активов для модального окна
        getAllAssetTypes() {
            return assetClasses.getAllAssetTypes();
        },

        // Выбор актива
        selectAsset(index) {
            this.selectedAssetIndex = index;
        },

        // Получение доли актива в портфеле
        getAssetWeight(asset) {
            if (this.portfolio.totalValue === 0) return 0;
            return ((asset.value || 0) / this.portfolio.totalValue) * 100;
        },

        // Получение уровня риска
        getRiskLevel(assetType) {
            const assetInfo = assetClasses.getAssetInfo(assetType);
            const levels = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };
            return levels[assetInfo?.riskLevel] || 'Неизвестно';
        },

        // Получение класса для риска
        getRiskClass(assetType) {
            const assetInfo = assetClasses.getAssetInfo(assetType);
            return assetInfo?.riskLevel || 'medium';
        },

        // Получение уровня ликвидности
        getLiquidityLevel(assetType) {
            const assetInfo = assetClasses.getAssetInfo(assetType);
            const levels = { low: 'Низкая', medium: 'Средняя', high: 'Высокая' };
            return levels[assetInfo?.liquidity] || 'Неизвестно';
        },

        // Получение текста уровня риска для бейджа
        getRiskLevelText(riskLevel) {
            const levels = { low: 'Низкий риск', medium: 'Умеренный риск', high: 'Высокий риск' };
            return levels[riskLevel] || 'Риск неизвестен';
        },

        // Получение текста ликвидности
        getLiquidityText(liquidity) {
            const levels = { low: 'Низкая ликвидность', medium: 'Средняя ликвидность', high: 'Высокая ликвидность' };
            return levels[liquidity] || 'Ликвидность неизвестна';
        },

        // Обновление актива с пересчетом портфеля
        updateAssetValue(index, field, value) {
            if (this.portfolio.assets[index]) {
                this.portfolio.assets[index][field] = value;
                this.updatePortfolioValue();
                this.calculate();

                // Если находимся на вкладке активов, нужно пересчитать детальные проекции
                if (this.activeTab === 'assets') {
                    this.calculateDetailedProjections();
                    this.updateAssetChart();
                }

                this.saveData();
            }
        },

        // Обновление настроек с пересчетом
        updateSettings(field, value) {
            this.settings[field] = value;

            // Если изменилась инфляция, нужно пересчитать сценарии
            if (field === 'inflation') {
                this.updateScenarioSettings();
            } else if (field === 'showRealValues') {
                // При изменении режима отображения нужно только обновить графики
                this.updateCharts();
                // Если находимся на вкладке активов, обновляем и график активов
                if (this.activeTab === 'assets') {
                    this.updateAssetChart();
                }
            } else {
                // Для остальных полей (horizonYears) нужен полный пересчет
                this.calculate();
                this.updateCharts();
                // Если находимся на вкладке активов, пересчитываем детальные проекции
                if (this.activeTab === 'assets') {
                    this.calculateDetailedProjections();
                    this.updateAssetChart();
                }
            }

            this.saveData();
        },

        // Обновление настроек сценариев
        updateScenarioSettings() {
            // Сохраняем изменения в assetClasses
            const allAssetTypes = assetClasses.getAllAssetTypes();

            // Обновляем scenarios для совместимости (хотя теперь используем assetClasses)
            this.scenarios.returnRates = {};
            Object.entries(allAssetTypes).forEach(([assetType, assetInfo]) => {
                this.scenarios.returnRates[assetType] = {
                    pessimistic: this.settings.inflation + assetInfo.inflationAdjustment.pessimistic,
                    base: this.settings.inflation + assetInfo.inflationAdjustment.base,
                    optimistic: this.settings.inflation + assetInfo.inflationAdjustment.optimistic
                };
            });

            this.calculate();
            this.updateCharts();

            // Если находимся на вкладке активов, пересчитываем детальные проекции
            if (this.activeTab === 'assets') {
                this.calculateDetailedProjections();
                this.updateAssetChart();
            }

            this.saveData();
        },

        // Tab и Scenario управление
        switchTab(tabName) {
            console.log('Switching to tab:', tabName);
            this.activeTab = tabName;

            if (tabName === 'assets') {
                this.calculateDetailedProjections();
                this.updateAssetChart();
            } else {
                this.updateCharts();
            }

            this.saveData();
        },

        selectScenario(scenario) {
            console.log('Selecting scenario:', scenario);
            this.selectedScenario = scenario;
            this.updateAssetChart();
            this.saveData();
        },

        calculateDetailedProjections() {
            console.log('Calculating detailed projections...');

            if (!this.portfolio.assets || this.portfolio.assets.length === 0) {
                console.log('No assets found, setting empty projections');
                this.detailedProjections = { assets: {}, liabilities: { pessimistic: [], base: [], optimistic: [] } };
                return;
            }

            try {
                if (typeof financialEngine.calculateDetailedProjections === 'function') {
                    this.detailedProjections = financialEngine.calculateDetailedProjections(
                        this.portfolio,
                        this.scenarios,
                        this.settings
                    );
                    console.log('Detailed projections calculated successfully. Assets:', Object.keys(this.detailedProjections.assets).length);
                } else {
                    console.error('calculateDetailedProjections method not found on financialEngine');
                    this.detailedProjections = { assets: {}, liabilities: { pessimistic: [], base: [], optimistic: [] } };
                }
            } catch (error) {
                console.error('Error calculating detailed projections:', error);
                this.detailedProjections = { assets: {}, liabilities: { pessimistic: [], base: [], optimistic: [] } };
            }
        },

        updateAssetChart() {
            console.log('Updating asset comparison chart...');
            this.$nextTick(() => {
                const chartElement = this.$refs.assetChart || document.querySelector('canvas[x-ref="assetChart"]');

                if (chartElement && this.detailedProjections.assets && Object.keys(this.detailedProjections.assets).length > 0) {
                    try {
                        if (typeof chartManager.createAssetComparisonChart === 'function') {
                            chartManager.createAssetComparisonChart(
                                chartElement,
                                this.detailedProjections,
                                this.selectedScenario,
                                this.settings,
                                this.portfolio
                            );
                            console.log('Asset chart updated successfully');
                        } else {
                            console.error('createAssetComparisonChart method not found on chartManager');
                        }
                    } catch (error) {
                        console.error('Error updating asset chart:', error);
                    }
                } else {
                    console.log('Missing requirements - chartElement:', !!chartElement, 'assets:', Object.keys(this.detailedProjections.assets || {}).length);
                }
            });
        },

        // Helper methods для asset comparison table
        getAssetValueForYear(asset, scenario, year) {
            const data = asset[scenario];
            if (!data || !data[year]) return 0;
            return this.settings.showRealValues ? data[year].real : data[year].nominal;
        },

        getLiabilityValueForYear(year) {
            const data = this.detailedProjections.liabilities[this.selectedScenario];
            if (!data || !data[year]) return 0;
            return data[year].value;
        },

        getNetWorthForYear(year) {
            let totalAssets = 0;
            let totalLiabilities = 0;

            // Суммируем все активы
            Object.values(this.detailedProjections.assets).forEach(asset => {
                totalAssets += this.getAssetValueForYear(asset, this.selectedScenario, year);
            });

            // Вычитаем обязательства
            totalLiabilities = this.getLiabilityValueForYear(year);

            return totalAssets - totalLiabilities;
        },

        // Watchers для автоматического пересчета
        $watch: {
            'portfolio.assets': {
                handler() {
                    console.log('Assets watcher triggered, count:', this.portfolio.assets?.length);
                    this.updatePortfolioValue();
                    eventBus.emit('portfolio:changed', this.portfolio);
                },
                deep: true
            },

            'portfolio.liabilities': {
                handler() {
                    console.log('Liabilities watcher triggered, count:', this.portfolio.liabilities?.length);
                    this.updatePortfolioValue();
                    this.calculate();
                    this.updateCharts();
                    eventBus.emit('portfolio:changed', this.portfolio);
                },
                deep: true
            },

            'settings.inflation'() {
                this.updateScenarioSettings();
            },

            'settings.horizonYears'() {
                this.calculate();
                this.saveData();
            },

            'settings.showRealValues'() {
                this.updateCharts();
                this.saveData();
            },

        }
    };
}

// Глобальная функция для Alpine.js
window.finCalcApp = finCalcApp;