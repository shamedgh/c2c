<?php
/**
 * Check PHP Version Notice.
 *
 * @since 3.4
 *
 * @package All-in-One-SEO-Pack
 */

/**
 * Notice - Check PHP Version
 *
 * @since 3.4
 *
 * @return array Notice configuration.
 */
function aioseop_notice_check_php_version() {
	$medium = ( AIOSEOPPRO ) ? 'proplugin' : 'liteplugin';
	return array(
		'slug'        => 'check_php_version',
		'delay_time'  => 0,
		'target'      => 'user',
		'screens'     => array(),
		'class'       => 'notice-error',
		'dismissible' => false,
		/* translators: %1$s is a placeholder, which means that it should not be translated. It will be replaced with the name of the plugin, All in One SEO Pack. */
		'html'        => '
			<p>' . sprintf( __( 'Your site is running an outdated version of PHP that is no longer supported and may cause issues with %1$s. <a href="%2$s" target="_blank" rel="noopener noreferrer">Read more</a> for additional information.', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME, 'https://semperplugins.com/documentation/supported-php-version/?utm_source=WordPress&utm_medium=' . $medium . '&utm_campaign=outdated-php-notice' ) . '</p>
			<style>
			.aioseop-notice-check_php_version .aioseo-action-buttons {
				display: none;
			}
			</style>
		',
	);
}
add_filter( 'aioseop_admin_notice-check_php_version', 'aioseop_notice_check_php_version' );
