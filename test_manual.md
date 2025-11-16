# Ручное тестирование Calculator-Invest

## 1. Проверка данных в БД

```bash
# Посмотреть количество записей по тикерам
php artisan tinker --execute="
use App\Models\HistoricalPrice;
\$counts = HistoricalPrice::selectRaw('ticker, COUNT(*) as count, MIN(trade_date) as min_date, MAX(trade_date) as max_date')
    ->groupBy('ticker')
    ->get();
foreach (\$counts as \$c) {
    echo \$c->ticker . ': ' . \$c->count . ' records (' . \$c->min_date . ' to ' . \$c->max_date . ')' . PHP_EOL;
}
"

# Посмотреть ставки депозитов
php artisan tinker --execute="
use App\Models\DepositRate;
DepositRate::orderBy('year')->get(['year', 'rate'])->each(function(\$r) {
    echo \$r->year . ': ' . \$r->rate . '%' . PHP_EOL;
});
"
```

## 2. Тестирование через Postman/Insomnia

### GET Instruments
```
GET http://127.0.0.1:8000/api/investment/instruments
```

### POST Calculate
```
POST http://127.0.0.1:8000/api/investment/calculate
Content-Type: application/json

{
  "ticker": "IMOEX",
  "amount": 10000,
  "frequency": "monthly",
  "start_date": "2020-01-01",
  "end_date": "2024-12-31"
}
```

### POST Compare
```
POST http://127.0.0.1:8000/api/investment/compare
Content-Type: application/json

{
  "tickers": ["IMOEX"],
  "amount": 10000,
  "frequency": "monthly",
  "start_date": "2015-01-01",
  "end_date": "2024-12-31"
}
```

## 3. Тестирование Artisan команд

### Загрузка данных с MOEX API (одного тикера)
```bash
php artisan moex:fetch-historical SBER --from=2024-01-01 --to=2024-12-31
```

### Загрузка всех тикеров за период
```bash
php artisan moex:fetch-historical --from=2024-01-01 --to=2024-12-31
```

### Импорт из CSV
```bash
php artisan moex:import-csv IMOEX.csv
```

## 4. Интересные тесты

### Долгосрочная инвестиция (2010-2024)
```bash
curl -s -X POST http://127.0.0.1:8000/api/investment/calculate \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"IMOEX","amount":10000,"frequency":"monthly","start_date":"2010-01-01","end_date":"2024-12-31"}' \
  | python3 -m json.tool
```

### Ежеквартальные инвестиции
```bash
curl -s -X POST http://127.0.0.1:8000/api/investment/calculate \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"IMOEX","amount":30000,"frequency":"quarterly","start_date":"2020-01-01","end_date":"2024-12-31"}' \
  | python3 -m json.tool
```

### Ежегодные инвестиции
```bash
curl -s -X POST http://127.0.0.1:8000/api/investment/calculate \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"IMOEX","amount":120000,"frequency":"yearly","start_date":"2015-01-01","end_date":"2024-12-31"}' \
  | python3 -m json.tool
```

## 5. Проверка производительности

### Бенчмарк расчетов
```bash
time curl -s -X POST http://127.0.0.1:8000/api/investment/calculate \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"IMOEX","amount":10000,"frequency":"monthly","start_date":"2010-01-01","end_date":"2024-12-31"}' \
  > /dev/null
```

## 6. Ошибки и валидация

### Невалидный тикер
```bash
curl -s -X POST http://127.0.0.1:8000/api/investment/calculate \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"INVALID","amount":10000,"frequency":"monthly","start_date":"2020-01-01","end_date":"2024-12-31"}' \
  | python3 -m json.tool
```

### Неправильные даты
```bash
curl -s -X POST http://127.0.0.1:8000/api/investment/calculate \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"IMOEX","amount":10000,"frequency":"monthly","start_date":"2024-12-31","end_date":"2020-01-01"}' \
  | python3 -m json.tool
```

### Невалидная частота
```bash
curl -s -X POST http://127.0.0.1:8000/api/investment/calculate \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"IMOEX","amount":10000,"frequency":"daily","start_date":"2020-01-01","end_date":"2024-12-31"}' \
  | python3 -m json.tool
```

## 7. Быстрый скрипт для запуска

Создан файл `test_calculator.sh` - запускайте его так:
```bash
./test_calculator.sh
```
