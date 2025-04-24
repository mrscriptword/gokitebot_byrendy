import fetch from 'node-fetch';
import chalk from 'chalk';
import readline from 'readline';
import fs from 'fs/promises';
import { banner } from './banner.js';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Fungsi untuk menunggu input dari pengguna
const waitForKeyPress = async () => {
    process.stdin.setRawMode(true);
    return new Promise(resolve => {
        process.stdin.once('data', () => {
            process.stdin.setRawMode(false);
            resolve();
        });
    });
};

// Fungsi untuk memuat daftar wallet dari file wallets.txt
async function loadWallets() {
    try {
        const data = await fs.readFile('wallets.txt', 'utf8');
        const wallets = data.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        
        if (wallets.length === 0) {
            throw new Error('No wallets found in wallets.txt');
        }
        return wallets;
    } catch (err) {
        console.log(`${chalk.red('[ERROR]')} Error reading wallets.txt: ${err.message}`);
        process.exit(1);
    }
}

// Fungsi untuk memuat daftar proxy dari file proxies.txt
async function loadProxies() {
    try {
        const data = await fs.readFile('proxies.txt', 'utf8');
        return data.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(proxy => {
                if (proxy.includes('://')) {
                    const url = new URL(proxy);
                    const protocol = url.protocol.replace(':', '');
                    const auth = url.username ? `${url.username}:${url.password}` : '';
                    const host = url.hostname;
                    const port = url.port;
                    return { protocol, host, port, auth };
                } else {
                    const parts = proxy.split(':');
                    let [protocol, host, port, user, pass] = parts;
                    protocol = protocol.replace('//', '');
                    const auth = user && pass ? `${user}:${pass}` : '';
                    return { protocol, host, port, auth };
                }
            });
    } catch (err) {
        console.log(`${chalk.yellow('[INFO]')} No proxies.txt found. Using direct connection.`);
        return [];
    }
}

// Fungsi untuk membuat agent berdasarkan proxy
function createAgent(proxy) {
    if (!proxy) return null;
    
    const { protocol, host, port, auth } = proxy;
    const authString = auth ? `${auth}@` : '';
    const proxyUrl = `${protocol}://${authString}${host}:${port}`;
    
    return protocol.startsWith('socks') 
        ? new SocksProxyAgent(proxyUrl)
        : new HttpsProxyAgent(proxyUrl);
}

