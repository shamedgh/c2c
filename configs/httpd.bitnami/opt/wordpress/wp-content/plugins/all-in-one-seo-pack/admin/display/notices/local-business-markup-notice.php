<?php
/**
 * Configures the Local Business Markup notice.
 *
 * Appears when the user has enabled the Local Business SEO module, but has disabled Schema markup as a whole in the General Settings menu.
 *
 * @since 3.7.0
 * 
 * @return array The notice data.
 */
function aioseoLocalBusinessMarkupNotice() {
	$dirname  = dirname( plugin_basename( AIOSEO_PLUGIN_FILE ) );
	$menuPath = admin_url( "admin.php?page=$dirname/aioseop_class.php" );

	return array(
		'slug'           => 'local_business_markup',
		'delay_time'     => 0,
		'message'        => __( "You've enabled the Local Business SEO module, but all Schema markup (including Local Business schema) is currently disabled.", 'all-in-one-seo-pack' ),
		'class'          => 'notice-warning',
		'target'         => 'site',
		'screens'        => aioseop_get_admin_screens(),
		'action_options' => array(
			array(
				'time'    => 0,
				'text'    => __( 'Go to General Settings menu', 'all-in-one-seo-pack' ),
				'link'    => $menuPath,
				'new_tab' => false,
				'dismiss' => false,
				'class'   => 'button-primary',
			)
		),
	);
}
add_filter( 'aioseop_admin_notice-local_business_markup', 'aioseoLocalBusinessMarkupNotice' );
