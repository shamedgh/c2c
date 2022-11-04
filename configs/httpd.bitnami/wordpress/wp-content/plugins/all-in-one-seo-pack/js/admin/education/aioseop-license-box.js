var aioseopLicenseBox;

jQuery(function ($) {

    aioseopLicenseBox = {

        licenseField: $('#aiosp_license_key_wrapper input'),

        /**
         * Initializes the code.
         * 
         * @since   3.4.0
         */
        init: function () {
            aioseopLicenseBox.hideLicenseField();
            aioseopLicenseBox.getLicenseBox();
        },

        /**
         * Hides the license key field.
         * 
         * @since   3.4.0
         */
        hideLicenseField: function() {
            aioseopLicenseBox.licenseField
                .prop( "disabled", true )
                .hide();
        },

        /**
         * Gets the license box markup from our AJAX endpoint.
         * 
         * @since   3.4.0
         */
        getLicenseBox: function () {
            $.ajax(
                {
                    type: "GET",
                    url: aioseopLicenseBoxData.requestUrl,
                    data: {
                        action: "aioseop_get_license_box",
                        _ajax_nonce: aioseopLicenseBoxData.nonce
                    },
                    success: function (response) {
                        aioseopLicenseBox.prependLicenseBox(response);
                    },
                    error: function () {
                        console.log("Couldn't fetch license box content from our endpoint.");
                    }
                }
            );
        },

        /**
         * Prepends the license box to the General Settings menu.
         * 
         * @since   3.4.0
         */
        prependLicenseBox: function (content) {
            aioseopLicenseBox.licenseField.parent().append(content);
        }
    }

    aioseopLicenseBox.init();

});