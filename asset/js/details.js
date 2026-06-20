function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

const productId = getQueryParam("productId");
const product = getProductById(productId);
const defaultProduct = {
    id: Date.now(),
    name: "KHAM Piece",
    price: 0,
    status: "in-stock",
    images: ["asset/images/placeholder.png"],
    colors: [],
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "No description available.",
    sizeGuide: ""
};

const currentProduct = product || defaultProduct;
let qty = 1;

function showToast(message) {
    const existingToast = document.querySelector(".kham-toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.className = "kham-toast";
    toast.innerHTML = `
        <div class=\"toast-content\">
            <i class=\"fa-solid fa-circle-check\"></i>
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


function initDetailsPage() {
    if (!currentProduct) return;


    const titleEl = document.getElementById("productTitle");
    const priceEl = document.getElementById("productPrice");
    const descEl = document.getElementById("productDesc");

    if (titleEl) titleEl.innerText = currentProduct.name;
    if (priceEl) priceEl.innerText = `${currentProduct.price} EGP`;
    if (descEl) descEl.innerText = currentProduct.description || "No description available.";

    // 2. معالجة الصور المتعددة
    const mainImg = document.getElementById("mainImage");
    const thumbsContainer = document.getElementById("thumbs");

    const productImages = currentProduct.images || [];
    if (productImages.length === 0 && currentProduct.image) {
        productImages.push(currentProduct.image);
    }
    if (productImages.length === 0) {
        productImages.push("asset/images/placeholder.png");
    }

    if (mainImg) mainImg.src = productImages[0];

    if (thumbsContainer) {
        thumbsContainer.innerHTML = "";
        if (productImages.length > 1) {
            productImages.forEach((imgSrc, index) => {
                const thumb = document.createElement("img");
                thumb.src = imgSrc;
                thumb.className = "thumb-img" + (index === 0 ? " active" : "");
                thumb.onclick = () => {
                    if (mainImg) mainImg.src = imgSrc;
                    document.querySelectorAll(".thumb-img").forEach(t => t.classList.remove("active"));
                    thumb.classList.add("active");
                };
                thumbsContainer.appendChild(thumb);
            });
        }
    }

    // 3. عرض الألوان
    const colorDotsContainer = document.getElementById("colorDots");
    const currentColorLabel = document.getElementById("currentColor");

    if (colorDotsContainer) {
        colorDotsContainer.innerHTML = "";
        const productColors = currentProduct.colors || [];

        if (productColors.length === 0) {
            if (currentColorLabel) currentColorLabel.innerText = "Color: Standard";
        } else {
            productColors.forEach((color, index) => {
                const dot = document.createElement("div");
                dot.className = "color-dot";

                // دعم لو اللون مبعوت
                const colorCode = typeof color === "object" ? color.code : color;
                const colorName = typeof color === "object" ? color.name : color;

                dot.style.backgroundColor = colorCode;
                dot.style.width = "25px";
                dot.style.height = "25px";
                dot.style.borderRadius = "50%";
                dot.style.display = "inline-block";
                dot.style.marginRight = "10px";
                dot.style.cursor = "pointer";
                dot.style.border = "2px solid #ccc";

                if (index === 0) {
                    dot.classList.add("active");
                    dot.style.borderColor = "#000";
                    if (currentColorLabel) currentColorLabel.innerText = `Color: ${colorName || 'Default'}`;
                }

                dot.onclick = () => {
                    document.querySelectorAll(".color-dot").forEach(d => {
                        d.classList.remove("active");
                        d.style.borderColor = "#ccc";
                    });
                    dot.classList.add("active");
                    dot.style.borderColor = "#000";
                    if (currentColorLabel) currentColorLabel.innerText = `Color: ${colorName || 'Default'}`;
                };

                colorDotsContainer.appendChild(dot);
            });
        }
    }

    // 4. عرض المقاسات
    const sizeSelector = document.getElementById("sizeSelector");
    if (sizeSelector) {
        sizeSelector.innerHTML = "";
        const productSizes = currentProduct.sizes || ["S", "M", "L", "XL", "XXL"];
        productSizes.forEach(size => {
            const btn = document.createElement("button");
            btn.className = "size-btn";
            btn.innerText = size;
            btn.onclick = () => {
                document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            };
            sizeSelector.appendChild(btn);
        });
    }

    // 5. تفعيل الـ Size Guide
    const sizeGuideBtn = document.getElementById("sizeGuideBtn");
    const sizeGuideBox = document.getElementById("sizeGuideBox");
    const sizeGuideImage = document.getElementById("sizeGuideImage");

    if (sizeGuideBtn && sizeGuideBox) {
        // قراءة الصورة المرفوعة
        const guideSrc = currentProduct.sizeGuide || currentProduct.sizeGuideImg;

        if (guideSrc) {
            if (sizeGuideImage) sizeGuideImage.src = guideSrc;

            sizeGuideBtn.onclick = (e) => {
                e.stopPropagation();
                if (sizeGuideBox.style.display === "block") {
                    sizeGuideBox.style.display = "none";
                } else {
                    sizeGuideBox.style.display = "block";
                }
            };
        } else {

            sizeGuideBtn.style.display = "none";
        }
    }
}

// إغلاق بوكس المقاسات
document.addEventListener("click", () => {
    const sizeGuideBox = document.getElementById("sizeGuideBox");
    if (sizeGuideBox) sizeGuideBox.style.display = "none";
});

// ============ التحكم بالكمية ============
if (document.getElementById("plusBtn")) {
    document.getElementById("plusBtn").onclick = () => {
        qty++;
        document.getElementById("qty").innerText = qty;
    };
}

if (document.getElementById("minusBtn")) {
    document.getElementById("minusBtn").onclick = () => {
        if (qty > 1) {
            qty--;
            document.getElementById("qty").innerText = qty;
        }
    };
}

// ============ إضافة للسلة ============
function addToCartFromDetails() {
    if (currentProduct.status === "out-of-stock") {
        showToast("This product is sold out!");
        return;
    }

    const activeSize = document.querySelector(".size-btn.active");
    if (!activeSize) {
        showToast("Please select a size first!");
        return;
    }

    const currentColorEl = document.getElementById("currentColor");
    const colorName = currentColorEl ? currentColorEl.innerText.replace("Color: ", "") : "Standard";

    const cartItem = {
        id: `${currentProduct.id}-${activeSize.innerText}-${colorName}`,
        productId: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        image: document.getElementById("mainImage").src,
        size: activeSize.innerText,
        color: colorName,
        qty: qty
    };

    addToCart(cartItem);
    showToast("Added to cart successfully!");
}
// ==========================================
// إضافة حدث لزرار الـ Buy Now في نهاية الملف
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const buyNowBtn = document.getElementById("buyNowBtn") || document.querySelector(".buy-now-btn");
    
    if (buyNowBtn) {
        buyNowBtn.addEventListener("click", () => {
            // الشيك على حالة المنتج
            if (currentProduct.status === "out-of-stock") {
                showToast("This product is sold out!");
                return;
            }

            // الشيك على المقاس النشط من الكود بتاعك
            const activeSize = document.querySelector(".size-btn.active");
            if (!activeSize) {
                showToast("Please select a size first!");
                return;
            }

            const currentColorEl = document.getElementById("currentColor");
            const colorName = currentColorEl ? currentColorEl.innerText.replace("Color: ", "") : "Standard";

            const cartItem = {
                id: `${currentProduct.id}-${activeSize.innerText}-${colorName}`,
                productId: currentProduct.id,
                name: currentProduct.name,
                price: currentProduct.price,
                image: document.getElementById("mainImage").src,
                size: activeSize.innerText,
                color: colorName,
                qty: qty
            };

            // إضافة المنتج للسلة الحالية والتوجيه
            addToCart(cartItem);
            window.location.href = "checkout.html";
        });
    }
});

// تشغيل الدالة
document.addEventListener("DOMContentLoaded", initDetailsPage);
