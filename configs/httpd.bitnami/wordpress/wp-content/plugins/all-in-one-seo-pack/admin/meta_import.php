<?php
/**
 * Meta Import
 *
 * @package All_in_One_SEO_Pack
 * @since ?
 */

if ( class_exists( 'WPSEO_Import_Hooks' ) ) {

	/**
	 * Class WPSEO_Import_AIOSEO_Hooks
	 *
	 * @TODO Move this elsewhere.
	 */
	class WPSEO_Import_AIOSEO_Hooks extends WPSEO_Import_Hooks {

		/**
		 * Plugin File
		 *
		 * @since ?
		 *
		 * @var string $plugin_file
		 */
		protected $plugin_file = 'all-in-one-seo-pack/all_in_one_seo_pack.php';

		/**
		 * Deactivate Listener
		 *
		 * @since ?
		 *
		 * @var string $deactivation_listener
		 */
		protected $deactivation_listener = 'deactivate_aioseo';

		/**
		 * Show notice the old plugin is installed and offer to import its data.
		 */
		public function show_import_settings_notice() {

			$yoasturl = add_query_arg( array( '_wpnonce' => wp_create_nonce( 'wpseo-import' ) ), admin_url( 'admin.php?page=wpseo_tools&tool=import-export&import=1&importaioseo=1#top#import-seo' ) );
			$aiourl   = add_query_arg( array( '_wpnonce' => wp_create_nonce( 'aiosp-import' ) ), admin_url( 'tools.php?page=aiosp_import' ) );

			$aioseop_yst_detected_notice_dismissed = get_user_meta( get_current_user_id(), 'aioseop_yst_detected_notice_dismissed', true );

			if ( empty( $aioseop_yst_detected_notice_dismissed ) ) {

				/* translators: %1$s, %2$s and %3$s are placeholders, which means these shouldn't be translated. The first two placeholders are used to add a link to anchor text and the third is replaced with the name of the plugin, All in One SEO Pack. */
				echo '<div class="notice notice-warning row-title is-dismissible yst_notice"><p>', sprintf( esc_html__( 'The plugin Yoast SEO has been detected. Do you want to %1$simport its settings%2$s into %3$s', 'all-in-one-seo-pack' ), sprintf( '<a href="%s">', esc_url( $aiourl ) ), '</a>', AIOSEOP_PLUGIN_NAME ), '</p></div>';

			}
			// phpcs:disable WordPress.WP.I18n
			echo '<div class="error"><p>', sprintf( esc_html__( 'The plugin All-In-One-SEO has been detected. Do you want to %1$simport its settings%2$s?', 'wordpress-seo' ), sprintf( '<a href="%s">', esc_url( $yoasturl ) ), '</a>' ), '</p></div>';
			// phpcs:enable
		}

		public function show_deactivate_notice() {
			echo '<div class="updated"><p>', esc_html__( 'All in One SEO has been deactivated', 'all-in-one-seo-pack' ), '</p></div>';
		}
	}
} else {
	if ( is_admin() ) {
		add_action( 'init', 'mi_aioseop_yst_detected_notice_dismissed' );
	}
}

/**
 * Deletes the stored dismissal of the notice.
 *
 * This should only happen after reactivating after being deactivated.
 */
function mi_aioseop_yst_detected_notice_dismissed() {
	delete_user_meta( get_current_user_id(), 'aioseop_yst_detected_notice_dismissed' );
}

/**
 * Init for settings import class.
 *
 * At the moment we just register the admin menu page.
 */
function aiosp_seometa_settings_init() {
	global $_aiosp_seometa_admin_pagehook;

	// TODO Put this in with the rest of the import/export stuff.
	$_aiosp_seometa_admin_pagehook = add_submenu_page( 'tools.php', __( 'Import SEO Data', 'all-in-one-seo-pack' ), __( 'SEO Data Import', 'all-in-one-seo-pack' ), 'manage_options', 'aiosp_import', 'aiosp_seometa_admin' );
}
add_action( 'admin_menu', 'aiosp_seometa_settings_init' );


/**
 * Intercept POST data from the form submission.
 *
 * Use the intercepted data to convert values in the postmeta table from one platform to another and display feedback to the user about compatible conversion
 * elements and the conversion process.
 */
