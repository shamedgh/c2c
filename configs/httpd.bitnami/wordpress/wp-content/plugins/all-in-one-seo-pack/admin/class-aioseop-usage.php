<?php
/**
 * AIOSEOP Usage Tracking Class
 *
 * @package All-in-One-SEO-Pack
 * @since 3.7
 */

/**
 * All in One SEO Usage Tracking
 *
 * @since 3.7
 */
class AIOSEOP_Usage {
	/**
	 * Class Constructor.
	 *
	 * @since 3.7
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'schedule_send' ) );
		add_filter( 'cron_schedules', array( $this, 'add_schedules' ) );
		add_action( 'aioseop_usage_tracking_cron', array( $this, 'send_checkin' ) );
	}

	/**
	 * Get the data.
	 *
	 * @since 3.7
	 *
	 * @return array An array of data.
	 */
	private function get_data() {
		global $wpdb, $aioseop_options;
		$themeData = wp_get_theme();

		return array(
			// Generic data (environment).
			'url'                  => home_url(),
			'php_version'          => PHP_VERSION,
			'wp_version'           => get_bloginfo( 'version' ),
			'mysql_version'        => $wpdb->db_version(),
			'server_version'       => isset( $_SERVER['SERVER_SOFTWARE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) ) : '',
			'is_ssl'               => is_ssl(),
			'is_multisite'         => is_multisite(),
			'sites_count'          => function_exists( 'get_blog_count' ) ? (int) get_blog_count() : 1,
			'active_plugins'       => $this->get_active_plugins(),
			'theme_name'           => $themeData->name,
			'theme_version'        => $themeData->version,
			'user_count'           => function_exists( 'get_user_count' ) ? get_user_count() : null,
			'locale'               => get_locale(),
			'timezone_offset'      => date('P'),
			'email'                => get_bloginfo( 'admin_email' ),
			// AIOSEO specific data.
			'aioseo_version'       => AIOSEOP_VERSION,
			'aioseo_license_key'   => AIOSEOPPRO && isset( $aioseop_options['aiosp_license_key'] ) ? $aioseop_options['aiosp_license_key'] : null,
			'aioseo_license_type'  => AIOSEOPPRO && isset( $aioseop_options['plan'] ) ? $aioseop_options['plan'] : null,
			'aioseo_is_pro'        => AIOSEOPPRO,
			'aioseo_settings'      => $aioseop_options,
			'aioseo_usagetracking' => get_option( 'aioseop_usage_tracking_config', false ),
		);
	}

	/**
	 * Get the active plugins.
	 *
	 * @since 3.7
	 *
	 * @return array An array of active plugins.
	 */
	private function get_active_plugins() {
		if ( ! function_exists( 'get_plugins' ) ) {
			include ABSPATH . '/wp-admin/includes/plugin.php';
		}
		$active  = get_option( 'active_plugins', array() );
		$plugins = array_intersect_key( get_plugins(), array_flip( $active ) );

		return array_map( array( $this, 'getPluginVersion' ), $plugins );
	}

	/**
	 * Get the plugin version.
	 *
	 * @since 3.7
	 *
	 * @return string The plugin version.
	 */
	private function getPluginVersion( $plugin ) {
		if ( isset( $plugin['Version'] ) ) {
			return $plugin['Version'];
		}

		return 'Not Set';
	}

	/**
	 * Send the checkin.
	 *
	 * @since 3.7
	 *
	 * @return boolean Whether or not it worked.
	 */
	public function send_checkin( $override = false, $ignore_last_checkin = false ) {
		$home_url = trailingslashit( home_url() );
		if ( strpos( $home_url, 'aioseo.com' ) !== false ) {
			return false;
		}

		if ( ! $this->tracking_allowed() && ! $override ) {
			return false;
		}

		// Send a maximum of once per week
		$last_send = get_option( 'aioseop_usage_tracking_last_checkin' );
		if ( is_numeric( $last_send ) && $last_send > strtotime( '-1 week' ) && ! $ignore_last_checkin ) {
			return false;
		}

		$request = wp_remote_post( $this->get_url(), array(
			'timeout'     => 5,
			'redirection' => 5,
			'httpversion' => '1.1',
			'blocking'    => false,
			'headers'     => array( 'Content-Type' => 'application/json; charset=utf-8' ),
			'body'        => wp_json_encode( $this->get_data() ),
			'user-agent'  => 'AIOSEO/' . AIOSEOP_VERSION . '; ' . get_bloginfo( 'url' ),
		) );

		// If we have completed successfully, recheck in 1 week
		if ( ! $ignore_last_checkin ) {
			update_option( 'aioseop_usage_tracking_last_checkin', time() );
		}
		return true;
	}

	/**
	 * Checks if we are allowed to track.
	 *
	 * @since 3.7
	 *
	 * @return boolean Whether or not we are allowed to track.
	 */
	private function tracking_allowed() {
		global $aioseop_options;
		return ! empty( $aioseop_options['aiosp_usage_tracking'] ) || AIOSEOPPRO;
	}

	/**
	 * Get the url.
	 *
	 * @since 3.7
	 *
	 * @return string The url.
	 */
	private function get_url() {
		$url = 'https://aiousage.com/v1/track';
		if ( defined( 'AIOSEO_USAGE_TRACKING_URL' ) ) {
			$url = AIOSEO_USAGE_TRACKING_URL;
		}

		return $url;
	}

	/**
	 * Schedules sending.
	 *
	 * @since 3.7
	 *
	 * @return void
	 */
	public function schedule_send() {
		$scheduled = wp_next_scheduled( 'aioseop_usage_tracking_cron' );
		if ( ! $this->tracking_allowed() ) {
			if ( $scheduled ) {
				wp_unschedule_event( $scheduled, 'aioseop_usage_tracking_cron' );
			}
			return;
		}

		if ( ! $scheduled ) {
			$tracking             = array();
			$tracking['day']      = rand( 0, 6  );
			$tracking['hour']     = rand( 0, 23 );
			$tracking['minute']   = rand( 0, 59 );
			$tracking['second']   = rand( 0, 59 );
			$tracking['offset']   = ( $tracking['day'] * DAY_IN_SECONDS ) +
									( $tracking['hour'] * HOUR_IN_SECONDS ) +
									( $tracking['minute'] * MINUTE_IN_SECONDS ) +
									$tracking['second'];
			$tracking['initsend'] = strtotime("next sunday") + $tracking['offset'];

			wp_schedule_event( $tracking['initsend'], 'weekly', 'aioseop_usage_tracking_cron' );
			update_option( 'aioseop_usage_tracking_config', $tracking );

			// Send immediately.
			$this->send_checkin( true, true );
		}
	}

	/**
	 * Create a weekly schedule.
	 *
	 * @since 3.7
	 *
	 * @return array an Array of schedules.
	 */
	public function add_schedules( $schedules = array() ) {
		// Adds once weekly to the existing schedules.
		$schedules['weekly'] = array(
			'interval' => 604800,
			'display'  => __( 'Once Weekly', 'all-in-one-seo-pack' ),
		);
		return $schedules;
	}
}
