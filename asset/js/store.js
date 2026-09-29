// 1. استيراد إعدادات الفايربيز والدوال المطلوبة للتعامل مع Firestore
import { db, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from './firebase-config.js';

// =========================================================================
// 2. دالات المنتجات المربوطة بالفايربيز (Firebase Firestore Functions)
// =========================================================================

// جلب جميع المنتجات من الفايربيز
export async function getProducts() {
    try {
        console.time("Firebase Products");

        const querySnapshot = await getDocs(collection(db, "products"));

        console.timeEnd("Firebase Products");

        let products = [];

        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        return products;
    } catch (error) {
        console.error(error);
        return [];
    }
}

// إضافة منتج جديد للفايربيز
export async function addProduct(product) {
    try {
        const docRef = await addDoc(collection(db, "products"), product);
        console.log("تم إضافة المنتج بنجاح بمعرف:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("خطأ أثناء إضافة المنتج للفايربيز:", error);
        throw error;
    }
}

// جلب منتج واحد معين بالـ ID (مهم جداً لصفحة التفاصيل details.js)
export async function getProductById(id) {
    try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.warn("المنتج غير موجود في قاعدة البيانات!");
            return null;
        }
    } catch (error) {
        console.error("خطأ في جلب تفاصيل المنتج:", error);
        return null;
    }
}

// تعديل بيانات منتج موجود بالـ ID
export async function updateProduct(id, data) {
    try {
        const docRef = doc(db, "products", id);
        await updateDoc(docRef, data);
        console.log("تم تحديث المنتج بنجاح:", id);
    } catch (error) {
        console.error("خطأ في تحديث المنتج:", error);
        throw error;
    }
}

// مسح منتج نهائياً بالـ ID
export async function deleteProduct(id) {
    try {
        const docRef = doc(db, "products", id);
        await deleteDoc(docRef);
        console.log("تم مسح المنتج بنجاح:", id);
    } catch (error) {
        console.error("خطأ في مسح المنتج:", error);
        throw error;
    }
}

// تغيير حالة المنتج (متوفر / نفذت الكمية)
export async function toggleProductStatus(id, currentStatus) {
    try {
        const docRef = doc(db, "products", id);
        const newStatus = currentStatus === "in-stock" ? "out-of-stock" : "in-stock";
        await updateDoc(docRef, { status: newStatus });
        console.log("تم تغيير حالة المنتج بنجاح إلى:", newStatus);
    } catch (error) {
        console.error("خطأ في تغيير حالة المنتج:", error);
    }
}

// =========================================================================
// 3. دالات الفلاتر والإحصائيات (مستمعة للـ Firebase الآن)
// =========================================================================

export async function getSections() {
    const products = await getProducts();
    const sections = new Set(products.map(p => p.section).filter(Boolean));
    return [...sections];
}

export async function getSoldOutProducts() {
    const products = await getProducts();
    return products.filter(isProductCompletelySoldOut);
}

export async function getInStockProducts() {
    const products = await getProducts();
    return products.filter(p => !isProductCompletelySoldOut(p));
}

function hasColorInventory(color) {
    return Boolean(color && typeof color.inventory === "object" && color.inventory !== null && !Array.isArray(color.inventory));
}

function findProductColor(product, colorName) {
    const normalizedName = String(colorName || "").trim().toLowerCase();
    if (!normalizedName || !Array.isArray(product?.colors)) return null;

    return product.colors.find(color => {
        const name = typeof color === "string" ? color : color?.name;
        return String(name || "").trim().toLowerCase() === normalizedName;
    }) || null;
}

export function hasManagedInventory(product) {
    return Array.isArray(product?.colors) && product.colors.some(hasColorInventory);
}

export function getColorSizeQuantity(product, colorName, size) {
    const color = findProductColor(product, colorName);
    if (!hasColorInventory(color)) return null;

    const quantity = color.inventory[size];
    return Number.isSafeInteger(quantity) && quantity >= 0 ? quantity : 0;
}

export function isSizeAvailableForColor(product, colorName, size) {
    const quantity = getColorSizeQuantity(product, colorName, size);
    if (quantity !== null) return quantity > 0;

    if (!hasManagedInventory(product)) return product?.status !== "out-of-stock";

    return Boolean(findProductColor(product, colorName));
}

export function isProductCompletelySoldOut(product) {
    if (!hasManagedInventory(product)) return product?.status === "out-of-stock";

    const colors = Array.isArray(product.colors)
        ? product.colors.filter(color => {
            const name = typeof color === "string" ? color : color?.name;
            return String(name || "").trim();
        })
        : [];
    const sizes = Array.isArray(product.sizes)
        ? [...new Set(product.sizes.map(size => String(size || "").trim()).filter(Boolean))]
        : [];

    if (colors.length === 0 || sizes.length === 0) return true;

    return !colors.some(color => sizes.some(size => isSizeAvailableForColor(product, color.name, size)));
}

// =========================================================================
// 4. دالات السلة والأدمن (مستمرة على الـ LocalStorage لتجربة مستخدم أسرع)
// =========================================================================

export function getAdminLoggedIn() {
    return localStorage.getItem("adminLoggedIn") === "true";
}

export function setAdminLoggedIn(val) {
    localStorage.setItem("adminLoggedIn", val ? "true" : "false");
}

export function getCartData() {
    return JSON.parse(localStorage.getItem("cart") || "[]");
}

export function saveCartData(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
}

export function getCart() {
    return getCartData();
}

export function saveCart(cart) {
    saveCartData(cart);
}

export function showToast(message) {
    const existingToast = document.querySelector(".kham-toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.className = "kham-toast";
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fa-solid fa-circle-check"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function addToCart(item) {
    const cart = getCart();
    const existing = cart.find(p => p.id === item.id);
    if (existing) {
        existing.qty += item.qty;
    } else {
        cart.push(item);
    }
    saveCart(cart);
    updateCartCount();
}

export function updateCartCount() {
    const el = document.getElementById("cartCount");
    if (!el) return;
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    el.innerText = count > 0 ? count : "0";
}

// تحديث العداد فوراً وعند تحميل الصفحة لتجنب مشاكل توقيت الـ Module
updateCartCount();
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateCartCount);
}