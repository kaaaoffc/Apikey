const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

app.use(cors());

// --- CONFIG ---
const MONGO_URI = "mongodb+srv://eka710231_db_user:kaaacloud@cluster0.6ssgy30.mongodb.net/?appName=Cluster0"; 
const BG_URL = "https://wallpapercave.com/wp/wp11166318.jpg"; 
const MUSIC_URL = "https://files.catbox.moe/x5d0fh.mp3";

// --- DATABASE CONNECTION ---
mongoose.connect(MONGO_URI).catch(err => console.log(err));

const Stats = mongoose.model('Stats', new mongoose.Schema({
    name: { type: String, default: "api_stats" },
    total: { type: Number, default: 0 },
    today: { type: Number, default: 0 }
}));

// Auto-count API requests
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        await Stats.findOneAndUpdate({ name: "api_stats" }, { $inc: { total: 1, today: 1 } }, { upsert: true });
    }
    next();
});

// --- DASHBOARD ---
app.get('/', async (req, res) => {
    const data = await Stats.findOne({ name: "api_stats" }) || { total: 0, today: 0 };
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KaaaOFFC API - Premium</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { background: url('${BG_URL}') no-repeat center center fixed; background-size: cover; font-family: 'Inter', sans-serif; }
            .glass { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(56, 189, 248, 0.3); }
            .glow-text { text-shadow: 0 0 15px rgba(56, 189, 248, 0.8); }
        </style>
    </head>
    <body class="text-slate-200" onclick="document.getElementById('audio').play()">
        <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950/60">
            <div class="glass p-10 rounded-[2rem] max-w-4xl w-full text-center shadow-2xl">
                <h1 class="text-5xl font-black text-sky-400 mb-2 glow-text italic">KaaaOFFC API</h1>
                <p class="text-slate-400 mb-10 tracking-widest text-xs uppercase">Powering Modern Applications</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div class="p-6 bg-sky-500/10 rounded-2xl border border-sky-500/20">
                        <span class="block text-4xl font-bold text-sky-400">${data.today.toLocaleString()}</span>
                        <span class="text-[10px] text-sky-300 font-bold uppercase tracking-widest">Requests Today</span>
                    </div>
                    <div class="p-6 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                        <span class="block text-4xl font-bold text-indigo-400">${data.total.toLocaleString()}</span>
                        <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Total Lifetime</span>
                    </div>
                </div>

                <div class="flex flex-wrap justify-center gap-4">
                    <a href="/docs" class="bg-sky-500 hover:bg-sky-400 text-slate-900 px-10 py-4 rounded-full font-black transition-all transform hover:scale-105">EXPLORE DOCS</a>
                    <a href="/info/update" class="border border-sky-500/50 hover:bg-sky-500/10 px-10 py-4 rounded-full font-black transition-all">WHAT'S NEW?</a>
                </div>
            </div>
        </div>
        <audio id="audio" loop><source src="${MUSIC_URL}" type="audio/mpeg"></audio>
    </body>
    </html>
    `);
});

// --- BERWARNA DOCUMENTATION (PRO DOCS) ---
app.get('/docs', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Docs | KaaaOFFC API</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            code { background: #1e293b; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
            .method { font-weight: bold; padding: 4px 8px; border-radius: 6px; font-size: 0.7em; margin-right: 10px; }
            .get { background: #10b981; color: white; }
        </style>
    </head>
    <body class="bg-slate-950 text-slate-300 font-sans">
        <div class="max-w-4xl mx-auto p-6 md:p-12">
            <header class="mb-12 border-b border-slate-800 pb-6 flex justify-between items-end">
                <div>
                    <h1 class="text-3xl font-bold text-white">API Documentation</h1>
                    <p class="text-slate-500">v5.0.0 - Stable Release</p>
                </div>
                <a href="/" class="text-sky-500 text-sm font-bold">← Back to Home</a>
            </header>

            <div class="space-y-8">
                <section>
                    <h2 class="text-sky-400 font-bold mb-4 flex items-center gap-2"><span>🤖</span> ARTIFICIAL INTELLIGENCE</h2>
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <div class="flex items-center mb-2">
                            <span class="method get">GET</span>
                            <span class="font-mono text-white">/api/gemini</span>
                        </div>
                        <p class="text-sm text-slate-500 mb-4">Chat dengan AI Gemini Google secara gratis.</p>
                        <p class="text-xs font-bold text-slate-400 mb-2">QUERY PARAMETERS:</p>
                        <ul class="text-xs space-y-1 mb-4">
                            <li><code>text</code> - Pesan yang ingin ditanyakan.</li>
                        </ul>
                        <a href="/api/gemini?text=halo" class="text-xs text-sky-500 underline">Try it out →</a>
                    </div>
                </section>

                <section>
                    <h2 class="text-pink-400 font-bold mb-4 flex items-center gap-2"><span>📱</span> SOCIAL MEDIA</h2>
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <div class="flex items-center mb-2">
                            <span class="method get">GET</span>
                            <span class="font-mono text-white">/api/tiktok</span>
                        </div>
                        <p class="text-sm text-slate-500 mb-4">Cari video tiktok berdasarkan kata kunci.</p>
                        <p class="text-xs font-bold text-slate-400 mb-2">QUERY PARAMETERS:</p>
                        <ul class="text-xs space-y-1 mb-4">
                            <li><code>q</code> - Kata kunci pencarian.</li>
                        </ul>
                        <a href="/api/tiktok?q=kucing" class="text-xs text-sky-500 underline">Try it out →</a>
                    </div>
                </section>

                <section>
                    <h2 class="text-emerald-400 font-bold mb-4 flex items-center gap-2"><span>🕌</span> ISLAMIC FEATURES</h2>
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <div class="flex items-center mb-2">
                            <span class="method get">GET</span>
                            <span class="font-mono text-white">/api/sholat/kota/semua</span>
                        </div>
                        <p class="text-sm text-slate-500 mb-4">Mendapatkan seluruh daftar ID Kota di Indonesia.</p>
                        <a href="/api/sholat/kota/semua" class="text-xs text-sky-500 underline">View Cities →</a>
                    </div>
                </section>
            </div>

            <footer class="mt-20 text-center text-slate-600 text-[10px] uppercase tracking-widest">
                KaaaOFFC API Engine
            </footer>
        </div>
    </body>
    </html>
    `);
});

