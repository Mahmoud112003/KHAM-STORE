// 1. استيراد الدوال الأساسية من الفايربيز وملف الإعدادات
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let editMode = false;
let editingId = null;
let cachedProducts = []; // مصفوفة محلية لتسهيل عمليات الفلترة والبحث الفوري

const form = document.getElementById("productForm");
const msg = document.getElementById("adminMsg");
const tableBody = document.getElementById("productsTableBody");
const searchInput = document.getElementById("searchInput");
const sectionSelect = document.getElementById("adminProductSection");
const subCategorySelect = document.getElementById("adminProductSubCategory");

// ==========================================
// 🛡️ خط الدفاع الأول: مراقبة حالة تسجيل الدخول وطرد المتسللين أونلاين
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // لو مفيش مستخدم مسجل دخول.. اطرده فوراً لصفحة اللوجن
        window.location.href = "login.html";
    } else {
        console.log("تم التحقق من هوية الأدمن بنجاح:", user.email);
        // تهيئة قائمة الـ Sub-Category وتشغيل سحب البيانات من Firestore
        if (sectionSelect) {
            sectionSelect.addEventListener("change", updateSubCategories);
            updateSubCategories();
        }
        await loadAdminProductsTable();
    }
});

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

    if (options.length === 1) {
        subCategorySelect.value = options[0];
    }
}
window.updateSubCategories = updateSubCategories;

// ==========================================
// ⚡ دالة ضغط الصور الذكية باستخدام الـ Canvas للحفاظ على سرعة الاستور
// ==========================================
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let { width, height } = img;

                // احتساب الأبعاد الجديدة مع الحفاظ على التناسب الـ Aspect Ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // إرجاع الصورة بصيغة جافا سكريبت النصية خفيفة الوزن
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// ==========================================
// 3. حفظ أو تحديث المنتج في Firebase Firestore
// ==========================================
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

            // 1️⃣ معالجة وضغط صور المنتج الأساسية
            if (imageInput && imageInput.files.length > 0) {
                for (let i = 0; i < imageInput.files.length; i++) {
                    console.log(`جاري ضغط صورة المنتج رقم ${i + 1}:`, imageInput.files[i].name);
                    const compressed = await compressImage(imageInput.files[i], 800, 800, 0.7);
                    imageBase64List.push(compressed);
                }
            } else if (editMode && editingId) {
                const currentProd = cachedProducts.find(p => p.id === editingId);
                if (currentProd) imageBase64List = currentProd.images || [];
            }

            // 2️⃣ معالجة وضغط صورة جدول المقاسات (Size Guide)
            const sizeGuideInput = document.getElementById("adminProductSizeGuide");
            let sizeGuideBase64 = "";
            if (editMode && editingId) {
                const currentProd = cachedProducts.find(p => p.id === editingId);
                sizeGuideBase64 = currentProd?.sizeGuide || "";
            }
            if (sizeGuideInput && sizeGuideInput.files.length > 0) {
                console.log("جاري ضغط صورة جدول المقاسات...");
                sizeGuideBase64 = await compressImage(sizeGuideInput.files[0], 800, 800, 0.7);
            }

            // 3️⃣ معالجة وضغط صورة غلاف القسم (Section Cover)
            const sectionCoverInput = document.getElementById("adminSectionCover");
            let sectionCoverBase64 = "";
            if (editMode && editingId) {
                const currentProd = cachedProducts.find(p => p.id === editingId);
                sectionCoverBase64 = currentProd?.sectionCover || "";
            }
            if (sectionCoverInput && sectionCoverInput.files.length > 0) {
                console.log("جاري ضغط صورة غلاف القسم...");
                sectionCoverBase64 = await compressImage(sectionCoverInput.files[0], 1200, 600, 0.7); // أبعاد أكبر تناسب الـ Cover
            }

            // تجهيز المقاسات والألوان المعطاة
            const sizes = Array.from(document.querySelectorAll(".size-checkbox:checked")).map(cb => cb.value);
            const colorInput = document.getElementById("adminProductColors");
            const rawColors = colorInput ? colorInput.value.split(",").map(c => c.trim()).filter(Boolean) : [];

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
                const detectedCode = colorMap[nameLower] || colorMap[c] || (c.startsWith("#") ? c : "#cccccc");
                return { name: c, code: detectedCode };
            });

            // بناء كائن البيانات النهائي الموجه للسيرفر
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
                sectionCover: sectionCoverBase64,
                updatedAt: new Date().toISOString()
            };

            if (editMode && editingId) {
                // تحديث مستند حقيقي داخل الفايربيز Firestore
                const productRef = doc(db, "products", editingId);
                await updateDoc(productRef, productData);
                showAdminMsg("تم تحديث المنتج بنجاح أونلاين!", "success");
            } else {
                // إضافة مستند جديد لـ Firestore
                productData.createdAt = new Date().toISOString();
                await addDoc(collection(db, "products"), productData);
                showAdminMsg("تم إضافة المنتج الجديد بنجاح لـ Firebase!", "success");
            }

            form.reset();
            editMode = false;
            editingId = null;
            if (submitButton) submitButton.innerText = "حفظ المنتج والبيانات";

            if (subCategorySelect) subCategorySelect.innerHTML = '<option value="">اختر النوع (Sub-Category)</option>';

            // إعادة سحب البيانات وعرض الجدول فوراً بعد الحفظ بلمح البصر
            await loadAdminProductsTable();

        } catch (err) {
            console.error(err);
            showAdminMsg("حدث خطأ أثناء الاتصال بالـ Firebase.", "danger");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };
}

