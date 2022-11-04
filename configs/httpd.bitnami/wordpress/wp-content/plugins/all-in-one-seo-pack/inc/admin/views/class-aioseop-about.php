<?php
/**
 * AIOSEOP_About
 *
 * @package All_in_One_SEO_Pack
 * @since 3.4.0
 */

/**
 * Handles the About Us page.
 *
 * @since 3.4.0
 */
class AIOSEOP_About {

	/**
	 * The current view.
	 *
	 * @var string
	 */
	private static $view;

	/**
	 * Initializes the code.
	 *
	 * @since   3.4.0
	 */
	public static function init() {
		if ( ! is_admin() ||
			! get_current_screen()->id === aioseop_get_admin_screens()
		) {
			return;
		}

		self::$view = 'about';
		if ( isset( $_GET['view'] ) ) {
			self::$view = $_GET['view'];
		}

		self::enqueue_files();
		self::render_page();
	}

	/**
	 * Enqueues the required files.
	 *
	 * @since   3.4.0
	 */
	private static function enqueue_files() {
		wp_enqueue_style(
			'aioseop-about',
			AIOSEOP_PLUGIN_URL . 'css/admin/aioseop-about.css',
			array(),
			AIOSEOP_VERSION
		);

		if ( 'about' !== self::$view ) {
			return;
		}

		wp_enqueue_script(
			'jquery-matchheight',
			AIOSEOP_PLUGIN_URL . 'js/dependencies/jquery.matchHeight-min.js',
			array( 'jquery' ),
			'0.7.0',
			false
		);

		wp_enqueue_script( 'aioseop-about', AIOSEOP_PLUGIN_URL . 'js/admin/aioseop-about.js', array( 'jquery' ), AIOSEOP_VERSION, false );

			$ajax_data = array(
				'requestUrl'  => admin_url( 'admin-ajax.php' ),
				'nonce'       => wp_create_nonce( 'aioseop-am-plugins' ),
				'aioseopL10n' => array(
					'active'            => __( 'Active', 'all-in-one-seo-pack' ),
					'inactive'          => __( 'Inactive', 'all-in-one-seo-pack' ),
					'activated'         => __( 'Activated', 'all-in-one-seo-pack' ),
					'install'           => __( 'Install Plugin', 'all-in-one-seo-pack' ),
					'activate'          => __( 'Activate', 'all-in-one-seo-pack' ),
					'install_failed'    => __( 'Installation Failed', 'all-in-one-seo-pack' ),
					'activation_failed' => __( 'Activation Failed', 'all-in-one-seo-pack' ),
					'wait'              => __( 'Please wait...', 'all-in-one-seo-pack' ),
				),
			);

			wp_localize_script( 'aioseop-about', 'aioseopAboutData', $ajax_data );
	}

	private static function require_files() {
		require_once AIOSEOP_PLUGIN_DIR . 'inc/admin/helpers/class-install-skin.php';
		require_once AIOSEOP_PLUGIN_DIR . 'inc/admin/helpers/PluginSilentUpgraderSkin.php';
		require_once AIOSEOP_PLUGIN_DIR . 'inc/admin/helpers/PluginSilentUpgrader.php';
	}