function aiosp_seometa_action() {

	if ( empty( $_REQUEST['_wpnonce'] ) ) {
		return;
	}

	if ( empty( $_REQUEST['platform_old'] ) ) {
		printf( '<div class="error"><p>%s</p></div>', __( 'Sorry, you can\'t do that. Please choose a platform and then click Analyze or Convert.', 'all-in-one-seo-pack' ) );

		return;
	}

	if ( 'All in One SEO Pack' === $_REQUEST['platform_old'] ) {
		printf( '<div class="error"><p>%s</p></div>', __( 'Sorry, you can\'t do that. Please choose a platform and then click Analyze or Convert.', 'all-in-one-seo-pack' ) );

		return;
	}

	check_admin_referer( 'aiosp_nonce' ); // Verify nonce. TODO We should make this better.

	if ( ! empty( $_REQUEST['analyze'] ) ) {

		printf( '<h3>%s</h3>', __( 'Analysis Results', 'all-in-one-seo-pack' ) );

		$response = aiosp_seometa_post_meta_analyze( $_REQUEST['platform_old'], 'All in One SEO Pack' );
		if ( is_wp_error( $response ) ) {
			printf( '<div class="error"><p>%s</p></div>', __( 'Sorry, something went wrong. Please try again', 'all-in-one-seo-pack' ) );

			return;
		}

		printf( __( '<p>Analyzing records in a %1$s to %2$s conversion&hellip;', 'all-in-one-seo-pack' ), esc_html( $_POST['platform_old'] ), 'All in One SEO Pack' );
		printf( '<p><b>%d</b> Compatible Records were identified</p>', $response->update );
		// phpcs:ignore Squiz.Commenting.InlineComment.InvalidEndChar
		// printf( '<p>%d Compatible Records will be ignored</p>', $response->ignore );
		printf( '<p><b>%s</b></p>', __( 'Compatible data:', 'all-in-one-seo-pack' ) );
		echo '<ol>';
		foreach ( (array) $response->elements as $element ) {
			printf( '<li>%s</li>', $element );
		}
		echo '</ol>';

		return;
	}

	printf( '<h3>%s</h3>', __( 'Conversion Results', 'all-in-one-seo-pack' ) );

	$result = aiosp_seometa_post_meta_convert( stripslashes( $_REQUEST['platform_old'] ), 'All in One SEO Pack' );
	if ( is_wp_error( $result ) ) {
		printf( '<p>%s</p>', __( 'Sorry, something went wrong. Please try again', 'all-in-one-seo-pack' ) );

		return;
	}

	printf( '<p><b>%d</b> Records were updated</p>', isset( $result->updated ) ? $result->updated : 0 );
	printf( '<p><b>%d</b> Records were ignored</p>', isset( $result->ignored ) ? $result->ignored : 0 );

}

/**
 * The admin page output
 */
