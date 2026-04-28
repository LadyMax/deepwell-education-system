(function ($) {
    "use strict";

    $(document).ready(function () {
        function toggleNavbarMethod() {
            if ($(window).width() > 992) {
                $('.navbar .dropdown').on('mouseover', function () {
                    $('.dropdown-toggle', this).trigger('click');
                }).on('mouseout', function () {
                    $('.dropdown-toggle', this).trigger('click').blur();
                });
            } else {
                $('.navbar .dropdown').off('mouseover').off('mouseout');
            }
        }
        toggleNavbarMethod();
        $(window).resize(toggleNavbarMethod);

        // Close the left language collapse when clicking outside.
        $(document).on('click', function (e) {
            var $vertical = $('#navbar-vertical');
            if (!$vertical.length || !$vertical.hasClass('show')) return;
            var $target = $(e.target);
            if ($target.closest('#navbar-vertical').length) return;
            if ($target.closest('.app-vertical-toggle').length) return;
            $vertical.collapse('hide');
        });
    });

    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        var easingName = ($.easing && $.easing.easeInOutExpo) ? 'easeInOutExpo' : 'swing';
        $('html, body').animate({scrollTop: 0}, 1500, easingName);
        return false;
    });
})(jQuery);

