var aioseopAbout;

jQuery(function ($) {

    aioseopAbout = {

        /**
         * Initializes the code.
         * 
         * @since 3.4.0
         */
        init: function () {
            aioseopAbout.addEventListeners();
        },

        /**
         * Adds the required event listener to the addon buttons.
         * 
         * @since 3.4.0
         */
        addEventListeners: function () {
            if (!$('#aioseop-admin-addons').length) {
                return;
            }

            $( '.addon-item .details' ).matchHeight( { byrow: false, property: 'height' } );

            $(document).on('click', '#aioseop-admin-addons .addon-item button', function (event) {
                event.preventDefault();

                if ($(this).hasClass('disabled')) {
                    return false;
                }

                aioseopAbout.addonToggle($(this));
            });
        },

        addonToggle: function (button) {

            let pluginContainer = button.closest('.addon-item');
            let downloadUrl = button.attr('data-plugin');
            let action,
                cssClass,
                statusText,
                successText,
                successButtonText,
                errorText,
                errorButtonText;

            if (button.hasClass('status-go-to-url')) {
                window.open(button.attr('data-plugin'), '_blank');
                return;
            }

            button.prop('disabled', true).addClass('loading');
            button.text(aioseopAboutData.aioseopL10n.wait);

           if (button.hasClass('status-download')) {
                action = 'aioseop_install_plugin';
                cssClass = 'status-active button disabled';

                statusText = aioseopAboutData.aioseopL10n.active;
                successButtonText = aioseopAboutData.aioseopL10n.activated;   
                
                errorText = aioseopAboutData.aioseopL10n.install_failed;
                errorButtonText = aioseopAboutData.aioseopL10n.install;
            } 
            
            else if( button.hasClass('status-inactive')) {
                action     = 'aioseop_activate_plugin';
				cssClass   = 'status-active button disabled';

                statusText = aioseopAboutData.aioseopL10n.active;
                successButtonText = aioseopAboutData.aioseopL10n.activated;   
                
                errorText = aioseopAboutData.aioseopL10n.activation_failed;
                errorButtonText = aioseopAboutData.aioseopL10n.activate;
            } 
            
            else {
                return;
            }

            $.ajax(
                {
                    type: "POST",
                    url: aioseopAboutData.requestUrl,
                    data: {
                        action: action,
                        _ajax_nonce: aioseopAboutData.nonce,
                        plugin: downloadUrl,
                    },
                    success: function (response) {
                        if (response.success) {
                            successText = response.data.msg;

                            if ('aioseop_install_plugin' === action) {
                                button.attr('data-plugin', response.data.basename);
                                
                                if (!response.data.is_activated) {
                                    cssClass = 'status-inactive button';
                                    statusText = aioseopAboutData.aioseopL10n.inactive;
                                }
                            }

                            pluginContainer.find('.actions').append('<div class="msg success">' + successText + '</div>');
                            pluginContainer.find('span.status-label')
                                .removeClass('status-active status-inactive status-download')
                                .addClass(cssClass)
                                .removeClass('button button-primary button-secondary disabled')
                                .text(statusText);
                            button
                                .removeClass('status-active status-inactive status-download')
                                .removeClass('button button-primary button-secondary disabled')
                                .addClass(cssClass).html(successButtonText);
                        } else {
                            pluginContainer.find('.actions').append('<div class="msg error">' + errorText + '</div>');
                            button.text(errorButtonText);
                        }
        
                        button.prop('disabled', false).removeClass('loading');
        
                        // Clear messages after 3 seconds.
                        setTimeout(function () {
                           $('.addon-item .msg').remove();
                        }, 3000);
                    },
                    error: function () {
                        console.log("Couldn't download or install add-on.");
                    }
                }
            );
        }
    }

    aioseopAbout.init();

});