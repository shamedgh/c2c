var aioseopDeactivateConflictingPlugins;

jQuery(function($) {

    aioseopDeactivateConflictingPlugins = {

        init: function() {
            aioseopDeactivateConflictingPlugins.addEventListener();
        },

        addEventListener: function() {
            let button = $('#aioseop-notice-delay-conflicting_plugin-0');
            button.removeAttr("href");

            button.on('click', function() {
                $.ajax(
                    {
                        type: "GET",
                        url: aioseopDeactivateConflictingPluginsData.requestUrl,
                        data: {
                            action: "aioseop_deactivate_conflicting_plugins",
                            _ajax_nonce: aioseopDeactivateConflictingPluginsData.nonce
                        },
                        success: function (response) {
                            let isMatch = window.location.href.match(/.*plugins.php.*/g);
                            if(isMatch) {
                                window.location.reload();
                            }
                        },
                        error: function () {
                            console.log("Couldn't deactivate conflicting plugins.");
                        }
                    }
                );
            });

        }
    }

    aioseopDeactivateConflictingPlugins.init();
});