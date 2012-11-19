(function() {
	if (window.Utils) {
		return;
	}

	window.Utils = {};

	Utils.logMessage = function logMessage() {
		if (Utils.Options.get('utils.logMessages')) {
			console.log.apply(window, Array.prototype.slice.call(arguments));
		}
	};

	Utils.Export = {};
	Utils.Export.exportData = function exportData(contents, type) {
		window.open('data:'+type+';base64,'+window.btoa(contents));
	};
	Utils.Export.exportCSV = function exportCSV(csv) {
		return Utils.Export.exportData(csv.replace(/\./g,','), 'text/csv');
	};
	Utils.Export.exportJSON = function exportJSON(data) {
		return Utils.Export.exportData(JSON.stringify(data), 'application/json');
	};
})();