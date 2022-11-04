<?php
/**
 * Remote Notice Template.
 *
 * @since 3.6.0
 *
 * @see AIOSEOP_Notice::display_remote_notice();
 * @uses $remote_notice in AIOSEOP_Notice::remote_notices
 * @package All-in-One-SEO-Pack
 * @subpackage AIOSEOP_Notices
 */

$notice_class = 'info';
if ( isset( $remote_notice['notification_type'] ) && ! empty( $remote_notice['notification_type'] ) ) {
	$notice_class = $remote_notice['notification_type'];
}

add_filter( 'safe_style_css', 'aioseop_filter_styles' );

$dismissible = ! isset( $remote_notice['dismissible'] ) || $remote_notice['dismissible'] ? ' is-dismissible' : '';

?>
<div class="notice notice-<?php echo esc_attr( $notice_class ); ?><?php echo $dismissible; ?> aioseop-notice-container aioseop-remote-notice-<?php echo esc_attr( $remote_notice['id'] ); ?>">
	<h3><?php echo esc_html( $remote_notice['title'] ); ?></h3>
	<p><?php echo wp_kses_post( $remote_notice['content'] ); ?></p>
    <?php if ( isset( $remote_notice['btns'] ) ) : ?>
        <p class="aioseo-action-buttons">
            <?php foreach ( $remote_notice['btns'] as $btn_slug => $btn ) : ?>
                <?php
                $link      = $btn['url'];
                $id        = 'aioseop-remote-notice-btn-' . $remote_notice['id'] . '-' . $btn_slug;
                $btn_class = ( 'main' === $btn_slug ) ? 'button-primary' : 'button-secondary';
                $class     = "aioseop-remote-notice-btn {$btn_class}";

                $homeUrl = home_url();
                preg_match( "#$homeUrl.*#", $link, $ownDomain );
                preg_match( "#.*?doNotDismiss=true.*#", $link, $noDismiss );
                ?>
                <a
                    href="<?php echo esc_url( $link ); ?>"
                    id="<?php echo esc_attr( $id ); ?>"
                    class="aioseop-notice-delay <?php echo esc_attr( $class ); ?>"
                    <?php if ( $noDismiss ) echo 'data-dismiss="false"'?>
                    <?php if ( ! $ownDomain ) echo 'target="_blank"'; ?>
                >
                    <?php echo esc_textarea( $btn['text'] ); ?>
                </a>
            <?php endforeach; ?>
        </p>
    <?php endif; ?>
</div>
