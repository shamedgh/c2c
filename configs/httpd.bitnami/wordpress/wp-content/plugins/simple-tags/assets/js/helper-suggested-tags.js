jQuery(document).ready(function() {
  jQuery('#suggestedtags .hndle span').html(html_entity_decode(stHelperSuggestedTagsL10n.title_bloc))
  jQuery('#suggestedtags .inside .container_clicktags').html(stHelperSuggestedTagsL10n.content_bloc)

  // Generi call for autocomplete API
  jQuery('a.suggest-action-link').click(function(event) {
    event.preventDefault()

    jQuery('#st_ajax_loading').show()

    jQuery('#suggestedtags .container_clicktags').load(ajaxurl + '?action=simpletags&stags_action=' + jQuery(this).data('ajaxaction'), {
      content: getContentFromEditor(),
      title: getTitleFromEditor()
    }, function() {
      registerClickTags()
    })
    return false
  })
})

function getTitleFromEditor() {
  var data = ''

  try {
    data = wp.data.select('core/editor').getEditedPostAttribute('title')
  } catch (error) {
    data = jQuery('#title').val()
  }

  // Trim data
  data = data.replace(/^\s+/, '').replace(/\s+$/, '')
  if (data !== '') {
    data = strip_tags(data)
  }

  return data
}

function getContentFromEditor() {
  var data = ''

  try { // Gutenberg
    data = wp.data.select('core/editor').getEditedPostAttribute('content')
  } catch (error) {
    try { // TinyMCE
      var ed = tinyMCE.activeEditor
      if ('mce_fullscreen' == ed.id) {
        tinyMCE.get('content').setContent(ed.getContent({
          format: 'raw'
        }), {
          format: 'raw'
        })
      }
      tinyMCE.get('content').save()
      data = jQuery('#content').val()
    } catch (error) {
      try { // Quick Tags
        data = jQuery('#content').val()
      } catch (error) {}
    }
  }

  // Trim data
  data = data.replace(/^\s+/, '').replace(/\s+$/, '')
  if (data !== '') {
    data = strip_tags(data)
  }

  return data
}

function registerClickTags() {
  jQuery('#suggestedtags .container_clicktags span').click(function(event) {
    event.preventDefault()

    addTag(this.innerHTML)
  })

  jQuery('#st_ajax_loading').hide()
  if (jQuery('#suggestedtags .inside').css('display') != 'block') {
    jQuery('#suggestedtags').toggleClass('closed')
  }
}

/**
 * The html_entity_decode() php function on JS :)
 *
 * See : https://github.com/hirak/phpjs
 *
 * @param str
 * @returns {string | *}
 */
function html_entity_decode(str) {
  var ta = document.createElement('textarea')
  ta.innerHTML = str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  toReturn = ta.value
  ta = null
  return toReturn
}

/**
 * The strip_tags() php function on JS :)
 *
 * See : https://github.com/hirak/phpjs
 *
 * @param str
 * @returns {*}
 */
function strip_tags(str) {
  return str.replace(/&lt;\/?[^&gt;]+&gt;/gi, '')
}