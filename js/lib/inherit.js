/**
 * @fileOverview An impementation of inheritance.
 * @author $imon
 */

(function() {
	if (!window.Utils) { //Define utils' namespace
		window.Utils = {};
	}

	if (Utils.inherit) { //If the library is already loaded
		return;
	}

	/**
	 * An implementation of inheritance.
	 * @function
	 * @param {Object} C The child class.
	 * @param {Object} P The parent class.
	 */
	Utils.inherit = function inherit(C, P) {
		var F = function() {};
		F.prototype = P.prototype;
		C.prototype = $.extend({}, new F(), C.prototype);
		C.uber = P.prototype;
		C._parent = P;
		C.prototype.constructor = C;
	};

	/**
	 * Specify if an object is an instance of a class.
	 * @function
	 * @param {Object} instance The object to test.
	 * @param {Object} obj The class.
	 * @returns {Boolean} True if the object if an instance of the specified class.
	 */
	Utils.isInstanceOf = function isInstanceOf(instance, obj) {
		if (!instance || typeof instance != 'object' || !obj) { //Bad arguments
			return false;
		}

		//Try to get object's anscestors using instance.constructor and instance.constructor._parent
		var current;
		do {
			if (current) {
				current = current._parent;
			} else {
				current = instance.constructor;
			}
			
			if (current === obj) {
				return true;
			}
		} while (current._parent);

		//Is it a direct instance of the specified class ?
		try {
			if (instance instanceof obj) {
				return true;
			}
		} catch(e) {}
		
		return false;
	};
})();