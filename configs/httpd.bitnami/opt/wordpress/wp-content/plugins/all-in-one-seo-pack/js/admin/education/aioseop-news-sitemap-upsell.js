var aioseopNewsSitemapUpsell;

jQuery(function($) {

    aioseopNewsSitemapUpsell = {

        sitemapOverviewBox: $('#aiosp_sitemap_status_metabox .aioseop_input'),
        newsSitemapSetting: $('#aiosp_sitemap_posttypes_news_wrapper .aioseop_option_input'),

        init: function() {
            aioseopNewsSitemapUpsell.disableSettings();
            aioseopNewsSitemapUpsell.getNewsSitemapUpsell();
        },

        disableSettings: function() {
            $('#aiosp_sitemap_publication_name_wrapper .aioseop_option_input input').attr('disabled', 'disabled');
            $('#aiosp_sitemap_posttypes_news_wrapper .aioseop_option_input input').attr('disabled', 'disabled');
        },

        getNewsSitemapUpsell: function() {
            $.ajax({
                type: "GET",
                url: aioseopNewsSitemapUpsellData.requestUrl,
                data: {
                    action: "aioseop_get_news_sitemap_upsell",
                    _ajax_nonce: aioseopNewsSitemapUpsellData.nonce
                },
                success: function(response) {
                    aioseopNewsSitemapUpsell.appendUpsell(response);
                },
                error: function() {
                    //console.log("Couldn't fetch news sitemap upsell content from our endpoint.");
                }
            });
        },

        appendUpsell: function(content) {
            aioseopNewsSitemapUpsell.sitemapOverviewBox.append(document.createElement('hr'), content);
            aioseopNewsSitemapUpsell.newsSitemapSetting.append(content);
        }
    }

    aioseopNewsSitemapUpsell.init();

});