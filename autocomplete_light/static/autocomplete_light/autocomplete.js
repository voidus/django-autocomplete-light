var yourlabs = {}

yourlabs.Autocomplete = function (input) {
    this.input = input
    this.menu = '<span class="div typeahead dropdown-menu"></span>';
    this.data = {};
    this.queryVariable = 'q';
    this.minimumCharacters = 0;
}

yourlabs.Autocomplete.prototype = {
    constructor: yourlabs.Autocomplete

  , initialize: function () {
        this.menu = $(this.menu);

        this.input
            .on('blur',     $.proxy(this.blur, this))
            .on('keypress', $.proxy(this.keypress, this))
            .on('keyup',    $.proxy(this.keyup, this))
            .on('click',    $.proxy(this.lookup, this))

        if (this.eventSupported('keydown')) {
            this.input.on('keydown', $.proxy(this.keydown, this))
        }

        this.menu
            .on('mouseenter', this.choiceSelector, $.proxy(this.mouseenter, this))

        $(this.choiceSelector).live('click', $.proxy(this.click, this))
    }

  , eventSupported: function(eventName) {
        var isSupported = eventName in this.input
        if (!isSupported) {
            this.input.setAttribute(eventName, 'return;')
            isSupported = typeof this.input[eventName] === 'function'
        }
        return isSupported
    }

  , getQuery: function () {
      return this.input.val()
  }

  , lookup: function (event) {
      var items

      this.query = this.getQuery()

      if (this.query.length < this.minimumCharacters) {
        return this.shown ? this.hide() : this
      }

      this.data[this.queryVariable] = this.query;

      if (this.xhr) this.xhr.abort()

      // Again we need this from another scope.
      var autocomplete = this;

      this.xhr = $.ajax(this.url, {
          data: this.data,
          complete: function(jqXHR, textStatus) {
              autocomplete.menu.html(jqXHR.responseText);
              autocomplete.show();
              autocomplete.xhr = false;
          }
      })
      
      return items ? this.process(items) : this
    }

  , show: function () {
      var pos = $.extend({}, this.input.position(), {
        height: this.input[0].offsetHeight
      })

      this.menu
        .insertAfter(this.input)
        .css({
          top: pos.top + pos.height
        , left: pos.left
        })
        .show()

      this.shown = true
      return this
    }

  , hide: function () {
      this.menu.hide()
      this.shown = false
      return this
    }

  , next: function (event) {
      var active = this.menu.find('.active').removeClass('active')
        , next = active.next()

      if (!next.length) {
        next = $(this.menu.find(this.choiceSelector)[0])
      }

      next.addClass('active')
    }

  , prev: function (event) {
      var active = this.menu.find('.active').removeClass('active')
        , prev = active.prev()

      if (!prev.length) {
        prev = this.menu.find(this.choiceSelector).last()
      }

      prev.addClass('active')
    }

  , move: function (e) {
      if (!this.shown) return

      switch(e.keyCode) {
        case 9: // tab
        case 13: // enter
        case 27: // escape
          e.preventDefault()
          break

        case 38: // up arrow
          e.preventDefault()
          this.prev()
          break

        case 40: // down arrow
          e.preventDefault()
          this.next()
          break
      }

      e.stopPropagation()
    }

  , keydown: function (e) {
      this.suppressKeyPressRepeat = ~$.inArray(e.keyCode, [40,38,9,13,27])
      this.move(e)
    }

  , keypress: function (e) {
      if (this.suppressKeyPressRepeat) return
      this.move(e)
    }

  , keyup: function (e) {
      switch(e.keyCode) {
        case 40: // down arrow
        case 38: // up arrow
        case 16: // shift
        case 17: // ctrl
        case 18: // alt
          break

        case 9: // tab
        case 13: // enter
          if (!this.shown) return
          this.select()
          break

        case 27: // escape
          if (!this.shown) return
          this.hide()
          break

        default:
          this.lookup()
      }

      e.stopPropagation()
      e.preventDefault()
  }

  , blur: function (e) {
      var that = this
      setTimeout(function () { that.hide() }, 150)
    }

  , click: function (e) {
      e.stopPropagation()
      e.preventDefault()
      this.select()
    }

  , mouseenter: function (e) {
      this.menu.find('.active').removeClass('active')
      $(e.currentTarget).addClass('active')
    }

  , select: function () {
        var choice = this.menu.find('.active');

        this.input.trigger('selectChoice',
            [choice, this]);
    }
}

/*
The jQuery plugin that manages Autocomplete instances across the various
inputs. It is named 'yourlabsAutocomplete' rather than just 'autocomplete'
to live happily with other plugins that may define an autocomplete() jQuery
plugin.

It takes an array as argument, the array may contain any attribute or
function that should override the Autocomplete builtin. For example:

  $('input#your-autocomplete').yourlabsAutocomplete({
      url: '/some/url/',
      hide: function() {
          this.outerContainer
      },
  })

Also, it implements a simple identity map, which means that:

  // First call for an input instanciates the Autocomplete instance
  $('input#your-autocomplete').yourlabsAutocomplete({
      url: '/some/url/',
  });

  // Other calls return the previously created Autocomplete instance
  $('input#your-autocomplete').yourlabsAutocomplete().data = {
      newData: $('#foo').val(),
  }
*/
$.fn.yourlabsAutocomplete = function(overrides) {
    if (this.length < 1) {
        // avoid crashing when called on a non existing element
        return;
    }

    var overrides = overrides ? overrides : {};

    // Disable the browser's autocomplete features on that input.
    this.attr('autocomplete', 'off');

    // If no Autocomplete instance is defined for this id, make one.
    if (this.data('autocomplete') == undefined) {
        if (overrides.url == undefined) {
            alert('Autocomplete needs a url !');
            return;
        }

        // Instanciate Autocomplete.
        var autocomplete = new yourlabs.Autocomplete(this);

        // Extend the instance with overrides.
        autocomplete = $.extend(autocomplete, overrides);

        this.data('autocomplete', autocomplete);

        // All set, call initialize().
        autocomplete.initialize();
    }

    // Return the Autocomplete instance for this id from the registry.
    return this.data('autocomplete');
};

// Binding some default behaviors.
$(document).ready(function() {
    function removeHilightClass(e, choice, autocomplete) {
        choice.removeClass(autocomplete.hilightClass);
    };
    $(document).bind('hilightChoice', function(e, choice, autocomplete) {
        choice.addClass(autocomplete.hilightClass);
    });
    $(document).bind('dehilightChoice', removeHilightClass);
    $(document).bind('selectChoice', removeHilightClass);
});
