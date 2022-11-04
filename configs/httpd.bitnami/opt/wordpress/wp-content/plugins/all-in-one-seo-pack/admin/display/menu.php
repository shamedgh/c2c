<?php
/**
 * Menu
 *
 * @package All_in_One_SEO_Pack
 * @since ?
 */

/**
 * Class AIOSEOPAdminMenus
 *
 * @since 2.3.11.5
 */
class AIOSEOPAdminMenus {

	/**
	 * Constructor to add the actions.
	 */
	function __construct() {

		add_action( 'network_admin_menu', array( $this, 'remove_menus' ), 15 );

		if ( is_multisite() ) {
			return;
		}

		if ( ( current_user_can( 'manage_options' ) || current_user_can( 'aiosp_manage_seo' ) ) ) {
			add_action( 'admin_menu', array( $this, 'add_submenu_pages' ), 11 );
			add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
		}
	}

	function remove_menus() {
		remove_menu_page( AIOSEOP_PLUGIN_DIRNAME . '/aioseop_class.php' ); // Remove AIOSEOP menu from the network admin.
	}

	/**
	 * Adds the submenu pages for Lite users.
	 *
	 * @since   2.3.11.5
	 * @since   3.4.0       Added About page to admin menu.
	 */
	function add_submenu_pages() {
		global $submenu;

		$plugin_base_dir = explode( '/', plugin_basename( __FILE__ ) );
		$menu_slug       = $plugin_base_dir[0] . '/aioseop_class.php';

		add_submenu_page(
			$menu_slug,
			sprintf( __( 'About %s', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME ),
			__( 'About Us', 'all-in-one-seo-pack' ),
			apply_filters( 'manage_aiosp', 'aiosp_manage_seo' ),
			'aioseop-about',
			array( 'AIOSEOP_About', 'init' ),
			null
		);

		if ( AIOSEOPPRO ) {
			return;
		}

		$url          = aioseop_get_utm_url( 'admin-menu' );
		$upgrade_text = __( 'Upgrade to Pro', 'all-in-one-seo-pack' );
		$submenu[ AIOSEOP_PLUGIN_DIRNAME . '/aioseop_class.php' ][] = array(
			"<span class='upgrade_menu_link'>$upgrade_text</span>",
			'manage_options',
			$url,
		);
	}

	/*
	 * Opens Upgrade to Pro links in WP Admin as new tab.
	 *
	 * Enqueued here because All_in_One_SEO_Pack_Module::admin_enqueue_scripts does not work.
	 *
	 * @param string $hook
	 *
	 * @since 3.0
	 */
	function admin_enqueue_scripts( $hook ) {
		wp_enqueue_script( 'aioseop_menu_js', AIOSEOP_PLUGIN_URL . 'js/aioseop-menu.js', array( 'jquery' ), AIOSEOP_VERSION, true );

		if ( 'plugins.php' === $hook ) {
			wp_enqueue_script( 'aioseop_plugins_menu_js', AIOSEOP_PLUGIN_URL . 'js/plugins-menu.js', array( 'jquery' ), AIOSEOP_VERSION, true );
		}
	}
}

	new AIOSEOPAdminMenus();

