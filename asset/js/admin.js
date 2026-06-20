if (!localStorage.getItem("adminLoggedIn")) {
    window.location.href = "login.html";
}

let editMode = false;
let editingId = null;
const form = document.getElementById("productForm");
const msg = document.getElementById("adminMsg");
const tableBody = document.getElementById("productsTableBody");
const searchInput = document.getElementById("searchInput");
const sectionSelect = document.getElementById("adminProductSection");
const subCategorySelect = document.getElementById("adminProductSubCategory");


function updateSubCategories() {
    if (!sectionSelect || !subCategorySelect) return;

    const section = sectionSelect.value;
    subCategorySelect.innerHTML = '<option value="">اختر النوع (Sub-Category)</option>';

    let options = [];
    if (section === "Oversized Hoodie Basic" || section === "Oversized Hoodie Printed") {
        options = ["Oversized Hoodie"];
    } else if (section === "T-shirt Basic" || section === "T-shirt Printed") {
        options = ["T-shirt"];
    } else if (section === "Sweatpants") {
        options = ["Sweatpants"];
    } else if (section === "Jeans") {
        options = ["Jeans"];
    }

    options.forEach(opt => {
        const optionEl = document.createElement("option");
        optionEl.value = opt;
        optionEl.innerText = opt;
        subCategorySelect.appendChild(optionEl);
    });

    // اختيار القيمة تلقائياً بما إن الأقسام بقت صريحة ومنفصلة
    if (options.length === 1) {
        subCategorySelect.value = options[0];
    }
}
window.updateSubCategories = updateSubCategories;

function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
}

// 3. حفظ أو تحديث المنتج عند إرسال الفورم
if (form) {
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector(".save-btn");
        if (submitButton) {
            submitButton.innerText = "جاري الحفظ والضغط...";
            submitButton.disabled = true;
        }

        try {
            const imageInput = document.getElementById("adminProductImages");
            let imageBase64List = [];

            if (imageInput && imageInput.files.length > 0) {
                for (let i = 0; i < imageInput.files.length; i++) {
                    const compressed = await compressImage(imageInput.files[i]);
                    imageBase64List.push(compressed);
                }
            } else if (editMode && editingId) {
                const currentProd = typeof getProductById === "function" ? getProductById(editingId) : null;
                if (currentProd) imageBase64List = currentProd.images || [];
            }

            const sizeGuideInput = document.getElementById("adminProductSizeGuide");
            let sizeGuideBase64 = editMode && editingId ? (typeof getProductById === "function" ? getProductById(editingId)?.sizeGuide : "") : "";
            if (sizeGuideInput && sizeGuideInput.files.length > 0) {
                sizeGuideBase64 = await compressImage(sizeGuideInput.files[0]);
            }

            const sectionCoverInput = document.getElementById("adminSectionCover");
            let sectionCoverBase64 = editMode && editingId ? (typeof getProductById === "function" ? getProductById(editingId)?.sectionCover : "") : "";
            if (sectionCoverInput && sectionCoverInput.files.length > 0) {
                sectionCoverBase64 = await compressImage(sectionCoverInput.files[0]);
            }

            // استخراج المقاسات والألوان المكتوبة
            const sizes = Array.from(document.querySelectorAll(".size-checkbox:checked")).map(cb => cb.value);
            const colorInput = document.getElementById("adminProductColors");
            const rawColors = colorInput ? colorInput.value.split(",").map(c => c.trim()).filter(Boolean) : [];

            // ماطحة الألوان من العربية الإنجليزية إلى Hex
            const colorMap = {
                "أسود": "#000000", "black": "#000000",
                "أبيض": "#ffffff", "white": "#ffffff",
                "أصفر": "#ffeb3b", "yellow": "#ffeb3b",
                "أحمر": "#f44336", "red": "#f44336",
                "أزرق": "#2196f3", "blue": "#2196f3",
                "أخضر": "#4caf50", "green": "#4caf50",
                "رمادي": "#9e9e9e", "grey": "#9e9e9e", "gray": "#9e9e9e",
                "كحلي": "#001f3f", "navy": "#001f3f",
                "بيج": "#f5f5dc", "beige": "#f5f5dc",
                "بني": "#795548", "brown": "#795548",
                "برتقالي": "#ff9800", "orange": "#ff9800",
                "وردي": "#e91e63", "pink": "#e91e63",
                "بنفسجي": "#9c27b0", "purple": "#9c27b0",
                "زيتوني": "#556b2f", "olive": "#556b2f"
            };

            const colors = rawColors.map(c => {
                const nameLower = c.toLowerCase();
                // لو الاسم متسجل في الخريطة هيرجع الكود بتاعه، لو مش متسجل وهو كود هيكس يبدأ بـ # هيستخدمه، غير كدة هيديله رمادي افتراضي
                // لو الاسم متسجل في الخريطة هيرجع الكود، لو مش سجل هيدي مراد
                const detectedCode = colorMap[nameLower] || colorMap[c] || (c.startsWith("#") ? c : "#cccccc");
                return { name: c, code: detectedCode };
            });

            const productData = {
                name: document.getElementById("adminProductName").value.trim(),
                price: parseFloat(document.getElementById("adminProductPrice").value) || 0,
                section: sectionSelect ? sectionSelect.value : "Oversized Hoodie Basic",
                subCategory: subCategorySelect ? subCategorySelect.value : "",
                status: document.getElementById("adminProductStatus") ? document.getElementById("adminProductStatus").value : "in-stock",
                description: document.getElementById("adminProductDesc") ? document.getElementById("adminProductDesc").value.trim() : "",
                sizes: sizes,
                colors: colors.length > 0 ? colors : [{ name: "Standard", code: "#000000" }],
                images: imageBase64List.length > 0 ? imageBase64List : ["asset/images/placeholder.png"],
                sizeGuide: sizeGuideBase64,
                sectionCover: sectionCoverBase64
            };

            if (editMode && editingId) {
                if (typeof updateProduct === "function") updateProduct(editingId, productData);
                showAdminMsg("تم تحديث المنتج بنجاح!", "success");
            } else {
                productData.id = typeof generateId === "function" ? generateId() : Date.now();
                if (typeof addProduct === "function") addProduct(productData);
                showAdminMsg("تم إضافة المنتج الجديد بنجاح!", "success");
            }

            form.reset();
            editMode = false;
            editingId = null;
            if (submitButton) submitButton.innerText = "حفظ المنتج والبيانات";

            // إعادة ضبط قائمة الـ Sub-Category بعد مسح الفورم
            if (subCategorySelect) subCategorySelect.innerHTML = '<option value="">اختر النوع (Sub-Category)</option>';

            // إعادة عرض الجدول فوراً بالمنتجات الجديدة
            loadAdminProductsTable();

        } catch (err) {
            console.error(err);
            showAdminMsg("حدث خطأ أثناء الحفظ التخزيني.", "danger");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };
}

