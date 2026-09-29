import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { DEFAULT_ANNOUNCEMENT_SETTINGS, isSafeAnnouncementColor, loadAnnouncementSettings, saveAnnouncementSettings } from './announcement.js';
import { isProductCompletelySoldOut } from './store.js';

if (!localStorage.getItem("adminLoggedIn")) {
    window.location.href = "login.html";
}

let editMode = false;
let editingId = null;
let allProductsCache = []; // عملنا كاش للمنتجات عشان البحث والتعديل يكونوا صاروخ

const form = document.getElementById("productForm");
const msg = document.getElementById("adminMsg");
const tableBody = document.getElementById("productsTableBody");
const searchInput = document.getElementById("searchInput");
const sectionSelect = document.getElementById("adminProductSection");
const subCategorySelect = document.getElementById("adminProductSubCategory");
const productColorList = document.getElementById("productColorList");
const addProductColorButton = document.getElementById("addProductColor");
const announcementForm = document.getElementById("announcementForm");
const announcementEnabled = document.getElementById("announcementEnabled");
const announcementText = document.getElementById("announcementText");
const announcementBackgroundColor = document.getElementById("announcementBackgroundColor");
const announcementTextColor = document.getElementById("announcementTextColor");
const COLOR_HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const LEGACY_COLOR_CODE_MAP = {
    "أسود": "#000000", black: "#000000",
    "أبيض": "#ffffff", white: "#ffffff",
    "أصفر": "#ffeb3b", yellow: "#ffeb3b",
    "أحمر": "#f44336", red: "#f44336",
    "أزرق": "#2196f3", blue: "#2196f3",
    "أخضر": "#4caf50", green: "#4caf50",
    "رمادي": "#9e9e9e", grey: "#9e9e9e", gray: "#9e9e9e",
    "كحلي": "#001f3f", navy: "#001f3f",
    "بيج": "#f5f5dc", beige: "#f5f5dc",
    "بني": "#795548", brown: "#795548",
    "برتقالي": "#ff9800", orange: "#ff9800",
    "وردي": "#e91e63", pink: "#e91e63",
    "بنفسجي": "#9c27b0", purple: "#9c27b0",
    "زيتوني": "#556b2f", olive: "#556b2f"
};
let colorDrafts = [];
let nextColorDraftId = 1;

function getAdminText(key, fallback) {
    return window.getText ? window.getText(key, fallback) : fallback;
}

function restoreProductSubmitButton(button) {
    if (!button) return;
    button.innerText = editMode
        ? getAdminText("updateProduct", "Update current product")
        : getAdminText("saveProduct", "Save product and data");
}

function isSupportedProductImage(source) {
    return typeof source === "string" && (
        /^data:image\/[a-z0-9.+-]+;base64,/i.test(source) ||
        /^https?:\/\//i.test(source) ||
        /^(?:\.\/|\/)?asset\/[a-z0-9_./-]+$/i.test(source)
    );
}

