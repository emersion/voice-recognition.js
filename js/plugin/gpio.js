/**
 * @fileOverview Turn on/off GPIOs after a voice recognition.
 * @author $imon
 */

(function() {
	if (!recognition) { //If the recognition is not set
		return;
	}

	//When the application recognizes a voice model
	recognition.bind('complete', function(data) {
		//Determine the robot's direction
		var direction = (data.result.name == 'avance') ? 'forward' : 'backward';

		var pin = (direction == 'forward') ? 4 : 17;

		//Send an ajax call
		$.ajax({
			url: '../symbiose/sbin/servercall.php',
			method: 'post',
			//crossDomain: true,
			dataType: 'json',
			data: {
				'class': 'GpioController',
				method: 'blink',
				arguments: JSON.stringify({
					pin: pin,
					time: 5
				}),
				user: 'admin',
				password: 'admin'
			},
			success: function(response) {
				if (!response.success) {
					Utils.logMessage('ERROR : '+response.out);
				} else {
					Utils.logMessage('GPIO request sent');
				}
			},
			error: function() {
				Utils.logMessage('ERROR : HTTP request failed !');
			}
		});
	});
})();