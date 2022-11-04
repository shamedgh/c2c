var aioseopNoticeBar;

jQuery(function ($) {

    aioseopNoticeBar = {

        /**
         * Initializes the code.
         * 
         * @since   3.4.0
         */
        init: function () {
            aioseopNoticeBar.getNoticeBar();
        },

        /**
         * Gets the notice bar markup from our endpoint.
         * 
         * @since   3.4.0
         */
        getNoticeBar: function () {
            $.ajax(
                {
                    type: "GET",
                    url: aioseopNoticeBarData.requestUrl,
                    data: {
                        action: "aioseop_get_notice_bar",
                        _ajax_nonce: aioseopNoticeBarData.nonce
                    },
                    success: function (response) {
                        if (0 ===  parseInt(response, 10)) {
                            return;
                        }
                        aioseopNoticeBar.prependNoticeBar(response);
                    },
                    error: function () {
                        console.log("Couldn't fetch notice bar content from our endpoint.");
                    }
                }
            );
        },

        /**
         * Prepends the notice bar to the current screen.
         * 
         * @since   3.4.0
         */
        prependNoticeBar: function (content) {
            let wpBody = jQuery('#wpbody-content');
            wpBody.prepend(content);

            aioseopNoticeBar.addDismissEventListener();
        },

        /**
         * Adds the required event listener to the dismiss button.
         * 
         * @since   3.4.0
         */
        addDismissEventListener: function () {
            $('#aioseop-notice-bar').on('click', '.dismiss', function () {
                let noticeBar = $('#aioseop-notice-bar');

                noticeBar.addClass('out');
                setTimeout(
                    function () {
                        noticeBar.remove();
                    },
                    300
                );

                aioseopNoticeBar.dismissNoticeBar();
            });
        },

        /**
         * Dismisses the notice bar via our endpoint.
         * 
         * @since   3.4.0
         */
        dismissNoticeBar: function () {
            $.ajax({
                type: "GET",
                url: aioseopNoticeBarData.requestUrl,
                data: {
                    action: "aioseop_dismiss_notice_bar",
                    _ajax_nonce: aioseopNoticeBarData.nonce
                },
                error: function () {
                    console.log("Couldn't dismiss notice bar.");
                }
            });
        }
    }

    aioseopNoticeBar.init();

});