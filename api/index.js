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
    if (req.path.includes('/api/internal') || req.path === '/verify' || req.path === '/login') return;
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
    res.send(`<body style="background:#020617;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="background:rgba(30,41,59,0.3);backdrop-filter:blur(20px);padding:50px;border-radius:40px;border:1px solid rgba(56,189,248,0.3);width:350px;text-align:center;"><h1 style="color:#38bdf8;font-size:28px;font-weight:900;margin-bottom:10px;">KAAA CLOUD</h1><form action="/auth/login" method="POST"><input name="email" type="email" placeholder="Email Address" style="width:100%;padding:15px;margin-bottom:15px;border-radius:15px;border:1px solid #1e293b;background:#0f172a;color:white;outline:none;" required><input name="password" type="password" placeholder="Password" style="width:100%;padding:15px;margin-bottom:25px;border-radius:15px;border:1px solid #1e293b;background:#0f172a;color:white;outline:none;" required><button type="submit" style="width:100%;padding:15px;background:#38bdf8;border:none;border-radius:15px;font-weight:900;cursor:pointer;color:#020617;">GET OTP CODE</button></form></div></body>`);
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
        await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'Login Verification', html: `<h1>Your OTP: ${otp}</h1>` });
        res.redirect('/verify?email=' + encodeURIComponent(email));
    } catch (e) { res.send(e.message); }
});

