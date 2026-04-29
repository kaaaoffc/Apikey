const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const cookieParser = require('cookie-parser');
const QRCode = require('qrcode');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const MONGO_URI = "mongodb+srv://eka710231_db_user:kaaacloud@cluster0.6ssgy30.mongodb.net/?appName=Cluster0";
const resend = new Resend("re_Y3DfKKCM_7rJCyA3V1JHoxUNxQ2sc7Fb1");

let isConnected = false;
async function connectDB() {
    if (isConnected) return;
    await mongoose.connect(MONGO_URI);
    isConnected = true;
}

// --- MODELS ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ 
    email: String, password: String, otp: String, isVerified: Boolean, createdAt: { type: Date, default: Date.now } 
}));
const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({ method: String, path: String, timestamp: { type: Date, default: Date.now } }));
const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({ name: String, total_req: Number }));

// --- AUTO TRACKING & HITS ---
app.use(async (req, res, next) => {
    if (req.path !== '/favicon.ico' && !req.path.startsWith('/auth')) {
        await connectDB();
        await Log.create({ method: req.method, path: req.path });
        await Stats.findOneAndUpdate({ name: "main" }, { $inc: { total_req: 1 } }, { upsert: true });
    }
    next();
});

// --- CORE API FEATURES (AI & TIKTOK) ---

// AI Gemini Chat
app.get('/api/ai', async (req, res) => {
    const { text } = req.query;
    if (!text) return res.json({ status: false, message: "Masukkan parameter text!" });
    try {
        // Menggunakan Blackbox/Gemini Endpoint
        const response = await axios.get(`https://www.blackbox.ai/api/chat?q=${encodeURIComponent(text)}`);
        res.json({ status: true, creator: "KaaaOffc", result: response.data });
    } catch (e) { res.json({ status: false, message: "AI Error" }); }
});

// TikTok Search
app.get('/api/tiktok', async (req, res) => {
    const { search } = req.query;
    if (!search) return res.json({ status: false, message: "Masukkan query pencarian!" });
    try {
        const response = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(search)}`);
        res.json({ status: true, creator: "KaaaOffc", result: response.data });
    } catch (e) { res.json({ status: false, message: "TikTok API Error" }); }
});

// QR Generator
app.get('/api/qrcode', async (req, res) => {
    const { text } = req.query;
    if (!text) return res.json({ status: false, message: "Mana teksnya?" });
    try {
        const qr = await QRCode.toDataURL(text);
        res.json({ status: true, creator: "KaaaOffc", result: qr });
    } catch (e) { res.json({ status: false }); }
});

// --- PAGES ---

app.get('/', async (req, res) => {
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');
    const userData = await User.findOne({ email });
    const totalAkun = await User.countDocuments();
    const stats = await Stats.findOne({ name: "main" }) || { total_req: 105902 };
    const logs = await Log.find().sort({ timestamp: -1 }).limit(5);
    
    res.send(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background: #020617; color: white; font-family: sans-serif; }
        .glass { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.05); }
        .sidebar { transition: 0.4s; transform: translateX(-100%); }
        .sidebar.active { transform: translateX(0); }
    </style></head>
    <body class="p-4">
        <div id="sidebar" class="sidebar fixed top-0 left-0 w-72 h-full glass z-50 p-8">
            <h2 class="text-sky-400 font-black mb-10 italic">KING STORE</h2>
            <nav class="space-y-4">
                <a href="/" class="block p-4 rounded-xl bg-sky-500/10 text-sky-400 font-bold"><i class="fas fa-home mr-3"></i> Dashboard</a>
                <a href="/list-cmd" class="block p-4 rounded-xl hover:bg-white/5"><i class="fas fa-terminal mr-3"></i> List Command</a>
                <a href="/docs" class="block p-4 rounded-xl hover:bg-white/5"><i class="fas fa-file-code mr-3"></i> Documentation</a>
                <a href="/logout" class="block p-4 rounded-xl text-red-400 mt-10"><i class="fas fa-sign-out-alt mr-3"></i> Logout</a>
            </nav>
            <button onclick="toggleSidebar()" class="absolute top-8 right-8 text-slate-500"><i class="fas fa-times"></i></button>
        </div>

        <div class="max-w-4xl mx-auto">
            <header class="flex justify-between items-center mb-8">
                <button onclick="toggleSidebar()" class="w-12 h-12 glass rounded-2xl text-sky-400 text-xl"><i class="fas fa-bars-staggered"></i></button>
                <h1 class="text-2xl font-black italic">KAAA<span class="text-sky-400">OFFC</span></h1>
                <button onclick="toggleModal()" class="w-12 h-12 rounded-full bg-sky-500 border-2 border-sky-300 font-black text-slate-900">${email.charAt(0).toUpperCase()}</button>
            </header>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="glass p-6 rounded-[35px] border-l-4 border-sky-500">
                    <p class="text-[10px] font-bold text-slate-500 uppercase">Total Request</p>
                    <p class="text-3xl font-black text-sky-400">${stats.total_req.toLocaleString()}</p>
                </div>
                <div class="glass p-6 rounded-[35px] border-l-4 border-emerald-500">
                    <p class="text-[10px] font-bold text-slate-500 uppercase">User Online</p>
                    <p class="text-3xl font-black text-emerald-400">1</p>
                </div>
            </div>

            <div class="glass p-6 rounded-[35px] mb-8 text-center grid grid-cols-2 gap-4">
                <div><p class="text-2xl font-black">${totalAkun}</p><p class="text-[9px] text-slate-500 uppercase">Total Accounts</p></div>
                <div><p class="text-2xl font-black text-white">48.91 GB</p><p class="text-[9px] text-slate-500 uppercase">RAM Usage</p></div>
            </div>

            <div class="glass p-8 rounded-[40px]">
                <h3 class="text-xs font-black text-sky-400 mb-6 uppercase tracking-widest">System Logs</h3>
                <div class="space-y-4">
                    ${logs.map(l => `<div class="flex justify-between text-[11px] font-mono border-b border-white/5 pb-3"><span><b class="text-sky-400">${l.method}</b> ${l.path}</span><span>${new Date(l.timestamp).toLocaleTimeString()}</span></div>`).join('')}
                </div>
            </div>
        </div>

        <div id="accModal" class="fixed inset-0 z-[60] bg-black/90 hidden items-center justify-center p-6">
            <div class="glass w-full max-w-sm rounded-[45px] p-10 relative border border-sky-500/30">
                <button onclick="toggleModal()" class="absolute top-8 right-8 text-slate-500"><i class="fas fa-times"></i></button>
                <div class="text-center mb-6">
                    <div class="w-20 h-20 rounded-full bg-sky-500 mx-auto flex items-center justify-center text-3xl font-black text-slate-900 mb-4">${email.charAt(0).toUpperCase()}</div>
                    <h2 class="font-black italic">ACCOUNT INFO</h2>
                </div>
                <div class="space-y-3 text-xs">
                    <div class="bg-white/5 p-4 rounded-xl"><b>Email:</b> ${userData.email}</div>
                    <div class="bg-white/5 p-4 rounded-xl"><b>Pass:</b> ••••••••</div>
                    <div class="bg-white/5 p-4 rounded-xl"><b>Created:</b> ${new Date(userData.createdAt).toLocaleDateString()}</div>
                </div>
            </div>
        </div>

        <script>
            function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }
            function toggleModal() { const m = document.getElementById('accModal'); m.classList.toggle('hidden'); m.classList.toggle('flex'); }
        </script>
    </body></html>`);
});

