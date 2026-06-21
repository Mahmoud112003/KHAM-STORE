// استيراد الدوال الأساسية من Firebase باستخدام الـ CDN للمشاريع العادية (Modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// بيانات مشروعك الخاصة بمتجر KHAM
const firebaseConfig = {
  apiKey: "AIzaSyC0ArX-oPNeBdxjc10W6dKHciFvgUeeAag",
  authDomain: "kham-4ee7c.firebaseapp.com",
  projectId: "kham-4ee7c",
  storageBucket: "kham-4ee7c.firebasestorage.app",
  messagingSenderId: "1069184239130",
  appId: "1:1069184239130:web:cf2ae86bd6bdb9549333a3",
  measurementId: "G-W1K5P5TSDK"
};

// تهيئة الفايربيز
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// تصدير الأدوات عشان نستخدمها في ملفات الـ JS التانية للمنتجات والأدمن
export { auth, db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc };