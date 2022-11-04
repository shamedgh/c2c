<?php
/**
 * Configures the Local Business schema notice.
 *
 * Appears when the user's schema markup isn't set to Organization in the General Settings menu.
 *
 * @since 3.6.0
 * 
 * @return array The notice data.
 */
function aioseoLocalBusinessNotice() {
	$dirname  = dirname( plugin_basename( AIOSEO_PLUGIN_FILE ) );
	$menuPath = admin_url( "admin.php?page=$dirname/aioseop_class.php" );

	return array(
		'slug'           => 'local_business',
		'delay_time'     => 0,
		'message'        => __( 'Your site is currently set to represent a Person. In order to use Local Business schema, you must set your site to represent an Organization.', 'all-in-one-seo-pack' ),
		'class'          => 'notice-error',
		'target'         => 'site',
		'screens'        => array(),
		'action_options' => array(
			array(
				'time'    => 0,
				'text'    => __( 'Go to General Settings menu', 'all-in-one-seo-pack' ),
				'link'    => $menuPath,
				'dismiss' => false,
				'class'   => 'button-primary',
			)
		),
	);
}
add_filter( 'aioseop_admin_notice-local_business', 'aioseoLocalBusinessNotice' );
