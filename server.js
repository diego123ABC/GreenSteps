const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios'); // Per richieste HTTP a servizi esterni, utilizzato per richiamare API esterne  
const app = express();
const session = require('express-session');

// Configurazione
const PORT = process.env.PORT || 3000;
const missioniPath = path.join(__dirname, 'data', 'missioni.json');
const adminsPath = path.join(__dirname, 'data', 'admins.json');
const obiettiviPath = path.join(__dirname, 'data', 'obiettivi.json');
const meteoCache = { data: null, lastUpdate: null }; // Per caching del meteo

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // true solo con HTTPS
}));

// Configurazione Pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware per dati globali
app.use(async (req, res, next) => {
  try {
    // Aggiorna cache meteo ogni 30 minuti
    if (!meteoCache.data || Date.now() - meteoCache.lastUpdate > 30 * 60 * 1000) {
      const response = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=44.80&longitude=10.32&current=temperature_2m,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto');
      meteoCache.data = response.data;
      meteoCache.lastUpdate = Date.now();
    }
    // Rende i dati accessibili nei template Pug
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
    const newsResponse = await axios.get('https://newsapi.org/v2/everything?q="sostenibilità ambientale" OR "sviluppo sostenibile" OR "energia rinnovabile" OR "economia circolare"&language=it&sortBy=publishedAt&apiKey=abf398dac01e424fb864176eca79c099');
    const news = newsResponse.data.articles.slice(0, 3); // Prendo solo 3 articoli
    res.render('index', { news });
  } catch (error) {
    console.error('Errore news:', error.message);
    res.render('index', { news: [] });
  }
});

// Pagine statiche
app.get('/about', async (req, res) => {
  try {
    const response = await axios.get('http://192.168.180.25:4000/sprechiavvio/qwerty'); // Cambia l'URL con quello giusto
    const dati = response.data;
    res.render('about', { dati }); // Passa i dati alla vista Pug
  } catch (error) {
    console.error('Errore nella fetch API:', error.message);
    res.render('about', { dati: [] }); // Manda una lista vuota se fallisce
  }
});
app.get('/consigli', (req, res) => res.render('consigli'));
app.get('/quiz', (req, res) => res.render('quiz'));
app.get('/login', (req, res) => res.render('login'));

// Obiettivi Agenda 2030 caricati da file JSON
app.get('/agenda2030', (req, res) => {
  fs.readFile(obiettiviPath, 'utf8')
    .then(data => {
      const obiettiviRaggruppati = JSON.parse(data);
      res.render('agenda2030', { obiettiviRaggruppati: obiettiviRaggruppati });
    })
    .catch(error => {
      console.error('Errore nella lettura del file obiettivi.json:', error);
      res.status(500).send('Errore nel caricamento degli obiettivi');
    });
});

app.get('/missioni', (req, res) => {
  if (!req.session.username) {
    return res.redirect('/missioni/login');
  }
  res.render('missioni', { username: req.session.username });
});

app.get('/missioni/login', (req, res) => {
  res.render('missioni-login');
});

app.post('/missioni/login', (req, res) => {
  const { username } = req.body;
  if (username && username.trim() !== '') {
    req.session.username = username.trim();
    return res.redirect('/missioni');
  }
  res.redirect('/missioni/login?error=1');
});

app.get('/missioni/logout', (req, res) => {
  req.session.username = null;
  res.redirect('/');
});

// API la classifica missioni
app.get('/api/stats', async (req, res) => {
  try {
    const missioniData = await fs.readFile(missioniPath, 'utf8');
    const missioni = JSON.parse(missioniData);
    const users = missioni.users || {};

    // Ordina gli utenti per missioni completate in ordine decrescente
    const topUsers = Object.entries(users)
      .sort((a, b) => b[1] - a[1]) // b[1] - a[1] => ordine decrescente
      .slice(0, 10); // Top 10

    res.json({ topUsers });
  } catch (error) {
    console.error('Errore caricamento classifica:', error);
    res.status(500).json({ error: 'Errore nel caricamento della classifica' });
  }
});


// API aggiornamento missioni completate
app.post('/api/missioni', async (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }

  try {
    const completate = parseInt(req.body.completate) || 0;
    const data = await fs.readFile(missioniPath, 'utf8');
    const json = JSON.parse(data);
    
    json.missioniCompletate = (json.missioniCompletate || 0) + completate;
    json.users = json.users || {};
    json.users[req.session.username] = (json.users[req.session.username] || 0) + completate;
    
    await fs.writeFile(missioniPath, JSON.stringify(json, null, 2));
    res.json({ 
      totale: json.missioniCompletate,
      personale: json.users[req.session.username]
    });
  } catch (error) {
    console.error('Errore API:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Pagina admin
app.get('/admin', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }
  res.render('admin', { admin: req.session.admin });
});

app.get('/admin/login', (req, res) => {
  const error = req.query.error;
  res.render('admin-login', { error });
});

// Login admin da file JSON
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminsData = await fs.readFile(adminsPath, 'utf8');
    const admins = JSON.parse(adminsData);
    
    const admin = admins.find(a => a.username === username && a.password === password);
    
    if (admin) {
      req.session.admin = { username: admin.username };
      return res.redirect('/admin');
    }
    res.redirect('/admin/login?error=1');
  } catch (error) {
    console.error('Errore login admin:', error);
    res.redirect('/admin/login?error=2');
  }
});

// Statistiche per admin
app.get('/api/admin/stats', async (req, res) => {
  if (!req.session.admin) {
    return res.status(403).json({ error: 'Non autorizzato' });
  }

  try {
    const missioniData = await fs.readFile(missioniPath, 'utf8');
    const missioni = JSON.parse(missioniData);
    
    res.json({
      totalUsers: Object.keys(missioni.users || {}).length,
      totalMissions: missioni.missioniCompletate || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// API quiz da file JSON
app.get('/api/quiz', async (req, res) => {
  try {
    const quizPath = path.join(__dirname, 'data', 'quiz.json');
    const data = await fs.readFile(quizPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Errore caricamento quiz:', error);
    res.status(500).json({ error: 'Errore nel caricamento del quiz' });
  }
});

// Errori 404 e 500
app.use((req, res) => res.status(404).render('404'));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error');
});

app.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});