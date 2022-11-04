var aioseopVideoSitemapUpsell;

jQuery(function($) {

    aioseopVideoSitemapUpsell = {

        /**
         * Initializes the code.
         * 
         * @since   3.4.0
         */
        init: function() {
            aioseopVideoSitemapUpsell.getVideoSitemapUpsell();
        },

        /**
         * Gets the video sitemap module upsell markup from our endpoint.
         * 
         * @since   3.4.0
         */
        getVideoSitemapUpsell: function() {
            $.ajax({
                type: "GET",
                url: aioseopVideoSitemapUpsellData.requestUrl,
                data: {
                    action: "aioseop_get_video_sitemap_upsell",
                    _ajax_nonce: aioseopVideoSitemapUpsellData.nonce
                },
                success: function(response) {
                    if (0 === parseInt(response, 10)) {
                        return;
                    }
                    aioseopVideoSitemapUpsell.appendVideoSitemapUpsell(response);
                },
                error: function() {
                    console.log("Couldn't fetch video sitemap upsell content from our endpoint.");
                }
            });
        },

        appendVideoSitemapUpsell: function(content) {
            $('.submit').first().append(content);
            aioseopVideoSitemapUpsell.addDismissEventListener();
        },

        /**
         * Adds the required event listener to the dismiss button.
         * 
         * @since   3.4.0
         */
        addDismissEventListener: function() {
            $('#aioseop-video-sitemap-upsell').on('click', '.dismiss', function() {
                let videoSitemapUpsell = $('#aioseop-video-sitemap-upsell');

                setTimeout(
                    function() {
                        videoSitemapUpsell.remove();
                    },
                    300
                );

                aioseopVideoSitemapUpsell.dismissVideoSitemapUpsell();
            });
        },

        /**
         * Dismisses the video sitemap upsell via our endpoint.
         * 
         * @since   3.4.0
         */
        dismissVideoSitemapUpsell: function() {
            $.ajax({
                type: "GET",
                url: aioseopVideoSitemapUpsellData.requestUrl,
                data: {
                    action: "aioseop_dismiss_video_sitemap_upsell",
                    _ajax_nonce: aioseopVideoSitemapUpsellData.nonce
                },
                error: function() {
                    console.log("Couldn't dismiss notice bar.");
                }
            });
        }
    }

    aioseopVideoSitemapUpsell.init();
});