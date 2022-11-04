<?php
/**
 * Configures the Deprecated Additional Headers Settings notice.
 *
 * Appears when the user was previously using the Additional Headers settings. These have been removed in 3.7.1.
 *
 * @since 3.7.1
 * 
 * @return array The notice data.
 */
function aioseoDeprecatedAdditionalHeadersSettings() {
	global $aioseop_options;
	$settings = array_filter( array(
		__( 'Additional Post Headers', 'all-in-one-seo-pack' )       => $aioseop_options['aiosp_post_meta_tags'],
		__( 'Additional Page Headers', 'all-in-one-seo-pack' )       => $aioseop_options['aiosp_page_meta_tags'],
		__( 'Additional Front Page Headers', 'all-in-one-seo-pack' ) => $aioseop_options['aiosp_front_meta_tags'],
		__( 'Additional Posts Page Headers', 'all-in-one-seo-pack' ) => $aioseop_options['aiosp_home_meta_tags']
	));

	if ( ! count( $settings ) ) {
		return array();
	}

	$message = sprintf( __( 'The Additional Headers settings have been deprecated and removed from %1$s. 
	You are seeing this message because you may have been using these settings. We recommend you use the Insert Headers and Footers plugin from WPBeginner instead. 
	Below you can find details of the settings that you were using:', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME );
	
	$content = "<p>$message<p/><ul>";
	foreach ( $settings as $name => $value ) {
		$content = $content ."<li>$name - $value</li>";
	}
	$content = $content . '</ul><style>
	.aioseop-notice-deprecated_additional_headers_settings ul {
		list-style-type: disc;
		margin-top: -5px;
		margin-left: 40px;
	}
	</style>';

	return array(
		'slug'           => 'deprecated_additional_headers_settings',
		'delay_time'     => 0,
		'html'           => $content,
		'class'          => 'notice-warning',
		'target'         => 'site',
		'screens'        => array(),
		'action_options' => array(
			array(
				'time'    => 0,
				'text'    => __( 'Install Headers and Footers plugin', 'all-in-one-seo-pack' ),
				'link'    => admin_url( "plugin-install.php?s=insert+headers+and+footers&tab=search&type=term" ),
				'new_tab' => false,
				'dismiss' => false,
				'class'   => 'button-primary',
			)
		),
	);
}
add_filter( 'aioseop_admin_notice-deprecated_additional_headers_settings', 'aioseoDeprecatedAdditionalHeadersSettings' );
