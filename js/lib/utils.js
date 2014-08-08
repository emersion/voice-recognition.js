/**
 * @fileOverview Various utils.
 * @author $imon
 */

(function() {
	if (window.Utils) { //If the library is already loaded
		return;
	}

	var Utils;
	
	/**
	 * Some various utils.
	 * @type {Object}
	 * @namespace
	 */
	Utils = {};

	/**
	 * Log a message in the console.
	 * @function
	 */
	Utils.logMessage = function logMessage() {
		if (Utils.Options.get('utils.logMessages')) { //If message logging is enabled
			console.log.apply(console, Array.prototype.slice.call(arguments));
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
		window.open('data:'+type+';base64,'+window.btoa(contents)); //Open a new window with encoded data in base64
	};

	/**
	 * Export data to CSV.
	 * @param  {String} csv The CSV data.
	 */
	Utils.Export.exportCSV = function exportCSV(csv) {
		csv = csv.replace(/\./g,','); //Replace dots in numbers by commas (e.g. 6.54 -> 6,54)
		return Utils.Export.exportData(csv, 'text/csv');
	};

	/**
	 * Export data to JSON.
	 * @param  {Object} data The data.
	 */
	Utils.Export.exportJSON = function exportJSON(data) {
		var json = JSON.stringify(data, null, "\t"); //Encode data in JSON
		return Utils.Export.exportData(json, 'application/json');
	};

	window.Utils = Utils; //Export API
})();