function isInventoryMap(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getSelectedProductSizes() {
    return Array.from(document.querySelectorAll(".size-checkbox:checked"), checkbox => checkbox.value);
}

function normalizeProductColors(colors) {
    if (!Array.isArray(colors)) return [];

    return colors.map(color => {
        const name = typeof color === "string" ? color.trim() : String(color?.name || "").trim();
        if (!name) return null;

        const candidateCode = typeof color === "string" && COLOR_HEX_PATTERN.test(color)
            ? color
            : color?.code || color?.value;
        const code = COLOR_HEX_PATTERN.test(candidateCode || "")
            ? candidateCode
            : LEGACY_COLOR_CODE_MAP[name.toLowerCase()] || LEGACY_COLOR_CODE_MAP[name] || "#cccccc";

        const inventoryEnabled = isInventoryMap(color?.inventory);
        return {
            id: nextColorDraftId++,
            name,
            code,
            images: Array.isArray(color?.images) ? color.images.filter(isSupportedProductImage) : [],
            inventoryEnabled,
            inventoryLocked: inventoryEnabled,
            inventory: inventoryEnabled ? { ...color.inventory } : {},
            files: [],
            previewUrls: []
        };
    }).filter(Boolean);
}

function createColorField(labelText, control) {
    const group = document.createElement("div");
    group.className = "form-group";
    const label = document.createElement("label");
    label.textContent = labelText;
    label.htmlFor = control.id;
    group.append(label, control);
    return group;
}

function renderColorImages(card, draft) {
    draft.previewUrls.forEach(url => URL.revokeObjectURL(url));
    draft.previewUrls = [];

    const list = card.querySelector(".color-image-list");
    list.innerHTML = "";

    const addImageItem = (source, index, pending) => {
        const item = document.createElement("div");
        item.className = "color-image-item";
        const image = document.createElement("img");
        image.src = source;
        image.alt = `${draft.name || getAdminText("colorName", "Color name")} ${index + 1}`;
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-color-image-btn";
        removeButton.textContent = getAdminText("removeImage", "Remove image");
        removeButton.addEventListener("click", () => {
            if (pending) draft.files.splice(index, 1);
            else draft.images.splice(index, 1);
            renderColorImages(card, draft);
        });
        item.append(image, removeButton);
        list.appendChild(item);
    };

    draft.images.forEach((source, index) => addImageItem(source, index, false));
    draft.files.forEach((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        draft.previewUrls.push(previewUrl);
        addImageItem(previewUrl, index, true);
    });
}

function renderColorInventory(card, draft) {
    if (draft.inventoryEnabled) {
        draft.inventory ||= {};
        getSelectedProductSizes().forEach(size => {
            if (!Object.prototype.hasOwnProperty.call(draft.inventory, size)) draft.inventory[size] = 0;
        });
    }

    const section = document.createElement("section");
    section.className = "color-inventory-editor";
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "color-inventory-toggle";
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = `trackInventory-${draft.id}`;
    toggle.checked = draft.inventoryEnabled;
    toggle.disabled = draft.inventoryLocked;
    const toggleText = document.createElement("span");
    toggleText.textContent = getAdminText("trackInventoryBySize", "Track inventory by size");
    toggleLabel.append(toggle, toggleText);
    section.appendChild(toggleLabel);

    const quantityFields = document.createElement("div");
    quantityFields.className = "color-inventory-fields";
    quantityFields.hidden = !draft.inventoryEnabled;

    if (draft.inventoryEnabled) {
        getSelectedProductSizes().forEach(size => {
            const row = document.createElement("div");
            row.className = "color-inventory-row";
            const quantityInput = document.createElement("input");
            quantityInput.type = "number";
            quantityInput.id = `inventory-${draft.id}-${size}`;
            quantityInput.min = "0";
            quantityInput.step = "1";
            quantityInput.required = true;
            const currentQuantity = draft.inventory[size];
            quantityInput.value = Number.isSafeInteger(currentQuantity) && currentQuantity >= 0
                ? String(currentQuantity)
                : "";
            quantityInput.defaultValue = quantityInput.value;
            quantityInput.addEventListener("input", () => {
                draft.inventory[size] = quantityInput.value === "" ? "" : Number(quantityInput.value);
            });
            row.appendChild(createColorField(size, quantityInput));
            quantityFields.appendChild(row);
        });
    }
    section.appendChild(quantityFields);
    card.appendChild(section);

    toggle.addEventListener("change", () => {
        if (!toggle.checked) return;
        draft.inventoryEnabled = true;
        draft.inventoryLocked = true;
        draft.inventory ||= {};
        getSelectedProductSizes().forEach(size => {
            if (!Object.prototype.hasOwnProperty.call(draft.inventory, size)) draft.inventory[size] = 0;
        });
        renderProductColors();
    });
}

function renderProductColors() {
    if (!productColorList) return;
    productColorList.innerHTML = "";

    if (colorDrafts.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = getAdminText("noProductColors", "No colors added.");
        productColorList.appendChild(emptyMessage);
        return;
    }

    colorDrafts.forEach(draft => {
        if (draft.inventoryEnabled) {
            draft.inventory ||= {};
            getSelectedProductSizes().forEach(size => {
                if (!Object.prototype.hasOwnProperty.call(draft.inventory, size)) draft.inventory[size] = 0;
            });
        }

        const card = document.createElement("fieldset");
        card.className = "product-color-card";
        const legend = document.createElement("legend");
        legend.textContent = draft.name || getAdminText("colorName", "Color name");
        card.appendChild(legend);

        const header = document.createElement("div");
        header.className = "product-color-card-header";
        const removeColorButton = document.createElement("button");
        removeColorButton.type = "button";
        removeColorButton.className = "remove-product-color-btn";
        removeColorButton.textContent = getAdminText("removeColor", "Remove color");
        removeColorButton.addEventListener("click", () => {
            draft.previewUrls.forEach(url => URL.revokeObjectURL(url));
            colorDrafts = colorDrafts.filter(color => color.id !== draft.id);
            renderProductColors();
        });
        header.appendChild(removeColorButton);
        card.appendChild(header);

        const fields = document.createElement("div");
        fields.className = "product-color-fields";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.id = `productColorName-${draft.id}`;
        nameInput.value = draft.name;
        nameInput.maxLength = 40;
        nameInput.addEventListener("input", () => {
            draft.name = nameInput.value;
            legend.textContent = draft.name || getAdminText("colorName", "Color name");
        });

        const codeInput = document.createElement("input");
        codeInput.type = "color";
        codeInput.id = `productColorCode-${draft.id}`;
        codeInput.value = draft.code;
        codeInput.defaultValue = draft.code;
        codeInput.addEventListener("input", () => { draft.code = codeInput.value; });

        fields.append(
            createColorField(getAdminText("colorName", "Color name"), nameInput),
            createColorField(getAdminText("colorValue", "Color value"), codeInput)
        );
        card.appendChild(fields);

        const imageInput = document.createElement("input");
        imageInput.type = "file";
        imageInput.id = `productColorImages-${draft.id}`;
        imageInput.accept = "image/*";
        imageInput.multiple = true;
        imageInput.addEventListener("change", () => {
            draft.files = Array.from(imageInput.files || []);
            renderColorImages(card, draft);
        });
        card.appendChild(createColorField(getAdminText("colorImages", "Images for this color"), imageInput));

        const imageList = document.createElement("div");
        imageList.className = "color-image-list";
        card.appendChild(imageList);
        productColorList.appendChild(card);
        renderColorImages(card, draft);
        renderColorInventory(card, draft);
    });
}

addProductColorButton?.addEventListener("click", () => {
    const inventory = Object.fromEntries(getSelectedProductSizes().map(size => [size, 0]));
    colorDrafts.push({ id: nextColorDraftId++, name: "", code: "#000000", images: [], inventoryEnabled: true, inventoryLocked: true, inventory, files: [], previewUrls: [] });
    renderProductColors();
    productColorList.querySelector(".product-color-card:last-child input[type='text']")?.focus();
});

document.querySelectorAll(".size-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", renderProductColors);
});

