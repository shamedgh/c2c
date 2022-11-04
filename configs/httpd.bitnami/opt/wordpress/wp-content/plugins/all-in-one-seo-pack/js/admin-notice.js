/**
 * Admin Notices for AIOSEOP.
 *
 * @summary  Handles the AJAX Actions with AIOSEOP_Notices
 *
 * @since    2.4.2
 * @package all-in-one-seo-pack
 */
// phpcs:disable PEAR.Functions.FunctionCallSignature.ContentAfterOpenBracket
// phpcs:disable PEAR.Functions.FunctionCallSignature.MultipleArguments
// phpcs:disable PEAR.Functions.FunctionCallSignature.CloseBracketLine
/* global aioseop_notice_data */
(function($) {

	/**
	 * Notice Delay - AJAX Action
	 *
	 * @summary Sets up the Delay Button listeners
	 *
	 * @since 2.4.2
	 * @access public
	 *
	 * @global string $aioseop_notice_data.notice_nonce
	 * @listens aioseop-notice-delay-{notice_slug}-{delay_index}:click
	 *
	 * @param string noticeSlug
	 * @param string delayIndex
	 */
	function aioseop_notice_delay_ajax_action( noticeSlug, delayIndex ) {
		var noticeNonce   = aioseop_notice_data.notice_nonce;
		var noticeDelayID = "#aioseop-notice-delay-" + noticeSlug + "-" + delayIndex;
		$( noticeDelayID ).on( "click", function( event ) {
			var elem_href = $( this ).attr( "href" );
			if ( "#" === elem_href || "" === elem_href ) {
				// Stops automatic actions.
				event.stopPropagation();
				event.preventDefault();
			}

			var formData = new FormData();
			formData.append( "notice_slug", noticeSlug );
			formData.append( "action_index", delayIndex );

			formData.append( "action", "aioseop_notice" );
			formData.append( "_ajax_nonce", noticeNonce );
			$.ajax({
				url: ajaxurl,
				type: "POST",
				data: formData,
				cache: false,
				dataType: "json",
				processData: false,
				contentType: false,

				success: function( data, textStatus, jqXHR ){
					var noticeContainer = ".aioseop-notice-" + noticeSlug;
					$( noticeContainer ).remove();
				}
			});
		});
	}

	/**
	 * Notice Delay - WP Default AJAX Action
	 *
	 * @summary
	 *
	 * @since 2.4.2
	 * @access public
	 *
	 * @global string $aioseop_notice_data.notice_nonce
	 * @listens aioseop-notice-delay-{notice_slug}-{delay_index}:click
	 *
	 * @param string noticeSlug
	 */
	function aioseop_notice_delay_wp_default_dismiss_ajax_action( noticeSlug ) {
		var noticeNonce     = aioseop_notice_data.notice_nonce;
		var noticeContainer = ".aioseop-notice-" + noticeSlug;
		$( noticeContainer ).on( "click", "button.notice-dismiss ", function( event ) {
			// Prevents any unwanted actions.
			event.stopPropagation();
			event.preventDefault();

			var formData = new FormData();
			formData.append( "notice_slug", noticeSlug );
			formData.append( "action_index", "default" );

			formData.append( "action", "aioseop_notice" );
			formData.append( "_ajax_nonce", noticeNonce );
			$.ajax({
				url: ajaxurl,
				type: "POST",
				data: formData,
				cache: false,
				dataType: "json",
				processData: false,
				contentType: false
			});
		});
	}

	function aioseop_remote_notice_button_dismiss( noticeId ) {
		let noticeNonce   = aioseop_notice_data.notice_nonce;
		$( `.aioseop-remote-notice-${noticeId} .aioseo-action-buttons a` ).on( "click", function( event ) {

			let doNotDismiss = $( this ).attr( "data-dismiss" );
			let href = $( this ).attr( "href" );

			if (
				( 'undefined' !== typeof doNotDismiss && "false" === doNotDismiss ) &&
				"#dismiss" !== href
			) {
				return;
			}

			let formData = new FormData();
			formData.append( "remote_notice_id", noticeId );

			formData.append( "action", "aioseop_remote_notice" );
			formData.append( "_ajax_nonce", noticeNonce );
			$.ajax({
				url: ajaxurl,
				type: "POST",
				data: formData,
				cache: false,
				dataType: "json",
				processData: false,
				contentType: false,

				success: function( data, textStatus, jqXHR ){
					var noticeContainer = ".aioseop-remote-notice-" + noticeId;
					$( noticeContainer ).remove();
				}
			});
		});
	}

	function aioseop_remote_notice_wp_default_dismiss( noticeID ) {
		let noticeNonce     = aioseop_notice_data.notice_nonce;
		let noticeContainer = ".aioseop-remote-notice-" + noticeID;
		$( noticeContainer ).on( "click", "button.notice-dismiss ", function( event ) {
			// Prevents any unwanted actions.
			event.stopPropagation();
			event.preventDefault();

			let formData = new FormData();
			formData.append( "remote_notice_id", noticeID );

			formData.append( "action", "aioseop_remote_notice" );
			formData.append( "_ajax_nonce", noticeNonce );
			$.ajax({
				url: ajaxurl,
				type: "POST",
				data: formData,
				cache: false,
				dataType: "json",
				processData: false,
				contentType: false
			});
		});
	}

	/**
	 * INITIALIZE NOTICE JS
	 *
	 * Constructs the actions the user may perform.
	 */
	let noticeDelays  = aioseop_notice_data.notice_actions;
	let remoteNotices = aioseop_notice_data.remote_notices;

	$.each( noticeDelays, function ( k1NoticeSlug, v1DelayArr ) {
		$.each( v1DelayArr, function ( k2I, v2DelayIndex ) {
			aioseop_notice_delay_ajax_action( k1NoticeSlug, v2DelayIndex );
		});

		// Default WP action for Dismiss Button on Upper-Right.
		aioseop_notice_delay_wp_default_dismiss_ajax_action( k1NoticeSlug );
	});

	$.each( remoteNotices, function( index, noticeId ) {
		aioseop_remote_notice_button_dismiss( noticeId );
		aioseop_remote_notice_wp_default_dismiss( noticeId );
	});
}(jQuery));
// phpcs:enable
