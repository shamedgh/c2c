<?php

/**
 * Handles the RSS content.
 * 
 * @since 3.7.0
 */
class AIOSEOP_Rss {

	/**
	 * Class constructor.
	 *
	 * @since 3.7.0
	 */
	public function __construct() {
		global $aioseop_options;

		add_filter( 'admin_enqueue_scripts', array( $this, 'description' ) );
		if ( ! isset( $aioseop_options['aiosp_rss_content_before'] ) && ! isset( $aioseop_options['aiosp_rss_content_after'] ) ) {
			return;
		}
		$this->hooks();
	}

	/**
	 * Registers our hooks.
	 *
	 * @since 3.7.0
	 *
	 * @return void
	 */
	private function hooks() {
		add_filter( 'the_content_feed', array( $this, 'addRssContent' ) );
		add_filter( 'the_excerpt_rss', array( $this, 'addRssContentExcerpt' ) );
	}

	/**
	 * Enqueues script to add a description at the top of the RSS Content Settings box in the General Settings menu.
	 *
	 * @since 3.7.0
	 *
	 * @return void
	 */
	public function description() {
		if ( 'toplevel_page_' . AIOSEOP_PLUGIN_DIRNAME . '/aioseop_class' !== get_current_screen()->id ) {
			return;
		}

		wp_enqueue_script(
			'aioseop-rss-content',
			AIOSEOP_PLUGIN_URL . 'js/admin/aioseop-rss-content.js',
			array( 'jquery' ),
			AIOSEOP_VERSION,
			true
		);

		$feedUrl = trailingslashit( home_url() ) . 'feed';
		wp_localize_script( 'aioseop-rss-content', 'aioseopRssContent', array(
			'description' => wp_kses(
				sprintf(
					'<div class="aioseop-rss-content-description"><p>%1$s</p></p>%2$s <a href="https://semperplugins.com/documentation/rss-content-settings/" target="_blank">%3$s</a></p></div>',
					sprintf( 
						/* translators: 1 - Opening HTML link tag, 2 - Closing HTML link tag. */
						__( 'This feature allows you to automatically add content for each post in your %1$ssite\'s RSS feed%2$s.', 'all-in-one-seo-pack' ),
						"<a href='$feedUrl' target='_blank'>",
						"<a/>"
					),
					__( 'More specifically, it allows you to add links back to your blog and your blog posts so scrapers will automatically add these links too. This helps search engines identify you as the original source of the content.', 'all-in-one-seo-pack' ),
					__( 'Learn More →', 'all-in-one-seo-pack' )
				),
				array(
					'div' => array(
						'class' => array(),
					),
					'p'   => array(),
					'a'   => array(
						'href'   => array(),
						'target' => array(),
					),
				)
			),
			'listOfTags'  => wp_kses(
				sprintf(
					'<div class="aioseop-rss-content-tags"><p>%1$s</p>',
					sprintf( 
						/* translators: 1 - "Click here". */
						__( '%1$s to view the list of macros that we support for these settings.', 'all-in-one-seo-pack' ),
						sprintf( '%1$s%2$s%3$s',
							'<a href="https://semperplugins.com/documentation/rss-content-settings" target="_blank">',
							__( 'Click here', 'all-in-one-seo-pack' ),
							'</a>'
						)
					)
				),
				array(
					'div' => array(
						'class' => array(),
					),
					'p'   => array(),
					'a'   => array(
						'href'   => array(),
						'target' => array(),
					),
				)
			),
		));
	}

	/**
	 * Adds content before or after the RSS post.
	 *
	 * @since 3.7.0
	 *
	 * @param  string $content The RSS post content.
	 * @param  string $excerpt Whether the content will be used for the excerpt.
	 * @return string $content The modified RSS post content.
	 */
	public function addRssContent( $content, $excerpt = false ) {
		$content = trim( $content );
		if ( empty( $content ) ) {
			return '';
		}

		if ( is_feed() ) {
			global $aioseop_options;

			$before = isset( $aioseop_options['aiosp_rss_content_before'] ) ? $aioseop_options['aiosp_rss_content_before'] : '';
			$before = $this->replaceTags( $before );

			$after  = isset( $aioseop_options['aiosp_rss_content_after'] ) ? $aioseop_options['aiosp_rss_content_after'] : '';
			$after  = $this->replaceTags( $after );

			if ( $before || $after ) {
				if ( $excerpt ) {
					$content = wpautop( $content );
				}
				$content = htmlspecialchars_decode( $before ) . $content . htmlspecialchars_decode( $after );
			}
		}

		return $content;
	}
 
