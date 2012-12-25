/**
 * Various utils.
 * @author $imon
 */

(function() {
	if (!window.Utils) { //Define utils' namespace
		window.Utils = {};
	}

	/**
	 * Log a message in the console.
	 */
	Utils.logMessage = function logMessage() {
		if (Utils.Options.get('utils.logMessages')) {
			console.log.apply(window, Array.prototype.slice.call(arguments));
		}
	};


	/**
	 * Tool to export data.
	 * @type {Object}
	 * @namespace
	 */
	Utils.Export = {};

	/**
	 * Export data.
	 * @param  {String} contents The raw data.
	 * @param  {String} type     The MIME type of the data.
	 */
	Utils.Export.exportData = function exportData(contents, type) {
		window.open('data:'+type+';base64,'+window.btoa(contents));
	};

	/**
	 * Export data to CSV.
	 * @param  {String} csv The CSV data.
	 */
	Utils.Export.exportCSV = function exportCSV(csv) {
		return Utils.Export.exportData(csv.replace(/\./g,','), 'text/csv');
	};

	/**
	 * Export data to JSON.
	 * @param  {Object} data The data.
	 */
	Utils.Export.exportJSON = function exportJSON(data) {
		return Utils.Export.exportData(JSON.stringify(data), 'application/json');
	};
})();