const getRandomQuestions = (questions, count) => {
    let shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

const AI_ENDPOINTS = {
    "https://deployment-hp4y88pxnqxwlmpxllicjzzn.stag-vxzy.zettablock.com/main": {
        "agent_id": "deployment_hp4y88pxnqxwlmpxllicjzzn",
        "name": "Kite AI Assistant",
        "questions": getRandomQuestions([
            "Bagaimana cara memanfaatkan AI untuk menulis kode yang lebih efisien?",
            "Apakah Kite AI bisa membantu dalam debugging otomatis?",
            "Bagaimana cara menggunakan Kite AI untuk menulis dokumentasi kode secara otomatis?",
            "Bagaimana cara meningkatkan akurasi prediksi kode dengan Kite AI?",
            "Apakah Kite AI dapat digunakan untuk mengidentifikasi kode yang redundan?",
            "Bagaimana cara melakukan analisis performa kode menggunakan Kite AI?",
            "Apakah Kite AI dapat memberikan saran optimasi berdasarkan pola coding saya?"
        ], 7)
    },
    "https://deployment-nc3y3k7zy6gekszmcsordhu7.stag-vxzy.zettablock.com/main": {
        "agent_id": "deployment_nc3y3k7zy6gekszmcsordhu7",
        "name": "Crypto Price Assistant",
        "questions": getRandomQuestions([
            "Bagaimana cara menggunakan AI untuk memprediksi harga kripto?",
            "Apa saja faktor utama yang dapat menyebabkan volatilitas harga Bitcoin?",
            "Bagaimana cara menentukan waktu terbaik untuk membeli dan menjual kripto?",
            "Bagaimana korelasi antara pasar saham dan harga kripto?",
            "Apakah ada indikator teknikal terbaik untuk trading harian kripto?",
            "Bagaimana cara menghindari FOMO dalam trading mata uang kripto?",
            "Apa perbedaan utama antara analisis teknikal dan fundamental dalam trading kripto?"
        ], 7)
    },
    "https://deployment-sofftlsf9z4fya3qchykaanq.stag-vxzy.zettablock.com/main": {
        "agent_id": "deployment_SoFftlsf9z4fyA3QCHYkaANq",
        "name": "Transaction Analyzer",
        "questions": getRandomQuestions([
            "Bagaimana cara mendeteksi transaksi yang mencurigakan di blockchain?",
            "Apa saja teknik terbaik untuk melacak transaksi dalam jaringan DeFi?",
            "Bagaimana cara menentukan apakah sebuah transaksi terkait dengan aktivitas ilegal?",
            "Bagaimana cara menggunakan blockchain explorer untuk memverifikasi transaksi?",
            "Apakah mungkin untuk membatalkan transaksi yang sudah dikonfirmasi di blockchain?",
            "Bagaimana cara mengetahui apakah dompet tertentu termasuk dalam kategori whale?",
            "Bagaimana dampak transaksi besar terhadap likuiditas pasar?"
        ], 7)
    }
};


console.log(AI_ENDPOINTS);


// Kelas untuk menyimpan statistik wallet
class WalletStatistics {
    constructor() {
        this.agentInteractions = {};
        for (const endpoint in AI_ENDPOINTS) {
            this.agentInteractions[AI_ENDPOINTS[endpoint].name] = 0;
        }
        this.totalPoints = 0;
        this.totalInteractions = 0;
        this.lastInteractionTime = null;
        this.successfulInteractions = 0;
        this.failedInteractions = 0;
    }
}

// Kelas untuk menyimpan sesi wallet
class WalletSession {
    constructor(walletAddress, sessionId) {
        this.walletAddress = walletAddress;
        this.sessionId = sessionId;
        this.dailyPoints = 0;
        this.startTime = new Date();
        this.nextResetTime = new Date(this.startTime.getTime() + 24 * 60 * 60 * 1000);
        this.statistics = new WalletStatistics();
    }

    updateStatistics(agentName, success = true) {
        this.statistics.agentInteractions[agentName]++;
        this.statistics.totalInteractions++;
        this.statistics.lastInteractionTime = new Date();
        if (success) {
            this.statistics.successfulInteractions++;
            this.statistics.totalPoints += 10; // Points per successful interaction
        } else {
            this.statistics.failedInteractions++;
        }
    }

    printStatistics() {
        console.log(`\n${chalk.blue(`[Session ${this.sessionId}]`)} ${chalk.green(`[${this.walletAddress}]`)} ${chalk.cyan('📊 Current Statistics')}`);
        console.log(`${chalk.yellow('════════════════════════════════════════════')}`);
        console.log(`${chalk.cyan('💰 Total Points:')} ${chalk.green(this.statistics.totalPoints)}`);
        console.log(`${chalk.cyan('🔄 Total Interactions:')} ${chalk.green(this.statistics.totalInteractions)}`);
        console.log(`${chalk.cyan('✅ Successful:')} ${chalk.green(this.statistics.successfulInteractions)}`);
        console.log(`${chalk.cyan('❌ Failed:')} ${chalk.red(this.statistics.failedInteractions)}`);
        console.log(`${chalk.cyan('⏱️ Last Interaction:')} ${chalk.yellow(this.statistics.lastInteractionTime?.toISOString() || 'Never')}`);
        
        console.log(`\n${chalk.cyan('🤖 Agent Interactions:')}`);
        for (const [agentName, count] of Object.entries(this.statistics.agentInteractions)) {
            console.log(`   ${chalk.yellow(agentName)}: ${chalk.green(count)}`);
        }
        console.log(chalk.yellow('════════════════════════════════════════════\n'));
    }
}

// Kelas utama untuk otomatisasi Kite AI
class KiteAIAutomation {
    constructor(walletAddress, proxyList = [], sessionId) {
        this.session = new WalletSession(walletAddress, sessionId);
        this.proxyList = proxyList;
        this.currentProxyIndex = 0;
        this.MAX_DAILY_POINTS = 200;
        this.POINTS_PER_INTERACTION = 10;
        this.MAX_DAILY_INTERACTIONS = this.MAX_DAILY_POINTS / this.POINTS_PER_INTERACTION;
        this.isRunning = true;
    }

    getCurrentProxy() {
        if (this.proxyList.length === 0) return null;
        return this.proxyList[this.currentProxyIndex];
    }

    rotateProxy() {
        if (this.proxyList.length === 0) return null;
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
        const proxy = this.getCurrentProxy();
        if (proxy) {
            this.logMessage('🔄', `Rotating to proxy: ${proxy.protocol}://${proxy.host}:${proxy.port}`, 'cyan');
        }
        return proxy;
    }

    logMessage(emoji, message, color = 'white') {
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const sessionPrefix = chalk.blue(`[Session ${this.session.sessionId}]`);
        const walletPrefix = chalk.green(`[${this.session.walletAddress.slice(0, 6)}...]`);
        console.log(`${chalk.yellow(`[${timestamp}]`)} ${sessionPrefix} ${walletPrefix} ${chalk[color](`${emoji} ${message}`)}`);
    }

    resetDailyPoints() {
        const currentTime = new Date();
        if (currentTime >= this.session.nextResetTime) {
            this.logMessage('✨', 'Starting new 24-hour reward period', 'green');
            this.session.dailyPoints = 0;
            this.session.nextResetTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
            return true;
        }
        return false;
    }

    async shouldWaitForNextReset() {
        if (this.session.dailyPoints >= this.MAX_DAILY_POINTS) {
            const waitSeconds = (this.session.nextResetTime - new Date()) / 1000;
            if (waitSeconds > 0) {
                this.logMessage('🎯', `Maximum daily points (${this.MAX_DAILY_POINTS}) reached`, 'yellow');
                this.logMessage('⏳', `Next reset: ${this.session.nextResetTime.toISOString().replace('T', ' ').slice(0, 19)}`, 'yellow');
                await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
                this.resetDailyPoints();
            }
            return true;
        }
        return false;
    }

    async sendAiQuery(endpoint, message) {
        const agent = createAgent(this.getCurrentProxy());
        const headers = {
            'Accept': 'text/event-stream',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        const data = {
            message,
            stream: true
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                agent,
                headers,
                body: JSON.stringify(data),
                timeout: 30000 // 30 detik
            });

            const sessionPrefix = chalk.blue(`[Session ${this.session.sessionId}]`);
            const walletPrefix = chalk.green(`[${this.session.walletAddress.slice(0, 6)}...]`);
            process.stdout.write(`${sessionPrefix} ${walletPrefix} ${chalk.cyan('🤖 AI Response: ')}`);
            
            let accumulatedResponse = "";

            for await (const chunk of response.body) {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6);
                            if (jsonStr === '[DONE]') break;

                            const jsonData = JSON.parse(jsonStr);
                            const content = jsonData.choices?.[0]?.delta?.content || '';
                            if (content) {
                                accumulatedResponse += content;
                                process.stdout.write(chalk.magenta(content));
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                }
            }
            console.log();
            return accumulatedResponse.trim();
        } catch (e) {
            this.logMessage('❌', `AI query error: ${e}`, 'red');
            this.rotateProxy();
            return "";
        }
    }

    async reportUsage(endpoint, message, response) {
        this.logMessage('📝', 'Recording interaction...', 'white');
        const url = 'https://quests-usage-dev.prod.zettablock.com/api/report_usage';
        const data = {
            wallet_address: this.session.walletAddress,
            agent_id: AI_ENDPOINTS[endpoint].agent_id,
            request_text: message,
            response_text: response,
            request_metadata: {}
        };

        try {
            const agent = createAgent(this.getCurrentProxy());
            const result = await fetch(url, {
                method: 'POST',
                agent,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: JSON.stringify(data)
            });
            return result.status === 200;
        } catch (e) {
            this.logMessage('❌', `Usage report error: ${e}`, 'red');
            this.rotateProxy();
            return false;
        }
    }

    async run() {
        this.logMessage('🚀', 'Initializing Kite AI Auto-Interaction System', 'green');
        this.logMessage('💼', `Wallet: ${this.session.walletAddress}`, 'cyan');
        this.logMessage('🎯', `Daily Target: ${this.MAX_DAILY_POINTS} points (${this.MAX_DAILY_INTERACTIONS} interactions)`, 'cyan');
        this.logMessage('⏰', `Next Reset: ${this.session.nextResetTime.toISOString().replace('T', ' ').slice(0, 19)}`, 'cyan');
        
        if (this.proxyList.length > 0) {
            this.logMessage('🌐', `Loaded ${this.proxyList.length} proxies`, 'cyan');
        } else {
            this.logMessage('🌐', 'Running in direct connection mode', 'yellow');
        }

        let interactionCount = 0;
        while (this.isRunning) {
            try {
                this.resetDailyPoints();
                await this.shouldWaitForNextReset();

                interactionCount++;
                console.log(`\n${chalk.blue(`[Session ${this.session.sessionId}]`)} ${chalk.green(`[${this.session.walletAddress}]`)} ${chalk.cyan('═'.repeat(60))}`);
                this.logMessage('🔄', `Interaction #${interactionCount}`, 'magenta');
                this.logMessage('📈', `Progress: ${this.session.dailyPoints + this.POINTS_PER_INTERACTION}/${this.MAX_DAILY_POINTS} points`, 'cyan');
                this.logMessage('⏰', `Next Reset: ${this.session.nextResetTime.toISOString().replace('T', ' ').slice(0, 19)}`, 'cyan');

                const endpoints = Object.keys(AI_ENDPOINTS);
                const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
                const questions = AI_ENDPOINTS[endpoint].questions;
                const question = questions[Math.floor(Math.random() * questions.length)];

                this.logMessage('🤖', `AI System: ${AI_ENDPOINTS[endpoint].name}`, 'cyan');
                this.logMessage('🔑', `Agent ID: ${AI_ENDPOINTS[endpoint].agent_id}`, 'cyan');
                this.logMessage('❓', `Query: ${question}`, 'cyan');

                const response = await this.sendAiQuery(endpoint, question);
                let interactionSuccess = false;

                if (await this.reportUsage(endpoint, question, response)) {
                    this.logMessage('✅', 'Interaction successfully recorded', 'green');
                    this.session.dailyPoints += this.POINTS_PER_INTERACTION;
                    interactionSuccess = true;
                } else {
                    this.logMessage('⚠️', 'Interaction recording failed', 'red');
                }

                this.session.updateStatistics(AI_ENDPOINTS[endpoint].name, interactionSuccess);
                this.session.printStatistics();

                const delay = Math.random() * (10 - 5) + 5;
                this.logMessage('⏳', `Cooldown: ${delay.toFixed(1)} seconds...`, 'yellow');
                await new Promise(resolve => setTimeout(resolve, delay * 1000));

            } catch (e) {
                this.logMessage('❌', `Error during interaction: ${e.message}`, 'red');
                const errorDelay = 30; // Wait longer on error
                this.logMessage('⏳', `Retrying in ${errorDelay} seconds...`, 'yellow');
                await new Promise(resolve => setTimeout(resolve, errorDelay * 1000));
            }
        }
    }

    stop() {
        this.isRunning = false;
    }
}

