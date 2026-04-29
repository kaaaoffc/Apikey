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

// --- SCHEMA ---
const userSchema = new mongoose.Schema({ 
    email: String, password: String, otp: String, isVerified: Boolean, createdAt: { type: Date, default: Date.now } 
});
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({ method: String, path: String, timestamp: { type: Date, default: Date.now } }));
const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({ name: String, total_req: Number }));

// --- MIDDLEWARE LOGGING ---
app.use(async (req, res, next) => {
    if (req.path !== '/favicon.ico') {
        await connectDB();
        await Log.create({ method: req.method, path: req.path });
        await Stats.findOneAndUpdate({ name: "main" }, { $inc: { total_req: 1 } }, { upsert: true });
    }
    next();
});

// --- DASHBOARD UI ---
app.get('/', async (req, res) => {
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');

    const userData = await User.findOne({ email });
    const totalAkun = await User.countDocuments();
    const stats = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    const logs = await Log.find().sort({ timestamp: -1 }).limit(5);
    
    let sholat = { subuh: "-", dzuhur: "-", ashar: "-", maghrib: "-", isya: "-" };
    try {
        const d = new Date().toISOString().split('T')[0].split('-').join('/');
        const r = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/1301/${d}`);
        sholat = r.data.data.jadwal;
    } catch (e) {}

    res.send(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background: #020617; color: white; font-family: sans-serif; }
        .glass { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.08); }
        .sidebar { transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform: translateX(-100%); }
        .sidebar.active { transform: translateX(0); }
    </style></head>
    <body class="p-4">
        <div id="sidebar" class="sidebar fixed top-0 left-0 w-72 h-full glass z-50 p-8">
            <div class="flex justify-between items-center mb-12">
                <h2 class="text-sky-400 font-black italic tracking-widest text-xl">KAAA MENU</h2>
                <button onclick="toggleSidebar()"><i class="fas fa-times text-2xl text-slate-500"></i></button>
            </div>
            <nav class="space-y-4">
                <a href="/" class="flex items-center p-4 rounded-2xl bg-sky-500/10 text-sky-400 font-bold"><i class="fas fa-th-large mr-4"></i> Dashboard</a>
                <a href="/docs" class="flex items-center p-4 rounded-2xl hover:bg-white/5 transition"><i class="fas fa-book mr-4"></i> API Documentation</a>
                <a href="/tools/qrcode?text=KaaaCloud" class="flex items-center p-4 rounded-2xl hover:bg-white/5 transition"><i class="fas fa-qrcode mr-4"></i> QR Generator</a>
                <div class="pt-10"><a href="/logout" class="flex items-center p-4 rounded-2xl text-red-400 hover:bg-red-500/10"><i class="fas fa-power-off mr-4"></i> Logout</a></div>
            </nav>
        </div>

        <div class="max-w-4xl mx-auto">
            <header class="flex justify-between items-center mb-8">
                <button onclick="toggleSidebar()" class="w-12 h-12 glass rounded-2xl flex items-center justify-center text-sky-400 shadow-lg"><i class="fas fa-bars-staggered"></i></button>
                <h1 class="text-2xl font-black italic">KAAA<span class="text-sky-400">CLOUD</span></h1>
                <button onclick="toggleModal()" class="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center font-black text-slate-900 border-2 border-sky-300 shadow-lg animate-pulse">${email.charAt(0).toUpperCase()}</button>
            </header>

            <div class="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[35px] mb-8">
                <div class="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
                    <div>SUBUH<p class="text-emerald-400 text-sm">${sholat.subuh}</p></div>
                    <div>DZUHUR<p class="text-emerald-400 text-sm">${sholat.dzuhur}</p></div>
                    <div>ASHAR<p class="text-emerald-400 text-sm">${sholat.ashar}</p></div>
                    <div>MAGHRIB<p class="text-emerald-400 text-sm">${sholat.maghrib}</p></div>
                    <div>ISYA<p class="text-emerald-400 text-sm">${sholat.isya}</p></div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="glass p-6 rounded-[35px] border-l-4 border-sky-500">
                    <p class="text-xs font-bold text-slate-500 uppercase">Total Accounts</p>
                    <p class="text-3xl font-black">${totalAkun}</p>
                </div>
                <div class="glass p-6 rounded-[35px] border-l-4 border-emerald-500">
                    <p class="text-xs font-bold text-slate-500 uppercase">User Online</p>
                    <p class="text-3xl font-black text-emerald-400">1</p>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-4 mb-8">
                <div class="glass p-5 rounded-[30px] text-center"><p class="text-2xl font-black text-sky-400">${stats.total_req}</p><p class="text-[9px] text-slate-500 uppercase">Hits</p></div>
                <div class="glass p-5 rounded-[30px] text-center"><p class="text-2xl font-black">48.91 GB</p><p class="text-[9px] text-slate-500 uppercase">RAM</p></div>
                <div class="glass p-5 rounded-[30px] text-center"><p class="text-2xl font-black text-emerald-400">LIVE</p><p class="text-[9px] text-slate-500 uppercase">Status</p></div>
            </div>

            <div class="glass p-8 rounded-[40px]">
                <h3 class="text-xs font-black text-sky-400 mb-6 uppercase">Traffic Activity</h3>
                <div class="space-y-3">
                    ${logs.map(l => `<div class="flex justify-between text-[10px] font-mono border-b border-white/5 pb-2"><span><b class="text-sky-400">${l.method}</b> ${l.path}</span><span class="text-slate-500">${new Date(l.timestamp).toLocaleTimeString()}</span></div>`).join('')}
                </div>
            </div>
        </div>

        <div id="accModal" class="fixed inset-0 z-[60] bg-black/90 hidden items-center justify-center p-6 backdrop-blur-md">
            <div class="glass w-full max-w-sm rounded-[45px] p-10 border border-sky-500/20 relative">
                <button onclick="toggleModal()" class="absolute top-8 right-8 text-slate-500"><i class="fas fa-times"></i></button>
                <div class="text-center mb-8">
                    <div class="w-20 h-20 rounded-full bg-sky-500 mx-auto flex items-center justify-center text-3xl font-black text-slate-900 mb-4 shadow-xl">${email.charAt(0).toUpperCase()}</div>
                    <h2 class="text-xl font-black uppercase italic">User Profile</h2>
                </div>
                <div class="space-y-4">
                    <div class="bg-white/5 p-4 rounded-2xl"><p class="text-[9px] text-sky-400 font-black uppercase">Email</p><p class="text-sm font-mono">${userData.email}</p></div>
                    <div class="bg-white/5 p-4 rounded-2xl"><p class="text-[9px] text-sky-400 font-black uppercase">Password</p><p class="text-sm font-mono">••••••••</p></div>
                    <div class="bg-white/5 p-4 rounded-2xl"><p class="text-[9px] text-sky-400 font-black uppercase">Joined Date</p><p class="text-xs font-mono">${new Date(userData.createdAt).toLocaleDateString('id-ID')}</p></div>
                </div>
            </div>
        </div>

        <script>
            function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }
            function toggleModal() { const m = document.getElementById('accModal'); m.classList.toggle('hidden'); m.classList.toggle('flex'); }
        </script>
    </body></html>`);
});

