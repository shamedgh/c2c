<?php

/**
 * Handles our Site Health tests & info.
 * 
 * @since 3.8.0
 */
class AIOSEOP_Site_Health {

	/**
	 * Class constructor.
	 *
	 * @since 3.8.0
	 */
	public function __construct() {
		add_filter( 'site_status_tests', array( $this, 'registerTests' ), 10, 1 );
		add_filter( 'debug_information', array( $this, 'addDebugInfo' ), 10, 1 );
	}

	/**
	 * Registers our site health tests.
	 *
	 * @since 3.8.0
	 *
	 * @param  array $tests The site health tests.
	 * @return array $tests The site health tests.
	 */
	public function registerTests( $tests ) {
		global $aioseop_options;

		$tests['direct']['aioseo_site_public'] = array(
			'label' => 'AIOSEO Site Public',
			'test'  => array( $this, 'sitePublic' ),
		);
		$tests['direct']['aioseo_site_info'] = array(
			'label' => 'AIOSEO Site Info',
			'test'  => array( $this, 'siteInfo' ),
		);
		$tests['direct']['aioseo_plugin_update'] = array(
			'label' => 'AIOSEO Plugin Update',
			'test'  => array( $this, 'pluginUpdate' ),
		);

		if ( ! empty( $aioseop_options['aiosp_schema_markup'] ) ) {
			$tests['direct']['aioseo_schema_markup'] = array(
				'label' => 'AIOSEO Schema Markup',
				'test'  => array( $this, 'schemaMarkup' ),
			);
	
		}
		return $tests;
	}

	/**
	 * Checks whether the site is public.
	 * 
	 * @since 3.8.0
	 *
	 * @return array The test result.
	 */
	public function sitePublic() {
		if ( ! get_option( 'blog_public' ) ) {
			return $this->result(
				'aioseo_site_public',
				'critical',
				__( 'Your site does not appear in search results', 'all-in-one-seo-pack' ),
				__( 'Your site is set to private. This means WordPress asks search engines to exclude your website from search results.', 'all-in-one-seo-pack' ),
				$this->actionLink( admin_url( 'options-reading.php' ), __( 'Go to Settings > Reading', 'all-in-one-seo-pack' ) )
			);
		}
		return $this->result(
			'aioseo_site_public',
			'good',
			__( 'Your site appears in search results', 'all-in-one-seo-pack' ),
			__( 'Your site is set to public. Search engines will index your website and it will appear in search results.', 'all-in-one-seo-pack' )
		);
	}

	/**
	 * Checks whether the site title and tagline are set.
	 * 
	 * @since 3.8.0
	 *
	 * @return array The test result.
	 */
	public function siteInfo() {
		$siteTitle   = get_bloginfo( 'name' );
		$siteTagline = get_bloginfo( 'description' );

		if ( ! $siteTitle || ! $siteTagline ) {
			return $this->result(
				'aioseo_site_info',
				'recommended',
				__( 'Your Site Title and/or Tagline are blank', 'all-in-one-seo-pack' ),
				__( 'Your Site Title and/or Tagline are blank. We recommend setting both of these values as AIOSEO requires these for various features, including our schema markup' , 'all-in-one-seo-pack' ),
				$this->actionLink( admin_url( 'options-general.php' ), __( 'Go to Settings > General', 'all-in-one-seo-pack' ) )
			);
		}
		return $this->result(
			'aioseo_site_info',
			'good',
			__( 'Your Site Title and Tagline are set', 'all-in-one-seo-pack' ),
			__( "Great! These are required for AIOSEO's schema markup and are often used as fallback values for various other features." , 'all-in-one-seo-pack' )
		);
	}

	/**
	 * Checks whether the required settings for our schema markup are set.
	 * 
	 * @since 3.8.0
	 *
	 * @return array The test result.
	 */
	public function schemaMarkup() {
		global $aioseop_options;

		$dirname  = dirname( plugin_basename( AIOSEO_PLUGIN_FILE ) );
		$menuPath = admin_url( "admin.php?page=$dirname/aioseop_class.php" );

		if ( 'organization' === $aioseop_options['aiosp_schema_site_represents'] ) {
			if ( ! $aioseop_options['aiosp_schema_organization_name'] || ( ! $aioseop_options['aiosp_schema_organization_logo'] && ! aioseop_get_site_logo_url() ) ) {
				return $this->result(
					'aioseo_schema_markup',
					'recommended',
					__( 'Your Organization Name and/or Logo are blank', 'all-in-one-seo-pack' ),
					__( "Your Organization Name and/or Logo are blank. These values are required for AIOSEO's Organization schema markup.", 'all-in-one-seo-pack' ),
					$this->actionLink( $menuPath, __( 'Go to General Settings', 'all-in-one-seo-pack' ) )
				);
			}
			return $this->result(
				'aioseo_schema_markup',
				'good',
				__( 'Your Organization Name and Logo are set', 'all-in-one-seo-pack' ),
				__( "Awesome! These are required for AIOSEO's Organization schema markup.", 'all-in-one-seo-pack' )
			);
		}

		if (
			0 === intval( $aioseop_options['aiosp_schema_person_user'] ) ||
			( -1 === intval( $aioseop_options['aiosp_schema_person_user'] ) && ( ! $aioseop_options['aiosp_schema_person_manual_name'] || ! $aioseop_options['aiosp_schema_person_manual_image'] ) )
		) {
			return $this->result(
				'aioseo_schema_markup',
				'recommended',
				__( 'Your Person Name and/or Image are blank', 'all-in-one-seo-pack' ),
				__( "Your Person Name and/or Image are blank. These values are required for AIOSEO's Person schema markup.", 'all-in-one-seo-pack' ),
				$this->actionLink( $menuPath, __( 'Go to General Settings', 'all-in-one-seo-pack' ) )
			);
		}
		return $this->result(
			'aioseo_schema_markup',
			'good',
			__( 'Your Person Name and Image are set', 'all-in-one-seo-pack' ),
			__( "Awesome! These are required for AIOSEO's Person schema markup.", 'all-in-one-seo-pack' )
		);
	}

	/**
	 * Checks whether the required settings for our schema markup are set.
	 * 
	 * @since 3.8.0
	 *
	 * @return array The test result.
	 */
	public function pluginUpdate() {
		global $aioseop_version;

		$shouldUpdate = false;
		if ( ! AIOSEOPPRO ) {
			$response = wp_remote_get( 'https://api.wordpress.org/plugins/info/1.0/all-in-one-seo-pack.json' );
			$body     = wp_remote_retrieve_body( $response );
			if ( ! $body ) {
				// Something went wrong.
				return;
			}

			$pluginData   = json_decode( $body );
			$shouldUpdate = version_compare( AIOSEOP_VERSION, $pluginData->version, '<' );
		} else {
			if ( AIOSEOPPRO ) {
				global $aioseop_update_checker;
				if ( null !== $aioseop_update_checker->checkForUpdates() ) {
					$shouldUpdate = true;
				}
			}
		}

		if ( $shouldUpdate ) {
			return $this->result(
				'aioseo_plugin_update',
				'critical',
				__( 'All in One SEO needs to be updated', 'all-in-one-seo-pack' ),
				__( "An update is available for All in One SEO. Upgrade to the latest version to receive all the latest features, bug fixes and security improvements.", 'all-in-one-seo-pack' ),
				$this->actionLink( admin_url( 'plugins.php' ), __( 'Go to Plugins', 'all-in-one-seo-pack' ) )
			);
		}
		return $this->result(
			'aioseo_plugin_update',
			'good',
			__( 'All in One SEO is updated to the latest version', 'all-in-one-seo-pack' ),
			__( "Fantastic! By updating to the latest version, you have access to all the latest features, bug fixes and security improvements.", 'all-in-one-seo-pack' )
		);
	}

	/**
	 * Returns the test result.
	 *
	 * @since 3.8.0
	 *
	 * @param  string $name        The test name.
	 * @param  string $status      The result status.
	 * @param  string $header      The test header.
	 * @param  string $description The result description.
	 * @param  string $actions     The result actions.
	 * @return array               The test result.
	 */
	private function result( $name, $status, $header, $description, $actions = '' ) {
		$color = 'blue';
		switch ( $status ) {
			case 'good':
				break;
			case 'recommended':
				$color = 'orange';
				break;
			case 'critical':
				$color = 'red';
				break;
			default:
				break;
		}

		return array(
			'test'        => $name,
			'status'      => $status,
			'label'       => $header,
			'description' => $description,
			'actions'     => $actions,
			'badge'       => array(
				'label' => AIOSEOP_PLUGIN_NAME,
				'color' => $color,
			),
		);
	}

	/**
	 * Adds our site health debug info.
	 *
	 * @since 3.8.0
	 *
	 * @param  array $debugInfo The debug info.
	 * @return array $debugInfo The debug info.
	 */
	public function addDebugInfo( $debugInfo ) {
		$fields = array();

		$noindexed = $this->noindexed();
		if ( $noindexed ) {
			$fields['noindexed'] = $this->field(
				__( 'Noindexed content', 'all-in-one-seo-pack' ),
				implode( ', ', $noindexed )
			);
		}

		$nofollowed = $this->nofollowed();
		if ( $nofollowed ) {
			$fields['nofollowed'] = $this->field(
				__( 'Nofollowed content', 'all-in-one-seo-pack' ),
				implode( ', ', $nofollowed )
			);
		}

		if ( ! count( $fields ) ) {
			return $debugInfo;
		}

		$debugInfo['aioseo'] = array(
			'label'       => __( 'SEO', 'all-in-one-seo-pack' ),
			'description' => __( 'The fields below contain important SEO information from All in One SEO that may effect your site.', 'all-in-one-seo-pack' ),
			'private'     => false,
			'show_count'  => true,
			'fields'      => $fields,
		);
		return $debugInfo;
	}

	/**
	 * Returns a list of noindexed content.
	 *
	 * @since 3.8.0
	 *
	 * @return array $noindexed A list of noindexed content.
	 */
	private function noindexed() {
		global $aioseop_options;
		$settings = array(
			'aiosp_category_noindex'       => __( 'Categories', 'all-in-one-seo-pack' ),
			'aiosp_tags_noindex'           => __( 'Tags', 'all-in-one-seo-pack' ),
			'aiosp_paginated_noindex'      => __( 'Paginated Content', 'all-in-one-seo-pack' ),
			'aiosp_archive_author_noindex' => __( 'Author Archives', 'all-in-one-seo-pack' ),
			'aiosp_archive_date_noindex'   => __( 'Date Archives', 'all-in-one-seo-pack' ),
			'aiosp_search_noindex'         => __( 'Search Page', 'all-in-one-seo-pack' ),
			'aiosp_404_noindex'            => __( '404 Not Found Page', 'all-in-one-seo-pack' ),
		);

		$noindexed = array();
		if ( ! empty( $aioseop_options['aiosp_cpostnoindex'] ) && is_array( $aioseop_options['aiosp_cpostnoindex'] ) ) {
			$postTypes = get_post_types( array( 'public' => true ), 'objects' );
			foreach ( $postTypes as $postType ) {
				if ( in_array( $postType->name, $aioseop_options['aiosp_cpostnoindex'] ) ) {
					array_push( $noindexed, ucfirst( $postType->label ) . "&nbsp;($postType->name)" );
				}
			}
		}

		if ( ! empty( $aioseop_options['aiosp_tax_noindex'] ) && is_array( $aioseop_options['aiosp_tax_noindex'] ) ) {
			$taxonomies = get_taxonomies( array( 'public' => true ), 'objects' );
			foreach ( $taxonomies as $taxonomy ) {
				if ( in_array( $taxonomy->name, $aioseop_options['aiosp_tax_noindex'] ) ) {
					array_push( $noindexed, ucfirst( $taxonomy->label ) . "&nbsp;($taxonomy->name)" );
				}
			}
		}

		foreach ( $settings as $name => $type ) {
			if ( ! empty( $aioseop_options[ $name ] ) ) {
				array_push( $noindexed, $type );
			}
		}
		return $noindexed;
	}

	/**
	 * Returns a list of nofollowed content.
	 *
	 * @since 3.8.0
	 *
	 * @return array $nofollowed A list of nofollowed content.
	 */
	private function nofollowed() {
		global $aioseop_options;

		$nofollowed = array();
		if ( ! empty( $aioseop_options['aiosp_cpostnofollow'] ) && is_array( $aioseop_options['aiosp_cpostnofollow'] ) ) {
			$postTypes = get_post_types( array( 'public' => true ), 'objects' );
			foreach ( $postTypes as $postType ) {
				if ( in_array( $postType->name, $aioseop_options['aiosp_cpostnofollow'] ) ) {
					array_push( $nofollowed, ucfirst( $postType->label ) . "&nbsp;($postType->name)" );
				}
			}
		}

		if ( ! empty( $aioseop_options['aiosp_paginated_nofollow'] ) ) {
			array_push( $nofollowed, __( 'Paginated Content', 'all-in-one-seo-pack' ) );
		}
		return $nofollowed;
	}

	/**
	 * Returns a debug info data field.
	 *
	 * @since 3.8.0
	 *
	 * @param  string  $label   The field label.
	 * @param  string  $value   The field value.
	 * @param  boolean $private Whether the field shouldn't be included if the debug info is copied.
	 * @return array            The debug info data field.
	 */
	private function field( $label, $value, $private = false ) {
		return array(
			'label'   => $label,
			'value'   => $value,
			'private' => $private,
		);
	}

	/**
	 * Returns an action link.
	 *
	 * @since 3.8.0
	 *
	 * @param  string $path   The path.
	 * @param  string $anchor The anchor text.
	 * @return string         The action link.
	 */
	private function actionLink( $path, $anchor ) {
		return sprintf(
			'<p><a href="%1$s">%2$s</a></p>',
			$path,
			$anchor
		);
	}
}
