const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();


app.use(cors());

// 1. Verifikasi Google Search Console
app.get('/google1686cc7569ac1633.html', (req, res) => {
    res.send('google-site-verification: google1686cc7569ac1633.html');
});

// 2. Dashboard Utama
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kaaaoffc API - Ultimate</title>
        <style>
            body { margin: 0; padding: 0; font-family: sans-serif; background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://files.catbox.moe/jh1sff.jpg'); background-size: cover; background-position: center; background-attachment: fixed; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center; }
            .container { background: rgba(255, 255, 255, 0.1); padding: 40px; border-radius: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); }
            #clock { font-size: 3em; font-weight: bold; margin: 10px 0; font-family: monospace; }
            .btn { display: inline-block; margin: 10px; padding: 12px 30px; background: #00d2ff; color: white; text-decoration: none; border-radius: 50px; font-weight: bold; transition: 0.3s; }
            .btn:hover { background: #008fb3; transform: scale(1.05); }
        </style>
    </head>
    <body onclick="document.getElementById('audio').play()">
        <audio id="audio" loop><source src="https://files.catbox.moe/x5d0fh.mp3" type="audio/mpeg"></audio>
        <div class="container">
            <h1>Kaaaoffc API</h1>
            <div id="clock">00:00:00</div>
            <p id="date">Memuat...</p>
            <a href="/docs" class="btn">DOKUMENTASI API</a>
        </div>
        <script>
            function update() {
                const n = new Date();
                document.getElementById('clock').innerHTML = n.toLocaleTimeString('id-ID');
                document.getElementById('date').innerHTML = n.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }
            setInterval(update, 1000);
        </script>
    </body>
    </html>`);
});

// 3. Halaman Dokumentasi (Docs)
app.get('/docs', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Docs - Kaaaoffc API</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { background: #0f172a; color: #cbd5e1; font-family: monospace; padding: 20px; line-height: 1.6; }
            .card { background: #1e293b; padding: 15px; border-radius: 12px; margin-bottom: 20px; border-left: 5px solid #38bdf8; }
            h2 { color: #38bdf8; margin-top: 0; }
            code { background: #000; padding: 4px 8px; border-radius: 5px; color: #f472b6; }
            a { color: #38bdf8; text-decoration: none; }
        </style>
    </head>
    <body>
        <h1>📚 Dokumentasi Kaaaoffc API</h1>
        
        <div class="card">
            <h2>🤖 Artificial Intelligence</h2>
            <p>Gemini AI: <code>/ai/gemini?text=halo</code></p>
        </div>

        <div class="card">
            <h2>📱 Social Media Search</h2>
            <p>TikTok Search: <code>/search/tiktok?q=sewates konco</code></p>
             <p>YouTube Search: <code>/search/youtube?q=sewates konco</code></p>
        </div>

        <div class="card">
            <h2>🕌 MyQuran Service</h2>
            <p>Cari Kota: <code>/cari/kota/kediri</code></p>
            <p>Jadwal Sholat: <code>/sholat/1301</code></p>
        </div>
        
         <div class="card">
            <h2>🌊 ANIME  Search</h2>
            <p>Anime Search: <code>/search/anime/komiku/search?q=Judul</code></p>
             <p>Anime Search: <code>/search/youtube?q=Jadul</code></p>
        </div>
        
          <div class="card">
            <h2>ℹ️ INFORMASI </h2>
            <p>🫨 Informasi gempa: <code>/information/gempa</code></p>
             <p>⛅ informasi Cuaca: <code>/information/cuaca?kota=/</code></p>
        </div>
        
        

        <a href="/">← Kembali ke Beranda</a>
    </body>
    </html>`);
});

// 4. API Endpoint - Gemini AI (via NexRay)
app.get('/ai/gemini', async (req, res) => {
    const text = req.query.text;
    if (!text) return res.json({ status: false, message: "Contoh: /ai/gemini?text=halo" });
    try {
        const response = await axios.get(`https://api.nexray.web.id/ai/gemini?text=${encodeURIComponent(text)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: response.data.result });
    } catch (e) { res.json({ status: false, error: "API AI Error" }); }
});

// 5. API Endpoint - TikTok Search (via NexRay)
app.get('/search/tiktok', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, message: "Contoh: /search/tiktok?q=sewates konco" });
    try {
        const response = await axios.get(`https://api.nexray.web.id/search/tiktok?q=${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: response.data.result });
    } catch (e) { res.json({ status: false, error: "TikTok Search Error" }); }
});

// 6. API Endpoint - MyQuran
app.get('/cari/kota/:nama', async (req, res) => {
    try {
        const r = await axios.get(`https://api.myquran.com/v2/sholat/kota/cari/${req.params.nama}`);
        res.json(r.data);
    } catch (e) { res.json({ status: false, error: "Gagal cari kota" }); }
});

app.get('/sholat/:id', async (req, res) => {
    try {
        const d = new Date();
        const tgl = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
        const r = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/${req.params.id}/${tgl}`);
        res.json(r.data);
    } catch (e) { res.json({ status: false, error: "Gagal ambil jadwal" }); }
});

app.get('/search/youtube', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, message: "Contoh: /search/youtube?q=sewates konco" });
    try {
        const response = await axios.get(`https://api.nexray.web.id/search/youtube?q=${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: response.data.result });
    } catch (e) { res.json({ status: false, error: "Youtube Search Error" }); }
});

app.get('/search/anime/komiku/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, message: "Contoh: /search/anime/komiku/search?q=Judul" });
    try {
        const response = await axios.get(`https://api.nexray.web.id/search/anime/komiku/search  ?q=${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: response.data.result });
    } catch (e) { res.json({ status: false, error: "Anime Search Error" }); }
});

app.get('/information/gempa', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, message: "Contoh: /search/yout" });
    try {
        const response = await axios.get(`https://api.nexray.web.id/information/gempa${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: response.data.result });
    } catch (e) { res.json({ status: false, error: "Info gempa Error" }); }
});

app.get('/information/cuaca', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, message: "Contoh: /information/cuaca?kota=Jakarta" });
    try {
        const response = await axios.get(`https://api.nexray.web.id/information/cuaca?kota=${encodeURIComponent(q)}`);
        res.json({ status: true, creator: "Kaaaoffc", result: response.data.result });
    } catch (e) { res.json({ status: false, error: "Cuaca Search Error" }); }
});

module.exports = app;
