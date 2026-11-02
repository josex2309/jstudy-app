  /* ===== STORAGE ===== */
  const Storage = { load: k => JSON.parse(localStorage.getItem(k) || 'null'), save: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };

  /* ===== STATE ===== */
  class AppData {
    constructor() {
      this.decks = Storage.load('ep_decks') || {};
      this.notes = Storage.load('ep_notes') || [];
      this.stats = Storage.load('ep_stats') || { sessions: 0, streak: 0, minutes: 0, cardsMastered: 0, quizCorrect: 0, quizTotal: 0, lastDate: '' };
      this.apiKey = localStorage.getItem('ep_apikey') || '';
      if (!this.decks.default) {
        this.decks.default = [
          { id: 1, front: '¿Qué es una función?', back: 'Un bloque de código reutilizable.', level: 2, dueDate: this.todayStr() },
          { id: 2, front: 'Variable vs Constante', back: 'Variable cambia; constante (`const`) no se reasigna.', level: 2, dueDate: this.todayStr() },
          { id: 3, front: 'CSS Grid', back: 'Layout bidimensional para filas y columnas.', level: 2, dueDate: this.todayStr() },
        ];
        Storage.save('ep_decks', this.decks);
      }
      for (const [name, cards] of Object.entries(this.decks)) cards.forEach(c => { if (!c.dueDate) c.dueDate = this.todayStr(); });
      Storage.save('ep_decks', this.decks);
    }
    todayStr() { return new Date().toISOString().split('T')[0]; }
    addLog(ev) { const log = Storage.load('ep_log') || []; log.unshift({ event: ev, date: new Date().toISOString() }); Storage.save('ep_log', log.slice(0, 50)); }
    updateStats(minutes = 0) {
      const today = this.todayStr(); const yesterday = new Date(new Date(new Date().setDate(new Date().getDate() - 1))).toISOString().split('T')[0];
      if (this.stats.lastDate !== today) { this.stats.sessions = 1; this.stats.streak = (this.stats.lastDate === yesterday) ? this.stats.streak + 1 : 1; this.stats.lastDate = today; }
      else { this.stats.sessions += 1; }
      this.stats.minutes += minutes; Storage.save('ep_stats', this.stats);
    }
    cardsPendingToday() {
      const today = this.todayStr(); let total = 0;
      for (const cards of Object.values(this.decks)) total += cards.filter(c => c.dueDate <= today).length;
      return total;
    }
  }
  const app = new AppData();

  /* ===== TOAST ===== */
  function toast(msg, type='success'){
    const container = document.getElementById('toastContainer');
    const icons = { success: '✓', error: '✕', warn: '⚠', info: 'ℹ' };
    const el = document.createElement('div'); 
    el.className = 'toast ' + type; 
    el.innerHTML = `<span style="font-size:1.1rem;margin-right:.5rem;display:inline-block;">${icons[type] || icons.info}</span><span>${msg}</span>`; 
    el.setAttribute('role', 'alert');
    el.style.animation = 'slideIn .35s ease, fadeOut .3s ease 2.7s forwards';
    container.appendChild(el); 
    setTimeout(() => { el.remove(); }, 3000);
  }

  /* ===== TABS ===== */
  /* ===== TABS ===== */
  /* ===== TABS ===== */
  function showTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => { 
      b.classList.remove('active'); 
      b.setAttribute('aria-selected', 'false'); 
    });
    
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    const btn = document.querySelector('.tab-btn[onclick*="'+name+'"]');
    if (btn) { 
      btn.classList.add('active'); 
      btn.setAttribute('aria-selected', 'true'); 
    }
    
    // Búsqueda robusta y tolerante a variaciones de ID en el DOM
    const panel = document.getElementById('panel-' + name) || document.getElementById(name);
    
    if (panel) {
      panel.classList.add('active');
    } else {
      console.warn(`⚠️ No se encontró el contenedor para la pestaña "${name}" en el DOM.`);
    }
    
    if (name === 'progreso') renderDashboard(); 
    if (name === 'mazos') renderDeck(); 
    if (name === 'notas') renderNotes();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  /* ===== FLASHCARDS ===== */
