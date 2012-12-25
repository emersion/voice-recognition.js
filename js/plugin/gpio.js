/**
 * @fileOverview Turn on/off GPIOs after voice recognition.
 * @author $imon
 */

(function() {
	if (!recognition) { //If the recognition is not set
		return;
	}

	recognition.bind('complete', function(data) {
		var direction = (data.result.name == 'avance') ? 'forward' : 'backward';

		
	});
})();