// Gestione login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(formData)
    });
    
    if (response.redirected) {
      window.location.href = response.url;
    }
  });
}

// Missioni con feedback avanzato
const missioniForm = document.getElementById('missioniForm');
if (missioniForm) {
  missioniForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const completate = document.querySelectorAll('input[name="missione"]:checked').length;
    
    try {
      const res = await fetch('/api/missioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completate })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      const data = await res.json();
      const feedback = document.getElementById('feedback');
      feedback.innerHTML = `
        <div class="alert success">
          <strong>Missioni completate:</strong> ${completate}<br>
          <strong>Il tuo totale:</strong> ${data.personale}<br>
          <strong>Totale comunità:</strong> ${data.totale}
        </div>
      `;
      
      // Aggiorna la classifica
      updateLeaderboard();
    } catch (error) {
      document.getElementById('feedback').innerHTML = `
        <div class="alert error">
          Errore: ${error.message}
        </div>
      `;
    }
  });
}

// Quiz avanzato con più domande e punteggio progressivo
const quizForm = document.getElementById('quizForm');
if (quizForm) {
  quizForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const risposteCorrette = {
      q1: 'b', q2: 'b', q3: 'a', q4: 'c', q5: 'b'
    };
    
    let punteggio = 0;
    const totalDomande = Object.keys(risposteCorrette).length;
    
    for (const [domanda, corretta] of Object.entries(risposteCorrette)) {
      const selected = quizForm.querySelector(`input[name="${domanda}"]:checked`);
      if (selected && selected.value === corretta) punteggio++;
    }
    
    const percentuale = Math.round((punteggio / totalDomande) * 100);
    let messaggio;
    
    if (percentuale >= 80) messaggio = `Ottimo! ${percentuale}% - Sei un esperto di sostenibilità!`;
    else if (percentuale >= 50) messaggio = `Buono! ${percentuale}% - Sai qualcosa ma puoi migliorare.`;
    else messaggio = `${percentuale}% - Ti consiglio di studiare l'Agenda 2030!`;
    
    const risultato = document.getElementById('risultato');
    risultato.innerHTML = `
      <div class="quiz-result">
        <h3>Risultato: ${punteggio}/${totalDomande}</h3>
        <p>${messaggio}</p>
        <div class="progress-bar">
          <div style="width: ${percentuale}%"></div>
        </div>
      </div>
    `;
  });
}

// Grafico per la dashboard
async function renderStatsChart() {
  const ctx = document.getElementById('statsChart');
  if (!ctx) return;
  
  try {
    const response = await fetch('/api/stats');
    const data = await response.json();
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.topUsers.map(user => user[0]),
        datasets: [{
          label: 'Missioni completate',
          data: data.topUsers.map(user => user[1]),
          backgroundColor: '#4CAF50'
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  } catch (error) {
    console.error('Errore nel caricamento delle statistiche:', error);
  }
}

// Caricamento iniziale
document.addEventListener('DOMContentLoaded', () => {
  renderStatsChart();
  
  // Animazioni per il meteo
  const meteoIcon = document.getElementById('meteo-icon');
  if (meteoIcon) {
    const weatherCode = meteoIcon.dataset.code;
    const icons = {
      '0': '☀️', '1': '🌤', '2': '⛅', '3': '☁️',
      '45': '🌫', '48': '🌫', '51': '🌦', '53': '🌦',
      '55': '🌧', '56': '🌧', '57': '🌧', '61': '🌧',
      '63': '🌧', '65': '🌧', '66': '🌨', '67': '🌨',
      '71': '❄️', '73': '❄️', '75': '❄️', '77': '❄️',
      '80': '🌦', '81': '🌦', '82': '🌧', '85': '🌨',
      '86': '🌨', '95': '⛈', '96': '⛈', '99': '⛈'
    };
    
    meteoIcon.textContent = icons[weatherCode] || '🌈';
  }
});