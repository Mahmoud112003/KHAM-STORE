document.addEventListener("DOMContentLoaded", () => {
    const slides = Array.from(document.querySelectorAll(".kham-slide"));
    const indicatorBars = Array.from(document.querySelectorAll(".kham-indicator-bar"));
    const pauseBtn = document.getElementById("khamPauseBtn");

    if (slides.length) {
        let currentIndex = 0;
        let isPlaying = true;
        let timer = null;
        const intervalTime = 4500;

        function showSlide(index) {
            slides.forEach(slide => slide.classList.remove("active"));
            indicatorBars.forEach(bar => bar.classList.remove("active"));

            currentIndex = (index + slides.length) % slides.length;

            slides[currentIndex].classList.add("active");
            if (indicatorBars[currentIndex]) {
                indicatorBars[currentIndex].classList.add("active");
            }
        }

        function nextSlide() {
            showSlide(currentIndex + 1);
        }

        function startAutoplay() {
            if (!timer) timer = setInterval(nextSlide, intervalTime);
        }

        function stopAutoplay() {
            clearInterval(timer);
            timer = null;
        }

        indicatorBars.forEach(bar => {
            bar.addEventListener("click", () => {
                showSlide(parseInt(bar.dataset.index, 10));
                if (isPlaying) {
                    stopAutoplay();
                    startAutoplay();
                }
            });
        });

        if (pauseBtn) {
            pauseBtn.addEventListener("click", () => {
                isPlaying = !isPlaying;
                if (isPlaying) {
                    startAutoplay();
                    pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                } else {
                    stopAutoplay();
                    pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                }
            });
        }

        let touchStartX = 0;
        let touchEndX = 0;
        const sliderContainer = document.getElementById("khamHeroSlider");
        if (sliderContainer) {
            sliderContainer.addEventListener("touchstart", (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            sliderContainer.addEventListener("touchend", (e) => {
                touchEndX = e.changedTouches[0].screenX;
                if (touchStartX - touchEndX > 50) nextSlide();
                if (touchEndX - touchStartX > 50) showSlide(currentIndex - 1);
            }, { passive: true });
        }

        startAutoplay();
    }

    window.addEventListener("scroll", () => {
        const header = document.querySelector(".header");
        if (!header) return;
        if (window.scrollY > 60) {
            header.classList.add("is-scrolled");
        } else {
            header.classList.remove("is-scrolled");
        }
    }, { passive: true });
});
