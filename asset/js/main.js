// 1. استيراد دالة تحديث عداد السلة من ملف الـ store لضمان مزامنة البيانات
import { updateCartCount } from './store.js';
import './analytics.js';
import { renderAnnouncement } from './announcement.js';

const loaderState = { nav: false, footer: false, content: false };

window.hideLoaderIfReady = function () {
    const loader = document.getElementById('kham-loader');
    if (!loader) return;

    const isReady = loaderState.nav && loaderState.footer && loaderState.content;
    if (isReady) {
        loader.classList.add('kham-loader-hidden');
    }
};

const markPageReady = () => {
    loaderState.content = true;
    window.hideLoaderIfReady();
};

// Load navigation bar from nav.html and insert into placeholder
if (performance?.mark) performance.mark('nav-fetch-start');
fetch("nav.html")
    .then(res => res.text())
    .then(data => {
        const nav = document.getElementById("nav-placeholder");
        if (nav) {
            nav.innerHTML = data;
            renderAnnouncement();
        }

        if (performance?.mark && performance?.measure) {
            performance.mark('nav-fetch-end');
            try {
                performance.measure('nav-fetch-duration', 'nav-fetch-start', 'nav-fetch-end');
            } catch (measureError) {
                console.debug('Nav fetch measurement skipped:', measureError);
            }
        }

        loaderState.nav = true;
        updateCartCount();
        window.applyPageTranslations?.();
        window.hideLoaderIfReady();
    })
    .catch((error) => {
        console.error('Failed to load nav:', error);
        loaderState.nav = true;
        window.hideLoaderIfReady();
    });

// Load footer from footer.html and insert into placeholder
if (performance?.mark) performance.mark('footer-fetch-start');
fetch("footer.html")
    .then(res => res.text())
    .then(data => {
        const footer = document.getElementById("footer-placeholder");
        if (footer) footer.innerHTML = data;

        initLanguage();
        if (performance?.mark && performance?.measure) {
            performance.mark('footer-fetch-end');
            try {
                performance.measure('footer-fetch-duration', 'footer-fetch-start', 'footer-fetch-end');
            } catch (measureError) {
                console.debug('Footer fetch measurement skipped:', measureError);
            }
        }

        loaderState.footer = true;
        window.applyPageTranslations?.();
        window.hideLoaderIfReady();
    })
    .catch((error) => {
        console.error('Failed to load footer:', error);
        loaderState.footer = true;
        window.hideLoaderIfReady();
    });

// Function to initialize language selection dropdown
function initLanguage() {
    const langBtn = document.getElementById("langBtn");
    const langOptions = document.getElementById("langOptions");
    const currentLang = document.getElementById("currentLang");
    const options = document.querySelectorAll(".option");

    // Prevent execution if elements not found
    if (!langBtn) return;

    // Toggle dropdown on button click
    langBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        langOptions.classList.toggle("open");
    });

    // Handle option selection
    options.forEach(option => {
        option.addEventListener("click", () => {
            const lang = option.getAttribute("data-value") || option.getAttribute("data-lang") || "en";
            if (window.setLanguage) {
                window.setLanguage(lang);
            }
            const text = option.textContent.trim();
            if (currentLang) currentLang.textContent = text;
            // Remove active class from all options
            options.forEach(o => o.classList.remove("active"));
            // Add active class to selected option
            option.classList.add("active");
            // Close dropdown
            if (langOptions) langOptions.classList.remove("open");
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
        if (langOptions) langOptions.classList.remove("open");
    });
}

// كود تشغيل الـ Hamburger Menu للموبايل
document.addEventListener("click", function (e) {
    const menuToggle = document.querySelector(".menu-toggle");
    const navMenu = document.querySelector(".header .nav");

    // التحقق من وجود العناصر في الصفحة (عشان الـ Placeholder)
    if (!menuToggle || !navMenu) return;

    // إذا ضغط المستخدم على زرار المنيو
    if (e.target.closest(".menu-toggle")) {
        menuToggle.classList.toggle("active");
        navMenu.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", String(navMenu.classList.contains("open")));
    }
    // قفل المنيو لو داس في أي مكان برة المنيو والزرار
    else if (!e.target.closest(".header .nav")) {
        menuToggle.classList.remove("active");
        navMenu.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
    } else if (e.target.closest(".header .nav a")) {
        menuToggle.classList.remove("active");
        navMenu.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
    }
});

document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    const menuToggle = document.querySelector(".menu-toggle");
    const navMenu = document.querySelector(".header .nav");
    if (!menuToggle || !navMenu || !navMenu.classList.contains("open")) return;
    navMenu.classList.remove("open");
    menuToggle.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.focus();
});


// ================= إخفاء شاشة التحميل =================
window.addEventListener('load', function () {
    const loader = document.getElementById('kham-loader');
    if (loader) {
        loader.classList.add('kham-loader-hidden');
    }
});
