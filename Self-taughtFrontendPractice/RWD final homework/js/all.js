$(document).ready(function () {
    $(".showmenu").on('click',(function (e) { 
        e.preventDefault();
        $('.header').toggleClass('menu-show');
    }));
    $(".top-button a").click(function (event) { 
        event.preventDefault();
        $("html,body").animate({
            scrollTop:0},1000);
    });
});