	/**
	 * Installs a given plugin.
	 *
	 * Acts as a callback for our "wp_ajax_aioseop_install_plugin" endpoint.
	 *
	 * @since   3.4.0
	 */
	public static function install_plugin() {
		check_ajax_referer( 'aioseop-am-plugins', '_ajax_nonce' );

		if ( ! current_user_can( 'administrator' ) ) {
			wp_send_json_error();
		}

		if ( empty( $_POST['plugin'] ) ) {
			wp_send_json_error();
		}

		$url = esc_url_raw(
			add_query_arg(
				array(
					'page' => 'aioseop-addons',
				),
				admin_url( 'admin.php' )
			)
		);

		$creds = request_filesystem_credentials( $url, '', false, false, null );

		// Check for file system permissions.
		if ( false === $creds ) {
			wp_send_json_error();
		}

		if ( ! WP_Filesystem( $creds ) ) {
			wp_send_json_error();
		}

		self::require_files();

		// Do not allow WordPress to search for translations as this will break JS output.
		remove_action( 'upgrader_process_complete', array( 'Language_Pack_Upgrader', 'async_upgrade' ), 20 );

		// Create the plugin upgrader with our custom skin.
		$installer = new PluginSilentUpgrader( new AIOSEOP_Install_Skin() );

		if ( ! method_exists( $installer, 'install' ) || empty( $_POST['plugin'] ) ) {
			wp_send_json_error();
		}

		$installer->install( $_POST['plugin'] );

		// Flush the cache and return the installed plugin's basename.
		wp_cache_flush();

		$plugin_basename = $installer->plugin_info();

		if ( $plugin_basename ) {

			$activated = activate_plugin( $plugin_basename );

			if ( ! is_wp_error( $activated ) ) {
				wp_send_json_success(
					array(
						'msg'          => __( 'Plugin installed & activated.', 'all-in-one-seo-pack' ),
						'is_activated' => true,
						'basename'     => $plugin_basename,
					)
				);
			} else {
				wp_send_json_success(
					array(
						'msg'          => __( 'Plugin installed.', 'all-in-one-seo-pack' ),
						'is_activated' => false,
						'basename'     => $plugin_basename,
					)
				);
			}
		}

		wp_send_json_error();
	}

	/**
	 * Activates a given plugin.
	 *
	 * Acts as a callback for our "wp_ajax_aioseop_activate_plugin" endpoint.
	 *
	 * @since   3.4.0
	 */
	public static function activate_plugin() {

		check_ajax_referer( 'aioseop-am-plugins', '_ajax_nonce' );

		if ( ! current_user_can( 'administrator' ) ) {
			wp_send_json_error();
		}

		if ( isset( $_POST['plugin'] ) ) {

			$activate = activate_plugins( $_POST['plugin'] );

			if ( ! is_wp_error( $activate ) ) {
				wp_send_json_success(
					array(
						'msg' => __( 'Plugin activated.', 'all-in-one-seo-pack' ),
					)
				);
			}
		}
	}

	/**
	 * Renders a given view on the About Us page.
	 *
	 * @since   3.4.0
	 */
	private static function render_page() {
		echo '<div id="aioseop-admin-about" class="wrap aioseop-admin-wrap">';

		switch ( self::$view ) {
			case 'about': {
				self::output_tab_bar();
				self::output_about_info();
				self::output_about_addons();
				break;
			}
			case 'versus': {
				self::output_tab_bar();
				self::output_versus_grid();
				break;
			}
			default:
				break;
		}

		echo '</div>';

	}

	/**
	 * Outputs the tab bar.
	 *
	 * @since   3.4.0
	 */
	private static function output_tab_bar() {
		$views = array(
			'About Us' => 'about',
		);

		if ( ! AIOSEOPPRO ) {
			$views['Lite vs Pro'] = 'versus';
		}

		if ( 1 >= count( $views ) ) {
			return;
		}

		echo '<ul class="aioseop-admin-tabs">';
		foreach ( $views as $label => $view ) {
			echo '<li>';
			printf(
				'<a href="%s" class="%s">%s</a>',
				esc_url( admin_url( 'admin.php?page=aioseop-about&view=' . $view ) ),
				( $view === self::$view ) ? 'active' : '',
				esc_html( $label )
			);
			echo '</li>';
		}
		echo '</ul>';
	}

