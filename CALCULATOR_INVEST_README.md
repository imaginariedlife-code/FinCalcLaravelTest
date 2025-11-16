# Calculator-Invest

**Калькулятор инвестиционных стратегий** на основе реальных исторических данных Московской биржи (MOEX).

## Описание

Calculator-Invest позволяет сравнить эффективность 5 различных инвестиционных стратегий на реальных исторических данных российского фондового рынка с 2010 по 2025 год. Приложение использует данные MOEX API и рассчитывает результаты регулярных инвестиций при разных подходах к покупке активов.

## Возможности

### 5 Инвестиционных Стратегий

1. **Perfect Timing (Идеальный вход)**
   - Покупка на минимальной цене каждого периода
   - Теоретически лучший результат
   - Показывает максимальный потенциал

2. **First Day (Первый день)**
   - Покупка в первый торговый день каждого периода
   - Простая и исполнимая стратегия
   - Имитирует регулярные покупки в начале месяца/квартала

3. **DCA - Dollar Cost Averaging (Усреднение)**
   - Покупка по средней цене периода
   - Классическая стратегия усреднения стоимости
   - Наиболее реалистичная для большинства инвесторов

4. **Worst Timing (Худший вход)**
   - Покупка на максимальной цене каждого периода
   - Теоретически худший результат
   - Показывает минимальный потенциал даже при неудачном тайминге

5. **Bank Deposit (Банковский депозит)**
   - Альтернатива: вклад в банке
   - Использует исторические ставки ЦБ РФ по депозитам
   - Базовая линия для сравнения с "безрисковой" доходностью

### Поддерживаемые Инструменты

- **IMOEX** - Индекс МосБиржи (широкий рынок акций)
- **MCFTR** - Индекс полной доходности (с дивидендами)
- **SBER** - Сбербанк
- **GAZP** - Газпром
- **LKOH** - Лукойл
- **YNDX** - Яндекс
- **MOEX** - Московская биржа

### Метрики Расчета

Для каждой стратегии рассчитываются:
- **Total Invested** - Общая сумма вложений
- **Final Value** - Итоговая стоимость портфеля
- **Absolute Return** - Абсолютная доходность (в рублях)
- **Percentage Return** - Процентная доходность
- **CAGR** - Годовая доходность (Compound Annual Growth Rate)
- **Purchase Count** - Количество покупок
- **Total Shares** - Общее количество акций/долей
- **Average Price** - Средняя цена покупки

### Частота Инвестиций

- **Monthly (Ежемесячно)** - инвестиции каждый месяц
- **Quarterly (Ежеквартально)** - инвестиции каждый квартал
- **Yearly (Ежегодно)** - инвестиции каждый год

### Визуализация

- Интерактивные графики Chart.js
- Сравнение всех 5 стратегий на одном графике
- Выделение лучшей и худшей стратегий
- Детальная таблица с метриками по каждой стратегии

## Технический Стек

### Backend
- **Laravel 11** - PHP framework
- **SQLite** - База данных
- **MOEX API** - Источник исторических данных
- **Laravel Scheduler** - Автоматическое обновление данных

### Frontend
- **Alpine.js** - Реактивный UI framework
- **Chart.js** - Библиотека для графиков
- **Vanilla CSS** - Стилизация без фреймворков

### Архитектура

```
app/
├── Console/Commands/
│   ├── MoexFetchHistorical.php  # Загрузка данных с MOEX API
│   └── ImportImoexCsv.php       # Импорт из CSV
├── Http/Controllers/Api/
│   └── InvestmentCalculatorController.php  # API endpoints
├── Models/
│   ├── HistoricalPrice.php      # Модель исторических цен
│   └── DepositRate.php          # Модель ставок депозитов
└── Services/
    ├── MoexDataService.php          # Работа с MOEX API
    └── InvestmentCalculatorService.php  # Расчет стратегий

public/calculator-invest/
└── index.html                   # Frontend SPA

routes/
├── api.php                      # API routes
├── console.php                  # Scheduled tasks
└── web.php                      # Web routes
```

## API Endpoints

### GET /api/investment/instruments
Получить список доступных инструментов с последними ценами.

**Response:**
```json
{
  "instruments": [
    {
      "ticker": "IMOEX",
      "name": "Индекс МосБиржи",
      "last_updated": "2024-12-31",
      "last_price": "3500.50"
    }
  ]
}
```

### POST /api/investment/calculate
Рассчитать все 5 стратегий для одного инструмента.

**Request:**
```json
{
  "ticker": "IMOEX",
  "amount": 10000,
  "frequency": "monthly",
  "start_date": "2020-01-01",
  "end_date": "2024-12-31"
}
```

**Response:**
```json
{
  "perfect_timing": {
    "total_invested": 600000.00,
    "final_value": 1250000.00,
    "absolute_return": 650000.00,
    "percentage_return": "108.33",
    "cagr": "15.80",
    "purchase_count": 60,
    "total_shares": 450.25,
    "average_price": 2222.22,
    "purchases": [...]
  },
  "first_day": {...},
  "dca": {...},
  "worst_timing": {...},
  "deposit": {...},
  "metadata": {
    "ticker": "IMOEX",
    "amount_per_period": 10000,
    "frequency": "monthly",
    "total_periods": 60,
    "start_date": "2020-01-01",
    "end_date": "2024-12-31",
    "current_price": "3500.50"
  }
}
```

