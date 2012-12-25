/**
 * Global options management.
 * @author $imon
 */

(function() {
	if (!window.Utils) { //Define utils' namespace
		window.Utils = {};
	}

	if (Utils.Options) { //If the library is already loaded
		return;
	}

	/**
	 * Global options' namespace.
	 * @type {Object}
	 * @namespace
	 */
	Utils.Options = {};

	/**
	 * The options' data.
	 * @type {Object}
	 * @private
	 */
	Utils.Options._data = {};

	/**
	 * Set an option to a value.
	 * @param {String}                name  The option's name.
	 * @param {String|Boolean|Number} value The option's value.
	 */
	Utils.Options.set = function setOption(name, value) {
		Utils.Options._data[name] = {
			value: value
		};
	};

	/**
	 * Register a new option, managed by the user from an input.
	 * @param  {String} name  The option's name.
	 * @param  {String} type  The option's type.
	 * @param  {jQuery} input The option's input.
	 */
	Utils.Options.register = function registerOption(name, type, input) {
		Utils.Options._data[name] = {
			type: type,
			$input: $(input)
		};
	};

	/**
	 * Get the value of a defined option.
	 * @param  {String}           name The option's name.
	 * @return {String|Boolean|Number} The option's value.
	 */
	Utils.Options.get = function getOption(name) {
		var data = Utils.Options._data[name];

		if (!data) {
			return;
		}

		if (typeof data.value != 'undefined') {
			return data.value;
		}

		switch (data.type) {
			case 'number':
				return parseFloat(data.$input.val());
			case 'boolean':
				return data.$input.prop('checked');
		}

		return data.$input.val();
	};
})();