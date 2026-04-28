const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const cookieParser = require('cookie-parser');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- CONFIGURATION ---
const MONGO_URI = "mongodb+srv://eka710231_db_user:kaaacloud@cluster0.6ssgy30.mongodb.net/?appName=Cluster0";
const RESEND_API = "re_Y3DfKKCM_7rJCyA3V1JHoxUNxQ2sc7Fb1";
const resend = new Resend(RESEND_API);

mongoose.connect(MONGO_URI).catch(err => console.error("DB Error:", err));

// --- MODELS ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ 
    email: { type: String, unique: true }, 
    password: String, otp: String, 
    isVerified: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now }
}));
const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({ method: String, path: String, timestamp: { type: Date, default: Date.now } }));
const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({ name: { type: String, default: "main" }, total_req: { type: Number, default: 0 } }));

// --- LOGIC & MIDDLEWARE ---
async function recordRequest(req) {
    if (req.path.includes('/api/internal')) return;
    await Stats.findOneAndUpdate({ name: "main" }, { $inc: { total_req: 1 } }, { upsert: true });
    await new Log({ method: req.method, path: req.originalUrl }).save();
}

const checkAuth = async (req, res, next) => {
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');
    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.redirect('/login');
    await User.updateOne({ email }, { lastActive: new Date() });
    next();
};

// --- AUTH SYSTEM ---
app.get('/login', (req, res) => {
    res.send(`<body style="background:#020617;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="background:rgba(30,41,59,0.3);backdrop-filter:blur(20px);padding:50px;border-radius:40px;border:1px solid rgba(56,189,248,0.3);width:350px;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);"><h1 style="color:#38bdf8;font-size:28px;font-weight:900;margin-bottom:10px;letter-spacing:-1px;">KAAA CLOUD</h1><p style="color:#64748b;font-size:12px;margin-bottom:30px;font-weight:bold;text-transform:uppercase;">Authentication Portal</p><form action="/auth/login" method="POST"><input name="email" type="email" placeholder="Email Address" style="width:100%;padding:15px;margin-bottom:15px;border-radius:15px;border:1px solid #1e293b;background:#0f172a;color:white;outline:none;" required><input name="password" type="password" placeholder="Password" style="width:100%;padding:15px;margin-bottom:25px;border-radius:15px;border:1px solid #1e293b;background:#0f172a;color:white;outline:none;" required><button type="submit" style="width:100%;padding:15px;background:#38bdf8;border:none;border-radius:15px;font-weight:900;cursor:pointer;color:#020617;transition:0.3s;">GET OTP CODE</button></form></div></body>`);
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
        await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'Login Verification', html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;"><h2>Your OTP Code</h2><h1 style="color:#38bdf8;letter-spacing:5px;">${otp}</h1><p>Use this code to access your dashboard.</p></div>` });
        res.redirect('/verify?email=' + email);
    } catch (e) { res.send(e.message); }
});

app.post('/auth/verify', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (user) {
        await User.updateOne({ email }, { isVerified: true, lastActive: new Date() });
        res.cookie('userEmail', email, { maxAge: 86400000, httpOnly: true });
        res.redirect('/');
    } else { res.send("OTP INVALID"); }
});

// --- DATA ENGINE ---
app.get('/api/internal/data', async (req, res) => {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(8);
    const stats = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    const online = await User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 3 * 60 * 1000) }, isVerified: true });
    res.json({ logs, total: stats.total_req, online, server: { uptime: "12h 45m", mem: "48.9/62.7 GB", cpu: "16 Core", load: "1.12" } });
});

