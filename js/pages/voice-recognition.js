Utils.Options.set('utils.math.precision', 6); //Precision of numbers used

//General options which are manageable from inputs
Utils.Options.register('utils.logMessages', 'boolean', '#options-logMessages');
Utils.Options.register('voice.comparing.showFFT', 'boolean', '#options-showFFT');

Utils.Options.register('voice.analysis.frequencies', 'string', '#options-frequencies');

Utils.Options.register('voice.recording.speakingDelay', 'number', '#options-speaking-delay'); //Delay in seconds when speaking

Utils.Options.register('voice.analysis.tolerance', 'number', '#options-tolerance');
Utils.Options.register('voice.analysis.precision', 'number', '#options-precision');

Utils.Options.register('voice.shifting.enabled', 'boolean', '#options-enable-shifting');
Utils.Options.register('voice.shifting.maxPtShift', 'number', '#options-maxPtShift');
Utils.Options.register('voice.shifting.toleratedRatio', 'number', '#options-toleratedRatio');

//General controls
var $recognitionControls = {
	audio: $('#audio-element'),
	canvas: $('#fft'),
	globalProgressContainer: $('#global-progress-container'),
	globalProgressBar: $('#global-progress-bar'),
	globalProgressMsg: $('#global-progress-msg'),
	resultContainer: $('#result-container'),
	resultSentence: $('#result-sentence'),
	resultAvg: $('#result-avg'),
	resultStd: $('#result-std'),
	resultError: $('#result-error'),

	inputMicrophoneTab: $('#input-microphone'),
	inputFileTab: $('#input-file'),

	fileInput: $('#audio-file-input'),
	recognize: $('#recognize'),

	speakStart: $('#speak-start'),
	speakStop: $('#speak-stop'),
	speakRemainingTime: $('#speak-remaining-time'),

	defaultModelsTab: $('#models-default'),
	fileModelsTab: $('#models-file'),
	dataModelsTab: $('#models-data'),

	fileModelsInput: $('#models-file-input'),
	dataModelsInput: $('#models-data-input')
};

//Resize the canvas
var canvasMargin = $recognitionControls.canvas.outerWidth(true) - $recognitionControls.canvas.width();
$recognitionControls.canvas.attr('width', ($recognitionControls.canvas.parent().width() - canvasMargin) + 'px');

//Create a new progress for the recognition
var globalProgress = new Utils.Progress({
	parts: 4
});

//Events
globalProgress.bind('update', function(data) {
	$recognitionControls.globalProgressBar.css('width', data.value + '%');
	$recognitionControls.globalProgressMsg
		.toggleClass('text-error', data.error)
		.html(data.message || 'Loading...');

	if (data.value == 100 && !data.error) {
		$recognitionControls.globalProgressContainer.stop().slideUp();
	} else if ($recognitionControls.globalProgressContainer.is(':hidden')) {
		$recognitionControls.globalProgressContainer.stop().slideDown();
	}
});

//Create a new analysis for the audio input
var analysis = VoiceAnalysis.build({
	audio: $recognitionControls.audio,
	canvas: $recognitionControls.canvas
});
analysis.init(); //Initialize the analysis

//Events
$recognitionControls.audio.bind('playing', function() {
	analysis.reset();

	globalProgress.reset();
	globalProgress.partComplete();
	globalProgress.message('Retrieving input data...');
}).bind('ended pause', function() {
	globalProgress.message('Input data retrieved.');

	analysis.processData();
});
analysis.bind('ready', function() {
	analysis.frequencies(Utils.Options.get('voice.analysis.frequencies'));
});
analysis.bind('start', function() {
	globalProgress.message('Analysing input...');
});
analysis.bind('complete', function() {
	globalProgress.partComplete();
	globalProgress.message('Input analysis done.');

	recognition.setInputAnalysis(analysis);

	setRecognitionModels(function() {
		recognition.recognize();
	});
});
analysis.bind('inputchange', function() {
	$recognitionControls.recognize.prop('disabled', false);
});

//Create a new voice recognition
var recognition = VoiceRecognition.build();

