<?php

class SimpleTags_Admin_ClickTags {
	/**
	 * Constructor
	 *
	 * @return void
	 * @author Amaury Balmer
	 */
	public function __construct() {
		// Ajax action, JS Helper and admin action
		add_action( 'wp_ajax_simpletags', array( __CLASS__, 'ajax_check' ) );

		// Box for post/page
		add_action( 'admin_menu', array( __CLASS__, 'admin_menu' ), 1 );

		// Javascript
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'admin_enqueue_scripts' ), 11 );
	}

	/**
	 * Init somes JS and CSS need for this feature
	 *
	 * @return void
	 * @author Amaury Balmer
	 */
	public static function admin_enqueue_scripts() {
		global $pagenow;

		wp_register_script(
			'st-helper-click-tags',
			STAGS_URL . '/assets/js/helper-click-tags.js',
			array(
				'jquery',
				'st-helper-add-tags',
			),
			STAGS_VERSION,
			true
		);
		wp_localize_script(
			'st-helper-click-tags',
			'stHelperClickTagsL10n',
			array(
				'show_txt' => __( 'Display click tags', 'simpletags' ),
				'hide_txt' => __( 'Hide click tags', 'simpletags' ),
				'state'    => SimpleTags_Plugin::get_option_value( 'visibility_click_tags' ),
			)
		);

		// Register location
		$wp_post_pages = array( 'post.php', 'post-new.php' );
		$wp_page_pages = array( 'page.php', 'page-new.php' );

		// Helper for posts/pages
		if ( in_array( $pagenow, $wp_post_pages, true ) || ( in_array( $pagenow, $wp_page_pages, true ) && is_page_have_tags() ) ) {
			wp_enqueue_script( 'st-helper-click-tags' );
		}
	}

	/**
	 * Register metabox
	 *
	 * @return void
	 * @author Amaury Balmer
	 */
	public static function admin_menu() {
		add_meta_box(
			'st-clicks-tags',
			__( 'Click tags', 'simpletags' ),
			array(
				__CLASS__,
				'metabox',
			),
			'post',
			'advanced',
			'core'
		);

		if ( is_page_have_tags() ) {
			add_meta_box(
				'st-clicks-tags',
				__( 'Click tags', 'simpletags' ),
				array(
					__CLASS__,
					'metabox',
				),
				'page',
				'advanced',
				'core'
			);
		}
	}

	/**
	 * Put default HTML for people without JS
	 *
	 * @return void
	 * @author Amaury Balmer
	 */
	public static function metabox() {
		echo SimpleTags_Admin::getDefaultContentBox();
	}

	/**
	 * Ajax Dispatcher
	 *
	 * @return void
	 * @author Amaury Balmer
	 */
	public static function ajax_check() {
		if ( isset( $_GET['stags_action'] ) && 'click_tags' === $_GET['stags_action'] ) {
			self::ajax_click_tags();
		}
	}

	/**
	 * Display a span list for click tags
	 *
	 * @return void
	 * @author Amaury Balmer
	 */
	public static function ajax_click_tags() {
		status_header( 200 ); // Send good header HTTP
		header( 'Content-Type: text/html; charset=' . get_bloginfo( 'charset' ) );

		if ( 0 === (int) wp_count_terms( 'post_tag', array( 'hide_empty' => false ) ) ) { // No tags to suggest
			echo '<p>' . esc_html__( 'No terms in your WordPress database.', 'simpletags' ) . '</p>';
			exit();
		}

		// Prepare search
		$search  = ( isset( $_GET['q'] ) ) ? trim( stripslashes( $_GET['q'] ) ) : '';
		$post_id = ( isset( $_GET['post_id'] ) ) ? intval( $_GET['post_id'] ) : 0;

		// Order tags before selection (count-asc/count-desc/name-asc/name-desc/random)
		$order_click_tags = strtolower( SimpleTags_Plugin::get_option_value( 'order_click_tags' ) );
		switch ( $order_click_tags ) {
			case 'count-asc':
				$order_by = 'tt.count';
				$order    = 'ASC';
				break;
			case 'random':
				$order_by = 'RAND()';
				$order    = '';
				break;
			case 'count-desc':
				$order_by = 'tt.count';
				$order    = 'DESC';
				break;
			case 'name-desc':
				$order_by = 't.name';
				$order    = 'DESC';
				break;
			default: // name-asc
				$order_by = 't.name';
				$order    = 'ASC';
				break;
		}

		// Get all terms, or filter with search
		$terms = SimpleTags_Admin::getTermsForAjax( 'post_tag', $search, $order_by, $order );
		if ( empty( $terms ) ) {
			echo '<p>' . esc_html__( 'No results from your WordPress database.', 'simpletags' ) . '</p>';
			exit();
		}

		// Get terms for current post
		$post_terms = array();
		if ( $post_id > 0 ) {
			$post_terms = wp_get_post_terms( $post_id, 'post_tag', array( 'fields' => 'ids' ) );
		}

		foreach ( (array) $terms as $term ) {
			$class_current = in_array( $term->term_id, $post_terms, true ) ? 'used_term' : '';
			echo '<span class="local ' . esc_attr( $class_current ) . '">' . esc_html( stripslashes( $term->name ) ) . '</span>' . "\n";
		}
		echo '<div class="clear"></div>';

		exit();
	}
}
