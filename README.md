# Lotshot TON Player

Скрипт для автоматической игры в лотерею Lotshot на TON.

## Быстрый старт

### 1. Установите Node.js

Скачайте и установите с https://nodejs.org (версия 18+)

### 2. Установите зависимости

Откройте терминал в папке со скриптом:

```bash
npm install
```

### 3. Запустите скрипт

```bash
npm start
```

### 4. Следуйте подсказкам

1. Введите seed-фразу кошелька (24 слова)
2. Укажите сколько TON хотите потратить
3. Опционально введите реферальный адрес
4. Подтвердите и играйте!

## Пример работы

```
╔══════════════════════════════════════════════════╗
║       LOTSHOT TON - Automated Lottery Player     ║
╚══════════════════════════════════════════════════╝

Lottery: EQCHbnxDzu6b7U25pLV2V1cWwh1IxxtHPKmZky4Wpo-m-WuM
Ticket price: 1 TON

STEP 1: Enter your wallet seed phrase
(24 words separated by spaces)

Seed phrase: word1 word2 ... word24

Connecting to wallet...

✓ Wallet: EQA...
✓ Balance: 105.5000 TON

STEP 2: How much TON do you want to spend?
Budget in TON: 100

✓ Will buy: 100 tickets
✓ Cost: 100 TON + ~5.00 TON gas

STEP 3: Referral address (optional)
Referral address (press Enter to skip):

✓ No referral

═══════════════════════════════════════════════════
                    SUMMARY
═══════════════════════════════════════════════════
Wallet:       EQA...
Tickets:      100
Total cost:   ~105.00 TON
═══════════════════════════════════════════════════

Start playing? Type YES to confirm: YES

🎰 Starting lottery...

[1/100] Sending ticket... ✓ Sent!
[2/100] Sending ticket... ✓ Sent!
...

═══════════════════════════════════════════════════
                    RESULTS
═══════════════════════════════════════════════════
✓ Tickets sent:   100
✗ Tickets failed: 0
💰 TON spent:     ~100.00 TON (+ gas)
💳 New balance:   15.2500 TON
═══════════════════════════════════════════════════

🎉 Done! Check your wallet for prizes!
```

## Призы

| Приз | Множитель | Шанс |
|------|-----------|------|
| Jackpot | x1000 | 0.008% |
| Gold | x200 | 0.025% |
| Platinum | x77 | 0.08% |
| Silver | x20 | 0.4% |
| Bronze | x7 | 1.25% |
| Copper | x3 | 2.5% |
| Base | x1 | 10% |

## Безопасность

- Seed-фраза используется только локально
- Скрипт подключается напрямую к TON Center API
- Сначала протестируйте с небольшой суммой!

## Лицензия

Проект распространяется под лицензией **MIT**. Исходный код полностью открыт.

## Поддержать проект

Если проект оказался полезен, можете поддержать разработку:

**TON:** `UQCwCYI_4tLe7JOBLz4571m-ehDihIoxILlR3l1Je5XltHyF`
