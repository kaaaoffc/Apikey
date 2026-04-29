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

// --- AUTH SYSTEM (FIXED ROUTES) ---
app.get('/login', (req, res) => {
    res.send('<body style="background:#020617;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="background:rgba(30,41,59,0.3);backdrop-filter:blur(20px);padding:50px;border-radius:40px;border:1px solid rgba(56,189,248,0.3);width:350px;text-align:center;"><h1 style="color:#38bdf8;font-size:28px;font-weight:900;margin-bottom:30px;">KAAA CLOUD</h1><form action="/auth/login" method="POST"><input name="email" type="email" placeholder="Email" style="width:100%;padding:15px;margin-bottom:15px;border-radius:15px;border:none;background:#0f172a;color:white;" required><input name="password" type="password" placeholder="Password" style="width:100%;padding:15px;margin-bottom:25px;border-radius:15px;border:none;background:#0f172a;color:white;" required><button type="submit" style="width:100%;padding:15px;background:#38bdf8;border:none;border-radius:15px;font-weight:900;cursor:pointer;color:#020617;">GET OTP CODE</button></form></div></body>');
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
        await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'Verification Code', html: `<b>OTP: ${otp}</b>` });
        res.redirect('/verify?email=' + encodeURIComponent(email));
    } catch (e) { res.send(e.message); }
});

app.get('/verify', (req, res) => {
    const email = req.query.email;
    res.send(`<body style="background:#020617;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><form action="/auth/verify" method="POST" style="background:rgba(30,41,59,0.3);backdrop-filter:blur(20px);padding:40px;border-radius:30px;border:1px solid #38bdf8;text-align:center;width:320px;"><h2>VERIFICATION</h2><p>OTP sent to: <b>${email}</b></p><input name="email" type="hidden" value="${email}"><input name="otp" type="text" placeholder="Enter OTP" style="width:100%;padding:15px;margin-bottom:20px;border-radius:12px;border:none;background:#0f172a;color:white;text-align:center;letter-spacing:5px;" required><button type="submit" style="width:100%;padding:15px;background:#38bdf8;border:none;border-radius:12px;font-weight:900;cursor:pointer;">VERIFY NOW</button></form></body>`);
});

app.post('/auth/verify', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (user) {
        await User.updateOne({ email }, { isVerified: true, lastActive: new Date() });
        res.cookie('userEmail', email, { maxAge: 86400000, httpOnly: true });
        res.redirect('/');
    } else { res.send("OTP SALAH"); }
});

