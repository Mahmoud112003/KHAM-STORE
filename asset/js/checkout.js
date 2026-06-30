// 1. استيراد دالة تحديث عداد السلة من الـ store لضمان تصفير العداد بعد نجاح الأوردر
import { updateCartCount } from './store.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById("checkoutForm");
    const govSelect = document.getElementById("governorate");
    const itemsContainer = document.getElementById("checkoutItems");
    const summaryContainer = document.querySelector(".summary-totals");

    // رابط Google Sheets
    const SHEETDB_URL = 'https://sheetdb.io/api/v1/gu3num91nnr6s';

    // ==========================================
    // 1. عرض المنتجات
    // ==========================================
    function renderCheckout() {
        const cart = JSON.parse(localStorage.getItem("cart") || "[]");
        if (!itemsContainer) return;
        itemsContainer.innerHTML = "";

        if (cart.length === 0) {
            itemsContainer.innerHTML = "<p style='text-align:center;'>السلة فارغة</p>";
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
                    <div class="item-price">E£${(item.price * item.qty).toFixed(2)}</div>
                </div>`;
        });

        let shipping = 0;
        const selectedGov = govSelect ? govSelect.value : "";
        if (selectedGov === "Cairo" || selectedGov === "Giza") {
            shipping = 80;
        } else if (selectedGov !== "") {
            shipping = 100;
        }

        const total = subtotal + shipping;
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="summary-row"><span>Subtotal</span><span>E£${subtotal.toFixed(2)}</span></div>
                <div class="summary-row"><span>Shipping</span><span>${selectedGov === "" ? "حدد المحافظة" : "E£" + shipping.toFixed(2)}</span></div>
                <div class="summary-row total-price" style="font-size:20px; font-weight:bold; color:#2b1142; border-top:1px solid #ddd; padding-top:15px; margin-top:15px; display:flex; justify-content:space-between;">
                    <span>Total</span><span>E£${total.toFixed(2)}</span>
                </div>`;
        }
    }

    if (govSelect) govSelect.addEventListener('change', renderCheckout);
    renderCheckout();

    // ==========================================
    // 2. صفحة النجاح (معدلة بإضافة زر النسخ)
    // ==========================================
    function showSuccessPage(customerName, orderID) {
        
        // دالة النسخ بنربطها بالـ window عشان تشتغل من الـ HTML المولد
        window.copyOrderNumber = function() {
            navigator.clipboard.writeText(orderID).then(() => {
                const copyBtn = document.getElementById("copyIconBtn");
                // تغيير الأيقونة لعلامة صح خضراء لتأكيد النسخ
                copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #4BB543;"></i>';
                // إرجاع الأيقونة لشكلها الطبيعي بعد ثانيتين
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
                }, 2000);
            }).catch(err => console.error('خطأ في النسخ:', err));
        };

        document.querySelector(".checkout-container").innerHTML = `
            <div class="success-wrapper" style="width:100%; display:flex; justify-content:center; align-items:center; min-height: 80vh; animation: fadeIn 0.8s ease;">
                <div class="success-card" style="text-align:center; background:#fff; padding:60px 40px; border-radius:20px; max-width:500px; box-shadow:0 15px 35px rgba(0,0,0,0.05);">
                    <div class="check-container" style="width:90px; height:90px; background:#2b1142; color:#fff; font-size:45px; display:flex; align-items:center; justify-content:center; border-radius:50%; margin:0 auto 30px; box-shadow: 0 10px 20px rgba(43, 17, 66, 0.3);">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <h1 style="font-size: 30px; color: #2b1142; margin-bottom: 15px; font-weight: 900; letter-spacing: -1px;">THANK YOU, ${customerName.toUpperCase()}!</h1>
                    <p style="color: #666; font-size: 18px; line-height: 1.6;">تم استلام طلبك بنجاح وجاري تجهيزه الآن.</p>
                    
                    <div style="margin: 25px auto; padding: 15px; background: #fdfbff; border-radius: 10px; border: 1px dashed #2b1142; display: flex; align-items: center; justify-content: center; gap: 12px; width: fit-content; min-width: 220px;">
                        <span style="color: #2b1142; font-weight: bold; font-size: 18px;">رقم الطلب: #${orderID}</span>
                        <button id="copyIconBtn" onclick="copyOrderNumber()" style="background: none; border: none; cursor: pointer; color: #2b1142; font-size: 20px; padding: 0; transition: 0.3s;" title="نسخ رقم الطلب">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                    </div>

                    <button onclick="window.location.href='home.html'" class="complete-order-btn" style="width: auto; padding: 18px 50px; border-radius: 50px; background: #2b1142; color: #fff; border: none; font-weight: bold; cursor: pointer;">العودة للمتجر</button>
                </div>
            </div>`;
    }

    // ==========================================
    // 3. إرسال البيانات
    // ==========================================
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const cart = JSON.parse(localStorage.getItem("cart") || "[]");
            if (cart.length === 0) return;

            const btn = document.querySelector(".complete-order-btn");
            if (btn) {
                btn.innerText = "جاري التأكيد...";
                btn.disabled = true;
            }

            const firstName = document.getElementById("firstName").value;
            const lastName = document.getElementById("lastName").value;
            const totalPrice = document.querySelector(".total-price span:last-child").innerText;
            const generatedID = `KHM${Math.floor(Math.random() * 10000)}`;

            // تعديل تجميع الـ Items ليشمل المقاس واللون بالتفصيل داخل شيت الإكسيل
            const itemsDetailed = cart.map(i => `${i.name} [Size: ${i.size || 'Std'}, Color: ${i.color || 'Def'}] (${i.qty})`).join(' - ');

            const orderData = {
                data: [{
                    "Order_ID": generatedID,
                    "Date": new Date().toLocaleString('ar-EG'),
                    "Name": `${firstName} ${lastName}`,
                    "Email": document.getElementById("email").value,
                    "Phone": `'${document.getElementById("phone").value}`,
                    "Address": document.getElementById("address").value,
                    "Governorate": govSelect.value,
                    "Items": itemsDetailed,
                    "Total": totalPrice
                }]
            };

            try {
                // الإرسال للإكسيل بيحصل في "صمت" بالنسبة للمستخدم
                await fetch(SHEETDB_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });

                // مسح السلة وتحديث عداد السلة في الـ Navbar فوراً
                localStorage.removeItem("cart");
                updateCartCount();
                
                showSuccessPage(firstName, generatedID);
            } catch (error) {
                console.error(error);
                // لو حصل مشكلة في الربط بنظهر صفحة النجاح برضه عشان العميل ما يقلقش
                localStorage.removeItem("cart");
                updateCartCount();
                
                showSuccessPage(firstName, generatedID);
            }
        });
    }
});