	/**
	 * Outputs the About Us info section.
	 *
	 * @since   3.4.0
	 */
	private static function output_about_info() {

		?>

		<div class="aioseop-admin-about-section aioseop-admin-columns">

			<div class="aioseop-admin-column-60">
				<h3>
					<?php
					printf(
						/* translators: %1$s: "All in One SEO Pack" */
						__( 'Welcome to %1$s, the original SEO plugin for WordPress. At %2$s, we build software that helps you rank your website in search results and gain organic traffic.', 'all-in-one-seo-pack' ),
						AIOSEOP_PLUGIN_NAME,
						AIOSEOP_PLUGIN_NAME
					);
					?>
				</h3>

				<p>
					<?php esc_html_e( 'Over the years, we found that most other WordPress SEO plugins were bloated, buggy, slow, and very hard to use. So we designed our plugin as an easy and powerful tool.', 'all-in-one-seo-pack' ); ?>
				</p>
				<p>
					<?php esc_html_e( 'Our goal is to take the pain out of optimizing your website for search engines.', 'all-in-one-seo-pack' ); ?>
				</p>
				<p>
					<?php
					printf(
						wp_kses(
							/* translators: %1$s: "All in One SEO Pack" - %2$s: hyperlink - %3$s: hyperlink - %4$s: hyperlink */
							__( '%1$s is brought to you by Awesome Motive, the same team that’s behind the largest WordPress resource site, <a href="%2$s" target="_blank" rel="noopener noreferrer">WPBeginner</a>, the most popular lead-generation software, <a href="%3$s" target="_blank" rel="noopener noreferrer">OptinMonster</a>, the best WordPress analytics plugin, <a href="%4$s" target="_blank" rel="noopener noreferrer">MonsterInsights</a> and many more.', 'all-in-one-seo-pack' ),
							array(
								'a' => array(
									'href'   => array(),
									'rel'    => array(),
									'target' => array(),
								),
							)
						),
						AIOSEOP_PLUGIN_NAME,
						'https://www.wpbeginner.com/?utm_source=WordPress&utm_medium=aioseop&utm_campaign=aioseop-about',
						'https://optinmonster.com/?utm_source=WordPress&utm_medium=aioseop&utm_campaign=aioseop-about',
						'https://www.monsterinsights.com/?utm_source=WordPress&utm_medium=aioseop&utm_campaign=aioseop-about'
					);
					?>
				</p>
				<p>
					<?php esc_html_e( 'Yup, we know a thing or two about building awesome products that customers love.', 'all-in-one-seo-pack' ); ?>
				</p>
			</div>

			<div class="aioseop-admin-column-40 aioseop-admin-column-last">
				<figure>
					<img src="<?php echo AIOSEOP_PLUGIN_URL; ?>images/about/about-team.jpg" alt="<?php esc_attr_e( 'The Awesome Motive Team photo', 'all-in-one-seo-pack' ); ?>">
					<figcaption>
						<?php esc_html_e( 'The Awesome Motive Team', 'all-in-one-seo-pack' ); ?><br>
					</figcaption>
				</figure>
			</div>

		</div>
		<?php
	}

	/**
	 * Outputs the About Us addon section.
	 *
	 * @since   3.4.0
	 */
	private static function output_about_addons() {
		$all_plugins = get_plugins();
		$am_plugins  = self::get_am_plugins();

		?>
		<div id="aioseop-admin-addons">
			<div class="addons-container">
				<?php
				foreach ( $am_plugins as $plugin => $details ) :

					$plugin_data = self::get_plugin_data( $plugin, $details, $all_plugins );

					?>
					<div class="addon-container">
						<div class="addon-item">
							<div class="details aioseop-clear">
								<img src="<?php echo esc_url( $plugin_data['details']['icon'] ); ?>">
								<h5 class="addon-name">
									<?php echo esc_html( $plugin_data['details']['name'] ); ?>
								</h5>
								<p class="addon-desc">
									<?php echo wp_kses_post( $plugin_data['details']['desc'] ); ?>
								</p>
							</div>
							<div class="actions aioseop-clear">
								<div class="status">
									<strong>
										<?php
										printf(
											esc_html__( 'Status: %s', 'all-in-one-seo-pack' ),
											'<span class="status-label ' . esc_attr( $plugin_data['status_class'] ) . '">' . wp_kses_post( $plugin_data['status_text'] ) . '</span>'
										);
										?>
									</strong>
								</div>
								<div class="action-button">
									<button class="<?php echo esc_attr( $plugin_data['action_class'] ); ?>" data-plugin="<?php echo esc_attr( $plugin_data['plugin_src'] ); ?>" data-type="plugin">
										<?php echo wp_kses_post( $plugin_data['action_text'] ); ?>
									</button>
								</div>
							</div>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
	}

