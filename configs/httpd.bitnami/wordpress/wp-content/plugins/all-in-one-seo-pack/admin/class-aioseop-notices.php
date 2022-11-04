<?php
/**
 * AIOSEOP Notice API: AIOSEOP Notice Class
 *
 * Handles adding, updating, and removing notices. Then handles activating or
 * deactivating those notices site-wide or user based.
 *
 * @link https://wordpress.org/plugins/all-in-one-seo-pack/
 *
 * @package All_in_One_SEO_Pack
 * @since 3.0
 */

if ( ! class_exists( 'AIOSEOP_Notices' ) ) {
	/**
	 * AIOSEOP Notice.
	 *
	 * Admin notices for AIOSEOP.
	 *
	 * @since 3.0
	 */
	class AIOSEOP_Notices {
		/**
		 * Collection of notices to display.
		 *
		 * @since 3.0
		 * @access public
		 *
		 * @var array $notices {
		 *     @type array $slug {
		 *         -- Server Variables --
		 *         @type string $slug        Required. Notice unique ID.
		 *         @type int    $time_start  The time the notice was added to the object.
		 *         @type int    $time_set    Set when AJAX/Action_Option was last used to delay time. Primarily for PHPUnit tests.
		 *
		 *         -- Filter Function Variables --
		 *         @type int    $delay_time  Amount of time to begin showing message.
		 *         @type string $message     Content message to display in the container.
		 *         @type array  $action_option {
		 *         Show options for users to click on. Default: See self::action_option_defaults().
		 *             @type array {
		 *                 @type int     $time    Optional. The amount of time to delay. Zero immediately displays Default: 0.
		 *                 @type string  $text    Optional. Button/Link HTML text to display. Default: ''.
		 *                 @type string  $class   Optional. Class names to add to the link/button for styling. Default: ''.
		 *                 @type string  $link    Optional. The elements href source/link. Default: '#'.
		 *                 @type boolean $dismiss Optional. Variable for AJAX to dismiss showing a notice.
		 *             }
		 *         }
		 *         @type string $class       The class notice used by WP, or a custom CSS class.
		 *                                   Ex. notice-error, notice-warning, notice-success, notice-info.
		 *         @type string $target      Shows based on site-wide or user notice data.
		 *         @todo string $perms       Displays based on user-role/permissions.
		 *         @type array  $screens     Which screens to exclusively display the notice on. Default: array().
		 *                                   array()          = all,
		 *                                   array('aioseop') = $this->aioseop_screens,
		 *                                   array('CUSTOM')  = specific screen(s).
		 *     }
		 * }
		 */
		public $notices = array();

		/**
		 * Collection of remote notices.
		 *
		 * @since 3.6.0
		 *
		 * @var array $remote_notices => {
		 *     @type array $id => {
		 *         @type int    $id                Notice ID
		 *         @type string $title             The notification title.
		 *         @type string $content           Content of notification.
		 *         @type array  $type              License levels/type.
		 *         @type array  $btns              Notice buttons.
		 *         @type string $start             Time/Date to show notification.
		 *         @type string $end               Time/Date to hide notification.
		 *         @type string $notification_type Notification type class.
		 *     }
		 * }
		 */
		public $remote_notices = array();

		/**
		 * Source of remote notifications.
		 *
		 * @since 3.6.0
		 *
		 * @var string
		 */
		public $remote_url = 'https://plugin-cdn.aioseo.com/wp-content/notifications.json';

		/**
		 * List of notice slugs that are currently active.
		 * NOTE: Amount is reduced by 1 second in order to display at exactly X amount of time.
		 *
		 * @todo Change name to $display_times for consistancy both conceptually and with usermeta structure.
		 *
		 * @since 3.0
		 * @access public
		 *
		 * @var array $active_notices {
		 *     @type string|int $slug => $display_time Contains the current active notices
		 *                                             that are scheduled to be displayed.
		 * }
		 */
		public $active_notices = array();

		/**
		 * Dismissed Notices
		 *
		 * Stores notices that have been dismissed sitewide. Users are stored in usermeta data 'aioseop_notice_dismissed_{$slug}'.
		 *
		 * @since 3.0
		 *
		 * @var array $dismissed_notices {
		 *     @type boolean $notice_slug => $is_dismissed True if dismissed.
		 * }
		 */
		public $dismissed_notices = array();

		/**
		 * The default dismiss time. An anti-nag setting.
		 *
		 * @var int $default_dismiss_delay
		 */
		private $default_dismiss_delay = 315569260; // 10 years

		/**
		 * List of Screens used in AIOSEOP.
		 *
		 * @since 3.0
		 *
		 * @var array $aioseop_screens {
		 *     @type string Screen ID.
		 * }
		 */
		private $aioseop_screens = array();

		/**
		 * List of screens that should be excluded.
		 *
		 * @var array
		 *
		 * @since 3.4.0
		 */
		private $excluded_screens = array(
			'About Us' => 'all-in-one-seo_page_aioseop-about',
		);

		/**
		 * __constructor.
		 *
		 * @since 3.0
		 */
		public function __construct() {
			$this->_requires();
			$this->obj_load_options();

			if ( current_user_can( 'aiosp_manage_seo' ) ) {
				$this->aioseop_screens = aioseop_get_admin_screens();

				add_action( 'admin_init', array( $this, 'init' ) );
				add_action( 'current_screen', array( $this, 'admin_screen' ) );
			}

			add_action( 'aioseop_cron_check_remote_notices', array( $this, 'cron_check_remote_notices' ) );
		}

		/**
		 * _Requires
		 *
		 * Internal use only. Additional files required.
		 *
		 * @since 3.0
		 */
		private function _requires() {
			$this->autoload_notice_files();
		}

		/**
		 * Autoload Notice Files
		 *
		 * @since 3.0
		 *
		 * @see DirectoryIterator class
		 * @link https://php.net/manual/en/class.directoryiterator.php
		 * @see StackOverflow for getting all filenamess in a directory.
		 * @link https://stackoverflow.com/a/25988433/1376780
		 */
		private function autoload_notice_files() {
			foreach ( new DirectoryIterator( AIOSEOP_PLUGIN_DIR . 'admin/display/notices/' ) as $file ) {
				$extension = pathinfo( $file->getFilename(), PATHINFO_EXTENSION );
				if ( $file->isFile() && 'php' === $extension ) {
					$filename = $file->getFilename();

					// Qualified file pattern; "*-notice.php".
					// Prevents any malicious files that may have spreaded.
					if ( array_search( 'notice', explode( '-', str_replace( '.php', '', $filename ) ), true ) ) {
						include_once AIOSEOP_PLUGIN_DIR . 'admin/display/notices/' . $filename;
					}
				}
			}
		}

		/**
		 * Early operations required by the plugin.
		 *
		 * AJAX requires being added early before screens have been loaded.
		 *
		 * @since 3.0
		 */
		public function init() {
			add_action( 'wp_ajax_aioseop_notice', array( $this, 'ajax_notice_action' ) );
			add_action( 'wp_ajax_aioseop_remote_notice', array( $this, 'ajax_remote_notice_action' ) );

			if ( ! wp_next_scheduled( 'aioseop_cron_check_remote_notices' ) ) {
				wp_schedule_event( time(), 'daily', 'aioseop_cron_check_remote_notices' );
			}
		}

		/**
		 * Check Remote Notices.
		 *
		 * @since 3.6.0
		 */
		public function cron_check_remote_notices() {
			$remote_notices = $this->get_remote_notices();

			// Replace existing notices in case they were updated.
			for ( $i = 0; $i < count( $this->remote_notices ); $i++ ) {
				foreach ( $remote_notices as $remote_notice ) {
					if ( $this->remote_notices[ $i ]['id'] === $remote_notice['id'] ) {
						unset( $this->remote_notices[ $i ] );
					}
				}
			}

			$this->remote_notices = array_merge( $this->remote_notices, $remote_notices );

			$this->obj_update_options();
		}

		/**
		 * Get Remote URL.
		 *
		 * Checks is a constant is defined (dev purposes), if not, then use URL in `$this->remote_url`.
		 *
		 * @since 3.6.0
		 *
		 * @return string
		 */
		public function get_remote_url() {
			if ( defined( 'AIOSEO_NOTIFICATIONS_URL' ) ) {
				return AIOSEO_NOTIFICATIONS_URL;
			}

			return $this->remote_url;
		}

		/**
		 * Get Remote Notices.
		 *
		 * @since 3.6.0
		 *
		 * @return array
		 */
		private function get_remote_notices() {
			$res = wp_remote_get( $this->get_remote_url() );

			if ( is_wp_error( $res ) ) {
				return array();
			}

			$body = wp_remote_retrieve_body( $res );

			if ( empty( $body ) ) {
				return array();
			}

			return $this->validate_remote_notices( json_decode( $body, true ) );
		}

		/**
		 * Validate Remote Notices.
		 *
		 * @since 3.6.0
		 *
		 * @param $remote_notices
		 * @return array
		 */
		private function validate_remote_notices( $remote_notices ) {
			if ( ! is_array( $remote_notices ) || empty( $remote_notices ) ) {
				return array();
			}

			$data        = array();
			$obj_options = $this->obj_get_options();
			foreach ( $remote_notices as $remote_notice ) {
				// Invalid notice if required variables have no value.
				if (
						empty( $remote_notice['content'] ) ||
						empty( $remote_notice['type'] )
				) {
					continue;
				}

				// If no 'start' time exists, set start to current time.
				if ( ! isset( $remote_notice['start'] ) || empty( $remote_notice['start'] ) ) {
					$remote_notice['start'] = date( 'Y-m-d H:i:s' );
				}
				// Skip if already expired.
				if ( ! empty( $remote_notice['end'] ) && time() > strtotime( $remote_notice['end'] ) ) {
					continue;
				}

				// Skip if already dismissed.
				if ( in_array( 'remote_' . $remote_notice['id'], array_keys( $obj_options['dismissed_notices'] ) ) ) {
					continue;
				}

				// Store notice if version matches.
				if ( $this->version_match( AIOSEOP_VERSION, $remote_notice['type'] ) ) {
					$data[ 'remote_' . $remote_notice['id'] ] = $remote_notice;
					continue;
				}

				// Store notice if plan matches.
				if ( AIOSEOPPRO ) {
					if (
						'pro' === $remote_notice['type'] ||
						in_array( $this->get_license_plan(), $remote_notice['type'], true )
					) {
						$data[ 'remote_' . $remote_notice['id'] ] = $remote_notice;
					}
				} else {
					if ( 'lite' === $remote_notice['type'] ) {
						$data[ 'remote_' . $remote_notice['id'] ] = $remote_notice;
					}
				}
			}
			return $data;
		}

		/**
		 * Get License Level.
		 *
		 * @since 3.6.0
		 *
		 * @return string Type of license level being used.
		 */
		public function get_license_plan() {
			global $aioseop_options;

			if ( ! isset( $aioseop_options['plan'] ) || empty( $aioseop_options['plan'] ) ) {
				return AIOSEOPPRO ? 'unlicensed' : 'lite';
			}
			return $aioseop_options['plan'];
		}

		/**
		 * Version Compare.
		 *
		 * @since 3.6.0
		 *
		 * @param string       $current_version The current version being used.
		 * @param string|array $compare_version The version to compare with.
		 * @return bool
		 */
		public function version_match( $current_version, $compare_version ) {
			if ( is_array( $compare_version ) ) {
				foreach ( $compare_version as $compare_single ) {
					$recursive_result = $this->version_match( $current_version, $compare_single );
					if ( $recursive_result ) {
						return true;
					}
				}

				return false;
			}

			$current_parse = explode( '.', $current_version );

			if ( strpos( $compare_version, '-' ) ) {
				$compare_parse = explode( '-', $compare_version );
			} elseif ( strpos( $compare_version, '.' ) ) {
				$compare_parse = explode( '.', $compare_version );
			} else {
				return false;
			}

			$current_count = count( $current_parse );
			$compare_count = count( $compare_parse );
			for ( $i = 0; $i < $current_count || $i < $compare_count; $i++ ) {
				if ( isset( $compare_parse[ $i ] ) && 'x' === strtolower( $compare_parse[ $i ] ) ) {
					unset( $compare_parse[ $i ] );
				}

				if ( ! isset( $current_parse[ $i ] ) ) {
					unset( $compare_parse[ $i ] );
				} elseif ( ! isset( $compare_parse[ $i ] ) ) {
					unset( $current_parse[ $i ] );
				}
			}

			foreach ( $compare_parse as $index => $sub_number ) {
				if ( $current_parse[ $index ] !== $sub_number ) {
					return false;
				}
			}

			return true;
		}

		/**
		 * Setup/Init Admin Screen
		 *
		 * Adds the initial actions to WP based on the Admin Screen being loaded.
		 * The AIOSEOP and Other Screens have separate methods that are used, and
		 * additional screens can be made exclusive/unique.
		 *
		 * @since 3.0
		 *
		 * @param WP_Screen $current_screen The current screen object being loaded.
		 */
		public function admin_screen( $current_screen ) {
			$this->deregister_scripts();
			if ( isset( $current_screen->id ) && in_array( $current_screen->id, $this->aioseop_screens, true ) ) {
				// AIOSEO Notice Content.
				add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
				add_action( 'all_admin_notices', array( $this, 'display_notice_aioseop' ) );
				add_action( 'all_admin_notices', array( $this, 'display_remote_notice' ) );
			} elseif ( isset( $current_screen->id ) ) {
				// Default WP Notice.
				add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
				add_action( 'all_admin_notices', array( $this, 'display_notice_default' ) );
			}
		}

		/**
		 * Load AIOSEOP_Notice Options
		 *
		 * Gets the options for AIOSEOP_Notice to set its variables to.
		 *
		 * @since 3.0
		 * @access private
		 *
		 * @see self::notices
		 * @see self::active_notices
		 */
		private function obj_load_options() {
			$notices_options = $this->obj_get_options();

			$this->notices           = $notices_options['notices'];
			$this->remote_notices    = $this->validate_remote_notices( $notices_options['remote_notices'] );
			$this->active_notices    = $notices_options['active_notices'];
			$this->dismissed_notices = $notices_options['dismissed_notices'];
		}

		/**
		 * Get AIOSEOP_Notice Options
		 *
		 * @since 3.0
		 * @access private
		 *
		 * @return array
		 */
		private function obj_get_options() {
			$defaults = array(
				'notices'           => array(),
				'remote_notices'    => array(),
				'active_notices'    => array(),
				'dismissed_notices' => array(),
			);

			// Prevent old data from being loaded instead.
			// Some notices are instant notifications.
			wp_cache_delete( 'aioseop_notices', 'options' );
			$notices_options = get_option( 'aioseop_notices' );
			if ( false === $notices_options ) {
				return $defaults;
			}

			return wp_parse_args( $notices_options, $defaults );
		}

		/**
		 * Update Notice Options
		 *
		 * @since 3.0
		 * @access private
		 *
		 * @return boolean True if successful, using update_option() return value.
		 */
		private function obj_update_options() {
			$notices_options     = array(
				'notices'           => $this->notices,
				'remote_notices'    => $this->remote_notices,
				'active_notices'    => $this->active_notices,
				'dismissed_notices' => $this->dismissed_notices,
			);
			$old_notices_options = $this->obj_get_options();
			$notices_options     = wp_parse_args( $notices_options, $old_notices_options );

			// Prevent old data from being loaded instead.
			// Some notices are instant notifications.
			wp_cache_delete( 'aioseop_notices', 'options' );
			return update_option( 'aioseop_notices', $notices_options, false );
		}

		/**
		 * Notice Default Values
		 *
		 * Returns the default value for a variable to be used in self::notices[].
		 *
		 * @since 3.0
		 *
		 * @see AIOSEOP_Notices::notices Array variable that stores the collection of notices.
		 *
		 * @return array Notice variable in self::notices.
		 */
		public function notice_defaults() {
			return array_merge(
				$this->notice_defaults_server(),
				$this->notice_defaults_file()
			);
		}

		/**
		 * Notice Defaults Server
		 *
		 * @since 3.0
		 *
		 * @return array
		 */
		public function notice_defaults_server() {
			return array(
				'slug'       => '',
				'time_start' => time(),
				'time_set'   => time(),
			);
		}

		/**
		 * Notice Defaults File
		 *
		 * @since 3.0
		 *
		 * @return array
		 */
		public function notice_defaults_file() {
			return array(
				'slug'           => '',
				'delay_time'     => 0,
				'message'        => '',
				'action_options' => array(),
				'class'          => 'notice-info',
				'target'         => 'site',
				'screens'        => array(),
			);
		}

		/**
		 * Action Options Default Values
		 *
		 * Returns the default value for action_options in self::notices[$slug]['action_options'].
		 *
		 * @since 3.0
		 *
		 * @return array Action_Options variable in self::notices[$slug]['action_options'].
		 */
		public function action_options_defaults() {
			return array(
				'time'    => 0,
				'text'    => __( 'Dismiss', 'all-in-one-seo-pack' ),
				'link'    => '#',
				'new_tab' => true,
				'dismiss' => true,
				'class'   => '',
			);
		}

		/**
		 * Add Notice
		 *
		 * Takes notice and adds it to object and saves to database.
		 *
		 * @since 3.0
		 *
		 * @param array $notice See self::notices for more info.
		 * @return boolean True on success.
		 */
		public function add_notice( $notice = array() ) {
			if ( empty( $notice['slug'] ) || isset( $this->notices[ $notice['slug'] ] ) ) {
				return false;
			}

			$this->notices[ $notice['slug'] ] = $this->prepare_notice( $notice );

			return true;
		}

		/**
		 * Prepare Insert/Undate Notice
		 *
		 * @since 3.0
		 *
		 * @param array $notice The notice to prepare with the database.
		 * @return array
		 */
		public function prepare_notice( $notice = array() ) {
			$notice_default = $this->notice_defaults_server();
			$notice         = wp_parse_args( $notice, $notice_default );

			$new_notice = array();
			foreach ( $notice_default as $key => $value ) {
				$new_notice[ $key ] = $notice[ $key ];
			}

			return $new_notice;
		}

		/**
		 * Used strictly for any notices that are deprecated/obsolete. To stop notices,
		 * use notice_deactivate().
		 *
		 * @since 3.0
		 *
		 * @param string $slug Unique notice slug.
		 * @return boolean True if successfully removed.
		 */
		public function remove_notice( $slug ) {
			if ( isset( $this->notices[ $slug ] ) ) {
				$this->deactivate_notice( $slug );
				unset( $this->notices[ $slug ] );
				$this->obj_update_options();
				return true;
			}

			return false;
		}

		/**
		 * Activate Notice
		 *
		 * Activates a notice, or Re-activates with a new display time. Used after
		 * updating a notice that requires a hard reset.
		 *
		 * @since 3.0
		 *
		 * @param string $slug Notice slug.
		 * @return boolean
		 */
		public function activate_notice( $slug ) {
			if ( empty( $slug ) ) {
				return false;
			}
			$notice = $this->get_notice( $slug );
			if ( 'site' === $notice['target'] && isset( $this->active_notices[ $slug ] ) ) {
				return true;
			} elseif ( 'user' === $notice['target'] && get_user_meta( get_current_user_id(), 'aioseop_notice_display_time_' . $slug, true ) ) {
				return true;
			}

			if ( ! isset( $this->notices[ $slug ] ) ) {
				$this->add_notice( $notice );
			}

			$this->set_notice_delay( $slug, $notice['delay_time'] );

			$this->obj_update_options();

			return true;
		}

		/**
		 * Deactivate Notice
		 *
		 * Deactivates a notice set as active and completely removes it from the
		 * list of active notices. Used to prevent conflicting notices that may be
		 * active at any given point in time.
		 *
		 * @since 3.0
		 *
		 * @param string $slug Notice slug.
		 * @return boolean
		 */
		public function deactivate_notice( $slug ) {
			if ( ! isset( $this->active_notices[ $slug ] ) ) {
				return false;
			} elseif ( ! isset( $this->notices[ $slug ] ) ) {
				return false;
			}

			delete_metadata(
				'user',
				0,
				'aioseop_notice_display_time_' . $slug,
				'',
				true
			);
			unset( $this->active_notices[ $slug ] );
			$this->obj_update_options();

			return true;
		}

		/**
		 * Reset Notice
		 *
		 * @since 3.0
		 *
		 * @param string $slug The notice's slug.
		 * @return bool
		 */
		public function reset_notice( $slug ) {
			if (
					empty( $slug ) ||
					(
							! isset( $this->notices[ $slug ] ) &&
							! get_user_meta( get_current_user_id(), 'aioseop_notice_display_time_' . $slug, true ) &&
							! get_user_meta( get_current_user_id(), 'aioseop_notice_dismissed_' . $slug, true )
					)
			) {
				return false;
			}

			$notice = $this->get_notice( $slug );

			unset( $this->active_notices[ $slug ] );
			unset( $this->dismissed_notices[ $slug ] );
			delete_metadata(
				'user',
				0,
				'aioseop_notice_time_set_' . $slug,
				'',
				true
			);
			delete_metadata(
				'user',
				0,
				'aioseop_notice_display_time_' . $slug,
				'',
				true
			);
			delete_metadata(
				'user',
				0,
				'aioseop_notice_dismissed_' . $slug,
				'',
				true
			);

			$this->set_notice_delay( $slug, $notice['delay_time'] );

			$this->obj_update_options();

			return true;
		}

		/**
		 * Set Notice Delay
		 *
		 * @since 3.0
		 *
		 * @param string $slug       The notice's slug.
		 * @param int    $delay_time Amount of time to delay.
		 * @return boolean
		 */
		public function set_notice_delay( $slug, $delay_time ) {
			if ( empty( $slug ) ) {
				return false;
			}
			$time_set = time();

			// Display at exactly X time, not (X + 1) time.
			$display_time = $time_set + $delay_time - 1;
			$notice       = $this->get_notice( $slug );
			if ( 'user' === $notice['target'] ) {
				$current_user_id = get_current_user_id();

				update_user_meta( $current_user_id, 'aioseop_notice_time_set_' . $slug, $time_set );
				update_user_meta( $current_user_id, 'aioseop_notice_display_time_' . $slug, $display_time );
			}

			$this->notices[ $slug ]['time_set']   = $time_set;
			$this->notices[ $slug ]['time_start'] = $display_time;
			$this->active_notices[ $slug ]        = $display_time;

			return true;
		}

		/**
		 * Set Notice Dismiss
		 *
		 * @since 3.0
		 *
		 * @param string  $slug    The notice's slug.
		 * @param boolean $dismiss Sets to dismiss a notice.
		 */
		public function set_notice_dismiss( $slug, $dismiss ) {
			$notice = $this->get_notice( $slug );
			if ( 'site' === $notice['target'] ) {
				$this->dismissed_notices[ $slug ] = $dismiss;
			} elseif ( 'user' === $notice['target'] ) {
				$current_user_id = get_current_user_id();

				update_user_meta( $current_user_id, 'aioseop_notice_dismissed_' . $slug, $dismiss );
			}
		}

		/**
		 * Get Notice
		 *
		 * @since 3.0
		 *
		 * @param string $slug The notice's slug.
		 * @return array
		 */
		public function get_notice( $slug ) {
			// Set defaults for notice.
			$rtn_notice = $this->notice_defaults();

			if ( isset( $this->notices[ $slug ] ) ) {
				// Get minimized (database) data.
				$rtn_notice = array_merge( $rtn_notice, $this->notices[ $slug ] );
			}

			/**
			 * Admin Notice {$slug}
			 *
			 * Applies the notice data values for a given notice slug.
			 * `aioseop_admin_notice-{$slug}` with the slug being the individual notice.
			 *
			 * @since 3.0
			 *
			 * @params array $notice_data See `\AIOSEOP_Notices::$notices` for structural documentation.
			 */
			$notice_data = apply_filters( 'aioseop_admin_notice-' . $slug, array() ); // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores

			if ( ! empty( $notice_data ) ) {
				$rtn_notice = array_merge( $rtn_notice, $notice_data );

				foreach ( $rtn_notice['action_options'] as &$action_option ) {
					// Set defaults for `$notice['action_options']`.
					$action_option = array_merge( $this->action_options_defaults(), $action_option );
				}
			}

			return $rtn_notice;
		}

		/*** DISPLAY Methods **************************************************/
		/**
		 * Deregister Scripts
		 *
		 * Initial Admin Screen action to remove aioseop script(s) from all screens;
		 * which will be registered if executed on screen.
		 * NOTE: As of 3.0, most of it is default layout, styling, & scripting
		 * that is loaded on all pages. Which can later be different.
		 *
		 * @since 3.0
		 * @access private
		 *
		 * @see self::admin_screen()
		 */
		private function deregister_scripts() {
			wp_deregister_script( 'aioseop-admin-notice-js' );
			wp_deregister_style( 'aioseop-admin-notice-css' );
		}

		/**
		 * (Register) Enqueue Scripts
		 *
		 * Used to register, enqueue, and localize any JS data. Styles can later be added.
		 *
		 * @since 3.0
		 */
		public function admin_enqueue_scripts() {
			// Register.
			wp_register_script(
				'aioseop-admin-notice-js',
				AIOSEOP_PLUGIN_URL . 'js/admin-notice.js',
				array( 'jquery' ),
				AIOSEOP_VERSION,
				true
			);

			// Localization.
			$notice_actions = array();
			foreach ( $this->active_notices as $notice_slug => $notice_display_time ) {
				$notice = $this->get_notice( $notice_slug );
				foreach ( $notice['action_options'] as $action_index => $action_arr ) {
					$notice_actions[ $notice_slug ][] = $action_index;
				}
			}

			$loc_remote_notices = array();
			foreach ( $this->remote_notices as $remote_notice ) {
				if ( ! isset( $remote_notice['btns'] ) ) {
					continue;
				}
				array_push( $loc_remote_notices, $remote_notice['id'] );
			}

			$admin_notice_localize = array(
				'notice_nonce'   => wp_create_nonce( 'aioseop_ajax_notice' ),
				'notice_actions' => $notice_actions,
				'remote_notices' => $loc_remote_notices,
			);
			wp_localize_script( 'aioseop-admin-notice-js', 'aioseop_notice_data', $admin_notice_localize );

			// Enqueue.
			wp_enqueue_script( 'aioseop-admin-notice-js' );

			wp_enqueue_style(
				'aioseop-admin-notice-css',
				AIOSEOP_PLUGIN_URL . 'css/admin-notice.css',
				false,
				AIOSEOP_VERSION,
				false
			);
		}

		/**
		 * Display Notice as Default
		 *
		 * Method for default WP Admin notices.
		 * NOTE: As of 3.0, display_notice_default() & display_notice_aioseop()
		 * have the same functionality, but serves as a future development concept.
		 *
		 * @since 3.0
		 *
		 * @uses AIOSEOP_PLUGIN_DIR . 'admin/display/notice-default.php' Template for default notices.
		 *
		 * @return void
		 */
		public function display_notice_default() {
			$this->display_notice( 'default' );
		}

		/**
		 * Display Notice as AIOSEOP Screens
		 *
		 * Method for Admin notices exclusive to AIOSEOP screens.
		 * NOTE: As of 3.0, display_notice_default() & display_notice_aioseop()
		 * have the same functionality, but serves as a future development concept.
		 *
		 * @since 3.0
		 *
		 * @uses AIOSEOP_PLUGIN_DIR . 'admin/display/notice-aioseop.php' Template for notices.
		 *
		 * @return void
		 */
		public function display_notice_aioseop() {
			$this->display_notice( 'aioseop' );
		}

		/**
		 * Display Notice
		 *
		 * @since 2.8
		 *
		 * @param string $template Slug name for template.
		 */
		public function display_notice( $template ) {
			if ( ! wp_script_is( 'aioseop-admin-notice-js', 'enqueued' ) || ! wp_style_is( 'aioseop-admin-notice-css', 'enqueued' ) ) {
				return;
			} elseif ( 'default' !== $template && 'aioseop' !== $template ) {
				return;
			} elseif ( ! current_user_can( 'aiosp_manage_seo' ) ) {
				return;
			}

			$current_screen  = get_current_screen();
			$current_user_id = get_current_user_id();
			foreach ( $this->active_notices as $a_notice_slug => $a_notice_time_display ) {
				$notice_show = true;
				$notice      = $this->get_notice( $a_notice_slug );

				// If we have no message or static HTML, this is a bad notice.
				if ( empty( $notice['message'] ) && empty( $notice['html'] ) ) {
					$this->remove_notice( $a_notice_slug );
					continue;
				}

				// Screen Restriction.
				if ( ! empty( $notice['screens'] ) ) {

					if ( in_array( 'aioseop', $notice['screens'], true ) ) {
						unset( $notice['screens']['aiosoep'] );
						$notice['screens'] = array_merge( $notice['screens'], aioseop_get_admin_screens() );
					}

					if ( ! in_array( $current_screen->id, $notice['screens'], true ) ) {
						continue;
					}
				}

				if ( in_array( $current_screen->id, $this->excluded_screens, true ) ) {
					continue;
				}

				if ( isset( $this->dismissed_notices[ $a_notice_slug ] ) && $this->dismissed_notices[ $a_notice_slug ] ) {
					$notice_show = false;
				}

				// User Settings.
				if ( 'user' === $notice['target'] ) {
					$user_dismissed = get_user_meta( $current_user_id, 'aioseop_notice_dismissed_' . $a_notice_slug, true );
					if ( ! $user_dismissed ) {
						$user_notice_time_display = get_user_meta( $current_user_id, 'aioseop_notice_display_time_' . $a_notice_slug, true );
						if ( ! empty( $user_notice_time_display ) ) {
							$a_notice_time_display = intval( $user_notice_time_display );
						}
					} else {
						$notice_show = false;
					}
				}

				// Display/Render.
				$important_admin_notices = array(
					'notice-error',
					'notice-warning',
					'notice-do-nag',
				);
				if ( defined( 'DISABLE_NAG_NOTICES' ) && true === DISABLE_NAG_NOTICES && ( ! in_array( $notice['class'], $important_admin_notices, true ) ) ) {
					// Skip if `DISABLE_NAG_NOTICES` is implemented (as true).
					// Important notices, WP's CSS `notice-error` & `notice-warning`, are still rendered.
					continue;
				} elseif ( time() > $a_notice_time_display && $notice_show ) {
					include AIOSEOP_PLUGIN_DIR . 'admin/display/notice-' . $template . '.php';
				}
			}
		}

		/**
		 * Display Remote Notices
		 *
		 * @since 3.6.0
		 */
		public function display_remote_notice() {
			if ( ! current_user_can( 'aiosp_manage_seo' ) ) {
				return;
			}

			$current_screen  = get_current_screen();
			if ( in_array( $current_screen->id, $this->excluded_screens, true ) ) {
				return;
			}

			foreach ( $this->remote_notices as $remote_notice_slug => $remote_notice ) {
				if (
						time() < strtotime( $remote_notice['start'] ) ||
						( ! empty( $remote_notice['end'] ) && time() > strtotime( $remote_notice['end']  ) )
				) {
					continue;
				}
				if ( isset( $this->dismissed_notices[ $remote_notice_slug ] ) && $this->dismissed_notices[ $remote_notice_slug ] ) {
					continue;
				}

				if ( isset( $remote_notice['btns'] ) ) {
					foreach ( $remote_notice['btns'] as $btn_slug => $btn ) {
						$remote_notice['btns'][ $btn_slug ]['url'] = $this->format_url( $btn['url'] );
					}
				}

				// Display/Render.
				$important_admin_notices = array(
					'error',
					'warning',
					'do-nag',
				);
				if ( defined( 'DISABLE_NAG_NOTICES' ) && true === DISABLE_NAG_NOTICES && ( ! in_array( $remote_notice['notification_type'], $important_admin_notices, true ) ) ) {
					continue;
				} else {
					include AIOSEOP_PLUGIN_DIR . 'admin/display/notice-remote.php';
				}
			}
		}

		/**
		 * Format URL
		 *
		 * @since 3.6.0
		 *
		 * @param  string $url
		 * @return string
		 */
		public function format_url( $url ) {
			$replace = array(
				'(http://dismiss)'            => '#dismiss',
				'(http://route)'              => admin_url() . 'admin.php',
				'(#aioseo-settings)'          => '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/aioseop_class.php',
				'(#aioseo-general-settings)'  => '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/aioseop_class.php',
				'(#aioseo-performance)'       => '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/modules/aioseop_performance.php',
				'(#aioseo-sitemap)'           => '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/modules/aioseop_sitemap.php',
				'(#aioseo-opengraph)'         => '?page=aiosp_opengraph',
				'(#aioseo-robots)'            => '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/modules/aioseop_robots.php',
				'(#aioseo-file-editor)'       => '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/modules/aioseop_file_editor.php',
				'(#aioseo-importer-exporter)' => '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/modules/aioseop_importer_exporter.php',
				'(#aioseo-bad-robots)'        => '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/modules/aioseop_bad_robots.php',
				'(#aioseo-feature-manager)'   => '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/modules/aioseop_feature_manager.php',
				'(#aioseo-about)'             => '?page=aioseop-about',
				'(#aioseo-video-sitemap)'     => '#',
				'(#aioseo-image-seo)'         => '#',
				'(#aioseo-local-business)'    => '#',
				'(:[0-9a-zA-Z-_]+)'           => '#',
			);
			if ( AIOSEOPPRO ) {
				$replace['(#aioseo-sitemap)']       = '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/pro/class-aioseop-pro-sitemap.php';
				$replace['(#aioseo-video-sitemap)'] = '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/pro/video_sitemap.php';
				if ( aioseop_is_addon_allowed( 'image_seo' ) ) {
					$replace['(#aioseo-image-seo)'] = '?page=aiosp_image_seo';
				}
				if ( aioseop_is_addon_allowed( 'schema_local_business' ) ) {
					$replace['(#aioseo-local-business)'] = '?page=' . AIOSEOP_PLUGIN_DIRNAME . '/pro/modules/class-aioseop-schema-local-business.php';
				}
			}
			$search = array_keys( $replace );

			$tmp_url = preg_replace( $search, $replace, $url );
			if ( ! empty( $tmp_url ) ) {
				$url = $tmp_url;
			}

			return $url;
		}

		/**
		 * AJAX Notice Action
		 *
		 * Fires when a Action_Option is clicked and sent via AJAX. Also includes
		 * WP Default Dismiss (rendered as a clickable button on upper-right).
		 *
		 * @since 3.0
		 *
		 * @see AIOSEOP_PLUGIN_DIR . 'js/admin-notice.js'
		 */
		public function ajax_notice_action() {
			check_ajax_referer( 'aioseop_ajax_notice' );
			if ( ! current_user_can( 'aiosp_manage_seo' ) ) {
				wp_send_json_error( __( "User doesn't have `aiosp_manage_seo` capabilities.", 'all-in-one-seo-pack' ) );
			}
			// Notice (Slug) => (Action_Options) Index.
			$notice_slug  = null;
			$action_index = null;
			if ( isset( $_POST['notice_slug'] ) ) {
				$notice_slug = filter_input( INPUT_POST, 'notice_slug', FILTER_SANITIZE_STRING );

				// When PHPUnit is unable to use filter_input.
				if ( defined( 'AIOSEOP_UNIT_TESTING' ) && null === $notice_slug && ! empty( $_POST['notice_slug'] ) ) {
					$notice_slug = $_POST['notice_slug'];
				}
			}
			if ( isset( $_POST['action_index'] ) ) {
				$action_index = filter_input( INPUT_POST, 'action_index', FILTER_SANITIZE_STRING );

				// When PHPUnit is unable to use filter_input.
				if ( defined( 'AIOSEOP_UNIT_TESTING' ) && null === $action_index && ( ! empty( $_POST['action_index'] ) || 0 === $_POST['action_index'] ) ) {
					$action_index = $_POST['action_index'];
				}
			}
			if ( empty( $notice_slug ) ) {
				/* Translators: Displays the hardcoded slug that is missing. */
				wp_send_json_error( sprintf( __( 'Missing values from `%s`.', 'all-in-one-seo-pack' ), 'notice_slug' ) );
			} elseif ( empty( $action_index ) && 0 !== (int) $action_index ) {
				/* Translators: Displays the hardcoded action index that is missing. */
				wp_send_json_error( sprintf( __( 'Missing values from `%s`.', 'all-in-one-seo-pack' ), 'action_index' ) );
			}

			$action_options            = $this->action_options_defaults();
			$action_options['time']    = $this->default_dismiss_delay;
			$action_options['dismiss'] = false;

			$notice = $this->get_notice( $notice_slug );

			if ( isset( $notice['action_options'][ $action_index ] ) ) {
				$action_options = array_merge( $action_options, $notice['action_options'][ $action_index ] );
			}

			if ( $action_options['time'] ) {
				$this->set_notice_delay( $notice_slug, $action_options['time'] );
			}
			if ( $action_options['dismiss'] ) {
				$this->set_notice_dismiss( $notice_slug, $action_options['dismiss'] );
			}

			$this->obj_update_options();
			wp_send_json_success( __( 'Notice updated successfully.', 'all-in-one-seo-pack' ) );
		}

		/**
		 * AJAX Remote Notice
		 *
		 * @since 3.6.0
		 */
		public function ajax_remote_notice_action() {
			check_ajax_referer( 'aioseop_ajax_notice' );
			if ( ! current_user_can( 'aiosp_manage_seo' ) ) {
				wp_send_json_error( __( "User doesn't have `aiosp_manage_seo` capabilities.", 'all-in-one-seo-pack' ) );
			}

			$remote_notice_id  = null;
			if ( isset( $_POST['remote_notice_id'] ) ) {
				$remote_notice_id = filter_input( INPUT_POST, 'remote_notice_id', FILTER_SANITIZE_STRING );

				// When PHPUnit is unable to use filter_input.
				if ( defined( 'AIOSEOP_UNIT_TESTING' ) && null === $remote_notice_id && ! empty( $_POST['remote_notice_id'] ) ) {
					$remote_notice_id = $_POST['remote_notice_id'];
				}
			}
			if ( empty( $remote_notice_id ) ) {
				/* Translators: Displays the hardcoded ID that is missing. */
				wp_send_json_error( sprintf( __( 'Missing values from `%s`.', 'all-in-one-seo-pack' ), 'remote_notice_id' ) );
			}

			$this->dismissed_notices[ 'remote_' . $remote_notice_id ] = time();

			$this->obj_update_options();
			wp_send_json_success( __( 'Notice updated successfully.', 'all-in-one-seo-pack' ) );
		}

	}

	// CLASS INITIALIZATION.
	// Should this be a singleton class instead of a global?
	global $aioseop_notices;
	$aioseop_notices = new AIOSEOP_Notices();
}