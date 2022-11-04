<?php
/**
 * Default Notice Template.
 *
 * @since 3.0
 *
 * @see AIOSEOP_Notice::display_notice_default();
 * @uses $notice in AIOSEOP_Notice::notices
 * @package All-in-One-SEO-Pack
 * @subpackage AIOSEOP_Notices
 */

// $notice = $this->notices[ $a_notice_slug ];
$notice_class = 'notice-info';
if ( isset( $notice['class'] ) && ! empty( $notice['class'] ) ) {
	$notice_class = $notice['class'];
}

add_filter( 'safe_style_css', 'aioseop_filter_styles' );

$dismissible = ! isset( $notice['dismissible'] ) || $notice['dismissible'] ? ' is-dismissible' : '';

?>
<div class="notice <?php echo esc_attr( $notice_class ); ?><?php echo $dismissible; ?> aioseop-notice-container aioseop-notice-<?php echo esc_attr( $notice['slug'] ); ?>">
	<?php if ( ! empty( $notice['html'] ) ) : ?>
		<?php
		echo wp_kses(
			$notice['html'],
			array(
				'br'     => array(),
				'div'    => array(
					'class' => true,
					'style' => true,
				),
				'p'      => array(),
				'strong' => array(),
				'a'      => array(
					'href'   => true,
					'class'  => true,
					'data-*' => true,
					'target' => true,
					'rel'    => true,
				),
				'style'  => array(),
				'script' => array(
					'type' => true,
				),
				'ul'     => array(
					'class' => true,
				),
				'li'     => array(),
			)
		);
		?>
	<?php else : ?>
		<p><?php echo esc_html( $notice['message'] ); ?></p>
	<?php endif; ?>
	<p class="aioseo-action-buttons">
		<?php foreach ( $notice['action_options'] as $key => $action_option ) : ?>
			<?php
			$link   = $action_option['link'];
			$id     = 'aioseop-notice-delay-' . $notice['slug'] . '-' . $key;
			$class  = '';
			$class .= 'aioseop-delay-' . $key;
			$class .= ' ' . $action_option['class'];
			?>
			<a 
				href="<?php echo esc_url( $link ); ?>" 
				id="<?php echo esc_attr( $id ); ?>" 
				class="aioseop-notice-delay <?php echo esc_attr( $class ); ?>"
				<?php
				if ( isset( $action_option['new_tab'] ) && $action_option['new_tab'] ) {
					echo 'target="_blank" rel="noopener"';}
				?>
				>
				<?php echo esc_textarea( $action_option['text'] ); ?>
			</a>
		<?php endforeach; ?>
	</p>
</div>
