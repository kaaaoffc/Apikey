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
const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
    } catch (err) { console.error("DB Error:", err); }
};

const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ 
    email: String, password: String, otp: String, isVerified: Boolean, lastActive: Date 
}));
const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({ 
    method: String, path: String, timestamp: { type: Date, default: Date.now } 
}));
const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({ 
    name: String, total_req: Number 
}));

// TOOL: QR GENERATOR
app.get('/tools/qrcode', async (req, res) => {
    const text = req.query.text;
    if (!text) return res.send("Contoh: /tools/qrcode?text=KaaaOffc");
    try {
        const qr = await QRCode.toDataURL(text);
        res.send(`<body style="background:#020617;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;"><div style="background:white;padding:25px;border-radius:40px;"><img src="${qr}" width="260"></div><p style="color:#38bdf8;margin-top:25px;font-weight:900;text-transform:uppercase;letter-spacing:3px;">DATA: ${text}</p></body>`);
    } catch (e) { res.status(500).send("Crash"); }
});

// DASHBOARD UI
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

    res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><style>body{background:#020617;color:white;font-family:sans-serif;}</style></head><body class="p-6">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-2xl font-black text-sky-400 italic mb-8">KAAA<span class="text-white">OFFC</span></h1>
            <div class="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[35px] mb-8 text-center grid grid-cols-5 gap-2 text-[10px]">
                <div>SUBUH<p class="text-emerald-400 font-black text-sm">${sholat.subuh}</p></div>
                <div>DZUHUR<p class="text-emerald-400 font-black text-sm">${sholat.dzuhur}</p></div>
                <div>ASHAR<p class="text-emerald-400 font-black text-sm">${sholat.ashar}</p></div>
                <div>MAGHRIB<p class="text-emerald-400 font-black text-sm">${sholat.maghrib}</p></div>
                <div>ISYA<p class="text-emerald-400 font-black text-sm">${sholat.isya}</p></div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10 text-center">
                <div class="bg-slate-900/50 p-8 rounded-[40px] border border-white/5"><p class="text-4xl font-black text-sky-400">${stats.total_req.toLocaleString()}</p><p class="text-[10px] text-slate-500 uppercase mt-2">Requests</p></div>
                <div class="bg-slate-900/50 p-8 rounded-[40px] border border-white/5"><p class="text-4xl font-black text-white">48.91 GB</p><p class="text-[10px] text-slate-500 uppercase mt-2">RAM Usage</p></div>
                <div class="bg-slate-900/50 p-8 rounded-[40px] border border-white/5"><p class="text-4xl font-black text-emerald-400">ONLINE</p><p class="text-[10px] text-slate-500 uppercase mt-2">Status</p></div>
            </div>
            <div class="bg-slate-900/50 p-8 rounded-[40px] border border-white/5">
                <h2 class="text-xs font-black text-sky-400 uppercase mb-6">Traffic Log</h2>
                <div class="space-y-3">
                    ${logs.map(l => `<div class="flex justify-between text-[11px] font-mono border-b border-white/5 pb-3"><span><b class="text-sky-400">${l.method}</b> ${l.path}</span><span>${new Date(l.timestamp).toLocaleTimeString()}</span></div>`).join('')}
                </div>
            </div>
        </div></body></html>`);
});

// AUTH
app.get('/login', (req, res) => res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><form action="/auth/login" method="POST" style="background:#0f172a;padding:50px;border-radius:40px;border:1px solid #38bdf8;"><h2 style="color:#38bdf8;">KAAA LOGIN</h2><input name="email" type="email" placeholder="Email" style="padding:15px;margin-bottom:10px;width:100%;"><br><input name="password" type="password" placeholder="Pass" style="padding:15px;margin-bottom:20px;width:100%;"><br><button type="submit" style="background:#38bdf8;width:100%;padding:15px;font-weight:900;">GET OTP</button></form></body>'));
app.post('/auth/login', async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await User.findOneAndUpdate({ email }, { password, otp, isVerified: false }, { upsert: true });
        await resend.emails.send({ from: 'KaaaCloud <code@kaaaoffc.web.id>', to: email, subject: 'Login OTP', html: `<b>OTP: ${otp}</b>` });
        res.redirect('/verify?email=' + encodeURIComponent(email));
    } catch (e) { res.send(e.message); }
});
app.get('/verify', (req, res) => res.send('<body style="background:#020617;display:flex;align-items:center;justify-content:center;height:100vh;color:white;"><form action="/auth/verify" method="POST"><input name="email" type="hidden" value="'+req.query.email+'">OTP: <input name="otp" type="text"><button type="submit">VERIFY</button></form></body>'));
app.post('/auth/verify', async (req, res) => {
    await connectDB();
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (user) {
        res.cookie('userEmail', email, { maxAge: 86400000 });
        res.redirect('/');
    } else { res.send("Salah!"); }
});

module.exports = app;
