<?php
/**
 * Contains all data for the Google News sitemap notice.
 *
 * @since 3.6.0
 *
 * @return void
 */
function aioseop_notice_news_sitemap() {
	$dirname = dirname( plugin_basename( AIOSEO_PLUGIN_FILE ) );
	$menu_path = admin_url( "admin.php?page=$dirname/pro/class-aioseop-pro-sitemap.php" );
	return array(
		'slug'        => 'news_sitemap',
		'delay_time'  => 0,
		'target'      => 'site',
		'screens'     => array(),
		'class'       => 'notice-error',
		'dismissible' => false,
		'message'     => sprintf( __( 'You have not set the Google News Publication Name or the Site Title. %s requires at least one of these for the Google News sitemap to be valid.', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME ),
		'action_options' => array(
			array(
				'time'    => 0,
				'link'    => $menu_path,
				'new_tab' => false,
				'text'    => __( 'Go to XML Sitemap settings', 'all-in-one-seo-pack' ),
				'dismiss' => false,
				'class'   => 'button-primary',
			),
			array(
				'time'    => 0,
				'link'    => admin_url( 'options-general.php' ),
				'new_tab' => false,
				'text'    => __( 'Go to Settings > General', 'all-in-one-seo-pack' ),
				'dismiss' => false,
				'class'   => 'button-secondary',
			),
		),
	);
}
add_filter( 'aioseop_admin_notice-news_sitemap', 'aioseop_notice_news_sitemap' );
