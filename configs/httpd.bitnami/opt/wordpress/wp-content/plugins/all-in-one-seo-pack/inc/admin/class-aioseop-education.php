<?php
/**
 * AIOSEOP_Education
 *
 * @package All_in_One_SEO_Pack
 * @since   3.4.0
 */

/**
 * Contains all Product Education related code.
 *
 * @author Arnaud Broes
 * @since 3.4.0
 */
class AIOSEOP_Education {

	/**
	 * Initializes the code.
	 *
	 * @since 3.4.0
	 */
	public static function init() {
		self::register_hooks();
		self::register_wp_ajax_endpoints();
	}

	/**
	 * Registers our hooks.
	 *
	 * @since   3.4.0
	 */
	private static function register_hooks() {
		if ( is_admin() ) {
			add_action( 'admin_footer_text', array( 'AIOSEOP_Education', 'admin_footer_text' ) );
			add_action( 'admin_enqueue_scripts', array( 'AIOSEOP_Education', 'admin_enqueue_scripts' ) );
			add_action( 'in_admin_header', array( 'AIOSEOP_Education', 'hide_notices' ) );

			return;
		}
	}

	/**
	 * Registers our AJAX endpoints.
	 *
	 * @since   3.4.0
	 */
	private static function register_wp_ajax_endpoints() {
		if ( ! is_admin() ) {
			return;
		}

		add_action( 'wp_ajax_aioseop_deactivate_conflicting_plugins', array( 'AIOSEOP_Education', 'deactivate_conflicting_plugins' ) );

		if ( !AIOSEOPPRO || ( AIOSEOPPRO && !aioseop_is_addon_allowed('news_sitemap') ) ) {
			add_action( 'wp_ajax_aioseop_get_news_sitemap_upsell', array( 'AIOSEOP_Education', 'get_news_sitemap_upsell' ) );
		}

		if ( AIOSEOPPRO ) {
			return;
		}

		add_action( 'wp_ajax_aioseop_get_license_box', array( 'AIOSEOP_Education', 'get_license_box' ) );

		add_action( 'wp_ajax_aioseop_get_notice_bar', array( 'AIOSEOP_Education', 'get_notice_bar' ) );
		add_action( 'wp_ajax_aioseop_get_video_sitemap_upsell', array( 'AIOSEOP_Education', 'get_video_sitemap_upsell' ) );
		add_action( 'wp_ajax_aioseop_get_taxonomies_upsell', array( 'AIOSEOP_Education', 'get_taxonomies_upsell' ) );
		add_action( 'wp_ajax_aioseop_get_sitemap_prio_upsell', array( 'AIOSEOP_Education', 'get_sitemap_prio_upsell' ) );

		add_action( 'wp_ajax_aioseop_dismiss_notice_bar', array( 'AIOSEOP_Education', 'dismiss_notice_bar' ) );
		add_action( 'wp_ajax_aioseop_dismiss_video_sitemap_upsell', array( 'AIOSEOP_Education', 'dismiss_video_sitemap_upsell' ) );
	}

	/**
	 * Enqueues our scripts.
	 *
	 * @since   3.4.0
	 */
	public static function admin_enqueue_scripts() {
		self::enqueue_deactivate_conflicting_plugins_script();

		if ( !AIOSEOPPRO || ( AIOSEOPPRO && !aioseop_is_addon_allowed('news_sitemap') ) ) {
			self::enqueue_news_sitemap_upsell_script();
		}

		if ( AIOSEOPPRO ) {
			return;
		}

		self::enqueue_license_box_script();
		self::enqueue_notice_bar_script();
		self::enqueue_video_sitemap_upsell_script();
		self::enqueue_taxonomies_upsell_script();
		self::enqueue_sitemap_prio_upsell_script();
	}

	/**
	 * Enqueues the license box script.
	 *
	 * @since   3.4.0
	 */
	private static function enqueue_license_box_script() {
		if ( 'toplevel_page_' . AIOSEOP_PLUGIN_DIRNAME . '/aioseop_class' !== get_current_screen()->id ) {
			return;
		}

		wp_enqueue_script( 'aioseop-license-box', AIOSEOP_PLUGIN_URL . 'js/admin/education/aioseop-license-box.js', array( 'jquery' ), AIOSEOP_VERSION, false );

		$ajax_data = array(
			'requestUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'      => wp_create_nonce( 'license-box' ),
		);

		wp_localize_script( 'aioseop-license-box', 'aioseopLicenseBoxData', $ajax_data );
	}

	/**
	 * Enqueues the notice bar script.
	 *
	 * @since   3.4.0
	 */
	private static function enqueue_notice_bar_script() {
		if ( ! in_array( get_current_screen()->id, aioseop_get_admin_screens(), true ) ) {
			return;
		}

		wp_enqueue_script( 'aioseop-notice-bar', AIOSEOP_PLUGIN_URL . 'js/admin/education/aioseop-notice-bar.js', array( 'jquery' ), AIOSEOP_VERSION, false );

		$ajax_data = array(
			'requestUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'      => wp_create_nonce( 'notice-bar' ),
		);

		wp_localize_script( 'aioseop-notice-bar', 'aioseopNoticeBarData', $ajax_data );
	}

	/**
	 * Enqueues the video sitemap upsell script.
	 *
	 * @since   3.4.0
	 */
	private static function enqueue_video_sitemap_upsell_script() {
		if ( 'all-in-one-seo_page_' . AIOSEOP_PLUGIN_DIRNAME . '/modules/aioseop_sitemap' !== get_current_screen()->id ) {
			return;
		}

		wp_enqueue_script( 'aioseop-video-sitemap-upsell', AIOSEOP_PLUGIN_URL . 'js/admin/education/aioseop-video-sitemap-upsell.js', array( 'jquery' ), AIOSEOP_VERSION, false );

		$ajax_data = array(
			'requestUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'      => wp_create_nonce( 'video-sitemap-upsell' ),
		);

		wp_localize_script( 'aioseop-video-sitemap-upsell', 'aioseopVideoSitemapUpsellData', $ajax_data );
	}

