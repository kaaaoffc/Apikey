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
    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
    } catch (e) { console.error("DB Error", e); }
}

// --- MODELS ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ 
    email: String, password: String, otp: String, isVerified: Boolean, createdAt: { type: Date, default: Date.now } 
}));
const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({ 
    method: String, fullUrl: String, timestamp: { type: Date, default: Date.now } 
}));
const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({ name: String, total_req: Number }));

// --- LOGGING ENGINE ---
app.use(async (req, res, next) => {
    if (req.path !== '/favicon.ico' && !req.path.startsWith('/auth') && !req.path.includes('/login')) {
        await connectDB();
        await Log.create({ method: req.method, fullUrl: req.originalUrl });
        await Stats.findOneAndUpdate({ name: "main" }, { $inc: { total_req: 1 } }, { upsert: true });
    }
    next();
});

// --- PAGES ---
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"><style>body{background:#020617;overflow:hidden}.bg-glow{position:absolute;width:300px;height:300px;background:#38bdf8;filter:blur(120px);opacity:.15;z-index:-1}.glass-login{background:rgba(15,23,42,.8);backdrop-filter:blur(20px);border:1px solid rgba(56,189,248,.2);border-radius:40px}input{background:rgba(255,255,255,.03)!important;border:1px solid rgba(255,255,255,.08)!important;transition:.3s}input:focus{border-color:#38bdf8!important}</style></head><body class="flex items-center justify-center min-h-screen p-6 text-white"><div class="bg-glow top-10 left-10"></div><div class="glass-login w-full max-w-md p-10 text-center"> <h1 class="text-3xl font-black italic tracking-tighter">KAAA<span class="text-sky-400">CLOUD</span></h1> <form action="/auth/login" method="POST" class="space-y-5 mt-10"> <input name="email" type="email" placeholder="Email Address" required class="w-full p-4 rounded-2xl text-sm"> <input name="password" type="password" placeholder="Password" required class="w-full p-4 rounded-2xl text-sm"> <button type="submit" class="w-full bg-sky-500 font-black p-4 rounded-2xl shadow-lg shadow-sky-500/20 uppercase italic">Get Code</button> </form></div></body></html>`);
});

app.get('/', async (req, res) => {
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');
    await connectDB();
    const totalAkun = await User.countDocuments();
    const stats = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    const logs = await Log.find().sort({ timestamp: -1 }).limit(7);

    res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"><style>body{background:#020617;color:#fff;font-family:sans-serif}.glass{background:rgba(15,23,42,.7);backdrop-filter:blur(15px);border:1px solid rgba(255,255,255,.05)}.sidebar{transition:.4s;transform:translateX(-100%)}.sidebar.active{transform:translateX(0)}</style></head><body class="p-4"><div id="sidebar" class="sidebar fixed top-0 left-0 w-72 h-full glass z-50 p-8 shadow-2xl"> <h2 class="text-sky-400 font-black mb-10 italic text-xl uppercase">Kaaa Menu</h2> <nav class="space-y-4 font-bold"> <a href="/" class="block p-4 rounded-2xl bg-sky-500/10 text-sky-400">Dashboard</a> <a href="/docs" class="block p-4 rounded-2xl hover:bg-white/5">Documentation</a> <a href="https://t.me/autoorderkaabot" target="_blank" class="block p-4 rounded-2xl bg-emerald-500/10 text-emerald-400">Order Panel</a> <a href="/logout" class="block p-4 rounded-2xl text-red-400 mt-10">Logout</a> </nav> <button onclick="toggleSidebar()" class="absolute top-8 right-8 text-slate-500"><i class="fas fa-times"></i></button></div><div class="max-w-4xl mx-auto"><header class="flex justify-between items-center mb-8"><button onclick="toggleSidebar()" class="w-12 h-12 glass rounded-2xl text-sky-400 text-xl"><i class="fas fa-bars-staggered"></i></button><h1 class="text-2xl font-black italic text-sky-400">KAAAOFFC</h1></header><div class="grid grid-cols-2 gap-4 mb-6"><div class="glass p-6 rounded-[35px] border-l-4 border-sky-500"><p class="text-[10px] font-black text-slate-500 uppercase">Hits Record</p><p class="text-3xl font-black text-sky-400 mt-1">${stats.total_req.toLocaleString()}</p></div><div class="glass p-6 rounded-[35px] border-l-4 border-emerald-500"><p class="text-[10px] font-black text-slate-500 uppercase">Accounts</p><p class="text-3xl font-black text-emerald-400 mt-1">${totalAkun}</p></div></div><div class="glass p-8 rounded-[40px] mb-8"><h3 class="text-xs font-black text-sky-400 mb-6 uppercase tracking-widest">HTTP Traffic Log</h3><div class="space-y-4">${logs.map(l => `<div class="flex flex-col border-b border-white/5 pb-3"><div class="flex justify-between mb-1"><span class="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded text-sky-400">${l.method}</span><span class="text-[9px] text-slate-600 font-mono">${new Date(l.timestamp).toLocaleTimeString()}</span></div><p class="text-[11px] font-mono text-emerald-400 break-all">${l.fullUrl}</p></div>`).join('')}</div></div></div><script>function toggleSidebar(){document.getElementById('sidebar').classList.toggle('active')}</script></body></html>`);
});

