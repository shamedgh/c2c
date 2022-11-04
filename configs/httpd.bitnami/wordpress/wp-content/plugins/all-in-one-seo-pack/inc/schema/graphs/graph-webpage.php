<?php
/**
 * Schema Graph WebPage Class
 *
 * Acts as the web page class for Schema WebPage.
 *
 * @package All_in_One_SEO_Pack
 */

/**
 * Class AIOSEOP_Graph_WebPage
 *
 * @see AIOSEOP_Graph_Creativework
 * @see Schema WebPage
 * @link https://schema.org/WebPage
 */
class AIOSEOP_Graph_WebPage extends AIOSEOP_Graph_Creativework {

	/**
	 * Get Graph Slug.
	 *
	 * @since 3.2
	 *
	 * @return string
	 */
	protected function get_slug() {
		return 'WebPage';
	}

	/**
	 * Get Graph Name.
	 *
	 * Intended for frontend use when displaying which schema graphs are available.
	 *
	 * @since 3.2
	 *
	 * @return string
	 */
	protected function get_name() {
		return 'Web Page';
	}

	/**
	 * Prepare data.
	 *
	 * @since 3.2
	 *
	 * @return array
	 */
	protected function prepare() {
		global $post;
		global $aioseop_options;

		if (
				'post_type_archive' === AIOSEOP_Context::get_is() &&
				function_exists( 'is_shop' ) &&
				function_exists( 'wc_get_page_id' ) &&
				is_shop()
		) {
			// WooCommerce - Shop Page.
			$shop_page = get_post( wc_get_page_id( 'shop' ) );
			$context   = AIOSEOP_Context::get_instance( $shop_page );
		} elseif (
				class_exists( 'BuddyPress' ) &&
				'single_page' === AIOSEOP_Context::get_is() &&
				bp_is_user()
		) {
			// BuddyPress - Member Page.
			$wp_user = wp_get_current_user();
			$context = AIOSEOP_Context::get_instance( $wp_user );
		} elseif (
				class_exists( 'BuddyPress' ) &&
				'single_page' === AIOSEOP_Context::get_is() &&
				(
					bp_is_group() ||
					bp_is_group_create()
				)
		) {
			// BuddyPress - Group Page(s).
			$bp_pages = get_option( 'bp-pages' );
			$context = array(
				'context_type' => 'WP_Post',
				'context_key'  => $bp_pages['groups']
			);
			$context = AIOSEOP_Context::get_instance( $context );
		} else {
			$context = AIOSEOP_Context::get_instance();
		}

		$current_url  = $context->get_url();
		$current_name = $context->get_display_name();
		$current_desc = $context->get_description();

		$rtn_data = array(
			'@type'      => $this->slug,
			'@id'        => $current_url . '#' . strtolower( $this->slug ), // TODO Should this be `#webpage`?
			'url'        => $current_url,
			'inLanguage' => get_bloginfo( 'language' ),
			'name'       => $current_name,
			'isPartOf'   => array(
				'@id' => home_url() . '/#website',
			),
			'breadcrumb' => array(
				'@id' => $context->get_url() . '#breadcrumblist',
			),
		);
		if ( ! empty( $current_desc ) ) {
			$rtn_data['description'] = $current_desc;
		}

		// Handles pages.
		if ( is_singular() || is_single() ) {
			if ( is_attachment() ) {
				unset( $rtn_data['breadcrumb'] );
			}

			if ( has_post_thumbnail( $post ) ) {
				$image_id = get_post_thumbnail_id();

				$image_schema = $this->prepare_image( $this->get_site_image_data( $image_id ), $current_url . '#primaryimage' );
				if ( $image_schema ) {
					$rtn_data['image']              = $image_schema;
					$rtn_data['primaryImageOfPage'] = array( '@id' => $current_url . '#primaryimage' );
				}
			}

			$rtn_data['datePublished'] = mysql2date( DATE_W3C, $post->post_date_gmt, false );
			$rtn_data['dateModified']  = mysql2date( DATE_W3C, $post->post_modified_gmt, false );
		}

		if ( is_front_page() ) {
			$rtn_data['about'] = array(
				'@id' => home_url() . '/#' . $aioseop_options['aiosp_schema_site_represents'],
			);
		}

		return $rtn_data;
	}

	/**
	 * Get Post Description.
	 *
	 * @deprecated 3.4.3 Use AIOSEOP_Context::get_instance( $post_object )->get_description().
	 * @since 3.2
	 *
	 * @param WP_Post $post See WP_Post for details.
	 * @return string
	 */
	protected function get_post_description( $post ) {
		$rtn_description = '';

		// Using AIOSEOP's description is limited in content. With Schema's descriptions, there is no cap limit.
		$post_description = get_post_meta( $post->ID, '_aioseop_description', true );

		// If there is no AIOSEOP description, and the post isn't password protected, then use post excerpt or content.
		if ( ! $post_description && ! post_password_required( $post ) ) {
			if ( ! empty( $post->post_excerpt ) ) {
				$post_description = $post->post_excerpt;
			}
		}

		if ( ! empty( $post_description ) && is_string( $post_description ) ) {
			$rtn_description = $post_description;
		}

		return $rtn_description;
	}

}
