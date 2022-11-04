<?php
/**
 * Extends the Gutenberg Editor and Classic Editor with extra rich text features.
 *
 * @since 3.4.0
 * @package All-in-One-SEO-Pack
 */

/**
 * Enqueues scripts that allow users to add nofollow, sponsored and title attributes to links in the Gutenberg Editor and Classic Editor.
 *
 * @since 3.4.0
 */
class AIOSEOP_Link_Attributes {

	/**
	 * Enqueues the script for the Classic Editor.
	 *
	 * Acts as a callback for the wp_enqueue_editor action hook.
	 *
	 * @since 3.4.0
	 *
	 * @return void
	 */
	public static function enqueue_link_attributes_classic_editor() {
		wp_deregister_script( 'wplink' );
		
		wp_enqueue_script(
			'wplink',
			AIOSEOP_PLUGIN_URL . 'js/admin/aioseop-link.js',
			array( 'jquery', 'wp-a11y' ),
			AIOSEOP_VERSION,
			true
		);

		wp_localize_script(
			'wplink',
			'aioseopL10n',
			array(
				'update'         => __( 'Update', 'all-in-one-seo-pack' ),
				'save'           => __( 'Add Link', 'all-in-one-seo-pack' ),
				'noTitle'        => __( '(no title)', 'all-in-one-seo-pack' ),
				'labelTitle'     => __( 'Title', 'all-in-one-seo-pack' ),
				'noMatchesFound' => __( 'No results found.', 'all-in-one-seo-pack' ),
				'linkInserted'   => __( 'Link has been inserted.', 'all-in-one-seo-pack' ),
				'noFollow'       => __( '&nbsp;Add <code>rel="nofollow"</code> to link', 'all-in-one-seo-pack' ),
				'sponsored'      => __( '&nbsp;Add <code>rel="sponsored"</code> to link', 'all-in-one-seo-pack' ),
				'ugc'            => __( '&nbsp;Add <code>rel="UGC"</code> to link', 'all-in-one-seo-pack' ),
			)
		);
	}

	/**
	 * Registers the script for the Gutenberg Editor.
	 *
	 * Acts as a callback for the admin_init action hook.
	 *
	 * @since 3.4.0
	 *
	 * @return void
	 */
	public static function register_link_attributes_gutenberg_editor() {
		$link_format     = 'aioseop-link';
		$link_format_old = 'aioseop-link-old';

		if ( is_plugin_active( 'gutenberg/gutenberg.php' ) ) {
			$data = get_plugin_data( ABSPATH . 'wp-content/plugins/gutenberg/gutenberg.php', false, false );
			if ( version_compare( $data['Version'], '7.4.0', '<' ) ) {
				$link_format = $link_format_old;
			}
		} else {
			if ( version_compare( get_bloginfo( 'version' ), '5.4', '<' ) ) {
				$link_format = $link_format_old;
			}
		}

		wp_register_script(
			'aioseop-link',
			AIOSEOP_PLUGIN_URL . 'build/' . $link_format . '.js',
			array(
				'wp-blocks',
				'wp-i18n',
				'wp-element',
				'wp-plugins',
				'wp-components',
				'wp-edit-post',
				'wp-api',
				'wp-editor',
				'wp-hooks',
				'lodash',
			),
			AIOSEOP_VERSION,
			true
		);
	}

	/**
	 * Enqueues the script for the Gutenberg Editor.
	 *
	 * Acts as a callback for the enqueue_block_editor_assets action hook.
	 *
	 * @since 3.4.0
	 *
	 * @return void
	 */
	public static function enqueue_link_attributes_gutenberg_editor() {
		wp_enqueue_script( 'aioseop-link' );
	}
}