// --- API DOCUMENTATION PAGE ---
app.get('/docs', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-[#020617] text-white font-sans p-6">
        <div class="max-w-3xl mx-auto">
            <div class="flex items-center mb-10"><a href="/" class="mr-6 text-sky-400"><i class="fas fa-arrow-left"></i></a><h1 class="text-3xl font-black italic">API <span class="text-sky-400">DOCS</span></h1></div>
            
            <div class="space-y-8">
                <section class="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <h2 class="text-sky-400 font-bold mb-3">1. QR Generator</h2>
                    <p class="text-slate-400 text-sm mb-4">Membuat QR Code secara dinamis dari teks atau link.</p>
                    <div class="bg-black/40 p-4 rounded-xl font-mono text-xs text-emerald-400">GET /tools/qrcode?text=YOUR_TEXT</div>
                </section>
                
                <section class="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <h2 class="text-sky-400 font-bold mb-3">2. Sholat API (Internal)</h2>
                    <p class="text-slate-400 text-sm mb-4">Mengambil jadwal sholat real-time daerah Jakarta.</p>
                    <div class="bg-black/40 p-4 rounded-xl font-mono text-xs text-sky-400">Endpoint: https://api.myquran.com/v2/sholat/jadwal/1301/</div>
                </section>

                <section class="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <h2 class="text-sky-400 font-bold mb-3">3. Authentication System</h2>
                    <p class="text-slate-400 text-sm mb-4">Sistem login menggunakan OTP via email Resend.</p>
                    <div class="bg-black/40 p-4 rounded-xl font-mono text-xs">POST /auth/login<br>POST /auth/verify</div>
                </section>
            </div>
        </div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
    </body></html>`);
});

// --- AUTH LOGIC (OTP) ---
app.get('/login', (req, res) => res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;background:#0f172a;padding:50px;border-radius:40px;border:1px solid #38bdf8;"><h1 style="color:#38bdf8;font-weight:900;margin-bottom:30px;">KAAA LOGIN</h1><form action="/auth/login" method="POST"><input name="email" type="email" placeholder="Email" required style="padding:15px;margin-bottom:10px;width:100%;"><br><input name="password" type="password" placeholder="Pass" required style="padding:15px;margin-bottom:20px;width:100%;"><br><button type="submit" style="background:#38bdf8;width:100%;padding:15px;font-weight:900;">GET OTP</button></form></div></body>'));
app.post('/auth/login', async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
    await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'Cloud OTP', html: `<b>OTP: ${otp}</b>` });
    res.redirect('/verify?email=' + email);
});
app.get('/verify', (req, res) => res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;color:white;"><form action="/auth/verify" method="POST" style="text-align:center;"><h2>ENTER OTP</h2><input name="email" type="hidden" value="'+req.query.email+'"><input name="otp" type="text" style="padding:15px;text-align:center;font-size:20px;"><br><button type="submit" style="background:#38bdf8;margin-top:20px;padding:10px 40px;font-weight:900;">VERIFY</button></form></body>'));
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

// --- QR TOOL ---
app.get('/tools/qrcode', async (req, res) => {
    const text = req.query.text;
    if (!text) return res.send("Missing ?text=");
    const qr = await QRCode.toDataURL(text);
    res.send(`<body style="background:#020617;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;"><div style="background:white;padding:20px;border-radius:30px;"><img src="${qr}" width="250"></div><h3 style="color:white;margin-top:20px;">${text}</h3></body>`);
});

module.exports = app;
