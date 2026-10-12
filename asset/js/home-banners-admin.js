import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { compressImage } from "./admin.js";
import { applyHomeHeroPosition, normalizeHomeHeroPosition } from "./home-hero-position.js";

const ADMIN_UID = "UYC7sTnExQds6M1o4PP5joixLNL2";
const bannerRef = doc(db, "homeBanners", "homeHero");
const form = document.getElementById("homeBannerForm");
const imageInput = document.getElementById("homeBannerImage");
const enabledInput = document.getElementById("homeBannerEnabled");
const preview = document.getElementById("homeBannerPreview");
const previewFrame = document.getElementById("homeBannerPreviewFrame");
const zoomInput = document.getElementById("homeBannerZoom");
const status = document.getElementById("homeBannerStatus");
const message = document.getElementById("homeBannerMessage");
const saveButton = document.getElementById("saveHomeBanner");
const deleteButton = document.getElementById("deleteHomeBanner");
const MAX_DATA_URL_CHARS = 900_000;
const DEVELOPMENT = ["localhost", "127.0.0.1"].includes(window.location.hostname);
let savedBanner = null;
let selectedFile = null;
let previewUrl = null;
let imagePosition = normalizeHomeHeroPosition();
let dragPointerId = null;
let lastPointer = null;

function debugLog(message, details) {
    if (DEVELOPMENT) console.log(`[HomeHero] ${message}`, details ?? "");
}

function isCompatibleImage(value) {
    return typeof value === "string" && /^data:image\/jpeg;base64,/i.test(value);
}

preview.addEventListener("error", () => {
    setMessage("The banner image could not be previewed.");
});

function setMessage(text, isError = true) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
    message.classList.toggle("is-success", !isError);
}

function showImage(src) {
    preview.hidden = !src;
    previewFrame.hidden = !src;
    if (src) preview.src = src;
    else preview.removeAttribute("src");
    if (src) applyHomeHeroPosition(previewFrame, preview, imagePosition);
}

function releasePreviewUrl() {
    if (!previewUrl) return;
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
}

async function loadBanner() {
    setMessage("");
    try {
        const snapshot = await getDoc(bannerRef);
        savedBanner = snapshot.exists() ? snapshot.data() : null;
        selectedFile = null;
        imageInput.value = "";
        enabledInput.checked = savedBanner ? savedBanner.enabled === true : true;
        imagePosition = normalizeHomeHeroPosition(savedBanner?.imagePosition);
        zoomInput.value = String(imagePosition.scale);
        const hasCompatibleImage = isCompatibleImage(savedBanner?.image);
        status.textContent = hasCompatibleImage
            ? (savedBanner.enabled === true ? "Enabled" : "Disabled")
            : savedBanner?.image
                ? "Choose a new image to replace the previous banner format."
            : "No banner saved";
        showImage(hasCompatibleImage ? savedBanner.image : "");
        deleteButton.disabled = !savedBanner;
        debugLog("Firestore load success", { exists: snapshot.exists() });
    } catch (error) {
        console.error("[HomeHero] Failed to load Firestore document:", error);
        setMessage(`Could not load the Home Hero Banner: ${error.message}`);
    }
}

imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        imageInput.value = "";
        setMessage("Choose an image file.");
        return;
    }

    selectedFile = file;
    releasePreviewUrl();
    previewUrl = URL.createObjectURL(file);
    showImage(previewUrl);
    setMessage("");
    debugLog("file selected", {
        name: file.name,
        size: file.size,
        type: file.type
    });
});

function updatePosition() {
    applyHomeHeroPosition(previewFrame, preview, imagePosition);
}

zoomInput.addEventListener("input", () => {
    imagePosition.scale = Number(zoomInput.value);
    updatePosition();
});