function aiosp_seometa_admin() {
	global $_aiosp_seometa_themes, $_aiosp_seometa_plugins, $_aiosp_seometa_platforms;
	?>

	<div class="wrap">


		<h1><?php _e( 'Import SEO Settings', 'all-in-one-seo-pack' ); ?></h1>

		<p><span
				class="description"><?php printf( __( 'Use the drop down below to choose which plugin or theme you wish to import SEO data from.', 'all-in-one-seo-pack' ) ); ?></span>
		</p>

		<p><span
				class="description">
				<?php
				/* translators: %s is a placeholder, which means that it should not be translated. It will be replaced with the name of the plugin, All in One SEO Pack. */
				printf( sprintf( __( 'Click "Analyze" for a list of SEO data that can be imported into %s, along with the number of records that will be imported.', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME ) );
				?>
				</span>
		</p>

		<p>
			<span class="description">
				<strong><?php printf( __( 'Please Note: ', 'all-in-one-seo-pack' ) ); ?></strong>
				<?php
				/* translators: %s is a placeholder, which means that it should not be translated. It will be replaced with the name of the plugin, All in One SEO Pack. */
				printf(
					sprintf(
						__( 'Some plugins and themes do not share similar data, or they store data in a non-standard way. If we cannot import this data, it will remain unchanged in your database. Any compatible SEO data will be displayed for you to review. If a post or page already has SEO data in %s, we will not import data from another plugin/theme.', 'all-in-one-seo-pack' ),
						AIOSEOP_PLUGIN_NAME
					)
				);
				?>
			</span>
		</p>

		<p><span
				class="description"><?php printf( __( 'Click "Convert" to perform the import. After the import has completed, you will be alerted to how many records were imported, and how many records had to be ignored, based on the criteria above.', 'all-in-one-seo-pack' ) ); ?></span>
		</p>

		<p><span
				class="row-title"><?php printf( esc_html__( 'Before performing an import, we strongly recommend that you make a backup of your site. We use and recommend %1$s VaultPress by Jetpack %2$s for backups.', 'all-in-one-seo-pack' ), sprintf( '<a target="_blank" href="%s">', esc_url( 'https://www.wpbeginner.com/refer/jetpack/' ) ), '</a>' ); ?></span>
		</p>


		<form action="<?php echo admin_url( 'tools.php?page=aiosp_import' ); ?>" method="post">
			<?php
			wp_nonce_field( 'aiosp_nonce' );

			$platform_old = ( ! isset( $_POST['platform_old'] ) ) ? '' : $_POST['platform_old'];

			_e( 'Import SEO data from:', 'all-in-one-seo-pack' );
			echo '<select name="platform_old" aria-label="' . __( 'Choose the platform you want to import SEO data from', 'all-in-one-seo-pack' ) . '">';
			printf( '<option value="">%s</option>', __( 'Choose platform:', 'all-in-one-seo-pack' ) );

			printf( '<optgroup label="%s">', __( 'Plugins', 'all-in-one-seo-pack' ) );
			foreach ( $_aiosp_seometa_plugins as $platform => $data ) {
				if ( 'All in One SEO Pack' !== $platform ) {
					printf( '<option value="%s" %s>%s</option>', $platform, selected( $platform, $platform_old, 0 ), $platform );
				}
			}
			printf( '</optgroup>' );

			printf( '<optgroup label="%s">', __( 'Themes', 'all-in-one-seo-pack' ) );
			foreach ( $_aiosp_seometa_themes as $platform => $data ) {
				printf( '<option value="%s" %s>%s</option>', $platform, selected( $platform, $platform_old, 0 ), $platform );
			}
			printf( '</optgroup>' );

			echo '</select>' . "\n\n";

			?>

			<input
				type="submit"
				class="button-secondary"
				name="analyze"
				value="<?php _e( 'Analyze', 'all-in-one-seo-pack' ); ?>"
				aria-label="Analyze"/>
			<input
				type="submit"
				class="button-primary"
				value="<?php _e( 'Convert', 'all-in-one-seo-pack' ); ?>"
				aria-label="Convert"/>

		</form>

		<?php aiosp_seometa_action(); ?>

	</div>

	<?php
}

/**
 * Convert old meta_key entries in the post meta table into new entries.
 *
 * First check to see what records for $new already exist, storing the corresponding post_id values in an array.
 * When the conversion happens, ignore rows that contain a post_id, to avoid duplicate entries.
 *
 * @param string $old Old meta_key entries.
 * @param string $new New meta_key entries.
 * @param bool $delete_old Whether to delete the old entries.
 *
 * @return stdClass Object for error detection, and the number of affected rows.
 */
function aiosp_seometa_meta_key_convert( $old = '', $new = '', $delete_old = false ) {

	do_action( 'pre_aiosp_seometa_meta_key_convert_before', $old, $new, $delete_old );

	global $wpdb;

	$output = new stdClass;

	if ( ! $old || ! $new ) {
		// phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
		$output->WP_Error = 1;

		return $output;
	}

	// See which records we need to ignore, if any.
	$exclude = $wpdb->get_results( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s", $new ) );

	// If no records to ignore, we'll do a basic UPDATE and DELETE.
	if ( ! $exclude ) {

		$output->updated = $wpdb->update( $wpdb->postmeta, array( 'meta_key' => $new ), array( 'meta_key' => $old ) );
		$output->deleted = $delete_old ? $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->postmeta} WHERE meta_key = %s", $old ) ) : 0;
		$output->ignored = 0;

	} else {
		// Else, do a more complex UPDATE and DELETE.
		foreach ( (array) $exclude as $key => $value ) {
			$not_in[] = $value->post_id;
		}
		$not_in = implode( ', ', (array) $not_in );

		// @codingStandardsIgnoreStart
		$output->updated = $wpdb->query( $wpdb->prepare( "UPDATE {$wpdb->postmeta} SET meta_key = %s WHERE meta_key = %s AND post_id NOT IN (%s)", $new, $old, $not_in ) );
		$output->deleted = $delete_old ? $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->postmeta} WHERE meta_key = %s", $old ) ) : 0;
		// @codingStandardsIgnoreEnd
		$output->ignored = count( $exclude );

	}

	do_action( 'aiosp_seometa_meta_key_convert', $output, $old, $new, $delete_old );

	return $output;

}

