(function() {
	Utils.Progress = function Progress(options) {
		Utils.Observable.call(this);

		this._value = 0;
		this._message = '';
		this._error = false;

		options = options || {};

		this._parts = options.parts || 1;
	};
	Utils.Progress.prototype = {
		value: function value(value) {
			if (typeof value == 'undefined') {
				return this._value;
			} else {
				value = parseInt(value);

				if (isNaN(value)) {
					value = 0;
				}
				if (value < 0) {
					value = 0;
				}
				if (value > 100) {
					value = 100;
				}

				this._value = value;

				this.notify('update', { value: value, message: this.message(), error: this.error() });
			}
		},
		parts: function parts(value) {
			if (typeof value == 'undefined') {
				return this._parts;
			} else {
				value = parseInt(value);

				if (isNaN(value)) {
					value = 1;
				}

				this._parts = value;
			}
		},
		partComplete: function partComplete(factor) {
			factor = (typeof factor == 'number') ? factor : 1;

			var percentage = this.value() + 1 / this.parts() * 100 * factor;
			this.value(percentage);
		},
		message: function message(msg) {
			if (typeof msg == 'undefined') {
				return this._message;
			} else {
				msg = String(msg);

				this._message = msg;

				this.notify('update', { value: this.value(), message: msg, error: this.error() });
			}
		},
		error: function error(msg) {
			if (typeof msg == 'undefined') {
				return this._error;
			} else {
				if (msg === false) {
					this._error = false;

					this.notify('update', { value: this.value(), message: this.message(), error: false });
				} else {
					this._error = true;

					this.message(msg);
				}
			}
		},
		reset: function reset() {
			this.error(false);
			this.value(0);
		}
	};
	Utils.inherit(Utils.Progress, Utils.Observable);
})();