// --- DOCS ---
app.get('/docs', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Docs - Kaaaoffc API</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:'Segoe UI',monospace;background:linear-gradient(135deg,#020617,#0f172a);color:#e2e8f0;padding:20px}h1{text-align:center;margin-bottom:30px;font-size:28px;background:linear-gradient(90deg,#38bdf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.card{backdrop-filter:blur(12px);background:rgba(30,41,59,.6);border-radius:16px;padding:20px;margin-bottom:20px;border:1px solid rgba(56,189,248,.2);transition:.3s}.card:hover{transform:translateY(-5px);box-shadow:0 0 25px rgba(56,189,248,.2)}h2{color:#38bdf8;margin-bottom:10px}code{background:#020617;padding:6px 10px;border-radius:8px;color:#f472b6;font-size:13px;display:block;margin-top:5px}</style></head><body><h1>📚 Kaaaoffc Documentation</h1><div class="card"><h2>🤖 AI Gemini</h2><code>/ai/gemini?text=halo</code></div><div class="card"><h2>📱 TikTok Search</h2><code>/search/tiktok?q=query</code></div><div class="card"><h2>🕌 Sholat</h2><code>/sholat/1301</code></div><div class="card"><h2>ℹ️ Cuaca</h2><code>/information/cuaca?kota=malang</code></div><div style="text-align:center;margin-top:40px"><a href="/" style="color:#38bdf8;text-decoration:none">← Back Dashboard</a></div></body></html>`);
});

// --- API ENDPOINTS ---
app.get('/ai/gemini', async (req, res) => {
    const text = req.query.text;
    if (!text) return res.json({ status: false, message: "Contoh: /ai/gemini?text=halo" });
    try {
        const response = await axios.get(`https://api.nexray.web.id/ai/gemini?text=${encodeURIComponent(text)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: response.data.result });
    } catch (e) { res.json({ status: false, error: "API AI Error" }); }
});

app.get('/search/tiktok', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, message: "Contoh: /search/tiktok?q=query" });
    try {
        const response = await axios.get(`https://api.nexray.web.id/search/tiktok?q=${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: response.data.result });
    } catch (e) { res.json({ status: false, error: "TikTok Search Error" }); }
});

app.get('/information/cuaca', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, message: "Contoh: /information/cuaca?kota=Jakarta" });
    try {
        const response = await axios.get(`https://api.nexray.web.id/information/cuaca?kota=${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: response.data.result });
    } catch (e) { res.json({ status: false, error: "Cuaca Search Error" }); }
});

// --- AUTH HANDLERS ---
app.post('/auth/login', async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
    await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'Cloud Verification', html: `<b>OTP: ${otp}</b>` });
    res.redirect('/verify?email=' + email);
});

app.get('/verify', (req, res) => res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;color:white;"><form action="/auth/verify" method="POST" style="background:#0f172a;padding:50px;border-radius:40px;border:1px solid #38bdf8;text-align:center;"><h2>OTP CODE</h2><input name="email" type="hidden" value="'+req.query.email+'"><input name="otp" type="text" style="padding:15px;width:100%;"><button type="submit" style="background:#38bdf8;margin-top:20px;width:100%;padding:15px;font-weight:900;">VERIFY</button></form></body>'));

app.post('/auth/verify', async (req, res) => {
    await connectDB();
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (user) {
        res.cookie('userEmail', email, { maxAge: 86400000 });
        res.redirect('/');
    } else res.send("OTP Salah!");
});

app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