/* ===== FLASHCARDS ===== */
  function addCard() {
    const deckName = document.getElementById('deckName').value.trim() || 'default';
    const front = document.getElementById('cardFront').value.trim(); const back = document.getElementById('cardBack').value.trim();
    if (!front || !back) return toast('Completa pregunta y respuesta', 'warn');
    if (!app.decks[deckName]) app.decks[deckName] = [];
    const today = new Date().toISOString().split('T')[0];
    app.decks[deckName].push({ id: Date.now(), front, back, level: 1, dueDate: today });
    Storage.save('ep_decks', app.decks); document.getElementById('cardFront').value = ''; document.getElementById('cardBack').value = '';
    renderDeck(); populateQuizDeckSelect(); toast('Tarjeta agregada'); app.addLog('Tarjeta agregada');
  }

  function deleteCard(deckName, idx) { 
    app.decks[deckName].splice(idx, 1); 
    Storage.save('ep_decks', app.decks); 
    renderDeck(); 
    populateQuizDeckSelect(); 
    updateQuizCountOptions(); 
    toast('Tarjeta eliminada', 'warn'); 
    app.addLog('Tarjeta eliminada'); 
  }

  function editDeckName(name) {
    const newName = prompt('Nuevo nombre para el mazo:', name);
    if (!newName || newName === name) return;
    app.decks[newName] = app.decks[name]; delete app.decks[name];
    Storage.save('ep_decks', app.decks); renderDeck(); populateQuizDeckSelect(); toast('Mazo renombrado'); app.addLog('Mazo renombrado');
  }

  function deleteDeck(name) {
    if (!confirm('¿Eliminar mazo "' + name + '"?')) return;
    delete app.decks[name]; Storage.save('ep_decks', app.decks); renderDeck(); populateQuizDeckSelect(); toast('Mazo eliminado', 'warn'); app.addLog('Mazo eliminado');
  }

  function editCard(deckName, idx) {
    const c = app.decks[deckName][idx];
    document.getElementById('deckName').value = deckName;
    document.getElementById('cardFront').value = c.front;
    document.getElementById('cardBack').value = c.back;
    deleteCard(deckName, idx);
    toast('Tarjeta cargada para editar');
  }

  function deleteIndividualCard(deckName, idx) {
    deleteCard(deckName, idx); toast('Tarjeta individual eliminada', 'warn');
  }

  function renderDeck() {
    const container = document.getElementById('deckDisplay');
    if (!container) return; // Protección defensiva contra elementos nulos

    const names = Object.keys(app.decks || {});
    let pendingToday = typeof app.cardsPendingToday === 'function' ? app.cardsPendingToday() : 0;
    
    const statPendientes = document.getElementById('stat-pendientes');
    if (statPendientes) {
      statPendientes.textContent = pendingToday;
    }

    if (!names.length) {
      container.innerHTML = '<div class="empty-state"><h3>Sin mazos</h3><p>Crea un mazo para empezar a estudiar con repetición espaciada.</p></div>';
      return;
    }

    let html = '<h3>Mazos</h3><table class="table"><thead><tr><th>Mazo</th><th>Tarjetas</th><th>Pendientes hoy</th><th>Acciones</th></tr></thead><tbody>';
    
    names.forEach(name => {
      const arr = app.decks[name] || []; 
      const todayStr = new Date().toISOString().split('T')[0];
      const pending = arr.filter(c => c.dueDate <= todayStr).length;
      
      html += `<tr><td><strong>${name}</strong></td><td>${arr.length}</td><td>${pending}</td>
      <td style="display:flex;gap:.25rem;flex-wrap:wrap;">
        <button onclick="startStudy('${name}')" class="btn btn-secondary" style="padding:.25rem .6rem;font-size:.75rem;">Estudiar</button>
        <button onclick="editDeckName('${name}')" class="btn btn-secondary" style="padding:.25rem .6rem;font-size:.75rem;">Editar</button>
        <button onclick="deleteDeck('${name}')" class="btn btn-secondary" style="padding:.25rem .6rem;font-size:.75rem;">Eliminar</button>
      </td></tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
  }
  /* ======= STUDY NAVIGATION ======= */
  let currentStudyDeck = null; let currentStudyIndex = 0;
  function startStudy(name) {
    const arr = app.decks[name];
    if (!arr || !arr.length) return toast('Mazo vacío', 'warn');
    currentStudyDeck = name; currentStudyIndex = 0; renderStudyCard(); toast('Estudio iniciado: ' + arr.length + ' tarjetas');
  }
  function renderStudyCard() {
    const arr = app.decks[currentStudyDeck];
    if (!arr || !arr.length) return;
    if (currentStudyIndex >= arr.length) {
      document.getElementById('studyArea').innerHTML = '<div class="box"><h3>¡Mazo completado!</h3><p>Has revisado todas las tarjetas de este mazo.</p><button onclick="startStudy(currentStudyDeck)" class="btn">Reiniciar mazo</button></div>';
      return;
    }
    const c = arr[currentStudyIndex];
    const area = document.getElementById('studyArea');
    area.innerHTML = `
      <div style="margin-bottom:.5rem;color:var(--text-muted);font-size:.85rem;display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;">
        <span>Tarjeta ${currentStudyIndex + 1} de ${arr.length}</span><span>Próximo repaso: ${c.dueDate}</span>
      </div>
      <div class="flash" onclick="this.classList.toggle('flipped')" tabindex="0" aria-label="Tarjeta de estudio" role="button">
        <div class="flash-inner">
          <div class="flash-front"><h3>${c.front}</h3></div>
          <div class="flash-back"><p>${c.back}</p></div>
        </div>
      </div>
      <div style="margin-top:1.5rem;display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;">
        <button onclick="studyLevel(-1)" class="btn btn-secondary" aria-label="Difícil, repetir hoy">Difícil (Hoy)</button>
        <button onclick="studyLevel(0)" class="btn btn-secondary" aria-label="Bueno, sumar 3 días">Bueno (+3d)</button>
        <button onclick="studyLevel(1)" class="btn btn-secondary" aria-label="Fácil, sumar 7 días">Fácil (+7d)</button>
        <button onclick="studyNext()" class="btn btn-secondary" aria-label="Siguiente tarjeta">Siguiente →</button>
        <button onclick="studyPrev()" class="btn btn-secondary" aria-label="Anterior tarjeta">← Anterior</button>
      </div>`;
  }
  function studyLevel(delta) {
    if (!currentStudyDeck) return; const arr = app.decks[currentStudyDeck]; if (currentStudyIndex >= arr.length) return;
    const c = arr[currentStudyIndex]; const todayStr = new Date().toISOString().split('T')[0];
    let nextDays = 1; if (delta === 1) nextDays = 7; else if (delta === 0) nextDays = 3; else nextDays = 1;
    c.level = Math.max(1, Math.min(3, c.level + delta));
    const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + nextDays); c.dueDate = nextDate.toISOString().split('T')[0];
    Storage.save('ep_decks', app.decks); currentStudyIndex = Math.min(currentStudyIndex + 1, arr.length); renderStudyCard();
    app.stats.cardsMastered = Object.values(app.decks).reduce((sum, a) => sum + a.filter(x => x.level === 3).length, 0); Storage.save('ep_stats', app.stats);
    toast('Nivel actualizado. Próximo: ' + c.dueDate); app.addLog('Leitner: nivel ' + c.level + ' (próximo: ' + c.dueDate + ')');
  }
  function studyNext() { if (!currentStudyDeck) return; currentStudyIndex = Math.min(currentStudyIndex + 1, app.decks[currentStudyDeck].length); renderStudyCard(); }
  function studyPrev() { if (!currentStudyDeck) return; currentStudyIndex = Math.max(currentStudyIndex - 1, 0); renderStudyCard(); }

  /* ======= QUIZ ADVANCED ======= */
  function startQuiz(type='multiple', deckName='all', count=5, difficulty=2) {
    let pool = []; const difficultyLevel = parseInt(difficulty) || 2; const questionCount = parseInt(count) || 5;
    if (deckName === 'all') { pool = Object.values(app.decks).flat(); } else { pool = (app.decks[deckName] || []).slice(); }
    if (!pool.length) return toast('No hay mazos con tarjetas', 'warn');
    // Filter by difficulty level of cards (optional enhancement)
    const filteredPool = difficultyLevel === 1 ? pool : difficultyLevel === 3 ? pool.filter(c => c.level >= 2) : pool;
    const selected = filteredPool.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(questionCount, filteredPool.length));
    window.currentQuizType = type; window.currentQuizReview = [];
    let html = `<h3>Quiz — ${type === 'multiple' ? 'Opción Múltiple' : type === 'true_false' ? 'Verdadero / Falso' : 'Respuesta Corta'}</h3>`;
    html += `<p style="font-size:.85rem;color:var(--text-muted);margin-bottom:.75rem;">Mazo: ${deckName} | Preguntas: ${selected.length} | Dificultad: ${difficultyLevel}</p>`;
    selected.forEach((c, i) => {
      window.currentQuizReview.push({ id: i, front: c.front, back: c.back, correct: c.back, result: null, type: type });
      if (type === 'multiple') {
        const distractors = pool.filter(o => o.id !== c.id && o.id !== c.id).slice().sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [c.back, ...distractors.map(d => d.back)].sort(() => Math.random() - 0.5);
        const optBtns = options.map((opt) => `<button onclick="quizSelect(${i}, '${encodeURIComponent(opt)}', '${encodeURIComponent(c.back)}')" class="btn btn-secondary">${opt}</button>`).join('');
        html += `<div style="margin-bottom:1.5rem;" id="q-${i}">
          <p class="quiz-q">Pregunta ${i + 1}: ${c.front}</p>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">${optBtns}</div>
        </div>`;
      } else if (type === 'true_false') {
        // Random true/false with balanced distribution and coherent false statements
        const isTrue = Math.random() > 0.5;
        const falseBack = pool.filter(o => o.id !== c.id).sort(() => Math.random() - 0.5)[0]?.back || c.back;
        const statement = isTrue ? c.back : falseBack;
        const correctAnswer = isTrue ? 'true' : 'false';
        // Update review data after initial push
        window.currentQuizReview[i] = { 
          id: i, front: c.front, back: c.back, 
          correct: correctAnswer, result: null, type: type, 
          statement: statement, isTrue: isTrue 
        };
        html += `<div style="margin-bottom:1rem;" id="q-${i}">
          <p class="quiz-q">Pregunta ${i + 1}: ${c.front}</p>
          <p><strong>Afirmación:</strong> ${statement}</p>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;">
            <button onclick="quizSelect(${i}, 'true', '${encodeURIComponent('true')}')" class="btn btn-secondary">Verdadero</button>
            <button onclick="quizSelect(${i}, 'false', '${encodeURIComponent('false')}')" class="btn btn-secondary">Falso</button>
          </div>
        </div>`;
      } else {
        html += `<div style="margin-bottom:1.5rem;" id="q-${i}">
          <p class="quiz-q">Pregunta ${i + 1}: ${c.front}</p>
          <textarea id="short-${i}" rows="2" placeholder="Escribe tu respuesta..." onblur="quizShortAnswer(${i}, this.value)" aria-label="Respuesta corta para la pregunta ${i + 1}"></textarea>
        </div>`;
      }
    });
    document.getElementById('quizArea').innerHTML = html;
    document.getElementById('quizResult').innerHTML = '';
    toast('Quiz configurado: ' + type);
  }
  function quizSelect(qId, chosen, correct) {
    const correctStr = decodeURIComponent(correct);
    const chosenStr = decodeURIComponent(chosen);
    if (!window.currentQuizReview) return;
    const item = window.currentQuizReview[qId]; if (!item) return;
    item.chosen = chosenStr; item.result = (chosenStr === correctStr);
    document.getElementById('quizResult').innerHTML = `<p style="font-weight:700;color:${item.result ? 'var(--success)' : 'var(--danger)'};">Respuesta ${item.result ? 'correcta' : 'incorrecta'}.</p>`;
    const answeredCount = window.currentQuizReview.filter(x => x.result !== null && x.result !== undefined).length;
    if (answeredCount >= window.currentQuizReview.length) { setTimeout(showQuizResults, 400); }
  }
  function quizShortAnswer(qId, value) {
    if (!window.currentQuizReview) return;
    const item = window.currentQuizReview[qId]; if (!item) return;
    const normalized = value.trim().toLowerCase();
    const correctNormalized = item.correct.trim().toLowerCase();
    item.chosen = value; item.result = normalized === correctNormalized || normalized.includes(correctNormalized) || correctNormalized.includes(normalized);
    document.getElementById('quizResult').innerHTML = `<p style="font-weight:700;color:${item.result ? 'var(--success)' : 'var(--danger)'};">Respuesta ${item.result ? 'correcta' : 'incorrecta'}.</p>`;
    const answeredCount = window.currentQuizReview.filter(x => x.result !== null && x.result !== undefined).length;
    if (answeredCount >= window.currentQuizReview.length) { setTimeout(showQuizResults, 400); }
  }
  function showQuizResults() {
    const items = window.currentQuizReview || [];
    const correctCount = items.filter(x => x.result === true).length;
    const total = items.length; const pct = total ? Math.round((correctCount / total) * 100) : 0;
    app.stats.quizCorrect += correctCount; app.stats.quizTotal += total; Storage.save('ep_stats', app.stats); app.addLog('Quiz completado');
    let review = '<h3>Resultados</h3>'; review += `<p>Puntaje: <strong>${correctCount}/${total}</strong> (${pct}%)</p>`;
    review += '<ul style="list-style:none;padding:0;margin-top:1rem;">';
    items.forEach((item, i) => {
      const ok = item.result ? 'correcto' : 'incorrecto'; const color = item.result ? 'var(--success)' : 'var(--danger)';
      review += `<li style="margin-bottom:1rem;padding:1rem;background:rgba(255,255,255,.03);border-radius:10px;border-left:4px solid ${color};">
        <strong>Pregunta ${i + 1} (${item.type || 'quiz'}):</strong> ${item.front}<br>
        <span style="font-size:.85rem;color:var(--text-muted);">Tu respuesta: <strong>${item.chosen || '(no respondida)'}</strong></span><br>
        <span style="font-size:.85rem;color:${color};font-weight:600;">${ok} — Correcta: ${item.correct}</span>
      </li>`;
    });
    review += '</ul>'; review += `<button onclick="startQuiz(window.currentQuizType || 'multiple')" class="btn" style="margin-top:1rem;">Reintentar quiz</button>`;
    document.getElementById('quizResult').innerHTML = review;
  }

  /* ======= POMODORO ======= */
  let timerInterval = null, timeLeft = 25 * 60, currentMode = 25, longInterval = 4, longSessionsDone = 0;
  function workMinValue() { return parseInt(document.getElementById('workMin')?.value || 25); }
  function shortMinValue() { return parseInt(document.getElementById('shortMin')?.value || 5); }
  function longMinValue() { return parseInt(document.getElementById('longMin')?.value || 15); }
  function applyPomodoroConfig() { toast('Configuración aplicada'); }
  function setMode(min) { currentMode = min; timeLeft = min * 60; updateTimer(); toast('Modo: ' + min + 'm'); }
  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timerInterval); timerInterval = null; timeLeft = 0;
        playAlarm();
        notifyBrowser('Estudio Pro', '¡Tiempo completado!');
        app.updateStats(currentMode);
        longSessionsDone++;
        if (longSessionsDone >= longInterval) { longSessionsDone = 0; toast('¡Descanso largo!'); app.addLog('Descanso largo tras ' + longInterval + ' sesiones'); }
        else { app.addLog('Ciclo Pomodoro completado (' + currentMode + 'm)'); toast('Ciclo completado — +' + currentMode + ' minutos'); }
      }
      updateTimer();
    }, 1000);
    toast('Temporizador iniciado');
  }
  function resetTimer() { clearInterval(timerInterval); timerInterval = null; timeLeft = currentMode * 60; updateTimer(); }
  function updateTimer() {
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    timerEl.textContent = m + ':' + s;
  }
  function playAlarm() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      // Harmonic chime (triangle + sine combo)
      const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(660, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.setValueAtTime(1320, ctx.currentTime); osc2.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.3);
      const gain = ctx.createGain(); gain.gain.setValueAtTime(0.15, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      osc.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc2.start(); osc.stop(ctx.currentTime + 1); osc2.stop(ctx.currentTime + 1);
    } catch (e) { console.warn('Audio alarm error', e); }
  }
  function notifyBrowser(title, msg) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') new Notification(title, { body: msg });
    else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => { if (p === 'granted') new Notification(title, { body: msg }); });
  }
  updateTimer();

  /* ======= NOTAS ======= */
  function addNote() {
    const title = document.getElementById('noteTitle').value.trim() || 'Sin título';
    const text = document.getElementById('noteText').value.trim();
    if (!text) return toast('Escribe contenido', 'warn');
    app.notes.push({ id: Date.now(), title, text, date: new Date().toISOString() });
    Storage.save('ep_notes', app.notes); document.getElementById('noteTitle').value = ''; document.getElementById('noteText').value = '';
    renderNotes(); toast('Nota guardada'); app.addLog('Nota guardada');
  }
  function editNote(id) {
    const note = app.notes.find(n => n.id === id); if (!note) return;
    document.getElementById('noteTitle').value = note.title; document.getElementById('noteText').value = note.text; deleteNote(id); toast('Nota cargada para editar');
  }
  function deleteNote(id) { app.notes = app.notes.filter(n => n.id !== id); Storage.save('ep_notes', app.notes); renderNotes(); toast('Nota eliminada', 'warn'); }
  function filterNotes() {
    const query = document.getElementById('searchNotes').value.toLowerCase().trim();
    const sortVal = document.getElementById('sortNotes').value;
    renderNotes(query, sortVal);
  }
  function sortNotes() { renderNotes(); }
function renderNotes(query = '', sortVal = 'date-desc') {
    const list = document.getElementById('notesList');
    if (!list) return; // 🛡️ Blindaje crítico: si el contenedor de notas no existe en el DOM, sale sin romper la app

    if (!app.notes.length) { 
      list.innerHTML = '<div class="empty-state"><h3>Sin notas</h3><p>Crea tu primera nota para empezar.</p></div>'; 
      return; 
    }

    let filtered = app.notes.filter(n => n.title.toLowerCase().includes(query) || n.text.toLowerCase().includes(query));
    
    if (sortVal === 'date-desc') filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    else if (sortVal === 'date-asc') filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    else if (sortVal === 'title-asc') filtered.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortVal === 'title-desc') filtered.sort((a, b) => b.title.localeCompare(a.title));

    let html = '<h3>Notas guardadas' + (filtered.length ? ` (${filtered.length})` : '') + '</h3><ul style="list-style:none;padding:0;">';
    
    filtered.forEach(n => {
      html += `<li style="margin-bottom:.75rem;padding:1rem;background:rgba(11,19,37,0.8);border-radius:12px;border:1px solid rgba(255,255,255,.06);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap;">
          <strong>${n.title}</strong>
          <span style="font-size:.75rem;color:var(--text-muted);">${new Date(n.date).toLocaleString()}</span>
        </div>
        <p style="margin:.5rem 0;color:var(--text-muted);">${n.text}</p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
          <button onclick="editNote(${n.id})" class="btn btn-secondary" style="padding:.25rem .75rem;font-size:.75rem;">Editar</button>
          <button onclick="deleteNote(${n.id})" class="btn btn-secondary" style="padding:.25rem .75rem;font-size:.75rem;">Eliminar</button>
        </div>
      </li>`;
    });
    
    html += '</ul>'; 
    list.innerHTML = html;
  }

  /* ======= RESUMEN / IA / TTS ======= */
  function saveApiKey(val) { localStorage.setItem('ep_apikey', val); app.apiKey = val; }
  function resumirLocal() {
    const t = document.getElementById('resText').value; const out = document.getElementById('resOutput');
    if (!t) { out.innerHTML = '<div class="empty-state"><h3>Sin texto</h3><p>Ingresa contenido para generar un resumen.</p></div>'; return; }
    const words = t.split(/\s+/).filter(w => w.length > 4);
    const keywords = [...new Set(words)].slice(0, 12).join(', ');
    out.innerHTML = `<h4 style="margin-bottom:.5rem;color:var(--primary);">Resumen local (palabras clave)</h4>
      <p style="line-height:1.7;"><strong>Palabras clave extraídas:</strong> ${keywords}</p>
      <p style="margin-top:.5rem;color:var(--text-muted);font-size:.9rem;">Nota: para un análisis avanzado, agrega una API Key.</p>`;
  }
  async function resumirIA() {
    const t = document.getElementById('resText').value; const out = document.getElementById('resOutput');
    if (!t) { out.innerHTML = '<div class="empty-state"><h3>Sin texto</h3><p>Ingresa contenido para generar un resumen.</p></div>'; return; }
    out.innerHTML = '<p>Generando con IA (servicio gratuito sin key)...</p>';
    try {
      // Intento con Hugging Face (público, sin token obligatorio para modelos pequeños)
      const res = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: t.slice(0, 1000), parameters: { max_length: 150, do_sample: false } })
      });
      if (!res.ok) throw new Error('Servicio gratuito no disponible (status ' + res.status + ')');
      const data = await res.json();
      const summary = (Array.isArray(data) && data[0] && data[0].summary_text) ? data[0].summary_text : (data.summary_text || data.generated_text || 'Resumen recibido.');
      out.innerHTML = `<h4 style="margin-bottom:.5rem;color:var(--primary);">Resumen con IA (gratis)</h4><p style="line-height:1.7;">${summary}</p>`;
      toast('Resumen generado con servicio gratuito'); app.addLog('Resumen IA (gratis)');
    } catch (e) {
      resumirLocalMejorado();
      out.insertAdjacentHTML('beforeend', `<p style="color:var(--warn);margin-top:.75rem;font-weight:600;">Servicio gratuito temporalmente no disponible (${e.message}). Se usó resumen local avanzado.</p>`);
    }
  }
  function resumirLocalMejorado() {
    const t = document.getElementById('resText').value; const out = document.getElementById('resOutput');
    if (!t) return;
    const sentences = t.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20 && s.split(' ').length > 3);
    const selected = sentences.slice(0, 4).join('. ') + (sentences.length ? '.' : '');
    const words = t.split(/\s+/).filter(w => w.length > 4);
    const keywords = [...new Set(words)].slice(0, 15).join(', ');
    out.innerHTML = `<h4 style="margin-bottom:.5rem;color:var(--primary);">Resumen local avanzado</h4>
      <p style="line-height:1.7;font-weight:600;color:var(--text);">${selected || 'Texto original resumido por extracción.'}</p>
      <p style="margin-top:.75rem;color:var(--text-muted);font-size:.9rem;"><strong>Palabras clave:</strong> ${keywords}</p>
      <p style="font-size:.8rem;color:var(--text-muted);">Nota: para análisis con IA externa se requiere API Key.</p>`;
  }
  function crearFlashcardsAuto() {
    const t = document.getElementById('resText').value; const out = document.getElementById('resOutput');
    if (!t) return out.innerHTML = '<div class="empty-state"><h3>Sin texto</h3><p>Ingresa contenido primero.</p></div>';
    const sentences = t.split('.').map(s => s.trim()).filter(s => s.length > 10);
    const cards = sentences.slice(0, 5).map(s => ({ id: Date.now() + Math.random(), front: s.slice(0, 80) || s, back: s.slice(80) || s }));
    const name = 'Auto-' + new Date().toISOString().slice(0, 10);
    if (!app.decks[name]) app.decks[name] = [];
    cards.forEach(c => app.decks[name].push(c)); Storage.save('ep_decks', app.decks);
    out.innerHTML = `<p style="font-weight:700;color:var(--primary);">Creadas ${cards.length} flashcards en mazo "${name}".</p>`;
    toast('Flashcards creadas'); app.addLog('Flashcards creadas automáticamente');
  }

  /* ======= FILE IMPORTER ======= */
  function importTextFile(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const text = ev.target.result; toast('Archivo cargado: ' + file.name); document.getElementById('resText').value = text; };
    reader.readAsText(file);
  }
  function dropFile(e) {
    e.preventDefault(); const files = e.dataTransfer.files;
    if (files.length > 0) { document.getElementById('txtFile').files = files; importTextFile(document.getElementById('txtFile')); }
  }

  /* ======= TTS ======= */
  let speechUtterance = null; let synthesis = window.speechSynthesis || null;
  function setSpeechRate(val) { if (speechUtterance) speechUtterance.rate = parseFloat(val); }
  function speakSummary() {
    const text = document.getElementById('resOutput').innerText || document.getElementById('resText').value;
    if (!text || !text.trim()) return toast('No hay texto para leer', 'warn');
    if (!synthesis) return toast('Speech API no disponible', 'warn');
    stopSpeech();
    speechUtterance = new SpeechSynthesisUtterance(text); speechUtterance.lang = 'es-ES';
    speechUtterance.rate = parseFloat(document.getElementById('speechRate').value); speechUtterance.pitch = 1;
    synthesis.speak(speechUtterance); toast('Reproduciendo audio...'); app.addLog('Audio reproducido');
  }
  function pauseSpeech() { if (synthesis && synthesis.speaking) { synthesis.pause(); toast('Audio pausado'); } }
  function stopSpeech() { if (synthesis) { synthesis.cancel(); speechUtterance = null; toast('Audio detenido'); } }

  /* ======= EXPORT MD ======= */
  function exportMarkdown() {
    const notes = app.notes; let md = '# Notas de Estudio JStudy\n\n';
    notes.forEach(n => { md += `## ${n.title}\n`; md += `Fecha: ${new Date(n.date).toLocaleString()}\n\n`; md += `${n.text}\n\n`; md += '---\n\n'; });
    const blob = new Blob([md], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'estudio-pro-notas.md'; a.click(); toast('Exportado Markdown (.md)');
  }

  /* ======= PROGRESO ======= */
  /* ======= PROGRESO ======= */
  function renderDashboard() {
    const statSesiones = document.getElementById('stat-sesiones');
    if (!statSesiones) return; // 🛡️ Blindaje crítico: si el dashboard no está activo o visible en el DOM, sale sin romper la app

    statSesiones.textContent = app.stats.sessions;
    
    const statStreak = document.getElementById('stat-streak');
    if (statStreak) statStreak.textContent = app.stats.streak + ' días';
    
    const statTiempo = document.getElementById('stat-tiempo');
    if (statTiempo) statTiempo.textContent = app.stats.minutes + ' min';
    
    const statCards = document.getElementById('stat-cards');
    if (statCards) statCards.textContent = app.stats.cardsMastered;
    
    const pct = app.stats.quizTotal > 0 ? Math.round((app.stats.quizCorrect / app.stats.quizTotal) * 100) : 0;
    const statQuiz = document.getElementById('stat-quiz');
    if (statQuiz) statQuiz.textContent = pct + '%';
    
    const statNotas = document.getElementById('stat-notas');
    if (statNotas) statNotas.textContent = app.notes.length;
    
    const statPendientes = document.getElementById('stat-pendientes');
    if (statPendientes) statPendientes.textContent = app.cardsPendingToday();
    
    const streakSidebar = document.getElementById('streak-sidebar');
    if (streakSidebar) streakSidebar.textContent = 'Racha: ' + app.stats.streak + ' días';
    
    const minutesSidebar = document.getElementById('minutes-sidebar');
    if (minutesSidebar) minutesSidebar.textContent = 'Hoy: ' + app.stats.minutes + ' min';
    
    const log = Storage.load('ep_log') || [];
    const tbody = document.getElementById('activity-log');
    if (tbody) {
      tbody.innerHTML = log.map(l => `<tr><td>${l.event}</td><td>${new Date(l.date).toLocaleString()}</td></tr>`).join('');
    }
  }

  /* ======= TOUR / ONBOARDING ======= */
  const tourSteps = [
    { selector: '#mainTabsNav', title: 'Navegación', text: 'Usa estas pestañas para moverte entre funciones.' },
    { selector: '#deckFormBox', title: 'Mazos', text: 'Crea mazos con repetición espaciada (Leitner: Difícil=Hoy, Bueno=+3d, Fácil=+7d).' },
    { selector: '#pomodoroBox', title: 'Pomodoro', text: 'Temporiza sesiones con descanso inteligente.' },
    { selector: '#notesBox', title: 'Notas', text: 'Guarda notas con fecha/hora persistentes.' },
    { selector: '#aiResumenBox', title: 'Resumidor / IA', text: 'Genera resúmenes, crea flashcards automáticas, importa archivos, escucha con TTS.' },
    { selector: '#panel-progreso', title: 'Dashboard', text: 'Revisa sesiones, racha, tiempo acumulado, precisión, notas y pendencias hoy.' },
  ];
  let tourIndex = 0;
  function startTour() {
    document.getElementById('welcomeOverlay').classList.add('hidden');
    localStorage.setItem('ep_tour_started', 'true');
    document.getElementById('spotlightOverlay').style.display = 'block';
    document.getElementById('tourExitBtn').style.display = 'inline-block';
    showTourStep(0);
  }
  function skipWelcome() {
    document.getElementById('welcomeOverlay').classList.add('hidden');
    localStorage.setItem('ep_tour_completed', 'true');
  }
  function getPanelForSelector(sel) {
    if (sel === '#mainTabsNav' || sel === '.tabs') return 'mazos';
    if (sel === '#deckFormBox' || sel === '#deckName' || sel === '#studyArea') return 'mazos';
    if (sel === '#pomodoroBox' || sel === '#timer') return 'pomodoro';
    if (sel === '#notesBox' || sel === '#noteTitle') return 'notas';
    if (sel === '#aiResumenBox' || sel === '#resText') return 'resumen';
    if (sel === '#panel-progreso' || sel === '#dashboardStatsGrid') return 'progreso';
    return null;
  }
  function showTourStep(i) {
    if (i >= tourSteps.length) { exitTour(); return; }
    tourIndex = i;
    const step = tourSteps[i];
    const panelName = getPanelForSelector(step.selector);
    if (panelName) { showTab(panelName); }
    setTimeout(() => {
      const el = document.querySelector(step.selector);
      if (!el) {
        setTimeout(() => {
          const elRetry = document.querySelector(step.selector);
          if (elRetry) {
            elRetry.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              const rectRetry = elRetry.getBoundingClientRect();
              const overlayRetry = document.getElementById('spotlightOverlay');
              overlayRetry.style.display = 'block'; overlayRetry.style.background = 'none';
              let spotRetry = document.getElementById('spotlightRect');
              if (!spotRetry) {
                spotRetry = document.createElement('div'); spotRetry.id = 'spotlightRect';
                spotRetry.style.position = 'fixed'; spotRetry.style.zIndex = '2499'; spotRetry.style.pointerEvents = 'none';
                spotRetry.style.border = '2px solid rgba(0,240,255,0.6)'; spotRetry.style.borderRadius = '16px';
                spotRetry.style.boxShadow = '0 0 0 9999px rgba(4,8,18,0.82), 0 0 40px rgba(0,240,255,0.15)';
                spotRetry.style.transition = 'all .35s ease'; document.body.appendChild(spotRetry);
              }
              spotRetry.style.width = rectRetry.width + 'px'; spotRetry.style.height = rectRetry.height + 'px';
              spotRetry.style.left = rectRetry.left + 'px'; spotRetry.style.top = rectRetry.top + 'px'; spotRetry.style.display = 'block';
              const oldBubbleRetry = document.getElementById('tourBubble'); if (oldBubbleRetry) oldBubbleRetry.remove();
              const bubbleRetry = document.createElement('div'); bubbleRetry.id = 'tourBubble'; bubbleRetry.className = 'tour-bubble';
              const isFirstRetry = i === 0; const isLastRetry = i === tourSteps.length - 1;
              bubbleRetry.innerHTML = `<h4>${step.title}</h4><p>${step.text}</p>
                <div style="margin-top:1rem;display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;">
                  <button onclick="prevTourStep()" ${isFirstRetry ? 'disabled' : ''} class="btn btn-secondary" style="padding:.4rem .8rem;font-size:.8rem;opacity:${isFirstRetry ? '0.4' : '1'};cursor:${isFirstRetry ? 'default' : 'pointer'};">← Anterior</button>
                  <span style="font-size:.8rem;color:var(--text-muted);font-weight:600;">Paso ${i + 1} de ${tourSteps.length}</span>
                  <button onclick="nextTourStep()" class="btn btn-secondary" style="padding:.4rem .8rem;font-size:.8rem;">${isLastRetry ? 'Finalizar' : 'Siguiente →'}</button>
                </div>`;
              document.body.appendChild(bubbleRetry); positionBubble(bubbleRetry, rectRetry);
            }, 250);
          } else { showTourStep(i + 1); }
        }, 300);
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        let spot = document.getElementById('spotlightRect');
        if (!spot) { spot = document.createElement('div'); spot.id = 'spotlightRect'; spot.style.position = 'fixed'; spot.style.zIndex = '2499'; spot.style.pointerEvents = 'none'; spot.style.border = '2px solid rgba(0,240,255,0.6)'; spot.style.borderRadius = '16px'; spot.style.boxShadow = '0 0 0 9999px rgba(4,8,18,0.82), 0 0 40px rgba(0,240,255,0.15)'; spot.style.transition = 'all .35s ease'; document.body.appendChild(spot); }
        spot.style.width = rect.width + 'px'; spot.style.height = rect.height + 'px'; spot.style.left = rect.left + 'px'; spot.style.top = rect.top + 'px'; spot.style.display = 'block';
        document.getElementById('spotlightOverlay').style.display = 'block';
        const oldBubble = document.getElementById('tourBubble'); if (oldBubble) oldBubble.remove();
        const bubble = document.createElement('div'); bubble.id = 'tourBubble'; bubble.className = 'tour-bubble';
        const isFirst = i === 0; const isLast = i === tourSteps.length - 1;
        bubble.innerHTML = `<h4>${step.title}</h4><p>${step.text}</p>
          <div style="margin-top:1rem;display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;">
            <button onclick="prevTourStep()" ${isFirst ? 'disabled' : ''} class="btn btn-secondary" style="padding:.4rem .8rem;font-size:.8rem;opacity:${isFirst ? '0.4' : '1'};cursor:${isFirst ? 'default' : 'pointer'};">← Anterior</button>
            <span style="font-size:.8rem;color:var(--text-muted);font-weight:600;">Paso ${i + 1} de ${tourSteps.length}</span>
            <button onclick="nextTourStep()" class="btn btn-secondary" style="padding:.4rem .8rem;font-size:.8rem;">${isLast ? 'Finalizar' : 'Siguiente →'}</button>
          </div>`;
        document.body.appendChild(bubble); positionBubble(bubble, rect);
      }, 250);
    }, 150);
  }
  function positionBubble(bubble, rect) {
    const gap = 20; const bw = 360; const bh = 160; const iw = window.innerWidth; const ih = window.innerHeight;
    const candidates = [
      { left: rect.left + rect.width / 2 - bw / 2, top: rect.bottom + gap, fits: () => (rect.bottom + gap + bh <= ih - 16) },
      { left: rect.left + rect.width / 2 - bw / 2, top: rect.top - bh - gap, fits: () => (rect.top - gap - bh >= 16) },
      { left: rect.right + gap, top: rect.top + rect.height / 2 - bh / 2, fits: () => (rect.right + gap + bw <= iw - 16 && rect.top + rect.height / 2 - bh / 2 >= 16) },
      { left: rect.left - bw - gap, top: rect.top + rect.height / 2 - bh / 2, fits: () => (rect.left - gap - bw >= 16 && rect.top + rect.height / 2 - bh / 2 >= 16) },
    ];
    let chosen = candidates.find(c => c.fits());
    let left = chosen ? chosen.left : Math.max(16, (iw - bw) / 2);
    let top = chosen ? chosen.top : Math.max(20, ih - bh - 20);
    left = Math.max(16, Math.min(left, iw - bw - 16)); top = Math.max(16, Math.min(top, ih - bh - 16));
    bubble.style.position = 'fixed'; bubble.style.zIndex = '2600'; bubble.style.left = left + 'px'; bubble.style.top = top + 'px';
  }
  function nextTourStep() { showTourStep(tourIndex + 1); }
  function prevTourStep() { if (tourIndex > 0) showTourStep(tourIndex - 1); }
  function exitTour() {
    document.getElementById('spotlightOverlay').style.display = 'none';
    document.getElementById('tourExitBtn').style.display = 'none';
    const old = document.getElementById('tourBubble'); if (old) old.remove();
    const spot = document.getElementById('spotlightRect'); if (spot) spot.remove();
    localStorage.setItem('ep_tour_completed', 'true');
    toast('Guía finalizada');
  }
  
  function restartTour() {
    localStorage.removeItem('ep_tour_completed'); localStorage.removeItem('ep_tour_started');
    setTimeout(() => startTour(), 200);
  }
  

  window.addEventListener('resize', () => {
    if (document.getElementById('tourBubble') && window.tourIndex !== undefined) {
      const step = tourSteps[window.tourIndex]; if (step) {
        const el = document.querySelector(step.selector); if (el) { const rect = el.getBoundingClientRect(); const bubble = document.getElementById('tourBubble'); positionBubble(bubble, rect); }
      }
    }
  });

  function updateQuizCountOptions() {
  const deckSelect = document.getElementById('quizDeckSelect');
  const countSelect = document.getElementById('quizCount');
  if (!deckSelect || !countSelect) return;
  const deckName = deckSelect.value;
  let maxCards = 5;
  if (deckName === 'all') {
    maxCards = Object.values(app.decks).reduce((sum, arr) => sum + arr.length, 0);
  } else {
    maxCards = (app.decks[deckName] ? app.decks[deckName].length : 0) || 5;
  }
  if (maxCards < 1) maxCards = 1;
  countSelect.innerHTML = '';
  for (let i = 1; i <= maxCards; i++) {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = i;
    if (i === Math.min(5, maxCards)) opt.selected = true;
    countSelect.appendChild(opt);
  }
}