renderProductColors();


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
                const currentProd = allProductsCache.find(p => p.id === editingId);
                if (currentProd) imageBase64List = currentProd.images || [];
            }

            const sizeGuideInput = document.getElementById("adminProductSizeGuide");
            let sizeGuideBase64 = editMode && editingId ? (allProductsCache.find(p => p.id === editingId)?.sizeGuide || "") : "";
            if (sizeGuideInput && sizeGuideInput.files.length > 0) {
                sizeGuideBase64 = await compressImage(sizeGuideInput.files[0]);
            }

            const sectionCoverInput = document.getElementById("adminSectionCover");
            let sectionCoverBase64 = editMode && editingId ? (allProductsCache.find(p => p.id === editingId)?.sectionCover || "") : "";
            if (sectionCoverInput && sectionCoverInput.files.length > 0) {
                sectionCoverBase64 = await compressImage(sectionCoverInput.files[0]);
            }

            // استخراج المقاسات والألوان المكتوبة
            const sizes = Array.from(document.querySelectorAll(".size-checkbox:checked")).map(cb => cb.value);
            const colors = [];
            const colorNames = new Set();
            for (const draft of colorDrafts) {
                const name = draft.name.trim();
                const normalizedName = name.toLocaleLowerCase();

                if (!name) {
                    showAdminMsg(getAdminText("colorNameRequired", "Enter a name for every color."), "danger");
                    restoreProductSubmitButton(submitButton);
                    document.getElementById(`productColorName-${draft.id}`)?.focus();
                    return;
                }
                if (colorNames.has(normalizedName)) {
                    showAdminMsg(getAdminText("duplicateColorName", "Color names must be unique."), "danger");
                    restoreProductSubmitButton(submitButton);
                    document.getElementById(`productColorName-${draft.id}`)?.focus();
                    return;
                }
                if (!COLOR_HEX_PATTERN.test(draft.code)) {
                    showAdminMsg(getAdminText("invalidColorValue", "Choose a valid HEX color."), "danger");
                    restoreProductSubmitButton(submitButton);
                    return;
                }
                if (draft.files.some(file => !file.type.startsWith("image/"))) {
                    showAdminMsg(getAdminText("invalidColorImage", "Choose image files only."), "danger");
                    restoreProductSubmitButton(submitButton);
                    return;
                }

                const inventory = { ...draft.inventory };
                if (draft.inventoryEnabled) {
                    for (const size of sizes) {
                        const quantity = inventory[size];
                        if (!Number.isSafeInteger(quantity) || quantity < 0) {
                            showAdminMsg(getAdminText("invalidInventoryQuantity", "Enter a whole quantity of zero or more for every active size."), "danger");
                            document.getElementById(`inventory-${draft.id}-${size}`)?.focus();
                            restoreProductSubmitButton(submitButton);
                            return;
                        }
                    }
                }

                colorNames.add(normalizedName);
                const images = [...draft.images];
                for (const file of draft.files) {
                    images.push(await compressImage(file));
                }
                colors.push({
                    name,
                    code: draft.code.toUpperCase(),
                    images,
                    ...(draft.inventoryEnabled ? { inventory } : {})
                });
            }

            const selectedStatus = document.getElementById("adminProductStatus")?.value || "in-stock";
            const inventoryStatus = colors.some(color => isInventoryMap(color.inventory))
                ? (isProductCompletelySoldOut({ status: selectedStatus, sizes, colors }) ? "out-of-stock" : "in-stock")
                : selectedStatus;

            const productData = {
                name: document.getElementById("adminProductName").value.trim(),
                price: parseFloat(document.getElementById("adminProductPrice").value) || 0,
                section: sectionSelect ? sectionSelect.value : "Oversized Hoodie Basic",
                subCategory: subCategorySelect ? subCategorySelect.value : "",
                status: inventoryStatus,
                description: document.getElementById("adminProductDesc") ? document.getElementById("adminProductDesc").value.trim() : "",
                sizes: sizes,
                colors,
                images: imageBase64List.length > 0 ? imageBase64List : ["asset/images/placeholder.png"],
                sizeGuide: sizeGuideBase64,
                sectionCover: sectionCoverBase64,
                createdAt: editMode && editingId
                    ? allProductsCache.find(product => product.id === editingId)?.createdAt || new Date().toISOString()
                    : new Date().toISOString()
            };

            if (editMode && editingId) {
                // تحديث في الفاير بيز
                await updateDoc(doc(db, "products", editingId), productData);
                showAdminMsg("تم تحديث المنتج بنجاح!", "success");
            } else {
                // إضافة للفاير بيز
                await addDoc(collection(db, "products"), productData);
                showAdminMsg("تم إضافة المنتج الجديد بنجاح!", "success");
            }

            form.reset();
            editMode = false;
            editingId = null;
            colorDrafts.forEach(color => color.previewUrls.forEach(url => URL.revokeObjectURL(url)));
            colorDrafts = [];
            renderProductColors();
            if (submitButton) submitButton.innerText = "حفظ المنتج والبيانات";

            // إعادة ضبط قائمة الـ Sub-Category بعد مسح الفورم
            if (subCategorySelect) subCategorySelect.innerHTML = '<option value="">اختر النوع (Sub-Category)</option>';

            // إعادة عرض الجدول فوراً بالمنتجات الجديدة
            await loadAdminProductsTable();

        } catch (err) {
            console.error(err);
            showAdminMsg("حدث خطأ أثناء الحفظ التخزيني.", "danger");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };
}

