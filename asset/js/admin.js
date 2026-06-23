import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let editMode = false;
let editingId = null;
let cachedProducts = [];

const form = document.getElementById("productForm");
const msg = document.getElementById("adminMsg");
const tableBody = document.getElementById("productsTableBody");

// 1. دالة الرفع إلى Cloudinary
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "kham_store"); // تأكد أن هذا الاسم مطابق لما في لوحة تحكم Cloudinary

    try {
        const response = await fetch(
            "https://api.cloudinary.com/v1_1/di1xlbutv/image/upload",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!data.secure_url) {
            throw new Error(data.error?.message || "فشل رفع الصورة إلى Cloudinary");
        }

        return data.secure_url;
    } catch (err) {
        console.error("Cloudinary Error:", err);
        throw err;
    }
}

function showAdminMsg(text, type) {
    if (!msg) return;
    msg.innerText = text;
    msg.style.display = "block";
    msg.style.backgroundColor = type === "success" ? "#e5f9e5" : "#ffe5e5";
    msg.style.color = type === "success" ? "#28a745" : "#ff4d4d";
    setTimeout(() => { msg.style.display = "none"; }, 4000);
}

// 2. معالجة حفظ البيانات
form.onsubmit = async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector(".save-btn");
    submitButton.disabled = true;

    try {
        const selectedSizes = Array.from(document.querySelectorAll('.size-checkbox:checked')).map(cb => cb.value);
        
        // رفع الصور إلى Cloudinary
        const imageInput = document.getElementById("adminProductImages");
        let imageUrls = [];
        
        if (imageInput.files && imageInput.files.length > 0) {
            showAdminMsg("جاري رفع الصور، يرجى الانتظار...", "success");
            for (let file of imageInput.files) {
                const url = await uploadToCloudinary(file);
                imageUrls.push(url);
            }
        }

        const productData = {
            name: document.getElementById("adminProductName").value,
            price: parseFloat(document.getElementById("adminProductPrice").value),
            section: document.getElementById("adminProductSection").value,
            subCategory: document.getElementById("adminProductSubCategory").value,
            status: document.getElementById("adminProductStatus").value,
            colors: document.getElementById("adminProductColors").value.split(',').map(c => c.trim()),
            description: document.getElementById("adminProductDesc").value,
            sizes: selectedSizes,
            images: imageUrls.length > 0 ? imageUrls : (editMode ? cachedProducts.find(p=>p.id===editingId)?.images : []),
            updatedAt: new Date().toISOString()
        };

        if (editMode && editingId) {
            await updateDoc(doc(db, "products", editingId), productData);
            showAdminMsg("تم التحديث بنجاح!", "success");
        } else {
            await addDoc(collection(db, "products"), { ...productData, createdAt: new Date().toISOString() });
            showAdminMsg("تمت الإضافة بنجاح!", "success");
        }
        
        form.reset();
        await loadAdminProductsTable();
    } catch (err) {
        console.error(err);
        showAdminMsg("خطأ أثناء الحفظ: " + err.message, "danger");
    } finally {
        submitButton.disabled = false;
    }
};

// 3. عرض الجدول
async function loadAdminProductsTable() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        cachedProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        tableBody.innerHTML = "";
        cachedProducts.forEach(p => {
            tableBody.innerHTML += `<tr>
                <td><img src="${p.images?.[0] || ''}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;"></td>
                <td>${p.name}</td>
                <td>${p.section}</td>
                <td>${p.status}</td>
                <td>${p.price} EGP</td>
                <td><button onclick="window.deleteProduct('${p.id}')">حذف</button></td>
            </tr>`;
        });
    } catch (err) {
        console.error("Error loading products:", err);
    }
}

// 4. دوال التحكم
window.deleteProduct = async (id) => {
    if (confirm("تأكيد الحذف؟")) {
        await deleteDoc(doc(db, "products", id));
        loadAdminProductsTable();
    }
};

window.logoutAdmin = async () => {
    await signOut(auth);
    window.location.href = "login.html";
};

window.clearAllData = () => {
    alert("ميزة مسح البيانات تتطلب صلاحيات خاصة.");
};

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "login.html";
    else loadAdminProductsTable();
});