function populateQuizDeckSelect() {
  const select = document.getElementById('quizDeckSelect');
  if (!select) return;
  select.innerHTML = '<option value="all">Todos los mazos</option>';
  Object.keys(app.decks).forEach(name => {
    const opt = document.createElement('option'); opt.value = name; opt.textContent = name; select.appendChild(opt);
  });
  updateQuizCountOptions();
}
function triggerQuiz(type) {
  const deck = document.getElementById('quizDeckSelect').value;
  const count = document.getElementById('quizCount').value;
  const diff = document.getElementById('quizDifficultySelect').value;
  startQuiz(type, deck, count, diff);
}
function startQuizConfigured(type) { triggerQuiz(type); }

/* ======= INIT ======= */
/* ======= INIT ======= */
window.addEventListener('load', () => {
  try {
    // Forzar la pestaña inicial de mazos para evitar pantalla blanca
    if (typeof showTab === 'function') {
      showTab('mazos');
    }

    if (typeof renderDeck === 'function') renderDeck();
    if (typeof renderNotes === 'function') renderNotes();
    if (typeof renderDashboard === 'function') renderDashboard(); 
    if (typeof populateQuizDeckSelect === 'function') populateQuizDeckSelect(); 
    if (typeof updateQuizCountOptions === 'function') updateQuizCountOptions(); 

    const apiKeyEl = document.getElementById('apiKey');
    if (apiKeyEl) apiKeyEl.value = localStorage.getItem('ep_apikey') || '';

    const speechRateEl = document.getElementById('speechRate');
    if (speechRateEl) speechRateEl.value = '1';

    const deckNames = Object.keys(app.decks || {});
    const deckDisplay = document.getElementById('deckDisplay');
    if (deckDisplay && (!deckNames.length || (deckNames.length === 1 && app.decks.default && app.decks.default.length === 0))) {
      deckDisplay.innerHTML = '<div class="empty-state"><h3>Sin mazos</h3><p>Crea un mazo para empezar a estudiar con repetición espaciada.</p></div>';
    }

    const welcomeOverlay = document.getElementById('welcomeOverlay');
    if (welcomeOverlay && localStorage.getItem('ep_tour_completed') === 'true') {
      welcomeOverlay.classList.add('hidden');
    }
  } catch (err) {
    console.error("Error durante la inicialización de JStudy:", err);
  }
});
/* ===== EXPONER FUNCIONES AL ÁMBITO GLOBAL ===== */
window.addCard = addCard;
window.deleteCard = deleteCard;
window.editDeckName = editDeckName;
window.deleteDeck = deleteDeck;
window.editCard = editCard;
window.deleteIndividualCard = deleteIndividualCard;
window.renderDeck = renderDeck;
window.startStudy = startStudy;
window.renderStudyCard = renderStudyCard;
window.studyLevel = studyLevel;
window.studyNext = studyNext;
window.studyPrev = studyPrev;
window.startQuiz = startQuiz;
window.triggerQuiz = triggerQuiz;
window.startQuizConfigured = startQuizConfigured;
window.quizSelect = quizSelect;
window.quizShortAnswer = quizShortAnswer;
window.showQuizResults = showQuizResults;
window.updateQuizCountOptions = updateQuizCountOptions;
window.populateQuizDeckSelect = populateQuizDeckSelect;
window.workMinValue = workMinValue;
window.shortMinValue = shortMinValue;
window.longMinValue = longMinValue;
window.applyPomodoroConfig = applyPomodoroConfig;
window.setMode = setMode;
window.startTimer = startTimer;
window.resetTimer = resetTimer;
window.updateTimer = updateTimer;
window.playAlarm = playAlarm;
window.notifyBrowser = notifyBrowser;
window.addNote = addNote;
window.editNote = editNote;
window.deleteNote = deleteNote;
window.filterNotes = filterNotes;
window.sortNotes = sortNotes;
window.renderNotes = renderNotes;
window.saveApiKey = saveApiKey;
window.resumirLocal = resumirLocal;
window.resumirIA = resumirIA;
window.resumirLocalMejorado = resumirLocalMejorado;
window.crearFlashcardsAuto = crearFlashcardsAuto;
window.importTextFile = importTextFile;
window.dropFile = dropFile;
window.speakSummary = speakSummary;
window.pauseSpeech = pauseSpeech;
window.stopSpeech = stopSpeech;
window.setSpeechRate = setSpeechRate;
window.exportMarkdown = exportMarkdown;
window.renderDashboard = renderDashboard;
window.showTab = showTab;
window.startTour = startTour;
window.skipWelcome = skipWelcome;
window.restartTour = restartTour;
window.nextTourStep = nextTourStep;
window.prevTourStep = prevTourStep;
window.exitTour = exitTour;
window.showTourStep = showTourStep;
window.getPanelForSelector = getPanelForSelector;
window.positionBubble = positionBubble;
window.toast = toast;
