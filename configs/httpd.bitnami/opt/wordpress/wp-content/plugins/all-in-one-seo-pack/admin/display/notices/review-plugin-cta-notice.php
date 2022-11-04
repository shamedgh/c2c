<?php
/**
 * Review Plugin Notice
 *
 * @since 3.4
 *
 * @package All-in-One-SEO-Pack
 */

/**
 * Notice - Review Plugin
 *
 * @since 3.4
 *
 * @return array Notice configuration.
 */
function aioseop_notice_review_plugin_cta() {
	global $aioseop_options;
	$feedback_url = add_query_arg(
		array(
			'wpf7528_24'   => untrailingslashit( home_url() ),
			'wpf7528_26'   => ! empty( $aioseop_options['aiosp_license_key'] ) ? $aioseop_options['aiosp_license_key'] : null,
			'wpf7528_27'   => AIOSEOPPRO ? 'pro' : 'lite',
			'wpf7528_28'   => AIOSEOP_VERSION,
			'utm_source'   => AIOSEOPPRO ? 'proplugin' : 'liteplugin',
			'utm_medium'   => 'review-notice',
			'utm_campaign' => 'feedback',
			'utm_content'  => AIOSEOP_VERSION,
		),
		'https://semperplugins.com/plugin-feedback/'
	);

	return array(
		'slug'           => 'review_plugin_cta',
		'delay_time'     => WEEK_IN_SECONDS * 2,
		'target'         => 'user',
		'screens'        => array(),
		'class'          => 'notice-info',
		'html'           => '
			<div class="aioseo-review-plugin-cta">
				<div class="step-1">' .
					/* translators: %1$s is a placeholder, which means that it should not be translated. It will be replaced with the name of the plugin, All in One SEO Pack. */
					'<p>' . sprintf( __( 'Are you enjoying %1$s?', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME ) . '</p>
					<p>
						<a href="#" class="aioseo-review-switch-step-3" data-step="3">' . __( 'Yes I love it', 'all-in-one-seo-pack' ) . '</a> 🙂 |
						<a href="#" class="aioseo-review-switch-step-2" data-step="2">' . __( 'Not Really...', 'all-in-one-seo-pack' ) . '</a>
					</p>
				</div>
				<div class="step-2" style="display:none;">' .
					/* translators: %1$s is a placeholder, which means that it should not be translated. It will be replaced with the name of the plugin, All in One SEO Pack. */
					'<p>' . sprintf( __( 'We\'re sorry to hear you aren\'t enjoying %1$s. We would love a chance to improve. Could you take a minute and let us know what we can do better?', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME ) . '</p>
					<p>
						<a href="' . $feedback_url . '" class="aioseo-dismiss-review-notice" target="_blank" rel="noopener noreferrer">' . __( 'Give feedback', 'all-in-one-seo-pack' ) . '</a>&nbsp;&nbsp;
						<a href="#" class="aioseo-dismiss-review-notice" target="_blank" rel="noopener noreferrer">' . __( 'No thanks', 'all-in-one-seo-pack' ) . '</a>
					</p>
				</div>
				<div class="step-3" style="display:none;">
					<p>' . __( 'That\'s awesome! Could you please do me a BIG favor and give it a 5-star rating on WordPress to help us spread the word and boost our motivation?', 'all-in-one-seo-pack' ) . '</p>' .
					/* translators: %1$s is a placeholder, which means that it should not be translated. It will be replaced with the name of the plugin, All in One SEO Pack. */
					'<p><strong>~ Syed Balkhi<br>' . sprintf( __( 'President of %1$s', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME ) . '</strong></p>
					<p>
						<a href="https://wordpress.org/support/plugin/all-in-one-seo-pack/reviews/?filter=5#new-post" class="aioseo-dismiss-review-notice" target="_blank" rel="noopener noreferrer">' . __( 'Ok, you deserve it', 'all-in-one-seo-pack' ) . '</a>&nbsp;&nbsp;
						<a href="#" class="aioseo-dismiss-review-notice-delay" target="_blank" rel="noopener noreferrer">' . __( 'Nope, maybe later', 'all-in-one-seo-pack' ) . '</a>&nbsp;&nbsp;
						<a href="#" class="aioseo-dismiss-review-notice" target="_blank" rel="noopener noreferrer">' . __( 'I already did', 'all-in-one-seo-pack' ) . '</a>
					</p>
				</div>
			</div>
			<style>
			.aioseop-notice-review_plugin_cta .aioseo-action-buttons {
				display: none;
			}
			</style>
			<script type="text/javascript">
			jQuery(document).on("click", ".aioseo-review-plugin-cta .aioseo-review-switch-step-3", function(event) {
				event.preventDefault();
				jQuery(".aioseo-review-plugin-cta .step-1, .aioseo-review-plugin-cta .step-2").hide();
				jQuery(".aioseo-review-plugin-cta .step-3").show();
			});
			jQuery(document).on("click", ".aioseo-review-plugin-cta .aioseo-review-switch-step-2", function(event) {
				event.preventDefault();
				jQuery(".aioseo-review-plugin-cta .step-1, .aioseo-review-plugin-cta .step-3").hide();
				jQuery(".aioseo-review-plugin-cta .step-2").show();
			});
			jQuery(document).on("click", ".aioseo-review-plugin-cta .aioseo-dismiss-review-notice-delay", function(event) {
				event.preventDefault();
				var element = jQuery(".aioseop-notice-review_plugin_cta .aioseo-action-buttons .aioseo-dismiss-review-notice-delay-button");
				element.click();
			});
			jQuery(document).on("click", ".aioseo-review-plugin-cta .aioseo-dismiss-review-notice", function(event) {
				if ("#" === jQuery(this).attr("href")) {
					event.preventDefault();
				}
				var element = jQuery(".aioseop-notice-review_plugin_cta .aioseo-action-buttons .aioseo-dismiss-review-notice-button");
				element.click();
			});
			</script>
		',
		'action_options' => array(
			array(
				'time'    => 0,
				'text'    => '',
				'link'    => '',
				'dismiss' => true,
				'class'   => 'aioseo-dismiss-review-notice-button',
			),
			array(
				'time'    => WEEK_IN_SECONDS,
				'text'    => '',
				'link'    => '',
				'dismiss' => false,
				'class'   => 'aioseo-dismiss-review-notice-delay-button',
			),
		),
	);
}
add_filter( 'aioseop_admin_notice-review_plugin_cta', 'aioseop_notice_review_plugin_cta' );