	/**
	 * Outputs the Lite vs Pro tab content.
	 *
	 * @since   3.4.0
	 */
	private static function output_versus_grid() {
		$license      = 'Lite';
		$next_license = 'Pro';

		$license_features = array(
			'seo'                => esc_html__( 'Search Engine Optimization (SEO)', 'all-in-one-seo-pack' ),
			'open_graph'         => esc_html__( 'Social Meta (Open Graph Markup)', 'all-in-one-seo-pack' ),
			'woocommerce'        => esc_html__( 'WooCommerce Integration', 'all-in-one-seo-pack' ),
			'xml_sitemap'        => esc_html__( 'XML Sitemap', 'all-in-one-seo-pack' ),
			'video_sitemap'      => esc_html__( 'Video XML Sitemap', 'all-in-one-seo-pack' ),
			'news_sitemap'       => esc_html__( 'News Sitemap', 'all-in-one-seo-pack' ),
			'google_tag_manager' => esc_html__( 'Google Tag Manager', 'all-in-one-seo-pack' ),
			'image_seo'          => esc_html__( 'Image SEO', 'all-in-one-seo-pack' ),
			'schema'             => esc_html__( 'Schema Rich Snippets', 'all-in-one-seo-pack' ),
			'support'            => esc_html__( 'Customer Support', 'all-in-one-seo-pack' ),
		);

		?>

		<div class="aioseop-admin-about-section aioseop-admin-about-section-squashed">
			<h1 class="centered">
				<strong><?php echo esc_html( ucfirst( $license ) ); ?></strong> vs <strong><?php echo esc_html( $next_license ); ?></strong>
			</h1>

			<p class="centered">
				<?php
					/* translators: %s: "All in One SEO Pack" */
					printf( __( 'Get the most out of %s by upgrading to Pro and unlocking all of the powerful features.', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME );
				?>
			</p>
		</div>

		<div class="aioseop-admin-about-section aioseop-admin-about-section-squashed aioseop-admin-about-section-hero aioseop-admin-about-section-table">

			<div class="aioseop-admin-about-section-hero-main aioseop-admin-columns">
				<div class="aioseop-admin-column-33">
					<h3 class="no-margin">
						<?php esc_html_e( 'Feature', 'all-in-one-seo-pack' ); ?>
					</h3>
				</div>
				<div class="aioseop-admin-column-33">
					<h3 class="no-margin">
						<?php echo esc_html( ucfirst( $license ) ); ?>
					</h3>
				</div>
				<div class="aioseop-admin-column-33">
					<h3 class="no-margin">
						<?php echo esc_html( $next_license ); ?>
					</h3>
				</div>
			</div>
			<div class="aioseop-admin-about-section-hero-extra no-padding aioseop-admin-columns">

				<table>
					<?php
					foreach ( $license_features as $slug => $name ) {
						$current = self::get_license_data( $slug, $license );
						$next    = self::get_license_data( $slug, strtolower( $next_license ) );

						if ( empty( $current ) || empty( $next ) ) {
							continue;
						}
						?>
						<tr class="aioseop-admin-columns">
							<td class="aioseop-admin-column-33">
								<p><?php echo esc_html( $name ); ?></p>
							</td>
							<td class="aioseop-admin-column-33">
								<?php if ( is_array( $current ) ) : ?>
									<p class="features-<?php echo esc_attr( $current['status'] ); ?>">
										<?php echo wp_kses_post( implode( '<br>', $current['text'] ) ); ?>
									</p>
								<?php endif; ?>
							</td>
							<td class="aioseop-admin-column-33">
								<?php if ( is_array( $current ) ) : ?>
									<p class="features-full">
										<?php echo wp_kses_post( implode( '<br>', $next['text'] ) ); ?>
									</p>
								<?php endif; ?>
							</td>
						</tr>
						<?php
					}
					?>
				</table>

			</div>

		</div>

		<div class="aioseop-admin-about-section aioseop-admin-about-section-hero">
			<div class="aioseop-admin-about-section-hero-main no-border">
				<h3 class="call-to-action centered">
					<?php
						echo '<a href="' . aioseop_get_utm_url( 'lite-vs-pro' ) . '" target="_blank" rel="noopener noreferrer">';

						printf(
							/* translators: %s: "All in One SEO Pack Pro" */
							sprintf( __( 'Get %s Today and Unlock all the Powerful Features', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME . '&nbsp;Pro' ),
							esc_html( $next_license )
						);
					?>
					</a>
				</h3>

				<p class="centered">
					<?php
					echo wp_kses(
						sprintf(
							/* translators: %s: "All in One SEO Pack Lite" */
							__( 'Bonus: %s users get <span class="price-20-off">30%% off regular price</span>, automatically applied at checkout.', 'all-in-one-seo-pack' ),
							AIOSEOP_PLUGIN_NAME . '&nbsp;Lite'
						),
						array(
							'span' => array(
								'class' => array(),
							),
						)
					);
					?>
				</p>
			</div>
		</div>

		<?php
	}

	private static function get_license_data( $feature, $license ) {

		$license = strtolower( $license );

		$data = array(
			'seo'                => array(
				'lite' => array(
					'status' => 'partial',
					'text'   => array(
						'<strong>' . esc_html__( 'Limited Support', 'all-in-one-seo-pack' ) . '</strong>',
						esc_html__( 'Posts, Pages and Custom Post Types Only', 'all-in-one-seo-pack' ),
					),
				),
				'pro'  => array(
					'status' => 'full',
					'text'   => array(
						'<strong>' . esc_html__( 'Complete Support', 'all-in-one-seo-pack' ) . '</strong>',
						esc_html__( 'Posts, Pages, Custom Post Types + Categories, Tags and Custom Taxonomies', 'all-in-one-seo-pack' ),
					),
				),
			),
			'open_graph'         => array(
				'lite' => array(
					'status' => 'partial',
					'text'   => array(
						'<strong>' . esc_html__( 'Limited Support', 'all-in-one-seo-pack' ) . '</strong>',
						esc_html__( 'Posts, Pages and Custom Post Types Only', 'all-in-one-seo-pack' ),
					),
				),
				'pro'  => array(
					'status' => 'full',
					'text'   => array(
						'<strong>' . esc_html__( 'Complete Support', 'all-in-one-seo-pack' ) . '</strong>',
						esc_html__( 'Posts, Pages, Custom Post Types + Categories, Tags and Custom Taxonomies', 'all-in-one-seo-pack' ),
					),
				),
			),
			'woocommerce'        => array(
				'lite' => array(
					'status' => 'partial',
					'text'   => array(
						'<strong>' . esc_html__( 'Limited Support', 'all-in-one-seo-pack' ) . '</strong>',
						esc_html__( 'WooCommerce Products Only', 'all-in-one-seo-pack' ),
					),
				),
				'pro'  => array(
					'status' => 'full',
					'text'   => array(
						'<strong>' . esc_html__( 'Complete Support', 'all-in-one-seo-pack' ) . '</strong>',
						esc_html__( 'WooCommerce Products, Product Categories, Product Tags and Other Product Attributes', 'all-in-one-seo-pack' ),
					),
				),
			),
			'xml_sitemap'        => array(
				'lite' => array(
					'status' => 'partial',
					'text'   => array(
						'<strong>' . esc_html__( 'Limited Support', 'all-in-one-seo-pack' ) . '</strong>',
						esc_html__( 'Basic Control of Sitemap Priority & Frequency', 'all-in-one-seo-pack' ),
					),
				),
				'pro'  => array(
					'status' => 'full',
					'text'   => array(
						'<strong>' . esc_html__( 'Complete Support', 'all-in-one-seo-pack' ) . '</strong>',
						esc_html__( 'Granular Control of Sitemap Priority & Frequency for Each Post, Page, Category, Tag, etc.', 'all-in-one-seo-pack' ),
					),
				),
			),
			'video_sitemap'      => array(
				'lite' => array(
					'status' => 'none',
					'text'   => array(
						'<strong>' . esc_html__( 'Not Available', 'all-in-one-seo-pack' ) . '</strong>',
					),
				),
				'pro'  => array(
					'status' => 'full',
					'text'   => array(
						'<strong>' . esc_html__( 'Submit Your Videos to Search Engines', 'all-in-one-seo-pack' ) . '</strong>',
					),
				),
			),
			'news_sitemap'       => array(
				'lite' => array(
					'status' => 'none',
					'text'   => array(
						'<strong>' . esc_html__( 'Not Available', 'all-in-one-seo-pack' ) . '</strong>',
					),
				),
				'pro'  => array(
					'status' => 'full',
					'text'   => array(
						'<strong>' . esc_html__( 'Submit Your Latest News Stories to Google News (Business & Agency plans only)', 'all-in-one-seo-pack' ) . '</strong>',
					),
				),
			),
			'image_seo'          => array(
				'lite' => array(
					'status' => 'none',
					'text'   => array(
						'<strong>' . esc_html__( 'Not Available', 'all-in-one-seo-pack' ) . '</strong>',
					),
				),
				'pro'  => array(
					'status' => 'full',
					'text'   => array(
						'<strong>' . esc_html__( 'Control The Title & Alt Tag Attribute of Your Images (Business & Agency plans only)', 'all-in-one-seo-pack' ) . '</strong>',
					),
				),
			),
			'google_tag_manager' => array(
				'lite' => array(
					'status' => 'none',
					'text'   => array(
						'<strong>' . esc_html__( 'Not Available', 'all-in-one-seo-pack' ) . '</strong>',
					),
				),
				'pro'  => array(
					'status' => 'full',
					'text'   => array(
						'<strong>' . esc_html__( 'Connect to Google Tag Manager for Advanced Analytics', 'all-in-one-seo-pack' ) . '</strong>',
					),
				),
			),
			'schema'             => array(
				'lite' => array(
					'status' => 'partial',
					'text'   => array(
						'<strong>' . esc_html__( 'Limited Support', 'all-in-one-seo-pack' ) . '</strong>',
						esc_html__( 'Posts, Pages, Categories and Tags Only', 'all-in-one-seo-pack' ),
					),
				),
				'pro'  => array(
					'status' => 'full',
					'text'   => array(
						'<strong>' . esc_html__( 'Complete Support', 'all-in-one-seo-pack' ) . '</strong>',
						sprintf(
							'<ul><li>%1$s</li><li>%2$s</li><li>%3$s</li></ul>',
							esc_html__( 'Posts, Pages, Categories, Tags', 'all-in-one-seo-pack' ),
							esc_html__( 'Breadcrumb Navigation', 'all-in-one-seo-pack' ),
							sprintf(
								'%1$s <strong>%2$s</strong>',
								esc_html__( 'Local Business schema', 'all-in-one-seo-pack' ),
								esc_html__( '(Business & Agency plans only)', 'all-in-one-seo-pack' )
							)
						),
					),
				),
			),
			'support'            => array(
				'lite' => array(
					'status' => 'partial',
					'text'   => array(
						'<strong>' . esc_html__( 'Limited Support', 'all-in-one-seo-pack' ) . '</strong>',
					),
				),
				'pro'  => array(
					'status' => 'full',
					'text'   => array(
						'<strong>' . esc_html__( 'Priority Support', 'all-in-one-seo-pack' ) . '</strong>',
					),
				),
			),
		);

		if ( ! isset( $data[ $feature ] ) ) {
			return false;
		}

		if ( isset( $data[ $feature ][ $license ] ) ) {
			return $data[ $feature ][ $license ];
		}
	}

	/**
	 * Returns a list with all Awesome Motive plugins and their data.
	 *
	 * @since   3.4.0
	 *
	 * @return  array
	 */
	private static function get_am_plugins() {

		$images_url = AIOSEOP_PLUGIN_URL . 'images/about/';

		return array(

			'google-analytics-for-wordpress/googleanalytics.php' => array(
				'icon' => $images_url . 'plugin-mi.png',
				'name' => 'MonsterInsights',
				'desc' => esc_html__( 'MonsterInsights makes it “effortless” to properly connect your WordPress site with Google Analytics, so you can start making data-driven decisions to grow your business.', 'all-in-one-seo-pack' ),
				'url'  => 'https://downloads.wordpress.org/plugin/google-analytics-for-wordpress.zip',
				'pro'  => array(
					'plug' => 'google-analytics-premium/googleanalytics-premium.php',
					'icon' => $images_url . 'plugin-mi.png',
					'name' => 'MonsterInsights Pro',
					'desc' => esc_html__( 'MonsterInsights makes it “effortless” to properly connect your WordPress site with Google Analytics, so you can start making data-driven decisions to grow your business.', 'all-in-one-seo-pack' ),
					'url'  => 'https://www.monsterinsights.com/?utm_source=proplugin&utm_medium=pluginheader&utm_campaign=pluginurl&utm_content=7%2E0%2E0',
					'act'  => 'go-to-url',
				),
			),

			'optinmonster/optin-monster-wp-api.php' => array(
				'icon' => $images_url . 'plugin-om.png',
				'name' => 'OptinMonster',
				'desc' => esc_html__( 'Our high-converting optin forms like Exit-Intent® popups, Fullscreen Welcome Mats, and Scroll boxes help you dramatically boost conversions and get more email subscribers.', 'all-in-one-seo-pack' ),
				'url'  => 'https://downloads.wordpress.org/plugin/optinmonster.zip',
			),

			'wp-mail-smtp/wp_mail_smtp.php'         => array(
				'icon' => $images_url . 'plugin-smtp.png',
				'name' => 'WP Mail SMTP',
				'desc' => esc_html__( 'Make sure your website\'s emails reach the inbox. Our goal is to make email deliverability easy and reliable. Trusted by over 1 million websites.', 'all-in-one-seo-pack' ),
				'url'  => 'https://downloads.wordpress.org/plugin/wp-mail-smtp.zip',
				'pro'  => array(
					'plug' => 'wp-mail-smtp-pro/wp_mail_smtp.php',
					'icon' => $images_url . 'plugin-smtp.png',
					'name' => 'WP Mail SMTP Pro',
					'desc' => esc_html__( 'Make sure your website\'s emails reach the inbox. Our goal is to make email deliverability easy and reliable. Trusted by over 1 million websites.', 'all-in-one-seo-pack' ),
					'url'  => 'https://wpmailsmtp.com/pricing/',
					'act'  => 'go-to-url',
				),
			),

			'wpforms-lite/wpforms.php'              => array(
				'icon' => $images_url . 'plugin-wpforms.png',
				'name' => 'WPForms',
				'desc' => esc_html__( 'WPForms allows you to create beautiful contact forms for your site in minutes, not hours!', 'all-in-one-seo-pack' ),
				'url'  => 'https://downloads.wordpress.org/plugin/wpforms-lite.zip',
			),

			'rafflepress/rafflepress.php'           => array(
				'icon' => $images_url . 'plugin-rp.png',
				'name' => 'RafflePress',
				'desc' => esc_html__( 'Turn your visitors into brand ambassadors! Easily grow your email list, website traffic, and social media followers with powerful viral giveaways & contests.', 'all-in-one-seo-pack' ),
				'url'  => 'https://downloads.wordpress.org/plugin/rafflepress.zip',
				'pro'  => array(
					'plug' => 'rafflepress-pro/rafflepress-pro.php',
					'icon' => $images_url . 'plugin-rp.png',
					'name' => 'RafflePress Pro',
					'desc' => esc_html__( 'Turn your visitors into brand ambassadors! Easily grow your email list, website traffic, and social media followers with powerful viral giveaways & contests.', 'all-in-one-seo-pack' ),
					'url'  => 'https://rafflepress.com/pricing/',
					'act'  => 'go-to-url',
				),
			),
		);
	}

	/**
	 * Returns AM plugin data for the Addons section of the About Us tab.
	 *
	 * @since   3.4.0
	 *
	 * @param string $plugin      The plugin slug.
	 * @param array  $details     The details of the plugin.
	 * @param array  $all_plugins The list of all plugins.
	 *
	 * @return array
	 */
	private static function get_plugin_data( $plugin, $details, $all_plugins ) {

		$have_pro = ( ! empty( $details['pro'] ) && ! empty( $details['pro']['plug'] ) );
		$show_pro = false;

		$plugin_data = array();

		if ( $have_pro ) {
			if ( array_key_exists( $details['pro']['plug'], $all_plugins ) ) {
				if ( is_plugin_active( $details['pro']['plug'] ) ) {
					$show_pro = true;
				}
			}
			if ( $show_pro ) {
				$plugin  = $details['pro']['plug'];
				$details = $details['pro'];
			}
		}

		if ( array_key_exists( $plugin, $all_plugins ) ) {
			if ( is_plugin_active( $plugin ) ) {

				// Status text/status.
				$plugin_data['status_class'] = 'status-active';
				$plugin_data['status_text']  = esc_html__( 'Active', 'all-in-one-seo-pack' );

				// Button text/status.
				$plugin_data['action_class'] = $plugin_data['status_class'] . ' button button-secondary disabled';
				$plugin_data['action_text']  = esc_html__( 'Activated', 'all-in-one-seo-pack' );
				$plugin_data['plugin_src']   = esc_attr( $plugin );
			} else {

				// Status text/status.
				$plugin_data['status_class'] = 'status-inactive';
				$plugin_data['status_text']  = esc_html__( 'Inactive', 'all-in-one-seo-pack' );

				// Button text/status.
				$plugin_data['action_class'] = $plugin_data['status_class'] . ' button button-secondary';
				$plugin_data['action_text']  = esc_html__( 'Activate', 'all-in-one-seo-pack' );
				$plugin_data['plugin_src']   = esc_attr( $plugin );
			}
		} else {
			// Doesn't exist, install.
			// Status text/status.
			$plugin_data['status_class'] = 'status-download';
			if ( isset( $details['act'] ) && 'go-to-url' === $details['act'] ) {
				$plugin_data['status_class'] = 'status-go-to-url';
			}
			$plugin_data['status_text'] = esc_html__( 'Not Installed', 'all-in-one-seo-pack' );
			// Button text/status.
			$plugin_data['action_class'] = $plugin_data['status_class'] . ' button button-primary';
			$plugin_data['action_text']  = esc_html__( 'Install Plugin', 'all-in-one-seo-pack' );
			$plugin_data['plugin_src']   = esc_url( $details['url'] );
		}

		$plugin_data['details'] = $details;

		return $plugin_data;
	}
}
