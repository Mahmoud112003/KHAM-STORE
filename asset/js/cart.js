import { getCartData, saveCartData, updateCartCount, addToCart, showToast, getProductById, getColorSizeQuantity, isSizeAvailableForColor } from './store.js';

// 1. تصدير الدوال الأساسية لتتمكن باقي الملفات (مثل details.js) من استيرادها واستخدامها مباشرة
export { getCartData, saveCartData, updateCartCount, addToCart, showToast };

// 2. تحديث كمية المنتج وتصديرها مع ربطها بـ window لضمان عدم حدوث تعارض
export async function updateQty(id, type) {
    let cart = getCartData();
    let item = cart.find(p => p.id == id);

    if (!item) return;

    if (type === "plus") {
        const product = item.productId ? await getProductById(item.productId) : null;
        const stock = product ? getColorSizeQuantity(product, item.color, item.size) : null;
        if (!product || (Number.isSafeInteger(stock) && item.qty >= stock) || !isSizeAvailableForColor(product, item.color, item.size)) {
            showToast("This variant is out of stock or its available quantity has been reached.");
            return;
        }
        item.qty++;
    }

    if (type === "minus") {
        if (item.qty > 1) {
            item.qty--;
        } else {
            removeFromCart(id);
            return;
        }
    }

    saveCartData(cart);
    renderCart();
    updateCartCount();
}

// 3. حذف المنتج من السلة وتصديرها
export function removeFromCart(id) {
    let cart = getCartData();
    cart = cart.filter(item => item.id != id);

    saveCartData(cart);
    renderCart();
    updateCartCount();
}

// ربط الدوال بـ window كخطوة أمان إضافية لكي تعمل مع الـ HTML المكتوب ديناميكياً بدون مشاكل النطاق
window.updateQty = updateQty;
window.removeFromCart = removeFromCart;

// 4. رندرة السلة وبناء العناصر
export async function renderCart() {
    const container = document.getElementById("cartItems");
    const totalText = document.getElementById("totalPrice");
    const emptyDiv = document.getElementById("emptyCart");
    const contentDiv = document.getElementById("cartContent");

    if (!container || !totalText) return;

    const cart = getCartData();

    // السلة فارغة
    if (cart.length === 0) {
        if (emptyDiv) emptyDiv.style.display = "block";
        if (contentDiv) contentDiv.style.display = "none";
        updateCartCount();
        return;
    }

    // السلة بها منتجات
    if (emptyDiv) emptyDiv.style.display = "none";
    if (contentDiv) contentDiv.style.display = "block";

    container.innerHTML = "";
    let total = 0;

    const products = new Map();
    await Promise.all([...new Set(cart.map(item => item.productId).filter(Boolean))].map(async id => products.set(id, await getProductById(id))));
    let hasUnavailable = false;
    cart.forEach(item => {
        const product = products.get(item.productId);
        const available = product ? isSizeAvailableForColor(product, item.color, item.size) : !item.productId;
        const stock = product ? getColorSizeQuantity(product, item.color, item.size) : null;
        const stale = !available || (Number.isSafeInteger(stock) && item.qty > stock);
        hasUnavailable ||= stale;
        total += item.price * item.qty;

        container.innerHTML += `
        <div class="cart-item">
            <div class="cart-left">
                <img src="${item.image}" class="cart-img">
                <div class="cart-info">
                    <h3>${item.name}</h3>
                    <p>${item.price} EGP</p>
                    <small>${item.color || "-"} / ${item.size || "-"}</small>
                    ${stale ? '<strong class="cart-stock-warning">Out of Stock or quantity exceeds current stock</strong>' : ''}
                </div>
            </div>
            <div class="cart-right">
                <div class="qty-controls">
                    <button onclick="updateQty('${item.id}','minus')">−</button>
                    <span>${item.qty}</span>
                    <button ${stale || (Number.isSafeInteger(stock) && item.qty >= stock) ? 'disabled' : ''} onclick="updateQty('${item.id}','plus')">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
        `;
    });

    totalText.innerText = "EGP " + total.toFixed(2);
    const checkoutLink = document.querySelector(".checkout-btn");
    if (checkoutLink) {
        checkoutLink.classList.toggle("checkout-disabled", hasUnavailable);
        checkoutLink.setAttribute("aria-disabled", String(hasUnavailable));
        checkoutLink.onclick = event => {
            if (hasUnavailable) { event.preventDefault(); showToast("Remove or update unavailable items before checkout."); }
        };
    }
}

// تشغيل الرندرة وتحديث العداد عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    renderCart();
    setTimeout(() => {
        updateCartCount();
    }, 500);
});

window.addEventListener("languagechange", () => {
    renderCart();
});
