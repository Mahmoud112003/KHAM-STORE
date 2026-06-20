function getCartData() {
    return JSON.parse(localStorage.getItem("cart") || "[]");
}

function saveCartData(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartCount() {
    const countEl = document.getElementById("cartCount");

    if (!countEl) {
        setTimeout(updateCartCount, 300);
        return;
    }

    const cart = getCartData();
    const count = cart.reduce((sum, item) => {
        return sum + item.qty;
    }, 0);

    countEl.innerText = count > 0 ? count : "";
}

function addToCart(product) {
    let cart = getCartData();

    // التحقق من وجود
    const existing = cart.find(item =>
        item.id == product.id &&
        item.size == product.size &&
        item.color == product.color
    );

    if (existing) {
        // زيادة الكمية
        existing.qty += product.qty || 1;
    } else {
        // إضافة منتج جديد تماماً
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

window.updateQty = function (id, type) {

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
};


window.removeFromCart = function (id) {

    let cart = getCartData();

    cart = cart.filter(item => item.id != id);

    saveCartData(cart);

    renderCart();

    updateCartCount();
};

function renderCart() {

    const container = document.getElementById("cartItems");

    const totalText = document.getElementById("totalPrice");

    const emptyDiv = document.getElementById("emptyCart");

    const contentDiv = document.getElementById("cartContent");

    if (!container || !totalText) return;

    const cart = getCartData();

    // EMPTY
    if (cart.length === 0) {

        emptyDiv.style.display = "block";

        contentDiv.style.display = "none";

        updateCartCount();

        return;
    }

    // HAS ITEMS
    emptyDiv.style.display = "none";

    contentDiv.style.display = "block";

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

                    <small>
                        ${item.color || "-"} / ${item.size || "-"}
                    </small>

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

document.addEventListener("DOMContentLoaded", () => {

    renderCart();

    setTimeout(() => {
        updateCartCount();
    }, 500);

});