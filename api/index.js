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

const resend = new Resend(RESEND_API);
mongoose.connect(MONGO_URI).catch(err => console.error("DB Error:", err));

// --- MODELS ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    otp: String,
    isVerified: { type: Boolean, default: false }
}));

const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({
    method: String,
    path: String,
    timestamp: { type: Date, default: Date.now }
}));

const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({
    name: { type: String, default: "main" },
    total_req: { type: Number, default: 0 }
}));

// --- MIDDLEWARE ---
async function recordRequest(req) {
    if (req.path.includes('/api/')) return; // Jangan log internal API
    await Stats.findOneAndUpdate({ name: "main" }, { $inc: { total_req: 1 } }, { upsert: true });
    await new Log({ method: req.method, path: req.originalUrl }).save();
}

const checkAuth = async (req, res, next) => {
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');
    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.redirect('/login');
    next();
};

// --- AUTH SYSTEM ---
app.get('/login', (req, res) => {
    res.send(`
    <body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <div style="background:rgba(30,41,59,0.5); backdrop-filter:blur(15px); padding:40px; border-radius:30px; border:1px solid #38bdf8; width:320px; text-align:center;">
            <h1 style="color:#38bdf8; font-size:24px; font-weight:900; margin-bottom:20px;">KAAA LOGIN</h1>
            <form action="/auth/login" method="POST">
                <input name="email" type="email" placeholder="Email" style="width:100%; padding:12px; margin-bottom:12px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <input name="password" type="password" placeholder="Password" style="width:100%; padding:12px; margin-bottom:20px; border-radius:12px; border:none; background:#0f172a; color:white;" required>
                <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold; cursor:pointer; color:#020617;">LOGIN</button>
            </form>
        </div>
    </body>`);
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
        await resend.emails.send({ from: 'KaaaOffc <code@kaaaoffc.web.id>', to: email, subject: 'OTP Login', html: `<b>Code: ${otp}</b>` });
        res.redirect('/verify?email=' + email);
    } catch (e) { res.send(e.message); }
});