app.get('/list-cmd', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></head>
    <body class="bg-[#020617] text-white p-6 font-sans">
        <div class="max-w-2xl mx-auto">
            <header class="flex items-center mb-10"><a href="/" class="mr-4 text-sky-400 text-xl"><i class="fas fa-arrow-left"></i></a><h1 class="text-3xl font-black italic">COMMAND <span class="text-sky-400">LIST</span></h1></header>
            <div class="grid gap-4 text-sm">
                <div class="bg-white/5 p-6 rounded-3xl border border-white/5 flex justify-between">
                    <div><p class="text-sky-400 font-bold">AI Gemini</p><p class="text-slate-500">/api/ai?text=Halo</p></div><i class="fas fa-robot text-sky-500"></i>
                </div>
                <div class="bg-white/5 p-6 rounded-3xl border border-white/5 flex justify-between">
                    <div><p class="text-sky-400 font-bold">TikTok Search</p><p class="text-slate-500">/api/tiktok?search=Video</p></div><i class="fab fa-tiktok text-white"></i>
                </div>
                <div class="bg-white/5 p-6 rounded-3xl border border-white/5 flex justify-between">
                    <div><p class="text-sky-400 font-bold">QR Generator</p><p class="text-slate-500">/api/qrcode?text=Kaaa</p></div><i class="fas fa-qrcode text-white"></i>
                </div>
            </div>
        </div>
    </body></html>`);
});

app.get('/docs', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-[#020617] text-white p-10">
        <div class="max-w-2xl mx-auto">
            <a href="/" class="text-sky-400 mb-5 inline-block">← Back</a>
            <h1 class="text-4xl font-black italic mb-8 uppercase">Developer <span class="text-sky-400">Docs</span></h1>
            <div class="space-y-6">
                <div class="bg-slate-900 p-6 rounded-3xl border border-white/10">
                    <p class="font-bold text-sky-400">AI Gemini API</p>
                    <code class="block bg-black p-3 rounded-lg text-emerald-400 my-2">GET /api/ai?text=Pertanyaan</code>
                </div>
                <div class="bg-slate-900 p-6 rounded-3xl border border-white/10">
                    <p class="font-bold text-sky-400">TikTok Downloader/Search</p>
                    <code class="block bg-black p-3 rounded-lg text-emerald-400 my-2">GET /api/tiktok?search=URL_OR_QUERY</code>
                </div>
            </div>
        </div>
    </body></html>`);
});

// --- AUTH (STABLE) ---
app.get('/login', (req, res) => res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;background:#0f172a;padding:50px;border-radius:40px;border:1px solid #38bdf8;"><h1 style="color:#38bdf8;font-weight:900;margin-bottom:30px;">KAAA LOGIN</h1><form action="/auth/login" method="POST"><input name="email" type="email" placeholder="Email" required style="padding:15px;margin-bottom:10px;width:100%;"><br><input name="password" type="password" placeholder="Pass" required style="padding:15px;margin-bottom:20px;width:100%;"><br><button type="submit" style="background:#38bdf8;width:100%;padding:15px;font-weight:900;">GET OTP</button></form></div></body>'));
app.post('/auth/login', async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
    await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'Cloud OTP', html: `<b>OTP: ${otp}</b>` });
    res.redirect('/verify?email=' + email);
});
app.get('/verify', (req, res) => res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;"><form action="/auth/verify" method="POST" style="text-align:center;"><input name="email" type="hidden" value="'+req.query.email+'"><input name="otp" type="text" placeholder="OTP" style="padding:15px;"><br><button type="submit" style="background:#38bdf8;margin-top:20px;padding:15px 40px;font-weight:900;">VERIFY</button></form></body>'));
app.post('/auth/verify', async (req, res) => {
    await connectDB();
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (user) {
        res.cookie('userEmail', email, { maxAge: 86400000 });
        res.redirect('/');
    } else res.send("Salah!");
});
app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
