import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBdoIkIODoCGbt69s92VmEm-44TbyKQ7o8",
  authDomain: "estudio-pro-5b10b.firebaseapp.com",
  projectId: "estudio-pro-5b10b",
  storageBucket: "estudio-pro-5b10b.firebasestorage.app",
  messagingSenderId: "936739722127",
  appId: "1:936739722127:web:5c052001fdbf903c12f1fa"
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export async function enableOfflinePersistence() {
  try {
    await enableIndexedDbPersistence(db);
    console.log('✅ Persistencia offline de Firestore habilitada');
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Múltiples pestañas abiertas, persistencia solo en una');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Navegador no soporta persistencia offline');
    } else {
      console.error('❌ Error habilitando persistencia:', err);
    }
  }
}

export default app;