// --- API ENDPOINTS (TikTok, Gemini, Sholat) ---
app.get('/api/tiktok', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, message: "Query q required" });
    try {
        const r = await axios.get("https://api.nexray.web.id/search/tiktok?q=" + encodeURIComponent(q));
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.result });
    } catch (e) { res.status(500).json({ status: false }); }
});

app.get('/api/gemini', async (req, res) => {
    const t = req.query.text;
    if (!t) return res.json({ status: false, message: "Text required" });
    try {
        const r = await axios.get("https://api.nexray.web.id/ai/gemini?text=" + encodeURIComponent(t));
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.result });
    } catch (e) { res.status(500).json({ status: false }); }
});

app.get('/api/sholat/kota/semua', async (req, res) => {
    try {
        const r = await axios.get("https://api.myquran.com/v2/sholat/kota/semua");
        res.json({ status: true, result: r.data.data });
    } catch (e) { res.status(500).json({ status: false }); }
});

// Update Log
app.get('/info/update', (req, res) => {
    res.send(`<body style="background:#020617;color:white;display:flex;align-items:center;justify-center;height:100vh;font-family:sans-serif;margin:0;padding:20px;">
        <div style="border-left:4px solid #38bdf8;padding-left:20px;">
            <h1 style="color:#38bdf8">📢 V5 UPDATE</h1>
            <ul style="list-style:none;padding:0;line-height:2;">
                <li>🚀 UI Documentation Baru (Berwarna)</li>
                <li>📊 Real-Time MongoDB Database</li>
                <li>🎨 Glassmorphism Dashboard Premium</li>
            </ul>
            <a href="/" style="color:#38bdf8;text-decoration:none;font-weight:bold;">← BACK</a>
        </div>
    </body>`);
});

module.exports = app;
