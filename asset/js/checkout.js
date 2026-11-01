
// ==========================================
// 1. IMPORTS
// ==========================================
import { updateCartCount } from './store.js';
import { trackInitiateCheckout, trackPurchase } from './analytics.js';
import { renderAnnouncement } from './announcement.js';
import {
    getProductById,
    getColorSizeQuantity,
    isSizeAvailableForColor
} from './store.js';

document.addEventListener('DOMContentLoaded', () => {

    renderAnnouncement('#checkout-announcement');

    const form = document.getElementById("checkoutForm");
    const govSelect = document.getElementById("governorate");
    const itemsContainer = document.getElementById("checkoutItems");
    const summaryContainer = document.querySelector(".summary-totals");

    // Google Sheets
    const SHEETDB_URL = 'https://sheetdb.io/api/v1/gu3num91nnr6s';

    // ==========================================
    // 2. RENDER CHECKOUT
    // ==========================================
    function renderCheckout() {

        const cart = JSON.parse(localStorage.getItem("cart") || "[]");

        if (!itemsContainer) return;

        itemsContainer.innerHTML = "";

        if (cart.length === 0) {
            itemsContainer.innerHTML = `
                <p style="text-align:center;">
                    ${window.getText
                    ? window.getText('cartEmptyMessage')
                    : 'Your cart is empty'}
                </p>`;

            if (summaryContainer) summaryContainer.innerHTML = "";
            return;
        }

        let subtotal = 0;

        cart.forEach(item => {

            subtotal += item.price * item.qty;

            itemsContainer.innerHTML += `
                <div class="summary-item">
                    <div class="img-wrapper">
                        <img src="${item.image}">
                        <span class="qty-badge">${item.qty}</span>
                    </div>

                    <div class="item-info">
                        <h3>${item.name}</h3>
                        <p>${item.size || 'Standard'} / ${item.color || 'Default'}</p>
                    </div>

                    <div class="item-price">
                        E£${(item.price * item.qty).toFixed(2)}
                    </div>
                </div>`;
        });

        // Shipping calculation
        let shipping = 0;

        const selectedGov = govSelect ? govSelect.value : "";

        if (selectedGov === "Cairo" || selectedGov === "Giza") {
            shipping = 75;
        } else if (selectedGov !== "") {
            shipping = 100;
        }

        const total = subtotal + shipping;

        if (summaryContainer) {

            let shippingDisplay = selectedGov === ""
                ? (window.getText
                    ? window.getText('governoratePlaceholder')
                    : 'Select Governorate')
                : "E£" + shipping.toFixed(2);

            summaryContainer.innerHTML = `
                <div class="summary-row">
                    <span>${window.getText ? window.getText('subtotal') : 'Subtotal'}</span>
                    <span>E£${subtotal.toFixed(2)}</span>
                </div>

                <div class="summary-row">
                    <span>${window.getText ? window.getText('shipping') : 'Shipping'}</span>
                    <span>${shippingDisplay}</span>
                </div>

                <div class="summary-row total-price"
                    style="font-size:20px;font-weight:bold;color:#2b1142;border-top:1px solid #ddd;padding-top:15px;margin-top:15px;display:flex;justify-content:space-between;">

                    <span>${window.getText ? window.getText('total') : 'Total'}</span>
                    <span>E£${total.toFixed(2)}</span>
                </div>`;
        }
    }

    if (govSelect) {
        govSelect.addEventListener('change', renderCheckout);
    }

    renderCheckout();

    const initialCart = JSON.parse(localStorage.getItem("cart") || "[]");
    trackInitiateCheckout(initialCart);

    window.addEventListener('languagechange', renderCheckout);

    // ==========================================
    // 3. SUCCESS PAGE
    // ==========================================
    function showSuccessPage(customerName, orderID) {

        window.copyOrderNumber = function () {

            navigator.clipboard.writeText(orderID).then(() => {

                const copyBtn = document.getElementById("copyIconBtn");

                if (!copyBtn) return;

                copyBtn.innerHTML =
                    '<i class="fa-solid fa-check" style="color: #4BB543;"></i>';

                setTimeout(() => {
                    copyBtn.innerHTML =
                        '<i class="fa-regular fa-copy"></i>';
                }, 2000);

            }).catch(err => console.error('Copy error:', err));
        };

        const checkoutContainer = document.querySelector(".checkout-container");

        if (!checkoutContainer) return;

        checkoutContainer.innerHTML = `
            <div class="success-wrapper"
                style="width:100%;display:flex;justify-content:center;align-items:center;min-height:80vh;animation:fadeIn 0.8s ease;">

                <div class="success-card"
                    style="text-align:center;background:#fff;padding:60px 40px;border-radius:20px;max-width:500px;box-shadow:0 15px 35px rgba(0,0,0,0.05);">

                    <div class="check-container"
                        style="width:90px;height:90px;background:#2b1142;color:#fff;font-size:45px;display:flex;align-items:center;justify-content:center;border-radius:50%;margin:0 auto 30px;box-shadow:0 10px 20px rgba(43,17,66,0.3);">

                        <i class="fa-solid fa-check"></i>
                    </div>

                    <h1 style="font-size:30px;color:#2b1142;margin-bottom:15px;font-weight:900;letter-spacing:-1px;">
                        THANK YOU, ${customerName.toUpperCase()}!
                    </h1>

                    <p style="color:#666;font-size:18px;line-height:1.6;">
                        تم استلام طلبك بنجاح وجاري تجهيزه الآن.
                    </p>

                    <div style="margin:25px auto;padding:15px;background:#fdfbff;border-radius:10px;border:1px dashed #2b1142;display:flex;align-items:center;justify-content:center;gap:12px;width:fit-content;min-width:220px;">

                        <span style="color:#2b1142;font-weight:bold;font-size:18px;">
                            رقم الطلب: #${orderID}
                        </span>

                        <button id="copyIconBtn"
                            onclick="copyOrderNumber()"
                            style="background:none;border:none;cursor:pointer;color:#2b1142;font-size:20px;padding:0;"
                            title="نسخ رقم الطلب">

                            <i class="fa-regular fa-copy"></i>
                        </button>
                    </div>

                    <button onclick="window.location.href='home.html'"
                        class="complete-order-btn"
                        style="width:auto;padding:18px 50px;border-radius:50px;background:#2b1142;color:#fff;border:none;font-weight:bold;cursor:pointer;">

                        العودة للمتجر
                    </button>
                </div>
            </div>`;
    }

    // ==========================================
    // 4. SUBMIT ORDER + FIREBASE NOTIFICATION
    // ==========================================
    if (form) {

        form.addEventListener('submit', async (e) => {

            e.preventDefault();

            const cart = JSON.parse(localStorage.getItem("cart") || "[]");

            if (cart.length === 0) return;

            // Prevent duplicate submission
            const btn = document.querySelector(".complete-order-btn");

            if (btn && btn.disabled) return;

            if (btn) {
                btn.innerText = "جاري التأكيد...";
                btn.disabled = true;
            }

            try {

                // Check product availability
                const products = new Map();

                await Promise.all(
                    [...new Set(
                        cart.map(item => item.productId).filter(Boolean)
                    )].map(async id => {
                        products.set(id, await getProductById(id));
                    })
                );

                const unavailable = cart.some(item => {

                    if (!item.productId) return false;

                    const product = products.get(item.productId);

                    if (
                        !product ||
                        !isSizeAvailableForColor(product, item.color, item.size)
                    ) {
                        return true;
                    }

                    const stock = getColorSizeQuantity(
                        product,
                        item.color,
                        item.size
                    );

                    return Number.isSafeInteger(stock) && item.qty > stock;
                });

                if (unavailable) {

                    alert(
                        "One or more items are out of stock or exceed current stock. Please return to your cart and update them."
                    );

                    if (btn) {
                        btn.disabled = false;
                        btn.innerText = "تأكيد الطلب";
                    }

                    return;
                }

                // Customer information
                const firstName =
                    document.getElementById("firstName").value.trim();

                const lastName =
                    document.getElementById("lastName").value.trim();

                const customerName = `${firstName} ${lastName}`.trim();

                const totalElement = document.querySelector(
                    ".total-price span:last-child"
                );

                if (!totalElement || !govSelect || !govSelect.value) {
                    throw new Error("Missing order total or governorate.");
                }

                const totalPrice = totalElement.innerText;

                // Generate order ID and unique event ID
                const generatedID =
                    `KHM${Math.floor(Math.random() * 10000)}`;

                const eventId = `${generatedID}-${Date.now()}`;

                // Order products
                const itemsDetailed = cart.map(item =>
                    `${item.name} [Size: ${item.size || 'Std'}, Color: ${item.color || 'Def'}] (${item.qty})`
                ).join(' - ');

                // Prepare SheetDB data
                const orderData = {
                    data: [{
                        "Order_ID": generatedID,
                        "Date": new Date().toLocaleString('ar-EG'),
                        "Name": customerName,
                        "Email": document.getElementById("email").value,
                        "Phone": `'${document.getElementById("phone").value}`,
                        "Address": document.getElementById("address").value,
                        "Governorate": govSelect.value,
                        "Items": itemsDetailed,
                        "Total": totalPrice
                    }]
                };

                // ==========================================
                // STEP 1: SAVE ORDER TO SHEETDB
                // ==========================================
                const response = await fetch(SHEETDB_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                });

                if (!response.ok) {
                    throw new Error(
                        `SheetDB failed with HTTP ${response.status}`
                    );
                }

                console.log("Order saved successfully:", generatedID);

                // ==========================================
                // STEP 2: TRACK PURCHASE
                // ==========================================
                const purchaseValue = parseFloat(
                    totalPrice.replace(/[^\d.]/g, "")
                );

                trackPurchase(generatedID, purchaseValue, cart);

                // ==========================================
                // STEP 3: CLEAR CART
                // ==========================================
                localStorage.removeItem("cart");
                updateCartCount();

                // ==========================================
                // STEP 4: SHOW SUCCESS PAGE
                // ==========================================
                showSuccessPage(firstName, generatedID);

                // ==========================================
                // STEP 5: SEND FIREBASE ADMIN NOTIFICATION
                // ==========================================
                fetch("/api/notify-new-order", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        orderId: generatedID,
                        eventId: eventId,
                        customerName: customerName,
                        total: totalPrice
                    })

                })
                    .then(async notificationResponse => {

                        const result = await notificationResponse.json();

                        if (
                            !notificationResponse.ok ||
                            !result.success ||
                            result.failed > 0
                        ) {
                            console.error(
                                "Admin notification failed:",
                                result
                            );

                            return;
                        }

                        console.log(
                            "KHAM admin notification sent successfully:",
                            result
                        );

                    })
                    .catch(error => {

                        console.error(
                            "Admin notification request failed:",
                            error
                        );

                    });

            } catch (error) {

                console.error("Order submission failed:", error);

                alert(
                    "حصلت مشكلة أثناء تسجيل الطلب. حاول تراجع البيانات وتحاول مرة تانية."
                );

                if (btn) {
                    btn.disabled = false;
                    btn.innerText = "تأكيد الطلب";
                }
            }
        });
    }
});
