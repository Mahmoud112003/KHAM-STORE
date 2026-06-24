import { db } from './firebase-config.js'; // تأكد من استيراد db من ملف إعداداتك
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// التحقق من تسجيل الدخول
if (!localStorage.getItem("adminLoggedIn")) { window.location.href = "login.html"; }

let editMode = false;
let editingId = null;
let cachedProducts = []; // لسرعة العرض محلياً
const form = document.getElementById("productForm");
const msg = document.getElementById("adminMsg");
const tableBody = document.getElementById("productsTableBody");
const sectionSelect = document.getElementById("adminProductSection");
const subCategorySelect = document.getElementById("adminProductSubCategory");

// دالة الضغط (Base64)
async function compressImage(file, maxWidth = 800, quality = 0.6) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
}

// دالة جلب البيانات من Firestore
async function loadAdminProductsTable() {
    if (!tableBody) return;
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    cachedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    tableBody.innerHTML = cachedProducts.map(p => `
        <tr>
            <td><img src="${p.images?.[0]}" style="width:50px; height:50px; object-fit:cover; border-radius:8px;"></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.section}</td>
            <td>${p.price} EGP</td>
            <td>
                <button onclick="editProductAdmin('${p.id}')">تعديل</button>
                <button onclick="deleteProductAdmin('${p.id}')">حذف</button>
            </td>
        </tr>
    `).join("");
}

// حفظ أو تحديث
form.onsubmit = async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector(".save-btn");
    submitButton.disabled = true;

    try {
        const imageInput = document.getElementById("adminProductImages");
        let imageBase64List = [];

        if (imageInput.files.length > 0) {
            for (let file of imageInput.files) {
                imageBase64List.push(await compressImage(file));
            }
        } else if (editMode) {
            imageBase64List = cachedProducts.find(p => p.id === editingId).images;
        }

        const productData = {
            name: document.getElementById("adminProductName").value,
            price: parseFloat(document.getElementById("adminProductPrice").value),
            section: sectionSelect.value,
            images: imageBase64List,
            createdAt: new Date().toISOString()
        };

        if (editMode) {
            await updateDoc(doc(db, "products", editingId), productData);
            showAdminMsg("تم التحديث بنجاح!", "success");
        } else {
            await addDoc(collection(db, "products"), productData);
            showAdminMsg("تمت الإضافة بنجاح!", "success");
        }

        form.reset(); editMode = false;
        loadAdminProductsTable();
    } catch (err) {
        showAdminMsg("خطأ: " + err.message, "danger");
    } finally {
        submitButton.disabled = false;
    }
};

window.deleteProductAdmin = async (id) => {
    if (confirm("حذف المنتج؟")) {
        await deleteDoc(doc(db, "products", id));
        loadAdminProductsTable();
    }
};

function showAdminMsg(text, type) {
    msg.innerText = text; msg.style.display = "block";
    msg.style.backgroundColor = type === "success" ? "#e5f9e5" : "#ffe5e5";
    setTimeout(() => { msg.style.display = "none"; }, 4000);
}

document.addEventListener("DOMContentLoaded", loadAdminProductsTable);