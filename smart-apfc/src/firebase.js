import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDrzgH1VpjjLn9m0q9oeSpNJXfvy5W1Ogo",
  authDomain: "apfc-v01.firebaseapp.com",
  databaseURL: "https://apfc-v01-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "apfc-v01",
  storageBucket: "apfc-v01.firebasestorage.app",
  messagingSenderId: "167236210114",
  appId: "1:167236210114:web:950be5da44103e62d05a5b"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);