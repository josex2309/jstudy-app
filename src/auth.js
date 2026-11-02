/* ===== SISTEMA DE AUTENTICACIÓN JStudy CON FIREBASE AUTH + FIRESTORE ===== */
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import app from './firebase.js';

const auth = getAuth(app);
const db = getFirestore(app);

const CURRENT_KEY = 'ep_current_user';
const SESSION_KEY = 'ep_session_active';

function saveCurrentUser(user) {
  localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_KEY, 'true');
}

function clearCurrentUser() {
  localStorage.removeItem(CURRENT_KEY);
  localStorage.removeItem(SESSION_KEY);
}

function loadCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function isSessionActive() {
  return localStorage.getItem(SESSION_KEY) === 'true' && loadCurrentUser() !== null;
}

/* ===== VALIDACIONES ===== */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  if (!password || password.length < 6) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
}

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: 'Vacía' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ['Débil', 'Débil', 'Media', 'Fuerte', 'Muy fuerte'];
  return { score, label: labels[Math.min(score, 4)] };
}

/* ===== CREAR DOCUMENTO DE USUARIO EN FIRESTORE ===== */
async function createUserProfile(uid, email, displayName) {
  const userRef = doc(db, 'users', uid);
  const userData = {
    email,
    displayName: displayName || email.split('@')[0],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    stats: {
      streak: 0,
      lastStudyDate: null,
      totalStudyTime: 0,
      cardsReviewed: 0,
      correctAnswers: 0,
      quizSessions: 0,
      pomodorosCompleted: 0
    },
    settings: {
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
    }
  };
  await setDoc(userRef, userData);
  return userData;
}

/* ===== REGISTRO CON FIREBASE AUTH + FIRESTORE ===== */
async function registerUser(email, password, displayName) {
  if (!isValidEmail(email)) {
    return { success: false, message: 'Email inválido.' };
  }
  if (!isValidPassword(password)) {
    return { success: false, message: 'Contraseña débil. Mínimo 6 caracteres con letra y número.' };
  }

  try {
    // 1. Crear usuario en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    // 2. Actualizar perfil con displayName
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // 3. Crear documento de usuario en Firestore (esperar a que complete)
    await createUserProfile(user.uid, email, displayName);

    // 4. Guardar sesión local
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.email.split('@')[0],
      createdAt: new Date().toISOString()
    };
    saveCurrentUser(userData);

    return { success: true, message: 'Cuenta creada exitosamente.', user: userData };
  } catch (error) {
    console.error('❌ Error en registro:', error.code, error.message);
    
    // Manejo de errores específicos de Firebase Auth
    const errorMessages = {
      'auth/email-already-in-use': 'Este email ya está registrado.',
      'auth/invalid-email': 'Email inválido.',
      'auth/weak-password': 'Contraseña muy débil (mínimo 6 caracteres).',
      'auth/operation-not-allowed': 'Registro de email/contraseña no habilitado en Firebase Console.',
      'permission-denied': 'Error de permisos en Firestore. Verifica las reglas de seguridad.'
    };
    
    return { 
      success: false, 
      message: errorMessages[error.code] || `Error: ${error.message}` 
    };
  }
}

/* ===== LOGIN CON FIREBASE AUTH ===== */
async function loginUser(email, password) {
  if (!email || !password) {
    return { success: false, message: 'Completa email y contraseña.' };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    // Obtener perfil de Firestore
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    let userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0]
    };

    if (userSnap.exists()) {
      const firestoreData = userSnap.data();
      userData = { ...userData, ...firestoreData };
    }

    saveCurrentUser(userData);
    return { success: true, message: 'Sesión iniciada.', user: userData };
  } catch (error) {
    console.error('❌ Error en login:', error.code, error.message);
    
    const errorMessages = {
      'auth/user-not-found': 'Usuario no encontrado.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-email': 'Email inválido.',
      'auth/user-disabled': 'Cuenta deshabilitada.',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.'
    };
    
    return { 
      success: false, 
      message: errorMessages[error.code] || `Error: ${error.message}` 
    };
  }
}

/* ===== LOGOUT ===== */
async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('⚠️ Error al cerrar sesión en Firebase:', error.message);
  }
  clearCurrentUser();
  return { success: true, message: 'Sesión cerrada.' };
}

/* ===== OBSERVER DE ESTADO DE AUTENTICACIÓN ===== */
function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/* ===== OBTENER USUARIO ACTUAL DE FIREBASE ===== */
function getCurrentFirebaseUser() {
  return auth.currentUser;
}

export {
  auth,
  db,
  registerUser,
  loginUser,
  logoutUser,
  loadCurrentUser,
  saveCurrentUser,
  clearCurrentUser,
  isSessionActive,
  getPasswordStrength,
  isValidEmail,
  isValidPassword,
  onAuthStateChange,
  getCurrentFirebaseUser,
  updateProfile
};