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

// --- DATABASE & API CONFIG ---
const MONGO_URI = "mongodb+srv://eka710231_db_user:kaaacloud@cluster0.6ssgy30.mongodb.net/?appName=Cluster0";
const RESEND_KEY = "re_Y3DfKKCM_7rJCyA3V1JHoxUNxQ2sc7Fb1";
const resend = new Resend(RESEND_KEY);

let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
    } catch (err) { console.error("Koneksi DB Gagal:", err); }
};

// --- MODELS ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ 
    email: String, password: String, otp: String, isVerified: Boolean, lastActive: Date 
}));
const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({ 
    method: String, path: String, timestamp: { type: Date, default: Date.now } 
}));
const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({ 
    name: String, total_req: Number 
}));

// --- TOOL: QR CODE GENERATOR ---
app.get('/tools/qrcode', async (req, res) => {
    const text = req.query.text;
    if (!text) return res.send("Masukkan query text. Contoh: /tools/qrcode?text=KaaaOffc");
    try {
        const qr = await QRCode.toDataURL(text);
        res.send(`
        <body style="background:#020617;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
            <div style="background:white;padding:20px;border-radius:35px;box-shadow:0 10px 50px rgba(56,189,248,0.4);">
                <img src="${qr}" width="250">
            </div>
            <p style="color:#38bdf8;margin-top:20px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">QR Content: ${text}</p>
            <a href="/" style="color:#64748b;text-decoration:none;font-size:12px;margin-top:10px;">Kembali ke Dashboard</a>
        </body>`);
    } catch (e) { res.status(500).send("Gagal generate QR."); }
});

// --- DASHBOARD UTAMA ---
app.get('/', async (req, res) => {
    await connectDB();
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');

    const stats = await Stats.findOne({ name: "main" }) || { total_req: 105902 }; 
    const logs = await Log.find().sort({ timestamp: -1 }).limit(10);
    
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
    <style>body{background:#020617;color:white;font-family:sans-serif;}</style></head>
    <body class="p-6 pb-20">
        <div class="max-w-4xl mx-auto">
            <header class="flex justify-between items-center mb-10">
                <h1 class="text-2xl font-black text-sky-400 italic">KAAA<span class="text-white">CLOUD</span></h1>
                <div class="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center font-bold text-slate-900">K</div>
            </header>
            
            <div class="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[35px] mb-8">
                <p class="text-[10px] font-black text-emerald-400 mb-4 tracking-[0.3em] text-center uppercase"><i class="fas fa-mosque mr-2"></i> Jadwal Sholat Jakarta</p>
                <div class="grid grid-cols-5 gap-2 text-center text-[10px]">
                    <div>SUBUH<p class="text-emerald-400 font-black text-sm">${sholat.subuh}</p></div>
                    <div>DZUHUR<p class="text-emerald-400 font-black text-sm">${sholat.dzuhur}</p></div>
                    <div>ASHAR<p class="text-emerald-400 font-black text-sm">${sholat.ashar}</p></div>
                    <div>MAGHRIB<p class="text-emerald-400 font-black text-sm">${sholat.maghrib}</p></div>
                    <div>ISYA<p class="text-emerald-400 font-black text-sm">${sholat.isya}</p></div>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10 text-center">
                <div class="bg-slate-900/40 p-8 rounded-[40px] border border-white/5">
                    <p class="text-4xl font-black text-sky-400">${stats.total_req.toLocaleString()}</p>
                    <p class="text-[10px] text-slate-500 uppercase mt-2 font-bold tracking-widest">Total Requests</p>
                </div>
                <div class="bg-slate-900/40 p-8 rounded-[40px] border border-white/5">
                    <p class="text-4xl font-black text-white">48.91 GB</p>
                    <p class="text-[10px] text-slate-500 uppercase mt-2 font-bold tracking-widest">Memory Usage</p>
                </div>
                <div class="bg-slate-900/40 p-8 rounded-[40px] border border-white/5">
                    <p class="text-4xl font-black text-emerald-400">ONLINE</p>
                    <p class="text-[10px] text-slate-500 uppercase mt-2 font-bold tracking-widest">System Status</p>
                </div>
            </div>

            <div class="bg-slate-900/40 p-8 rounded-[40px] border border-white/5">
                <h2 class="text-xs font-black text-sky-400 uppercase mb-6 tracking-widest">Live Traffic Monitor</h2>
                <div class="space-y-3">
                    ${logs.map(l => `<div class="flex justify-between text-[11px] font-mono border-b border-white/5 pb-3">
                        <span><b class="text-sky-400">${l.method}</b> ${l.path}</span>
                        <span class="text-slate-500 font-bold">${new Date(l.timestamp).toLocaleTimeString()}</span>
                    </div>`).join('')}
                </div>
            </div>

            <div class="mt-8 p-6 bg-white/5 rounded-3xl flex justify-between items-center border border-white/5">
                <div>
                    <p class="text-xs font-black text-sky-400 uppercase">Tool: QR Generator</p>
                    <p class="text-[10px] text-slate-500 font-mono">/tools/qrcode?text=teks_lo</p>
                </div>
                <a href="/tools/qrcode?text=woi" class="bg-sky-500 text-slate-900 px-6 py-2 rounded-xl font-black text-xs">TEST TOOL</a>
            </div>
        </div>
    </body></html>`);
});

// --- AUTH SYSTEM (OTP & LOGIN) ---
app.get('/login', (req, res) => {
    res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;background:#0f172a;padding:60px;border-radius:50px;border:1px solid #38bdf8;box-shadow:0 0 50px rgba(56,189,248,0.1);"><h1 style="color:#38bdf8;font-weight:900;margin-bottom:40px;font-style:italic;">KAAA CLOUD</h1><form action="/auth/login" method="POST"><input name="email" type="email" placeholder="Your Email" style="padding:15px;border-radius:15px;border:none;margin-bottom:15px;width:100%;background:#1e293b;color:white;"><br><input name="password" type="password" placeholder="Password" style="padding:15px;border-radius:15px;border:none;margin-bottom:25px;width:100%;background:#1e293b;color:white;"><br><button type="submit" style="background:#38bdf8;padding:15px 50px;border:none;border-radius:15px;font-weight:900;cursor:pointer;color:#020617;width:100%;">REQUEST OTP</button></form></div></body>');
});

app.post('/auth/login', async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
        await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'Login Verification', html: `<b>Your OTP: ${otp}</b>` });
        res.redirect('/verify?email=' + encodeURIComponent(email));
    } catch (e) { res.send("Gagal kirim email: " + e.message); }
});

app.get('/verify', (req, res) => {
    res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><form action="/auth/verify" method="POST" style="text-align:center;"><h2 style="color:white;margin-bottom:20px;">ENTER CODE</h2><input name="email" type="hidden" value="'+req.query.email+'"><input name="otp" type="text" style="padding:20px;border-radius:20px;text-align:center;font-size:24px;font-weight:900;letter-spacing:8px;border:none;background:#1e293b;color:#38bdf8;width:250px;"><br><button type="submit" style="background:#38bdf8;padding:15px 40px;margin-top:20px;border-radius:15px;font-weight:900;cursor:pointer;border:none;">VERIFY</button></form></body>');
});

app.post('/auth/verify', async (req, res) => {
    await connectDB();
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (user) {
        await User.updateOne({ email }, { isVerified: true, lastActive: new Date() });
        res.cookie('userEmail', email, { maxAge: 86400000, httpOnly: true });
        res.redirect('/');
    } else { res.send("OTP Salah!"); }
});

module.exports = app;
