/**
 * @fileOverview Operation's progress management.
 * @author $imon
 */

(function() {
	if (!window.Utils) { //Define utils' namespace
		window.Utils = {};
	}

	if (Utils.Progress) { //If the library is already loaded
		return;
	}

	/**
	 * An operation's progress data.
	 * @constructor
	 * @param {Object} options Progress' options.
	 * @param {Number} options.part Number of parts in the progress.
	 */
	Utils.Progress = function Progress(options) {
		Utils.Observable.call(this); //Inheritance from Observable

		this._value = 0;
		this._message = '';
		this._error = false;

		options = options || {};

		this._parts = options.parts || 1;
	};
	Utils.Progress.prototype = {
		/**
		 * Get/set the progress' value.
		 * @param  {Number} [value] The new value, in %.
		 * @return {Number}         The value.
		 */
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
		/**
		 * Get/set number of parts.
		 * @param  {Number} value The number of parts.
		 * @return {Number}       The number of parts.
		 */
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
		/**
		 * Mark a part as completed.
		 * @param  {Number} [factor=1] The part's importance.
		 */
		partComplete: function partComplete(factor) {
			factor = (typeof factor == 'number') ? factor : 1;

			var percentage = this.value() + 1 / this.parts() * 100 * factor;
			this.value(percentage);
		},
		/**
		 * Get/set the progress' message.
		 * @param  {String} msg The message.
		 * @return {String}     The message.
		 */
		message: function message(msg) {
			if (typeof msg == 'undefined') {
				return this._message;
			} else {
				msg = String(msg);

				this._message = msg;

				this.notify('update', { value: this.value(), message: msg, error: this.error() });
			}
		},
		/**
		 * Determine if the operation has failed / mark the operation as failed.
		 * @param  {String} msg A message to describe the error.
		 * @return {Boolean}    True if the operation has failed.
		 */
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
		/**
		 * Reset the progress.
		 */
		reset: function reset() {
			this.error(false);
			this.value(0);
		}
	};

	Utils.inherit(Utils.Progress, Utils.Observable); //Inheritance from Observable
})();