//Events
recognition.bind('start', function() {
	globalProgress.message('Recognizing...');
});
recognition.bind('comparestart', function(data) {
	globalProgress.message('Comparing with '+data.model.name()+'...');
});
recognition.bind('comparecomplete', function(data) {
	globalProgress.partComplete(1 / recognition.countVoiceModels());
	globalProgress.message('Compared with '+data.model.name()+'.');
});
recognition.bind('complete', function(data) {
	globalProgress.value(100);
	globalProgress.message('Recognition done.');

	var avg = data.data.modelSets.avgs[data.result.index],
	std = data.data.modelSets.stds[data.result.index];

	var deviationRange = [0, 1.5],
	avgFactor = avg / (deviationRange[1] - deviationRange[0]);

	var stdRange = [0, 0.7],
	stdFactor = std / (stdRange[1] - stdRange[0]);
	
	var resultClasses = ['text-success', 'text-warning', 'text-error'];
	var getResultClass = function(factor) {
		if (factor <= 0.33) {
			return resultClasses[0];
		} else if (factor <= 0.66) {
			return resultClasses[1];
		} else {
			return resultClasses[2];
		}
	};
	var getSentence = function(value, factor) {
		var sentences = ['You said : "'+value+'" !','You probably said : "'+value+'".','Did you say : "'+value+'" ?'];
		if (factor <= 0.33) {
			return sentences[0];
		} else if (factor <= 0.66) {
			return sentences[1];
		} else {
			return sentences[2];
		}
	};

	$recognitionControls.resultAvg
		.removeClass(resultClasses.join(' '))
		.addClass(getResultClass(avgFactor))
		.html(avg * 100 + '%');
	$recognitionControls.resultStd
		.removeClass(resultClasses.join(' '))
		.addClass(getResultClass(stdFactor))
		.html(std * 100 + '%');
	$recognitionControls.resultError
		.removeClass(resultClasses.join(' '))
		.addClass(getResultClass(data.stats.avgError))
		.html(data.stats.avgError * 100 + '%');

	$recognitionControls.resultSentence.html(getSentence(data.result.name, data.stats.avgError));

	$recognitionControls.resultContainer.slideDown();
});

/**
 * Load recognition's models.
 * @param {Function} callback A function which will be called when the models are loaded.
 */
var setRecognitionModels = function(callback) {
	callback = callback || function() {};

	globalProgress.message('Loading models...');

	if ($recognitionControls.defaultModelsTab.is('.active')) {
		$.ajax({
			url: 'json/models.json',
			dataType: 'json',
			success: function(models) {
				recognition.setVoiceModels(models);

				globalProgress.partComplete();
				globalProgress.message('Models loaded.');

				callback();
			},
			error: function(jqXHR, textStatus, errorThrown) {
				globalProgress.error('Can\'t retrieve models : '+textStatus+' '+errorThrown);
			}
		});
	} else if ($recognitionControls.fileModelsTab.is('.active')) {
		var files = $recognitionControls.fileModelsInput[0].files;

		if (!files || !files.length) {
			globalProgress.error('Please select a models file.');
			return;
		}

		var file = files[0];

		if (file.type && file.type != 'application/json') {
			globalProgress.error('Incorrect models file type. Required type : "application/json" (file extension : ".json").');
			return;
		}

		var reader = new FileReader();

		reader.onload = function(event) {
			try {
				var json = event.target.result,
				models = JSON.parse(json);
			} catch (error) {
				globalProgress.error('Corrupted models data (error : "'+error.message+'").');
				return;
			}

			recognition.setVoiceModels(models);

			globalProgress.partComplete();
			globalProgress.message('Models loaded.');

			callback();
		};

		reader.readAsText(file);
	} else if ($recognitionControls.dataModelsTab.is('.active')) {
		var json = $recognitionControls.dataModelsInput.val();

		try {
			var models = JSON.parse(json);
		} catch (error) {
			globalProgress.error('Corrupted models data (error : "'+error.message+'").');
			return;
		}

		recognition.setVoiceModels(models);

		globalProgress.partComplete();
		globalProgress.message('Models loaded.');

		callback();
	}
};

//File input
$recognitionControls.fileInput.bind('change', function() {
	var file = $recognitionControls.fileInput[0].files[0];
	analysis.setInputFile(file);
});
var file = $recognitionControls.fileInput[0].files[0];
analysis.setInputFile(file);

$recognitionControls.recognize.click(function() {
	globalProgress.reset();

	$recognitionControls.audio[0].play();
});

