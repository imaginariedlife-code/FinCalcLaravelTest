/**
 * DataManager - Управление данными приложения через Laravel API
 * Версия 2.1: Hybrid migration с Laravel backend
 */
class DataManager {
    constructor() {
        this.apiBase = '/api';
        this.defaultPortfolioId = 1; // ID дефолтного портфеля
        this.defaultData = this.getDefaultData();
    }

    /**
     * Получить CSRF токен
     */
    async getCsrfToken() {
        const token = document.querySelector('meta[name="csrf-token"]');
        return token ? token.getAttribute('content') : '';
    }

    /**
     * API запрос с обработкой ошибок
     */
    async apiRequest(url, options = {}) {
        try {
            const token = await this.getCsrfToken();

            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };

            const response = await fetch(this.apiBase + url, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    /**
     * Получить дефолтные данные приложения
     */
    getDefaultData() {
        return {
            portfolio: {
                id: this.defaultPortfolioId,
                name: 'Мой портфель',
                assets: [],
                liabilities: [],
                totalValue: 0,
                totalLiabilities: 0,
                netWorth: 0,
                settings: {
                    horizonYears: 10,
                    inflation: 6.0,
                    showRealValues: false,
                    currency: 'RUB'
                },
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
            version: '2.1.0'
        };
    }

    /**
     * Инициализация - создаем дефолтный портфель если его нет
     */
    async initializeDefaultPortfolio() {
        try {
            // Проверяем есть ли уже портфели
            const portfolios = await this.apiRequest('/portfolios');

            if (portfolios.length === 0) {
                // Создаем дефолтный портфель
                const defaultPortfolio = await this.apiRequest('/portfolios', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: 'Мой портфель',
                        settings: this.defaultData.settings
                    })
                });

                this.defaultPortfolioId = defaultPortfolio.id;
                console.log('Created default portfolio with ID:', this.defaultPortfolioId);
            } else {
                this.defaultPortfolioId = portfolios[0].id;
                console.log('Using existing portfolio with ID:', this.defaultPortfolioId);
            }
        } catch (error) {
            console.error('Failed to initialize default portfolio:', error);
            // Fallback к localStorage в случае ошибки API
            return this.loadDataFromLocalStorage();
        }
    }

    /**
     * Загрузить все данные из API
     */
    async loadData() {
        try {
            // Инициализируем дефолтный портфель
            await this.initializeDefaultPortfolio();

            // Загружаем портфель с активами и обязательствами
            const portfolio = await this.apiRequest(`/portfolios/${this.defaultPortfolioId}`);

            // Форматируем данные в ожидаемом формате
            const data = {
                portfolio: {
                    id: portfolio.id,
                    name: portfolio.name,
                    assets: portfolio.assets || [],
                    liabilities: portfolio.liabilities || [],
                    settings: portfolio.settings || this.defaultData.settings,
                    createdAt: portfolio.created_at,
                    updatedAt: portfolio.updated_at
                },
                settings: portfolio.settings || this.defaultData.settings,
                scenarios: this.defaultData.scenarios, // Сценарии пока остаются статичными
                version: '2.1.0'
            };

            // Вычисляем итоговые значения
            data.portfolio.totalValue = data.portfolio.assets.reduce((sum, asset) => sum + parseFloat(asset.value || 0), 0);
            data.portfolio.totalLiabilities = data.portfolio.liabilities.reduce((sum, liability) => sum + parseFloat(liability.principal || 0), 0);
            data.portfolio.netWorth = data.portfolio.totalValue - data.portfolio.totalLiabilities;

            eventBus.emit('data:loaded', data);
            return data;

        } catch (error) {
            console.error('Error loading data from API:', error);
            // Fallback к localStorage
            return this.loadDataFromLocalStorage();
        }
    }

    /**
     * Fallback загрузка из localStorage
     */
    async loadDataFromLocalStorage() {
        try {
            const stored = localStorage.getItem('finCalcV2Data');
            if (stored) {
                const data = JSON.parse(stored);
                return this.mergeWithDefaults(data);
            }
            return this.defaultData;
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            return this.defaultData;
        }
    }

    /**
     * Сохранить портфель
     */
    async savePortfolio(portfolio) {
        try {
            await this.apiRequest(`/portfolios/${this.defaultPortfolioId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: portfolio.name,
                    settings: portfolio.settings
                })
            });

            eventBus.emit('data:saved', { portfolio });
            return true;
        } catch (error) {
            console.error('Error saving portfolio:', error);
            eventBus.emit('data:error', { type: 'save', error });
            return false;
        }
    }

    /**
     * Сохранить настройки
     */
    async saveSettings(settings) {
        try {
            await this.apiRequest(`/portfolios/${this.defaultPortfolioId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    settings: settings
                })
            });

