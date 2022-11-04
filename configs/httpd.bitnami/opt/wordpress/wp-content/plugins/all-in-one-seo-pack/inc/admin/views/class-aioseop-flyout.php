<?php
/**
 * AIOSEOP_FLyout
 *
 * @package All-in-One-SEO-Pack
 * @since 3.4.0
 */

/**
 * Handles our flyout menu.
 *
 * @since
 */
class AIOSEOP_Flyout {

	/**
	 * Initializes the code.
	 *
	 * @since 3.4.0
	 */
	public static function init() {
		if ( ! is_admin() ) {
			return;
		}

		if ( ! apply_filters( 'aioseop_admin_flyout_menu', true ) ) {
			return;
		}

		add_action( 'admin_enqueue_scripts', array( 'AIOSEOP_Flyout', 'enqueue_files' ) );
		add_action( 'admin_footer', array( 'AIOSEOP_Flyout', 'output_flyout_menu' ) );
	}

	/**
	 * Enqueues the required files.
	 *
	 * @since 3.4.0
	 */
	public static function enqueue_files() {
		if ( ! in_array( get_current_screen()->id, aioseop_get_admin_screens() ) ) {
			return;
		}

		wp_enqueue_style(
			'aioseop-flyout',
			AIOSEOP_PLUGIN_URL . 'css/admin/aioseop-flyout.css',
			array(),
			AIOSEOP_VERSION
		);

		wp_enqueue_script(
			'aioseop-flyout',
			AIOSEOP_PLUGIN_URL . 'js/admin/aioseop-flyout.js',
			array(),
			AIOSEOP_VERSION,
			false
		);
	}

	/**
	 * Outputs our flyout menu.
	 *
	 * @since 3.4.0
	 */
	public static function output_flyout_menu() {
		if ( ! in_array( get_current_screen()->id, aioseop_get_admin_screens() ) ) {
			return;
		}

		printf(
			'<div id="aioseop-flyout">
				<div id="aioseop-flyout-items">
					%1$s
				</div>
				<a href="#" class="aioseop-flyout-button aioseop-flyout-head">
					<div class="aioseop-flyout-label">%2$s</div>
					<img src="%3$s" alt="%2$s" data-active="%4$s" />
				</a>
			</div>',
			self::get_items_html(), // phpcs:ignore
			esc_attr__( 'See Quick Links', 'all-in-one-seo-pack' ),
			esc_url( AIOSEOP_PLUGIN_URL . 'images/flyout/gear-default.png' ),
			esc_url( AIOSEOP_PLUGIN_URL . 'images/flyout/gear-default.png' )
		);
	}

	/**
	 * Returns the HTML markup for our flyout menu items.
	 *
	 * @since 3.4.0
	 *
	 * @return string $items_html
	 */
	private static function get_items_html() {

		$items      = array_reverse( self::menu_items() );
		$items_html = '';

		foreach ( $items as $item_key => $item ) {
			$items_html .= sprintf(
				'<a href="%1$s" target="_blank" rel="noopener noreferrer" class="aioseop-flyout-button aioseop-flyout-item aioseop-flyout-item-%2$d"%5$s%6$s>
					<div class="aioseop-flyout-label">%3$s</div>
                    <img src="' . AIOSEOP_PLUGIN_URL . 'images/flyout/' . $item['icon'] . '.svg"/>
				</a>',
				esc_url( $item['url'] ),
				(int) $item_key,
				esc_html( $item['title'] ),
				sanitize_html_class( $item['icon'] ),
				! empty( $item['bgcolor'] ) ? ' style="background-color: ' . esc_attr( $item['bgcolor'] ) . '"' : '',
				! empty( $item['hover_bgcolor'] ) ? ' onMouseOver="this.style.backgroundColor=\'' . esc_attr( $item['hover_bgcolor'] ) . '\'" onMouseOut="this.style.backgroundColor=\'' . esc_attr( $item['bgcolor'] ) . '\'"' : ''
			);
		}

		return $items_html;
	}

	/**
	 * Returns a list of items for our flyout menu.
	 *
	 * @since 3.4.0
	 *
	 * @return array
	 */
	private static function menu_items() {
		$medium       = ( AIOSEOPPRO ) ? 'proplugin' : 'liteplugin';
		$utm_campaign = 'flyout-menu';

		$items = array(
			array(
				'title'         => sprintf( __( 'Upgrade to All in One SEO Pack Pro', 'all-in-one-seo-pack' ), AIOSEOP_PLUGIN_NAME . '&nbsp;Pro' ),
				'url'           => aioseop_get_utm_url( $utm_campaign, 'WordPress', $medium ) . '&utm_content=Upgrade',
				'icon'          => 'star-solid',
				'bgcolor'       => '#E1772F',
				'hover_bgcolor' => '#ff8931',
			),
			array(
				'title' => esc_html__( 'Support & Docs', 'all-in-one-seo-pack' ),
				'url'   => 'https://semperplugins.com/documentation/?utm_source=WordPress&utm_medium=' . $medium . '&utm_campaign=' . $utm_campaign . '&utm_content=Support',
				'icon'  => 'life-ring-regular',
			),
			array(
				'title' => esc_html__( 'Join Our Community', 'all-in-one-seo-pack' ),
				'url'   => 'https://www.facebook.com/groups/wpbeginner/',
				'icon'  => 'comments-solid',
			),
			array(
				'title' => esc_html__( 'Suggest a Feature', 'all-in-one-seo-pack' ),
				'url'   => 'https://semperplugins.com/suggest-a-feature/?utm_source=WordPress&utm_medium=' . $medium . '&utm_campaign=' . $utm_campaign . '&utm_content=Feature',
				'icon'  => 'lightbulb-regular',
			),
		);

		if ( AIOSEOPPRO ) {
			array_shift( $items );
		}

		return $items;
	}
}
