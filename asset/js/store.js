// 1. استيراد إعدادات الفايربيز والدوال المطلوبة للتعامل مع Firestore
import { db, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from './firebase-config.js';

let productsCache = null;
let productsRequest = null;
const productByIdCache = new Map();

export function clearProductsCache() {
    productsCache = null;
    productsRequest = null;
    productByIdCache.clear();
}

// =========================================================================
// 2. دالات المنتجات المربوطة بالفايربيز (Firebase Firestore Functions)
// =========================================================================

// جلب جميع المنتجات من الفايربيز
export async function getProducts() {
    if (productsCache) return productsCache;
    if (productsRequest) return productsRequest;

    const startMark = performance?.mark ? performance.mark('products-fetch-start') : null;
    productsRequest = (async () => {
        try {
            console.time("Firebase Products");
            const querySnapshot = await getDocs(collection(db, "products"));
            console.timeEnd("Firebase Products");
            const products = querySnapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
            productsCache = products;
            products.forEach(product => productByIdCache.set(product.id, product));
            return products;
        } catch (error) {
            console.error(error);
            return [];
        } finally {
            if (performance?.measure) {
                performance.mark('products-fetch-end');
                try {
                    performance.measure('products-fetch-duration', 'products-fetch-start', 'products-fetch-end');
                } catch (measureError) {
                    console.debug('Products fetch measurement skipped:', measureError);
                }
            }
            productsRequest = null;
        }
    })();
    return productsRequest;
}

// إضافة منتج جديد للفايربيز
export async function addProduct(product) {
    try {
        const docRef = await addDoc(collection(db, "products"), product);
        clearProductsCache();
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
        const cachedProduct = productsCache?.find((product) => product.id === id) || productByIdCache.get(id);
        if (cachedProduct) {
            return cachedProduct;
        }

        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const product = { id: docSnap.id, ...docSnap.data() };
            productByIdCache.set(product.id, product);
            return product;
        }

        console.warn("المنتج غير موجود في قاعدة البيانات!");
        return null;
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
        clearProductsCache();
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
        clearProductsCache();
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

function hasProductInventory(product) {
    return Boolean(product && typeof product.inventory === "object" && product.inventory !== null && !Array.isArray(product.inventory));
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
    return hasProductInventory(product) || (Array.isArray(product?.colors) && product.colors.some(hasColorInventory));
}

export function getColorSizeQuantity(product, colorName, size) {
    const color = findProductColor(product, colorName);
    const inventory = hasColorInventory(color) ? color.inventory :
        (!Array.isArray(product?.colors) || product.colors.length === 0) && hasProductInventory(product) ? product.inventory : null;
    if (!inventory) return null;
    const quantity = inventory[size];
    return Number.isSafeInteger(quantity) && quantity >= 0 ? quantity : 0;
}

export function isSizeAvailableForColor(product, colorName, size) {
    const quantity = getColorSizeQuantity(product, colorName, size);
    if (quantity !== null) return quantity > 0;

    if (!hasManagedInventory(product)) return product?.status !== "out-of-stock";

    return Boolean(findProductColor(product, colorName)) && product?.status !== "out-of-stock";
}

export function isProductCompletelySoldOut(product) {
    if (!hasManagedInventory(product)) return product?.status === "out-of-stock";

    const colors = Array.isArray(product.colors) && product.colors.length
        ? product.colors.filter(color => {
            const name = typeof color === "string" ? color : color?.name;
            return String(name || "").trim();
        })
        : [];
    const sizes = Array.isArray(product.sizes)
        ? [...new Set(product.sizes.map(size => String(size || "").trim()).filter(Boolean))]
        : [];

    if (sizes.length === 0) return true;
    if (colors.length === 0) return !sizes.some(size => Number.isSafeInteger(product.inventory?.[size]) && product.inventory[size] > 0);

    return !colors.some(color => {
        const colorName = typeof color === "string" ? color : color.name;
        return sizes.some(size => isSizeAvailableForColor(product, colorName, size));
    });
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

export function addToCart(item, availableStock = null) {
    const cart = getCart();
    const existing = cart.find(p => p.id === item.id);
    if (Number.isSafeInteger(availableStock) && availableStock >= 0 && (existing?.qty || 0) + item.qty > availableStock) {
        return false;
    }
    if (existing) {
        existing.qty += item.qty;
    } else {
        cart.push(item);
    }
    saveCart(cart);
    updateCartCount();
    return true;
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
