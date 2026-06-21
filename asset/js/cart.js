// 1. تصدير الدوال الأساسية لتتمكن باقي الملفات (مثل details.js) من استيرادها واستخدامها مباشرة
export function getCartData() {
    return JSON.parse(localStorage.getItem("cart") || "[]");
}

export function saveCartData(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
}

export function updateCartCount() {
    const countEl = document.getElementById("cartCount");

    if (!countEl) {
        setTimeout(updateCartCount, 300);
        return;
    }

    const cart = getCartData();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);

    countEl.innerText = count > 0 ? count : "";
}

export function addToCart(product) {
    let cart = getCartData();

    // التحقق من وجود المنتج بنفس المقاس واللون
    const existing = cart.find(item =>
        item.id == product.id &&
        item.size == product.size &&
        item.color == product.color
    );

    if (existing) {
        existing.qty += product.qty || 1;
    } else {
        cart.push({
            ...product,
            qty: product.qty || 1
        });
    }

    saveCartData(cart);
    updateCartCount();
    showToast("Added to cart");
}

function showToast(message) {
    let toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2000);
}

// 2. تحديث كمية المنتج وتصديرها مع ربطها بـ window لضمان عدم حدوث تعارض
export function updateQty(id, type) {
    let cart = getCartData();
    let item = cart.find(p => p.id == id);

    if (!item) return;

    if (type === "plus") {
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
export function renderCart() {
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

    cart.forEach(item => {
        total += item.price * item.qty;

        container.innerHTML += `
        <div class="cart-item">
            <div class="cart-left">
                <img src="${item.image}" class="cart-img">
                <div class="cart-info">
                    <h3>${item.name}</h3>
                    <p>${item.price} EGP</p>
                    <small>${item.color || "-"} / ${item.size || "-"}</small>
                </div>
            </div>
            <div class="cart-right">
                <div class="qty-controls">
                    <button onclick="updateQty('${item.id}','minus')">−</button>
                    <span>${item.qty}</span>
                    <button onclick="updateQty('${item.id}','plus')">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
        `;
    });

    totalText.innerText = "EGP " + total.toFixed(2);
}

// تشغيل الرندرة وتحديث العداد عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    renderCart();
    setTimeout(() => {
        updateCartCount();
    }, 500);
});