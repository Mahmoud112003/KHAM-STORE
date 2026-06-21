// 1. استيراد دالة تحديث عداد السلة من ملف الـ store لضمان مزامنة البيانات
import { updateCartCount } from './store.js';

// Load navigation bar from nav.html and insert into placeholder
fetch("nav.html")
    .then(res => res.text())
    .then(data => {
        const nav = document.getElementById("nav-placeholder");
        if (nav) nav.innerHTML = data;
        
        // تشغيل دالة تحديث العداد فوراً بعد التأكد من أن الـ Navbar نزل في الـ DOM
        updateCartCount();
    });

// Load footer from footer.html and insert into placeholder
fetch("footer.html")
    .then(res => res.text())
    .then(data => {
        const footer = document.getElementById("footer-placeholder");
        if (footer) footer.innerHTML = data;
        
        // Initialize language selection
        initLanguage();
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
            const text = option.textContent.trim();
            currentLang.textContent = text;
            // Remove active class from all options
            options.forEach(o => o.classList.remove("active"));
            // Add active class to selected option
            option.classList.add("active");
            // Close dropdown
            langOptions.classList.remove("open");
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
        if (langOptions) langOptions.classList.remove("open");
    });
}

// كود تشغيل الـ Hamburger Menu للموبايل
document.addEventListener("click", function(e) {
    const menuToggle = document.querySelector(".menu-toggle");
    const navMenu = document.querySelector(".header .nav");

    // التحقق من وجود العناصر في الصفحة (عشان الـ Placeholder)
    if (!menuToggle || !navMenu) return;

    // إذا ضغط المستخدم على زرار المنيو
    if (e.target.closest(".menu-toggle")) {
        menuToggle.classList.toggle("active");
        navMenu.classList.toggle("open");
    } 
    // قفل المنيو لو داس في أي مكان برة المنيو والزرار
    else if (!e.target.closest(".header .nav")) {
        menuToggle.classList.remove("active");
        navMenu.classList.remove("open");
    }
});