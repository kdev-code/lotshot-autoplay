import { useState, useEffect, useCallback, useRef } from 'react';
import { Address, toNano, beginCell, internal, SendMode } from '@ton/core';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { QRCode } from 'react-qrcode-logo';
import './App.css';

// Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (fn: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
      };
    };
  }
}

const tg = window.Telegram?.WebApp;

// ============ CONFIG ============
const LOTTERY_ADDRESS = 'EQCHbnxDzu6b7U25pLV2V1cWwh1IxxtHPKmZky4Wpo-m-WuM';
const TICKET_PRICE = 1;
const DELAY_BETWEEN_TICKETS = 5000;
const STORAGE_KEY = 'lotshot_wallet';
const REFERRAL_KEY = 'lotshot_referral';
const JACKPOT_CYCLE = 12000;

const PRIZE_LIMITS = {
  jackpot: 1, x200: 3, x77: 10, x20: 50, x7: 150, x3: 300, x1: 1200,
};

// ============ TRANSLATIONS ============
const translations = {
  en: {
    // Navigation
    home: 'Home',
    play: 'Play',
    results: 'Results',
    settings: 'Settings',

    // Home
    ticketPrice: 'Ticket Price',
    ton: 'TON',
    ticketsSold: 'Sold',
    toJackpot: 'To Jackpot',
    prizesLeft: 'Prizes Left',
    connectWallet: 'Connect Wallet',
    createWallet: 'Create New',
    importWallet: 'Import Existing',

    // Wallet
    balance: 'Balance',
    topUp: 'Top Up',
    copy: 'Copy',
    copied: 'Copied!',
    yourAddress: 'Your Address',
    depositHint: 'Send TON to play',

    // Play
    budget: 'Budget (TON)',
    budgetPlaceholder: 'Amount to spend',
    referral: 'Referral (optional)',
    referralPlaceholder: 'Referral address',
    willBuy: 'Tickets',
    estCost: 'Est. Cost',
    playBtn: '🎰 PLAY',
    stopBtn: '⏹ STOP',

    // Progress
    sent: 'Sent',
    failed: 'Failed',
    spent: 'Spent',

    // Results
    won: 'Won',
    lost: 'Spent',
    net: 'Net',
    noResults: 'No results yet',
    refreshWins: 'Refresh',

    // Settings
    language: 'Language',
    officialSite: 'Official Site',
    github: 'Source Code',
    supportProject: 'Support Project',
    supportDesc: 'If this project was useful',
    disconnect: 'Disconnect Wallet',
    about: 'About',
    faq: 'FAQ',

    // Create wallet
    generating: 'Generating...',
    yourSeed: 'Your Seed Phrase',
    writeDown: 'Write down these 24 words!',
    seedWarning: 'Never share with anyone',
    copySeed: 'Copy',
    continue: 'I wrote it down',
    back: '← Back',

    // Verify
    verifySeed: 'Verify Seed',
    enterWord: 'Enter word #',
    verify: 'Verify',
    wrongWord: 'Wrong word!',

    // Import
    enterSeed: 'Enter Seed Phrase',
    seedPlaceholder: '24 words...',
    import: 'Import',
    connecting: 'Connecting...',
    securityNote: 'Stored locally only',

    // Errors
    invalidSeed: 'Invalid seed (24 words needed)',
    invalidBudget: 'Enter valid budget',
    notEnough: 'Not enough balance',
    invalidRef: 'Invalid referral address',
    sameRef: 'Cannot use own address',
  },
  ru: {
    home: 'Главная',
    play: 'Играть',
    results: 'Результаты',
    settings: 'Настройки',

    ticketPrice: 'Цена билета',
    ton: 'TON',
    ticketsSold: 'Продано',
    toJackpot: 'До джекпота',
    prizesLeft: 'Осталось призов',
    connectWallet: 'Подключить кошелек',
    createWallet: 'Создать новый',
    importWallet: 'Импортировать',

    balance: 'Баланс',
    topUp: 'Пополнить',
    copy: 'Копировать',
    copied: 'Скопировано!',
    yourAddress: 'Ваш адрес',
    depositHint: 'Отправьте TON для игры',

    budget: 'Бюджет (TON)',
    budgetPlaceholder: 'Сколько потратить',
    referral: 'Реферал (опционально)',
    referralPlaceholder: 'Адрес реферала',
    willBuy: 'Билетов',
    estCost: 'Примерно',
    playBtn: '🎰 ИГРАТЬ',
    stopBtn: '⏹ СТОП',

    sent: 'Отправлено',
    failed: 'Ошибок',
    spent: 'Потрачено',

    won: 'Выиграно',
    lost: 'Потрачено',
    net: 'Итого',
    noResults: 'Пока нет результатов',
    refreshWins: 'Обновить',

    language: 'Язык',
    officialSite: 'Официальный сайт',
    github: 'Исходный код',
    supportProject: 'Поддержать проект',
    supportDesc: 'Если проект был полезен',
    disconnect: 'Отключить кошелек',
    about: 'О проекте',
    faq: 'FAQ',

    generating: 'Генерация...',
    yourSeed: 'Ваша Seed-фраза',
    writeDown: 'Запишите эти 24 слова!',
    seedWarning: 'Никому не показывайте',
    copySeed: 'Копировать',
    continue: 'Я записал(а)',
    back: '← Назад',

    verifySeed: 'Проверка Seed',
    enterWord: 'Введите слово #',
    verify: 'Проверить',
    wrongWord: 'Неверное слово!',

    enterSeed: 'Введите Seed-фразу',
    seedPlaceholder: '24 слова...',
    import: 'Импортировать',
    connecting: 'Подключение...',
    securityNote: 'Хранится только локально',

    invalidSeed: 'Неверная seed-фраза (24 слова)',
    invalidBudget: 'Введите корректный бюджет',
    notEnough: 'Недостаточно баланса',
    invalidRef: 'Неверный адрес реферала',
    sameRef: 'Нельзя указать свой адрес',
  },
};