async function loadAdminProductsTable(explicitList = null) {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    let list = explicitList;

    // لو مفيش ليستة مبعوتة للبحث، هنجيب من الفاير بيز
    if (!list) {
        try {
            const querySnapshot = await getDocs(collection(db, "products"));
            allProductsCache = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list = allProductsCache;
        } catch (error) {
            console.error("Error fetching products:", error);
            list = [];
        }
    }

    if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">لا توجد منتجات حالياً. قم بإضافة أول قطعة لبراند KHAM.</td></tr>`;
        return;
    }

    list.forEach(p => {
        const mainImg = p.images?.[0] || "asset/images/placeholder.png";
        const priceValue = parseFloat(p.price) || 0;
        const isSoldOut = isProductCompletelySoldOut(p);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><img src="${mainImg}" loading="lazy" style="width:50px; height:50px; object-fit:cover; border-radius:8px;"></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.section} ${p.subCategory ? `- ${p.subCategory}` : ''}</td>
            <td><span class="badge ${isSoldOut ? 'out-of-stock' : 'in-stock'}">${isSoldOut ? 'نفذت الكمية' : 'متوفر'}</span></td>
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
    const p = allProductsCache.find(item => item.id === id);
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

    colorDrafts.forEach(color => color.previewUrls.forEach(url => URL.revokeObjectURL(url)));
    colorDrafts = normalizeProductColors(p.colors);
    renderProductColors();

    const submitButton = form.querySelector(".save-btn");
    if (submitButton) submitButton.innerText = "تحديث المنتج الحالي";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
window.editProduct = window.editProductAdmin;

// 6. دالة الحذف
window.deleteProductAdmin = async function (id) {
    if (confirm("هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً؟")) {
        try {
            await deleteDoc(doc(db, "products", id));
            await loadAdminProductsTable();
            showAdminMsg(" تم حذف المنتج بنجاح.", "success");
        } catch (error) {
            console.error(error);
            showAdminMsg("حدث خطأ أثناء الحذف.", "danger");
        }
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

async function loadAnnouncementForm() {
    if (!announcementForm) return;

    try {
        const settings = await loadAnnouncementSettings() || DEFAULT_ANNOUNCEMENT_SETTINGS;
        announcementEnabled.checked = settings.enabled;
        announcementText.value = settings.text;
        announcementBackgroundColor.value = settings.backgroundColor;
        announcementTextColor.value = settings.textColor;
    } catch (error) {
        console.error("Error loading announcement settings:", error);
        showAdminMsg("Failed to load announcement settings.", "danger");
    }
}

if (announcementForm) {
    announcementForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const text = announcementText.value.trim();
        const enabled = announcementEnabled.checked;
        const backgroundColor = announcementBackgroundColor.value;
        const textColor = announcementTextColor.value;

        if (enabled && !text) {
            showAdminMsg("Please enter announcement text.", "danger");
            announcementText.focus();
            return;
        }

        if (!isSafeAnnouncementColor(backgroundColor) || !isSafeAnnouncementColor(textColor)) {
            showAdminMsg("Please choose valid announcement colors.", "danger");
            return;
        }

        const saveButton = announcementForm.querySelector("button[type='submit']");
        if (saveButton) saveButton.disabled = true;

        try {
            await saveAnnouncementSettings({ enabled, text, backgroundColor, textColor });
            showAdminMsg("Announcement saved successfully.", "success");
        } catch (error) {
            console.error("Error saving announcement settings:", error);
            showAdminMsg("Failed to save announcement. Please try again.", "danger");
        } finally {
            if (saveButton) saveButton.disabled = false;
        }
    });
}

// البحث الفوري
searchInput?.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase().trim();
    const filtered = allProductsCache.filter(p =>
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

window.clearAllData = async function () {
    if (confirm(" تحذير: سيتم مسح كافة المنتجات! هل أنت متأكد؟")) {
        try {
            // مسح كل المنتجات من الفاير بيز
            for (const p of allProductsCache) {
                await deleteDoc(doc(db, "products", p.id));
            }
            await loadAdminProductsTable();
            showAdminMsg(" تم مسح جميع البيانات بنجاح", "success");
        } catch (error) {
            showAdminMsg("حدث خطأ أثناء مسح البيانات", "danger");
        }
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
    loadAnnouncementForm();
});

// 11. دالة سحرية
async function autoFixOldProductsColors() {
    if (allProductsCache.length === 0) return;

    let updatedAny = false;

    for (const p of allProductsCache) {
        if (p.colors && Array.from(p.colors).length > 0) {
            let itemChanged = false;
            const fixedColors = p.colors.map(c => {
                const colorName = typeof c === "string" ? c : String(c?.name || "");
                const nameLower = colorName.toLowerCase().trim();
                const correctCode = LEGACY_COLOR_CODE_MAP[nameLower] || LEGACY_COLOR_CODE_MAP[colorName] || (COLOR_HEX_PATTERN.test(colorName) ? colorName : "#cccccc");

                // لو الكود المتسجل حالياً غلط أو أبيض افتراضي وهو مش لون أبيض، نصلحه
                if (typeof c === "object" && c && c.code !== correctCode && (c.code === "#ffffff" && nameLower !== "أبيض" && nameLower !== "white")) {
                    itemChanged = true;
                    updatedAny = true;
                    return { ...c, code: correctCode };
                }
                return c;
            });

            if (itemChanged) {
                // تحديث مباشر في الفاير بيز للمنتجات اللي اتصلحت
                await updateDoc(doc(db, "products", p.id), { colors: fixedColors });
            }
        }
    }

    if (updatedAny) {
        await loadAdminProductsTable(); // إعادة عرض الجدول فوراً بالأكواد الجديدة
    }
}

// تشغيل الفحص التلقائي بمجرد تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(autoFixOldProductsColors, 1500); // وقت إضافي بسيط لضمان تحميل الداتا من الفاير بيز
});