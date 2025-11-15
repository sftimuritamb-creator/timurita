<!doctype html>
<html lang="lt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Timurita – Darbo pasiūlymai</title>
  <meta name="description" content="Peržiūrėkite trumpalaikio darbo pasiūlymus statybų sektoriuje.">

  <!-- PWA -->
  <link rel="manifest" href="/timurita/manifest.json">
  <meta name="theme-color" content="#1a2a44">
  <link rel="icon" href="/timurita/Timurita_logo_192x192.png" type="image/png">

  <link rel="stylesheet" href="/timurita/style.css">

  <style>
    :root{ --bg:#f8fafc; --fg:#0f172a; --muted:#64748b; --line:#e2e8f0; --card:#ffffff; --primary:#0f766e; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:var(--bg); margin:0; color:var(--fg); }
    .app-header { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 16px; background:var(--card); border-bottom:1px solid var(--line); }
    .left { display:flex; align-items:center; gap:10px; }
    .app-header img { width:40px; height:40px; border-radius:8px; }
    .container { max-width:980px; margin:0 auto; padding:16px; }
    h1 { margin-top:0; }
    .muted { color:var(--muted); }

    .section-title { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:24px; }
    .badge { display:inline-block; padding:2px 8px; border-radius:999px; background:#e0f2fe; color:#0369a1; font-size:12px; font-weight:600; }
    .badge-local { background:#dcfce7; color:#166534; }
    .badge-remote { background:#fee2e2; color:#b91c1c; }

    .offers-list { display:flex; flex-direction:column; gap:10px; margin-top:10px; }
    .offer-card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:12px 14px; box-shadow:0 1px 2px rgba(15,23,42,0.05); }
    .offer-header { display:flex; justify-content:space-between; gap:8px; align-items:flex-start; }
    .offer-title { font-size:16px; font-weight:700; margin:0; }
    .offer-meta { font-size:13px; color:var(--muted); margin-top:2px; }
    .offer-salary { font-size:14px; font-weight:600; color:#0f766e; }
    .offer-body { font-size:14px; margin-top:6px; white-space:pre-wrap; }
    .offer-contact { font-size:13px; margin-top:8px; color:var(--muted); }

    .pill { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:11px; border:1px solid var(--line); }
    .pill-local { background:#f0fdf4; color:#166534; }
    .pill-supabase { background:#eff6ff; color:#1d4ed8; }

    .toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:8px; flex-wrap:wrap; }
    .toolbar-left { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .btn { padding:8px 12px; font-size:13px; font-weight:600; border-radius:10px; border:1px solid var(--line); background:var(--card); cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
    .btn.primary { background:var(--primary); color:white; border-color:var(--primary); }
    .btn:disabled { opacity:0.6; cursor:default; }

    .status { font-size:12px; color:var(--muted); }

    nav.bottom-nav { position:sticky; bottom:0; display:grid; grid-template-columns:repeat(4,1fr); background:rgba(248,250,252,0.96); border-top:1px solid var(--line); padding:10px; backdrop-filter:blur(6px); }
    .bottom-nav a { text-align:center; text-decoration:none; padding:10px; border-radius:10px; color:var(--fg); font-weight:600; background:var(--card); border:1px solid var(--line); }
    .bottom-nav a[aria-current="page"] { background:var(--primary); color:#fff; border-color:var(--primary); }

    .empty { font-size:14px; color:var(--muted); font-style:italic; margin-top:8px; }
  </style>

  <!-- Supabase UMD biblioteka -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.48.0/dist/umd/supabase.js"></script>
</head>

<body>
  <header class="app-header">
    <div class="left">
      <a href="/timurita/index.html" style="display:flex;align-items:center;text-decoration:none;color:inherit">
        <img src="/timurita/Timurita_logo_192x192.png" alt="Timurita" loading="lazy">
        <div>
          <h3 style="margin:0;">Timurita</h3>
          <div style="font-size:12px;color:var(--muted)">Sujungiame darbdavius ir statybų specialistus</div>
        </div>
      </a>
    </div>
  </header>

  <main class="container">
    <h1>Darbo pasiūlymai</h1>
    <p class="muted">
      Čia matysite darbo pasiūlymus:
      <br>• 🟢 iš <strong>šio įrenginio</strong> (ką sukuria darbdavys šiame kompiuteryje)
      <br>• 🔵 iš <strong>Supabase</strong> (bendras viešas sąrašas, jei yra ryšys)
    </p>

    <div class="toolbar">
      <div class="toolbar-left">
        <button class="btn" type="button" id="refreshBtn">🔁 Atnaujinti iš Supabase</button>
      </div>
      <div class="status" id="status">Nepatvirtinta būsena.</div>
    </div>

    <!-- Vietiniai pasiūlymai -->
    <section>
      <div class="section-title">
        <h2 style="margin:16px 0 4px;">Šiame įrenginyje išsaugoti</h2>
        <span class="badge badge-local">Tik šiame įrenginyje</span>
      </div>
      <div id="localOffers" class="offers-list"></div>
      <div id="localEmpty" class="empty" style="display:none;">Šiame įrenginyje dar nėra išsaugotų pasiūlymų.</div>
    </section>

    <!-- Supabase pasiūlymai -->
    <section>
      <div class="section-title">
        <h2 style="margin:20px 0 4px;">Vieši pasiūlymai (Supabase)</h2>
        <span class="badge">Pasiekiami visiems</span>
      </div>
      <div id="remoteOffers" class="offers-list"></div>
      <div id="remoteEmpty" class="empty" style="display:none;">Kol kas nėra pasiūlymų iš Supabase, arba nepavyko prisijungti.</div>
    </section>
  </main>

  <nav class="bottom-nav" aria-label="Apatinė navigacija">
    <a href="/timurita/darbuotojai.html">Darbuotojai</a>
    <a href="/timurita/pasiulymai.html" aria-current="page">Pasiūlymai</a>
    <a href="/timurita/profilis.html">Profilis</a>
    <a href="/timurita/darbdavys.html">Darbdavys</a>
  </nav>

  <script>
    // --- LocalStorage raktai turi sutapti su darbdavys.html ---
    const OFFERS_KEY = 'timurita_offers';

    const statusEl = document.getElementById('status');
    const localListEl = document.getElementById('localOffers');
    const localEmptyEl = document.getElementById('localEmpty');
    const remoteListEl = document.getElementById('remoteOffers');
    const remoteEmptyEl = document.getElementById('remoteEmpty');
    const refreshBtn = document.getElementById('refreshBtn');

    // --- Supabase klientas (tas pats projektas kaip darbdavys.html) ---
    let supabaseClient = null;
    try {
      if (window.supabase) {
        const supabaseUrl = 'https://qnczakppadjxbicgjzcy.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuY3pha3BwYWRqeGJpY2dqemN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTYxMjcsImV4cCI6MjA3ODUzMjEyN30.0lAl6L1GU1_uWpULlraaKM0KIfy3lCNSI_wp2X5zDmY';
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log('Supabase klientas (pasiulymai.html) sukurtas');
      } else {
        console.warn('Supabase biblioteka neužsikrovė');
      }
    } catch (e) {
      console.warn('Supabase createClient klaida pasiulymai.html:', e);
    }

    function escape(text) {
      return (text || '').toString();
    }

    function renderOfferCard(offer, source) {
      const div = document.createElement('article');
      div.className = 'offer-card';

      const title = escape(offer.title);
      const company = escape(offer.company || '');
      const city = escape(offer.city || '');
      const salary = escape(offer.salary || '');
      const desc = escape(offer.description || offer.desc || '');
      const contact = escape(offer.contact || '');
      const phone = escape(offer.phone || '');
      const email = escape(offer.email || '');

      const header = document.createElement('div');
      header.className = 'offer-header';

      const left = document.createElement('div');
      const h = document.createElement('h3');
      h.className = 'offer-title';
      h.textContent = title || 'Be pavadinimo';

      const meta = document.createElement('div');
      meta.className = 'offer-meta';
      const parts = [];
      if (company) parts.push(company);
      if (city) parts.push(city);
      meta.textContent = parts.join(' • ');

      left.appendChild(h);
      left.appendChild(meta);

      const pill = document.createElement('div');
      pill.className = 'pill ' + (source === 'local' ? 'pill-local' : 'pill-supabase');
      pill.textContent = source === 'local' ? 'Šis įrenginys' : 'Supabase';

      header.appendChild(left);
      header.appendChild(pill);

      const body = document.createElement('div');
      body.className = 'offer-body';
      body.textContent = desc || 'Aprašymas nepateiktas.';

      const bottom = document.createElement('div');
      bottom.className = 'offer-contact';

      if (salary) {
        const salSpan = document.createElement('div');
        salSpan.className = 'offer-salary';
        salSpan.textContent = salary;
        bottom.appendChild(salSpan);
      }

      const lines = [];
      if (contact) lines.push('Kontaktinis asmuo: ' + contact);
      if (phone) lines.push('Tel.: ' + phone);
      if (email) lines.push('El. paštas: ' + email);
      if (lines.length) {
        const contactP = document.createElement('div');
        contactP.textContent = lines.join(' • ');
        bottom.appendChild(contactP);
      }

      div.appendChild(header);
      div.appendChild(body);
      div.appendChild(bottom);

      return div;
    }

    function loadLocalOffers() {
      localListEl.innerHTML = '';
      let offers = [];
      try {
        const raw = localStorage.getItem(OFFERS_KEY);
        offers = raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.warn('local offers read error', e);
        offers = [];
      }

      if (!offers || !offers.length) {
        localEmptyEl.style.display = 'block';
        return;
      }
      localEmptyEl.style.display = 'none';

      // Rūšiuojam pagal ID (jei date.now) – naujausi viršuje
      offers.sort((a,b) => (b.id || 0) - (a.id || 0));

      offers.forEach(o => {
        const card = renderOfferCard(o, 'local');
        localListEl.appendChild(card);
      });
    }

    async function loadRemoteOffers() {
      remoteListEl.innerHTML = '';
      remoteEmptyEl.style.display = 'none';
      statusEl.textContent = 'Jungiama prie Supabase...';
      refreshBtn.disabled = true;

      if (!supabaseClient) {
        statusEl.textContent = 'Supabase klientas nesukurtas (biblioteka neįkelta).';
        remoteEmptyEl.style.display = 'block';
        refreshBtn.disabled = false;
        return;
      }

      try {
        const { data, error } = await supabaseClient
          .from('offers')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.warn('Supabase select klaida:', error);
          statusEl.textContent = 'Supabase klaida: ' + (error.message || 'nežinoma');
          remoteEmptyEl.style.display = 'block';
        } else {
          if (!data || !data.length) {
            remoteEmptyEl.style.display = 'block';
            statusEl.textContent = 'Prisijungta prie Supabase. Pasiūlymų nėra.';
          } else {
            remoteEmptyEl.style.display = 'none';
            statusEl.textContent = 'Prisijungta prie Supabase. Gauta ' + data.length + ' pasiūlymų.';
            data.forEach(o => {
              const card = renderOfferCard(o, 'remote');
              remoteListEl.appendChild(card);
            });
          }
        }
      } catch (e) {
        console.warn('Supabase loadRemoteOffers klaida:', e);
        statusEl.textContent = 'Supabase klaida: ' + e.message;
        remoteEmptyEl.style.display = 'block';
      } finally {
        refreshBtn.disabled = false;
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      loadLocalOffers();
      loadRemoteOffers();

      refreshBtn.addEventListener('click', () => {
        loadRemoteOffers();
      });

      statusEl.textContent = 'Kraunami pasiūlymai...';
    });

    // Service worker paliekam kaip ir kituose puslapiuose
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/timurita/service-worker.js')
        .then(()=>console.log('SW registered (pasiulymai.html)'))
        .catch(e=>console.log('SW error', e));
    }
  </script>
</body>
</html>