function loadAdminProductsTable(explicitList = null) {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const list = explicitList || (typeof getProducts === "function" ? getProducts() : []);

    if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">لا توجد منتجات حالياً. قم بإضافة أول قطعة لبراند KHAM.</td></tr>`;
        return;
    }

    list.forEach(p => {
        const mainImg = p.images?.[0] || "asset/images/placeholder.png";
        const priceValue = parseFloat(p.price) || 0;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><img src="${mainImg}" loading="lazy" style="width:50px; height:50px; object-fit:cover; border-radius:8px;"></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.section} ${p.subCategory ? `- ${p.subCategory}` : ''}</td>
            <td><span class="badge ${p.status}">${p.status === 'in-stock' ? 'متوفر' : 'نفذت الكمية'}</span></td>
            <td>${priceValue.toFixed(2)} EGP</td>
            <td>
                <button onclick="editProductAdmin('${p.id}')" style="background:#ffc107; color:#000; padding:5px 10px; border:none; border-radius:4px; cursor:pointer; margin-right:4px;">تعديل</button>
                <button onclick="deleteProductAdmin('${p.id}')" style="background:#dc3545; color:#fff; padding:5px 10px; border:none; border-radius:4px; cursor:pointer;">حذف</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}
window.renderProductsTable = loadAdminProductsTable;