### POST /api/investment/compare
Сравнить несколько инструментов (только DCA стратегия).

**Request:**
```json
{
  "tickers": ["IMOEX", "SBER"],
  "amount": 10000,
  "frequency": "monthly",
  "start_date": "2020-01-01",
  "end_date": "2024-12-31"
}
```

## Установка и Запуск

См. [CALCULATOR_INVEST_DEPLOY.md](CALCULATOR_INVEST_DEPLOY.md) для детальных инструкций по деплою.

### Быстрый старт (локально)

```bash
# 1. Установить зависимости
composer install

# 2. Настроить окружение
cp .env.example .env
php artisan key:generate

# 3. Создать базу данных
touch database/database.sqlite
php artisan migrate
php artisan db:seed --class=DepositRateSeeder

# 4. Загрузить данные (импорт из CSV быстрее)
php artisan moex:import-csv IMOEX.csv

# 5. Запустить сервер
php artisan serve
```

Откройте http://127.0.0.1:8000/calculator-invest

## Тестирование

### Автоматизированные тесты
```bash
# Запустить тестовый скрипт
./test_calculator.sh
```

### Ручное тестирование
См. [test_manual.md](test_manual.md) для детальных инструкций.

### Проверка данных
```bash
# Проверить количество записей в БД
php artisan tinker --execute="
use App\Models\HistoricalPrice;
\$counts = HistoricalPrice::selectRaw('ticker, COUNT(*) as count')
    ->groupBy('ticker')
    ->get();
foreach (\$counts as \$c) {
    echo \$c->ticker . ': ' . \$c->count . ' records' . PHP_EOL;
}
"
```

## Artisan Commands

### moex:fetch-historical
Загрузить исторические данные с MOEX API.

```bash
# Загрузить все тикеры за период
php artisan moex:fetch-historical --from=2020-01-01 --to=2024-12-31

# Загрузить конкретный тикер
php artisan moex:fetch-historical SBER --from=2020-01-01

# Загрузить последние 30 дней
php artisan moex:fetch-historical --from=-30days
```

### moex:import-csv
Импортировать данные из CSV файла (быстрее для начальной загрузки).

```bash
php artisan moex:import-csv IMOEX.csv
```

## Автоматическое Обновление Данных

Настроен ежедневный cron job в `routes/console.php`:
- Запускается в 3:00 AM по московскому времени (после закрытия торгов)
- Обновляет данные за последние 30 дней
- Логирует успех/ошибки

```php
Schedule::command('moex:fetch-historical --from=-30days')
    ->dailyAt('03:00')
    ->timezone('Europe/Moscow');
```

Не забудьте добавить в crontab:
```bash
* * * * * cd /path/to/project && php artisan schedule:run >> /dev/null 2>&1
```

## Известные Ограничения

1. **Данные MOEX**
   - Доступны только торговые дни (выходные и праздники пропущены)
   - Некоторые тикеры могут иметь неполные данные за старые периоды
   - API MOEX может временно быть недоступен

2. **Расчеты**
   - Не учитываются комиссии брокера
   - Не учитывается налог на доход
   - Предполагается реинвестирование дивидендов (для MCFTR)

3. **Perfect/Worst Timing**
   - Это теоретические стратегии, невозможные в реальности
   - Служат для демонстрации диапазона возможных результатов

## Примеры Использования

### Пример 1: Сравнение с депозитом (2010-2024)
```bash
curl -X POST http://127.0.0.1:8000/api/investment/calculate \
  -H 'Content-Type: application/json' \
  -d '{
    "ticker": "IMOEX",
    "amount": 10000,
    "frequency": "monthly",
    "start_date": "2010-01-01",
    "end_date": "2024-12-31"
  }'
```

**Результат:** Депозит выиграл! (110% vs 53% доходность)
- Причина: период 2010-2024 включает кризис 2014-2015 и 2022 год
- Высокие ставки по депозитам в кризисные годы

### Пример 2: Долгосрочная инвестиция с реинвестированием
```bash
curl -X POST http://127.0.0.1:8000/api/investment/calculate \
  -H 'Content-Type: application/json' \
  -d '{
    "ticker": "MCFTR",
    "amount": 50000,
    "frequency": "quarterly",
    "start_date": "2015-01-01",
    "end_date": "2024-12-31"
  }'
```

**Результат:** MCFTR (с дивидендами) показывает лучшую доходность

## Roadmap

- [ ] Добавить учет комиссий брокера
- [ ] Добавить расчет налогов
- [ ] Поддержка USD-инструментов
- [ ] Экспорт результатов в PDF/Excel
- [ ] Сравнение портфелей из нескольких инструментов
- [ ] Добавить больше российских акций
- [ ] Интеграция с брокерскими API

## Contributing

Pull requests приветствуются! Для крупных изменений сначала откройте issue для обсуждения.

## License

MIT

## Контакты

- Telegram: [@glyuch_dengi](https://t.me/glyuch_dengi)
- GitHub: [github.com/glyuch](https://github.com/glyuch)

---

**Disclaimer:** Этот калькулятор предназначен только для образовательных целей. Прошлые результаты не гарантируют будущую доходность. Перед принятием инвестиционных решений проконсультируйтесь с финансовым консультантом.