	/**
	 * Adds content before or after the RSS excerpt.
	 *
	 * @since 3.7.0
	 *
	 * @param  string $content The RSS excerpt content.
	 * @return string $content The modified RSS excerpt content.
	 */
	public function addRssContentExcerpt( $content ) {
		return $this->addRssContent( $content, true );
	}

	/**
	 * Replaces Smart Tags inside the RSS content with their corresponding values.
	 *
	 * @since 3.7.0
	 *
	 * @param  string $content The RSS content.
	 * @return string          The modified RSS content.
	 */
	private function replaceTags( $content ) {
		if ( ! $content ) {
			return $content;
		}

		preg_match_all( '#%[a-zA-Z_]*%#', $content, $tags );
		if ( ! count( $tags[0] ) ) {
			return $content;
		}

		foreach ( array_unique( $tags[0] ) as $tag ) {
			$content = preg_replace( "#$tag#", $this->getTag( $tag ), $content );
		}

		return wp_kses(
			'<p>' . trim( $content ) . '</p>',
			array(
				'p' => array(),
				'a' => array(
					'href'   => array(),
					'target' => array(),
					'title'  => array(),
				),
			),
			array( 'http', 'https' )
		);
	}

	/**
	 * Returns the value for a given tag.
	 * 
	 * @since 3.7.0
	 *
	 * @param  string $tag The tag.
	 * @return string      The value.
	 */
	private function getTag( $tag ) {
		switch ( $tag ) {
			case '%site_title%':
				return get_bloginfo( 'name' );
			case '%site_link%':
				return $this->siteLink();
			case '%site_link_raw%':
				$url = trailingslashit( home_url() );
				return $this->buildLink( $url, $url );
			case '%post_title%':
				$post = get_post();
				if ( ! $post ) {
					return '';
				}
				return $post->post_title;
			case '%post_link%':
				return $this->postLink();
			case '%post_link_raw%':
				$url = trailingslashit( get_permalink() );
				return $this->buildLink( $url, $url );
			case '%author_name%':
				$post = get_post();
				if ( ! $post ) {
					return '';
				}
				return get_the_author_meta( 'display_name', $post->post_author );
			case '%author_link%':
				return $this->authorLink();
			default:
				return '';
		}
	}

	/**
	 * Returns a link to the site (homepage) with the site title as anchor text.
	 *
	 * @since 3.7.0
	 *
	 * @return string The site link.
	 */
	private function siteLink() {
		$name = get_bloginfo( 'name' );
		if ( ! $name ) {
			$homeUrl = home_url();
			return $this->buildLink( $homeUrl, $homeUrl );
		}

		return $this->buildLink( home_url(), $name );
	}

	/**
	 * Returns a link to the current post with the post title as anchor text.
	 *
	 * @since 3.7.0
	 *
	 * @return string The post link.
	 */
	private function postLink() {
		$post = get_post();
		if ( ! $post || ! $post->post_title ) {
			$permalink = get_permalink();
			return $this->buildLink( $permalink, $permalink );
		}

		return $this->buildLink( get_permalink(), $post->post_title );
	}

	/**
	 * Returns a link to the archive of the author of a given post with the author name as anchor text.
	 *
	 * @since 3.7.0
	 *
	 * @return string The author archive link.
	 */
	private function authorLink() {
		$post = get_post();
		if ( ! $post || ! $post->post_author ) {
			return '';
		}

		$name = get_the_author_meta( 'display_name', $post->post_author );
		if ( ! $name ) {
			$authorUrl = get_author_posts_url( $post->post_author );
			return $this->buildLink( $authorUrl, $authorUrl );
		}
		return $this->buildLink( get_author_posts_url( $post->post_author ), $name );
	}

	/**
	 * Builds the link element.
	 * 
	 * Acts as a helper function for siteLink(), postLink() and authorLink().
	 *
	 * @param  string $url        The URL.
	 * @param  string $anchorText The anchor text.
	 * @return string             The link element.
	 */
	private function buildLink( $url, $anchorText ) {
		return sprintf(
			'<a href="%1$s" target="_blank">%2$s</a>',
			trailingslashit( $url ),
			$anchorText
		);
	}
}