previewFrame.addEventListener("pointerdown", (event) => {
    if (preview.hidden || !preview.naturalWidth) return;
    dragPointerId = event.pointerId;
    lastPointer = { x: event.clientX, y: event.clientY };
    previewFrame.setPointerCapture(event.pointerId);
    preview.classList.add("is-dragging");
    event.preventDefault();
});

previewFrame.addEventListener("pointermove", (event) => {
    if (event.pointerId !== dragPointerId || !lastPointer) return;
    const bounds = previewFrame.getBoundingClientRect();
    const coverScale = Math.max(bounds.width / preview.naturalWidth, bounds.height / preview.naturalHeight);
    const overflowX = Math.max(0, preview.naturalWidth * coverScale * imagePosition.scale - bounds.width);
    const overflowY = Math.max(0, preview.naturalHeight * coverScale * imagePosition.scale - bounds.height);
    const deltaX = event.clientX - lastPointer.x;
    const deltaY = event.clientY - lastPointer.y;
    if (overflowX > 0) imagePosition.x = Math.min(100, Math.max(0, imagePosition.x - deltaX / overflowX * 100));
    if (overflowY > 0) imagePosition.y = Math.min(100, Math.max(0, imagePosition.y - deltaY / overflowY * 100));
    lastPointer = { x: event.clientX, y: event.clientY };
    updatePosition();
});

function finishDrag(event) {
    if (event.pointerId !== dragPointerId) return;
    dragPointerId = null;
    lastPointer = null;
    preview.classList.remove("is-dragging");
}

previewFrame.addEventListener("pointerup", finishDrag);
previewFrame.addEventListener("pointercancel", finishDrag);

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedFile && !isCompatibleImage(savedBanner?.image)) {
        setMessage("Choose a banner image before saving.");
        return;
    }

    saveButton.disabled = true;
    setMessage("Saving banner...", false);
    try {
        let image = isCompatibleImage(savedBanner?.image) ? savedBanner.image : "";
        if (selectedFile) {
            image = await compressImage(selectedFile);
            debugLog("compressed image size", {
                dataUrlCharacters: image.length,
                estimatedBytes: Math.ceil(image.length * 3 / 4)
            });
            if (image.length > MAX_DATA_URL_CHARS) {
                throw new Error("Image is too large. Please choose a smaller image.");
            }
        }

        await setDoc(bannerRef, {
            enabled: enabledInput.checked,
            image,
            imagePosition,
            updatedAt: serverTimestamp()
        });
        debugLog("Firestore save success");
        releasePreviewUrl();
        await loadBanner();
        setMessage("Home Hero Banner saved.", false);
    } catch (error) {
        console.error("[HomeHero] Failed to save Firestore document:", error);
        setMessage(`Could not save the Home Hero Banner: ${error.message}`);
    } finally {
        saveButton.disabled = false;
    }
});

deleteButton.addEventListener("click", async () => {
    if (!savedBanner) return;
    deleteButton.disabled = true;
    setMessage("Deleting banner...", false);
    try {
        await deleteDoc(bannerRef);
        debugLog("Firestore delete success");
        savedBanner = null;
        selectedFile = null;
        releasePreviewUrl();
        imageInput.value = "";
        enabledInput.checked = false;
        showImage("");
        imagePosition = normalizeHomeHeroPosition();
        zoomInput.value = String(imagePosition.scale);
        status.textContent = "No banner saved";
        setMessage("Home Hero Banner deleted.", false);
    } catch (error) {
        console.error("[HomeHero] Failed to delete Firestore document:", error);
        setMessage(`Could not delete the Home Hero Banner: ${error.message}`);
    } finally {
        deleteButton.disabled = !savedBanner;
    }
});

onAuthStateChanged(auth, (user) => {
    const isAdmin = user?.uid === ADMIN_UID;
    form.hidden = !isAdmin;
    if (!isAdmin) {
        status.textContent = "Sign in as an administrator to manage the banner.";
        setMessage("Administrator access is required.");
        return;
    }
    loadBanner();
});