	/**
	 * Enqueues the video sitemap upsell script.
	 *
	 * @since   3.4.0
	 */
	private static function enqueue_news_sitemap_upsell_script() {
		if (
			'all-in-one-seo_page_' . AIOSEOP_PLUGIN_DIRNAME . '/modules/aioseop_sitemap' !== get_current_screen()->id &&
			'all-in-one-seo_page_' . AIOSEOP_PLUGIN_DIRNAME . '/pro/class-aioseop-pro-sitemap' !== get_current_screen()->id
		) {
			return;
		}

		wp_enqueue_script( 'aioseop-news-sitemap-upsell', AIOSEOP_PLUGIN_URL . 'js/admin/education/aioseop-news-sitemap-upsell.js', array( 'jquery' ), AIOSEOP_VERSION, false );

		$ajax_data = array(
			'requestUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'      => wp_create_nonce( 'news-sitemap-upsell' ),
		);

		wp_localize_script( 'aioseop-news-sitemap-upsell', 'aioseopNewsSitemapUpsellData', $ajax_data );
	}

	/**
	 * Enqueues the taxonomy upsell script.
	 *
	 * @since   3.4.0
	 */
	private static function enqueue_taxonomies_upsell_script() {
		$allowed_screens = array(
			'edit-category',
			'edit-post_tag',
			'edit-product_cat',
			'edit-product_tag',
		);

		$screen = get_current_screen();
		if ( 'term' !== $screen->base || ! in_array( $screen->id, $allowed_screens ) ) {
			return;
		}

		wp_enqueue_script( 'aioseop-taxonomies-upsell', AIOSEOP_PLUGIN_URL . 'js/admin/education/aioseop-taxonomies-upsell.js', array( 'jquery' ), AIOSEOP_VERSION, true );

		$ajax_data = array(
			'requestUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'      => wp_create_nonce( "taxonomies-upsell-$screen->id" ),
			'pageId'     => $screen->id,
		);

		wp_localize_script( 'aioseop-taxonomies-upsell', 'aioseopTaxonomiesUpsellData', $ajax_data );
	}

	/**
	 * Enqueues the deactivate conflicting plugins script.
	 *
	 * @since   3.4.0
	 */
	private static function enqueue_deactivate_conflicting_plugins_script() {
		global $aioseop_notices;

		if ( ! isset( $aioseop_notices->active_notices['conflicting_plugin'] ) ) {
			return;
		}

		wp_enqueue_script( 'aioseop-deactivate-conflicting-plugins', AIOSEOP_PLUGIN_URL . 'js/admin/education/aioseop-deactivate-conflicting-plugins.js', array( 'jquery' ), AIOSEOP_VERSION, true );

		$ajax_data = array(
			'requestUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'      => wp_create_nonce( 'aioseop-deactivate-conflicting-plugins' ),
		);

		wp_localize_script( 'aioseop-deactivate-conflicting-plugins', 'aioseopDeactivateConflictingPluginsData', $ajax_data );
	}


	/**
	 * Enqueues the sitemap prio upsell script.
	 *
	 * @since   3.4.0
	 */
	private static function enqueue_sitemap_prio_upsell_script() {
		$screen = get_current_screen();
		if ( 'post' !== $screen->base ) {
			return;
		}

		wp_enqueue_script( 'aioseop-sitemap-prio-upsell', AIOSEOP_PLUGIN_URL . 'js/admin/education/aioseop-sitemap-prio-upsell.js', array( 'jquery' ), AIOSEOP_VERSION, true );

		$ajax_data = array(
			'requestUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'      => wp_create_nonce( 'aioseop-sitemap-prio-upsell' ),
			'pageId'     => $screen->id,
		);

		wp_localize_script( 'aioseop-sitemap-prio-upsell', 'aioseopSitemapPrioUpsellData', $ajax_data );
	}

