import { auth, db } from './firebase-config.js';
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const storage = getStorage();
let editMode = false;
let editingId = null;
let cachedProducts = [];

const form = document.getElementById("productForm");
const msg = document.getElementById("adminMsg");
const tableBody = document.getElementById("productsTableBody");

// 1. وظائف مساعدة (الضغط والرفع)
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
                    if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                } else {
                    if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
                }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
}

async function uploadToStorage(file, folder) {
    const compressedData = await compressImage(file);
    const fileName = Date.now() + "_" + file.name;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    await uploadString(storageRef, compressedData, 'data_url');
    return await getDownloadURL(storageRef);
}

function showAdminMsg(text, type) {
    if (!msg) return;
    msg.innerText = text;
    msg.style.display = "block";
    msg.style.backgroundColor = type === "success" ? "#e5f9e5" : "#ffe5e5";
    msg.style.color = type === "success" ? "#28a745" : "#ff4d4d";
    setTimeout(() => { msg.style.display = "none"; }, 4000);
}

// 2. معالجة حفظ البيانات (مع المقاسات والألوان)
form.onsubmit = async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector(".save-btn");
    submitButton.disabled = true;

    try {
        // جمع المقاسات المختارة
        const selectedSizes = Array.from(document.querySelectorAll('.size-checkbox:checked')).map(cb => cb.value);
        
        // رفع الصور
        const imageInput = document.getElementById("adminProductImages");
        let imageUrls = [];
        if (imageInput.files.length > 0) {
            for (let file of imageInput.files) {
                imageUrls.push(await uploadToStorage(file, 'products'));
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
            images: imageUrls.length > 0 ? imageUrls : (editMode ? cachedProducts.find(p=>p.id===editingId).images : []),
            updatedAt: new Date().toISOString()
        };

        if (editMode && editingId) {
            await updateDoc(doc(db, "products", editingId), productData);
            showAdminMsg("تم التحديث!", "success");
        } else {
            await addDoc(collection(db, "products"), { ...productData, createdAt: new Date().toISOString() });
            showAdminMsg("تمت الإضافة!", "success");
        }
        form.reset();
        await loadAdminProductsTable();
    } catch (err) {
        showAdminMsg("خطأ: " + err.message, "danger");
    } finally {
        submitButton.disabled = false;
    }
};

// 3. عرض الجدول
async function loadAdminProductsTable() {
    const querySnapshot = await getDocs(collection(db, "products"));
    cachedProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    tableBody.innerHTML = "";
    cachedProducts.forEach(p => {
        tableBody.innerHTML += `<tr>
            <td><img src="${p.images?.[0] || ''}" style="width:50px;"></td>
            <td>${p.name}</td>
            <td>${p.section}</td>
            <td>${p.status}</td>
            <td>${p.price}</td>
            <td><button onclick="window.deleteProduct('${p.id}')">حذف</button></td>
        </tr>`;
    });
}

// 4. دالة الحذف (تعريفها في window لتستدعيها الـ onclick)
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

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "login.html";
    else loadAdminProductsTable();
});