/**
 * Convert old to new postmeta.
 *
 * Cycle through all compatible SEO entries of two platforms and aiosp_seometa_meta_key_convert conversion for each key.
 *
 * @param string $old_platform
 * @param string $new_platform
 * @param bool $delete_old
 *
 * @return stdClass Results object.
 */
function aiosp_seometa_post_meta_convert( $old_platform = '', $new_platform = 'All in One SEO Pack', $delete_old = false ) {

	do_action( 'pre_aiosp_seometa_post_meta_convert', $old_platform, $new_platform, $delete_old );

	global $_aiosp_seometa_platforms;

	$output = new stdClass;

	if ( empty( $_aiosp_seometa_platforms[ $old_platform ] ) || empty( $_aiosp_seometa_platforms[ $new_platform ] ) ) {
		// phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
		$output->WP_Error = 1;

		return $output;
	}

	$output->updated = 0;
	$output->deleted = 0;
	$output->ignored = 0;

	foreach ( (array) $_aiosp_seometa_platforms[ $old_platform ] as $label => $meta_key ) {

		// Skip iterations where no $new analog exists.
		if ( empty( $_aiosp_seometa_platforms[ $new_platform ][ $label ] ) ) {
			continue;
		}

		// Set $old and $new meta_key values.
		$old = $_aiosp_seometa_platforms[ $old_platform ][ $label ];
		$new = $_aiosp_seometa_platforms[ $new_platform ][ $label ];

		// Convert.
		$result = aiosp_seometa_meta_key_convert( $old, $new, $delete_old );

		// Error check.
		if ( is_wp_error( $result ) ) {
			continue;
		}

		// Update total updated/ignored count.
		$output->updated += (int) $result->updated;
		$output->ignored += (int) $result->ignored;

	}

	do_action( 'aiosp_seometa_post_meta_convert', $output, $old_platform, $new_platform, $delete_old );

	return $output;

}

/**
 * Analyze two platforms to find shared and compatible elements.
 *
 * See what data can be converted from one to the other.
 *
 * @param string $old_platform
 * @param string $new_platform
 *
 * @return stdClass
 */
