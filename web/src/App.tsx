import { useState, useEffect, useCallback, useRef } from 'react';
import { Address, toNano, beginCell, internal, SendMode } from '@ton/core';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { QRCode } from 'react-qrcode-logo';
import { Toaster, toast } from 'sonner';
import './App.css';

// Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
      };
    };
  }
}

const tg = window.Telegram?.WebApp;
const isTelegram = !!tg;

// ============ CONFIG ============
const LOTTERY_ADDRESS = 'EQCHbnxDzu6b7U25pLV2V1cWwh1IxxtHPKmZky4Wpo-m-WuM';
const TICKET_PRICE = 1;
const DELAY_BETWEEN_TICKETS = 5000; // 5 seconds between tickets
const STORAGE_KEY = 'lotshot_wallet';
const REFERRAL_KEY = 'lotshot_referral';

// ============ TRANSLATIONS ============
const translations = {
  en: {
    title: 'Lotshot TON',
    subtitle: 'Automated Lottery Player',
    lottery: 'Lottery',
    ticketPrice: 'Ticket Price',
    ton: 'TON',

    // Wallet creation
    createWallet: 'Create New Wallet',
    importWallet: 'Import Existing Wallet',
    generating: 'Generating...',
    yourSeedPhrase: 'Your Seed Phrase',
    writeItDown: '⚠️ Write down these 24 words and keep them safe!',
    seedWarning: 'This is the ONLY way to recover your wallet. Never share it with anyone.',
    copySeed: 'Copy Seed',
    seedCopied: 'Seed Copied!',
    iWroteItDown: 'I wrote it down',
    verifySeed: 'Verify Seed Phrase',
    enterWord: 'Enter word #',
    verify: 'Verify',
    wrongWord: 'Wrong word! Please check your seed phrase.',

    // Import
    enterSeed: 'Enter Seed Phrase',
    seedPlaceholder: '24 words separated by spaces...',
    import: 'Import',
    back: '← Back',

    // Wallet info
    connecting: 'Connecting...',
    connected: 'Connected',
    balance: 'Balance',
    disconnect: 'Disconnect',
    yourAddress: 'Your Address',
    walletVersion: 'v4R2',
    walletVersionInfo: 'To connect this address in your wallet app, import the seed phrase and select "v4R2" version in settings.',
    copyAddress: 'Copy',
    copied: 'Copied!',
    depositHere: 'Send TON to this address to play',
    topUp: 'Top Up',
    scanQR: 'Scan QR code to top up',
    close: 'Close',

    // Game
    budget: 'Budget (TON)',
    budgetPlaceholder: 'How much TON to spend?',
    referral: 'Referral (optional)',
    referralPlaceholder: 'Referral address...',
    willBuy: 'Will buy',
    tickets: 'tickets',
    estimatedCost: 'Est. cost',
    play: '🎰 PLAY',
    stop: '⏹ STOP',
    progress: 'Progress',
    sent: 'Sent',
    failed: 'Failed',
    spent: 'Spent',
    results: 'Results',
    checkWallet: '🎉 Check your wallet for prizes!',
    noWinsMessage: 'Better luck next time!',
    gameFinished: 'Game finished',

    error: 'Error',
    invalidSeed: 'Invalid seed phrase (need 24 words)',
    invalidBudget: 'Enter valid budget',
    notEnoughBalance: 'Not enough balance!',
    savedWallet: 'Wallet found',
    useIt: 'Use saved wallet',
    enterNew: 'Use different wallet',
    securityNote: 'Your seed phrase is stored locally in your browser only.',

    // Wins tab
    logsTab: 'Game Logs',
    winsTab: 'Results',
    ticketsSold: 'Tickets sold',
    ticketsToJackpot: 'To Jackpot',
    jackpotChance: 'Jackpot chance',
    prizesLeft: 'Prizes left',
    totalWins: 'Total Won',
    totalLoss: 'Total Lost',
    netResult: 'Net Result',
    noResults: 'No results yet. Play to see wins!',
    win: 'WIN',
    loss: 'LOSS',
    checkingResults: 'Checking results...',
    refreshWins: 'Refresh Wins',

    // Footer
    about: 'About',
    aboutTitle: 'How it works',
    aboutFeatures: [
      'All transactions go directly to TON blockchain',
      'Your seed phrase never leaves your device',
      'No data is sent to external servers',
      'Interacts directly with Lotshot smart contract',
      'You can verify all transactions on-chain',
    ],
    aboutSecurity: 'Security',
    aboutSecurityText: 'Your private keys are stored only in your browser\'s local storage. We never have access to your funds. All operations happen directly between your wallet and the blockchain.',
    faq: 'FAQ',
    faqItems: [
      {
        q: 'What is Lotshot?',
        a: 'Lotshot is a decentralized lottery on TON blockchain. Each ticket costs 1 TON and you can win up to x1000 your bet.',
      },
      {
        q: 'How do I win?',
        a: 'Prizes are determined instantly by the smart contract. Winnings are sent automatically to your wallet.',
      },
      {
        q: 'What are the odds?',
        a: 'Jackpot x1000 (0.008%), Major x200 (0.025%), High x77 (0.08%), Mid x20 (0.4%), Low-Mid x7 (1.25%), Low x3 (2.5%), Mini x1 (10%).',
      },
      {
        q: 'Is it safe?',
        a: 'Yes. Your seed phrase stays on your device. All transactions happen directly on the blockchain. You can verify everything on-chain.',
      },
      {
        q: 'Why use this app?',
        a: 'Automate buying multiple tickets. Set your budget, and the app sends transactions one by one without manual work.',
      },
    ],
    donate: 'Support Project',
    donateText: 'If this project was useful, you can support development:',
    donateAddress: 'UQCwCYI_4tLe7JOBLz4571m-ehDihIoxILlR3l1Je5XltHyF',
    github: 'GitHub',
    openSource: 'Open Source',
    mitLicense: 'MIT License',
    officialSite: 'Official Site',
  },
  ru: {
    title: 'Lotshot TON',
    subtitle: 'Автоматический игрок в лотерею',
    lottery: 'Лотерея',
    ticketPrice: 'Цена билета',
    ton: 'TON',

    // Wallet creation
    createWallet: 'Создать новый кошелек',
    importWallet: 'Импортировать кошелек',
    generating: 'Генерация...',
    yourSeedPhrase: 'Ваша Seed-фраза',
    writeItDown: '⚠️ Запишите эти 24 слова и храните их в безопасности!',
    seedWarning: 'Это ЕДИНСТВЕННЫЙ способ восстановить кошелек. Никому не показывайте!',
    copySeed: 'Скопировать',
    seedCopied: 'Скопировано!',
    iWroteItDown: 'Я записал(а)',
    verifySeed: 'Проверка Seed-фразы',
    enterWord: 'Введите слово #',
    verify: 'Проверить',
    wrongWord: 'Неверное слово! Проверьте вашу seed-фразу.',

    // Import
    enterSeed: 'Введите Seed-фразу',
    seedPlaceholder: '24 слова через пробел...',
    import: 'Импортировать',
    back: '← Назад',

    // Wallet info
    connecting: 'Подключение...',
    connected: 'Подключен',
    balance: 'Баланс',
    disconnect: 'Отключить',
    yourAddress: 'Ваш адрес',
    walletVersion: 'v4R2',
    walletVersionInfo: 'Чтобы подключить этот адрес в вашем кошельке, импортируйте seed-фразу и выберите версию "v4R2" в настройках.',
    copyAddress: 'Копировать',
    copied: 'Скопировано!',
    depositHere: 'Отправьте TON на этот адрес для игры',
    topUp: 'Пополнить',
    scanQR: 'Отсканируйте QR для пополнения',
    close: 'Закрыть',

    // Game
    budget: 'Бюджет (TON)',
    budgetPlaceholder: 'Сколько TON потратить?',
    referral: 'Реферал (опционально)',
    referralPlaceholder: 'Адрес реферала...',
    willBuy: 'Будет куплено',
    tickets: 'билетов',
    estimatedCost: 'Примерная стоимость',
    play: '🎰 ИГРАТЬ',
    stop: '⏹ СТОП',
    progress: 'Прогресс',
    sent: 'Отправлено',
    failed: 'Ошибок',
    spent: 'Потрачено',
    results: 'Результаты',
    checkWallet: '🎉 Проверьте кошелек на призы!',
    noWinsMessage: 'Повезёт в следующий раз!',
    gameFinished: 'Игра завершена',

    error: 'Ошибка',
    invalidSeed: 'Неверная seed-фраза (нужно 24 слова)',
    invalidBudget: 'Введите корректный бюджет',
    notEnoughBalance: 'Недостаточно баланса!',
    savedWallet: 'Найден кошелек',
    useIt: 'Использовать сохраненный',
    enterNew: 'Другой кошелек',
    securityNote: 'Seed-фраза хранится только локально в вашем браузере.',

    // Wins tab
    logsTab: 'Логи игры',
    winsTab: 'Результаты',
    ticketsSold: 'Продано билетов',
    ticketsToJackpot: 'До джекпота',
    jackpotChance: 'Шанс на джекпот',
    prizesLeft: 'Осталось призов',
    totalWins: 'Всего выиграно',
    totalLoss: 'Всего потрачено',
    netResult: 'Итого',
    noResults: 'Пока нет результатов. Играйте!',
    win: 'ВЫИГРЫШ',
    loss: 'ПРОИГРЫШ',
    checkingResults: 'Проверка результатов...',
    refreshWins: 'Обновить выигрыши',

    // Footer
    about: 'О проекте',
    aboutTitle: 'Как это работает',
    aboutFeatures: [
      'Все транзакции идут напрямую в блокчейн TON',
      'Ваша seed-фраза никогда не покидает устройство',
      'Данные не передаются на внешние серверы',
      'Прямое взаимодействие со смарт-контрактом Lotshot',
      'Вы можете проверить все транзакции в блокчейне',
    ],
    aboutSecurity: 'Безопасность',
    aboutSecurityText: 'Ваши приватные ключи хранятся только в локальном хранилище браузера. Мы никогда не имеем доступа к вашим средствам. Все операции происходят напрямую между вашим кошельком и блокчейном.',
    faq: 'FAQ',
    faqItems: [
      {
        q: 'Что такое Lotshot?',
        a: 'Lotshot — это децентрализованная лотерея в блокчейне TON. Каждый билет стоит 1 TON, и вы можете выиграть до x1000 от ставки.',
      },
      {
        q: 'Как выиграть?',
        a: 'Призы определяются мгновенно смарт-контрактом. Выигрыши автоматически отправляются на ваш кошелёк.',
      },
      {
        q: 'Какие шансы на выигрыш?',
        a: 'Jackpot x1000 (0.008%), Major x200 (0.025%), High x77 (0.08%), Mid x20 (0.4%), Low-Mid x7 (1.25%), Low x3 (2.5%), Mini x1 (10%).',
      },
      {
        q: 'Это безопасно?',
        a: 'Да. Ваша seed-фраза остаётся на вашем устройстве. Все транзакции происходят напрямую в блокчейне. Вы можете проверить всё on-chain.',
      },
      {
        q: 'Зачем использовать это приложение?',
        a: 'Автоматизация покупки множества билетов. Установите бюджет, и приложение само отправит транзакции одну за другой.',
      },
    ],
    donate: 'Поддержать проект',
    donateText: 'Если проект оказался полезен, можете поддержать разработку:',
    donateAddress: 'UQCwCYI_4tLe7JOBLz4571m-ehDihIoxILlR3l1Je5XltHyF',
    github: 'GitHub',
    openSource: 'Открытый код',
    mitLicense: 'Лицензия MIT',
    officialSite: 'Официальный сайт',
  },
};

