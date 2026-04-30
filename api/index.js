const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const cookieParser = require('cookie-parser');
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

// --- SECURITY LOGGING ENGINE ---
app.use(async (req, res, next) => {
    const sensitivePaths = ['/auth/login', '/auth/verify', '/login', '/verify', '/favicon.ico'];
    const isSensitive = sensitivePaths.some(path => req.path.startsWith(path));

    await connectDB();
    if (req.path !== '/favicon.ico') {
        await Stats.findOneAndUpdate({ name: "main" }, { $inc: { total_req: 1 } }, { upsert: true });
    }
    if (!isSensitive) {
        await Log.create({ method: req.method, fullUrl: req.originalUrl });
    }
    next();
});

// --- DASHBOARD UI ---
app.get('/', async (req, res) => {
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');
    
    await connectDB();
    const stats = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    const totalAkun = await User.countDocuments();
    const onlineCount = await User.countDocuments({ isVerified: true }); // Cukup tampilkan angka
    const currentUser = await User.findOne({ email });
    const logs = await Log.find().sort({ timestamp: -1 }).limit(8);

    res.send(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background: #020617; color: white; font-family: 'Inter', sans-serif; }
        .glass { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); }
    </style></head>
    <body class="p-4 md:p-10">
        <div class="max-w-6xl mx-auto">
            <header class="flex justify-between items-center mb-10">
                <h1 class="text-2xl font-black italic">KAAA<span class="text-sky-400">OFFC</span></h1>
                <div class="flex gap-2">
                    <a href="/docs" class="glass px-4 py-2 rounded-xl text-[10px] font-bold text-sky-400">DOCS</a>
                    <a href="/logout" class="glass px-4 py-2 rounded-xl text-[10px] font-bold text-red-400">LOGOUT</a>
                </div>
            </header>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div class="glass p-5 rounded-3xl border-l-4 border-sky-500">
                    <p class="text-[8px] font-black text-slate-500 uppercase">Total Hits</p>
                    <p class="text-2xl font-black text-sky-400">${stats.total_req.toLocaleString()}</p>
                </div>
                <div class="glass p-5 rounded-3xl border-l-4 border-emerald-500">
                    <p class="text-[8px] font-black text-slate-500 uppercase">Total Akun</p>
                    <p class="text-2xl font-black text-emerald-400">${totalAkun}</p>
                </div>
                <div class="glass p-5 rounded-3xl border-l-4 border-indigo-500">
                    <p class="text-[8px] font-black text-slate-500 uppercase">User Online</p>
                    <p class="text-2xl font-black text-indigo-400">${onlineCount}</p> 
                </div>
                <div class="glass p-5 rounded-3xl border-l-4 border-amber-500">
                    <p class="text-[8px] font-black text-slate-500 uppercase">Status</p>
                    <p class="text-sm font-black text-amber-400 uppercase tracking-tighter">Premium</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="space-y-6">
                    <div class="glass p-6 rounded-[35px]">
                        <h3 class="text-[10px] font-black text-sky-400 mb-4 uppercase italic">Informasi Akun</h3>
                        <p class="text-[11px] text-slate-400">Reg: ${new Date(currentUser.createdAt).toLocaleDateString()}</p>
                        <p class="text-[11px] text-emerald-400 font-bold mt-1">Status: Session Active</p>
                    </div>
                    <div class="glass p-6 rounded-[35px] border border-sky-500/20">
                        <h3 class="text-[10px] font-black text-sky-400 mb-4 uppercase">Jadwal Sholat (1301)</h3>
                        <div id="sholat-box" class="space-y-2 text-[11px] font-mono">Loading...</div>
                    </div>
                </div>

                <div class="lg:col-span-2 glass p-8 rounded-[40px]">
                    <h3 class="text-[10px] font-black text-sky-400 mb-6 uppercase tracking-widest">HTTP Monitor</h3>
                    <div class="space-y-3">
                        ${logs.map(l => `
                            <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border-l-2 border-sky-500/30">
                                <span class="text-[8px] font-black bg-sky-500 text-slate-900 px-2 py-0.5 rounded">${l.method}</span>
                                <p class="text-[10px] font-mono text-slate-300 truncate flex-1">${l.fullUrl}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
        <script>
            async function getSholat() {
                const res = await fetch('/sholat/1301');
                const data = await res.json();
                if(data.status) {
                    const s = data.result.jadwal;
                    document.getElementById('sholat-box').innerHTML = \`
                        <div class="flex justify-between"><span>Subuh</span><span>\${s.subuh}</span></div>
                        <div class="flex justify-between"><span>Dzuhur</span><span>\${s.dzuhur}</span></div>
                        <div class="flex justify-between"><span>Ashar</span><span>\${s.ashar}</span></div>
                        <div class="flex justify-between"><span>Maghrib</span><span>\${s.maghrib}</span></div>
                        <div class="flex justify-between"><span>Isya</span><span>\${s.isya}</span></div>\`;
                }
            }
            getSholat();
        </script>
    </body></html>`);
});

// --- API ENDPOINTS (TikTok, AI, Sholat, Cuaca) ---
app.get('/search/tiktok', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ status: false, message: "Use ?q=" });
    try {
        const r = await axios.get(`https://api.nexray.web.id/search/tiktok?q=${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.result });
    } catch (e) { res.json({ status: false, error: "TikTok Error" }); }
});


app.get('/search/spotify', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ status: false, message: "Use ?q=" });
    try {
        const r = await axios.get(`https://api.nexray.eu.cc/search/spotify?q=${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.result });
    } catch (e) { res.json({ status: false, error: "Spotify Error" }); }
});