// --- DASHBOARD UI ---
app.get('/', checkAuth, async (req, res) => {
    const domain = req.get('host');
    const totalU = await User.countDocuments({ isVerified: true });
    res.send(`<!DOCTYPE html><html lang="id"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        body{background:#020617;color:white;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-0.2px}
        .sidebar{transition:0.4s cubic-bezier(0.4, 0, 0.2, 1);width:0;overflow:hidden;position:fixed;height:100vh;background:#0f172a;z-index:1000;border-right:1px solid rgba(56,189,248,0.1)}
        .sidebar.active{width:280px}
        .card-glass{background:rgba(15,23,42,0.6);backdrop-filter:blur(15px);border:1px solid rgba(255,255,255,0.03);border-radius:30px;transition:0.3s}
        .card-glass:hover{border-color:rgba(56,189,248,0.3);transform:translateY(-5px)}
        .btn-side{width:100%;text-align:left;padding:16px;border-radius:18px;margin-bottom:8px;font-weight:600;display:flex;align-items:center;gap:12px;transition:0.2s}
        .btn-side:hover{background:rgba(56,189,248,0.1);color:#38bdf8}
        .log-line{padding:12px;border-bottom:1px solid rgba(255,255,255,0.02);font-family:monospace;font-size:11px;display:flex;justify-content:space-between}
        .pulse{animation:pulse-animation 2s infinite}@keyframes pulse-animation{0%{box-shadow:0 0 0 0px rgba(16,185,129,0.4)}100%{box-shadow:0 0 0 10px rgba(16,185,129,0)}}
    </style></head>
    <body class="pb-10">
        <div id="side" class="sidebar"><div class="p-8">
            <h2 class="text-sky-400 font-black text-2xl mb-12 italic uppercase">KAAA<span class="text-white">Cloud</span></h2>
            <nav><button onclick="show('dash')" class="btn-side"><i class="fas fa-th-large"></i> Overview</button>
            <button onclick="show('status')" class="btn-side"><i class="fas fa-microchip"></i> System Info</button>
            <button onclick="show('paste')" class="btn-side"><i class="fas fa-terminal"></i> API Endpoints</button>
            <button onclick="show('ptero')" class="btn-side"><i class="fas fa-layer-group"></i> Cloud Shop</button>
            <a href="/logout" class="btn-side mt-12 text-red-500"><i class="fas fa-power-off"></i> Sign Out</a></nav>
        </div></div>

        <div class="max-w-5xl mx-auto px-6">
            <header class="flex justify-between items-center py-10">
                <button onclick="toggleSide()" class="w-12 h-12 card-glass flex items-center justify-center"><i class="fas fa-bars-staggered text-sky-400"></i></button>
                <div class="text-center"><h1 class="font-black text-xl tracking-tighter">DASHBOARD</h1><p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest" id="clock"></p></div>
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center font-black text-slate-900 shadow-lg shadow-sky-500/20">K</div>
            </header>

            <div id="tab-dash" class="tab-content">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div class="card-glass p-8 text-center"><p id="hits" class="text-5xl font-black text-sky-400">0</p><p class="text-[10px] text-slate-500 font-black uppercase mt-2">API Requests</p></div>
                    <div class="card-glass p-8 text-center"><p class="text-5xl font-black text-white">${totalU}</p><p class="text-[10px] text-slate-500 font-black uppercase mt-2">Accounts</p></div>
                    <div class="card-glass p-8 text-center relative"><div class="absolute top-4 right-4 h-3 w-3 bg-emerald-500 rounded-full pulse"></div><p id="online" class="text-5xl font-black text-emerald-400">0</p><p class="text-[10px] text-slate-500 font-black uppercase mt-2">Active Now</p></div>
                </div>
                <div class="card-glass p-6"><h2 class="text-xs font-black mb-6 text-sky-400 uppercase tracking-widest flex items-center gap-2"><i class="fas fa-stream"></i> Global Traffic Log</h2><div id="logs" class="rounded-2xl overflow-hidden bg-black/20"></div></div>
            </div>

            <div id="tab-status" class="tab-content hidden animate-fade-in">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="card-glass p-6 flex items-center gap-6"><div class="h-14 w-14 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-400"><i class="fas fa-clock fa-lg"></i></div><div><p class="text-[10px] font-black text-slate-500 uppercase">Uptime</p><p class="text-xl font-black" id="up-v">-</p></div></div>
                    <div class="card-glass p-6 flex items-center gap-6"><div class="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400"><i class="fas fa-memory fa-lg"></i></div><div><p class="text-[10px] font-black text-slate-500 uppercase">RAM</p><p class="text-xl font-black" id="mem-v">-</p></div></div>
                    <div class="card-glass p-6 flex items-center gap-6"><div class="h-14 w-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400"><i class="fas fa-bolt fa-lg"></i></div><div><p class="text-[10px] font-black text-slate-500 uppercase">CPU Cores</p><p class="text-xl font-black" id="cpu-v">-</p></div></div>
                    <div class="card-glass p-6 flex items-center gap-6"><div class="h-14 w-14 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-400"><i class="fas fa-shield-halved fa-lg"></i></div><div><p class="text-[10px] font-black text-slate-500 uppercase">System</p><p class="text-xl font-black uppercase">Linux x64</p></div></div>
                </div>
            </div>

            <div id="tab-paste" class="tab-content hidden">
                <div class="space-y-4">
                    <div class="card-glass overflow-hidden"><div class="p-4 bg-white/5 flex justify-between items-center text-[11px] font-black"><span>AI GEMINI PRO</span><i class="fas fa-brain text-sky-400"></i></div><div id="c1" class="p-6 text-sky-400 text-xs font-mono">https://${domain}/ai/gemini?text=halo</div><button onclick="copy('c1')" class="w-full bg-sky-500 p-4 text-slate-900 font-black text-xs uppercase">Copy Endpoint</button></div>
                    <div class="card-glass overflow-hidden"><div class="p-4 bg-white/5 flex justify-between items-center text-[11px] font-black"><span>GPT-3.5 TURBO</span><i class="fas fa-robot text-sky-400"></i></div><div id="c2" class="p-6 text-sky-400 text-xs font-mono">https://${domain}/ai/gpt-3.5-turbo?text=halo</div><button onclick="copy('c2')" class="w-full bg-sky-500 p-4 text-slate-900 font-black text-xs uppercase">Copy Endpoint</button></div>
                    <div class="card-glass overflow-hidden"><div class="p-4 bg-white/5 flex justify-between items-center text-[11px] font-black"><span>TIKTOK SEARCH</span><i class="fas fa-search text-sky-400"></i></div><div id="c3" class="p-6 text-sky-400 text-xs font-mono">https://${domain}/search/tiktok?q=musik</div><button onclick="copy('c3')" class="w-full bg-sky-500 p-4 text-slate-900 font-black text-xs uppercase">Copy Endpoint</button></div>
                </div>
            </div>

            <div id="tab-ptero" class="tab-content hidden">
                <div class="card-glass p-8 flex justify-between items-center mb-4"><div><p class="font-black text-xl">RAM 1GB</p><p class="text-sky-400 font-black">Rp 3.317</p></div><a href="https://t.me/autoorderkaabot" class="bg-sky-500 text-slate-900 px-8 py-3 rounded-2xl font-black text-sm">BUY</a></div>
                <div class="card-glass p-8 flex justify-between items-center"><div><p class="font-black text-xl">RAM 8GB</p><p class="text-sky-400 font-black">Rp 14.250</p></div><a href="https://t.me/autoorderkaabot" class="bg-sky-500 text-slate-900 px-8 py-3 rounded-2xl font-black text-sm">BUY</a></div>
            </div>
        </div>

        <script>
            function toggleSide(){document.getElementById('side').classList.toggle('active')}
            function show(id){document.querySelectorAll('.tab-content').forEach(t=>t.classList.add('hidden'));document.getElementById('tab-'+id).classList.remove('hidden');toggleSide()}
            function copy(id){navigator.clipboard.writeText(document.getElementById(id).innerText);alert("Link Copied!")}
            async function update(){
                try{
                    const r = await fetch('/api/internal/data'); const d = await r.json();
                    document.getElementById('hits').innerText = d.total;
                    document.getElementById('online').innerText = d.online;
                    document.getElementById('logs').innerHTML = d.logs.map(l => '<div class="log-line"><span><b class="text-sky-400">'+l.method+'</b> '+l.path+'</span><span class="text-slate-500">'+new Date(l.timestamp).toLocaleTimeString()+'</span></div>').join('');
                    document.getElementById('up-v').innerText = d.server.uptime;
                    document.getElementById('mem-v').innerText = d.server.mem;
                    document.getElementById('cpu-v').innerText = d.server.cpu;
                    document.getElementById('clock').innerText = new Date().toLocaleString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'});
                }catch(e){}
            }
            setInterval(update, 2000); update();
        </script>
    </body></html>`);
});