function aiosp_seometa_post_meta_analyze( $old_platform = '', $new_platform = 'All in One SEO Pack' ) {
	// TODO Figure out which elements to ignore.
	do_action( 'pre_aiosp_seometa_post_meta_analyze', $old_platform, $new_platform );

	global $wpdb, $_aiosp_seometa_platforms;

	$output = new stdClass;

	if ( empty( $_aiosp_seometa_platforms[ $old_platform ] ) || empty( $_aiosp_seometa_platforms[ $new_platform ] ) ) {
		// phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
		$output->WP_Error = 1;

		return $output;
	}

	$output->update   = 0;
	$output->ignore   = 0;
	$output->elements = '';

	foreach ( (array) $_aiosp_seometa_platforms[ $old_platform ] as $label => $meta_key ) {

		// Skip iterations where no $new analog exists.
		if ( empty( $_aiosp_seometa_platforms[ $new_platform ][ $label ] ) ) {
			continue;
		}

		$elements[] = $label;

		// See which records to ignore, if any.
		$ignore = 0;
		// $ignore = $wpdb->get_results( $wpdb->prepare( "SELECT post_id FROM $wpdb->postmeta WHERE meta_key = %s", $meta_key ) );
		// See which records to update, if any.
		$update = $wpdb->get_results( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s", $meta_key ) );

		// Count items in returned arrays.
		// phpcs:ignore Squiz.Commenting.InlineComment.InvalidEndChar
		// $ignore = count( (array)$ignore );
		$update = count( (array) $update );

		// Calculate update/ignore by comparison.
		// phpcs:ignore Squiz.Commenting.InlineComment.InvalidEndChar
		// $update = ( (int)$update > (int)$ignore ) ? ( (int)$update - (int)$ignore ) : 0;
		// update output numbers.
		$output->update += (int) $update;
		$output->ignore += (int) $ignore;

	}

	$output->elements = $elements;

	do_action( 'aiosp_seometa_post_meta_analyze', $output, $old_platform, $new_platform );

	return $output;

}

// phpcs:disable Squiz.Commenting.InlineComment.InvalidEndChar
// define('aiosp_seometa_PLUGIN_DIR', dirname(__FILE__));
// add_action( 'plugins_loaded', 'aiosp_seometa_import' );
// phpcs:enable
/**
 * Initialize the SEO Data Transporter plugin
 */
function aiosp_seometa_import() {

	global $_aiosp_seometa_themes, $_aiosp_seometa_plugins, $_aiosp_seometa_platforms;

	/**
	 * The associative array of supported themes.
	 */
	$_aiosp_seometa_themes = array(
		// alphabatized.
		'Builder'      => array(
			'Custom Doctitle'  => '_builder_seo_title',
			'META Description' => '_builder_seo_description',
			'META Keywords'    => '_builder_seo_keywords',
		),
		'Catalyst'     => array(
			'Custom Doctitle'  => '_catalyst_title',
			'META Description' => '_catalyst_description',
			'META Keywords'    => '_catalyst_keywords',
			'noindex'          => '_catalyst_noindex',
			'nofollow'         => '_catalyst_nofollow',
			'noarchive'        => '_catalyst_noarchive',
		),
		'Frugal'       => array(
			'Custom Doctitle'  => '_title',
			'META Description' => '_description',
			'META Keywords'    => '_keywords',
			'noindex'          => '_noindex',
			'nofollow'         => '_nofollow',
		),
		'Genesis'      => array(
			'Custom Doctitle'  => '_genesis_title',
			'META Description' => '_genesis_description',
			'META Keywords'    => '_genesis_keywords',
			'noindex'          => '_genesis_noindex',
			'nofollow'         => '_genesis_nofollow',
			'noarchive'        => '_genesis_noarchive',
			'Canonical URI'    => '_genesis_canonical_uri',
			'Custom Scripts'   => '_genesis_scripts',
			'Redirect URI'     => 'redirect',
		),
		'Headway'      => array(
			'Custom Doctitle'  => '_title',
			'META Description' => '_description',
			'META Keywords'    => '_keywords',
		),
		'Hybrid'       => array(
			'Custom Doctitle'  => 'Title',
			'META Description' => 'Description',
			'META Keywords'    => 'Keywords',
		),
		'Thesis 1.x'   => array(
			'Custom Doctitle'  => 'thesis_title',
			'META Description' => 'thesis_description',
			'META Keywords'    => 'thesis_keywords',
			'Custom Scripts'   => 'thesis_javascript_scripts',
			'Redirect URI'     => 'thesis_redirect',
		),

		/*
		'Thesis 2.x' => array(
			'Custom Doctitle' => '_thesis_title_tag',
			'META Description' => '_thesis_meta_description',
			'META Keywords' => '_thesis_meta_keywords',
			'Custom Scripts' => '_thesis_javascript_scripts',
			'Canonical URI' => '_thesis_canonical_link',
			'Redirect URI' => '_thesis_redirect',
		),
		*/

		'WooFramework' => array(
			'Custom Doctitle'  => 'seo_title',
			'META Description' => 'seo_description',
			'META Keywords'    => 'seo_keywords',
		),
	);

	/**
	 * The associative array of supported plugins.
	 */
	$_aiosp_seometa_plugins = array(
		// alphabatized.
		'Add Meta Tags'                => array(
			'Custom Doctitle'  => '_amt_title',
			'META Description' => '_amt_description',
			'META Keywords'    => '_amt_keywords',
		),
		'All in One SEO Pack'          => array(
			'Custom Doctitle'  => '_aioseop_title',
			'META Description' => '_aioseop_description',
			'META Keywords'    => '_aioseop_keywords',
			'Canonical URI'    => '_aioseop_custom_link',
		),
		'Greg\'s High Performance SEO' => array(
			'Custom Doctitle'  => '_ghpseo_secondary_title',
			'META Description' => '_ghpseo_alternative_description',
			'META Keywords'    => '_ghpseo_keywords',
		),
		'Headspace2'                   => array(
			'Custom Doctitle'  => '_headspace_page_title',
			'META Description' => '_headspace_description',
			'META Keywords'    => '_headspace_keywords',
			'Custom Scripts'   => '_headspace_scripts',
		),
		'Infinite SEO'                 => array(
			'Custom Doctitle'  => '_wds_title',
			'META Description' => '_wds_metadesc',
			'META Keywords'    => '_wds_keywords',
			'noindex'          => '_wds_meta-robots-noindex',
			'nofollow'         => '_wds_meta-robots-nofollow',
			'Canonical URI'    => '_wds_canonical',
			'Redirect URI'     => '_wds_redirect',
		),
		'Jetpack'                      => array(
			'META Description' => 'advanced_seo_description',
		),
		'Meta SEO Pack'                => array(
			'META Description' => '_msp_description',
			'META Keywords'    => '_msp_keywords',
		),
		'Platinum SEO'                 => array(
			'Custom Doctitle'  => 'title',
			'META Description' => 'description',
			'META Keywords'    => 'keywords',
		),
		'Rank Math'                    => array(
			'Custom Doctitle'  => 'rank_math_title',
			'META Description' => 'rank_math_description',
			'Canonical URI'    => 'rank_math_canonical_url',
		),
		'SEOpressor'                   => array(
			'Custom Doctitle'  => '_seopressor_meta_title',
			'META Description' => '_seopressor_meta_description',
		),
		'SEO Title Tag'                => array(
			'Custom Doctitle'  => 'title_tag',
			'META Description' => 'meta_description',
		),
		'SEO Ultimate'                 => array(
			'Custom Doctitle'  => '_su_title',
			'META Description' => '_su_description',
			'META Keywords'    => '_su_keywords',
			'noindex'          => '_su_meta_robots_noindex',
			'nofollow'         => '_su_meta_robots_nofollow',
		),
		'Yoast SEO'                    => array(
			'Custom Doctitle'  => '_yoast_wpseo_title',
			'META Description' => '_yoast_wpseo_metadesc',
			'META Keywords'    => '_yoast_wpseo_metakeywords',
			'noindex'          => '_yoast_wpseo_meta-robots-noindex',
			'nofollow'         => '_yoast_wpseo_meta-robots-nofollow',
			'Canonical URI'    => '_yoast_wpseo_canonical',
			'Redirect URI'     => '_yoast_wpseo_redirect',
		),
	);

	/**
	 * The combined array of supported platforms.
	 */
	$_aiosp_seometa_platforms = array_merge( $_aiosp_seometa_themes, $_aiosp_seometa_plugins );

	/**
	 * Include the other elements of the plugin.
	 */
	// phpcs:disable Squiz.Commenting.InlineComment.InvalidEndChar
	// require_once( aiosp_seometa_PLUGIN_DIR . '/admin.php' );
	// require_once( aiosp_seometa_PLUGIN_DIR . '/functions.php' );
	// phpcs:enable
	/**
	 * Init hook.
	 *
	 * Hook fires after plugin functions are loaded.
	 *
	 * @since 0.9.10
	 */
	do_action( 'aiosp_seometa_import' );

}

/**
 * Activation Hook
 *
 * @since 0.9.4
 */
register_activation_hook( __FILE__, 'aiosp_seometa_activation_hook' );
function aiosp_seometa_activation_hook() {
	// phpcs:ignore Squiz.Commenting.InlineComment.InvalidEndChar
	// require_once( aiosp_seometa_PLUGIN_DIR . '/functions.php' );
	aiosp_seometa_meta_key_convert( '_yoast_seo_title', 'yoast_wpseo_title', true );
	aiosp_seometa_meta_key_convert( '_yoast_seo_metadesc', 'yoast_wpseo_metadesc', true );

}
