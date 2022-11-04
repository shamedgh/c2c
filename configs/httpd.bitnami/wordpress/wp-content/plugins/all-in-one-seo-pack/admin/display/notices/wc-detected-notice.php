<?php
/**
 * WooCommerce Detected Notice
 *
 * @since 3.0.0
 *
 * @package All-in-One-SEO-Pack
 * @subpackage AIOSEOP_Notices
 */

/**
 * Returns the default values for our WooCommerce upsell notice.
 *
 * @since 3.0.0
 * @since 3.4.0 Added UTM link and removed dismiss button.
 *
 * @return array
 */
function aioseop_notice_pro_promo_woocommerce() {
	return array(
		'slug'           => 'woocommerce_detected',
		'delay_time'     => 0,
		/* translators: %s is a placeholder, which means that it should not be translated. It will be replaced with the name of the premium version of the plugin, All in One SEO Pack Pro. */
		'message'        => sprintf( __( 'We have detected you are running WooCommerce. Upgrade to %s to unlock our advanced eCommerce SEO features, including SEO for Product Categories and more.', 'all-in-one-seo-pack' ), 'All in One SEO Pack Pro' ),

		'class'          => 'notice-info',
		'target'         => 'site',
		'screens'        => array( 'aioseop', 'product', 'edit-product' ),
		'action_options' => array(
			array(
				'time'    => 0,
				'text'    => __( 'Upgrade to Pro', 'all-in-one-seo-pack' ),
				'link'    => aioseop_get_utm_url( 'woocommerce-upsell-notice' ),
				'dismiss' => false,
				'class'   => 'button-primary button-orange',
			),
		),
	);
}

add_filter( 'aioseop_admin_notice-woocommerce_detected', 'aioseop_notice_pro_promo_woocommerce' );
