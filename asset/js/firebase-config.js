
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0ArX-oPNeBdxjc10W6dKHciFvgUeeAag",
  authDomain: "kham-4ee7c.firebaseapp.com",
  projectId: "kham-4ee7c",
  storageBucket: "kham-4ee7c.firebasestorage.app",
  messagingSenderId: "1069184239130",
  appId: "1:1069184239130:web:cf2ae86bd6bdb9549333a3",
  measurementId: "G-W1K5P5TSDK"
};

const vapidKey =
  "BLaksbdT8GxEzjY3jVCxMczdpdOFQvjVCQfTW0i-rIu4OhFvHYJdNtMOiLyVzUUgNlYLMSAA21DgyYa8a1UMzFQ";

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

export {
  app,
  auth,
  db,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  vapidKey
};
