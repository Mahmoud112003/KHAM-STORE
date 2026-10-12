import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { applyHomeHeroPosition } from "./home-hero-position.js";

const bannerRef = doc(db, "homeBanners", "homeHero");
const DEVELOPMENT = ["localhost", "127.0.0.1"].includes(window.location.hostname);

function debugLog(message, details) {
    if (DEVELOPMENT) console.log(`[HomeHero] ${message}`, details ?? "");
}

async function loadHomeBanner() {
    const section = document.getElementById("homeHeroBanner");
    const image = document.getElementById("homeHeroBannerImage");
    if (!section || !image) return;

    section.hidden = true;
    try {
        const snapshot = await getDoc(bannerRef);
        debugLog("Firestore load success", { exists: snapshot.exists() });
        if (!snapshot.exists()) return;

        const banner = snapshot.data();
        if (banner.enabled !== true || typeof banner.image !== "string" || !/^data:image\/jpeg;base64,/i.test(banner.image)) return;
        applyHomeHeroPosition(section, image, banner.imagePosition);

        image.addEventListener("load", () => {
            section.hidden = false;
            debugLog("rendering image");
        }, { once: true });
        image.addEventListener("error", () => {
            section.hidden = true;
            console.error("[HomeHero] Banner image failed to load.");
        }, { once: true });
        image.src = banner.image;
        if (image.complete && image.naturalWidth > 0) section.hidden = false;
    } catch (error) {
        console.error("[HomeHero] Failed to load the banner:", error);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadHomeBanner, { once: true });
} else {
    loadHomeBanner();
}
