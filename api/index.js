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

// --- SCHEMA ---
const userSchema = new mongoose.Schema({ 
    email: String, password: String, otp: String, isVerified: Boolean, createdAt: { type: Date, default: Date.now } 
});
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({ method: String, path: String, timestamp: { type: Date, default: Date.now } }));
const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({ name: String, total_req: Number }));

// --- TOOLS: QR CODE ---
app.get('/tools/qrcode', async (req, res) => {
    const text = req.query.text;
    if (!text) return res.send("Contoh: /tools/qrcode?text=Kaaa");
    const qr = await QRCode.toDataURL(text);
    res.send(`<body style="background:#020617;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="background:white;padding:25px;border-radius:40px;"><img src="${qr}" width="250"></div><p style="color:#38bdf8;margin-top:20px;font-family:sans-serif;font-weight:900;">${text}</p></body>`);
});

// --- DASHBOARD ---
app.get('/', async (req, res) => {
    await connectDB();
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');

    const userData = await User.findOne({ email });
    const stats = await Stats.findOne({ name: "main" }) || { total_req: 105902 };
    const logs = await Log.find().sort({ timestamp: -1 }).limit(8);
    
    let sholat = { subuh: "-", dzuhur: "-", ashar: "-", maghrib: "-", isya: "-" };
    try {
        const d = new Date().toISOString().split('T')[0].split('-').join('/');
        const r = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/1301/${d}`);
        sholat = r.data.data.jadwal;
    } catch (e) {}

    res.send(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background: #020617; color: white; font-family: 'Inter', sans-serif; overflow-x: hidden; }
        .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); }
        .sidebar { transition: 0.3s; transform: translateX(-100%); }
        .sidebar.active { transform: translateX(0); }
        .modal { display: none; }
        .modal.active { display: flex; }
    </style></head>
    <body>
        <div id="sidebar" class="sidebar fixed top-0 left-0 w-64 h-full glass z-50 p-6 flex flex-col">
            <div class="flex justify-between items-center mb-10">
                <h2 class="text-sky-400 font-black italic">MENU</h2>
                <button onclick="toggleSidebar()"><i class="fas fa-times text-xl"></i></button>
            </div>
            <nav class="space-y-4">
                <a href="/" class="block p-3 rounded-xl hover:bg-sky-500/20 text-sky-400"><i class="fas fa-home mr-3"></i> Dashboard</a>
                <a href="/tools/qrcode?text=Kaaa" class="block p-3 rounded-xl hover:bg-sky-500/20"><i class="fas fa-qrcode mr-3"></i> QR Generator</a>
                <a href="/logout" class="block p-3 rounded-xl hover:bg-red-500/20 text-red-400"><i class="fas fa-sign-out-alt mr-3"></i> Logout</a>
            </nav>
        </div>

        <div class="p-6 max-w-4xl mx-auto">
            <header class="flex justify-between items-center mb-8">
                <button onclick="toggleSidebar()" class="text-2xl text-sky-400"><i class="fas fa-bars"></i></button>
                <h1 class="text-xl font-black italic tracking-tighter">KAAA<span class="text-sky-400">CLOUD</span></h1>
                <button onclick="toggleModal()" class="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center font-bold text-slate-900 border-2 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)]">
                    ${email.charAt(0).toUpperCase()}
                </button>
            </header>

            <div class="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-[30px] mb-8 text-center">
                <div class="grid grid-cols-5 gap-1 text-[10px] font-bold">
                    <div>SUBUH<p class="text-emerald-400 text-sm">${sholat.subuh}</p></div>
                    <div>DZUHUR<p class="text-emerald-400 text-sm">${sholat.dzuhur}</p></div>
                    <div>ASHAR<p class="text-emerald-400 text-sm">${sholat.ashar}</p></div>
                    <div>MAGHRIB<p class="text-emerald-400 text-sm">${sholat.maghrib}</p></div>
                    <div>ISYA<p class="text-emerald-400 text-sm">${sholat.isya}</p></div>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div class="glass p-6 rounded-[35px] text-center">
                    <p class="text-3xl font-black text-sky-400">${stats.total_req.toLocaleString()}</p>
                    <p class="text-[10px] text-slate-500 uppercase font-bold mt-1">Requests</p>
                </div>
                <div class="glass p-6 rounded-[35px] text-center">
                    <p class="text-3xl font-black text-white">48.91 GB</p>
                    <p class="text-[10px] text-slate-500 uppercase font-bold mt-1">Memory</p>
                </div>
                <div class="glass p-6 rounded-[35px] text-center hidden md:block">
                    <p class="text-3xl font-black text-emerald-400">ONLINE</p>
                    <p class="text-[10px] text-slate-500 uppercase font-bold mt-1">Status</p>
                </div>
            </div>

            <div class="glass p-6 rounded-[35px]">
                <h3 class="text-xs font-black text-sky-400 mb-4 tracking-widest uppercase">Live Activity Log</h3>
                <div class="space-y-3">
                    ${logs.map(l => `<div class="flex justify-between text-[11px] font-mono border-b border-white/5 pb-2">
                        <span><b class="text-sky-400">${l.method}</b> ${l.path}</span>
                        <span class="text-slate-500">${new Date(l.timestamp).toLocaleTimeString()}</span>
                    </div>`).join('')}
                </div>
            </div>
        </div>

        <div id="accModal" class="modal fixed inset-0 z-[60] bg-black/80 items-center justify-center p-6">
            <div class="glass w-full max-w-sm rounded-[40px] p-8 border border-sky-500/30 relative">
                <button onclick="toggleModal()" class="absolute top-6 right-6 text-slate-500"><i class="fas fa-times"></i></button>
                <div class="text-center mb-6">
                    <div class="w-20 h-20 rounded-full bg-sky-500 mx-auto flex items-center justify-center text-3xl font-black text-slate-900 mb-4 border-4 border-sky-400/20">
                        ${email.charAt(0).toUpperCase()}
                    </div>
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter">User Info</h2>
                </div>
                <div class="space-y-4 text-sm">
                    <div class="bg-white/5 p-4 rounded-2xl">
                        <p class="text-[10px] text-sky-400 font-bold uppercase mb-1">Email Address</p>
                        <p class="font-mono">${userData.email}</p>
                    </div>
                    <div class="bg-white/5 p-4 rounded-2xl">
                        <p class="text-[10px] text-sky-400 font-bold uppercase mb-1">Password</p>
                        <p class="font-mono tracking-widest">${userData.password.replace(/./g, '*')}</p>
                    </div>
                    <div class="bg-white/5 p-4 rounded-2xl">
                        <p class="text-[10px] text-sky-400 font-bold uppercase mb-1">Account Created</p>
                        <p class="font-mono text-[12px]">${new Date(userData.createdAt).toLocaleString('id-ID')}</p>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }
            function toggleModal() { document.getElementById('accModal').classList.toggle('active'); }
        </script>
    </body></html>`);
});

