import './style.css';
import { db, enableOfflinePersistence } from './firebase.js';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

await enableOfflinePersistence();

const STORAGE_KEY = 'jstudy_data_v1';
const SYNC_QUEUE_KEY = 'jstudy_sync_queue_v1';

class AppData {
  constructor() {
    this.decks = [];
    this.cards = [];
    this.notes = [];
    this.stats = {
      streak: 0,
      lastStudyDate: null,
      totalStudyTime: 0,
      cardsReviewed: 0,
      correctAnswers: 0,
      quizSessions: 0,
      pomodorosCompleted: 0
    };
    this.settings = {
      pomodoroWork: 25,
      pomodoroShortBreak: 5,
      pomodoroLongBreak: 15,
      pomodoroCycles: 4,
      autoPlayAudio: false,
      ttsVoice: '',
      ttsRate: 1,
      ttsPitch: 1,
      theme: 'dark',
      aiProvider: 'local',
      aiApiKey: ''
    };
    this.currentView = 'dashboard';
    this.currentDeckId = null;
    this.currentCardIndex = 0;
    this.quizState = null;
    this.pomodoroState = {
      isRunning: false,
      isWork: true,
      currentCycle: 1,
      timeLeft: 25 * 60,
      timerId: null
    };
    this.listeners = new Map();
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.lastSync = null;
    this.pendingWrites = new Set();
  }

  async init() {
    await this.loadFromLocalStorage();
    this.setupOnlineListener();
    await this.syncFromFirestore();
    this.startPeriodicSync();
    this.notify('initialized');
  }

  setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.decks = parsed.decks || [];
        this.cards = parsed.cards || [];
        this.notes = parsed.notes || [];
        this.stats = { ...this.stats, ...parsed.stats };
        this.settings = { ...this.settings, ...parsed.settings };
        this.lastSync = parsed.lastSync || null;
      }
      const queue = localStorage.getItem(SYNC_QUEUE_KEY);
      if (queue) {
        this.syncQueue = JSON.parse(queue);
      }
    } catch (e) {
      console.error('Error cargando localStorage:', e);
    }
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        decks: this.decks,
        cards: this.cards,
        notes: this.notes,
        stats: this.stats,
        settings: this.settings,
        lastSync: this.lastSync
      }));
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (e) {
      console.error('Error guardando localStorage:', e);
    }
  }

  async syncFromFirestore() {
    if (!this.isOnline) return;

    try {
      const [decksSnap, cardsSnap, notesSnap, statsSnap, settingsSnap] = await Promise.all([
        getDocs(collection(db, 'decks')),
        getDocs(collection(db, 'cards')),
        getDocs(collection(db, 'notes')),
        getDoc(doc(db, 'meta', 'stats')),
        getDoc(doc(db, 'meta', 'settings'))
      ]);

      const serverDecks = decksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const serverCards = cardsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const serverNotes = notesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const serverStats = statsSnap.exists() ? statsSnap.data() : null;
      const serverSettings = settingsSnap.exists() ? settingsSnap.data() : null;

      this.mergeData(serverDecks, serverCards, serverNotes, serverStats, serverSettings);
      this.lastSync = Date.now();
      this.saveToLocalStorage();
      this.notify('synced');
    } catch (e) {
      console.error('Error sincronizando desde Firestore:', e);
    }
  }

  mergeData(serverDecks, serverCards, serverNotes, serverStats, serverSettings) {
    const mergeArray = (local, server, key = 'id') => {
      const serverMap = new Map(server.map(item => [item[key], item]));
      const localMap = new Map(local.map(item => [item[key], item]));

      const merged = [];
      for (const [id, serverItem] of serverMap) {
        const localItem = localMap.get(id);
        if (!localItem || (serverItem.updatedAt && localItem.updatedAt && serverItem.updatedAt > localItem.updatedAt)) {
          merged.push(serverItem);
        } else {
          merged.push(localItem);
        }
      }
      for (const [id, localItem] of localMap) {
        if (!serverMap.has(id)) merged.push(localItem);
      }
      return merged;
    };

    this.decks = mergeArray(this.decks, serverDecks);
    this.cards = mergeArray(this.cards, serverCards);
    this.notes = mergeArray(this.notes, serverNotes);

    if (serverStats) this.stats = { ...this.stats, ...serverStats };
    if (serverSettings) this.settings = { ...this.settings, ...serverSettings };
  }

  queueWrite(operation) {
    this.syncQueue.push({ ...operation, timestamp: Date.now() });
    this.saveToLocalStorage();
    if (this.isOnline) this.processSyncQueue();
  }

  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const op of queue) {
      try {
        await this.executeWrite(op);
      } catch (e) {
        console.error('Error en sync queue:', e);
        this.syncQueue.unshift(op);
        break;
      }
    }
    this.saveToLocalStorage();
  }

  async executeWrite(op) {
    const { type, collection: coll, id, data } = op;
    const ref = doc(db, coll, id);

    switch (type) {
      case 'set':
        await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
        break;
      case 'update':
        await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        break;
      case 'delete':
        await deleteDoc(ref);
        break;
    }
  }

  startPeriodicSync() {
    setInterval(() => {
      if (this.isOnline) this.syncFromFirestore();
    }, 60000);
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  notify(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  getDeck(id) {
    return this.decks.find(d => d.id === id);
  }

  getCardsByDeck(deckId) {
    return this.cards.filter(c => c.deckId === deckId);
  }

  getDueCards(deckId) {
    const now = Date.now();
    return this.cards.filter(c => c.deckId === deckId && c.dueDate <= now);
  }

  getTotalDueToday() {
    const now = Date.now();
    return this.cards.filter(c => c.dueDate <= now).length;
  }

  async createDeck(name, description = '') {
    const id = crypto.randomUUID();
    const deck = { id, name, description, createdAt: Date.now(), updatedAt: Date.now() };
    this.decks.push(deck);
    this.queueWrite({ type: 'set', collection: 'decks', id, data: deck });
    this.saveToLocalStorage();
    this.notify('decksChanged');
    return deck;
  }

  async updateDeck(id, data) {
    const idx = this.decks.findIndex(d => d.id === id);
    if (idx >= 0) {
      this.decks[idx] = { ...this.decks[idx], ...data, updatedAt: Date.now() };
      this.queueWrite({ type: 'update', collection: 'decks', id, data: this.decks[idx] });
      this.saveToLocalStorage();
      this.notify('decksChanged');
    }
  }

  async deleteDeck(id) {
    this.decks = this.decks.filter(d => d.id !== id);
    this.cards = this.cards.filter(c => c.deckId !== id);
    this.queueWrite({ type: 'delete', collection: 'decks', id });
    this.cards.forEach(c => {
      if (c.deckId === id) this.queueWrite({ type: 'delete', collection: 'cards', id: c.id });
    });
    this.saveToLocalStorage();
    this.notify('decksChanged');
    this.notify('cardsChanged');
  }

  async createCard(deckId, front, back, tags = []) {
    const id = crypto.randomUUID();
    const card = {
      id,
      deckId,
      front,
      back,
      tags,
      box: 1,
      dueDate: Date.now(),
      interval: 0,
      ease: 2.5,
      reviews: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.cards.push(card);
    this.queueWrite({ type: 'set', collection: 'cards', id, data: card });
    this.saveToLocalStorage();
    this.notify('cardsChanged');
    return card;
  }

  async updateCard(id, data) {
    const idx = this.cards.findIndex(c => c.id === id);
    if (idx >= 0) {
      this.cards[idx] = { ...this.cards[idx], ...data, updatedAt: Date.now() };
      this.queueWrite({ type: 'update', collection: 'cards', id, data: this.cards[idx] });
      this.saveToLocalStorage();
      this.notify('cardsChanged');
    }
  }

  async deleteCard(id) {
    this.cards = this.cards.filter(c => c.id !== id);
    this.queueWrite({ type: 'delete', collection: 'cards', id });
    this.saveToLocalStorage();
    this.notify('cardsChanged');
  }

  reviewCard(cardId, quality) {
    const card = this.cards.find(c => c.id === cardId);
    if (!card) return;

    const { box, interval, ease } = this.leitnerAlgorithm(card.box, card.interval, card.ease, quality);
    const dueDate = Date.now() + interval * 24 * 60 * 60 * 1000;

    this.updateCard(cardId, {
      box,
      interval,
      ease,
      dueDate,
      reviews: card.reviews + 1,
      lastReview: Date.now()
    });

    this.stats.cardsReviewed++;
    if (quality >= 3) this.stats.correctAnswers++;
    this.updateStats();
  }

  leitnerAlgorithm(box, interval, ease, quality) {
    let newBox = box;
    let newInterval = interval;
    let newEase = ease;

    if (quality >= 3) {
      if (box === 1) newInterval = 1;
      else if (box === 2) newInterval = 3;
      else if (box === 3) newInterval = 7;
      else if (box === 4) newInterval = 14;
      else newInterval = Math.round(interval * ease);

      newBox = Math.min(box + 1, 5);
      newEase = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    } else {
      newBox = 1;
      newInterval = 0;
      newEase = Math.max(1.3, ease - 0.2);
    }

    return { box: newBox, interval: newInterval, ease: newEase };
  }

  async createNote(title, content, tags = []) {
    const id = crypto.randomUUID();
    const note = { id, title, content, tags, createdAt: Date.now(), updatedAt: Date.now() };
    this.notes.push(note);
    this.queueWrite({ type: 'set', collection: 'notes', id, data: note });
    this.saveToLocalStorage();
    this.notify('notesChanged');
    return note;
  }

  async updateNote(id, data) {
    const idx = this.notes.findIndex(n => n.id === id);
    if (idx >= 0) {
      this.notes[idx] = { ...this.notes[idx], ...data, updatedAt: Date.now() };
      this.queueWrite({ type: 'update', collection: 'notes', id, data: this.notes[idx] });
      this.saveToLocalStorage();
      this.notify('notesChanged');
    }
  }

  async deleteNote(id) {
    this.notes = this.notes.filter(n => n.id !== id);
    this.queueWrite({ type: 'delete', collection: 'notes', id });
    this.saveToLocalStorage();
    this.notify('notesChanged');
  }

  searchNotes(query) {
    const q = query.toLowerCase();
    return this.notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  sortNotes(notes, sortBy = 'updatedAt', order = 'desc') {
    return [...notes].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === 'title') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      return order === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }

  exportNotesToMarkdown(notes = this.notes) {
    return notes.map(n => `## ${n.title}\n\n${n.content}\n\n---\n*Tags: ${n.tags.join(', ')}*`).join('\n\n');
  }

  updateStats() {
    this.queueWrite({ type: 'update', collection: 'meta', id: 'stats', data: this.stats });
    this.saveToLocalStorage();
    this.notify('statsChanged');
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.queueWrite({ type: 'update', collection: 'meta', id: 'settings', data: this.settings });
    this.saveToLocalStorage();
    this.notify('settingsChanged');
    if (newSettings.theme) this.applyTheme(newSettings.theme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  recordStudySession() {
    const today = new Date().toDateString();
    if (this.stats.lastStudyDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      this.stats.streak = this.stats.lastStudyDate === yesterday ? this.stats.streak + 1 : 1;
      this.stats.lastStudyDate = today;
      this.updateStats();
    }
  }

  addStudyTime(minutes) {
    this.stats.totalStudyTime += minutes;
    this.updateStats();
  }

  completePomodoro() {
    this.stats.pomodorosCompleted++;
    this.addStudyTime(this.settings.pomodoroWork);
    this.updateStats();
  }

  async importFromText(text, deckId) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const cards = [];

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        cards.push(this.createCard(deckId, parts[0], parts[1], parts.slice(2).map(t => t.trim())));
      }
    }
    return cards;
  }

  generateQuizQuestions(deckId, count = 10, types = ['multiple', 'truefalse', 'short']) {
    const deckCards = this.getCardsByDeck(deckId);
    if (deckCards.length === 0) return [];

    const shuffled = [...deckCards].sort(() => Math.random() - 0.5).slice(0, count);
    return shuffled.map(card => {
      const type = types[Math.floor(Math.random() * types.length)];
      let question, options, answer;

      if (type === 'multiple') {
        const otherCards = deckCards.filter(c => c.id !== card.id).sort(() => Math.random() - 0.5).slice(0, 3);
        options = [card.back, ...otherCards.map(c => c.back)].sort(() => Math.random() - 0.5);
        question = `¿Cuál es la respuesta correcta para: "${card.front}"?`;
        answer = card.back;
      } else if (type === 'truefalse') {
        const isTrue = Math.random() > 0.5;
        question = isTrue
          ? `Verdadero o Falso: "${card.front}" → "${card.back}"`
          : `Verdadero o Falso: "${card.front}" → "${deckCards[Math.floor(Math.random() * deckCards.length)].back}"`;
        options = ['Verdadero', 'Falso'];
        answer = isTrue ? 'Verdadero' : 'Falso';
      } else {
        question = `Respuesta corta: ${card.front}`;
        options = [];
        answer = card.back;
      }

      return { id: crypto.randomUUID(), cardId: card.id, type, question, options, answer, userAnswer: null };
    });
  }

  async exportAllData() {
    return {
      decks: this.decks,
      cards: this.cards,
      notes: this.notes,
      stats: this.stats,
      settings: this.settings,
      exportedAt: new Date().toISOString()
    };
  }
}

export const appData = new AppData();