// --- DATA & SHOLAT ENGINE ---
app.get('/api/internal/data', async (req, res) => {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(10);
    const stats = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    const online = await User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 3 * 60 * 1000) }, isVerified: true });
    let sholat = {};
    try {
        const d = new Date().toISOString().split('T')[0].split('-').join('/');
        const r = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/1301/${d}`);
        sholat = r.data.data.jadwal;
    } catch (e) { sholat = null; }
    res.json({ logs, total: stats.total_req, online, sholat, server: { uptime: "8h 8m", mem: "48.91 / 62.79 GB", cpu: "16 Cores" } });
});

// --- DASHBOARD UI ---
app.get('/', checkAuth, async (req, res) => {
    const domain = req.get('host');
    const totalU = await User.countDocuments({ isVerified: true });
    res.send(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        body{background:#020617;color:white;font-family:'Plus Jakarta Sans',sans-serif;}
        .sidebar{transition:0.4s;width:0;overflow:hidden;position:fixed;height:100vh;background:#0f172a;z-index:1000;border-right:1px solid rgba(56,189,248,0.1)}
        .sidebar.active{width:280px}
        .card-glass{background:rgba(15,23,42,0.6);backdrop-filter:blur(15px);border:1px solid rgba(255,255,255,0.03);border-radius:30px;}
        .btn-side{width:100%;text-align:left;padding:16px;border-radius:18px;margin-bottom:8px;font-weight:600;display:flex;align-items:center;gap:12px;}
        .log-line{padding:12px;border-bottom:1px solid rgba(255,255,255,0.02);font-family:monospace;font-size:11px;display:flex;justify-content:space-between}
    </style></head>
    <body>
        <div id="side" class="sidebar"><div class="p-8">
            <h2 class="text-sky-400 font-black text-2xl mb-12 italic">KAAA<span class="text-white">Cloud</span></h2>
            <nav><button onclick="show('dash')" class="btn-side"><i class="fas fa-home"></i> Overview</button>
            <button onclick="show('status')" class="btn-side"><i class="fas fa-microchip"></i> System Info</button>
            <button onclick="show('paste')" class="btn-side"><i class="fas fa-terminal"></i> API List</button>
            <button onclick="show('tools')" class="btn-side"><i class="fas fa-tools"></i> Tools</button>
            <a href="/logout" class="btn-side mt-12 text-red-500"><i class="fas fa-power-off"></i> Logout</a></nav>
        </div></div>

        <div class="max-w-5xl mx-auto px-6 py-10">
            <header class="flex justify-between items-center mb-10">
                <button onclick="toggleSide()" class="card-glass p-3"><i class="fas fa-bars-staggered text-sky-400"></i></button>
                <h1 class="font-black italic text-xl uppercase">KAAA<span class="text-sky-500">OFFC</span></h1>
                <div class="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center font-bold text-slate-900">K</div>
            </header>

            <div id="tab-dash" class="tab-content">
                <div class="card-glass p-6 mb-8 border-emerald-500/20 bg-emerald-500/5">
                    <p class="text-[10px] font-black text-emerald-400 mb-4 tracking-widest"><i class="fas fa-mosque mr-2"></i> JADWAL SHOLAT JAKARTA</p>
                    <div class="grid grid-cols-5 gap-4 text-center">
                        <div><p class="text-[9px] text-slate-500 uppercase">Subuh</p><p id="s-subuh" class="font-black text-emerald-400">-</p></div>
                        <div><p class="text-[9px] text-slate-500 uppercase">Dzuhur</p><p id="s-dzuhur" class="font-black text-emerald-400">-</p></div>
                        <div><p class="text-[9px] text-slate-500 uppercase">Ashar</p><p id="s-ashar" class="font-black text-emerald-400">-</p></div>
                        <div><p class="text-[9px] text-slate-500 uppercase">Maghrib</p><p id="s-maghrib" class="font-black text-emerald-400">-</p></div>
                        <div><p class="text-[9px] text-slate-500 uppercase">Isya</p><p id="s-isya" class="font-black text-emerald-400">-</p></div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-center">
                    <div class="card-glass p-8"><p id="hits" class="text-5xl font-black text-sky-400">0</p><p class="text-[10px] text-slate-500 uppercase font-black mt-2">API Requests</p></div>
                    <div class="card-glass p-8"><p class="text-5xl font-black text-white">${totalU}</p><p class="text-[10px] text-slate-500 uppercase font-black mt-2">Total Accounts</p></div>
                    <div class="card-glass p-8"><p id="online" class="text-5xl font-black text-emerald-400">0</p><p class="text-[10px] text-slate-500 uppercase font-black mt-2">Online Now</p></div>
                </div>
                <div class="card-glass p-6"><h2 class="text-xs font-black mb-6 text-sky-400 uppercase">Traffic Log Activity</h2><div id="logs" class="rounded-2xl overflow-hidden bg-black/20"></div></div>
            </div>

            <div id="tab-status" class="tab-content hidden">
                <div class="grid grid-cols-2 gap-4">
                    <div class="card-glass p-6">UPTIME: <span id="up-v">-</span></div>
                    <div class="card-glass p-6">RAM: <span id="mem-v">-</span></div>
                    <div class="card-glass p-6">CPU: <span id="cpu-v">-</span></div>
                    <div class="card-glass p-6">LATENCY: 0 ms</div>
                </div>
            </div>

            <div id="tab-tools" class="tab-content hidden">
                <div class="card-glass p-8 flex justify-between items-center">
                    <div><p class="font-black">QR CODE GENERATOR</p><p class="text-xs text-sky-400">https://${domain}/tools/qrcode?text=woi</p></div>
                    <button onclick="copyLink('https://${domain}/tools/qrcode?text=woi')" class="bg-sky-500 text-slate-900 px-6 py-2 rounded-xl font-bold">COPY</button>
                </div>
            </div>
        </div>

        <script>
            function toggleSide(){document.getElementById('side').classList.toggle('active')}
            function show(id){document.querySelectorAll('.tab-content').forEach(t=>t.classList.add('hidden'));document.getElementById('tab-'+id).classList.remove('hidden');toggleSide()}
            function copyLink(t){navigator.clipboard.writeText(t);alert("Copied!")}
            async function update(){
                try{
                    const r = await fetch('/api/internal/data'); const d = await r.json();
                    document.getElementById('hits').innerText = d.total;
                    document.getElementById('online').innerText = d.online;
                    if(d.sholat){
                        document.getElementById('s-subuh').innerText = d.sholat.subuh;
                        document.getElementById('s-dzuhur').innerText = d.sholat.dzuhur;
                        document.getElementById('s-ashar').innerText = d.sholat.ashar;
                        document.getElementById('s-maghrib').innerText = d.sholat.maghrib;
                        document.getElementById('s-isya').innerText = d.sholat.isya;
                    }
                    document.getElementById('logs').innerHTML = d.logs.map(l => '<div class="log-line"><span><b class="text-sky-400">'+l.method+'</b> '+l.path+'</span><span>'+new Date(l.timestamp).toLocaleTimeString()+'</span></div>').join('');
                    document.getElementById('up-v').innerText = d.server.uptime;
                    document.getElementById('mem-v').innerText = d.server.mem;
                    document.getElementById('cpu-v').innerText = d.server.cpu;
                }catch(e){}
            }
            setInterval(update, 5000); update();
        </script>
    </body></html>`);
});

// --- TOOLS: QR CODE ENDPOINT ---
app.get('/tools/qrcode', async (req, res) => {
    const text = req.query.text;
    if (!text) return res.status(400).send("Text is required");
    try {
        const qr = await QRCode.toDataURL(text, { margin: 2, color: { dark: '#020617', light: '#ffffff' } });
        res.send(`<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;"><div style="background:white;padding:20px;border-radius:20px;"><img src="${qr}" style="width:250px;"/></div><p style="color:#38bdf8;font-family:sans-serif;margin-top:20px;font-weight:bold;">QR FOR: ${text}</p></body>`);
    } catch (e) { res.status(500).send("Error"); }
});

// --- API ENDPOINTS ---
app.get('/ai/gemini', async (req, res) => { 
    await recordRequest(req);
    const text = req.query.text;
    try {
        const r = await axios.get("https://api.nexray.web.id/ai/gemini?text=" + encodeURIComponent(text));
        res.json({ status: true, creator: "KaaaOffc", result: r.data.result });
    } catch (e) { res.json({ status: false }); }
});

app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