app.get('/ai/gemini', async (req, res) => {
    const { text } = req.query;
    if (!text) return res.json({ status: false, message: "Use ?text=" });
    try {
        const r = await axios.get(`https://api.nexray.web.id/ai/gemini?text=${encodeURIComponent(text)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.result });
    } catch (e) { res.json({ status: false, error: "AI Error" }); }
});

app.get('/information/cuaca', async (req, res) => {
    const { kota } = req.query;
    if (!kota) return res.json({ status: false, message: "Use ?kota=" });
    try {
        const r = await axios.get(`https://api.nexray.web.id/information/cuaca?kota=${encodeURIComponent(kota)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.result });
    } catch (e) { res.json({ status: false, error: "Weather Error" }); }
});

app.get('/sholat/1301', async (req, res) => {
    try {
        const r = await axios.get(`https://bimasislam.kemenag.go.id/jadwalshalat`);
        res.json({ status: true, result: r.data.result });
    } catch (e) { res.json({ status: false, error: "API Error" }); }
});

app.get('/docs', (req, res) => {
    res.send(`<body style="background:#020617;color:white;padding:50px;font-family:sans-serif;"><h1>API DOCS</h1><ul><li>/ai/gemini?text=</li><li>/search/tiktok?q=</li><li>/information/cuaca?kota=</li></ul><a href="/" style="color:cyan;">Back</a></body>`);
});

// --- AUTH LOGIC ---
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html><html><body style="background:#020617;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
    <form action="/auth/login" method="POST" style="background:#0f172a;padding:50px;border-radius:40px;border:1px solid #38bdf8;text-align:center;width:350px;">
        <h1 style="font-weight:900;font-style:italic;">KAAA<span style="color:#38bdf8;">LOGIN</span></h1>
        <input name="email" type="email" placeholder="Email" required style="width:100%;padding:15px;margin-top:20px;border-radius:15px;background:#1e293b;border:none;color:white;">
        <input name="password" type="password" placeholder="Password" required style="width:100%;padding:15px;margin-top:10px;border-radius:15px;background:#1e293b;border:none;color:white;">
        <button type="submit" style="width:100%;padding:15px;margin-top:20px;border-radius:15px;background:#38bdf8;color:#020617;font-weight:900;">LOGIN</button>
    </form></body></html>`);
});

app.post('/auth/login', async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
    await resend.emails.send({ from: 'Auth <code@kaaaoffc.web.id>', to: email, subject: 'Cloud OTP', html: `<b>${otp}</b>` });
    res.redirect('/verify?email=' + email);
});

app.get('/verify', (req, res) => res.send('<body style="background:#020617;color:white;display:flex;justify-content:center;align-items:center;height:100vh;"><form action="/auth/verify" method="POST" style="text-align:center;"><input name="email" type="hidden" value="'+req.query.email+'"><h2>OTP</h2><input name="otp" style="padding:15px;border-radius:15px;"><button type="submit" style="margin-top:20px;padding:15px 30px;background:#38bdf8;border-radius:15px;display:block;width:100%;">VERIFY</button></form></body>'));

app.post('/auth/verify', async (req, res) => {
    await connectDB();
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (user) { 
        await User.updateOne({ email }, { isVerified: true }); // Tandai user aktif/online
        res.cookie('userEmail', email, { maxAge: 86400000 }); 
        res.redirect('/'); 
    } else res.send("Salah!");
});

app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
