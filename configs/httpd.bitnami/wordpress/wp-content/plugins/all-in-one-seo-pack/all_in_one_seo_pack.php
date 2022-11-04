<?php
/*
Plugin Name: All In One SEO Pack
Plugin URI: https://semperplugins.com/all-in-one-seo-pack-pro-version/
Description: Out-of-the-box SEO for WordPress. Features like XML Sitemaps, SEO for custom post types, SEO for blogs or business sites, SEO for ecommerce sites, and much more. More than 50 million downloads since 2007.
Version: 3.7.1
Author: All in One SEO Team
Author URI: https://semperplugins.com/all-in-one-seo-pack-pro-version/
Text Domain: all-in-one-seo-pack
Domain Path: /i18n/
*/

/*
Copyright (C) 2007-2020 All in One SEO, https://semperplugins.com

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; version 2 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

if ( ! defined( 'ABSPATH' ) ) {
	return;
}

if ( ! defined( 'AIOSEO_PLUGIN_DIR' ) ) {
	/**
	 * Plugin Directory
	 *
	 * @since 3.4
	 *
	 * @var string $AIOSEOP_PLUGIN_DIR Plugin folder directory path. Eg. `C:\WebProjects\UW-WPDev-aioseop\src-plugins/all-in-one-seo-pack/`
	 */
	define( 'AIOSEO_PLUGIN_DIR', dirname( __FILE__ ) );
}

if ( ! defined( 'AIOSEO_PLUGIN_FILE' ) ) {

	/**
	 * Plugin File
	 *
	 * @since 3.4
	 *
	 * @var string $AIOSEOP_PLUGIN_FILE Plugin folder directory path. Eg. `C:\WebProjects\UW-WPDev-aioseop\src-plugins/all-in-one-seo-pack/`
	 */
	define( 'AIOSEO_PLUGIN_FILE', __FILE__ );
}

if ( ! class_exists( 'AIOSEOP_Core' ) ) {
	require_once plugin_dir_path( __FILE__ ) . 'class-aioseop-core.php';
	global $aioseop_core;
	if ( is_null( $aioseop_core ) ) {
		$aioseop_core = new AIOSEOP_Core();
	}
}
