var aioseopTaxonomiesUpsell;

jQuery(function($) {

    aioseopTaxonomiesUpsell = {

        /**
         * Initializes the code.
         * 
         * @since   3.4.0
         */
        init: function() {
            aioseopTaxonomiesUpsell.getTaxonomiesUpsell();
        },

        /**
         * Gets the taxonomies upsell markup from our AJAX endpoint.
         * 
         * @since   3.4.0
         */
        getTaxonomiesUpsell: function() {
            $.ajax({
                type: "GET",
                url: aioseopTaxonomiesUpsellData.requestUrl,
                data: {
                    action: "aioseop_get_taxonomies_upsell",
                    _ajax_nonce: aioseopTaxonomiesUpsellData.nonce,
                    page_id: aioseopTaxonomiesUpsellData.pageId
                },
                success: function(response) {
                    if (0 === parseInt(response, 10) || '' === response) {
                        return;
                    }
                    aioseopTaxonomiesUpsell.appendUpsell(response);
                },
                error: function() {
                    console.log("Couldn't fetch taxonomies upsell content from our endpoint.");
                }
            });
        },

        /**
         * Hides the screen content and shows our upsell.
         * 
         * @since   3.4.0
         */
        appendUpsell: function(content) {
            let wrapper = $('#wpcontent .wrap');
            wrapper.append(content);

            let metaboxPreview = wrapper.find('#poststuff');
            metaboxPreview.find(':input').attr("disabled", true);

            aioseopTaxonomiesUpsell.addDismissEventListener();
        }
    }

    aioseopTaxonomiesUpsell.init();
});