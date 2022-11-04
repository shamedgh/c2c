var aioseopRssContentDescription;

(function($) {
	aioseopRssContentDescription = {
		init: function() {
			$('#aiosp_rss_content_metabox .inside .aiosp_settings').first().prepend( aioseopRssContent.description );
			$('#aiosp_rss_content_metabox .inside .aiosp_settings').first().append( aioseopRssContent.listOfTags );
		}
	}
})(jQuery);

aioseopRssContentDescription.init();