import { TonClient, WalletContractV4 } from '@ton/ton';
import { Address, toNano, beginCell, internal } from '@ton/core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import * as readline from 'readline';

// ============ LOTTERY CONFIG ============
// Main lottery contract address (DO NOT CHANGE)
const LOTTERY_ADDRESS = 'EQCHbnxDzu6b7U25pLV2V1cWwh1IxxtHPKmZky4Wpo-m-WuM';

// Ticket price in TON
const TICKET_PRICE = 1;

// Delay between tickets (milliseconds)
const DELAY_MS = 5000;

// ============ Helpers ============

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ask(rl: readline.Interface, question: string): Promise<string> {
    return new Promise(resolve => rl.question(question, resolve));
}

function formatTon(nanotons: bigint): string {
    return (Number(nanotons) / 1e9).toFixed(4);
}

// ============ Main ============

async function main() {
    console.clear();

    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║       LOTSHOT TON - Automated Lottery Player     ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log();
    console.log(`Lottery: ${LOTTERY_ADDRESS}`);
    console.log(`Ticket price: ${TICKET_PRICE} TON`);
    console.log();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        const lotteryAddr = Address.parse(LOTTERY_ADDRESS);

        // ========== Step 1: Wallet ==========
        console.log('STEP 1: Enter your wallet seed phrase');
        console.log('(24 words separated by spaces)\n');

        const mnemonic = await ask(rl, 'Seed phrase: ');
        const mnemonicArray = mnemonic.trim().split(/\s+/).filter((w: string) => w.length > 0);

        if (mnemonicArray.length !== 24) {
            console.log(`\n❌ Error: Expected 24 words, got ${mnemonicArray.length}`);
            rl.close();
            return;
        }

        console.log('\nConnecting to wallet...');

        const client = new TonClient({
            endpoint: 'https://toncenter.com/api/v2/jsonRPC'
        });

        const keyPair = await mnemonicToPrivateKey(mnemonicArray);
        const wallet = WalletContractV4.create({
            publicKey: keyPair.publicKey,
            workchain: 0,
        });

        const walletContract = client.open(wallet);
        const balance = await walletContract.getBalance();

        console.log(`\n✓ Wallet: ${wallet.address.toString()}`);
        console.log(`✓ Balance: ${formatTon(balance)} TON\n`);

        // ========== Step 2: Budget ==========
        console.log('STEP 2: How much TON do you want to spend?');
        const budgetInput = await ask(rl, 'Budget in TON: ');
        const totalBudget = Number(budgetInput);

        if (isNaN(totalBudget) || totalBudget <= 0) {
            console.log('\n❌ Invalid budget');
            rl.close();
            return;
        }

        const totalTickets = Math.floor(totalBudget / TICKET_PRICE);
        const ticketsCost = totalTickets * TICKET_PRICE;
        const gasCost = totalTickets * 0.05;
        const totalNeeded = ticketsCost + gasCost;

        console.log(`\n✓ Will buy: ${totalTickets} tickets`);
        console.log(`✓ Cost: ${ticketsCost} TON + ~${gasCost.toFixed(2)} TON gas\n`);

        if (balance < toNano(totalNeeded.toString())) {
            console.log(`⚠️  WARNING: Not enough balance!`);
            console.log(`   Need: ~${totalNeeded.toFixed(2)} TON`);
            console.log(`   Have: ${formatTon(balance)} TON\n`);
        }

        // ========== Step 3: Referral (Optional) ==========
        console.log('STEP 3: Referral address (optional)');
        const refInput = await ask(rl, 'Referral address (press Enter to skip): ');

        let referralAddr: Address | null = null;
        if (refInput.trim()) {
            try {
                referralAddr = Address.parse(refInput.trim());
                console.log(`\n✓ Referral: ${referralAddr.toString()}\n`);
            } catch {
                console.log('\n⚠️  Invalid referral address, skipping...\n');
            }
        } else {
            console.log('\n✓ No referral\n');
        }

        // ========== Confirmation ==========
        console.log('═══════════════════════════════════════════════════');
        console.log('                    SUMMARY');
        console.log('═══════════════════════════════════════════════════');
        console.log(`Wallet:       ${wallet.address.toString().slice(0, 20)}...`);
        console.log(`Tickets:      ${totalTickets}`);
        console.log(`Total cost:   ~${totalNeeded.toFixed(2)} TON`);
        if (referralAddr) {
            console.log(`Referral:     ${referralAddr.toString().slice(0, 20)}...`);
        }
        console.log('═══════════════════════════════════════════════════');
        console.log();

        const confirm = await ask(rl, 'Start playing? Type YES to confirm: ');
        if (confirm.trim().toUpperCase() !== 'YES') {
            console.log('\nCancelled.');
            rl.close();
            return;
        }

        rl.close();

        // ========== Play ==========
        console.log('\n🎰 Starting lottery...\n');

        let successCount = 0;
        let failCount = 0;
        let seqno = await walletContract.getSeqno();

        for (let i = 1; i <= totalTickets; i++) {
            const progress = `[${i}/${totalTickets}]`;

            try {
                process.stdout.write(`${progress} Sending ticket... `);

                let body = beginCell();
                if (referralAddr) {
                    body.storeAddress(referralAddr);
                }

                await walletContract.sendTransfer({
                    secretKey: keyPair.secretKey,
                    seqno: seqno,
                    messages: [
                        internal({
                            to: lotteryAddr,
                            value: toNano(TICKET_PRICE.toString()),
                            body: body.endCell(),
                        }),
                    ],
                });

                successCount++;
                seqno++;
                console.log('✓ Sent!');

                if (i < totalTickets) {
                    await sleep(DELAY_MS);
                }

                if (i % 10 === 0) {
                    try {
                        const newSeqno = await walletContract.getSeqno();
                        if (newSeqno > seqno) seqno = newSeqno;
                    } catch {}
                }

            } catch (error: any) {
                failCount++;
                console.log(`✗ Failed: ${error.message?.slice(0, 50) || 'Unknown error'}`);

                await sleep(3000);
                try {
                    seqno = await walletContract.getSeqno();
                } catch {}
                await sleep(DELAY_MS);
            }
        }

        // ========== Results ==========
        console.log('\n═══════════════════════════════════════════════════');
        console.log('                    RESULTS');
        console.log('═══════════════════════════════════════════════════');
        console.log(`✓ Tickets sent:   ${successCount}`);
        console.log(`✗ Tickets failed: ${failCount}`);
        console.log(`💰 TON spent:     ~${(successCount * TICKET_PRICE).toFixed(2)} TON (+ gas)`);

        await sleep(5000);
        try {
            const finalBalance = await walletContract.getBalance();
            console.log(`💳 New balance:   ${formatTon(finalBalance)} TON`);
        } catch {}

        console.log('═══════════════════════════════════════════════════');
        console.log('\n🎉 Done! Check your wallet for prizes!\n');

    } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}`);
    } finally {
        rl.close();
    }
}

main().catch(console.error);
