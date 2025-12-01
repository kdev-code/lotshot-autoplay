# Lotshot Autoplay

Automated lottery player for [Lotshot](https://ton.lotshot.io/) on TON blockchain.

[Русская версия](README.ru.md)

## Features

- **CLI Script** - Command-line interface for automated ticket purchasing
- **Web Interface** - Browser-based wallet management and gameplay
- **Real-time Stats** - Live lottery statistics and prize availability
- **Multi-language** - English and Russian support
- **Open Source** - Full transparency, verify the code yourself

## Installation Guide

### Step 1: Install Node.js

#### macOS

**Option A: Official Installer**
1. Go to [nodejs.org](https://nodejs.org/)
2. Download the macOS installer (LTS version recommended)
3. Open the downloaded `.pkg` file
4. Follow the installation wizard

**Option B: Using Homebrew**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

#### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Node.js and npm
sudo apt install nodejs npm

# Or use NodeSource for latest version
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

**Option A: Official Installer**
1. Go to [nodejs.org](https://nodejs.org/)
2. Download the Windows installer (LTS version)
3. Run the `.msi` file
4. Follow the installation wizard
5. Restart your terminal/PowerShell

**Option B: Using winget**
```powershell
winget install OpenJS.NodeJS.LTS
```

**Option C: Using Chocolatey**
```powershell
choco install nodejs-lts
```

### Step 2: Verify Installation

Open a terminal (or PowerShell on Windows) and run:

```bash
node --version
npm --version
```

You should see version numbers (e.g., `v20.10.0` and `10.2.0`).

### Step 3: Download the Project

**Option A: Using Git**
```bash
git clone https://github.com/kdev-code/lotshot-autoplay.git
cd lotshot-autoplay
```

**Option B: Download ZIP**
1. Go to [github.com/kdev-code/lotshot-autoplay](https://github.com/kdev-code/lotshot-autoplay)
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the archive
5. Open terminal in the extracted folder

### Step 4: Install Dependencies

```bash
npm install
```

## Usage

### CLI Mode

```bash
npm start
```

Follow the prompts to:
1. Enter your 24-word seed phrase
2. Set your budget in TON
3. Optionally add a referral address
4. Confirm and start playing

### Web Interface

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Prize Structure

| Prize   | Multiplier | Odds   | Per Cycle |
|---------|------------|--------|-----------|
| Jackpot | x1000      | 0.008% | 1         |
| Major   | x200       | 0.025% | 3         |
| High    | x77        | 0.08%  | 10        |
| Mid     | x20        | 0.4%   | 50        |
| Low-Mid | x7         | 1.25%  | 150       |
| Low     | x3         | 2.5%   | 300       |
| Mini    | x1         | 10%    | 1,200     |

> Each cycle consists of 12,000 tickets

## Security

- **Local Storage Only** - Seed phrases never leave your device
- **Direct Blockchain Connection** - No intermediary servers via [Orbs Network](https://www.orbs.com/ton-access/)
- **No Data Collection** - We don't track or store any user data
- **Open Source** - Complete source code available for audit
- **No Backend** - Everything runs client-side

## Tech Stack

- **Runtime**: Node.js / TypeScript
- **TON SDK**: [@ton/ton](https://github.com/ton-org/ton), [@ton/core](https://github.com/ton-org/ton-core)
- **RPC**: [@orbs-network/ton-access](https://github.com/orbs-network/ton-access)
- **Web**: React + Vite

## Project Structure

```
lotshot-autoplay/
├── src/
│   └── index.ts          # CLI script
├── web/
│   └── src/
│       ├── App.tsx       # Main web component
│       └── App.css       # Styles
├── lotshot-ton-contracts/ # Smart contract reference
├── LICENSE               # MIT License
├── README.md             # English documentation
└── README.ru.md          # Russian documentation
```

## Troubleshooting

### "command not found: npm"
Node.js is not installed or not in PATH. Reinstall Node.js and restart your terminal.

### "EACCES permission denied"
On macOS/Linux, don't use `sudo npm`. Instead, fix npm permissions:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### "Module not found"
Run `npm install` in the project directory.

### Web interface won't start
Make sure you're in the `web` folder and ran `npm install` there too.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you find this project useful:

**TON:** `UQCwCYI_4tLe7JOBLz4571m-ehDihIoxILlR3l1Je5XltHyF`

---

**Disclaimer:** Gambling involves risk. Only play with funds you can afford to lose. This software is provided as-is without any guarantees.