// Fungsi utama
async function main() {
    console.clear();
    
    // Display initial registration message
    console.log(`${chalk.cyan('📝 Daftar duluu:')} ${chalk.green('https://testnet.gokite.ai?r=NhXsUqpw')}`);
    console.log(chalk.magenta('Klik Apapun untuk melanjutkan........'));
    
    await waitForKeyPress();
    console.clear();
    
    console.log(banner);
    
    // Load wallets and proxies
    const wallets = await loadWallets();
    const proxyList = await loadProxies();
    
    console.log(`${chalk.cyan('📊 Loaded:')} ${chalk.green(wallets.length)} wallets and ${chalk.green(proxyList.length)} proxies\n`);
    
    // Create instances for each wallet with unique session IDs
    const instances = wallets.map((wallet, index) => 
        new KiteAIAutomation(wallet, proxyList, index + 1)
    );
    
    // Display initial statistics header
    console.log(chalk.cyan('\n════════════════════════'));
    console.log(chalk.cyan('🤖 Starting All Sessions'));
    console.log(chalk.cyan('════════════════════════\n'));
    
    // Run all instances
    try {
        await Promise.all(instances.map(instance => instance.run()));
    } catch (error) {
        console.log(`\n${chalk.red('❌ Fatal error:')} ${error.message}`);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log(`\n${chalk.yellow('🛑 Gracefully shutting down...')}`);
    process.exit(0);
});

// Global error handler
process.on('unhandledRejection', (error) => {
    console.error(`\n${chalk.red('❌ Unhandled rejection:')} ${error.message}`);
});

main().catch(error => {
    console.error(`\n${chalk.red('❌ Fatal error:')} ${error.message}`);
    process.exit(1);
});