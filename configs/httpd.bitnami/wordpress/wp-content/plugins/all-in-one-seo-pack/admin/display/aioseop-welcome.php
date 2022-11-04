<?php

if ( ! class_exists( 'AIOSEOP_Welcome' ) ) {

	/**
	 * Handles the Welcome page.
	 *
	 * @since 3.6.0
	 */
	class AIOSEOP_Welcome {

		/**
		 * Registers our hooks.
		 *
		 * @since 3.6.0
		 *
		 * @return void
		 */
		public static function hooks() {
			if ( AIOSEOPPRO ) {
				return;
			}
			add_action( 'admin_menu', array( 'AIOSEOP_Welcome', 'registerPage' ) );
			add_action( 'admin_enqueue_scripts', array( 'AIOSEOP_Welcome', 'loadAssets' ) );
		}

		/**
		 * Registers our the Welcome page and removes it from our menu.
		 *
		 * @since 3.6.0
		 *
		 * @return void
		 */
		public static function registerPage() {
			/* translators: %s is a placeholder, which means that it should not be translated. It will be replaced with the name of the plugin, All in One SEO Pack. */
			$welcome_text = sprintf( __( 'Welcome to %s', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME );
			add_dashboard_page(
				$welcome_text,
				$welcome_text,
				'manage_options',
				'aioseop-welcome',
				array( 'AIOSEOP_Welcome', 'output' )
			);
			remove_submenu_page( 'index.php', 'aioseop-welcome' );
		}

		/**
		 * Loads the required assets for the welcome page.
		 *
		 * @since 3.6.0
		 *
		 * @param  string $page The page ID.
		 * @return void
		 */
		public static function loadAssets( $page ) {
			if ( 'dashboard_page_aioseop-welcome' === $page ) {
				wp_enqueue_style( 'aioseop-welcome', AIOSEOP_PLUGIN_URL . 'css/aioseop-welcome.css', array(), AIOSEOP_VERSION );
				if ( function_exists( 'is_rtl' ) && is_rtl() ) {
					wp_enqueue_style( 'aioseop-welcome-rtl', AIOSEOP_PLUGIN_URL . 'css/aioseop-welcome-rtl.css', array( 'aioseop-welcome' ), AIOSEOP_VERSION );
				}
			}
		}

		/**
		 * Shows the Welcome page if all conditions are met.
		 *
		 * @since 3.6.0
		 *
		 * @return void
		 */
		public function showPage() {
			if (
				AIOSEOPPRO ||
				! is_admin() ||
				is_network_admin() ||
				isset( $_GET['activate-multi'] ) ||
				! current_user_can( 'manage_options' )
			) {
				return;
			}

			delete_transient( '_aioseop_activation_redirect' );

			// Compare major versions so we don't show the welcome screen for minor versions.
			$lastSeenVersion = get_user_meta( get_current_user_id(), 'aioseop_seen_about_page', true );
			if (
				$lastSeenVersion &&
				( get_major_version( AIOSEOP_VERSION ) === get_major_version( $lastSeenVersion ) )
			) {
				return;
			}

			wp_safe_redirect(
				add_query_arg(
					array( 'page' => 'aioseop-welcome' ), admin_url( 'index.php' )
				)
			);
			exit;
		}

		/**
		 * Outputs the Welcome page.
		 *
		 * @since 3.6.0
		 *
		 * @return void
		 */
		public static function output() {
			// Update user meta once page has been shown.
			update_user_meta( get_current_user_id(), 'aioseop_seen_about_page', AIOSEOP_VERSION );
			?>

			<div class="wrap about-wrap">
			<div class="aioseop-welcome-logo">
					<?php echo aioseop_get_logo( 180, 180, '#44619A' ); ?>
				</div>
				<h1>
					<?php
					/* translators: %1$s and %2$s are placeholders, which means that these should not be translated. These will be replaced with the name of the plugin, All in One SEO Pack, and the current version number. */
					printf( esc_html__( 'Welcome to %1$s %2$s', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME, AIOSEOP_VERSION );
					?>
				</h1>
				<div class="about-text">
					<?php
					/* translators: %1$s and %2$s are placeholders, which means that these should not be translated. These will be replaced with the name of the plugin, All in One SEO Pack, and the current version number. */
					printf( esc_html__( '%1$s %2$s contains new features, bug fixes, increased security, and tons of under the hood performance improvements.', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME, AIOSEOP_VERSION );
					?>
				</div>

				<h2 class="nav-tab-wrapper">
					<a
						class="nav-tab nav-tab-active" id="aioseop-welcome"
						href="<?php echo esc_url( admin_url( add_query_arg( array( 'page' => 'aioseop-welcome' ), 'index.php' ) ) ); ?>">
						<?php esc_html_e( 'What&#8217;s New', 'all-in-one-seo-pack' ); ?>
					</a>
				</h2>

				<div id='sections'>
					<section><?php include_once( AIOSEOP_PLUGIN_DIR . 'admin/display/welcome-content.php' ); ?></section>
				</div>

			</div>
			<?php
		}
	}
}
