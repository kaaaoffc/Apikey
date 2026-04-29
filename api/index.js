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

// --- AUTOMATIC HITS TRACKER ---
app.use(async (req, res, next) => {
    if (req.path !== '/favicon.ico' && !req.path.startsWith('/auth')) {
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
    const stats = await Stats.findOne({ name: "main" }) || { total_req: 105902 };
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
        body { background: #020617; color: white; font-family: sans-serif; overflow-x: hidden; }
        .glass { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.05); }
        .sidebar { transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform: translateX(-100%); }
        .sidebar.active { transform: translateX(0); }
    </style></head>
    <body class="p-4">
        <div id="sidebar" class="sidebar fixed top-0 left-0 w-72 h-full glass z-50 p-8 shadow-2xl">
            <div class="flex justify-between items-center mb-10">
                <h2 class="text-sky-400 font-black italic tracking-widest text-xl">KAAA MENU</h2>
                <button onclick="toggleSidebar()"><i class="fas fa-times text-2xl text-slate-500"></i></button>
            </div>
            <nav class="space-y-4">
                <a href="/" class="flex items-center p-4 rounded-2xl bg-sky-500/10 text-sky-400 font-bold transition"><i class="fas fa-th-large mr-4"></i> Dashboard</a>
                <a href="/list-cmd" class="flex items-center p-4 rounded-2xl hover:bg-white/5 transition"><i class="fas fa-list-check mr-4"></i> List Command</a>
                <a href="/docs" class="flex items-center p-4 rounded-2xl hover:bg-white/5 transition"><i class="fas fa-book mr-4"></i> Documentation</a>
                <a href="/tools/qrcode?text=KaaaOffc" class="flex items-center p-4 rounded-2xl hover:bg-white/5 transition"><i class="fas fa-qrcode mr-4"></i> QR Generator</a>
                <div class="pt-10 border-t border-white/5">
                    <a href="/logout" class="flex items-center p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition"><i class="fas fa-power-off mr-4"></i> Logout</a>
                </div>
            </nav>
        </div>

        <div class="max-w-4xl mx-auto">
            <header class="flex justify-between items-center mb-8">
                <button onclick="toggleSidebar()" class="w-12 h-12 glass rounded-2xl flex items-center justify-center text-sky-400 shadow-lg text-xl">
                    <i class="fas fa-bars-staggered"></i>
                </button>
                <h1 class="text-2xl font-black italic">KAAA<span class="text-sky-400">OFFC</span></h1>
                <button onclick="toggleModal()" class="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center font-black text-slate-900 border-2 border-sky-300 shadow-lg transition active:scale-90">
                    ${email.charAt(0).toUpperCase()}
                </button>
            </header>

            <div class="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-[35px] mb-8">
                <div class="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
                    <div class="bg-black/20 p-2 rounded-2xl">SUBUH<p class="text-emerald-400 text-sm mt-1">${sholat.subuh}</p></div>
                    <div class="bg-black/20 p-2 rounded-2xl">DZUHUR<p class="text-emerald-400 text-sm mt-1">${sholat.dzuhur}</p></div>
                    <div class="bg-black/20 p-2 rounded-2xl">ASHAR<p class="text-emerald-400 text-sm mt-1">${sholat.ashar}</p></div>
                    <div class="bg-black/20 p-2 rounded-2xl">MAGHRIB<p class="text-emerald-400 text-sm mt-1">${sholat.maghrib}</p></div>
                    <div class="bg-black/20 p-2 rounded-2xl">ISYA<p class="text-emerald-400 text-sm mt-1">${sholat.isya}</p></div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="glass p-6 rounded-[35px] border-l-4 border-sky-500">
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Accounts</p>
                    <p class="text-3xl font-black text-white mt-1">${totalAkun}</p>
                </div>
                <div class="glass p-6 rounded-[35px] border-l-4 border-emerald-500">
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">User Online</p>
                    <p class="text-3xl font-black text-emerald-400 mt-1">1</p>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div class="glass p-6 rounded-[35px] text-center">
                    <p class="text-3xl font-black text-sky-400">${stats.total_req.toLocaleString()}</p>
                    <p class="text-[10px] text-slate-500 uppercase font-black mt-1">Total Requests</p>
                </div>
                <div class="glass p-6 rounded-[35px] text-center">
                    <p class="text-3xl font-black text-white">48.91 GB</p>
                    <p class="text-[10px] text-slate-500 uppercase font-black mt-1">RAM Usage</p>
                </div>
                <div class="glass p-6 rounded-[35px] text-center hidden md:block">
                    <p class="text-3xl font-black text-emerald-400">ONLINE</p>
                    <p class="text-[10px] text-slate-500 uppercase font-black mt-1">System Status</p>
                </div>
            </div>

            <div class="glass p-8 rounded-[40px]">
                <h3 class="text-xs font-black text-sky-400 mb-6 uppercase tracking-widest">Live Activity Log</h3>
                <div class="space-y-4">
                    ${logs.map(l => `<div class="flex justify-between text-[11px] font-mono border-b border-white/5 pb-3">
                        <span><b class="text-sky-400 mr-2">${l.method}</b> ${l.path}</span>
                        <span class="text-slate-500">${new Date(l.timestamp).toLocaleTimeString()}</span>
                    </div>`).join('')}
                </div>
            </div>
        </div>

        <div id="accModal" class="fixed inset-0 z-[60] bg-black/90 hidden items-center justify-center p-6 backdrop-blur-md">
            <div class="glass w-full max-w-sm rounded-[45px] p-10 relative">
                <div class="text-center mb-8">
                    <div class="w-20 h-20 rounded-full bg-sky-500 mx-auto flex items-center justify-center text-3xl font-black text-slate-900 mb-4 shadow-xl">${email.charAt(0).toUpperCase()}</div>
                    <h2 class="text-xl font-black italic uppercase">Account Info</h2>
                </div>
                <div class="space-y-4">
                    <div class="bg-white/5 p-4 rounded-2xl"><p class="text-[9px] text-sky-400 font-bold uppercase mb-1">Email</p><p class="text-sm font-mono">${userData.email}</p></div>
                    <div class="bg-white/5 p-4 rounded-2xl"><p class="text-[9px] text-sky-400 font-bold uppercase mb-1">Password</p><p class="text-sm font-mono">••••••••</p></div>
                    <div class="bg-white/5 p-4 rounded-2xl"><p class="text-[9px] text-sky-400 font-bold uppercase mb-1">Joined Date</p><p class="text-xs font-mono">${new Date(userData.createdAt).toLocaleString('id-ID')}</p></div>
                </div>
                <button onclick="toggleModal()" class="absolute top-8 right-8 text-slate-500 hover:text-white transition"><i class="fas fa-times text-xl"></i></button>
            </div>
        </div>

        <script>
            function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }
            function toggleModal() { const m = document.getElementById('accModal'); m.classList.toggle('hidden'); m.classList.toggle('flex'); }
        </script>
    </body></html>`);
});

// --- LIST COMMAND PAGE ---
app.get('/list-cmd', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></head>
    <body class="bg-[#020617] text-white p-6 font-sans">
        <div class="max-w-2xl mx-auto">
            <header class="flex items-center mb-10"><a href="/" class="mr-4 text-sky-400 text-xl"><i class="fas fa-chevron-left"></i></a><h1 class="text-3xl font-black italic tracking-tighter">LIST <span class="text-sky-400">COMMAND</span></h1></header>
            <div class="space-y-4">
                <div class="bg-white/5 p-5 rounded-3xl flex justify-between items-center border border-white/5">
                    <div><p class="font-bold text-sky-400">QR Generator</p><p class="text-xs text-slate-500">/tools/qrcode?text=...</p></div>
                    <i class="fas fa-qrcode text-slate-700 text-xl"></i>
                </div>
                <div class="bg-white/5 p-5 rounded-3xl flex justify-between items-center border border-white/5">
                    <div><p class="font-bold text-sky-400">Jadwal Sholat</p><p class="text-xs text-slate-500">Auto Update Jakarta</p></div>
                    <i class="fas fa-mosque text-slate-700 text-xl"></i>
                </div>
                <div class="bg-white/5 p-5 rounded-3xl flex justify-between items-center border border-white/5">
                    <div><p class="font-bold text-sky-400">Traffic Monitoring</p><p class="text-xs text-slate-500">Live API Tracking</p></div>
                    <i class="fas fa-chart-line text-slate-700 text-xl"></i>
                </div>
            </div>
        </div>
    </body></html>`);
});