// ==========================================
// 4. جلب وعرض البيانات من Firestore Database
// ==========================================
async function loadAdminProductsTable(explicitList = null) {
    if (!tableBody) return;
    
    if (!explicitList) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">جاري تحميل منتجات KHAM من السيرفر...</td></tr>`;
        try {
            const querySnapshot = await getDocs(collection(db, "products"));
            cachedProducts = [];
            querySnapshot.forEach((doc) => {
                cachedProducts.push({ id: doc.id, ...doc.data() });
            });
        } catch (error) {
            console.error("Error fetching products:", error);
            showAdminMsg("فشل جلب المنتجات من السيرفر. تحقق من الـ Rules الخاص بـ Firestore.", "danger");
            return;
        }
    }

    const list = explicitList || cachedProducts;
    tableBody.innerHTML = "";

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

// ==========================================
// 5. دالة تجهيز حقول الفورم للتعديل
// ==========================================
window.editProductAdmin = function (id) {
    const p = cachedProducts.find(prod => prod.id === id);
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

// ==========================================
// 6. دالة الحذف النهائي من Firestore
// ==========================================
window.deleteProductAdmin = async function (id) {
    if (confirm("هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من قاعدة البيانات؟")) {
        try {
            await deleteDoc(doc(db, "products", id));
            showAdminMsg("تم حذف المنتج بنجاح من السيرفر.", "success");
            await loadAdminProductsTable();
        } catch (error) {
            console.error("Delete Error:", error);
            showAdminMsg("فشل الحذف، حدث خطأ في السيرفر.", "danger");
        }
    }
};

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

// البحث الفوري عبر الـ Cache المحلي لتجنب استهلاك Requests الفايربيز بلا داعي
searchInput?.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase().trim();
    const filtered = cachedProducts.filter(p =>
        p.name.toLowerCase().includes(value) ||
        p.section.toLowerCase().includes(value)
    );
    loadAdminProductsTable(filtered);
});

// ==========================================
// 9. تسجيل الخروج الآمن أونلاين عبر Firebase Auth
// ==========================================
window.logoutAdmin = async function () {
    if (confirm("هل أنت متأكد من تسجيل الخروج؟")) {
        try {
            await signOut(auth);
            localStorage.removeItem("adminLoggedIn"); // تنظيف الـ Cache الاحتياطي
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout Error:", error);
        }
    }
};

window.clearAllData = function () {
    alert("هذا الخيار تم تعطيله للأمان التام لقاعدة بيانات Firestore السحابية.");
};