const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const cookieParser = require('cookie-parser');
const QRCode = require('qrcode');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const MONGO_URI = "mongodb+srv://eka710231_db_user:kaaacloud@cluster0.6ssgy30.mongodb.net/?appName=Cluster0";
const resend = new Resend("re_Y3DfKKCM_7rJCyA3V1JHoxUNxQ2sc7Fb1");

let isConnected = false;
async function connectDB() {
    if (isConnected) return;
    await mongoose.connect(MONGO_URI);
    isConnected = true;
}

// --- MODELS ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ 
    email: String, password: String, otp: String, isVerified: Boolean, createdAt: { type: Date, default: Date.now } 
}));
const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({ 
    method: String, fullUrl: String, timestamp: { type: Date, default: Date.now } 
}));
const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({ name: String, total_req: Number }));

// --- LOGGING ENGINE ---
app.use(async (req, res, next) => {
    if (req.path !== '/favicon.ico' && !req.path.startsWith('/auth') && !req.path.includes('/login')) {
        await connectDB();
        await Log.create({ method: req.method, fullUrl: req.originalUrl });
        await Stats.findOneAndUpdate({ name: "main" }, { $inc: { total_req: 1 } }, { upsert: true });
    }
    next();
});

// --- MODERN LOGIN PAGE ---
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background: #020617; overflow: hidden; }
        .bg-glow { position: absolute; width: 300px; height: 300px; background: #38bdf8; filter: blur(120px); opacity: 0.15; z-index: -1; }
        .glass-login { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 40px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        input { background: rgba(255,255,255,0.03) !important; border: 1px solid rgba(255,255,255,0.08) !important; transition: 0.3s; }
        input:focus { border-color: #38bdf8 !important; box-shadow: 0 0 15px rgba(56, 189, 248, 0.2); outline: none; }
    </style></head>
    <body class="flex items-center justify-center min-h-screen p-6 text-white">
        <div class="bg-glow top-10 left-10"></div>
        <div class="bg-glow bottom-10 right-10" style="background:#818cf8"></div>
        
        <div class="glass-login w-full max-w-md p-10 md:p-14 text-center">
            <div class="mb-10">
                <div class="w-20 h-20 bg-sky-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-sky-500/30">
                    <i class="fas fa-shield-halved text-4xl text-sky-400"></i>
                </div>
                <h1 class="text-3xl font-black italic tracking-tighter">KAAA<span class="text-sky-400">CLOUD</span></h1>
                <p class="text-slate-500 text-xs mt-2 uppercase tracking-[0.3em]">Access Your Infrastructure</p>
            </div>

            <form action="/auth/login" method="POST" class="space-y-5">
                <div class="text-left">
                    <label class="text-[10px] font-bold text-sky-400 ml-4 mb-2 block uppercase tracking-widest">Email Address</label>
                    <input name="email" type="email" placeholder="name@company.com" required class="w-full p-4 rounded-2xl text-sm">
                </div>
                <div class="text-left">
                    <label class="text-[10px] font-bold text-sky-400 ml-4 mb-2 block uppercase tracking-widest">Password</label>
                    <input name="password" type="password" placeholder="••••••••" required class="w-full p-4 rounded-2xl text-sm">
                </div>
                <button type="submit" class="w-full bg-sky-500 hover:bg-sky-400 text-slate-900 font-black p-4 rounded-2xl transition duration-300 transform active:scale-95 shadow-lg shadow-sky-500/20 mt-4 uppercase italic">
                    Get Verification Code <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </form>
            
            <p class="mt-10 text-[10px] text-slate-600 uppercase tracking-widest">Powered by KaaaOffc Automation</p>
        </div>
    </body></html>`);
});

// --- DASHBOARD (Sama kaya sebelumnya tapi sinkron) ---
app.get('/', async (req, res) => {
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');
    const userData = await User.findOne({ email });
    const totalAkun = await User.countDocuments();
    const stats = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    const logs = await Log.find().sort({ timestamp: -1 }).limit(7);

    res.send(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background: #020617; color: white; font-family: sans-serif; }
        .glass { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.05); }
        .sidebar { transition: 0.4s; transform: translateX(-100%); }
        .sidebar.active { transform: translateX(0); }
    </style></head>
    <body class="p-4">
        <div id="sidebar" class="sidebar fixed top-0 left-0 w-72 h-full glass z-50 p-8 shadow-2xl">
            <h2 class="text-sky-400 font-black mb-10 italic text-xl uppercase">Kaaa Menu</h2>
            <nav class="space-y-4 font-bold">
                <a href="/" class="block p-4 rounded-2xl bg-sky-500/10 text-sky-400"><i class="fas fa-home mr-3"></i> Dashboard</a>
                <a href="/list-cmd" class="block p-4 rounded-2xl hover:bg-white/5"><i class="fas fa-list mr-3"></i> List Command</a>
                <a href="/docs" class="block p-4 rounded-2xl hover:bg-white/5"><i class="fas fa-file-code mr-3"></i> Documentation</a>
                <a href="https://t.me/autoorderkaabot" target="_blank" class="block p-4 rounded-2xl bg-emerald-500/10 text-emerald-400"><i class="fas fa-shopping-cart mr-3"></i> Order Panel</a>
                <a href="/logout" class="block p-4 rounded-2xl text-red-400 mt-10"><i class="fas fa-power-off mr-3"></i> Logout</a>
            </nav>
            <button onclick="toggleSidebar()" class="absolute top-8 right-8 text-slate-500"><i class="fas fa-times"></i></button>
        </div>

        <div class="max-w-4xl mx-auto">
            <header class="flex justify-between items-center mb-8">
                <button onclick="toggleSidebar()" class="w-12 h-12 glass rounded-2xl text-sky-400 text-xl"><i class="fas fa-bars-staggered"></i></button>
                <h1 class="text-2xl font-black italic">KAAA<span class="text-sky-400">OFFC</span></h1>
                <div class="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center font-black text-slate-900 border-2 border-sky-300">${email.charAt(0).toUpperCase()}</div>
            </header>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="glass p-6 rounded-[35px] border-l-4 border-sky-500">
                    <p class="text-[10px] font-black text-slate-500 uppercase">Hits Record</p>
                    <p class="text-3xl font-black text-sky-400 mt-1">${stats.total_req.toLocaleString()}</p>
                </div>
                <div class="glass p-6 rounded-[35px] border-l-4 border-emerald-500">
                    <p class="text-[10px] font-black text-slate-500 uppercase">User Online</p>
                    <p class="text-3xl font-black text-emerald-400 mt-1">1</p>
                </div>
            </div>

            <div class="glass p-8 rounded-[40px] mb-8">
                <h3 class="text-xs font-black text-sky-400 mb-6 uppercase tracking-widest">HTTP Full Traffic Log</h3>
                <div class="space-y-4">
                    ${logs.map(l => `<div class="flex flex-col border-b border-white/5 pb-3">
                        <div class="flex justify-between mb-1">
                            <span class="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded text-sky-400">${l.method}</span>
                            <span class="text-[9px] text-slate-600 font-mono">${new Date(l.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p class="text-[11px] font-mono text-emerald-400 break-all">${l.fullUrl}</p>
                    </div>`).join('')}
                </div>
            </div>
        </div>

        <script>function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }</script>
    </body></html>`);
});

// --- API ENDPOINTS (AI & TIKTOK) ---
app.get('/ai/blacblock', async (req, res) => {
    const { text } = req.query;
    if (!text) return res.json({ status: false, message: "Input query!" });
    try {
        const response = await axios.get(`https://www.blackbox.ai/api/chat?q=${encodeURIComponent(text)}`);
        res.json({ status: true, creator: "KaaaOffc", result: response.data });
    } catch (e) { res.json({ status: false }); }
});

app.get('/search/tiktok', async (req, res) => {
    const { search } = req.query;
    if (!search) return res.json({ status: false, message: "Input search!" });
    try {
        const response = await axios.get(`https://api.nexray.eu.cc/search/tiktok?q=${encodeURIComponent(search)}`);
        res.json({ status: true, creator: "KaaaOffc", result: response.data });
    } catch (e) { res.json({ status: false }); }
});

// --- AUTH LOGIC ---
app.post('/auth/login', async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
    await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'Cloud Verification', html: `<b>Your OTP: ${otp}</b>` });
    res.redirect('/verify?email=' + email);
});

app.get('/verify', (req, res) => res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;color:white;font-family:sans-serif;"><form action="/auth/verify" method="POST" style="background:#0f172a;padding:50px;border-radius:40px;border:1px solid #38bdf8;text-align:center;"> <h2 style="font-weight:900;margin-bottom:20px;">VERIFY OTP</h2> <input name="email" type="hidden" value="'+req.query.email+'"> <input name="otp" type="text" placeholder="6 Digit Code" style="padding:15px;border-radius:10px;text-align:center;width:100%;"><br><button type="submit" style="background:#38bdf8;margin-top:20px;padding:15px 40px;font-weight:900;border-radius:10px;width:100%;">VALIDATE</button></form></body>'));

app.post('/auth/verify', async (req, res) => {
    await connectDB();
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (user) {
        res.cookie('userEmail', email, { maxAge: 86400000 });
        res.redirect('/');
    } else res.send("Invalid OTP!");
});

app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