// --- DOCS PAGE ---
app.get('/docs', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-[#020617] text-white p-6">
        <div class="max-w-2xl mx-auto">
            <a href="/" class="text-sky-400 font-bold mb-6 inline-block">← Back Home</a>
            <h1 class="text-4xl font-black italic mb-10">DOCUMENTATION</h1>
            <div class="bg-slate-900/50 p-8 rounded-[40px] border border-white/5">
                <p class="text-sky-400 font-bold mb-2 uppercase text-xs">How to use QR API</p>
                <code class="block bg-black/50 p-4 rounded-xl text-emerald-400 text-sm mb-6">GET /tools/qrcode?text=YourTextHere</code>
                
                <p class="text-sky-400 font-bold mb-2 uppercase text-xs">Auth API</p>
                <p class="text-xs text-slate-400 mb-4">Sistem login menggunakan Express Cookie + Resend OTP.</p>
                <code class="block bg-black/50 p-4 rounded-xl text-sm">/auth/login <br> /auth/verify</code>
            </div>
        </div>
    </body></html>`);
});

// --- AUTH LOGIC ---
app.get('/login', (req, res) => res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;background:#0f172a;padding:50px;border-radius:40px;border:1px solid #38bdf8;"><h1 style="color:#38bdf8;font-weight:900;margin-bottom:30px;">KAAA LOGIN</h1><form action="/auth/login" method="POST"><input name="email" type="email" placeholder="Email" required style="padding:15px;border-radius:10px;margin-bottom:10px;width:100%;"><br><input name="password" type="password" placeholder="Pass" required style="padding:15px;border-radius:10px;margin-bottom:20px;width:100%;"><br><button type="submit" style="background:#38bdf8;width:100%;padding:15px;font-weight:900;">GET OTP</button></form></div></body>'));
app.post('/auth/login', async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
    await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'Login OTP', html: `<b>OTP Lo: ${otp}</b>` });
    res.redirect('/verify?email=' + email);
});
app.get('/verify', (req, res) => res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;color:white;"><form action="/auth/verify" method="POST" style="text-align:center;"><h2>OTP CODE</h2><input name="email" type="hidden" value="'+req.query.email+'"><input name="otp" type="text" style="padding:15px;"><br><button type="submit" style="background:#38bdf8;margin-top:20px;padding:10px 40px;font-weight:900;">VERIFY</button></form></body>'));
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
