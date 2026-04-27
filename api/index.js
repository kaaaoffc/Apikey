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

// --- LOGIN & VERIFY (SAMA SEPERTI SEBELUMNYA) ---
app.get('/login', (req, res) => {
    res.send(`<body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <div style="background:rgba(30,41,59,0.5); backdrop-filter:blur(15px); padding:40px; border-radius:30px; border:1px solid #38bdf8; width:340px; text-align:center;">
            <h1 style="color:#38bdf8; font-size:24px; margin-bottom:10px;">KAAA LOGIN</h1>
            <form action="/auth/login" method="POST">
                <input name="email" type="email" placeholder="Email" style="width:100%; padding:12px; margin-bottom:12px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <input name="password" type="password" placeholder="Password" style="width:100%; padding:12px; margin-bottom:20px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">LOGIN</button>
            </form>
        </div>
    </body>`);
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
        await resend.emails.send({ from: 'KaaaOffc <code@kaaaoffc.web.id>', to: email, subject: 'OTP', html: `<h1>${otp}</h1>` });
        res.redirect('/verify?email=' + email);
    } catch (e) { res.send(e.message); }
});

app.post('/auth/verify', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (user) {
        user.isVerified = true;
        await user.save();
        res.cookie('userEmail', email, { maxAge: 86400000, httpOnly: true });
        res.redirect('/');
    } else { res.send("OTP Salah"); }
});

app.get('/verify', (req, res) => {
    res.send(`<body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
        <form action="/auth/verify" method="POST" style="background:rgba(30,41,59,0.5); padding:40px; border-radius:30px; border:1px solid #38bdf8; text-align:center;">
            <input name="email" type="hidden" value="${req.query.email}">
            <input name="otp" type="text" style="width:100%; padding:15px; margin:20px 0; border-radius:12px; text-align:center; background:#0f172a; color:white; border:none;" placeholder="OTP" required>
            <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold;">VERIFY</button>
        </form>
    </body>`);
});

