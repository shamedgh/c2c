<?php
/**
 * Configures the Deprecated Unprotect Post Meta Setting notice.
 *
 * Appears when the user was previously using the Unprotect Post Meta setting. It has been removed in 3.7.1.
 *
 * @since 3.7.1
 * 
 * @return array The notice data.
 */
function aioseoDeprecatedUnprotectPostMetaSetting() {
	$anchor  = sprintf( '<a href="https://semperplugins.com/documentation/unprotecting-aioseops-post-meta/" target="_blank">%1$s</a>', __( 'this filter hook', 'all-in-one-seo-pack' ) );
	$message = sprintf( __( 'The Unprotect Post Meta setting in the General Settings menu has been deprecated and removed from %1$s. 
	You are seeing this message only because you had it enabled. If you would like to retain this functionality, then you can do so by using %2$s.', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME, $anchor );

	return array(
		'slug'           => 'deprecated_unprotect_post_meta_setting',
		'delay_time'     => 0,
		'html'           => "<p>$message</p><style>
				.aioseop-notice-deprecated_unprotect_post_meta_setting .aioseo-action-buttons {
					display: none;
				}
			</style>",
		'class'          => 'notice-warning',
		'target'         => 'site',
		'screens'        => array(),
		'action_options' => array(
			array(
				'time'    => 0,
				'text'    => '',
				'link'    => '',
				'dismiss' => true,
				'class'   => 'aioseo-dismiss-review-notice-button',
			),
		),
	);
}
add_filter( 'aioseop_admin_notice-deprecated_unprotect_post_meta_setting', 'aioseoDeprecatedUnprotectPostMetaSetting' );
