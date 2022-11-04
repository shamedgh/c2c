var aioseopQuickEdit;

(function($) {
	aioseopQuickEdit = {

		/**
		 * Generates the textarea element and buttons that are used to edit post meta via a column.
		 * 
		 * @since	3.4.0	Refactored function.
		 * 
		 * @param 	Integer 	postId 			The ID of the post.
		 * @param 	String 		columnName 		The name of the column/attribute.
		 * @param 	String 		nonce 			The nonce.
		 */
		aioseop_ajax_edit_meta_form: function(postId, columnName, nonce) {
			let field = $(`#aioseop_${columnName}_${postId}`);
			let dashicon = field.parent().find('.aioseop-quickedit-pencil').first();
			let previousElements = field.html();
			let value = field.text().trim();

			field.addClass('aio_editing');

			let textarea = document.createElement('textarea');
			textarea.id = `aioseop_new_${columnName}_${postId}`;
			textarea.classList.add('aioseop-quickedit-input');
			textarea.rows = 4;
			textarea.cols = 32;

			if (aioseopadmin.i18n.noValue !== value) {
				textarea.innerText = value;
			}

			let buttons = document.createElement('div');

			let btnSave = document.createElement('a');
			btnSave.id = `aioseop_save_${columnName}_${postId}`;
			btnSave.classList.add('dashicons', 'dashicons-yes-alt', 'aioseop-quickedit-input-save');
			btnSave.href = 'javascript:void(0);';
			btnSave.title = aioseopadmin.i18n.save;

			btnSave.addEventListener('click', function() {
				aioseopQuickEdit.handle_post_meta(postId, textarea.value, columnName, nonce, previousElements);
			});

			let btnCancel = document.createElement('a');
			btnCancel.id = `aioseop_cancel_${columnName}_${postId}`;
			btnCancel.classList.add('dashicons', 'dashicons-dismiss', 'aioseop-quickedit-input-cancel');
			btnCancel.href = 'javascript:void(0);';
			btnCancel.title = aioseopadmin.i18n.cancel;

			btnCancel.addEventListener('click', function() {
				dashicon.show();
				field.html(previousElements);
				field.removeClass('aio_editing');
			});

			buttons.append(btnSave, btnCancel);

			dashicon.hide();
			field.empty().append(textarea, buttons);
		},

		/**
		 * Updates the post meta value via AJAX.
		 * 
		 * @since	3.4.0	Refactored function.
		 * 
		 * @param 	Integer 	postId 				The ID of the post.
		 * @param 	String 		value 				The new value of the attribute.
		 * @param 	String 		columnName 			The name of the column/attribute.
		 * @param 	String 		nonce 				The nonce.
		 * @param	Object		previousElements	The initial column elements (dashicon + span).
		 */
		handle_post_meta: function(postId, value, columnName, nonce, previousElements) {
			value = aioseopQuickEdit.sanitize(value);

			let field = $(`div#aioseop_${columnName}_${postId}`);

			let message = document.createElement('span');

			let spinner = document.createElement('img');
			spinner.src = `${aioseopadmin.imgUrl}activity.gif`;
			spinner.classList.add('aioseop-quickedit-spinner');
			spinner.align = 'absmiddle';

			let span = document.createElement('span');
			span.innerText = aioseopadmin.i18n.wait;
			span.style.float = 'left';

			message.append(spinner, span);

			field.fadeOut('fast', function() {
				field.html(message);

				field.fadeIn('fast', function() {

					$.ajax({
						type: "POST",
						dataType: "json",
						url: aioseopadmin.requestUrl,
						data: {
							action: "aioseop_ajax_save_meta",
							post_id: postId,
							value: value.trim(),
							key: columnName,
							_ajax_nonce: nonce
						},
						success: function() {
							field.empty().append(previousElements);
							field.removeClass('aio_editing');

							if ('image_title' === columnName) {
								aioseopMediaColumns.updatePostTitle(postId, value);
							}

							if ('' === value) {
								value = `<strong>${aioseopadmin.i18n.noValue}</strong>`;
							}
							$(`#aioseop_${columnName}_${postId}_value`).html(value);
						},
						error: function() {
							field.empty().append(previousElements);
							field.removeClass('aio_editing');
							console.log(`Request to update ${columnName} failed.`);
						}
					});
				});
			});
		},

		sanitize: function (string) {
			const map = {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#x27;',
				"/": '&#x2F;',
			};
			const reg = /[&<>"'/]/ig;
			return string.replace(reg, (match)=>(map[match])).trim();
		  }
	}

})(jQuery);


//TODO This needs to be moved to another file.
jQuery(document).on('click', '.visibility-notice', function() {

	$.ajax({
		url: ajaxurl,
		data: {
			action: 'aioseo_dismiss_visibility_notice'
		}
	});

});

jQuery(document).on('click', '.yst_notice', function() {

	$.ajax({
		url: ajaxurl,
		data: {
			action: 'aioseo_dismiss_yst_notice'
		}
	});

});

jQuery(document).on('click', '.woo-upgrade-notice', function() {

	$.ajax({
		url: ajaxurl,
		data: {
			action: 'aioseo_dismiss_woo_upgrade_notice'
		}
	});

});

jQuery(document).on('click', '.sitemap_max_urls_notice', function() {

	$.ajax({
		url: ajaxurl,
		data: {
			action: 'aioseo_dismiss_sitemap_max_url_notice'
		}
	});

});