// 5. دالة التعديل
window.editProductAdmin = function (id) {
    if (typeof getProductById !== "function") return;
    const p = getProductById(id);
    if (!p) return;

    editMode = true;
    editingId = id;

    document.getElementById("adminProductName").value = p.name;
    document.getElementById("adminProductPrice").value = p.price;
    if (sectionSelect) sectionSelect.value = p.section;
    updateSubCategories();
    if (subCategorySelect) subCategorySelect.value = p.subCategory || "";
    if (document.getElementById("adminProductStatus")) document.getElementById("adminProductStatus").value = p.status;
    if (document.getElementById("adminProductDesc")) document.getElementById("adminProductDesc").value = p.description || "";

    document.querySelectorAll(".size-checkbox").forEach(cb => {
        cb.checked = p.sizes ? p.sizes.includes(cb.value) : false;
    });

    if (document.getElementById("adminProductColors")) {
        document.getElementById("adminProductColors").value = p.colors ? p.colors.map(c => c.name).join(", ") : "";
    }

    const submitButton = form.querySelector(".save-btn");
    if (submitButton) submitButton.innerText = "تحديث المنتج الحالي";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
window.editProduct = window.editProductAdmin;

// 6. دالة الحذف
window.deleteProductAdmin = function (id) {
    if (confirm("هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً؟")) {
        if (typeof deleteProduct === "function") deleteProduct(id);
        loadAdminProductsTable();
        showAdminMsg(" تم حذف المنتج بنجاح.", "success");
    }
};

// 7. رسائل التنبيهات
function showAdminMsg(text, type) {
    if (!msg) return;
    msg.innerText = text;
    msg.style.display = "block";
    if (type === "success") {
        msg.style.backgroundColor = "#e5f9e5";
        msg.style.color = "#28a745";
    } else {
        msg.style.backgroundColor = "#ffe5e5";
        msg.style.color = "#ff4d4d";
    }
    setTimeout(() => { msg.style.display = "none"; }, 4000);
}

// البحث الفوري
searchInput?.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase().trim();
    const all = typeof getProducts === "function" ? getProducts() : [];
    const filtered = all.filter(p =>
        p.name.toLowerCase().includes(value) ||
        p.section.toLowerCase().includes(value)
    );
    loadAdminProductsTable(filtered);
});

// تسجيل الخروج
window.logoutAdmin = function () {
    if (confirm("هل أنت متأكد من تسجيل الخروج؟")) {
        localStorage.removeItem("adminLoggedIn");
        window.location.href = "login.html";
    }
};

window.clearAllData = function () {
    if (confirm(" تحذير: سيتم مسح كافة المنتجات! هل أنت متأكد؟")) {
        localStorage.removeItem("products");
        loadAdminProductsTable([]);
        showAdminMsg(" تم مسح جميع البيانات بنجاح", "success");
    }
};

// 10. تشغيل الجدول
document.addEventListener("DOMContentLoaded", () => {
    if (sectionSelect) {
        sectionSelect.addEventListener("change", updateSubCategories);
        // تشغيلها لأول مرة لتهيئة الحقل بناءً على الاختيار الافتراضي
        updateSubCategories();
    }
    loadAdminProductsTable();
});
// 11. دالة سحرية
function autoFixOldProductsColors() {
    const allProducts = typeof getProducts === "function" ? getProducts() : [];
    if (allProducts.length === 0) return;

    const colorMap = {
        "أسود": "#000000", "black": "#000000",
        "أبيض": "#ffffff", "white": "#ffffff",
        "أصفر": "#ffeb3b", "yellow": "#ffeb3b",
        "أحمر": "#f44336", "red": "#f44336",
        "أزرق": "#2196f3", "blue": "#2196f3",
        "أخضر": "#4caf50", "green": "#4caf50",
        "رمادي": "#9e9e9e", "grey": "#9e9e9e", "gray": "#9e9e9e",
        "كحلي": "#001f3f", "navy": "#001f3f",
        "بيج": "#f5f5dc", "beige": "#f5f5dc",
        "بني": "#795548", "brown": "#795548",
        "برتقالي": "#ff9800", "orange": "#ff9800",
        "وردي": "#e91e63", "pink": "#e91e63",
        "بنفسجي": "#9c27b0", "purple": "#9c27b0",
        "زيتوني": "#556b2f", "olive": "#556b2f"
    };

    let updatedAny = false;

    const fixedProducts = allProducts.map(p => {
        if (p.colors && Array.from(p.colors).length > 0) {
            let itemChanged = false;
            const fixedColors = p.colors.map(c => {
                const nameLower = c.name.toLowerCase().trim();
                const correctCode = colorMap[nameLower] || colorMap[c.name] || (c.name.startsWith("#") ? c.name : "#cccccc");

                // لو الكود المتسجل حالياً غلط أو أبيض افتراضي وهو مش لون أبيض، نصلحه
                if (c.code !== correctCode && (c.code === "#ffffff" && nameLower !== "أبيض" && nameLower !== "white")) {
                    itemChanged = true;
                    updatedAny = true;
                    return { name: c.name, code: correctCode };
                }
                return c;
            });

            if (itemChanged) {
                return { ...p, colors: fixedColors };
            }
        }
        return p;
    });

    if (updatedAny && typeof saveProducts === "function") {
        saveProducts(fixedProducts);
        loadAdminProductsTable(); // إعادة عرض الجدول فوراً بالأكواد الجديدة
    }
}

// تشغيل الفحص التلقائي بمجرد تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(autoFixOldProductsColors, 500); // تأخير بسيط لضمان تحميل الداتا بالكامل
});