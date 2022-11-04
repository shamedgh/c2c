<?php
// phpcs:ignoreFile
require_once AIOSEOP_PLUGIN_DIR . 'inc/admin/helpers/PluginSilentUpgraderSkin.php';

/**
 * @since   3.4.0
 */
class AIOSEOP_Install_Skin extends PluginSilentUpgraderSkin {

	/**
	 * @since   3.4.0
	 */
	public function error( $errors ) {

		if ( ! empty( $errors ) ) {
			wp_send_json_error( $errors );
		}
	}
}
