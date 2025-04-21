const express = require('express');
const path = require('path');
const fs = require('fs').promises; // Usiamo le Promise per un codice più pulito
const axios = require('axios');
const app = express();
const session = require('express-session');
const rateLimit = require('express-rate-limit');

// Configurazione
const PORT = process.env.PORT || 3000;
const filePath = path.join(__dirname, 'data', 'missioni.json');
const meteoCache = { data: null, lastUpdate: null };

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Rate limiting per prevenire abusi
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100
});

// Configurazione Pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware per dati globali
app.use(async (req, res, next) => {
  try {
    // Aggiorna cache meteo ogni 30 minuti
    if (!meteoCache.data || Date.now() - meteoCache.lastUpdate > 30 * 60 * 1000) {
      const response = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=44.79&longitude=10.32&current=temperature_2m,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto');
      meteoCache.data = response.data;
      meteoCache.lastUpdate = Date.now();
    }
    res.locals.meteo = meteoCache.data.current;
    res.locals.dailyMeteo = meteoCache.data.daily;
    next();
  } catch (error) {
    console.error('Errore meteo:', error.message);
    next(); // Continua anche senza meteo
  }
});

// Homepage con meteo e news ambientali
app.get('/', async (req, res) => {
  try {
    const newsResponse = await axios.get('https://newsapi.org/v2/everything?q=sostenibilità&language=it&sortBy=publishedAt&apiKey=abf398dac01e424fb864176eca79c099');
    const news = newsResponse.data.articles.slice(0, 3);
    res.render('index', { news });
  } catch (error) {
    console.error('Errore news:', error.message);
    res.render('index', { news: [] });
  }
});

// Pagine statiche
app.get('/about', (req, res) => res.render('about'));
app.get('/agenda2030', (req, res) => res.render('agenda2030'));
app.get('/consigli', (req, res) => res.render('consigli'));
app.get('/quiz', (req, res) => res.render('quiz'));

// Missioni con autenticazione base
app.get('/missioni', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('missioni', { user: req.session.user });
});

// Login/Logout
app.get('/login', (req, res) => res.render('login'));
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.post('/login', (req, res) => {
  // Autenticazione semplice (in produzione usare bcrypt e database)
  const { username, password } = req.body;
  if (username && password) {
    req.session.user = { username };
    return res.redirect('/missioni');
  }
  res.redirect('/login?error=1');
});

// API per missioni completate
app.post('/api/missioni', apiLimiter, async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }

  try {
    const completate = parseInt(req.body.completate) || 0;
    const data = await fs.readFile(filePath, 'utf8');
    const json = JSON.parse(data);
    
    json.missioniCompletate += completate;
    json.users = json.users || {};
    json.users[req.session.user.username] = (json.users[req.session.user.username] || 0) + completate;
    
    await fs.writeFile(filePath, JSON.stringify(json, null, 2));
    res.json({ 
      totale: json.missioniCompletate,
      personale: json.users[req.session.user.username]
    });
  } catch (error) {
    console.error('Errore API:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// API per statistiche (usata dalla dashboard)
app.get('/api/stats', apiLimiter, async (req, res) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const json = JSON.parse(data);
    res.json({
      totalMissions: json.missioniCompletate,
      topUsers: Object.entries(json.users || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// Dashboard admin
app.get('/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.username !== 'admin') {
    return res.status(403).send('Accesso negato');
  }
  res.render('dashboard');
});

// 404 e gestione errori
app.use((req, res) => res.status(404).render('404'));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error');
});

app.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});