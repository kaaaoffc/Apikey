const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const cookieParser = require('cookie-parser');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- CONFIG ---
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

const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({
    name: { type: String, default: "main" },
    total_req: { type: Number, default: 0 }
}));

// --- AUTH MIDDLEWARE ---
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

// --- LOGIN & OTP ROUTES (DIPERSINGKAT) ---
app.get('/login', (req, res) => { /* Form Login Sesuai Sebelumnya */ });
app.post('/auth/login', async (req, res) => { /* Logic Login & Send OTP */ });
app.get('/verify', (req, res) => { /* Form OTP */ });
app.post('/auth/verify', async (req, res) => { /* Verify & Set Cookie */ });

// --- API UNTUK LIVE REQUEST (POLLING) ---
app.get('/api/stats', async (req, res) => {
    const data = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    res.json({ total: data.total_req });
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
            .glass { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
            .paste-card { background: #1e293b; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px; overflow: hidden; }
            .paste-header { background: #334155; padding: 8px 15px; font-size: 11px; font-weight: 800; color: #94a3b8; display: flex; justify-content: space-between; }
            .paste-body { padding: 15px; font-family: 'Courier New', monospace; color: #38bdf8; font-size: 13px; word-break: break-all; }
            .btn-copy { background: #38bdf8; color: #020617; width: 100%; padding: 10px; font-weight: bold; font-size: 12px; text-transform: uppercase; }
        </style>
    </head>
    <body>
        <div id="sidebar" class="sidebar">
            <div class="p-6">
                <h2 class="text-sky-400 font-black mb-10">KAAA PANEL</h2>
                <button onclick="show('dash')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10 mb-2"><i class="fas fa-home mr-3"></i> Home</button>
                <button onclick="show('paste')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10 mb-2"><i class="fas fa-paste mr-3"></i> Pastebin List</button>
                <button onclick="show('ptero')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10 mb-2"><i class="fas fa-server mr-3"></i> Order Panel</button>
                <a href="/logout" class="block p-4 text-red-500 font-bold mt-10"><i class="fas fa-power-off mr-2"></i> Logout</a>
            </div>
        </div>

        <div class="p-6 max-w-4xl mx-auto">
            <div class="flex justify-between items-center mb-10">
                <button onclick="toggleSide()" class="bg-slate-800 p-3 rounded-xl"><i class="fas fa-bars text-sky-400"></i></button>
                <h1 class="font-black italic">KAAA<span class="text-sky-500">OFFC</span></h1>
                <div class="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-slate-900 font-bold">K</div>
            </div>

            <div id="tab-dash" class="tab-content">
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="glass p-8 rounded-3xl text-center">
                        <p id="live-hit" class="text-4xl font-black text-sky-400">0</p>
                        <p class="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Live Requests</p>
                    </div>
                    <div class="glass p-8 rounded-3xl text-center">
                        <p class="text-4xl font-black text-white">${totalUser}</p>
                        <p class="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Total User</p>
                    </div>
                </div>
            </div>

            <div id="tab-paste" class="tab-content hidden">
                <h2 class="text-xl font-black italic mb-6">PASTEBIN LIST</h2>
                
                <div class="paste-card">
                    <div class="paste-header"><span>TIKTOK SEARCH COMMAND</span><i class="fas fa-search"></i></div>
                    <div id="cmd-tiktok" class="paste-body">https://${domain}/search/tiktok?q=musik</div>
                    <button onclick="copy('cmd-tiktok')" class="btn-copy">Copy Command</button>
                </div>

                <div class="paste-card">
                    <div class="paste-header"><span>AI GEMINI COMMAND</span><i class="fas fa-robot"></i></div>
                    <div id="cmd-gemini" class="paste-body">https://${domain}/ai/gemini?text=halo</div>
                    <button onclick="copy('cmd-gemini')" class="btn-copy">Copy Command</button>
                </div>
            </div>
        </div>

        <script>
            function toggleSide() { document.getElementById('sidebar').classList.toggle('active'); }
            function show(id) {
                document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
                document.getElementById('tab-'+id).classList.remove('hidden');
                toggleSide();
            }
            function copy(id) {
                navigator.clipboard.writeText(document.getElementById(id).innerText);
                alert("Copied!");
            }

            // LIVE REQUEST LOGIC
            async function updateStats() {
                try {
                    const r = await fetch('/api/stats');
                    const d = await r.json();
                    document.getElementById('live-hit').innerText = d.total;
                } catch(e) {}
            }
            setInterval(updateStats, 2000); // Update setiap 2 detik
            updateStats();
        </script>
    </body></html>`);
});

// --- API ENDPOINTS ---
app.get('/search/tiktok', checkAuth, async (req, res) => {
    await hit();
    const q = req.query.q;
    try {
        const r = await axios.get(`https://api.nexray.web.id/search/tiktok?q=${q}`);
        res.json({ status: true, result: r.data.result });
    } catch (e) { res.json({ status: false }); }
});

module.exports = app;
