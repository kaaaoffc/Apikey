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

// --- MODELS & AUTH (SAMA KAYAK SEBELUMNYA) ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ email: { type: String, unique: true }, password: String, otp: String, isVerified: { type: Boolean, default: false } }));
const Stats = mongoose.models.Stats || mongoose.model('Stats', new mongoose.Schema({ name: { type: String, default: "main" }, total_req: { type: Number, default: 0 } }));

const checkAuth = async (req, res, next) => {
    const email = req.cookies.userEmail;
    if (!email) return res.redirect('/login');
    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.redirect('/login');
    next();
};

// --- LOGIN & VERIFY ROUTES (DIPERSINGKAT) ---
app.get('/login', (req, res) => { res.send(''); }); // Copy dari kode sebelumnya
app.post('/auth/login', async (req, res) => { /* Logic Kirim OTP */ });
app.get('/verify', (req, res) => { /* Form Input OTP */ });
app.post('/auth/verify', async (req, res) => { /* Logic Cek OTP */ });

// --- DASHBOARD UTAMA DENGAN PASTEBIN ---
app.get('/', checkAuth, async (req, res) => {
    const totalUser = await User.countDocuments({ isVerified: true });
    const statData = await Stats.findOne({ name: "main" }) || { total_req: 0 };
    const domain = req.get('host');

    res.send(`<!DOCTYPE html><html lang="id"><head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <title>KaaaCloud Pastebin</title>
        <style>
            body { background: #020617; color: white; font-family: 'Inter', sans-serif; }
            .sidebar { transition: 0.3s; width: 0; overflow: hidden; position: fixed; height: 100vh; background: rgba(15, 23, 42, 0.98); z-index: 100; border-right: 1px solid #38bdf822; }
            .sidebar.active { width: 280px; }
            .glass { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
            pre { background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid #1e293b; color: #38bdf8; font-size: 11px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <div id="mySidebar" class="sidebar">
            <div class="p-6">
                <h2 class="text-sky-400 font-black mb-8">KAAA MENU</h2>
                <div class="space-y-2">
                    <button onclick="switchTab('home')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10"><i class="fas fa-home mr-3"></i> Home</button>
                    <button onclick="switchTab('pterodactyl')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10"><i class="fas fa-server mr-3"></i> Pterodactyl</button>
                    <button onclick="switchTab('pastebin')" class="w-full text-left p-4 rounded-xl hover:bg-sky-500/10"><i class="fas fa-code mr-3"></i> Code Pastebin</button>
                </div>
            </div>
        </div>

        <div class="p-6 max-w-5xl mx-auto">
            <nav class="flex justify-between items-center mb-10">
                <button onclick="toggleSidebar()" class="p-3 bg-sky-500/10 rounded-xl"><i class="fas fa-bars text-sky-400"></i></button>
                <h1 class="font-black italic">KAAA<span class="text-sky-400">CLOUD</span></h1>
                <div class="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-sky-500/20"><i class="fas fa-user text-xs"></i></div>
            </nav>

            <div id="tab-home" class="tab-content text-center">
                <div class="glass p-10 rounded-[2.5rem]">
                    <h2 class="text-3xl font-black mb-4">STATS</h2>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-4 bg-black/20 rounded-2xl"><p class="text-sky-400 font-bold">${totalUser}</p><p class="text-[10px]">USERS</p></div>
                        <div class="p-4 bg-black/20 rounded-2xl"><p class="text-indigo-400 font-bold">${statData.total_req}</p><p class="text-[10px]">HITS</p></div>
                    </div>
                </div>
            </div>

            <div id="tab-pastebin" class="tab-content hidden">
                <h2 class="text-2xl font-black italic mb-6"><i class="fas fa-paste mr-3 text-sky-400"></i>PASTEBIN LIST</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="glass p-6 rounded-[2rem]">
                        <div class="flex justify-between items-center mb-4">
                            <span class="bg-sky-500/20 text-sky-400 text-[10px] px-3 py-1 rounded-full font-bold">API COMMAND</span>
                        </div>
                        <h3 class="font-bold mb-2">TikTok Search API</h3>
                        <pre id="code-tiktok">https://${domain}/search/tiktok?q=query</pre>
                        <button onclick="copyCode('code-tiktok')" class="w-full mt-4 bg-sky-500 text-slate-900 font-bold py-3 rounded-xl hover:bg-sky-400 transition-all"><i class="fas fa-copy mr-2"></i> COPY COMMAND</button>
                    </div>

                    <div class="glass p-6 rounded-[2rem]">
                        <div class="flex justify-between items-center mb-4">
                            <span class="bg-indigo-500/20 text-indigo-400 text-[10px] px-3 py-1 rounded-full font-bold">API COMMAND</span>
                        </div>
                        <h3 class="font-bold mb-2">Gemini AI API</h3>
                        <pre id="code-gemini">https://${domain}/ai/gemini?text=halo</pre>
                        <button onclick="copyCode('code-gemini')" class="w-full mt-4 bg-sky-500 text-slate-900 font-bold py-3 rounded-xl hover:bg-sky-400 transition-all"><i class="fas fa-copy mr-2"></i> COPY COMMAND</button>
                    </div>

                    <div class="glass p-6 rounded-[2rem]">
                        <div class="flex justify-between items-center mb-4">
                            <span class="bg-emerald-500/20 text-emerald-400 text-[10px] px-3 py-1 rounded-full font-bold">NODE.JS SCRIPT</span>
                        </div>
                        <h3 class="font-bold mb-2">Simple Request Script</h3>
                        <pre id="code-script">const axios = require('axios');
axios.get('https://${domain}/ai/gemini?text=hi')
  .then(res => console.log(res.data));</pre>
                        <button onclick="copyCode('code-script')" class="w-full mt-4 bg-emerald-500 text-slate-900 font-bold py-3 rounded-xl hover:bg-emerald-400 transition-all"><i class="fas fa-copy mr-2"></i> COPY SCRIPT</button>
                    </div>
                </div>
            </div>

            <div id="tab-pterodactyl" class="tab-content hidden">
                <h2 class="text-center font-black">PTERODACTYL SHOP</h2>
                <a href="${TELE_ORDER}" class="block glass p-6 mt-4 text-center rounded-2xl">Order via Bot</a>
            </div>
        </div>

        <script>
            function toggleSidebar() { document.getElementById("mySidebar").classList.toggle("active"); }
            function switchTab(id) {
                document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
                document.getElementById('tab-'+id).classList.remove('hidden');
                toggleSidebar();
            }
            function copyCode(id) {
                const text = document.getElementById(id).innerText;
                navigator.clipboard.writeText(text);
                alert("Berhasil disalin ke clipboard!");
            }
        </script>
    </body></html>`);
});

// --- API ENDPOINTS (SAMA KAYAK SEBELUMNYA) ---
app.get('/search/tiktok', checkAuth, async (req, res) => { /* ... */ });
app.get('/ai/gemini', checkAuth, async (req, res) => { /* ... */ });

module.exports = app;
