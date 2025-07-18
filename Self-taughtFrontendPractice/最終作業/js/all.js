$(document).ready(function () {
    $(".navbar_mb-option img").on('click',(function (e) { 
        e.preventDefault();
        $('.navbar_mb-menu').toggleClass('menu-show');
    }));

     $(window).scroll(function(){
                console.log($(document).scrollTop());

                if($(document).scrollTop() > 900){
                    // $('.icon-zhiding').show();
                    $('.top-button').fadeIn();
                }else{
                    $('.top-button').fadeOut();
                }
            });
});