type Lang = 'en' | 'ru';
type Screen = 'welcome' | 'create' | 'verify' | 'import' | 'saved' | 'game';
type GameLog = { id: number; status: 'success' | 'error' | 'pending'; message: string };
type WinResult = { id: number; amount: number; isWin: boolean; time: string };

function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('lotshot_lang');
    return (saved === 'ru' ? 'ru' : 'en') as Lang;
  });
  const t = translations[lang];

  const [screen, setScreen] = useState<Screen>('welcome');
  const [miniTab, setMiniTab] = useState<'home' | 'play' | 'results' | 'settings'>('home');
  const [newMnemonic, setNewMnemonic] = useState<string[]>([]);
  const [verifyWordIndex, setVerifyWordIndex] = useState(0);
  const [verifyInput, setVerifyInput] = useState('');
  const [importInput, setImportInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const [walletData, setWalletData] = useState<{
    address: string;
    balance: string;
    contract: any;
    keyPair: any;
    client: TonClient;
  } | null>(null);

  const [budget, setBudget] = useState('');
  const [referral, setReferral] = useState(() => {
    return localStorage.getItem(REFERRAL_KEY) || '';
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const shouldStopRef = useRef(false);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [stats, setStats] = useState({ sent: 0, failed: 0, total: 0 });
  const [isDone, setIsDone] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'wins'>('logs');
  const [winResults, setWinResults] = useState<WinResult[]>([]);
  const [seedCopied, setSeedCopied] = useState(false);
  const [donateCopied, setDonateCopied] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [lotteryStats, setLotteryStats] = useState<{
    ticketsSold: number;
    ticketsToJackpot: number;
    prizes: {
      jackpot: number;
      x200: number;
      x77: number;
      x20: number;
      x7: number;
      x3: number;
      x1: number;
    };
  } | null>(null);

  // Init Telegram WebApp
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      const theme = tg.themeParams;
      if (theme) {
        const root = document.documentElement;
        if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
        if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
        if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
        if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
        if (theme.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
        if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
      }
    }
  }, []);

  // Check for saved wallet on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setScreen('saved');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lotshot_lang', lang);
  }, [lang]);

  const addLog = useCallback((status: 'success' | 'error' | 'pending', message: string) => {
    setLogs(prev => [...prev.slice(-100), { id: Date.now() + Math.random(), status, message }]);
  }, []);

  // Generate new wallet
  const generateWallet = async () => {
    setIsLoading(true);
    try {
      const mnemonic = await mnemonicNew(24);
      setNewMnemonic(mnemonic);
      setScreen('create');
    } catch (e: any) {
      alert(t.error + ': ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Random word indices for verification (3 random words)
  const getVerifyIndices = () => {
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * 24);
      if (!indices.includes(idx)) indices.push(idx);
    }
    return indices.sort((a, b) => a - b);
  };

  const [verifyIndices] = useState(() => getVerifyIndices());

  // Start verification
  const startVerification = () => {
    setVerifyWordIndex(0);
    setVerifyInput('');
    setScreen('verify');
  };

  // Check verification word
  const checkVerifyWord = () => {
    const correctWord = newMnemonic[verifyIndices[verifyWordIndex]];
    if (verifyInput.trim().toLowerCase() === correctWord.toLowerCase()) {
      if (verifyWordIndex < 2) {
        setVerifyWordIndex(verifyWordIndex + 1);
        setVerifyInput('');
      } else {
        // All verified, connect wallet
        connectWallet(newMnemonic.join(' '));
      }
    } else {
      alert(t.wrongWord);
    }
  };

  // Connect wallet
  const connectWallet = async (seed: string) => {
    const words = seed.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length !== 24) {
      alert(t.invalidSeed);
      return;
    }

    setIsLoading(true);
    try {
      // Using Orbs TON Access - free public RPC without rate limits
      const endpoint = await getHttpEndpoint({ network: 'mainnet' });
      const client = new TonClient({ endpoint });

      const keyPair = await mnemonicToPrivateKey(words);
      const wallet = WalletContractV4.create({
        publicKey: keyPair.publicKey,
        workchain: 0,
      });

      const contract = client.open(wallet);

      let balance = BigInt(0);
      try {
        balance = await contract.getBalance();
      } catch {
        // New wallet, no balance yet
      }

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, seed.trim());

      setWalletData({
        address: wallet.address.toString(),
        balance: (Number(balance) / 1e9).toFixed(4),
        contract,
        keyPair,
        client,
      });
      setScreen('game');
    } catch (e: any) {
      alert(t.error + ': ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedWallet = async () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      await connectWallet(saved);
    }
  };

  const disconnectWallet = () => {
    localStorage.removeItem(STORAGE_KEY);
    setWalletData(null);
    setScreen('welcome');
    setLogs([]);
    setIsDone(false);
  };

  const refreshBalance = async () => {
    if (!walletData) return;
    try {
      const balance = await walletData.contract.getBalance();
      setWalletData(prev => prev ? {
        ...prev,
        balance: (Number(balance) / 1e9).toFixed(4),
      } : null);
    } catch {}
  };

  const copyAddress = () => {
    if (walletData) {
      navigator.clipboard.writeText(walletData.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copySeedPhrase = () => {
    if (newMnemonic.length > 0) {
      navigator.clipboard.writeText(newMnemonic.join(' '));
      setSeedCopied(true);
      setTimeout(() => setSeedCopied(false), 2000);
    }
  };

  const copyDonateAddress = () => {
    navigator.clipboard.writeText(t.donateAddress);
    setDonateCopied(true);
    setTimeout(() => setDonateCopied(false), 2000);
  };

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const JACKPOT_CYCLE = 12000; // Total tickets in one jackpot cycle

  // Prize limits per cycle
  const PRIZE_LIMITS = {
    jackpot: 1,
    x200: 3,
    x77: 10,
    x20: 50,
    x7: 150,
    x3: 300,
    x1: 1200,
  };

  // Fetch lottery contract stats using TonClient
  const fetchLotteryStats = async () => {
    try {
      const endpoint = await getHttpEndpoint({ network: 'mainnet' });
      const client = new TonClient({ endpoint });
      const lotteryAddr = Address.parse(LOTTERY_ADDRESS);

      // Call get_full_data
      const fullDataResult = await client.runMethod(lotteryAddr, 'get_full_data');

      // Call get_counters
      const countersResult = await client.runMethod(lotteryAddr, 'get_counters');

      // Parse get_full_data: skip first (cell), get second (int = next_ticket_index)
      fullDataResult.stack.pop(); // counters_ref (cell)
      const nextTicketIndex = Number(fullDataResult.stack.readBigNumber());

      const ticketsInCycle = nextTicketIndex % JACKPOT_CYCLE;
      const ticketsToJackpot = JACKPOT_CYCLE - ticketsInCycle;

      // Parse get_counters: jp, x200, x77, x20, x7, x3, x1
      const jpWon = Number(countersResult.stack.readBigNumber());
      const x200Won = Number(countersResult.stack.readBigNumber());
      const x77Won = Number(countersResult.stack.readBigNumber());
      const x20Won = Number(countersResult.stack.readBigNumber());
      const x7Won = Number(countersResult.stack.readBigNumber());
      const x3Won = Number(countersResult.stack.readBigNumber());
      const x1Won = Number(countersResult.stack.readBigNumber());

      setLotteryStats({
        ticketsSold: nextTicketIndex,
        ticketsToJackpot: ticketsToJackpot,
        prizes: {
          jackpot: PRIZE_LIMITS.jackpot - jpWon,
          x200: PRIZE_LIMITS.x200 - x200Won,
          x77: PRIZE_LIMITS.x77 - x77Won,
          x20: PRIZE_LIMITS.x20 - x20Won,
          x7: PRIZE_LIMITS.x7 - x7Won,
          x3: PRIZE_LIMITS.x3 - x3Won,
          x1: PRIZE_LIMITS.x1 - x1Won,
        }
      });
    } catch (e) {
      console.error('Failed to fetch lottery stats:', e);
    }
  };

  // Fetch lottery stats on mount and periodically
  useEffect(() => {
    fetchLotteryStats();
    const interval = setInterval(fetchLotteryStats, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Track seen transaction hashes to avoid duplicates
  const seenTxHashesRef = useRef<Set<string>>(new Set());

  // Check for wins by looking at incoming transactions from lottery
  const checkForWins = async (startTime?: number, resetSeen?: boolean) => {
    if (!walletData) return;

    // Reset seen hashes when starting a new game
    if (resetSeen) {
      seenTxHashesRef.current.clear();
    }

    const filterTime = startTime || gameStartTime;

    // Valid win comments from the smart contract
    const WIN_COMMENTS = ['Jackpot', 'x200', 'x77', 'x20', 'x7', 'x3', 'x1'];

    try {
      addLog('pending', t.checkingResults);

      // Get transactions from toncenter API
      const response = await fetch(
        `https://toncenter.com/api/v2/getTransactions?address=${walletData.address}&limit=50`
      );
      const data = await response.json();

      if (data.ok && data.result) {
        const lotteryAddr = Address.parse(LOTTERY_ADDRESS).toString();
        const newWins: WinResult[] = [];
        let tryAgainCount = 0;

        for (const tx of data.result) {
          // Only check transactions after game start time
          const txTimestamp = tx.utime * 1000;
          if (filterTime && txTimestamp < filterTime) continue;

          const txHash = tx.transaction_id?.hash || `${tx.utime}-${tx.in_msg?.value}`;

          // Skip already seen transactions
          if (seenTxHashesRef.current.has(txHash)) continue;

          // Check if transaction is incoming from lottery
          if (tx.in_msg && tx.in_msg.source === lotteryAddr) {
            const amount = Number(tx.in_msg.value || 0) / 1e9;
            const comment = tx.in_msg.message || '';
            const txTime = new Date(txTimestamp);
            const timeStr = `${txTime.getHours().toString().padStart(2, '0')}:${txTime.getMinutes().toString().padStart(2, '0')}:${txTime.getSeconds().toString().padStart(2, '0')}`;

            // Only count as win if comment is one of the valid win types
            const isWin = WIN_COMMENTS.includes(comment) && amount > 0;

            if (isWin) {
              seenTxHashesRef.current.add(txHash);
              addLog('success', `🎉 ${comment}: +${amount.toFixed(2)} TON @ ${timeStr}`);

              // Show toast notification
              toast.success(`🎉 ${comment}!`, {
                description: `+${amount.toFixed(2)} TON`,
                duration: 5000,
              });

              // Add to results immediately
              setWinResults(prev => [...prev, {
                id: txHash,
                amount,
                isWin: true,
                time: timeStr
              }]);

              newWins.push({
                id: txHash,
                amount,
                isWin: true,
                time: timeStr
              });
            } else if (comment === 'Try Again') {
              seenTxHashesRef.current.add(txHash);
              tryAgainCount++;
              addLog('pending', `❌ Try Again @ ${timeStr}`);
            }
            // Ignore bounce transactions (they have weird comments or no valid comment)
          }
        }

        if (newWins.length > 0) {
          addLog('success', `🎉 ${lang === 'ru' ? 'Новых выигрышей' : 'New wins'}: ${newWins.length}`);
          // Wins already added immediately above
        } else {
          addLog('pending', lang === 'ru' ? 'Новых выигрышей не найдено' : 'No new wins found');
        }

        if (tryAgainCount > 0) {
          addLog('pending', `${lang === 'ru' ? 'Проигрышей' : 'Losses'}: ${tryAgainCount}`);
        }
      }
    } catch (e) {
      console.error('Failed to check wins:', e);
      addLog('error', 'Failed to check results');
    }
  };

  const play = async () => {
    if (!walletData) return;

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      alert(t.invalidBudget);
      return;
    }

    const totalTickets = Math.floor(budgetNum / TICKET_PRICE);
    const neededBalance = totalTickets * TICKET_PRICE + totalTickets * 0.05;

    if (parseFloat(walletData.balance) < neededBalance) {
      alert(t.notEnoughBalance);
      return;
    }

    // Check referral is not same as wallet
    if (referral.trim()) {
      try {
        const refAddr = Address.parse(referral.trim());
        if (refAddr.equals(Address.parse(walletData.address))) {
          alert(lang === 'ru'
            ? 'Реферальный адрес не может совпадать с вашим кошельком!'
            : 'Referral address cannot be the same as your wallet!');
          return;
        }
      } catch {
        alert(lang === 'ru'
          ? 'Неверный реферальный адрес!'
          : 'Invalid referral address!');
        return;
      }
    }

    const startTime = Date.now();
    setGameStartTime(startTime);
    setStats({ sent: 0, failed: 0, total: totalTickets });
    setIsPlaying(true);
    setIsDone(false);
    shouldStopRef.current = false;
    setLogs([]);
    setWinResults([]);
    seenTxHashesRef.current.clear();

    let sent = 0;
    let failed = 0;
    let seqno: number;

    try {
      seqno = await walletData.contract.getSeqno();
    } catch (e) {
      addLog('error', 'Failed to get seqno');
      setIsPlaying(false);
      return;
    }

    const lotteryAddr = Address.parse(LOTTERY_ADDRESS);

    for (let i = 1; i <= totalTickets; i++) {
      if (shouldStopRef.current) {
        addLog('error', `Stopped at ticket ${i}`);
        break;
      }

      // Retry up to 3 times
      let success = false;
      for (let attempt = 1; attempt <= 3 && !success && !shouldStopRef.current; attempt++) {
        addLog('pending', `[${i}/${totalTickets}] ${attempt > 1 ? `Attempt ${attempt}...` : 'Sending...'}`);

        try {
          let body = beginCell();
          if (referral.trim()) {
            try {
              body.storeAddress(Address.parse(referral.trim()));
            } catch {}
          }

          await walletData.contract.sendTransfer({
            secretKey: walletData.keyPair.secretKey,
            seqno: seqno,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            messages: [
              internal({
                to: lotteryAddr,
                value: toNano(TICKET_PRICE),
                body: body.endCell(),
              }),
            ],
          });

          seqno++;
          sent++;
          success = true;
          setStats({ sent, failed, total: totalTickets });
          addLog('success', `[${i}/${totalTickets}] ✓ Sent!`);

          // Record as loss initially (wins will be detected later)
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          setWinResults(prev => [...prev, {
            id: Date.now() + Math.random(),
            amount: TICKET_PRICE,
            isWin: false,
            time: timeStr
          }]);

        } catch (e: any) {
          console.error('Transaction error:', e);

          if (attempt === 3) {
            failed++;
            setStats({ sent, failed, total: totalTickets });
            addLog('error', `[${i}/${totalTickets}] ✗ ${e.message?.slice(0, 50) || 'Error'}`);
          }

          // Wait before retry
          await sleep(3000);
          try {
            seqno = await walletData.contract.getSeqno();
          } catch {}
        }
      }

      // Wait between tickets
      if (i < totalTickets && !shouldStopRef.current) {
        await sleep(DELAY_BETWEEN_TICKETS);
      }
    }

    await refreshBalance();
    setIsPlaying(false);
    setIsDone(true);

    // Wait a bit for blockchain to process, then check for wins
    await sleep(5000);
    await checkForWins(startTime, true);
  };

  const budgetNum = parseFloat(budget) || 0;
  const totalTickets = Math.floor(budgetNum / TICKET_PRICE);
  const estimatedCost = totalTickets * TICKET_PRICE + totalTickets * 0.05;

  return (
    <div className={`app ${isTelegram ? 'telegram-app' : ''}`}>
      <Toaster
        position="top-center"
        richColors
        theme="dark"
        toastOptions={{
          style: {
            background: '#16213e',
            border: '1px solid rgba(0, 212, 170, 0.3)',
          },
        }}
      />
      {/* Language Switcher */}
      <div className="lang-switcher">
        <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        <button className={lang === 'ru' ? 'active' : ''} onClick={() => setLang('ru')}>RU</button>
      </div>

      {/* Header */}
      <div className="header">
        <a href="https://ton.lotshot.io/" target="_blank" rel="noopener noreferrer">
          <img
            src="https://ton.lotshot.io/static/media/Lotshot.3ce510c1d68b5b2a71f3e381ffec0f34.svg"
            alt="Lotshot"
            className="logo"
          />
        </a>
        <p className="subtitle">{t.subtitle}</p>
      </div>

      {/* Welcome Screen */}
      {screen === 'welcome' && (
        <div className="welcome-screen">
          <div className="lottery-info">
            <div className="info-item">
              <span className="label">{t.lottery}:</span>
              <a href={`https://tonviewer.com/${LOTTERY_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="lottery-link">
                <code>{LOTTERY_ADDRESS}</code>
              </a>
            </div>
            <div className="info-item">
              <span className="label">{t.ticketPrice}:</span>
              <strong>{TICKET_PRICE} {t.ton}</strong>
            </div>
            {lotteryStats && (
              <>
                <div className="info-item">
                  <span className="label">{t.ticketsSold}:</span>
                  <strong>{lotteryStats.ticketsSold.toLocaleString()}</strong>
                </div>
                <div className="info-item jackpot-item">
                  <span className="label">{t.ticketsToJackpot}:</span>
                  <strong className="jackpot-value">{lotteryStats.ticketsToJackpot.toLocaleString()}</strong>
                </div>
                <div className="prizes-grid">
                  <div className="prize-label">{t.prizesLeft}:</div>
                  <div className="prize-item jackpot">
                    <span className="prize-name">Jackpot</span>
                    <span className="prize-count">{lotteryStats.prizes.jackpot}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x200</span>
                    <span className="prize-count">{lotteryStats.prizes.x200}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x77</span>
                    <span className="prize-count">{lotteryStats.prizes.x77}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x20</span>
                    <span className="prize-count">{lotteryStats.prizes.x20}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x7</span>
                    <span className="prize-count">{lotteryStats.prizes.x7}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x3</span>
                    <span className="prize-count">{lotteryStats.prizes.x3}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x1</span>
                    <span className="prize-count">{lotteryStats.prizes.x1}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="welcome-buttons">
            <button className="btn primary large" onClick={generateWallet} disabled={isLoading}>
              {isLoading ? t.generating : t.createWallet}
            </button>
            <button className="btn secondary large" onClick={() => setScreen('import')}>
              {t.importWallet}
            </button>
          </div>
        </div>
      )}

      {/* Saved Wallet Screen */}
      {screen === 'saved' && (
        <div className="saved-screen">
          {/* Lottery Stats */}
          {lotteryStats && (
            <div className="lottery-info">
              <div className="info-item">
                <span className="label">{t.ticketsSold}:</span>
                <strong>{lotteryStats.ticketsSold.toLocaleString()}</strong>
              </div>
              <div className="info-item jackpot-item">
                <span className="label">{t.ticketsToJackpot}:</span>
                <strong className="jackpot-value">{lotteryStats.ticketsToJackpot.toLocaleString()}</strong>
              </div>
              <div className="prizes-grid">
                <div className="prize-label">{t.prizesLeft}:</div>
                <div className="prize-item jackpot">
                  <span className="prize-name">Jackpot</span>
                  <span className="prize-count">{lotteryStats.prizes.jackpot}</span>
                </div>
                <div className="prize-item">
                  <span className="prize-name">x200</span>
                  <span className="prize-count">{lotteryStats.prizes.x200}</span>
                </div>
                <div className="prize-item">
                  <span className="prize-name">x77</span>
                  <span className="prize-count">{lotteryStats.prizes.x77}</span>
                </div>
                <div className="prize-item">
                  <span className="prize-name">x20</span>
                  <span className="prize-count">{lotteryStats.prizes.x20}</span>
                </div>
                <div className="prize-item">
                  <span className="prize-name">x7</span>
                  <span className="prize-count">{lotteryStats.prizes.x7}</span>
                </div>
                <div className="prize-item">
                  <span className="prize-name">x3</span>
                  <span className="prize-count">{lotteryStats.prizes.x3}</span>
                </div>
                <div className="prize-item">
                  <span className="prize-name">x1</span>
                  <span className="prize-count">{lotteryStats.prizes.x1}</span>
                </div>
              </div>
            </div>
          )}
          <p>💾 {t.savedWallet}</p>
          <div className="saved-buttons">
            <button className="btn primary" onClick={loadSavedWallet} disabled={isLoading}>
              {isLoading ? t.connecting : t.useIt}
            </button>
            <button className="btn secondary" onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setScreen('welcome');
            }}>
              {t.enterNew}
            </button>
          </div>
        </div>
      )}

      {/* Create Wallet - Show Seed */}
      {screen === 'create' && (
        <div className="create-screen">
          <h2>{t.yourSeedPhrase}</h2>
          <p className="warning">{t.writeItDown}</p>

          <div className="seed-display">
            {newMnemonic.map((word, i) => (
              <div key={i} className="seed-word">
                <span className="word-num">{i + 1}.</span>
                <span className="word">{word}</span>
              </div>
            ))}
          </div>

          <p className="seed-warning">{t.seedWarning}</p>

          <button className="btn secondary copy-seed-btn" onClick={copySeedPhrase}>
            {seedCopied ? t.seedCopied : t.copySeed}
          </button>
          <button className="btn primary" onClick={startVerification}>
            {t.iWroteItDown}
          </button>
          <button className="btn secondary" onClick={() => setScreen('welcome')}>
            {t.back}
          </button>
        </div>
      )}

      {/* Verify Seed */}
      {screen === 'verify' && (
        <div className="verify-screen">
          <h2>{t.verifySeed}</h2>
          <p>{t.enterWord}<strong>{verifyIndices[verifyWordIndex] + 1}</strong></p>

          <div className="verify-progress">
            {[0, 1, 2].map(i => (
              <div key={i} className={`verify-dot ${i < verifyWordIndex ? 'done' : i === verifyWordIndex ? 'current' : ''}`} />
            ))}
          </div>

          <input
            type="text"
            value={verifyInput}
            onChange={(e) => setVerifyInput(e.target.value)}
            placeholder={`Word #${verifyIndices[verifyWordIndex] + 1}`}
            onKeyDown={(e) => e.key === 'Enter' && checkVerifyWord()}
            autoFocus
          />

          <button className="btn primary" onClick={checkVerifyWord} disabled={!verifyInput.trim()}>
            {t.verify}
          </button>
          <button className="btn secondary" onClick={() => setScreen('create')}>
            {t.back}
          </button>
        </div>
      )}

      {/* Import Wallet */}
      {screen === 'import' && (
        <div className="import-screen">
          <h2>{t.enterSeed}</h2>
          <textarea
            placeholder={t.seedPlaceholder}
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            rows={4}
            disabled={isLoading}
          />
          <p className="security-note">🔒 {t.securityNote}</p>
          <button
            className="btn primary"
            onClick={() => connectWallet(importInput)}
            disabled={isLoading || !importInput.trim()}
          >
            {isLoading ? t.connecting : t.import}
          </button>
          <button className="btn secondary" onClick={() => setScreen('welcome')}>
            {t.back}
          </button>
        </div>
      )}

      {/* Game Screen */}
      {screen === 'game' && walletData && (
        <div className="game-screen">
          {/* Wallet Info */}
          <div className="wallet-card">
            <div className="wallet-status">
              <span className="status-dot" />
              <span>{t.connected}</span>
            </div>

            <div className="wallet-address-section">
              <p className="label">
                {t.yourAddress} <span className="version-badge" onClick={() => setShowVersionInfo(!showVersionInfo)}>{t.walletVersion}</span>
              </p>
              {showVersionInfo && (
                <p className="version-info">{t.walletVersionInfo}</p>
              )}
              <div className="address-row">
                <code className="address">{walletData.address}</code>
                <button className="copy-btn" onClick={copyAddress}>
                  {copied ? t.copied : t.copyAddress}
                </button>
                <button className="copy-btn topup-btn" onClick={() => setShowQR(true)}>
                  {t.topUp}
                </button>
              </div>
              <p className="deposit-hint">{t.depositHere}</p>
            </div>

            {/* QR Modal */}
            {showQR && (
              <div className="qr-modal-overlay" onClick={() => setShowQR(false)}>
                <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
                  <h3>{t.topUp}</h3>
                  <p className="qr-hint">{t.scanQR}</p>
                  <div className="qr-container">
                    <div className="qr-wrapper">
                      <QRCode
                        value={`ton://transfer/${walletData.address}`}
                        size={200}
                        bgColor="#1a1a2e"
                        fgColor="#00d4aa"
                        qrStyle="dots"
                        eyeRadius={12}
                        eyeColor="#0098ea"
                        logoImage="https://ton.lotshot.io/favicon-96x96.png"
                        logoWidth={50}
                        logoHeight={50}
                        logoPadding={5}
                        logoPaddingStyle="circle"
                        removeQrCodeBehindLogo={true}
                        ecLevel="H"
                      />
                    </div>
                  </div>
                  <div className="qr-address-row">
                    <code className="qr-address">{walletData.address}</code>
                    <button className="copy-btn" onClick={copyAddress}>
                      {copied ? t.copied : t.copyAddress}
                    </button>
                  </div>
                  <button className="btn secondary" onClick={() => setShowQR(false)}>
                    {t.close}
                  </button>
                </div>
              </div>
            )}

            <div className="wallet-balance-section">
              <span className="label">{t.balance}:</span>
              <strong className="balance-value">{walletData.balance} {t.ton}</strong>
              <button className="refresh-btn" onClick={refreshBalance}>↻</button>
            </div>

            <button className="disconnect-btn" onClick={disconnectWallet} disabled={isPlaying}>
              {t.disconnect}
            </button>
          </div>

          {/* Lottery Info */}
          <div className="lottery-card">
            <div className="info-row">
              <span>{t.lottery}:</span>
              <a href="https://ton.lotshot.io/" target="_blank" rel="noopener noreferrer" className="lottery-link">
                {t.officialSite}
              </a>
            </div>
            <div className="info-row">
              <span>{t.ticketPrice}:</span>
              <strong>{TICKET_PRICE} {t.ton}</strong>
            </div>
            {lotteryStats && (
              <>
                <div className="info-row">
                  <span>{t.ticketsSold}:</span>
                  <strong>{lotteryStats.ticketsSold.toLocaleString()}</strong>
                </div>
                <div className="info-row">
                  <span>{t.ticketsToJackpot}:</span>
                  <strong className="jackpot-value">{lotteryStats.ticketsToJackpot.toLocaleString()}</strong>
                </div>
                <div className="prizes-grid">
                  <div className="prize-label">{t.prizesLeft}:</div>
                  <div className="prize-item jackpot">
                    <span className="prize-name">Jackpot</span>
                    <span className="prize-count">{lotteryStats.prizes.jackpot}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x200</span>
                    <span className="prize-count">{lotteryStats.prizes.x200}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x77</span>
                    <span className="prize-count">{lotteryStats.prizes.x77}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x20</span>
                    <span className="prize-count">{lotteryStats.prizes.x20}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x7</span>
                    <span className="prize-count">{lotteryStats.prizes.x7}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x3</span>
                    <span className="prize-count">{lotteryStats.prizes.x3}</span>
                  </div>
                  <div className="prize-item">
                    <span className="prize-name">x1</span>
                    <span className="prize-count">{lotteryStats.prizes.x1}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Game Settings */}
          <div className="game-settings">
            <div className="input-group">
              <label>{t.budget}</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder={t.budgetPlaceholder}
                value={budget}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setBudget(val);
                }}
                onKeyDown={(e) => {
                  if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
                  setBudget(text);
                }}
                disabled={isPlaying}
              />
            </div>

            <div className="input-group">
              <label>{t.referral}</label>
              <div className="referral-input-row">
                <input
                  type="text"
                  placeholder={t.referralPlaceholder}
                  value={referral}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setReferral(val);
                  }}
                  onBlur={() => {
                    if (referral.trim()) {
                      try {
                        Address.parse(referral.trim());
                        // Valid address - save to localStorage
                        localStorage.setItem(REFERRAL_KEY, referral.trim());
                      } catch {
                        setReferral('');
                        localStorage.removeItem(REFERRAL_KEY);
                        alert(lang === 'ru' ? 'Неверный TON адрес' : 'Invalid TON address');
                      }
                    } else {
                      localStorage.removeItem(REFERRAL_KEY);
                    }
                  }}
                  disabled={isPlaying}
                  className={referral.trim() && (() => { try { Address.parse(referral.trim()); return true; } catch { return false; } })() ? 'valid' : ''}
                />
                {referral && (
                  <button
                    type="button"
                    className="clear-referral-btn"
                    onClick={() => {
                      setReferral('');
                      localStorage.removeItem(REFERRAL_KEY);
                    }}
                    disabled={isPlaying}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {budgetNum > 0 && (
              <div className="estimate">
                <p>{t.willBuy}: <strong>{totalTickets}</strong> {t.tickets}</p>
                <p>{t.estimatedCost}: <strong>~{estimatedCost.toFixed(2)}</strong> {t.ton}</p>
              </div>
            )}

            <button
              className={`play-btn ${isPlaying ? 'stop' : ''}`}
              onClick={() => isPlaying ? (shouldStopRef.current = true) : play()}
              disabled={!budgetNum || budgetNum <= 0}
            >
              {isPlaying ? t.stop : t.play}
            </button>
          </div>

          {/* Progress */}
          {(isPlaying || isDone || logs.length > 0) && (
            <div className="progress-section">
              <h3>{isDone ? t.results : t.progress}</h3>

              <div className="stats">
                <div className="stat success">
                  <span className="stat-value">{stats.sent}</span>
                  <span className="stat-label">{t.sent}</span>
                </div>
                <div className="stat error">
                  <span className="stat-value">{stats.failed}</span>
                  <span className="stat-label">{t.failed}</span>
                </div>
                <div className="stat">
                  <span className="stat-value">~{(stats.sent * TICKET_PRICE).toFixed(1)}</span>
                  <span className="stat-label">{t.spent}</span>
                </div>
              </div>

              {stats.total > 0 && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${((stats.sent + stats.failed) / stats.total) * 100}%` }}
                  />
                  <span className="progress-text">{stats.sent + stats.failed}/{stats.total}</span>
                </div>
              )}

              {/* Tabs */}
              <div className="tabs">
                <button
                  className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('logs')}
                >
                  {t.logsTab}
                </button>
                <button
                  className={`tab-btn ${activeTab === 'wins' ? 'active' : ''}`}
                  onClick={() => setActiveTab('wins')}
                >
                  {t.winsTab}
                </button>
              </div>

              {/* Logs Tab */}
              {activeTab === 'logs' && (
                <div className="logs">
                  {logs.slice(-20).map((log) => (
                    <div key={log.id} className={`log ${log.status}`}>{log.message}</div>
                  ))}
                </div>
              )}

              {/* Wins Tab */}
              {activeTab === 'wins' && (
                <div className="wins-tab">
                  {gameStartTime > 0 && (
                    <button className="btn secondary refresh-wins-btn" onClick={() => checkForWins()} disabled={isPlaying}>
                      ↻ {t.refreshWins}
                    </button>
                  )}
                  {winResults.length > 0 ? (
                    <>
                      <div className="wins-summary">
                        <div className="summary-item">
                          <div className={`summary-value positive`}>
                            +{winResults.filter(r => r.isWin).reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
                          </div>
                          <div className="summary-label">{t.totalWins}</div>
                        </div>
                        <div className="summary-item">
                          <div className={`summary-value negative`}>
                            -{(stats.sent * TICKET_PRICE).toFixed(2)}
                          </div>
                          <div className="summary-label">{t.totalLoss}</div>
                        </div>
                        <div className="summary-item">
                          <div className={`summary-value ${
                            winResults.filter(r => r.isWin).reduce((sum, r) => sum + r.amount, 0) - (stats.sent * TICKET_PRICE) >= 0
                              ? 'positive' : 'negative'
                          }`}>
                            {(winResults.filter(r => r.isWin).reduce((sum, r) => sum + r.amount, 0) - (stats.sent * TICKET_PRICE)).toFixed(2)}
                          </div>
                          <div className="summary-label">{t.netResult}</div>
                        </div>
                      </div>
                      <div className="wins-list">
                        {winResults.slice().reverse().map((result) => (
                          <div key={result.id} className={`win-item ${result.isWin ? 'win' : 'loss'}`}>
                            <div className="win-info">
                              <span className={`win-amount ${result.isWin ? 'positive' : 'negative'}`}>
                                {result.isWin ? `+${result.amount.toFixed(2)}` : `-${TICKET_PRICE}`} TON
                              </span>
                              <span className="win-time"> • {result.time}</span>
                            </div>
                            <span className={result.isWin ? 'positive' : 'negative'}>
                              {result.isWin ? t.win : t.loss}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="no-wins">{t.noResults}</div>
                  )}
                </div>
              )}

              {isDone && (
                <div className={`done-message ${winResults.some(r => r.isWin) ? 'has-wins' : 'no-wins'}`}>
                  {winResults.some(r => r.isWin) ? t.checkWallet : t.noWinsMessage}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <a href="https://ton.lotshot.io/" target="_blank" rel="noopener noreferrer" className="footer-btn footer-link">
          {t.officialSite}
        </a>
        <span className="footer-divider">•</span>
        <button className="footer-btn" onClick={() => setShowAbout(true)}>
          {t.about}
        </button>
        <span className="footer-divider">•</span>
        <button className="footer-btn" onClick={() => setShowFaq(true)}>
          {t.faq}
        </button>
        <span className="footer-divider">•</span>
        <button className="footer-btn" onClick={() => setShowDonate(true)}>
          {t.donate}
        </button>
      </footer>

      {/* About Modal */}
      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal about-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.about}</h3>

            <div className="about-section">
              <h4>{t.aboutTitle}</h4>
              <ul className="about-features">
                {t.aboutFeatures.map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="about-section">
              <h4>{t.aboutSecurity}</h4>
              <p className="about-text">{t.aboutSecurityText}</p>
            </div>

            <div className="modal-badges">
              <span className="badge">{t.openSource}</span>
              <span className="badge">{t.mitLicense}</span>
            </div>
            <button className="btn secondary" onClick={() => setShowAbout(false)}>
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* FAQ Modal */}
      {showFaq && (
        <div className="modal-overlay" onClick={() => setShowFaq(false)}>
          <div className="modal faq-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.faq}</h3>
            <div className="faq-list">
              {t.faqItems.map((item, i) => (
                <div key={i} className="faq-item">
                  <div className="faq-question">{item.q}</div>
                  <div className="faq-answer">{item.a}</div>
                </div>
              ))}
            </div>
            <button className="btn secondary" onClick={() => setShowFaq(false)}>
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Donate Modal */}
      {showDonate && (
        <div className="modal-overlay" onClick={() => setShowDonate(false)}>
          <div className="modal donate-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.donate}</h3>
            <p className="modal-text">{t.donateText}</p>
            <div className="donate-qr">
              <QRCode
                value={`ton://transfer/${t.donateAddress}`}
                size={160}
                bgColor="#1a1a2e"
                fgColor="#00d4aa"
                qrStyle="dots"
                eyeRadius={10}
                eyeColor="#0098ea"
                ecLevel="M"
              />
            </div>
            <div className="donate-address-row">
              <code className="donate-address">{t.donateAddress}</code>
              <button className="copy-btn" onClick={copyDonateAddress}>
                {donateCopied ? t.copied : t.copyAddress}
              </button>
            </div>
            <button className="btn secondary" onClick={() => setShowDonate(false)}>
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* ============ TELEGRAM MINI APP UI ============ */}
      {isTelegram && screen === 'game' && (
        <>
          {/* Mini App Bottom Navigation */}
          <nav className="tma-nav">
            <button className={`tma-nav-item ${miniTab === 'home' ? 'active' : ''}`} onClick={() => setMiniTab('home')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>{lang === 'en' ? 'Home' : 'Главная'}</span>
            </button>
            <button className={`tma-nav-item ${miniTab === 'play' ? 'active' : ''}`} onClick={() => setMiniTab('play')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
              <span>{lang === 'en' ? 'Play' : 'Играть'}</span>
            </button>
            <button className={`tma-nav-item ${miniTab === 'results' ? 'active' : ''}`} onClick={() => setMiniTab('results')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>{lang === 'en' ? 'Results' : 'Результаты'}</span>
            </button>
            <button className={`tma-nav-item ${miniTab === 'settings' ? 'active' : ''}`} onClick={() => setMiniTab('settings')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>{lang === 'en' ? 'Settings' : 'Настройки'}</span>
            </button>
          </nav>
        </>
      )}
    </div>
  );
}

export default App;
