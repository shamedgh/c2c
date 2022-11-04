var aioseopSitemapPrioUpsell;

jQuery(function($) {

    aioseopSitemapPrioUpsell = {

        init: function() {
            aioseopSitemapPrioUpsell.getSitemapPrioUpsell();
        },

        getSitemapPrioUpsell: function() {
            $.ajax(
                {
                    type: "GET",
                     url: aioseopSitemapPrioUpsellData.requestUrl,
                    data: {
                         action: "aioseop_get_sitemap_prio_upsell",
                         _ajax_nonce: aioseopSitemapPrioUpsellData.nonce
                    },
                     success: function (response) {
                         let option = $('#aiosp_sitemap_priority_wrapper .aioseop_option_div').first();
                         option.append(response);
                     },
                     error: function () {
                        console.log("Couldn't get sitemap prio upsell content.");
                    }
                }
            );
        }
    }

    aioseopSitemapPrioUpsell.init();
});