	/**
	 * Returns the license box markup for the General Settings menu.
	 *
	 * Acts as a callback for our "wp_ajax_aioseop_get_license_box" endpoint.
	 *
	 * @since   3.4.0
	 */
	public static function get_license_box() {
		if ( ! isset( $_GET ) ) {
			return;
		}

		check_ajax_referer( 'license-box', '_ajax_nonce' );

		/* translators: %s: "All in One SEO Pack" */
		$link_title = sprintf( __( 'Upgrade to %s', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME . '&nbsp;Pro' );

		$link = sprintf(
			'<a href="%1$s" target="_blank" title="%2$s">%3$s</a>',
			aioseop_get_utm_url( 'license-box' ),
			$link_title,
			/* translators: The full sentence reads as: "To unlock more features consider upgrading to Pro." */
			__( 'upgrading to PRO', 'all-in-one-seo-pack' )
		);

		$span = sprintf(
			"<span class='aioseop-upsell-discount-amount'>%s</span>",
			/* translators: This refers to a discount. The full sentence reads as: "As a valued user you receive 30% off, automatically applied at checkout!" */
			__( '30% off', 'all-in-one-seo-pack' )
		);

		$license_box_content = array(
			/* translators: %s: "All in One SEO Pack" */
			'p1' => sprintf( __( "You're using %s - no license needed. Enjoy! 🙂", 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME . '&nbsp;Lite' ),
			/* translators: %s: "upgrading to Pro" */
			'p2' => sprintf( __( 'To unlock more features consider %s', 'all-in-one-seo-pack' ), $link ),
			/* translators: %1$s: "All in One SEO Pack" - %2$s: "30% off" */
			'p3' => sprintf( __( 'As a valued %1$s user you receive %2$s, automatically applied at checkout!', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME, $span ),
		);

		printf(
			'<div class="license-box">
                <p>%1$s</p>
                <p>%2$s</p>
                <p>%3$s</p>
            </div>',
			$license_box_content['p1'],
			$license_box_content['p2'],
			$license_box_content['p3']
		);

		wp_die();
	}

	/**
	 * Returns the notice bar markup.
	 *
	 * Acts as a callback for our "wp_ajax_aioseop_get_notice_bar" endpoint.
	 *
	 * @since   3.4.0
	 */
	public static function get_notice_bar() {
		if ( ! isset( $_GET ) ) {
			return;
		}

		check_ajax_referer( 'notice-bar', '_ajax_nonce' );

		if ( self::check_if_dismissed( 'notice-bar' ) ) {
			return;
		}

		/* translators: %s: "All in One SEO Pack" */
		$link_title = sprintf( __( 'Upgrade to %s', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME . '&nbsp;Pro' );

		$link = sprintf(
			'<a href="%1$s" target="_blank" title="%2$s">%3$s</a>',
			aioseop_get_utm_url( 'notice-bar' ),
			$link_title,
			/* translators: The full sentence reads as: "To unlock more features consider upgrading to Pro." */
			__( 'upgrading to PRO', 'all-in-one-seo-pack' )
		);

		$message = sprintf(
			/* translators: %1$s: "ALl in One SEO Pack" - %2$s: "upgrading to Pro" */
			__( 'You’re using %1$s. To unlock more features consider %2$s.', 'all-in-one-seo-pack' ),
			AIOSEOP_PLUGIN_NAME . '&nbsp;Lite',
			$link
		);

		printf(
			'<div id="aioseop-notice-bar">
				<span class="aioseop-notice-bar-message">%1$s</span>
				<button type="button" class="dismiss" title="%2$s" />
			</div>',
			$message,
			__( 'Dismiss this message.', 'all-in-one-seo-pack' )
		);

		wp_die();
	}

	/**
	 * Returns the video sitemap upsell markup.
	 *
	 * Acts as a callback for our "wp_ajax_aioseop_get_notice_bar" endpoint.
	 *
	 * @since   3.4.0
	 */
	public static function get_video_sitemap_upsell() {
		if ( ! isset( $_GET ) ) {
			return;
		}

		check_ajax_referer( 'video-sitemap-upsell', '_ajax_nonce' );

		if ( self::check_if_dismissed( 'video-sitemap-upsell' ) ) {
			return;
		}

		/* translators: %s: "All in One SEO Pack" */
		$header = sprintf( __( 'Get %s and Unlock all the Powerful Features', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME . '&nbsp;Pro' );
		$p1     = sprintf(
			'Thanks for being a loyal %1$s user. Did you know that our premium version also supports video sitemaps?
             Upgrade to %2$s to unlock all the awesome features and experience why %3$s is considered the best WordPress SEO plugin.',
			AIOSEOP_PLUGIN_NAME . '&nbsp;Lite',
			AIOSEOP_PLUGIN_NAME . '&nbsp;Pro',
			AIOSEOP_PLUGIN_NAME
		);
		$p2     = sprintf(
			__( 'We know that you will truly love %1$s. It has over 300+ five star ratings (%2$s) and is active on over 2 million websites.', 'all-in-one-seo-pack' ),
			AIOSEOP_PLUGIN_NAME,
			str_repeat( '<span class="dashicons dashicons-star-filled aioseop-rating-star"></span>', 5 )
		);
		$p3     = sprintf(
			__( 'Bonus: %1$s users get %2$s the regular price, automatically applied at checkout.', 'all-in-one-seo-pack' ),
			AIOSEOP_PLUGIN_NAME . '&nbsp;Lite',
			sprintf(
				'<span class="aioseop-upsell-discount-amount">%s</span>',
				__( '30% off', 'all-in-one-seo-pack' )
			)
		);

		/* translators: %s: "All in One SEO Pack" */
		$link_title = sprintf( __( 'Upgrade to %s', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME . '&nbsp;Pro' );

		$link = sprintf(
			'<a href="%1$s" target="_blank" title="%2$s">%3$s</a>',
			aioseop_get_utm_url( 'video-sitemap-upsell' ),
			$link_title,
			$header . '&nbsp;»'
		);

		echo
			"<div id='aioseop-video-sitemap-upsell'>
            <span class='dashicons dashicons-dismiss dismiss'></span><h5>$header</h5><br/><p>$p1</p><p>$p2</p></p><p>$link</p><p>$p3</p>
            </div>";

		wp_die();
	}

	/**
	 * Returns the news sitemap upsell markup.
	 *
	 * Acts as a callback for our "wp_ajax_aioseop_get_news_sitemap_upsell" endpoint.
	 *
	 * @since   3.4.0
	 */
	public static function get_news_sitemap_upsell() {
		if ( ! isset( $_GET ) ) {
			return;
		}

		check_ajax_referer( 'news-sitemap-upsell', '_ajax_nonce' );

		$message = __( 'Did you know that we also support Google News sitemaps?&nbsp;', 'all-in-one-seo-pack' );
		$link    = __( 'Upgrade to Pro to unlock this feature.', 'all-in-one-seo-pack' );
		if( AIOSEOPPRO && !aioseop_is_addon_allowed('news_sitemap') ) {
			$message = __( 'Did you know that Business & Agency plan users also have access to Google News sitemaps?&nbsp;', 'all-in-one-seo-pack' );
			$link    = __( 'Upgrade to our Business or Agency plans to unlock this feature.', 'all-in-one-seo-pack' );
		}

		printf(
			'<p class="aioseop-news-sitemap-upsell">%1$s<br/><a href="%2$s" title="%3$s" target="_blank">%4$s</a></p>',
			$message,
			aioseop_get_utm_url( 'news-sitemap-upsell' ),
			/* translators: %s: "All in One SEO Pack Pro" */
			sprintf( __( 'Upgrade to %s', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME . '&nbsp;Pro' ),
			$link
		);

		wp_die();
	}

	/**
	 * Returns the taxonomies upsell markup.
	 *
	 * Acts as a callback for our "wp_ajax_aioseop_get_taxonomies_upsell" endpoint.
	 *
	 * @since   3.4.0
	 */
	public static function get_taxonomies_upsell() {
		if ( ! isset( $_GET ) ) {
			return;
		}

		$page_id = $_GET['page_id'];

		check_ajax_referer( "taxonomies-upsell-$page_id", '_ajax_nonce' );

		$content = self::get_taxonomies_upsell_content( $page_id );
		if ( ! empty( $content ) ) {
			echo $content;
		}

		die();
	}

	/**
	 * Returns the sitemap prio upsell markup.
	 *
	 * Acts as a callback for our "wp_ajax_aioseop_get_sitemap_prio_upsell" endpoint.
	 *
	 * @since   3.4.0
	 */
	public static function get_sitemap_prio_upsell() {
		check_ajax_referer( 'aioseop-sitemap-prio-upsell', '_ajax_nonce' );

		printf(
			'<a class="aioseop-sitemap-prio-upsell" href="%1$s" title="%2$s" target="_blank">%3$s</a>',
			aioseop_get_utm_url( 'sitemap-prio-upsell' ),
			/* translators: %s: "All in One SEO Pack Pro" */
			sprintf( __( 'Upgrade to %s', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME . '&nbsp;Pro' ),
			__( 'Upgrade to Pro to unlock this feature.', 'all-in-one-seo-pack' )
		);

		die();
	}

	/**
	 * Checks if an upsell with a given key has been dismissed by the user.
	 *
	 * @since   3.4.0
	 *
	 * @param   string  $key    The name of the upsell.
	 * @return  bool            Whether or not the upsell has been dismissed.
	 */
	private static function check_if_dismissed( $key ) {

		$current_user = wp_get_current_user();
		$dismissed    = get_user_meta( $current_user->ID, 'aioseop_dismissed', true );

		if ( ! empty( $dismissed[ $key ] ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Dismisses the notice bar for the current user.
	 *
	 * @since   3.4.0
	 */
	public static function dismiss_notice_bar() {
		if ( ! isset( $_GET ) ) {
			return;
		}

		self::dismiss_upsell( 'notice-bar' );
	}

	/**
	 * Dismisses the video sitemap upsell for the current user.
	 *
	 * @since   3.4.0
	 */
	public static function dismiss_video_sitemap_upsell() {
		if ( ! isset( $_GET ) ) {
			return;
		}

		self::dismiss_upsell( 'video-sitemap-upsell' );
	}

	/**
	 * Dismisses an upsell with a given key.
	 *
	 * @since   3.4.0
	 *
	 * @param   string  $key    The name of the upsell.
	 */
	private static function dismiss_upsell( $key ) {
		$current_user = wp_get_current_user();
		$dismissed    = get_user_meta( $current_user->ID, 'aioseop_dismissed', true );

		if ( empty( $dismissed ) ) {
			$dismissed = array();
		}

		$dismissed[ $key ] = time();

		update_user_meta( $current_user->ID, 'aioseop_dismissed', $dismissed );
		wp_send_json_success();
	}

	/**
	 * Deactivates all conflicting seo & sitemap plugins.
	 *
	 * @since   3.4.0
	 *
	 * @param   string  $key    The name of the upsell.
	 */
	public static function deactivate_conflicting_plugins() {
		if ( ! is_admin() ) {
			return;
		}

		$plugins = array_merge(
			self::get_conflicting_plugins( 'seo' ),
			self::get_conflicting_plugins( 'sitemap' )
		);

		if ( empty( $plugins ) ) {
			return;
		}

		include_once( ABSPATH . 'wp-admin/includes/plugin.php' );
		foreach ( $plugins as $plugin_name => $plugin_path ) {
			if ( is_plugin_active( $plugin_path ) ) {
				deactivate_plugins( $plugin_path );
			}
		}
	}

	/**
	 * Adds external tools to our admin bar menu.
	 *
	 * Acts as a callback for the "wp_admin_bar_menu" action hook.
	 *
	 * @param   Object   $wp_admin_bar
	 */
	public static function external_tools( $wp_admin_bar ) {
		global $wp;
		$url = home_url( $wp->request );

		if ( ! $url ) {
			return;
		}

		$wp_admin_bar->add_menu(
			array(
				'id'     => 'aioseop-external-tools',
				'parent' => AIOSEOP_PLUGIN_DIRNAME,
				'title'  => __( 'Analyze this page', 'all-in-one-seo-pack' ),
			)
		);

		$url = urlencode( $url );

		$submenu_items = array(
			array(
				'id'    => 'aioseop-external-tools-inlinks',
				'title' => __( 'Check links to this URL', 'all-in-one-seo-pack' ),
				'href'  => 'https://search.google.com/search-console/links/drilldown?resource_id=' . urlencode( get_option( 'siteurl' ) ) . '&type=EXTERNAL&target=' . $url . '&domain=',
			),
			array(
				'id'    => 'aioseop-external-tools-cache',
				'title' => __( 'Check Google Cache', 'all-in-one-seo-pack' ),
				'href'  => '//webcache.googleusercontent.com/search?strip=1&q=cache:' . $url,
			),
			array(
				'id'    => 'aioseop-external-tools-structureddata',
				'title' => __( 'Google Structured Data Test', 'all-in-one-seo-pack' ),
				'href'  => 'https://search.google.com/test/rich-results?url=' . $url,
			),
			array(
				'id'    => 'aioseop-external-tools-facebookdebug',
				'title' => __( 'Facebook Debugger', 'all-in-one-seo-pack' ),
				'href'  => 'https://developers.facebook.com/tools/debug/?q=' . $url,
			),
			array(
				'id'    => 'aioseop-external-tools-pinterestvalidator',
				'title' => __( 'Pinterest Rich Pins Validator', 'all-in-one-seo-pack' ),
				'href'  => 'https://developers.pinterest.com/tools/url-debugger/?link=' . $url,
			),
			array(
				'id'    => 'aioseop-external-tools-htmlvalidation',
				'title' => __( 'HTML Validator', 'all-in-one-seo-pack' ),
				'href'  => '//validator.w3.org/check?uri=' . $url,
			),
			array(
				'id'    => 'aioseop-external-tools-cssvalidation',
				'title' => __( 'CSS Validator', 'all-in-one-seo-pack' ),
				'href'  => '//jigsaw.w3.org/css-validator/validator?uri=' . $url,
			),
			array(
				'id'    => 'aioseop-external-tools-pagespeed',
				'title' => __( 'Google Page Speed Test', 'all-in-one-seo-pack' ),
				'href'  => '//developers.google.com/speed/pagespeed/insights/?url=' . $url,
			),
			array(
				'id'    => 'aioseop-external-tools-google-mobile-friendly',
				'title' => __( 'Mobile-Friendly Test', 'all-in-one-seo-pack' ),
				'href'  => 'https://www.google.com/webmasters/tools/mobile-friendly/?url=' . $url,
			),
			array(
				'id'    => 'aioseo-external-tools-linkedin-post-inspector',
				'title' => __( 'LinkedIn Post Inspector', 'all-in-one-seo-pack' ),
				'href'  => "https://www.linkedin.com/post-inspector/inspect/$url"
			)
		);

		foreach ( $submenu_items as $menu_item ) {
			$menu_args = array(
				'parent' => 'aioseop-external-tools',
				'id'     => $menu_item['id'],
				'title'  => $menu_item['title'],
				'href'   => $menu_item['href'],
				'meta'   => array( 'target' => '_blank' ),
			);

			$wp_admin_bar->add_menu( $menu_args );
		}

		return $wp_admin_bar;
	}

	/**
	 * Adds our rating request as a footer to our screens.
	 *
	 * @since   3.4.0
	 */
	public static function admin_footer_text() {
		if ( ! in_array( get_current_screen()->base, aioseop_get_admin_screens(), true ) ) {
			return;
		}

		$href = 'https://wordpress.org/support/plugin/all-in-one-seo-pack/reviews/?filter=5#new-post';

		$link1 = sprintf(
			'<a href="%1$s" target="_blank" title="%2$s">&#9733;&#9733;&#9733;&#9733;&#9733;</a>',
			$href,
			__( 'Give us a 5-star rating!', 'all-in-one-seo-pack' )
		);

		$link2 = sprintf(
			'<a href="%1$s" target="_blank" title="%2$s">WordPress.org</a>',
			$href,
			__( 'Give us a 5-star rating!', 'all-in-one-seo-pack' )
		);

		printf(
			/* translators: %1$s: "All in One SEO Pack" - %2$s: This placeholder will be replaced with star icons. - %3$s: "WordPress.org" - %4$s: "All in One SEO Pack" */
			__( 'Please rate %1$s %2$s on %3$s to help us spread the word. Thank you from the %4$s team!', 'all-in-one-seo-pack' ),
			sprintf( '<strong>%s</strong>', AIOSEOP_PLUGIN_NAME ),
			$link1,
			$link2,
			AIOSEOP_PLUGIN_NAME
		);
	}

	/**
	 * Register a notice if conflicting plugins have been detected.
	 *
	 * @since   3.4.0
	 */
	public static function register_conflicting_plugin_notice() {
		global $aioseop_notices;
		global $aioseop_options;

		$conflicting_seo_plugins     = self::get_conflicting_plugins( 'seo' );
		$conflicting_sitemap_plugins = array();

		if ( // This value does not exist if user has never (de)activated a module before.
			! isset( $aioseop_options['modules']['aiosp_feature_manager_options'] ) ||
			! empty( $aioseop_options['modules']['aiosp_feature_manager_options']['aiosp_feature_manager_enable_sitemap'] ) ) {
			$conflicting_sitemap_plugins = self::get_conflicting_plugins( 'sitemap' );
		}

		$conflicting_plugins = array_merge( $conflicting_seo_plugins, $conflicting_sitemap_plugins );
		self::check_new_conflicting_plugins( $conflicting_plugins );

		if ( empty( $conflicting_plugins ) ) {
			if ( isset( $aioseop_notices->active_notices['conflicting_plugin'] ) ) {
				$aioseop_notices->remove_notice( 'conflicting_plugin' );
			}
			return;
		}

		$aioseop_notices->activate_notice( 'conflicting_plugin' );
		add_filter( 'aioseop_admin_notice-conflicting_plugin', array( 'AIOSEOP_Education', 'filter_conflicting_plugin_notice_data' ) );
	}

	/**
	 * Checks if new conflicting plugins were found and resets notice status.
	 *
	 * @since 3.4.3
	 *
	 * @param array $conflicting_plugins
	 */
	private static function check_new_conflicting_plugins( $conflicting_plugins ) {
		// get_option() doesn't work here because it returns false if the option is blank, and we need to know if it exists.
		global $wpdb;
		$count = (int) $wpdb->get_var( "SELECT count(*) FROM {$wpdb->options} WHERE option_name = 'aioseop_detected_conflicting_plugins'" );

		$stored = array();
		if ( 0 !== $count ) {
			$stored = get_option( 'aioseop_detected_conflicting_plugins' );
			update_option( 'aioseop_detected_conflicting_plugins', $conflicting_plugins );
		} else {
			add_option( 'aioseop_detected_conflicting_plugins', $conflicting_plugins );
		}

		if ( count( $stored ) < count( $conflicting_plugins ) ) {
			if ( get_user_meta( get_current_user_id(), 'aioseop_notice_display_time_conflicting_plugin' ) ) {
				delete_user_meta( get_current_user_id(), 'aioseop_notice_display_time_conflicting_plugin' );
			}
		}
	}

	/**
	 * Filters the data that goes into our conflicting plugins notice.
	 *
	 * @since   3.4.0
	 *
	 * @param   Object      $notice_data    The default data of the notice.
	 */
	public static function filter_conflicting_plugin_notice_data( $notice_data ) {
		global $aioseop_options;
		$seo_plugin_list     = '';
		$sitemap_plugin_list = '';

		$conflicting_seo_plugins     = self::get_conflicting_plugins( 'seo' );
		$conflicting_sitemap_plugins = self::get_conflicting_plugins( 'sitemap' );

		if ( ! empty( $conflicting_seo_plugins ) ) {
			$list_header = sprintf( '<strong>%s</strong>', __( 'SEO Plugins', 'all-in-one-seo-pack' ) );

			$list = '';
			foreach ( $conflicting_seo_plugins as $plugin_name => $plugin_path ) {
				$plugin_name = str_replace( '_', ' ', $plugin_name );
				$list       .= "<li>${plugin_name}</li>";
			}

			$seo_plugin_list = sprintf( '%s<ul class="aioseop-notice-list">%s</ul>', $list_header, $list );
		}

		if ( ! empty( $conflicting_sitemap_plugins ) &&
			// This value does not exist if user has never (de)activated a module before.
			( ! isset( $aioseop_options['modules']['aiosp_feature_manager_options'] ) || ! empty( $aioseop_options['modules']['aiosp_feature_manager_options']['aiosp_feature_manager_enable_sitemap'] ) )
		) {
			$list_header = sprintf( '<strong>%s</strong>', __( 'Sitemap Plugins', 'all-in-one-seo-pack' ) );

			$list = '';
			foreach ( $conflicting_sitemap_plugins as $plugin_name => $plugin_path ) {
				$plugin_name = str_replace( '_', ' ', $plugin_name );
				$list       .= "<li>${plugin_name}</li>";
			}

			$sitemap_plugin_list = sprintf( '%s<ul class="aioseop-notice-list">%s</ul>', $list_header, $list );
		}

		$notice_data['html'] =
		'<div><p>' .

		sprintf(
			__(
				'<strong>Warning</strong>: %s has detected other active SEO or sitemap plugins. We recommend that you deactivate the following plugins to prevent any conflicts:',
				'all-in-one-seo-pack'
			),
			AIOSEOP_PLUGIN_NAME
		) .

		'</p><div class="aioseop-notice-indented">' . $seo_plugin_list . $sitemap_plugin_list . '</div></div>';

		return $notice_data;
	}

	/**
	 * Returns an unordered list of SEO plugins that are known to conflict with All in One SEO Pack.
	 *
	 * @since   3.4.0
	 *
	 * @param   string  $type   The type of conflicting plugin ("seo" or "sitemap").
	 *
	 * @return  array   The list of plugins that are known to conflict.
	 */
	private static function get_conflicting_plugins( $type ) {
		$active_plugins = get_option( 'active_plugins' );

		$conflicting_plugins = array();
		switch ( $type ) {
			case 'seo': {
				$conflicting_plugins = array(
					'Yoast SEO'         => 'wordpress-seo/wp-seo.php',
					'Yoast SEO Premium' => 'wordpress-seo-premium/wp-seo-premium.php',
					'Rank Math SEO'     => 'seo-by-rank-math/rank-math.php',
					'SEOPress'          => 'wp-seopress/seopress.php',
					'The SEO Framework' => 'autodescription/autodescription.php',
				);
				break;
			}
			case 'sitemap': {
				$conflicting_plugins = array(
					'Google XML Sitemaps'          => 'google-sitemap-generator/sitemap.php',
					'XML Sitemap & Google News'    => 'xml-sitemap-feed/xml-sitemap.php',
					'Google XML Sitemap Generator' => 'www-xml-sitemap-generator-org/www-xml-sitemap-generator-org.php',
					'Sitemap by BestWebSoft'       => 'google-sitemap-plugin/google-sitemap-plugin.php',
				);
				break;
			}
		}

		return array_intersect( $conflicting_plugins, $active_plugins );
	}

	/**
	 * Returns the taxonomies upsell markup.
	 *
	 * @since   3.4.0
	 *
	 * @param   string  $page_id    The ID of the current page.
	 *
	 * @return  string              The taxonomies upsell markup.
	 */
	private static function get_taxonomies_upsell_content( $page_id ) {
		$is_woocommerce_page = false;
		if ( 'edit-product_cat' === $page_id || 'edit-product_tag' === $page_id ) {
			$is_woocommerce_page = true;
		}

		return self::get_taxonomies_upsell_markup( $page_id, $is_woocommerce_page );
	}

	/**
	 * Returns the modal markup for the taxonomies upsell.
	 *
	 * @since   3.4.0
	 *
	 * @param   string  $page_id                The ID of the current page.
	 * @param   bool    $is_woocommerce_page    Whether or not the current page is a WooCommerce taxonomy page.
	 *
	 * @return  string                          The taxonomies upsell modal markup.
	 */
	private static function get_taxonomies_upsell_modal_markup( $page_id, $is_woocommerce_page = false ) {
		$header = ( $is_woocommerce_page ) ? __( 'Unlock SEO for WooCommerce Product Categories & Product Tags', 'all-in-one-seo-pack' ) : __( 'Unlock SEO for Categories, Tags and Custom Taxonomies', 'all-in-one-seo-pack' );

		return
		'<div class="aioseop-taxonomies-upsell-modal">
        <div class="aioseop-taxonomies-upsell-modal-content">
            <h2>' . $header . '</h2>
            <p>
                <strong>' .
				__( 'This feature is exclusive to our premium version.', 'all-in-one-seo-pack' ) .
				'</strong><br>' .
				/* translators: %s: "All in One SEO Pack Pro" */
				sprintf( __( 'Once you upgrade to %s, you will gain access to all of our exclusive premium features, providing you with even more control over your SEO.', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME . '&nbsp;Pro' ) .
				'
            </p>
            <div>
                <ul class="left">
                    <li><span class="dashicons dashicons-yes aioseop-modal-checkmark"></span>' . __( 'SEO and Social Meta for Taxonomies', 'all-in-one-seo-pack' ) . '</li>
                    <li><span class="dashicons dashicons-yes aioseop-modal-checkmark"></span>' . __( 'Advanced support for WooCommerce', 'all-in-one-seo-pack' ) . '</li>
                    <li><span class="dashicons dashicons-yes aioseop-modal-checkmark"></span>' . __( 'Video Sitemap Module', 'all-in-one-seo-pack' ) . '</li>
                    <li><span class="dashicons dashicons-yes aioseop-modal-checkmark"></span>' . __( 'Image SEO Module', 'all-in-one-seo-pack' ) . '</li>
                </ul>
                <ul class="right">
                    <li><span class="dashicons dashicons-yes aioseop-modal-checkmark"></span>' . __( 'Support for Google Tag Manager', 'all-in-one-seo-pack' ) . '</li>
                    <li><span class="dashicons dashicons-yes aioseop-modal-checkmark"></span>' . __( 'Advanced Google Analytics tracking', 'all-in-one-seo-pack' ) . '</li>
                    <li><span class="dashicons dashicons-yes aioseop-modal-checkmark"></span>' . __( 'Access to Premium Support', 'all-in-one-seo-pack' ) . '</li>
                    <li><span class="dashicons dashicons-yes aioseop-modal-checkmark"></span>' . __( 'Ad free (no banner adverts)', 'all-in-one-seo-pack' ) . '</li>
                </ul>
            </div>
        </div>
        <div class="aioseop-taxonomies-upsell-modal-button">
            <a href="' . aioseop_get_utm_url( "taxonomies-upsell-{$page_id}" ) . '" class="button button-primary button-hero" target="_blank" rel="noopener noreferrer">' .
			/* translators: %s: "All in One SEO Pack Pro"  */
			sprintf( __( 'Upgrade to %s Now', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME . '&nbsp;Pro' ) .
			'</a>
        </div>
    </div>';
	}

	/**
	 * Returns the markup for the taxonomies upsell.
	 *
	 * @since   3.4.0
	 *
	 * @param   string  $page_id                The ID of the current page.
	 * @param   bool    $is_woocommerce_page    Whether or not the current page is a WooCommerce taxonomy page.
	 *
	 * @return  string                          The taxonomies upsell AIOSEOP metabox markup.
	 */
	private static function get_taxonomies_upsell_markup( $page_id, $is_woocommerce_page ) {
		return
		'<div class="aioseop-preview-wrapper">
		 <div id="poststuff" class="aioseop-upsell-blurred">
			<div id="advanced-sortables" class="meta-box-sortables">
				<div id="aiosp_tabbed" class="postbox ">
					<button type="button" class="handlediv" aria-expanded="true" disabled="disabled"><span class="screen-reader-text">Toggle panel: All in One SEO Pack Pro</span><span class="toggle-indicator" aria-hidden="true"></span></button>
					<h2 class="hndle"><span>All in One SEO Pack Pro</span></h2>
					<div class="inside">
						<div class="aioseop_tabs ui-tabs ui-widget ui-widget-content ui-corner-all">
							<ul class="aioseop_header_tabs hide ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all" role="tablist">
								<li class="ui-state-default ui-corner-top ui-tabs-active ui-state-active" role="tab" tabindex="0" aria-controls="aiosp" aria-labelledby="ui-id-1" aria-selected="true" aria-expanded="true"><label class="aioseop_header_nav"><a class="aioseop_header_tab active ui-tabs-anchor" href="#aiosp" role="presentation" tabindex="-1" id="ui-id-1">Main Settings</a></label></li>
								<li class="ui-state-default ui-corner-top" role="tab" tabindex="-1" aria-controls="aioseop_opengraph_settings" aria-labelledby="ui-id-2" aria-selected="false" aria-expanded="false"><label class="aioseop_header_nav"><a class="aioseop_header_tab ui-tabs-anchor" href="#aioseop_opengraph_settings" role="presentation" tabindex="-1" id="ui-id-2">Social Settings</a></label></li>
							</ul>
							<div id="aiosp" class="aioseop_tab ui-tabs-panel ui-widget-content ui-corner-bottom" aria-labelledby="ui-id-1" role="tabpanel" aria-hidden="false">
								<input name="aiosp_edit" type="hidden" value="aiosp_edit" autocomplete="aioseop-1583681284" disabled="disabled">
								<div class="aioseop aioseop_options aiosp_settings">
									<div class="aioseop_wrapper aioseop_html_type" id="aiosp_snippet_wrapper">
										<div class="aioseop_input"><span class="aioseop_option_label" style="text-align:left;vertical-align:top;"><a tabindex="0" class="aioseop_help_text_link"></a><label class="aioseop_label textinput">Preview Snippet</label></span></div>
										<div class="aioseop_input aioseop_top_label">
											<div class="aioseop_option_input">
												<div class="aioseop_option_div">
													<div class="preview_snippet">
														<div id="aioseop_snippet">
															<h3><a>Bacon Ipsum | Dev AIOSEOP</a></h3>
															<div>
																<div><cite id="aioseop_snippet_link">http://bacon-ipsum</cite></div>
																<span id="aioseop_snippet_description">Bacon ipsum dolor brisket beef ribs pork chop. Pig venison bresaola alcatra buffalo t-bone tail.</span>
															</div>
														</div>
													</div>
												</div>
											</div>
											<p style="clear:left"></p>
										</div>
									</div>
									<div class="aioseop_wrapper aioseop_text_type" id="aiosp_title_wrapper">
										<div class="aioseop_input">
											<span class="aioseop_option_label" style="text-align:right;vertical-align:top;"><a tabindex="0" class="aioseop_help_text_link"></a><label class="aioseop_label textinput">Title</label></span>
											<div class="aioseop_option_input">
												<div class="aioseop_option_div"><input name="aiosp_title" type="text" size="60" placeholder="Bacon Ipsum" class=" aioseop_count_chars" data-length-field="length1" value="Bacon Ipsum" autocomplete="aioseop-1583681284" disabled="disabled">
													<br><input readonly="" tabindex="-1" type="text" name="length1" size="3" maxlength="3" style="width:53px;height:23px;margin:0px;padding:0px 0px 0px 10px;" value="11" class="aioseop_count_good" disabled="disabled"> characters. Most search engines use a maximum of 60 chars for the title.
												</div>
											</div>
											<p style="clear:left"></p>
										</div>
									</div>
									<div class="aioseop_wrapper aioseop_textarea_type" id="aiosp_description_wrapper">
										<div class="aioseop_input">
											<span class="aioseop_option_label" style="text-align:right;vertical-align:top;"><a tabindex="0" class="aioseop_help_text_link"></a><label class="aioseop_label textinput">Description</label></span>
											<div class="aioseop_option_input">
												<div class="aioseop_option_div"><textarea name="aiosp_description" placeholder="Bacon ipsum dolor brisket beef ribs pork chop. Pig venison bresaola alcatra buffalo t-bone tail." rows="2" cols="80" class=" aioseop_count_chars" data-length-field="length2" disabled="disabled" style="margin-top: 1px; margin-bottom: 1px; height: 143px;"></textarea><br><input readonly="" tabindex="-1" type="text" name="length2" size="3" maxlength="3" style="width:53px;height:23px;margin:0px;padding:0px 0px 0px 10px;" value="139" class="aioseop_count_good" disabled="disabled"> characters. Most search engines use a maximum of 160 chars for the description.</div>
											</div>
											<p style="clear:left"></p>
										</div>
									</div>
									<div class="aioseop_wrapper aioseop_text_type" id="aiosp_custom_link_wrapper">
										<div class="aioseop_input">
											<span class="aioseop_option_label" style="text-align:right;vertical-align:top;"><a tabindex="0" class="aioseop_help_text_link"></a><label class="aioseop_label textinput">Custom Canonical URL</label></span>
											<div class="aioseop_option_input">
												<div class="aioseop_option_div"><input name="aiosp_custom_link" type="text" size="60" value="bacon-ipsum" autocomplete="aioseop-1583681284" disabled="disabled">
												</div>
											</div>
											<p style="clear:left"></p>
										</div>
									</div>
									<div class="aioseop_wrapper aioseop_checkbox_type" id="aiosp_noindex_wrapper">
										<div class="aioseop_input">
											<span class="aioseop_option_label" style="text-align:right;vertical-align:top;"><a tabindex="0" class="aioseop_help_text_link"></a><label class="aioseop_label textinput">NOINDEX this page/post</label></span>
											<div class="aioseop_option_input">
												<div class="aioseop_option_div"><input name="aiosp_noindex" type="checkbox" disabled="disabled">
												</div>
											</div>
											<p style="clear:left"></p>
										</div>
									</div>
									<div class="aioseop_wrapper aioseop_checkbox_type" id="aiosp_nofollow_wrapper">
										<div class="aioseop_input">
											<span class="aioseop_option_label" style="text-align:right;vertical-align:top;"><a tabindex="0" class="aioseop_help_text_link"></a><label class="aioseop_label textinput">NOFOLLOW this page/post</label></span>
											<div class="aioseop_option_input">
												<div class="aioseop_option_div"><input name="aiosp_nofollow" type="checkbox" checked="" disabled="disabled">
												</div>
											</div>
											<p style="clear:left"></p>
										</div>
									</div>
									<div class="aioseop_wrapper aioseop_checkbox_type" id="aiosp_disable_wrapper">
										<div class="aioseop_input">
											<span class="aioseop_option_label" style="text-align:right;vertical-align:top;"><a tabindex="0" class="aioseop_help_text_link"></a><label class="aioseop_label textinput">Disable on this page/post</label></span>
											<div class="aioseop_option_input">
												<div class="aioseop_option_div"><input name="aiosp_disable" type="checkbox" disabled="disabled">
												</div>
											</div>
											<p style="clear:left"></p>
										</div>
									</div>
									<div class="aioseop_wrapper aioseop_checkbox_type" id="aiosp_disable_analytics_wrapper" style="display: none;">
										<div class="aioseop_input">
											<span class="aioseop_option_label" style="text-align:right;vertical-align:top;"><a tabindex="0" class="aioseop_help_text_link" style=";" title="<h4 aria-hidden>Disable Google Analytics:</h4> Disable Google Analytics on this page.<br /><br /><a href=&quot;https://semperplugins.com/documentation/post-settings/#disable-google-analytics&quot; target=&quot;_blank&quot;>Click here for documentation on this setting.</a>"></a><label class="aioseop_label textinput">Disable Google Analytics</label></span>
											<div class="aioseop_option_input">
												<div class="aioseop_option_div"><input name="aiosp_disable_analytics" type="checkbox" disabled="disabled">
												</div>
											</div>
											<p style="clear:left"></p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>' .
		self::get_taxonomies_upsell_modal_markup( $page_id, $is_woocommerce_page ) . '</div>';
	}

	public static function hide_notices() {
		if ( 'all-in-one-seo_page_aioseop-about' !== get_current_screen()->id ) {
			return;
		}

		remove_all_actions('admin_notices');
		remove_all_actions('all_admin_notices');
	}
}