type Lang = 'en' | 'ru';
type Tab = 'home' | 'play' | 'results' | 'settings';
type Screen = 'main' | 'create' | 'verify' | 'import';
type GameLog = { id: number; status: 'success' | 'error' | 'pending'; message: string };
type WinResult = { id: number; amount: number; isWin: boolean; time: string };

function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('lotshot_lang');
    return (saved === 'ru' ? 'ru' : 'en') as Lang;
  });
  const t = translations[lang];

  const [tab, setTab] = useState<Tab>('home');
  const [screen, setScreen] = useState<Screen>('main');
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
  const [referral, setReferral] = useState(() => localStorage.getItem(REFERRAL_KEY) || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const shouldStopRef = useRef(false);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [stats, setStats] = useState({ sent: 0, failed: 0, total: 0 });
  const [winResults, setWinResults] = useState<WinResult[]>([]);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const seenTxHashesRef = useRef<Set<string>>(new Set());

  const [lotteryStats, setLotteryStats] = useState<{
    ticketsSold: number;
    ticketsToJackpot: number;
    prizes: typeof PRIZE_LIMITS;
  } | null>(null);

  const [verifyIndices] = useState(() => {
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * 24);
      if (!indices.includes(idx)) indices.push(idx);
    }
    return indices.sort((a, b) => a - b);
  });

  // Init Telegram WebApp
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();

      // Apply theme
      const theme = tg.themeParams;
      if (theme) {
        const root = document.documentElement;
        if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
        if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
        if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
        if (theme.link_color) root.style.setProperty('--tg-theme-link-color', theme.link_color);
        if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
        if (theme.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
        if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
      }
    }
  }, []);

  // Check saved wallet
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) loadSavedWallet();
  }, []);

  useEffect(() => {
    localStorage.setItem('lotshot_lang', lang);
  }, [lang]);

  // Fetch lottery stats
  const fetchLotteryStats = async () => {
    try {
      const endpoint = await getHttpEndpoint({ network: 'mainnet' });
      const client = new TonClient({ endpoint });
      const lotteryAddr = Address.parse(LOTTERY_ADDRESS);

      const fullDataResult = await client.runMethod(lotteryAddr, 'get_full_data');
      const countersResult = await client.runMethod(lotteryAddr, 'get_counters');

      fullDataResult.stack.pop();
      const nextTicketIndex = Number(fullDataResult.stack.readBigNumber());
      const ticketsInCycle = nextTicketIndex % JACKPOT_CYCLE;

      const jpWon = Number(countersResult.stack.readBigNumber());
      const x200Won = Number(countersResult.stack.readBigNumber());
      const x77Won = Number(countersResult.stack.readBigNumber());
      const x20Won = Number(countersResult.stack.readBigNumber());
      const x7Won = Number(countersResult.stack.readBigNumber());
      const x3Won = Number(countersResult.stack.readBigNumber());
      const x1Won = Number(countersResult.stack.readBigNumber());

      setLotteryStats({
        ticketsSold: nextTicketIndex,
        ticketsToJackpot: JACKPOT_CYCLE - ticketsInCycle,
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
      console.error('Failed to fetch stats:', e);
    }
  };

  useEffect(() => {
    fetchLotteryStats();
    const interval = setInterval(fetchLotteryStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const haptic = (type: 'light' | 'medium' | 'success' | 'error') => {
    if (tg?.HapticFeedback) {
      if (type === 'success' || type === 'error') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    }
  };

  const addLog = useCallback((status: 'success' | 'error' | 'pending', message: string) => {
    setLogs(prev => [...prev.slice(-50), { id: Date.now() + Math.random(), status, message }]);
  }, []);

  // Wallet functions
  const generateWallet = async () => {
    setIsLoading(true);
    haptic('light');
    try {
      const mnemonic = await mnemonicNew(24);
      setNewMnemonic(mnemonic);
      setScreen('create');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const connectWallet = async (seed: string) => {
    const words = seed.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length !== 24) {
      alert(t.invalidSeed);
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = await getHttpEndpoint({ network: 'mainnet' });
      const client = new TonClient({ endpoint });
      const keyPair = await mnemonicToPrivateKey(words);
      const wallet = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
      const contract = client.open(wallet);

      let balance = BigInt(0);
      try { balance = await contract.getBalance(); } catch {}

      localStorage.setItem(STORAGE_KEY, seed.trim());
      setWalletData({
        address: wallet.address.toString(),
        balance: (Number(balance) / 1e9).toFixed(4),
        contract,
        keyPair,
        client,
      });
      setScreen('main');
      setTab('play');
      haptic('success');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedWallet = async () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) await connectWallet(saved);
  };

  const disconnectWallet = () => {
    haptic('medium');
    localStorage.removeItem(STORAGE_KEY);
    setWalletData(null);
    setTab('home');
    setLogs([]);
    setWinResults([]);
  };

  const refreshBalance = async () => {
    if (!walletData) return;
    try {
      const balance = await walletData.contract.getBalance();
      setWalletData(prev => prev ? { ...prev, balance: (Number(balance) / 1e9).toFixed(4) } : null);
    } catch {}
  };

  const copyAddress = () => {
    if (walletData) {
      navigator.clipboard.writeText(walletData.address);
      setCopied(true);
      haptic('light');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startVerification = () => {
    setVerifyWordIndex(0);
    setVerifyInput('');
    setScreen('verify');
  };

  const checkVerifyWord = () => {
    const correctWord = newMnemonic[verifyIndices[verifyWordIndex]];
    if (verifyInput.trim().toLowerCase() === correctWord.toLowerCase()) {
      if (verifyWordIndex < 2) {
        setVerifyWordIndex(verifyWordIndex + 1);
        setVerifyInput('');
        haptic('light');
      } else {
        connectWallet(newMnemonic.join(' '));
      }
    } else {
      haptic('error');
      alert(t.wrongWord);
    }
  };

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const checkForWins = async (startTime?: number, resetSeen?: boolean) => {
    if (!walletData) return;
    if (resetSeen) seenTxHashesRef.current.clear();

    const filterTime = startTime || gameStartTime;
    const WIN_COMMENTS = ['Jackpot', 'x200', 'x77', 'x20', 'x7', 'x3', 'x1'];

    try {
      const response = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${walletData.address}&limit=50`);
      const data = await response.json();

      if (data.ok && data.result) {
        const lotteryAddr = Address.parse(LOTTERY_ADDRESS).toString();
        const newWins: WinResult[] = [];

        for (const tx of data.result) {
          const txTimestamp = tx.utime * 1000;
          if (filterTime && txTimestamp < filterTime) continue;

          const txHash = tx.transaction_id?.hash || `${tx.utime}-${tx.in_msg?.value}`;
          if (seenTxHashesRef.current.has(txHash)) continue;

          if (tx.in_msg && tx.in_msg.source === lotteryAddr) {
            const amount = Number(tx.in_msg.value || 0) / 1e9;
            const comment = tx.in_msg.message || '';
            const txTime = new Date(txTimestamp);
            const timeStr = `${txTime.getHours().toString().padStart(2, '0')}:${txTime.getMinutes().toString().padStart(2, '0')}`;

            const isWin = WIN_COMMENTS.includes(comment) && amount > 0;

            if (isWin) {
              seenTxHashesRef.current.add(txHash);
              newWins.push({ id: txHash, amount, isWin: true, time: timeStr });
              haptic('success');
            } else if (comment === 'Try Again') {
              seenTxHashesRef.current.add(txHash);
            }
          }
        }

        if (newWins.length > 0) {
          setWinResults(prev => [...prev, ...newWins]);
        }
      }
    } catch (e) {
      console.error('Failed to check wins:', e);
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
      alert(t.notEnough);
      return;
    }

    if (referral.trim()) {
      try {
        const refAddr = Address.parse(referral.trim());
        if (refAddr.equals(Address.parse(walletData.address))) {
          alert(t.sameRef);
          return;
        }
      } catch {
        alert(t.invalidRef);
        return;
      }
    }

    const startTime = Date.now();
    setGameStartTime(startTime);
    setStats({ sent: 0, failed: 0, total: totalTickets });
    setIsPlaying(true);
    shouldStopRef.current = false;
    setLogs([]);
    setWinResults([]);
    seenTxHashesRef.current.clear();
    haptic('medium');

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
        addLog('error', `Stopped at ${i}`);
        break;
      }

      let success = false;
      for (let attempt = 1; attempt <= 3 && !success && !shouldStopRef.current; attempt++) {
        addLog('pending', `[${i}/${totalTickets}] ${attempt > 1 ? `Retry ${attempt}` : 'Sending...'}`);

        try {
          let body = beginCell();
          if (referral.trim()) {
            try { body.storeAddress(Address.parse(referral.trim())); } catch {}
          }

          await walletData.contract.sendTransfer({
            secretKey: walletData.keyPair.secretKey,
            seqno: seqno,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            messages: [internal({ to: lotteryAddr, value: toNano(TICKET_PRICE), body: body.endCell() })],
          });

          seqno++;
          sent++;
          success = true;
          setStats({ sent, failed, total: totalTickets });
          addLog('success', `[${i}/${totalTickets}] ✓`);

          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          setWinResults(prev => [...prev, { id: Date.now() + Math.random(), amount: TICKET_PRICE, isWin: false, time: timeStr }]);

        } catch (e: any) {
          if (attempt === 3) {
            failed++;
            setStats({ sent, failed, total: totalTickets });
            addLog('error', `[${i}/${totalTickets}] ✗`);
          }
          await sleep(3000);
          try { seqno = await walletData.contract.getSeqno(); } catch {}
        }
      }

      if (i < totalTickets && !shouldStopRef.current) {
        await sleep(DELAY_BETWEEN_TICKETS);
      }
    }

    await refreshBalance();
    setIsPlaying(false);
    haptic('success');

    await sleep(5000);
    await checkForWins(startTime, true);
  };

  const budgetNum = parseFloat(budget) || 0;
  const totalTickets = Math.floor(budgetNum / TICKET_PRICE);
  const estimatedCost = totalTickets * TICKET_PRICE + totalTickets * 0.05;

  const totalWon = winResults.filter(r => r.isWin).reduce((sum, r) => sum + r.amount, 0);
  const totalSpent = stats.sent * TICKET_PRICE;
  const netResult = totalWon - totalSpent;

  // ============ RENDER ============
  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="lang-switcher">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'ru' ? 'active' : ''} onClick={() => setLang('ru')}>RU</button>
        </div>
        <img src="https://ton.lotshot.io/static/media/Lotshot.3ce510c1d68b5b2a71f3e381ffec0f34.svg" alt="Lotshot" className="logo" />
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Create Screen */}
        {screen === 'create' && (
          <>
            <h3 className="page-title">{t.yourSeed}</h3>
            <p className="warning">{t.writeDown}</p>

            <div className="seed-grid">
              {newMnemonic.map((word, i) => (
                <div key={i} className="seed-word">
                  <span className="word-num">{i + 1}.</span>
                  <span className="word">{word}</span>
                </div>
              ))}
            </div>

            <p className="warning-red">{t.seedWarning}</p>

            <button className="btn primary" onClick={startVerification}>{t.continue}</button>
            <button className="btn secondary" onClick={() => setScreen('main')}>{t.back}</button>
          </>
        )}

        {/* Verify Screen */}
        {screen === 'verify' && (
          <>
            <h3 className="page-title">{t.verifySeed}</h3>
            <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: 13 }}>
              {t.enterWord}<strong>{verifyIndices[verifyWordIndex] + 1}</strong>
            </p>

            <div className="verify-dots">
              {[0, 1, 2].map(i => (
                <div key={i} className={`verify-dot ${i < verifyWordIndex ? 'done' : i === verifyWordIndex ? 'current' : ''}`} />
              ))}
            </div>

            <div className="input-group">
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder={`Word #${verifyIndices[verifyWordIndex] + 1}`}
                onKeyDown={(e) => e.key === 'Enter' && checkVerifyWord()}
                autoFocus
              />
            </div>

            <button className="btn primary" onClick={checkVerifyWord} disabled={!verifyInput.trim()}>{t.verify}</button>
            <button className="btn secondary" onClick={() => setScreen('create')}>{t.back}</button>
          </>
        )}

        {/* Import Screen */}
        {screen === 'import' && (
          <>
            <h3 className="page-title">{t.enterSeed}</h3>
            <textarea
              className="import-screen"
              placeholder={t.seedPlaceholder}
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              rows={4}
              disabled={isLoading}
            />
            <p className="security-note">🔒 {t.securityNote}</p>
            <button className="btn primary" onClick={() => connectWallet(importInput)} disabled={isLoading || !importInput.trim()}>
              {isLoading ? t.connecting : t.import}
            </button>
            <button className="btn secondary" onClick={() => setScreen('main')}>{t.back}</button>
          </>
        )}

        {/* Main Screens (by tab) */}
        {screen === 'main' && (
          <>
            {/* HOME TAB */}
            {tab === 'home' && (
              <>
                {/* Stats */}
                {lotteryStats && (
                  <div className="card">
                    <div className="stats-card">
                      <div className="stat-item">
                        <div className="stat-value">{TICKET_PRICE}</div>
                        <div className="stat-label">{t.ticketPrice} TON</div>
                      </div>
                      <div className="stat-item highlight">
                        <div className="stat-value">{lotteryStats.ticketsToJackpot.toLocaleString()}</div>
                        <div className="stat-label">{t.toJackpot}</div>
                      </div>
                    </div>

                    {/* Prizes horizontal scroll */}
                    <div className="prizes-scroll">
                      <div className="prize-chip jackpot">
                        <span className="name">Jackpot</span>
                        <span className="count">{lotteryStats.prizes.jackpot}</span>
                      </div>
                      <div className="prize-chip">
                        <span className="name">x200</span>
                        <span className="count">{lotteryStats.prizes.x200}</span>
                      </div>
                      <div className="prize-chip">
                        <span className="name">x77</span>
                        <span className="count">{lotteryStats.prizes.x77}</span>
                      </div>
                      <div className="prize-chip">
                        <span className="name">x20</span>
                        <span className="count">{lotteryStats.prizes.x20}</span>
                      </div>
                      <div className="prize-chip">
                        <span className="name">x7</span>
                        <span className="count">{lotteryStats.prizes.x7}</span>
                      </div>
                      <div className="prize-chip">
                        <span className="name">x3</span>
                        <span className="count">{lotteryStats.prizes.x3}</span>
                      </div>
                      <div className="prize-chip">
                        <span className="name">x1</span>
                        <span className="count">{lotteryStats.prizes.x1}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Connect Wallet */}
                {!walletData && (
                  <div className="card">
                    <button className="btn primary" onClick={generateWallet} disabled={isLoading}>
                      {isLoading ? t.generating : t.createWallet}
                    </button>
                    <button className="btn secondary" onClick={() => setScreen('import')}>
                      {t.importWallet}
                    </button>
                  </div>
                )}

                {/* Wallet Connected */}
                {walletData && (
                  <div className="card">
                    <div className="wallet-mini">
                      <div className="balance">
                        <div className="balance-value">{walletData.balance} TON</div>
                        <div className="balance-label">{t.balance}</div>
                      </div>
                      <button className="topup-btn" onClick={() => setShowQR(true)}>{t.topUp}</button>
                    </div>

                    <div className="address-mini">
                      <code>{walletData.address}</code>
                      <span className="version">v4R2</span>
                      <button className="copy-btn-mini" onClick={copyAddress}>
                        {copied ? '✓' : t.copy}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* PLAY TAB */}
            {tab === 'play' && walletData && (
              <>
                <div className="wallet-mini">
                  <div className="balance">
                    <div className="balance-value">{walletData.balance} TON</div>
                    <div className="balance-label">{t.balance}</div>
                  </div>
                  <button className="topup-btn" onClick={refreshBalance}>↻</button>
                </div>

                <div className="card">
                  <div className="input-group">
                    <label>{t.budget}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={t.budgetPlaceholder}
                      value={budget}
                      onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ''))}
                      disabled={isPlaying}
                    />
                  </div>

                  <div className="input-group">
                    <label>{t.referral}</label>
                    <div className="referral-row">
                      <input
                        type="text"
                        placeholder={t.referralPlaceholder}
                        value={referral}
                        onChange={(e) => {
                          setReferral(e.target.value.trim());
                          localStorage.setItem(REFERRAL_KEY, e.target.value.trim());
                        }}
                        disabled={isPlaying}
                      />
                      {referral && (
                        <button className="clear-btn" onClick={() => { setReferral(''); localStorage.removeItem(REFERRAL_KEY); }}>✕</button>
                      )}
                    </div>
                  </div>

                  {budgetNum > 0 && (
                    <div className="estimate">
                      <span>{t.willBuy}: <strong>{totalTickets}</strong></span>
                      <span>{t.estCost}: <strong>~{estimatedCost.toFixed(1)} TON</strong></span>
                    </div>
                  )}

                  <button
                    className={`play-btn ${isPlaying ? 'stop' : ''}`}
                    onClick={() => isPlaying ? (shouldStopRef.current = true) : play()}
                    disabled={!budgetNum || budgetNum <= 0}
                  >
                    {isPlaying ? t.stopBtn : t.playBtn}
                  </button>
                </div>

                {/* Progress */}
                {(isPlaying || stats.sent > 0) && (
                  <div className="card">
                    <div className="progress-mini">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${stats.total > 0 ? ((stats.sent + stats.failed) / stats.total) * 100 : 0}%` }} />
                      </div>
                      <div className="progress-stats">
                        <span className="sent">{t.sent}: {stats.sent}</span>
                        <span className="failed">{t.failed}: {stats.failed}</span>
                        <span>{stats.sent + stats.failed}/{stats.total}</span>
                      </div>
                    </div>

                    <div className="logs-mini">
                      {logs.slice(-15).map((log) => (
                        <div key={log.id} className={`log ${log.status}`}>{log.message}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'play' && !walletData && (
              <div className="empty-state">
                <div className="icon">🔐</div>
                <p>{t.connectWallet}</p>
                <button className="btn primary" style={{ marginTop: 16 }} onClick={() => setTab('home')}>
                  {t.home}
                </button>
              </div>
            )}

            {/* RESULTS TAB */}
            {tab === 'results' && (
              <>
                {winResults.length > 0 ? (
                  <>
                    <div className="results-summary">
                      <div className="result-item">
                        <div className={`result-value positive`}>+{totalWon.toFixed(2)}</div>
                        <div className="result-label">{t.won}</div>
                      </div>
                      <div className="result-item">
                        <div className={`result-value negative`}>-{totalSpent.toFixed(2)}</div>
                        <div className="result-label">{t.lost}</div>
                      </div>
                      <div className="result-item">
                        <div className={`result-value ${netResult >= 0 ? 'positive' : 'negative'}`}>
                          {netResult >= 0 ? '+' : ''}{netResult.toFixed(2)}
                        </div>
                        <div className="result-label">{t.net}</div>
                      </div>
                    </div>

                    {gameStartTime > 0 && (
                      <button className="btn secondary" onClick={() => checkForWins()} disabled={isPlaying} style={{ marginBottom: 12 }}>
                        ↻ {t.refreshWins}
                      </button>
                    )}

                    <div className="wins-list">
                      {winResults.slice().reverse().map((result) => (
                        <div key={result.id} className={`win-item ${result.isWin ? 'win' : 'loss'}`}>
                          <span className={`win-amount ${result.isWin ? 'positive' : 'negative'}`}>
                            {result.isWin ? `+${result.amount.toFixed(2)}` : `-${TICKET_PRICE}`} TON
                          </span>
                          <span className="win-time">{result.time}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="icon">🎰</div>
                    <p>{t.noResults}</p>
                  </div>
                )}
              </>
            )}

            {/* SETTINGS TAB */}
            {tab === 'settings' && (
              <>
                <div className="settings-list">
                  <div className="settings-item" onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}>
                    <span className="label">{t.language}</span>
                    <span className="value">{lang === 'en' ? 'English' : 'Русский'}</span>
                  </div>

                  <a href="https://ton.lotshot.io/" target="_blank" rel="noopener noreferrer" className="link-item">
                    <span className="icon">🌐</span>
                    <div className="text">
                      <div className="title">{t.officialSite}</div>
                      <div className="desc">ton.lotshot.io</div>
                    </div>
                  </a>

                  <a href="https://github.com/kdev-code/lotshot-autoplay" target="_blank" rel="noopener noreferrer" className="link-item">
                    <span className="icon">📦</span>
                    <div className="text">
                      <div className="title">{t.github}</div>
                      <div className="desc">Open Source</div>
                    </div>
                  </a>
                </div>

                <div className="support-section">
                  <div className="support-title">{t.supportProject}</div>
                  <div className="support-desc">{t.supportDesc}</div>
                  <div className="support-address">
                    <span className="ton-icon">💎</span>
                    <code>UQCwCYI_4tLe7JOBLz4571m-ehDihIoxILlR3l1Je5XltHyF</code>
                  </div>
                  <button
                    className="btn secondary copy-support"
                    onClick={() => {
                      navigator.clipboard.writeText('UQCwCYI_4tLe7JOBLz4571m-ehDihIoxILlR3l1Je5XltHyF');
                      haptic('success');
                    }}
                  >
                    {t.copy}
                  </button>
                </div>

                {walletData && (
                  <button className="disconnect-btn" onClick={disconnectWallet}>
                    {t.disconnect}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      {screen === 'main' && (
        <nav className="bottom-nav">
          <button className={`nav-item ${tab === 'home' ? 'active' : ''}`} onClick={() => { setTab('home'); haptic('light'); }}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>{t.home}</span>
          </button>
          <button className={`nav-item ${tab === 'play' ? 'active' : ''}`} onClick={() => { setTab('play'); haptic('light'); }}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
            <span>{t.play}</span>
          </button>
          <button className={`nav-item ${tab === 'results' ? 'active' : ''}`} onClick={() => { setTab('results'); haptic('light'); }}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <span>{t.results}</span>
          </button>
          <button className={`nav-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => { setTab('settings'); haptic('light'); }}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>{t.settings}</span>
          </button>
        </nav>
      )}

      {/* QR Modal */}
      {showQR && walletData && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.topUp}</h3>
            <div className="qr-container">
              <div className="qr-wrapper">
                <QRCode
                  value={`ton://transfer/${walletData.address}`}
                  size={180}
                  bgColor="#1a1a2e"
                  fgColor="#ffffff"
                  qrStyle="squares"
                  ecLevel="M"
                />
              </div>
            </div>
            <div className="modal-address">{walletData.address}</div>
            <button className="btn primary" onClick={copyAddress}>{copied ? '✓ Copied' : t.copy}</button>
            <button className="btn secondary" onClick={() => setShowQR(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
