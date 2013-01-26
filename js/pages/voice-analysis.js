Utils.Options.set('voice.audioNbr', 2); //Number of audio inputs
Utils.Options.set('utils.math.precision', 6); //Precision of numbers used.

//General options which are manageable from inputs
Utils.Options.register('utils.logMessages', 'boolean', '#options-logMessages');
Utils.Options.register('voice.comparing.showFFT', 'boolean', '#options-showFFT');
Utils.Options.register('voice.fnChaining', 'boolean', '#options-fnChaining');

Utils.Options.register('voice.analysis.frequencies', 'string', '#options-frequencies');

Utils.Options.register('voice.recording.speakingDelay', 'number', '#options-speaking-delay'); //Delay in seconds when speaking

Utils.Options.register('voice.analysis.tolerance', 'number', '#options-tolerance');
Utils.Options.register('voice.analysis.precision', 'number', '#options-precision');

Utils.Options.register('voice.shifting.enabled', 'boolean', '#options-enable-shifting');
Utils.Options.register('voice.shifting.maxPtShift', 'number', '#options-maxPtShift');
Utils.Options.register('voice.shifting.toleratedRatio', 'number', '#options-toleratedRatio');

var comparison; //The voice comparison

//Global controls
var $globalControls = {
	play: $('#audio-element-play'),
	pause: $('#audio-element-pause'),
	processData: $('#process-data'),
	buildModel: $('#build-model'),

	exportDataOptions: $('#export-data-model-options')
};

//Global control's events
$globalControls.play.bind('click', function() {
	var analyses = VoiceAnalysis.items();
	for (var i = 0; i < analyses.length; i++) {
		analyses[i].control('audio')[0].play();
	}
});
$globalControls.pause.bind('click', function() {
	var analyses = VoiceAnalysis.items();
	for (var i = 0; i < analyses.length; i++) {
		analyses[i].control('audio')[0].pause();
	}
});
$globalControls.processData.bind('click', function() {
	var analyses = VoiceAnalysis.items();
	for (var i = 0; i < analyses.length; i++) {
		analyses[i].processData();
	}
});
$globalControls.buildModel.bind('click', function() {
	var metadata = {
		gender: 'm',
		speaker: 'simon',
		micro: 'simon-samsung-shs-200v'
	};

	var analyses = VoiceAnalysis.items();

	var dataToExport = [], dataIndex = 0, i, j, k, analysis, time, magnitudes;
	for (i = 0; i < Utils.Options.get('voice.audioNbr'); i++) { //For each voice input
		analysis = analyses[i];

		var allVoiceData = analysis.standardizedData(),
		voiceDataToExport = {
			magnitude: [],
			time: [],
			frequencies: analysis.frequencies()
		};

		//Only keep interesting data
		for (j = 0; j < allVoiceData.magnitude.length; j++) {
			time = allVoiceData.time[j];

			if (time >= 0 && time <= 100) {
				magnitudes = [];
				for (k = 0; k < allVoiceData.magnitude[j].length; k++) {
					magnitudes.push(allVoiceData.magnitude[j][k]);
				}
				voiceDataToExport.magnitude.push(magnitudes);
				voiceDataToExport.time.push(time);
			}
		}

		dataToExport.push({
			name: analysis.name(),
			models: [
				{
					name: analysis.name(),
					gender: metadata.gender,
					speaker: metadata.speaker,
					micro: metadata.micro,
					data: voiceDataToExport
				}
			]
		});
	}

	Utils.Export.exportJSON(dataToExport);
});
VoiceAnalysis.bind('updatestatus', function(data) {
	var globalMinStatus = data.status;

	for (var index in $globalControls) {
		$globalControls[index].prop('disabled', true);
	}

	if (globalMinStatus > 0) {
		$globalControls.play.prop('disabled', false);
		$globalControls.pause.prop('disabled', false);
	}
	if (globalMinStatus > 1) {
		$globalControls.processData.prop('disabled', false);
	}
	if (globalMinStatus > 2) {
		$globalControls.buildModel.prop('disabled', false);
	}

	var globalFunctions = {
		3: function() {
			comparison.checkVoiceAnalyses();
		}
	};

	if (typeof globalFunctions[globalMinStatus] == 'function') {
		globalFunctions[globalMinStatus]();
	}
});

