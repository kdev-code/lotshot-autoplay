# Lotshot Autoplay

Автоматический игрок в лотерею [Lotshot](https://ton.lotshot.io/) на блокчейне TON.

[English version](README.md)

## Возможности

- **CLI Скрипт** - Консольный интерфейс для автоматической покупки билетов
- **Веб-интерфейс** - Управление кошельком и игра через браузер
- **Статистика в реальном времени** - Актуальная информация о лотерее и доступных призах
- **Мультиязычность** - Поддержка английского и русского языков
- **Открытый код** - Полная прозрачность, проверьте код сами

## Руководство по установке

### Шаг 1: Установка Node.js

#### macOS

**Вариант А: Официальный установщик**
1. Перейдите на [nodejs.org](https://nodejs.org/)
2. Скачайте установщик для macOS (рекомендуется LTS версия)
3. Откройте скачанный `.pkg` файл
4. Следуйте инструкциям мастера установки

**Вариант Б: Через Homebrew**
```bash
# Установите Homebrew, если его нет
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Установите Node.js
brew install node
```

#### Linux (Ubuntu/Debian)

```bash
# Обновите список пакетов
sudo apt update

# Установите Node.js и npm
sudo apt install nodejs npm

# Или используйте NodeSource для последней версии
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### Linux (Fedora/RHEL)

```bash
sudo dnf install nodejs npm
```

#### Linux (Arch)

```bash
sudo pacman -S nodejs npm
```

#### Windows

**Вариант А: Официальный установщик**
1. Перейдите на [nodejs.org](https://nodejs.org/)
2. Скачайте установщик для Windows (LTS версия)
3. Запустите `.msi` файл
4. Следуйте инструкциям мастера установки
5. Перезапустите терминал/PowerShell

**Вариант Б: Через winget**
```powershell
winget install OpenJS.NodeJS.LTS
```

**Вариант В: Через Chocolatey**
```powershell
choco install nodejs-lts
```

### Шаг 2: Проверка установки

Откройте терминал (или PowerShell на Windows) и выполните:

```bash
node --version
npm --version
```

Вы должны увидеть номера версий (например, `v20.10.0` и `10.2.0`).

### Шаг 3: Скачивание проекта

**Вариант А: Через Git**
```bash
git clone https://github.com/kdev-code/lotshot-autoplay.git
cd lotshot-autoplay
```

**Вариант Б: Скачать ZIP**
1. Перейдите на [github.com/kdev-code/lotshot-autoplay](https://github.com/kdev-code/lotshot-autoplay)
2. Нажмите зелёную кнопку "Code"
3. Выберите "Download ZIP"
4. Распакуйте архив
5. Откройте терминал в распакованной папке

### Шаг 4: Установка зависимостей

```bash
npm install
```

## Использование

### Режим CLI

```bash
npm start
```

Следуйте инструкциям:
1. Введите вашу seed-фразу (24 слова)
2. Укажите бюджет в TON
3. При желании добавьте реферальный адрес
4. Подтвердите и начните игру

### Веб-интерфейс

```bash
cd web
npm install
npm run dev
```

Откройте http://localhost:5173 в браузере.

## Структура призов

| Приз     | Множитель | Шанс    | За цикл |
|----------|-----------|---------|---------|
| Jackpot  | x1000     | 0.008%  | 1       |
| Gold     | x200      | 0.025%  | 3       |
| Platinum | x77       | 0.08%   | 10      |
| Silver   | x20       | 0.4%    | 50      |
| Bronze   | x7        | 1.25%   | 150     |
| Copper   | x3        | 2.5%    | 300     |
| Base     | x1        | 10%     | 1,200   |

> Каждый цикл состоит из 12,000 билетов

## Безопасность

- **Только локальное хранение** - Seed-фразы никогда не покидают ваше устройство
- **Прямое подключение к блокчейну** - Без посредников через [Orbs Network](https://www.orbs.com/ton-access/)
- **Никакого сбора данных** - Мы не отслеживаем и не храним данные пользователей
- **Открытый исходный код** - Полный код доступен для аудита
- **Без бэкенда** - Всё работает на стороне клиента

## Технологии

- **Runtime**: Node.js / TypeScript
- **TON SDK**: [@ton/ton](https://github.com/ton-org/ton), [@ton/core](https://github.com/ton-org/ton-core)
- **RPC**: [@orbs-network/ton-access](https://github.com/orbs-network/ton-access)
- **Web**: React + Vite

## Структура проекта

```
lotshot-autoplay/
├── src/
│   └── index.ts          # CLI скрипт
├── web/
│   └── src/
│       ├── App.tsx       # Главный компонент
│       └── App.css       # Стили
├── lotshot-ton-contracts/ # Референс смарт-контракта
├── LICENSE               # MIT лицензия
├── README.md             # Документация на английском
└── README.ru.md          # Документация на русском
```

## Решение проблем

### "command not found: npm"
Node.js не установлен или не добавлен в PATH. Переустановите Node.js и перезапустите терминал.

### "EACCES permission denied"
На macOS/Linux не используйте `sudo npm`. Вместо этого исправьте права npm:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### "Module not found"
Выполните `npm install` в директории проекта.

### Веб-интерфейс не запускается
Убедитесь, что вы находитесь в папке `web` и выполнили там `npm install`.

## Участие в проекте

Мы приветствуем вклад в проект! Не стесняйтесь отправлять Pull Request.

## Лицензия

Этот проект лицензирован под MIT License — смотрите файл [LICENSE](LICENSE) для деталей.

## Поддержать проект

Если проект оказался полезен:

**TON:** `UQCwCYI_4tLe7JOBLz4571m-ehDihIoxILlR3l1Je5XltHyF`

---

**Внимание:** Азартные игры связаны с риском. Играйте только на те средства, которые можете позволить себе потерять. Программа предоставляется как есть, без каких-либо гарантий.