// --- CORE API ENDPOINTS ---
app.get('/ai/gemini', async (req, res) => {
    await recordRequest(req);
    const text = req.query.text;
    if (!text) return res.json({ status: false, error: "No query" });
    try {
        const r = await axios.get("https://api.nexray.web.id/ai/gemini?text=" + encodeURIComponent(text));
        res.json({ status: true, creator: "KaaaOffc", result: r.data.result });
    } catch (e) { res.json({ status: false }); }
});

app.get('/ai/gpt-3.5-turbo', async (req, res) => {
    await recordRequest(req);
    const text = req.query.text;
    if (!text) return res.json({ status: false, error: "No query" });
    try {
        const r = await axios.get("https://api.nexray.web.id/ai/gpt-3.5-turbo?text=" + encodeURIComponent(text));
        res.json({ status: true, creator: "KaaaOffc", result: r.data.result });
    } catch (e) { res.json({ status: false }); }
});

app.get('/search/tiktok', async (req, res) => {
    await recordRequest(req);
    const q = req.query.q;
    if (!q) return res.json({ status: false, error: "No query" });
    try {
        const r = await axios.get("https://api.nexray.web.id/search/tiktok?q=" + encodeURIComponent(q));
        res.json({ status: true, creator: "KaaaOffc", result: r.data.result });
    } catch (e) { res.json({ status: false }); }
});

app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
