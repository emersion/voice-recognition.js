/**
 * @fileOverview Turn on/off GPIOs after a voice recognition.
 * @author $imon
 */

(function() {
	if (!recognition) { //If the recognition is not set
		return;
	}

	//Plugin's options
	Utils.Options.set('plugin.gpio.enabled', true);
	Utils.Options.set('plugin.gpio.pins.forward', 4);
	Utils.Options.set('plugin.gpio.pins.backward', 17);
	Utils.Options.set('plugin.gpio.symbiose.url', '../symbiose/sbin/servercall.php');
	Utils.Options.set('plugin.gpio.symbiose.crossDomain', false);
	Utils.Options.set('plugin.gpio.symbiose.username', 'admin');
	Utils.Options.set('plugin.gpio.symbiose.password', 'admin');
	Utils.Options.set('plugin.gpio.blinkTime', 5);

	//When the application recognizes a voice model
	recognition.bind('complete', function(data) {
		if (!Utils.Options.get('plugin.gpio.enabled')) { //Is the plugin enabled ?
			return;
		}

		//Determine the robot's direction
		var direction;
		if (data.result.name == 'avance') {
			direction = 'forward';
		} else if (data.result.name == 'recule') {
			direction = 'backward';
		} else {
			return;
		}

		var pin = Utils.Options.get('plugin.gpio.pins.' + direction);

		//Send an ajax call
		$.ajax({
			url: Utils.Options.get('plugin.gpio.symbiose.url'),
			method: 'post',
			crossDomain: Utils.Options.get('plugin.gpio.symbiose.crossDomain'),
			dataType: 'json',
			data: {
				'class': 'GpioController',
				method: 'blink',
				arguments: JSON.stringify({
					pin: pin,
					time: Utils.Options.get('plugin.gpio.blinkTime')
				}),
				user: Utils.Options.get('plugin.gpio.symbiose.username'),
				password: Utils.Options.get('plugin.gpio.symbiose.password')
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