for (var i = 0; i < Utils.Options.get('voice.audioNbr'); i++) { //For each voice input
	(function() {
		//Define its controls
		var $controls = {
			fileInput: $('#audio-file-input-' + i),
			speakStart: $('#speak-start-' + i),
			speakStop: $('#speak-stop-' + i),
			speakRemainingTime: $('#speak-remaining-time-' + i),
			audio: $('#audio-element-' + i),
			canvas: $('#fft-' + i),
			title: $('#audio-file-name-' + i),
			editTitle: $('#audio-file-name-edit-' + i),
			processData: $('#process-data-' + i),
			exportCSV: $('#export-data-csv-' + i),
			exportJSON: $('#export-data-json-' + i),
			exportModel: $('#export-data-model-' + i)
		};

		//Resize the canvas
		var canvasMargin = $controls.canvas.outerWidth(true) - $controls.canvas.width();
		$controls.canvas.attr('width', ($controls.canvas.parent().width() - canvasMargin) + 'px');

		//Create a new voice analysis
		var analysis = VoiceAnalysis.build($controls);

		//Events
		$controls.fileInput.bind('change', function() {
			var file = $controls.fileInput[0].files[0];
			analysis.setInputFile(file);
		});
		$controls.editTitle.bind('click', function() {
			var newTitle = prompt('New name :', analysis.name());
			analysis.name(newTitle);
		});
		var recording = false, remainingTimeInterval;
		$controls.speakStart.bind('click', function() {
			if (recording) {
				return;
			}

			var frameBuffer, i, processedBuffers = 0, timeInterval;
			Recorder.record({
				start: function(channels, sampleRate, bufferLength) {
					$controls.speakStop.prop('disabled', false).show();
					$controls.speakStart.prop('disabled', true).hide();

					analysis.reset();

					//Delay to speak
					var delayToSpeak = Utils.Options.get('voice.recording.speakingDelay') * 1000, remainingTime;
					remainingTimeInterval = setInterval(function() {
						delayToSpeak -= 100;
						remainingTime = String(Math.round(delayToSpeak / 100) / 10).replace('.', ':');
						if (remainingTime.indexOf(':') == -1) {
							remainingTime += ':0';
						}
						$controls.speakRemainingTime.html('<i class="icon-time"></i> ' + remainingTime);
					}, 100);
					setTimeout(function() {
						$controls.speakStop.click();
					}, delayToSpeak);

					recording = true;

					bufferLength = 512;
					analysis.ready(channels, sampleRate, bufferLength);
					frameBuffer = new Float32Array(bufferLength);
					timeInterval = (1 / sampleRate) * bufferLength;
				},
				cancel: function() {
					globalProgress.error('Speech cancelled.');
				},
				progress: function(t, activityLevel) {
					$controls.speakStop.css('box-shadow', '0px 0px '+(activityLevel / 100) * 50+'px #BD362F');
				},
				audioAvailable: function(data, t) {
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
		});
		$controls.speakStop.bind('click', function() {
			if (!recording) {
				return;
			}
			recording = false;

			clearInterval(remainingTimeInterval);
			$controls.speakRemainingTime.empty();

			//$controls.speakStop.prop('disabled', true).hide().css('box-shadow', 'none');
			//$controls.speakStart.prop('disabled', false).show();

			Recorder.stop();

			if (analysis.length() == 0) {
				globalProgress.error('Empty data retrieved. Maybe you should restart Flash ("$ ps -aef | grep flashplayer") ?');
				return;
			}

			analysis.ended();
		});
		$controls.audio.bind('playing', function() {
			analysis.reset();
		});
		$controls.processData.bind('click', function() {
			analysis.processData();
		});
		$controls.exportCSV.bind('click', function() {
			analysis.exportData('csv');
		});
		$controls.exportJSON.bind('click', function() {
			analysis.exportData('json');
		});
		$controls.exportModel.bind('click', function() {
			var allVoiceData = analysis.standardizedData(), voiceDataToExport = {
				magnitude: [],
				time: [],
				frequencies: analysis.frequencies()
			};

			//Only keep interesting data
			for (var i = 0; i < allVoiceData.magnitude.length; i++) {
				time = allVoiceData.time[i];

				if (time >= 0 && time <= 100) {
					magnitudes = [];
					for (var j = 0; j < allVoiceData.magnitude[i].length; j++) {
						magnitudes.push(allVoiceData.magnitude[i][j]);
					}
					voiceDataToExport.magnitude.push(magnitudes);
					voiceDataToExport.time.push(time);
				}
			}

			var dataToExport = {
				name: analysis.name(),
				gender: 'm',
				speaker: '',
				micro: '',
				data: voiceDataToExport
			};

			Utils.Export.exportJSON(dataToExport);
		});

		analysis.bind('namechange', function(data) {
			$controls.title.html(data.name);
		});

		analysis.bind('ready', function() {
			analysis.frequencies(Utils.Options.get('voice.analysis.frequencies'));
		});

		analysis.bind('updatestatus', function(data) {
			var status = data.status;

			for (var index in $controls) {
				var $control = $controls[index];
				if ($control.is('button')) {
					$control.prop('disabled', true);
				}
			}

			$controls.editTitle.prop('disabled', false);
			$controls.speakStart.prop('disabled', false);
			$controls.speakStop.prop('disabled', false);

			if (status > 1) {
				$controls.processData.prop('disabled', false);
			}

			if (status > 2) {
				$controls.exportCSV.prop('disabled', false);
				$controls.exportJSON.prop('disabled', false);
				$controls.exportModel.prop('disabled', false);
			}

			if (Utils.Options.get('voice.fnChaining')) {
				var specificFunctions = {
					2: function() {
						analysis.processData();
					}
				};

				if (typeof specificFunctions[status] == 'function') {
					specificFunctions[status]();
				}
			}
		});

		//Now we can initialize the analysis
		analysis.init();

		//If the file is already specified (e.g. when reloading the page, inputs are pre-filled with their old values)
		var file = $controls.fileInput[0].files[0];
		analysis.setInputFile(file);
	})();
}

//Create the comparison between the 2 audio inputs
var analyses = VoiceAnalysis.items();
comparison = VoiceComparison.build(analyses[0], analyses[1]);

//Comparison's controls
var $comparisonControls = {
	prepareData: $('#prepare-data'),
	prepareAndExportData: $('#prepare-export-data'),
	shiftData: $('#shift-data'),
	shiftAndExportData: $('#shift-export-data'),
	compareData: $('#compare-data'),
	compareAndExportData: $('#compare-export-data'),
	resultContainer: $('#result-container'),
	resultAvg: $('#result-deviation'),
	resultStd: $('#result-std')
};

//Events
$comparisonControls.prepareData.bind('click', function() {
	comparison.prepareData();
});
$comparisonControls.shiftData.bind('click', function() {
	comparison.shiftData();
});
$comparisonControls.compareData.bind('click', function() {
	comparison.compareData();
});
$comparisonControls.prepareAndExportData.bind('click', function() {
	comparison.prepareData();
	comparison.exportPreparedData();
});
$comparisonControls.shiftAndExportData.bind('click', function() {
	comparison.shiftData();
	comparison.exportShiftedData();
});
$comparisonControls.compareAndExportData.bind('click', function() {
	comparison.compareData();
	comparison.exportComparedData();
});
comparison.bind('updatestatus', function(data) {
	var status = data.status;

	for (var index in $comparisonControls) {
		var $control = $comparisonControls[index];
		if ($control.is('button')) {
			$control.prop('disabled', true);
		}
	}

	if (status > 0) {
		$comparisonControls.prepareData.prop('disabled', false);
		$comparisonControls.prepareAndExportData.prop('disabled', false);
	}

	if (status > 1) {
		$comparisonControls.shiftData.prop('disabled', false);
		$comparisonControls.shiftAndExportData.prop('disabled', false);
	}

	if (status > 2) {
		$comparisonControls.compareData.prop('disabled', false);
		$comparisonControls.compareAndExportData.prop('disabled', false);
	}

	if (Utils.Options.get('voice.fnChaining')) {
		var specificFunctions = {
			1: function() {
				comparison.prepareData();
			},
			2: function() {
				comparison.shiftData();
			},
			3: function() {
				comparison.compareData();
			}
		};

		if (typeof specificFunctions[status] == 'function') {
			specificFunctions[status]();
		}
	}
});
comparison.bind('compare', function(data) {
	var avg = data.result.avg, std = data.result.std;

	var deviationRange = [0, 1.5],
	factor = avg / (deviationRange[1] - deviationRange[0]),
	resultClass;

	if (factor <= 0.33) {
		resultClass = 'text-success';
	} else if (factor <= 0.66) {
		resultClass = 'text-warning';
	} else {
		resultClass = 'text-error';
	}

	$comparisonControls.resultAvg
		.removeClass('text-success text-warning text-error')
		.addClass(resultClass)
		.html(avg);

	$comparisonControls.resultStd.html(std);

	$comparisonControls.resultContainer.slideDown();
})

//Initialize comparison
comparison.init();

//Initialize flash recorder
Recorder.initialize({
	swfSrc: 'swf/recorder.swf'
});