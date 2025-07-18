$(document).ready(function () {
   //左上方網頁選擇列表點擊向下拉動效果
    $(".contactus").click(function (event) {
        event.preventDefault();
        $(".contactus-option").slideToggle()        
        });
    $(".productlist").click(function (event) {
        event.preventDefault();
        $(".productlist-option").slideToggle()        
        });
    //swipe效果
     var swiper = new Swiper(".mySwiper", {
        spaceBetween: 30,
        centeredSlides: true,
        loop: true,
        speed:1000,
        autoplay: {
          delay: 3500,
          disableOnInteraction: false,
        },
        pagination: {
          el: ".swiper-pagination",
          clickable: true,
        },
        navigation: {
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        },
      });
    //lightbox效果
     lightbox.option({
      'resizeDuration': 200,
      'wrapAround': true
    })
    //top按鈕功能
    $(".top-button a").click(function (event) { 
        event.preventDefault();
        $("html,body").animate({
            scrollTop:0},800);
    });
});