// FIX: Route GET /verify agar tidak "Cannot GET /verify"
app.get('/verify', (req, res) => {
    const email = req.query.email;
    res.send(`<body style="background:#020617;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><form action="/auth/verify" method="POST" style="background:rgba(30,41,59,0.3);backdrop-filter:blur(20px);padding:40px;border-radius:30px;border:1px solid #38bdf8;text-align:center;width:320px;"><h2 style="color:#38bdf8;margin-bottom:20px;">VERIFICATION</h2><p style="font-size:10px;color:#64748b;margin-bottom:20px;">OTP sent to: <b>${email}</b></p><input name="email" type="hidden" value="${email}"><input name="otp" type="text" placeholder="Enter OTP" style="width:100%;padding:15px;margin-bottom:20px;border-radius:12px;border:none;background:#0f172a;color:white;text-align:center;letter-spacing:5px;font-weight:bold;" required><button type="submit" style="width:100%;padding:15px;background:#38bdf8;border:none;border-radius:12px;font-weight:900;color:#020617;cursor:pointer;">VERIFY NOW</button></form></body>`);
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
        body{background:#020617;color:white;font-family:'Plus Jakarta Sans',sans-serif;}
        .sidebar{transition:0.4s;width:0;overflow:hidden;position:fixed;height:100vh;background:#0f172a;z-index:1000;border-right:1px solid rgba(56,189,248,0.1)}
        .sidebar.active{width:280px}
        .card-glass{background:rgba(15,23,42,0.6);backdrop-filter:blur(15px);border:1px solid rgba(255,255,255,0.03);border-radius:30px;}
        .btn-side{width:100%;text-align:left;padding:16px;border-radius:18px;margin-bottom:8px;font-weight:600;display:flex;align-items:center;gap:12px;}
        .log-line{padding:12px;border-bottom:1px solid rgba(255,255,255,0.02);font-family:monospace;font-size:11px;display:flex;justify-content:space-between}
    </style></head>
    <body>
        <div id="side" class="sidebar"><div class="p-8">
            <h2 class="text-sky-400 font-black text-2xl mb-12 italic uppercase">KAAA<span class="text-white">Cloud</span></h2>
            <nav><button onclick="show('dash')" class="btn-side"><i class="fas fa-th-large"></i> Overview</button>
            <button onclick="show('status')" class="btn-side"><i class="fas fa-microchip"></i> System Info</button>
            <button onclick="show('paste')" class="btn-side"><i class="fas fa-terminal"></i> API List</button>
            <button onclick="show('ptero')" class="btn-side"><i class="fas fa-layer-group"></i> Cloud Shop</button>
            <a href="/logout" class="btn-side mt-12 text-red-500"><i class="fas fa-power-off"></i> Sign Out</a></nav>
        </div></div>

        <div class="max-w-5xl mx-auto px-6">
            <header class="flex justify-between items-center py-10">
                <button onclick="toggleSide()" class="w-12 h-12 card-glass flex items-center justify-center"><i class="fas fa-bars-staggered text-sky-400"></i></button>
                <h1 class="font-black italic text-xl uppercase">KAAA<span class="text-sky-500">OFFC</span></h1>
                <div class="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center font-black text-slate-900">K</div>
            </header>

            <div id="tab-dash" class="tab-content">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div class="card-glass p-8 text-center"><p id="hits" class="text-5xl font-black text-sky-400">0</p><p class="text-[10px] text-slate-500 font-black uppercase mt-2">API Requests</p></div>
                    <div class="card-glass p-8 text-center"><p class="text-5xl font-black text-white">${totalU}</p><p class="text-[10px] text-slate-500 font-black uppercase mt-2">Accounts</p></div>
                    <div class="card-glass p-8 text-center"><p id="online" class="text-5xl font-black text-emerald-400">0</p><p class="text-[10px] text-slate-500 font-black uppercase mt-2">Online</p></div>
                </div>
                <div class="card-glass p-6"><h2 class="text-xs font-black mb-6 text-sky-400 uppercase tracking-widest">Traffic Log</h2><div id="logs" class="rounded-2xl overflow-hidden bg-black/20"></div></div>
            </div>

            <div id="tab-status" class="tab-content hidden">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="card-glass p-6">UPTIME: <span id="up-v"></span></div>
                    <div class="card-glass p-6">RAM: <span id="mem-v"></span></div>
                    <div class="card-glass p-6">CPU: <span id="cpu-v"></span></div>
                    <div class="card-glass p-6">PLATFORM: LINUX X64</div>
                </div>
            </div>

            <div id="tab-paste" class="tab-content hidden">
                <div class="card-glass p-6 mb-4">GEMINI: https://${domain}/ai/gemini?text=halo</div>
                <div class="card-glass p-6 mb-4">GPT: https://${domain}/ai/gpt-3.5-turbo?text=halo</div>
                <div class="card-glass p-6">TIKTOK: https://${domain}/search/tiktok?q=musik</div>
            </div>

            <div id="tab-ptero" class="tab-content hidden">
                <div class="card-glass p-8 flex justify-between items-center mb-4"><div>RAM 1GB</div><div class="text-sky-400">Rp 3.317</div></div>
            </div>
        </div>

        <script>
            function toggleSide(){document.getElementById('side').classList.toggle('active')}
            function show(id){document.querySelectorAll('.tab-content').forEach(t=>t.classList.add('hidden'));document.getElementById('tab-'+id).classList.remove('hidden');toggleSide()}
            async function update(){
                try{
                    const r = await fetch('/api/internal/data'); const d = await r.json();
                    document.getElementById('hits').innerText = d.total;
                    document.getElementById('online').innerText = d.online;
                    document.getElementById('logs').innerHTML = d.logs.map(l => '<div class="log-line"><span><b class="text-sky-400">'+l.method+'</b> '+l.path+'</span><span>'+new Date(l.timestamp).toLocaleTimeString()+'</span></div>').join('');
                    document.getElementById('up-v').innerText = d.server.uptime;
                    document.getElementById('mem-v').innerText = d.server.mem;
                    document.getElementById('cpu-v').innerText = d.server.cpu;
                }catch(e){}
            }
            setInterval(update, 3000); update();
        </script>
    </body></html>`);
});

// --- API ENDPOINTS ---
app.get('/ai/gemini', async (req, res) => { await recordRequest(req); const text = req.query.text; try { const r = await axios.get("https://api.nexray.web.id/ai/gemini?text=" + encodeURIComponent(text)); res.json({ status: true, result: r.data.result }); } catch (e) { res.json({ status: false }); } });
app.get('/ai/gpt-3.5-turbo', async (req, res) => { await recordRequest(req); const text = req.query.text; try { const r = await axios.get("https://api.nexray.web.id/ai/gpt-3.5-turbo?text=" + encodeURIComponent(text)); res.json({ status: true, result: r.data.result }); } catch (e) { res.json({ status: false }); } });
app.get('/search/tiktok', async (req, res) => { await recordRequest(req); const q = req.query.q; try { const r = await axios.get("https://api.nexray.web.id/search/tiktok?q=" + encodeURIComponent(q)); res.json({ status: true, result: r.data.result }); } catch (e) { res.json({ status: false }); } });
app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
