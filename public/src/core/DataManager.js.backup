/**
 * DataManager - Управление данными приложения
 * Абстракция над localStorage с подготовкой к переходу на API
 */
class DataManager {
    constructor() {
        this.storageKey = 'finCalcV2Data';
        this.defaultData = this.getDefaultData();
    }

    /**
     * Получить дефолтные данные приложения
     */
    getDefaultData() {
        return {
            portfolio: {
                id: 'default',
                name: 'Мой портфель',
                assets: [],
                liabilities: [],
                totalValue: 0,
                totalLiabilities: 0,
                netWorth: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            settings: {
                horizonYears: 10,
                inflation: 6.0,
                showRealValues: false,
                currency: 'RUB'
            },
            scenarios: {
                returnRates: {
                    stocks: { pessimistic: 5, base: 12, optimistic: 20 },
                    bonds: { pessimistic: 3, base: 8, optimistic: 12 },
                    cash: { pessimistic: 4, base: 7, optimistic: 10 },
                    realty: { pessimistic: 0, base: 5, optimistic: 12 }
                }
            },
            version: '2.0.0'
        };
    }

    /**
     * Загрузить все данные
     */
    async loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                // Мержим с дефолтными данными для совместимости
                return this.mergeWithDefaults(data);
            }
            return this.defaultData;
        } catch (error) {
            console.error('Error loading data:', error);
            return this.defaultData;
        }
    }

    /**
     * Сохранить все данные
     */
    async saveData(data) {
        try {
            data.portfolio.updatedAt = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            eventBus.emit('data:saved', data);
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            eventBus.emit('data:error', { type: 'save', error });
            return false;
        }
    }

    /**
     * Сохранить портфель
     */
    async savePortfolio(portfolio) {
        const data = await this.loadData();
        data.portfolio = { ...portfolio, updatedAt: new Date().toISOString() };
        return this.saveData(data);
    }

    /**
     * Сохранить настройки
     */
    async saveSettings(settings) {
        const data = await this.loadData();
        data.settings = { ...data.settings, ...settings };
        return this.saveData(data);
    }

    /**
     * Сохранить сценарии
     */
    async saveScenarios(scenarios) {
        const data = await this.loadData();
        data.scenarios = { ...data.scenarios, ...scenarios };
        return this.saveData(data);
    }

    /**
     * Экспорт данных
     */
    async exportData() {
        try {
            const data = await this.loadData();
            const exportData = {
                ...data,
                exportedAt: new Date().toISOString(),
                appVersion: '2.0.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `fincalc-portfolio-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            eventBus.emit('data:exported', exportData);
            return true;
        } catch (error) {
            console.error('Error exporting data:', error);
            eventBus.emit('data:error', { type: 'export', error });
            return false;
        }
    }

    /**
     * Импорт данных
     */
    async importData() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = async (event) => {
                try {
                    const file = event.target.files[0];
                    if (!file) {
                        resolve(false);
                        return;
                    }

                    const text = await file.text();
                    const importedData = JSON.parse(text);

                    // Валидация импортированных данных
                    if (!this.validateImportedData(importedData)) {
                        throw new Error('Invalid data format');
                    }

                    // Мержим с текущими данными
                    const mergedData = this.mergeWithDefaults(importedData);
                    await this.saveData(mergedData);

                    eventBus.emit('data:imported', mergedData);
                    resolve(true);
                } catch (error) {
                    console.error('Error importing data:', error);
                    eventBus.emit('data:error', { type: 'import', error });
                    reject(error);
                }
            };

            input.click();
        });
    }

    /**
     * Валидация импортированных данных
     */
    validateImportedData(data) {
        try {
            return (
                data &&
                typeof data === 'object' &&
                data.portfolio &&
                data.settings &&
                data.scenarios &&
                Array.isArray(data.portfolio.assets)
            );
        } catch {
            return false;
        }
    }

    /**
     * Мерж с дефолтными данными
     */
    mergeWithDefaults(data) {
        return {
            portfolio: { ...this.defaultData.portfolio, ...data.portfolio },
            settings: { ...this.defaultData.settings, ...data.settings },
            scenarios: {
                returnRates: {
                    ...this.defaultData.scenarios.returnRates,
                    ...(data.scenarios?.returnRates || {})
                }
            },
            version: this.defaultData.version
        };
    }

    /**
     * Очистить все данные
     */
    async clearData() {
        try {
            localStorage.removeItem(this.storageKey);
            eventBus.emit('data:cleared');
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    /**
     * Получить размер данных
     */
    getDataSize() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? data.length : 0;
        } catch {
            return 0;
        }
    }
}

// Создаем глобальный экземпляр
window.dataManager = new DataManager();

// Экспортируем класс
window.DataManager = DataManager;