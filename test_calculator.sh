#!/bin/bash

echo "=================================================="
echo "  Тестирование Calculator-Invest API"
echo "=================================================="
echo ""

# Test 1: Список инструментов
echo "📊 Test 1: Список доступных инструментов"
echo "--------------------------------------------------"
curl -s http://127.0.0.1:8000/api/investment/instruments | python3 -m json.tool
echo ""
echo ""

# Test 2: Расчет стратегий для IMOEX (короткий период)
echo "📈 Test 2: Расчет всех 5 стратегий (IMOEX, янв-июнь 2024)"
echo "--------------------------------------------------"
curl -s -X POST http://127.0.0.1:8000/api/investment/calculate \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"IMOEX","amount":10000,"frequency":"monthly","start_date":"2024-01-01","end_date":"2024-06-30"}' \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)

print('Параметры:')
print(f'  Тикер: {data[\"metadata\"][\"ticker\"]}')
print(f'  Сумма: {data[\"metadata\"][\"amount_per_period\"]:,.0f} ₽ / месяц')
print(f'  Периодов: {data[\"metadata\"][\"total_periods\"]}')
print(f'  Текущая цена: {data[\"metadata\"][\"current_price\"]} ₽')
print()
print('Результаты стратегий:')
print()

strategies = [
    ('Perfect Timing (лучший)', 'perfect_timing'),
    ('First Day', 'first_day'),
    ('DCA (усреднение)', 'dca'),
    ('Worst Timing (худший)', 'worst_timing'),
    ('Bank Deposit', 'deposit')
]

for name, key in strategies:
    s = data[key]
    print(f'{name}:')
    print(f'  Вложено: {s[\"total_invested\"]:,.2f} ₽')
    print(f'  Итого: {s[\"final_value\"]:,.2f} ₽')
    print(f'  Доход: {s[\"absolute_return\"]:,.2f} ₽ ({s[\"percentage_return\"]}%)')
    print(f'  CAGR: {s[\"cagr\"]}%')
    print()
"
echo ""

# Test 3: Сравнение инструментов
echo "🔍 Test 3: Сравнение IMOEX vs Bank Deposit (2020-2024)"
echo "--------------------------------------------------"
curl -s -X POST http://127.0.0.1:8000/api/investment/compare \
  -H 'Content-Type: application/json' \
  -d '{"tickers":["IMOEX"],"amount":10000,"frequency":"monthly","start_date":"2020-01-01","end_date":"2024-12-31"}' \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)

print('Параметры:')
params = data['parameters']
print(f'  Сумма: {params[\"amount\"]:,.0f} ₽ / {params[\"frequency\"]}')
print(f'  Период: {params[\"start_date\"]} → {params[\"end_date\"]}')
print()

for ticker, result in data['comparison'].items():
    if 'error' not in result:
        dca = result['dca']
        meta = result['metadata']
        print(f'{ticker} ({result[\"name\"]}):')
        print(f'  Периодов: {meta[\"total_periods\"]}')
        print(f'  Вложено: {dca[\"total_invested\"]:,.2f} ₽')
        print(f'  Итого: {dca[\"final_value\"]:,.2f} ₽')
        print(f'  Доход: {dca[\"absolute_return\"]:,.2f} ₽ ({dca[\"percentage_return\"]}%)')
        print(f'  CAGR: {dca[\"cagr\"]}%')
        print()
    else:
        print(f'{ticker}: ERROR - {result[\"error\"]}')
        print()
"
echo ""

echo "=================================================="
echo "✅ Тестирование завершено!"
echo "=================================================="
