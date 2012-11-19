Utils.Options.set('voice.audioNbr', 2);
Utils.Options.set('utils.math.precision', 6);

Utils.Options.register('utils.logMessages', 'boolean', '#options-logMessages');
Utils.Options.register('voice.comparing.showFFT', 'boolean', '#options-showFFT');
Utils.Options.register('voice.fnChaining', 'boolean', '#options-fnChaining');

Utils.Options.register('voice.analysis.tolerance', 'number', '#options-tolerance');
Utils.Options.register('voice.analysis.precision', 'number', '#options-precision');

Utils.Options.register('voice.shifting.maxPtShift', 'number', '#options-maxPtShift');
Utils.Options.register('voice.shifting.toleratedRatio', 'number', '#options-toleratedRatio');

var comparison;

var $globalControls = {
	play: $('#audio-element-play'),
	pause: $('#audio-element-pause'),
	processData: $('#process-data')
};
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

	var globalFunctions = {
		3: function() {
			comparison.checkVoiceAnalyses();
		}
	};

	if (typeof globalFunctions[globalMinStatus] == 'function') {
		globalFunctions[globalMinStatus]();
	}
});

for (var i = 0; i < Utils.Options.get('voice.audioNbr'); i++) {
	(function() {
		var $controls = {
			fileInput: $('#audio-file-input-' + i),
			audio: $('#audio-element-' + i),
			canvas: $('#fft-' + i),
			title: $('#audio-file-name-' + i),
			processData: $('#process-data-' + i),
			exportCSV: $('#export-data-csv-' + i),
			exportJSON: $('#export-data-json-' + i)
		};

		var analysis = VoiceAnalysis.build($controls);

		$controls.fileInput.bind('change', function() {
			var file = $controls.fileInput[0].files[0];
			analysis.setInputFile(file);
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

		analysis.bind('inputchange', function(data) {
			if (data.file) {
				$controls.title.html(data.file.name);
			} else {
				$controls.title.html('Audio input #' + (analysis.id() + 1));
			}
		});

		analysis.bind('updatestatus', function(data) {
			var status = data.status;

			for (var index in $controls) {
				var $control = $controls[index];
				if ($control.is('button')) {
					$control.prop('disabled', true);
				}
			}

			if (status > 1) {
				$controls.processData.prop('disabled', false);
			}

			if (status > 2) {
				$controls.exportCSV.prop('disabled', false);
				$controls.exportJSON.prop('disabled', false);
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

		analysis.init();

		var file = $controls.fileInput[0].files[0];
		analysis.setInputFile(file);
	})();
}

var analyses = VoiceAnalysis.items();
comparison = VoiceComparison.build(analyses[0], analyses[1]);

var $comparisonControls = {
	shiftData: $('#shift-data'),
	shiftAndExportData: $('#shift-export-data'),
	compareData: $('#compare-data'),
	comparedAndExportData: $('#compare-export-data'),
	resultContainer: $('#result-container'),
	resultAvg: $('#result-deviation'),
	resultStd: $('#result-std')
};
$comparisonControls.shiftData.bind('click', function() {
	comparison.shiftData();
});
$comparisonControls.compareData.bind('click', function() {
	comparison.shiftData();
	comparison.compareData();
});
$comparisonControls.shiftAndExportData.bind('click', function() {
	comparison.shiftData();
	comparison.exportShiftedData();
});
$comparisonControls.comparedAndExportData.bind('click', function() {
	comparison.shiftData();
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
		$comparisonControls.shiftData.prop('disabled', false);
		$comparisonControls.shiftAndExportData.prop('disabled', false);
	}

	if (status > 1) {
		$comparisonControls.compareData.prop('disabled', false);
		$comparisonControls.comparedAndExportData.prop('disabled', false);
	}

	if (Utils.Options.get('voice.fnChaining')) {
		var specificFunctions = {
			1: function() {
				comparison.shiftData();
			},
			2: function() {
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

	$comparisonControls.resultStd.html(avg);

	$comparisonControls.resultContainer.slideDown();
})

comparison.init();