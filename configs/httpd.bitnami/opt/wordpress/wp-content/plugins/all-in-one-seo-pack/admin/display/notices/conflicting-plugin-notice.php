<?php
/**
 * Conflicting Plugin Notice
 *
 * @since   3.4.0
 *
 * @package All-in-One-SEO-Pack
 * @subpackage AIOSEOP_Notices
 */

/**
 *  Returns the default values for our conflicting plugin notice.
 *
 * @since 3.4.0 Added UTM link and removed dismiss button.
 *
 * @return array
 */
function aioseop_conflicting_plugin_notice() {
	return array(
		'slug'           => 'conflicting_plugin',
		'delay_time'     => 0,
		'message'        => '',
		'target'         => 'user',
		'screens'        => array(),
		'class'          => 'notice-error',
		'action_options' => array(
			array(
				'time'    => 0,
				'link'    => '#',
				'new_tab' => false,
				'text'    => __( 'Deactivate plugins', 'all-in-one-seo-pack' ),
				'dismiss' => false,
				'class'   => 'button-primary',
			),
			array(
				'time'    => 172800,  // 48H
				'text'    => 'Remind me later',
				'link'    => '',
				'dismiss' => false,
				'class'   => 'button-secondary',
			),
		),
	);
}
add_filter( 'aioseop_admin_notice-conflicting_plugin', 'aioseop_conflicting_plugin_notice' );