            eventBus.emit('settings:saved', settings);
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    /**
     * Добавить актив
     */
    async addAsset(asset) {
        try {
            const newAsset = await this.apiRequest(`/portfolios/${this.defaultPortfolioId}/assets`, {
                method: 'POST',
                body: JSON.stringify(asset)
            });

            eventBus.emit('portfolio:changed');
            return newAsset;
        } catch (error) {
            console.error('Error adding asset:', error);
            throw error;
        }
    }

    /**
     * Обновить актив
     */
    async updateAsset(assetId, asset) {
        try {
            const updatedAsset = await this.apiRequest(`/assets/${assetId}`, {
                method: 'PUT',
                body: JSON.stringify(asset)
            });

            eventBus.emit('portfolio:changed');
            return updatedAsset;
        } catch (error) {
            console.error('Error updating asset:', error);
            throw error;
        }
    }

    /**
     * Удалить актив
     */
    async deleteAsset(assetId) {
        try {
            await this.apiRequest(`/assets/${assetId}`, {
                method: 'DELETE'
            });

            eventBus.emit('portfolio:changed');
            return true;
        } catch (error) {
            console.error('Error deleting asset:', error);
            throw error;
        }
    }

    /**
     * Добавить обязательство
     */
    async addLiability(liability) {
        try {
            const newLiability = await this.apiRequest(`/portfolios/${this.defaultPortfolioId}/liabilities`, {
                method: 'POST',
                body: JSON.stringify(liability)
            });

            eventBus.emit('portfolio:changed');
            return newLiability;
        } catch (error) {
            console.error('Error adding liability:', error);
            throw error;
        }
    }

    /**
     * Обновить обязательство
     */
    async updateLiability(liabilityId, liability) {
        try {
            const updatedLiability = await this.apiRequest(`/liabilities/${liabilityId}`, {
                method: 'PUT',
                body: JSON.stringify(liability)
            });

            eventBus.emit('portfolio:changed');
            return updatedLiability;
        } catch (error) {
            console.error('Error updating liability:', error);
            throw error;
        }
    }

    /**
     * Удалить обязательство
     */
    async deleteLiability(liabilityId) {
        try {
            await this.apiRequest(`/liabilities/${liabilityId}`, {
                method: 'DELETE'
            });

            eventBus.emit('portfolio:changed');
            return true;
        } catch (error) {
            console.error('Error deleting liability:', error);
            throw error;
        }
    }

    /**
     * Сохранить все данные (совместимость со старым API)
     */
    async saveData(data) {
        try {
            // Сохраняем портфель
            await this.savePortfolio(data.portfolio);

            // Сохраняем настройки
            await this.saveSettings(data.settings);

            eventBus.emit('data:saved', data);
            return true;
        } catch (error) {
            console.error('Error in saveData:', error);
            eventBus.emit('data:error', { type: 'save', error });
            return false;
        }
    }

    /**
     * Экспорт данных (совместимость)
     */
    async exportData() {
        const data = await this.loadData();
        return JSON.stringify(data, null, 2);
    }

    /**
     * Импорт данных (совместимость)
     */
    async importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            // При импорте обновляем текущий портфель
            await this.savePortfolio(data.portfolio);

            // Очищаем старые активы и обязательства
            const currentData = await this.loadData();

            // Удаляем старые активы
            for (const asset of currentData.portfolio.assets) {
                await this.deleteAsset(asset.id);
            }

            // Удаляем старые обязательства
            for (const liability of currentData.portfolio.liabilities) {
                await this.deleteLiability(liability.id);
            }

            // Добавляем новые активы
            for (const asset of data.portfolio.assets) {
                await this.addAsset(asset);
            }

            // Добавляем новые обязательства
            for (const liability of data.portfolio.liabilities) {
                await this.addLiability(liability);
            }

            eventBus.emit('data:imported');
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    /**
     * Мержим с дефолтными данными для совместимости
     */
    mergeWithDefaults(data) {
        return {
            ...this.defaultData,
            ...data,
            portfolio: {
                ...this.defaultData.portfolio,
                ...data.portfolio
            },
            settings: {
                ...this.defaultData.settings,
                ...data.settings
            }
        };
    }
}

// Создаем глобальный экземпляр
const dataManager = new DataManager();