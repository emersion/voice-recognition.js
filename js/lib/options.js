(function() {
	if (!window.Utils) {
		window.Utils = {};
	}

	if (Utils.Options) {
		return;
	}

	Utils.Options = {};

	Utils.Options._data = {};

	Utils.Options.set = function setOption(name, value) {
		Utils.Options._data[name] = {
			value: value
		};
	};

	Utils.Options.register = function registerOption(name, type, input) {
		Utils.Options._data[name] = {
			type: type,
			$input: $(input)
		};
	};

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