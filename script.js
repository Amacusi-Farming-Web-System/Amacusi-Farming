$(document).ready(function() {
    let currentIndex = 0;
    const slides = $(".slide");
    const totalSlides = slides.length;

    function showNextSlide() {
        $(slides[currentIndex]).removeClass("active");
        currentIndex = (currentIndex + 1) % totalSlides;
        $(slides[currentIndex]).addClass("active");
    }

    setInterval(showNextSlide, 4000); // Change slide every 3 seconds
});
