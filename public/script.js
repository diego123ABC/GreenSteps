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

// Quiz con caricamento dinamico da JSON
async function setupQuiz() {
  const quizForm = document.getElementById('quizForm');
  if (!quizForm) return;

  const domandeContainer = document.getElementById('domandeContainer');
  
  try {
    // Mostra loader durante il caricamento
    domandeContainer.innerHTML = '<div class="loading">Caricamento domande...</div>';
    
    const response = await fetch('/api/quiz');
    const quizData = await response.json();
    
    // Genera il form delle domande
    let domandeHTML = '';
    quizData.domande.forEach((domanda, index) => {
      domandeHTML += `
        <div class="quiz-question" data-id="${domanda.id}" data-correct="${domanda.rispostaCorretta}">
          <h3>${index + 1}. ${domanda.domanda}</h3>
          ${Object.entries(domanda.opzioni).map(([key, value]) => `
            <div class="quiz-option">
              <input type="radio" name="q${domanda.id}" value="${key}" id="q${domanda.id}${key}">
              <label for="q${domanda.id}${key}">${value}</label>
            </div>
          `).join('')}
        </div>
      `;
    });
    
    domandeContainer.innerHTML = domandeHTML;
    
    // Aggiungi gestore submit
    quizForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleQuizSubmission(quizData.domande);
    });
    
  } catch (error) {
    console.error('Errore nel caricamento del quiz:', error);
    domandeContainer.innerHTML = `
      <div class="alert error">
        Errore nel caricamento del quiz. Riprova più tardi.
      </div>
    `;
  }
}

function handleQuizSubmission(domande) {
  const risultatoContainer = document.getElementById('risultato');
  let punteggio = 0;
  
  domande.forEach(domanda => {
    const questionEl = document.querySelector(`.quiz-question[data-id="${domanda.id}"]`);
    const selected = questionEl.querySelector('input[type="radio"]:checked');
    const correctAnswer = domanda.rispostaCorretta;
    
    // Reset delle classi precedenti
    questionEl.classList.remove('correct', 'incorrect', 'unanswered');
    
    if (selected) {
      const isCorrect = selected.value === correctAnswer;
      if (isCorrect) punteggio++;
      
      questionEl.classList.add(isCorrect ? 'correct' : 'incorrect');
    } else {
      questionEl.classList.add('unanswered');
    }
  });
  
  const percentuale = Math.round((punteggio / domande.length) * 100);
  let feedback;
  
  if (percentuale >= 90) feedback = `Eccellente! ${percentuale}% - Sei un vero esperto di sostenibilità!`;
  else if (percentuale >= 70) feedback = `Bravo! ${percentuale}% - Hai una buona conoscenza degli OSS`;
  else if (percentuale >= 50) feedback = `${percentuale}% - Non male, ma puoi migliorare`;
  else feedback = `${percentuale}% - Consulta l'Agenda 2030 per approfondire`;
  
  risultatoContainer.innerHTML = `
    <div class="quiz-result ${percentuale >= 70 ? 'success' : ''}">
      <h3>Hai totalizzato ${punteggio} punti su ${domande.length}</h3>
      <p>${feedback}</p>
      <div class="progress-bar">
        <div style="width: ${percentuale}%"></div>
      </div>
    </div>
  `;
  
  // Scroll al risultato
  risultatoContainer.scrollIntoView({ behavior: 'smooth' });
}

// Caricamento iniziale
document.addEventListener('DOMContentLoaded', () => {
  setupQuiz();
  
  // Animazioni per il meteo
  const meteoIcon = document.getElementById('meteo-icon');
  if (meteoIcon) {
    const weatherCode = meteoIcon.dataset.code;
    const icons = {
      '0': '☀️', 
      '1': '🌤', 
      '2': '⛅', 
      '3': '☁️',
      '45': '🌫', 
      '48': '🌫', 
      '51': '🌦', 
      '53': '🌦',
      '55': '🌧', 
      '56': '🌧', 
      '57': '🌧', 
      '61': '🌧',
      '63': '🌧', 
      '65': '🌧', 
      '66': '🌨', 
      '67': '🌨',
      '71': '❄️', 
      '73': '❄️', 
      '75': '❄️', 
      '77': '❄️',
      '80': '🌦', 
      '81': '🌦', 
      '82': '🌧', 
      '85': '🌨',
      '86': '🌨', 
      '95': '⛈', 
      '96': '⛈', 
      '99': '⛈'
    };
    
    meteoIcon.textContent = icons[weatherCode] || '🌈';
  }
});