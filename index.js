const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

// Konfigurasi Assets
const BG_URL = "https://wallpapercave.com/wp/wp11166318.jpg"; 
const MUSIC_URL = "https://files.catbox.moe/x5d0fh.mp3";

// --- DASHBOARD HTML ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KAAAOFFC - OFFICIAL API</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { transition: 0.5s; background-size: cover; background-position: center; background-attachment: fixed; }
            .dark { background-image: linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.9)), url('${BG_URL}'); color: #f8fafc; }
            .light { background: #f1f5f9; color: #1e293b; }
            .glass { backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.05); }
            .light .glass { background: rgba(0, 0, 0, 0.05); border: 1px solid rgba(0, 0, 0, 0.1); }
            @keyframes pulse-sky { 0%, 100% { text-shadow: 0 0 10px #38bdf8; } 50% { text-shadow: 0 0 20px #38bdf8, 0 0 30px #38bdf8; } }
            .glow { animation: pulse-sky 2s infinite; }
        </style>
    </head>
    <body class="dark" id="mainBody" onclick="playMusic()">
        <nav class="p-6 flex justify-between items-center max-w-6xl mx-auto">
            <h1 class="text-2xl font-bold text-sky-400 glow">🚀 KaaaOFFC<span class="text-white">API</span></h1>
            <div class="flex gap-4">
                <button onclick="toggleTheme()" class="p-2 glass rounded-lg text-xs font-bold uppercase">Toggle Theme</button>
            </div>
        </nav>

        <main class="max-w-6xl mx-auto px-6 py-10 text-center">
            <h2 class="text-5xl md:text-7xl font-black mb-4 tracking-tighter">SIMPLIFY YOUR <span class="text-sky-500">PROJECT</span></h2>
            <p class="text-slate-400 mb-8 max-w-xl mx-auto">Akses ratusan endpoint API berkualitas tinggi dengan satu platform terintegrasi. Cepat, aman, dan tanpa port asu.</p>
            
            <div class="flex flex-wrap justify-center gap-4 mb-16">
                <a href="/docs" class="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-sky-500/40 transition">Explore Docs</a>
                <a href="/info/update" class="glass px-8 py-3 rounded-xl font-bold hover:bg-white/10 transition">Info Update</a>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div class="glass p-8 rounded-3xl">
                    <h3 class="text-4xl font-bold text-sky-400" id="stat1">0</h3>
                    <p class="text-xs uppercase tracking-widest text-slate-500 mt-2">Requests Today</p>
                </div>
                <div class="glass p-8 rounded-3xl border-sky-500/30">
                    <h3 class="text-4xl font-bold text-sky-400" id="stat2">0</h3>
                    <p class="text-xs uppercase tracking-widest text-slate-500 mt-2">Monthly Rekap</p>
                </div>
                <div class="glass p-8 rounded-3xl">
                    <h3 class="text-4xl font-bold text-sky-400" id="stat3">0</h3>
                    <p class="text-xs uppercase tracking-widest text-slate-500 mt-2">Total All Time</p>
                </div>
            </div>

            <div class="glass p-8 rounded-3xl text-left max-w-2xl mx-auto">
                <h3 class="font-bold text-sky-400 mb-3 flex items-center gap-2">🛡️ TERMS OF SERVICE</h3>
                <div class="text-sm text-slate-400 space-y-2">
                    <p>• Dilarang spamming endpoint berlebihan.</p>
                    <p>• Layanan bersifat publik, gunakan secara bijak.</p>
                    <p>• Kami tidak bertanggung jawab atas data yang lu ambil.</p>
                </div>
            </div>
        </main>

        <footer class="py-10 text-slate-500 text-[10px] text-center uppercase tracking-[5px]">
            Created by KaaaOfficial • Kediri Pride
        </footer>

        <audio id="audioPlayer" loop><source src="${MUSIC_URL}" type="audio/mpeg"></audio>

        <script>
            function playMusic() { document.getElementById("audioPlayer").play(); }
            function toggleTheme() {
                const b = document.getElementById('mainBody');
                b.classList.toggle('dark'); b.classList.toggle('light');
            }
            function counter(id, end) {
                let current = 0;
                let step = end / 50;
                let timer = setInterval(() => {
                    current += step;
                    if (current >= end) { clearInterval(timer); current = end; }
                    document.getElementById(id).innerText = Math.floor(current).toLocaleString('id-ID');
                }, 30);
            }
            window.onload = () => { counter('stat1', 1988); counter('stat2', 104497); counter('stat3', 294104); };
        </script>
    </body>
    </html>
    `);
});

// --- API LOGIC ---

// 1. Info Update
app.get('/info/update', (req, res) => {
    res.send(`
    <body class="bg-[#0f172a] text-white font-sans flex items-center justify-center h-screen" onclick="location.href='/'">
        <div class="p-10 border-l-4 border-sky-500 bg-slate-900 rounded-r-xl shadow-2xl max-w-md">
            <h1 class="text-2xl font-bold mb-4 text-sky-400">📢 INFORMASI UPDATE!</h1>
            <p class="text-slate-400 text-sm mb-4">Versi Terbaru: <b>3.0.0 (Vercel Edition)</b></p>
            <ul class="space-y-2 text-sm">
                <li>✅ New: Pro Dashboard Style</li>
                <li>✅ New: Stats Request Animation</li>
                <li>✅ New: Dark & Light Mode System</li>
                <li>✅ New: Sholat Kota Semua Endpoint</li>
            </ul>
            <p class="mt-6 text-xs text-sky-500 font-bold">KLIK DI MANA SAJA UNTUK KEMBALI</p>
        </div>
    </body>`);
});

// 2. Documentation JSON
app.get('/docs', (req, res) => {
    res.json({
        status: true,
        creator: "Kaaaoffc",
        stats: { requests_today: 1988, total: 294104 },
        endpoints: {
            sholat: { kota_semua: "/api/sholat/kota/semua", jadwal: "/api/sholat/jadwal?id=1301" },
            social: { tiktok: "/api/tiktok?q=query" },
            ai: { gemini: "/api/gemini?text=halo" }
        }
    });
});

// 3. Endpoint Sholat
app.get('/api/sholat/kota/semua', async (req, res) => {
    try {
        const r = await axios.get("https://api.myquran.com/v2/sholat/kota/semua");
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.data });
    } catch (e) { res.status(500).json({ status: false }); }
});

// 4. Endpoint TikTok
app.get('/api/tiktok', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, message: "Query q diperlukan" });
    try {
        const r = await axios.get("https://api.nexray.web.id/search/tiktok?q=" + encodeURIComponent(q));
        res.json({ status: true, result: r.data.result });
    } catch (e) { res.status(500).json({ status: false }); }
});

// 5. Endpoint Gemini
app.get('/api/gemini', async (req, res) => {
    const t = req.query.text;
    if (!t) return res.json({ status: false, message: "Text diperlukan" });
    try {
        const r = await axios.get("https://api.nexray.web.id/ai/gemini?text=" + encodeURIComponent(t));
        res.json({ status: true, result: r.data.result });
    } catch (e) { res.status(500).json({ status: false }); }
});

module.exports = app;