// --- AUTH (Sama kayak lama tapi tetep gw tulis lengkap asu) ---
app.get('/login', (req, res) => {
    res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;background:#0f172a;padding:50px;border-radius:40px;border:1px solid #38bdf8;"><h1 style="color:#38bdf8;font-weight:900;margin-bottom:30px;">KAAA CLOUD</h1><form action="/auth/login" method="POST"><input name="email" type="email" placeholder="Email" style="padding:15px;border-radius:10px;border:none;margin-bottom:10px;width:100%;"><br><input name="password" type="password" placeholder="Pass" style="padding:15px;border-radius:10px;border:none;margin-bottom:20px;width:100%;"><br><button type="submit" style="background:#38bdf8;padding:15px;width:100%;border-radius:10px;font-weight:900;">GET OTP</button></form></div></body>');
});

app.post('/auth/login', async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
    await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'OTP', html: `<b>OTP: ${otp}</b>` });
    res.redirect('/verify?email=' + email);
});

app.get('/verify', (req, res) => {
    res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;"><form action="/auth/verify" method="POST" style="text-align:center;"><input name="email" type="hidden" value="'+req.query.email+'"><input name="otp" type="text" placeholder="OTP" style="padding:15px;border-radius:10px;"><br><button type="submit" style="background:#38bdf8;padding:10px 40px;margin-top:10px;border-radius:10px;font-weight:900;">VERIFY</button></form></body>');
});

app.post('/auth/verify', async (req, res) => {
    await connectDB();
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (user) {
        await User.updateOne({ email }, { isVerified: true });
        res.cookie('userEmail', email, { maxAge: 86400000 });
        res.redirect('/');
    } else res.send("Salah asu!");
});

app.get('/logout', (req, res) => { res.clearCookie('userEmail'); res.redirect('/login'); });

module.exports = app;
