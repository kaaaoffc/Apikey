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

// --- DATABASE CONNECTION (Anti-Crash) ---
const MONGO_URI = "mongodb+srv://eka710231_db_user:kaaacloud@cluster0.6ssgy30.mongodb.net/?appName=Cluster0";
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
    } catch (err) { console.error("DB Error:", err); }
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

// --- FEATURE: QR CODE GENERATOR ---
app.get('/tools/qrcode', async (req, res) => {
    const text = req.query.text;
    if (!text) return res.send("Contoh: /tools/qrcode?text=woi");
    try {
        const qr = await QRCode.toDataURL(text);
        res.send(`
        <body style="background:#020617;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
            <div style="background:white;padding:20px;border-radius:30px;box-shadow:0 10px 40px rgba(56,189,248,0.4);">
                <img src="${qr}" width="250">
            </div>
            <p style="color:#38bdf8;margin-top:20px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">QR: ${text}</p>
        </body>`);
    } catch (e) { res.status(500).send("Crash"); }
});

// --- DASHBOARD UI ---
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
    <body class="p-6">
        <div class="max-w-4xl mx-auto">
            <header class="flex justify-between items-center mb-10">
                <h1 class="text-2xl font-black text-sky-400 italic">KAAA<span class="text-white">OFFC</span></h1>
                <div class="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center font-bold text-slate-900 uppercase">K</div>
            </header>
            
            <div class="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[35px] mb-8">
                <p class="text-[10px] font-black text-emerald-400 mb-4 tracking-[0.2em] text-center uppercase">Jadwal Sholat Jakarta</p>
                <div class="grid grid-cols-5 gap-2 text-center text-[10px]">
                    <div>SUBUH<p class="text-emerald-400 font-black text-sm">${sholat.subuh}</p></div>
                    <div>DZUHUR<p class="text-emerald-400 font-black text-sm">${sholat.dzuhur}</p></div>
                    <div>ASHAR<p class="text-emerald-400 font-black text-sm">${sholat.ashar}</p></div>
                    <div>MAGHRIB<p class="text-emerald-400 font-black text-sm">${sholat.maghrib}</p></div>
                    <div>ISYA<p class="text-emerald-400 font-black text-sm">${sholat.isya}</p></div>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 text-center">
                <div class="bg-slate-900/40 p-6 rounded-[30px] border border-white/5">
                    <p class="text-3xl font-black text-sky-400">${stats.total_req.toLocaleString()}</p>
                    <p class="text-[10px] text-slate-500 uppercase mt-1 font-bold">Total Requests</p>
                </div>
                <div class="bg-slate-900/40 p-6 rounded-[30px] border border-white/5">
                    <p class="text-3xl font-black text-white">48.91 GB</p>
                    <p class="text-[10px] text-slate-500 uppercase mt-1 font-bold">RAM Usage</p>
                </div>
                <div class="bg-slate-900/40 p-6 rounded-[30px] border border-white/5">
                    <p class="text-3xl font-black text-emerald-400 uppercase">Online</p>
                    <p class="text-[10px] text-slate-500 uppercase mt-1 font-bold">API Service</p>
                </div>
            </div>

            <div class="bg-slate-900/40 p-6 rounded-[30px] border border-white/5">
                <h2 class="text-xs font-black text-sky-400 uppercase mb-4 tracking-widest">Live Traffic Log</h2>
                <div class="space-y-2">
                    ${logs.map(l => `<div class="flex justify-between text-[11px] font-mono border-b border-white/5 pb-2">
                        <span><b class="text-sky-400">${l.method}</b> ${l.path}</span>
                        <span class="text-slate-500 font-bold">${new Date(l.timestamp).toLocaleTimeString()}</span>
                    </div>`).join('')}
                </div>
            </div>
        </div>
    </body></html>`);
});

// --- AUTH SYSTEM (Login & Verify) ---
app.get('/login', (req, res) => {
    res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;background:#0f172a;padding:50px;border-radius:40px;border:1px solid #38bdf8;"><h1 style="color:#38bdf8;margin-bottom:30px;">KAAA LOGIN</h1><form action="/auth/login" method="POST"><input name="email" type="email" placeholder="Email" style="padding:15px;border-radius:10px;border:none;margin-bottom:10px;width:100%;"><br><input name="password" type="password" placeholder="Password" style="padding:15px;border-radius:10px;border:none;margin-bottom:20px;width:100%;"><br><button type="submit" style="background:#38bdf8;padding:15px 40px;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">GET OTP</button></form></div></body>');
});

app.post('/auth/login', async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
        const resend = new Resend("re_Y3DfKKCM_7rJCyA3V1JHoxUNxQ2sc7Fb1");
        await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'Verification', html: `<b>OTP: ${otp}</b>` });
        res.redirect('/verify?email=' + encodeURIComponent(email));
    } catch (e) { res.send(e.message); }
});

app.get('/verify', (req, res) => {
    res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;"><form action="/auth/verify" method="POST" style="text-align:center;"><h2 style="color:white;font-family:sans-serif;">ENTER OTP</h2><input name="email" type="hidden" value="'+req.query.email+'"><input name="otp" type="text" style="padding:15px;border-radius:10px;text-align:center;letter-spacing:5px;"><br><button type="submit" style="background:#38bdf8;padding:10px 30px;margin-top:15px;border-radius:10px;font-weight:bold;cursor:pointer;">VERIFY NOW</button></form></body>');
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