//Microphone input
var isRecording = false, remainingTimeInterval;
$recognitionControls.speakStart.click(function() {
	if (isRecording) {
		return;
	}

	globalProgress.reset();
	globalProgress.message('Waiting for microphone...');

	var recording = function() {
		isRecording = true;

		$recognitionControls.speakStop.prop('disabled', false).show();
		$recognitionControls.speakStart.prop('disabled', true).hide();

		analysis.reset();
		globalProgress.reset();

		globalProgress.partComplete();
		globalProgress.message('Recording...');

		//Delay to speak
		var delayToSpeak = Utils.Options.get('voice.recording.speakingDelay') * 1000, remainingTime;
		remainingTimeInterval = setInterval(function() {
			delayToSpeak -= 100;
			remainingTime = String(Math.round(delayToSpeak / 100) / 10).replace('.', ':');
			if (remainingTime.indexOf(':') == -1) {
				remainingTime += ':0';
			}
			$recognitionControls.speakRemainingTime.html('<i class="icon-time"></i> ' + remainingTime);
		}, 100);
		setTimeout(function() {
			$recognitionControls.speakStop.click();
		}, delayToSpeak);
	};

	navigator.getMedia = (navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia);

	if (navigator.getMedia && (window.AudioContext || window.webkitAudioContext) && false) { //Not supported
		navigator.getMedia({
			video: false,
			audio: true
		}, function(stream) {
			recording();

			if (navigator.mozGetUserMedia) {
				$recognitionControls.audio[0].mozSrcObject = stream;
			} else {
				var vendorURL = window.URL || window.webkitURL;
				$recognitionControls.audio[0].src = vendorURL ? vendorURL.createObjectURL(stream) : stream;
			}

			$recognitionControls.audio[0].play();
		}, function(err) {
			var msg;
			if (err == 'NOT_SUPPORTED_ERROR') {
				msg = 'the browser does\'nt support microphone capturing';
			} else if (err == 'PERMISSION_DENIED') {
				msg = 'you denied the application to access your microphone';
			} else if (err == 'MANDATORY_UNSATISFIED_ERROR') {
				msg = 'no audio tracks are found';
			} else if (err == 'NO_DEVICES_FOUND') {
				msg = 'no microphone detected';
			}

			globalProgress.error('Can\'t capture microphone : '+((msg) ? msg + ' ('+err+')' : err)+'.');
		});
	} else { //Flash fallback
		var frameBuffer, i, processedBuffers = 0, timeInterval;
		window.liveMicData = '';
		Recorder.record({
			start: function(channels, sampleRate, bufferLength) {
				recording();
				bufferLength = 512;
				timeInterval = (1 / sampleRate) * bufferLength;
				analysis.ready(channels, sampleRate, bufferLength);
				frameBuffer = new Float32Array(bufferLength);
			},
			cancel: function() {
				globalProgress.error('Speech cancelled.');
			},
			progress: function(t, activityLevel) {
				$recognitionControls.speakStop.css('box-shadow', '0px 0px '+(activityLevel / 100) * 50+'px #BD362F');
			},
			audioAvailable: function(data, t) {
				window.liveMicData += data;
				data = data.split(';');

				var processedSamples = 0;
				while (processedSamples + frameBuffer.length < data.length) {
					for (i = 0; i < frameBuffer.length; i++) {
						frameBuffer[i] = data[processedSamples + i] || 0;
					}

					analysis.audioAvailable(frameBuffer, (processedBuffers + 1) * timeInterval);

					processedSamples += frameBuffer.length;
					processedBuffers++;
				}
			}
		});
	}
});
$recognitionControls.speakStop.click(function() {
	if (!isRecording) {
		return;
	}
	isRecording = false;

	clearInterval(remainingTimeInterval);
	$recognitionControls.speakRemainingTime.empty();

	$recognitionControls.speakStart.prop('disabled', false).show();
	$recognitionControls.speakStop.prop('disabled', true).hide().css('box-shadow', 'none');

	if (navigator.getMedia && (window.AudioContext || window.webkitAudioContext) && false) { //Not supported
		$recognitionControls.audio[0].pause();
	} else {
		globalProgress.message('Retrieving recorded data...');

		Recorder.stop();

		if (analysis.length() == 0) {
			globalProgress.error('Empty data retrieved. Maybe you should restart Flash ("$ ps -aef | grep flashplayer") ?');
			return;
		}

		analysis.ended();
		analysis.processData();
	}
});

//Initialize flash recorder
Recorder.initialize({
	swfSrc: 'swf/recorder.swf'
});