// --- DASHBOARD CORE ---
app.get('/', checkAuth, async (req, res) => {
    const totalUser = await User.countDocuments({ isVerified: true });
    const statData = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    const domain = req.get('host');

    res.send(`<!DOCTYPE html><html lang="id"><head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            body { background: #020617; color: white; font-family: 'Inter', sans-serif; }
            .sidebar { transition: 0.3s; width: 0; overflow: hidden; position: fixed; height: 100vh; background: #0f172a; z-index: 100; border-right: 1px solid #1e293b; }
            .sidebar.active { width: 280px; }
            .glass { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.05); }
            .paste-card { background: #1e293b; border-radius: 15px; overflow: hidden; border: 1px solid #334155; }
            .paste-header { background: #334155; padding: 10px 15px; font-size: 12px; font-weight: bold; color: #94a3b8; display: flex; justify-content: space-between; }
            .paste-body { padding: 15px; font-family: monospace; color: #38bdf8; font-size: 13px; word-break: break-all; }
            .copy-btn { background: #38bdf8; color: #0f172a; width: 100%; padding: 10px; font-weight: 800; font-size: 12px; }
        </style>
    </head>
    <body>
        <div id="sidebar" class="sidebar">
            <div class="p-6">
                <h2 class="text-sky-400 font-black text-xl mb-10">KAAA MENU</h2>
                <nav class="space-y-4">
                    <button onclick="show('dash')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10 flex items-center gap-3"><i class="fas fa-chart-line"></i> Dashboard</button>
                    <button onclick="show('paste')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10 flex items-center gap-3"><i class="fas fa-code"></i> Pastebin List</button>
                    <button onclick="show('ptero')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10 flex items-center gap-3"><i class="fas fa-server"></i> Pterodactyl Shop</button>
                    <a href="/logout" class="block p-4 text-red-500 font-bold mt-10"><i class="fas fa-power-off mr-2"></i> Logout</a>
                </nav>
            </div>
        </div>

        <div class="p-6 max-w-4xl mx-auto">
            <div class="flex justify-between items-center mb-10">
                <button onclick="toggleSide()" class="bg-slate-800 p-3 rounded-xl"><i class="fas fa-bars text-sky-400"></i></button>
                <h1 class="font-black italic text-xl">KAAA<span class="text-sky-500">CLOUD</span></h1>
                <div class="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center font-bold text-slate-900">K</div>
            </div>

            <div id="tab-dash" class="tab">
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="glass p-6 rounded-3xl text-center">
                        <p id="live-req" class="text-4xl font-black text-sky-400">${statData.total_req}</p>
                        <p class="text-[10px] uppercase text-slate-500 tracking-tighter">Live Request</p>
                    </div>
                    <div class="glass p-6 rounded-3xl text-center">
                        <p class="text-4xl font-black text-white">${totalUser}</p>
                        <p class="text-[10px] uppercase text-slate-500 tracking-tighter">Total User</p>
                    </div>
                </div>
                <div class="glass p-10 rounded-[2.5rem] text-center border-sky-500/20">
                    <i class="fas fa-user-shield text-5xl text-sky-500 mb-4"></i>
                    <h2 class="text-xl font-bold uppercase">Account Verified</h2>
                    <p class="text-slate-400 text-sm mt-2">Gunakan menu di samping untuk akses fitur.</p>
                </div>
            </div>

            <div id="tab-paste" class="tab hidden">
                <h2 class="text-xl font-black italic mb-6 uppercase text-sky-400">Code Pastebin</h2>
                <div class="space-y-8">
                    <div class="paste-card">
                        <div class="paste-header">
                            <span>TIKTOK SEARCH COMMAND</span>
                            <i class="fas fa-globe text-sky-500"></i>
                        </div>
                        <div id="text-tiktok" class="paste-body">https://${domain}/search/tiktok?q=musik</div>
                        <button onclick="copy('text-tiktok')" class="copy-btn uppercase">Copy Command</button>
                    </div>

                    <div class="paste-card">
                        <div class="paste-header">
                            <span>AI GEMINI COMMAND</span>
                            <i class="fas fa-robot text-sky-500"></i>
                        </div>
                        <div id="text-gemini" class="paste-body">https://${domain}/ai/gemini?text=halo</div>
                        <button onclick="copy('text-gemini')" class="copy-btn uppercase">Copy Command</button>
                    </div>
                </div>
            </div>

            <div id="tab-ptero" class="tab hidden">
                <h2 class="text-xl font-black italic mb-6 uppercase text-sky-400">Pterodactyl Shop</h2>
                <div class="grid grid-cols-1 gap-4">
                    <div class="glass p-6 rounded-3xl flex justify-between items-center">
                        <div><p class="font-bold">RAM 1GB</p><p class="text-sky-400 text-xl font-black">Rp 3.317</p></div>
                        <a href="${TELE_ORDER}" class="bg-sky-500 text-slate-900 px-6 py-2 rounded-xl font-bold">ORDER</a>
                    </div>
                    <div class="glass p-6 rounded-3xl flex justify-between items-center border-sky-500/30">
                        <div><p class="font-bold">RAM 6GB</p><p class="text-sky-400 text-xl font-black">Rp 10.920</p></div>
                        <a href="${TELE_ORDER}" class="bg-sky-500 text-slate-900 px-6 py-2 rounded-xl font-bold">ORDER</a>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function toggleSide() { document.getElementById('sidebar').classList.toggle('active'); }
            function show(id) {
                document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
                document.getElementById('tab-'+id).classList.remove('hidden');
                toggleSide();
            }
            function copy(id) {
                const text = document.getElementById(id).innerText;
                navigator.clipboard.writeText(text);
                alert("Berhasil disalin!");
            }
            // Simple Live Polling (Opsional)
            setInterval(async () => {
                try {
                    const res = await fetch(location.href);
                    // Ini simulasi, realnya bisa pake endpoint API stats
                } catch(e){}
            }, 10000);
        </script>
    </body></html>`);
});

// --- API ENDPOINTS ---
app.get('/search/tiktok', checkAuth, async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false });
    await hit();
    try {
        const r = await axios.get(`https://api.nexray.web.id/search/tiktok?q=${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: r.data.result });
    } catch (e) { res.json({ status: false }); }
});

app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
