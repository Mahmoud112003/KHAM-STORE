function getProducts() {
    return JSON.parse(localStorage.getItem("products")) || [];
}

function saveProducts(products) {
    try {
        localStorage.setItem("products", JSON.stringify(products));
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            alert('خطأ: مساحة التخزين ممتلئة! يرجى تقليل حجم الصور المرفوعة.');
            throw new Error('Storage quota exceeded.');
        } else {
            throw error;
        }
    }
}

function addProduct(product) {
    const products = getProducts();
    products.push(product);
    saveProducts(products);
}

function getProductById(id) {
    return getProducts().find(p => p.id == id || p.id == String(id));
}

function updateProduct(id, data) {
    const products = getProducts().map(p =>
        (p.id == id) ? { ...p, ...data } : p
    );
    saveProducts(products);
}

function deleteProduct(id) {
    const products = getProducts().filter(p => p.id != id);
    saveProducts(products);
}

function toggleProductStatus(id) {
    const products = getProducts().map(p => {
        if (p.id == id) {
            return {
                ...p,
                status: p.status === "in-stock" ? "out-of-stock" : "in-stock"
            };
        }
        return p;
    });
    saveProducts(products);
}

function getOrders() {
    return JSON.parse(localStorage.getItem("orders")) || [];
}

function saveOrders(orders) {
    localStorage.setItem("orders", JSON.stringify(orders));
}

function getAdminLoggedIn() {
    return localStorage.getItem("adminLoggedIn") === "true";
}

function setAdminLoggedIn(val) {
    localStorage.setItem("adminLoggedIn", val ? "true" : "false");
}

function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}


function getSections() {
    const products = getProducts();
    const sections = new Set(products.map(p => p.section).filter(Boolean));
    return [...sections];
}

function getSoldOutProducts() {
    return getProducts().filter(p => p.status === "out-of-stock");
}

function getInStockProducts() {
    return getProducts().filter(p => p.status === "in-stock");
}

function getCart() {
    return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart(item) {
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

function updateCartCount() {
    const el = document.getElementById("cartCount");
    if (!el) return;
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    el.innerText = count;
}

document.addEventListener("DOMContentLoaded", updateCartCount);