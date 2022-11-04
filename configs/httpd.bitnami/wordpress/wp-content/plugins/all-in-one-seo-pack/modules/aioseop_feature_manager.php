<?php
/**
 * The Feature Manager class.
 *
 * @package All_in_One_SEO_Pack
 * @since ?
 */

if ( ! class_exists( 'All_in_One_SEO_Pack_Feature_Manager' ) ) {

	/**
	 * Class All_in_One_SEO_Pack_Feature_Manager
	 */
	class All_in_One_SEO_Pack_Feature_Manager extends All_in_One_SEO_Pack_Module {

		/**
		 * Module Info
		 *
		 * @since ?
		 *
		 * @var array|mixed|void $module_info
		 */
		protected $module_info = array();

		/**
		 * All_in_One_SEO_Pack_Feature_Manager constructor.
		 *
		 * @since   ?
		 * @since   3.4.0   Added Image SEO module.
		 *
		 * @param   $mod    The module.
		 */
		function __construct( $mod ) {
			/* translators: the Feature Manager allows users to (de)activate other modules of the plugin. */
			$this->name   = __( 'Feature Manager', 'all-in-one-seo-pack' );        // Human-readable name of the plugin.
			$this->prefix = 'aiosp_feature_manager_';                        // Option prefix.
			$this->file   = __FILE__;                                    // The current file.
			parent::__construct();
			$this->module_info = array(
				'sitemap'           => array(
					/* translators: the XML Sitemaps module allows users to generate a sitemap in .xml format for their website and submit it to search engines such as Google, Bing and Yahoo. */
					'name'         => __( 'XML Sitemaps', 'all-in-one-seo-pack' ),
					'description'  => __( 'Create and manage your XML Sitemaps using this feature and submit your XML Sitemap to Google, Bing/Yahoo and Ask.com.', 'all-in-one-seo-pack' ),
					'default'      => 'on',
					'can_activate' => true,
				),
				'opengraph'         => array(
					/* translators: the Social Meta module allows users to add Open Graph (OG:) meta tags to their site's post/pages to control the appearance of them when shared on social media networks like Facebook and Twitter. */
					'name'         => __( 'Social Meta', 'all-in-one-seo-pack' ),
					/* translators: Social Meta refers to Open Graph (OG:) meta tags, which can be used to control the appearance of a site's posts/pages when shared on social media networks like Facebook and Twitter. */
					'description'  => __( 'Add Social Meta data to your site to deliver closer integration between your website and social media.', 'all-in-one-seo-pack' ),
					'can_activate' => true,
				),
				'robots'            => array(
					/* translators: the Robots.txt module allows users to provide instructions to web robots, e.g. search engine crawlers. */
					'name'         => __( 'Robots.txt', 'all-in-one-seo-pack' ),
					'description'  => __( 'Generate and validate your robots.txt file to guide search engines through your site.', 'all-in-one-seo-pack' ),
					'can_activate' => true,
				),
				'file_editor'       => array(
					/* translators: the File Editor module allows users to edit the robots.txt file or .htaccess file on their site. */
					'name'         => __( 'File Editor', 'all-in-one-seo-pack' ),
					'description'  => __( 'Edit your .htaccess file to fine-tune your site.', 'all-in-one-seo-pack' ),
					'can_activate' => true,
				),
				'importer_exporter' => array(
					/* translators: the Importer & Exporter module allows users to import/export their All in One SEO Pack settings for backup purposes or when migrating their site. */
					'name'         => __( 'Importer & Exporter', 'all-in-one-seo-pack' ),
					/* translators: %s is a placeholder, which means that it should not be translated. It will be replaced with the name of the plugin, All in One SEO Pack. */
					'description'  => sprintf( __( 'Exports and imports your %s plugin settings.', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME ),
					'can_activate' => true,
				),
				'bad_robots'        => array(
					/* translators: the Bad Bot Blocker module allows users to block requests from user agents that are known to misbehave. */
					'name'         => __( 'Bad Bot Blocker', 'all-in-one-seo-pack' ),
					/* translators: 'bots' refers to user agents/web robots that misbehave. */
					'description'  => __( 'Stop badly behaving bots from slowing down your website.', 'all-in-one-seo-pack' ),
					'can_activate' => true,
				),
				'performance'       => array(
					/* translators: the Performance module allows users to set certain performance related settings and check the status of their WordPress installation. */
					'name'         => __( 'Performance', 'all-in-one-seo-pack' ),
					'description'  => __( 'Optimize performance related to SEO and check your system status.', 'all-in-one-seo-pack' ),
					'default'      => 'on',
					'can_activate' => true,
				),
				'video_sitemap'     => array(
					/* translators: The Video Sitemap module allows users to generate a sitemap with video content in .xml format for their website and submit it to search engines such as Google, Bing and Yahoo. */
					'name'           => __( 'Video Sitemap', 'all-in-one-seo-pack' ),
					'description'    => __( 'Create and manage your Video Sitemap using this feature and submit your Video Sitemap to Google, Bing/Yahoo and Ask.com.', 'all-in-one-seo-pack' ),
					'is_pro_feature' => true,
					'can_activate'   => AIOSEOPPRO,
				),
				'schema_local_business' => array(
					'name'           => __( 'Local Business SEO', 'all-in-one-seo-pack' ),
					'description'    => sprintf(
						__( 'Tell Google more about your business and increase your click-through rate using Local Business structured data %s.', 'all-in-one-seo-pack' ),
						sprintf( '<strong>%s</strong>', __( '(Business & Agency plans only)', 'all-in-one-seo-pack' ) )
					),
					'is_pro_feature' => true,
					'can_activate'   => false,
				),
				'image_seo'         => array(
					'name'           => __( 'Image SEO', 'all-in-one-seo-pack' ),
					'description'    => sprintf(
						__( 'Manage the SEO for your images by controlling their title & alt tag attributes %s.', 'all-in-one-seo-pack' ),
						sprintf( '<strong>%s</strong>', __( '(Business & Agency plans only)', 'all-in-one-seo-pack' ) )
					),
					'is_pro_feature' => true,
					'can_activate'   => false,
				),
			);

			if ( AIOSEOPPRO ) {
				global $aioseop_options;

				if ( isset( $aioseop_options['addons'] ) &&
					is_array( $aioseop_options['addons'] )
				) {
					foreach ( $aioseop_options['addons'] as $addon ) {
						if ( ! array_key_exists( $addon, $this->module_info ) ) {
							continue;
						}

						$this->module_info[ $addon ]['can_activate'] = true;
					}
				}
			}

			// Set up default settings fields.
			// Name         - Human-readable name of the setting.
			// Help_text    - Inline documentation for the setting.
			// Type         - Type of field; this defaults to checkbox; currently supported types are checkbox, text, select, multiselect.
			// Default      - Default value of the field.
			// Initial_options - Initial option list used for selects and multiselects.
			// Other supported options: class, id, style -- allows you to set these HTML attributes on the field.
			$this->default_options = array();
			$this->module_info     = apply_filters( 'aioseop_module_info', $this->module_info );

			foreach ( $mod as $m ) {
				if ( 'performance' === $m && ! is_super_admin() ) {
					continue;
				}
				$this->default_options[ "enable_$m" ] = array(
					'name'           => $this->module_info[ $m ]['name'],
					'help_text'      => $this->module_info[ $m ]['description'],
					'type'           => 'custom',
					'class'          => 'aioseop_feature',
					'id'             => "aioseop_$m",
					'can_activate'   => true,
					'is_pro_feature' => isset( $this->module_info[ $m ]['is_pro_feature'] ) ? $this->module_info[ $m ]['is_pro_feature'] : false,
				);

				if ( ! empty( $this->module_info[ $m ]['image'] ) ) {
					$this->default_options[ "enable_$m" ]['image'] = $this->module_info[ $m ]['image'];
				}
				if ( ! empty( $this->module_info[ $m ] ) ) {
					foreach ( array( 'can_activate', 'default' ) as $option ) {
						if ( isset( $this->module_info[ $m ][ $option ] ) ) {
							$this->default_options[ "enable_$m" ][ $option ] = $this->module_info[ $m ][ $option ];
						}
					}
				}
			}
			$this->layout = array(
				'default' => array(
					'name'      => $this->name,
					'help_link' => 'https://semperplugins.com/documentation/feature-manager/',
					'options'   => array_keys( $this->default_options ),
				),
			);
			// Load initial options / set defaults.
			$this->update_options();
			if ( is_admin() ) {
				add_filter( $this->prefix . 'output_option', array( $this, 'get_feature_module_box' ), 10, 2 );
				add_filter( $this->prefix . 'submit_options', array( $this, 'filter_submit' ) );
			}
		}

		/**
		 * Menu Order
		 *
		 * Determines the menu order.
		 *
		 * @since ?
		 *
		 * @return int
		 */
		function menu_order() {
			return 20;
		}

		/**
		 * Filter Submit
		 *
		 * @since ?
		 *
		 * @param $submit
		 * @return mixed
		 */
		function filter_submit( $submit ) {
			$submit['Submit']['value']  = __( 'Update Features', 'all-in-one-seo-pack' ) . ' &raquo;';
			$submit['Submit']['class'] .= ' hidden';
			/* translators: this button deactivates all active modules of the plugin. */
			$submit['Submit_Default']['value'] = __( 'Reset Features', 'all-in-one-seo-pack' ) . ' &raquo;';

			return $submit;
		}

		/**
		 * Generates a module box for the Feature Manager screen.
		 *
		 * @since   ?
		 * @since   3.4.0   Minor refactoring. Renamed function to better reflect purpose.
		 *
		 * @param           $buf
		 * @param   array   $args
		 *
		 * @return  string
		 */
		function get_feature_module_box( $buf, $args ) {
			$name     = '';
			$img      = '';
			$desc     = '';
			$checkbox = '';
			$class    = '';

			if ( isset( $args['options']['help_text'] ) && ! empty( $args['options']['help_text'] ) ) {
				$desc .= '<p class="aioseop_desc">' . $args['options']['help_text'] . '</p>';
			}

			if ( $args['value'] ) {
				$class = ' active';
			}

			if ( isset( $args['options']['image'] ) && ! empty( $args['options']['image'] ) ) {
				$img .= '<p><img src="' . AIOSEOP_PLUGIN_IMAGES_URL . $args['options']['image'] . '"></p>';
			} else {
				$img .= '<p><span class="aioseop_featured_image' . $class . '"></span></p>';
			}

			$name = "<h3>{$args['options']['name']}</h3>";
			if ( $args['options']['can_activate'] ) {
				$name      = "<h3>{$args['options']['name']}</h3>";
				$checkbox .= '<input type="checkbox" onchange="jQuery(\'#' . $args['options']['id'] . ' .aioseop_featured_image, #' . $args['options']['id'] . ' .feature_button\').toggleClass(\'active\', this.checked);jQuery(\'input[name=Submit]\').trigger(\'click\');" style="display:none;" id="' . $args['name'] . '" name="' . $args['name'] . '"';
				if ( $args['value'] ) {
					$checkbox .= ' CHECKED';
				}
				$checkbox .= '><span class="button-primary feature_button' . $class . '"></span>';
			} else {
				$content  = urlencode( $args['options']['name'] );
				$checkbox = "<a class='button feature-manager-cta-button' href='" . aioseop_get_utm_url( 'feature-manager' ) . "&utm_content=$content" . "' target='_blank'>Upgrade</a>";
			}

			if ( ! empty( $args['options']['id'] ) ) {
				$args['attr'] .= " id='{$args['options']['id']}'";
			}

			$flag = $args['options']['is_pro_feature'] ? "<div class='pro flag'>PRO</div>" : "<div class='free flag'>FREE</div>";

			return sprintf( '%s%s%s%s', $buf, "<div {$args['attr']}><label for='{$args['name']}'>", $flag, "{$name}{$img}{$desc}{$checkbox}</label></div>" );
		}
	}
}
