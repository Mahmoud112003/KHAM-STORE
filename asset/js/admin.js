// استيراد الإعدادات من ملفك
import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from './firebase-config.js';

// --- دوال الـ Firebase المدمجة ---
async function addProduct(data) { await addDoc(collection(db, "products"), data); }
async function updateProduct(id, data) { await updateDoc(doc(db, "products", id), data); }
async function deleteProduct(id) { await deleteDoc(doc(db, "products", id)); }
async function getProducts() {
    const snapshot = await getDocs(collection(db, "products"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
async function getProductById(id) {
    const products = await getProducts();
    return products.find(p => p.id === id);
}

// ... (باقي الكود الخاص بك كما هو) ...

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

// [وظائف updateSubCategories و compressImage كما هي في كودك]
function updateSubCategories() {
    if (!sectionSelect || !subCategorySelect) return;
    const section = sectionSelect.value;
    subCategorySelect.innerHTML = '<option value="">اختر النوع (Sub-Category)</option>';
    let options = [];
    if (section === "Oversized Hoodie Basic" || section === "Oversized Hoodie Printed") options = ["Oversized Hoodie"];
    else if (section === "T-shirt Basic" || section === "T-shirt Printed") options = ["T-shirt"];
    else if (section === "Sweatpants") options = ["Sweatpants"];
    else if (section === "Jeans") options = ["Jeans"];
    options.forEach(opt => {
        const optionEl = document.createElement("option");
        optionEl.value = opt; optionEl.innerText = opt;
        subCategorySelect.appendChild(optionEl);
    });
    if (options.length === 1) subCategorySelect.value = options[0];
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
                if (width > height) { if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; } }
                else { if (height > maxHeight) { width = (width * maxHeight) / height; height = maxHeight; } }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
}

// 3. حفظ أو تحديث المنتج
if (form) {
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector(".save-btn");
        submitButton.innerText = "جاري الحفظ...";
        submitButton.disabled = true;

        try {
            const imageInput = document.getElementById("adminProductImages");
            let imageBase64List = [];
            if (imageInput && imageInput.files.length > 0) {
                for (let i = 0; i < imageInput.files.length; i++) {
                    imageBase64List.push(await compressImage(imageInput.files[i]));
                }
            } else if (editMode) {
                const oldProd = await getProductById(editingId);
                imageBase64List = oldProd.images;
            }

            const sizeGuideInput = document.getElementById("adminProductSizeGuide");
            let sizeGuideBase64 = "";
            if (sizeGuideInput.files.length > 0) sizeGuideBase64 = await compressImage(sizeGuideInput.files[0]);
            else if (editMode) sizeGuideBase64 = (await getProductById(editingId)).sizeGuide;

            const sectionCoverInput = document.getElementById("adminSectionCover");
            let sectionCoverBase64 = "";
            if (sectionCoverInput.files.length > 0) sectionCoverBase64 = await compressImage(sectionCoverInput.files[0]);
            else if (editMode) sectionCoverBase64 = (await getProductById(editingId)).sectionCover;

            const sizes = Array.from(document.querySelectorAll(".size-checkbox:checked")).map(cb => cb.value);
            const rawColors = document.getElementById("adminProductColors").value.split(",").map(c => c.trim()).filter(Boolean);

            const productData = {
                name: document.getElementById("adminProductName").value.trim(),
                price: parseFloat(document.getElementById("adminProductPrice").value) || 0,
                section: sectionSelect.value,
                subCategory: subCategorySelect.value,
                status: document.getElementById("adminProductStatus").value,
                description: document.getElementById("adminProductDesc").value.trim(),
                sizes: sizes,
                colors: rawColors.map(c => ({ name: c, code: "#cccccc" })),
                images: imageBase64List,
                sizeGuide: sizeGuideBase64,
                sectionCover: sectionCoverBase64,
                createdAt: new Date().toISOString()
            };

            if (editMode) await updateProduct(editingId, productData);
            else await addProduct(productData);

            showAdminMsg("تم الحفظ بنجاح!", "success");
            form.reset();
            editMode = false;
            loadAdminProductsTable();
        } catch (err) {
            showAdminMsg("خطأ: " + err.message, "danger");
        } finally {
            submitButton.innerText = "حفظ المنتج والبيانات";
            submitButton.disabled = false;
        }
    };
}

// [باقي دالة loadAdminProductsTable وبقية الدوال كما هي بالضبط]
// فقط تأكد أن تستخدم await عند استدعاء getProducts()
async function loadAdminProductsTable(explicitList = null) {
    if (!tableBody) return;
    const list = explicitList || (await getProducts());
    // ... (إكمال عرض الجدول كما هو في كودك الأصلي)
}

// ... [بقية الدوال editProductAdmin, deleteProductAdmin, logout... كما هي]