app.get('/verify', (req, res) => {
    res.send(`
    <body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
        <form action="/auth/verify" method="POST" style="background:rgba(30,41,59,0.5); padding:40px; border-radius:30px; border:1px solid #38bdf8; text-align:center;">
            <input name="email" type="hidden" value="${req.query.email}">
            <input name="otp" type="text" placeholder="Masukkan OTP" style="width:100%; padding:15px; margin:20px 0; border-radius:12px; text-align:center; background:#0f172a; color:white; border:none;" required>
            <button type="submit" style="width:100%; padding:12px; background:#38bdf8; border:none; border-radius:12px; font-weight:bold; color:#020617;">VERIFIKASI</button>
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
        res.redirect('/');
    } else { res.send("OTP SALAH"); }
});

// --- API DATA (FOR DASHBOARD) ---
app.get('/api/internal/stats', async (req, res) => {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(10);
    const stats = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    res.json({ logs, total: stats.total_req });
});

// --- MAIN DASHBOARD ---
app.get('/', checkAuth, async (req, res) => {
    const domain = req.get('host');
    res.send(`
    <!DOCTYPE html><html lang="id"><head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            body { background: #020617; color: white; font-family: 'Inter', sans-serif; overflow-x: hidden; }
            .sidebar { transition: 0.3s; width: 0; overflow: hidden; position: fixed; height: 100vh; background: #0f172a; z-index: 100; border-right: 1px solid #1e293b; }
            .sidebar.active { width: 280px; }
            .glass { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
            .log-container { background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; }
            .log-item { padding: 10px 15px; border-bottom: 1px solid #1e293b; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; }
            .paste-card { background: #1e293b; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px; overflow: hidden; }
            .paste-header { background: #334155; padding: 8px 15px; font-size: 10px; font-weight: bold; color: #94a3b8; display: flex; justify-content: space-between; }
            .paste-body { padding: 15px; color: #38bdf8; font-size: 12px; word-break: break-all; }
            .btn-copy { background: #38bdf8; color: #020617; width: 100%; padding: 10px; font-weight: bold; font-size: 11px; }
        </style>
    </head>
    <body>
        <div id="side" class="sidebar">
            <div class="p-6">
                <h2 class="text-sky-400 font-black text-xl mb-10 italic uppercase">Menu</h2>
                <button onclick="show('dash')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10 mb-2 font-bold flex items-center gap-3"><i class="fas fa-home"></i> Home</button>
                <button onclick="show('paste')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10 mb-2 font-bold flex items-center gap-3"><i class="fas fa-code"></i> Pastebin</button>
                <a href="/logout" class="block p-4 text-red-500 font-bold mt-10">LOGOUT</a>
            </div>
        </div>

        <div class="p-6 max-w-4xl mx-auto">
            <header class="flex justify-between items-center mb-10">
                <button onclick="toggleSide()" class="bg-slate-800 p-3 rounded-xl"><i class="fas fa-bars text-sky-400"></i></button>
                <h1 class="font-black italic text-xl">KAAA<span class="text-sky-500">OFFC</span></h1>
                <div class="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center font-bold text-slate-900">K</div>
            </header>

            <div id="tab-dash" class="tab-content">
                <div class="glass p-8 rounded-3xl text-center mb-8">
                    <p id="count" class="text-5xl font-black text-sky-400">0</p>
                    <p class="text-[10px] uppercase text-slate-500 font-bold tracking-widest mt-2">Total Live Requests</p>
                </div>

                <h2 class="text-lg font-black italic mb-4 text-sky-400 uppercase tracking-widest">Request History Log</h2>
                <div class="log-container">
                    <div class="bg-slate-800/50 p-2 px-4 text-[9px] font-bold text-slate-500 flex justify-between">
                        <span>METHOD & PATH</span>
                        <span>TIMESTAMP</span>
                    </div>
                    <div id="log-list"></div>
                </div>
            </div>

            <div id="tab-paste" class="tab-content hidden">
                <h2 class="text-xl font-black italic mb-6 text-sky-400 uppercase">Code Pastebin</h2>
                <div class="paste-card">
                    <div class="paste-header"><span>TIKTOK SEARCH API</span><i class="fas fa-search"></i></div>
                    <div id="t1" class="paste-body">https://${domain}/search/tiktok?q=musik</div>
                    <button onclick="copy('t1')" class="btn-copy">COPY COMMAND</button>
                </div>
                <div class="paste-card">
                    <div class="paste-header"><span>AI GEMINI API</span><i class="fas fa-robot"></i></div>
                    <div id="t2" class="paste-body">https://${domain}/ai/gemini?text=halo</div>
                    <button onclick="copy('t2')" class="btn-copy">COPY COMMAND</button>
                </div>
            </div>
        </div>

        <script>
            function toggleSide() { document.getElementById('side').classList.toggle('active'); }
            function show(id) {
                document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
                document.getElementById('tab-'+id).classList.remove('hidden');
                toggleSide();
            }
            function copy(id) {
                navigator.clipboard.writeText(document.getElementById(id).innerText);
                alert("Berhasil disalin!");
            }

            async function updateDashboard() {
                try {
                    const res = await fetch('/api/internal/stats');
                    const data = await res.json();
                    document.getElementById('count').innerText = data.total;
                    document.getElementById('log-list').innerHTML = data.logs.map(l => \`
                        <div class="log-item">
                            <span><b class="text-emerald-400">\${l.method}</b> \${l.path}</span>
                            <span class="text-slate-500">\${new Date(l.timestamp).toLocaleTimeString()}</span>
                        </div>
                    \`).join('');
                } catch(e) {}
            }
            setInterval(updateDashboard, 2000);
            updateDashboard();
        </script>
    </body></html>`);
});

// --- API ENDPOINTS ---
app.get('/search/tiktok', async (req, res) => {
    await recordRequest(req);
    const q = req.query.q;
    try {
        const r = await axios.get(`https://api.nexray.web.id/search/tiktok?q=${q}`);
        res.json({ status: true, result: r.data.result });
    } catch (e) { res.json({ status: false }); }
});

app.get('/ai/gemini', async (req, res) => {
    await recordRequest(req);
    const text = req.query.text;
    try {
        const r = await axios.get(`https://api.nexray.web.id/ai/gemini?text=${text}`);
        res.json({ status: true, result: r.data.result });
    } catch (e) { res.json({ status: false }); }
});

app.get('/logout', (req, res) => {
    res.clearCookie('userEmail');
    res.redirect('/login');
});

module.exports = app;
