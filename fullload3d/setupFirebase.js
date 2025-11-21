import dotenv from "dotenv";
dotenv.config();

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// ------------ Firebase Config (Node .env) -------------
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Segurança extra para debug:
console.log("🔥 API KEY:", process.env.FIREBASE_API_KEY ? "OK" : "VAZIA!");

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ------------ Criar Usuário Master + Empresa ---------------
async function setup() {
  try {
    // cria usuário
    const cred = await createUserWithEmailAndPassword(
      auth,
      "master@full.com",
      "123456"
    );

    const uid = cred.user.uid;

    // cria empresa padrão
    const empresaRef = doc(db, "empresas", "empresa_master");
    await setDoc(empresaRef, {
      nome: "FullLoad - Matriz",
      criadoEm: new Date(),
    });

    // cria usuario master no firestore
    await setDoc(doc(db, "usuarios", uid), {
      nome: "Administrador Master",
      email: "master@full.com",
      role: "master",
      empresaId: "empresa_master",
    });

    console.log("✔ Usuário master criado com sucesso!");
    console.log("UID:", uid);

  } catch (err) {
    console.error("❌ ERRO:", err);
  }
}

setup();
