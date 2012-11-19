Utils.Options.set('voice.audioNbr', 2);
Utils.Options.set('utils.math.precision', 6);

Utils.Options.register('utils.logMessages', 'boolean', '#options-logMessages');
Utils.Options.register('voice.comparing.showFFT', 'boolean', '#options-showFFT');
Utils.Options.register('voice.fnChaining', 'boolean', '#options-fnChaining');

Utils.Options.register('voice.analysis.tolerance', 'number', '#options-tolerance');
Utils.Options.register('voice.analysis.precision', 'number', '#options-precision');

Utils.Options.register('voice.shifting.maxPtShift', 'number', '#options-maxPtShift');
Utils.Options.register('voice.shifting.toleratedRatio', 'number', '#options-toleratedRatio');


document.getElementById('audio-element-play').addEventListener('click', function() {
	var analyses = VoiceAnalysis.items();
	for (var i = 0; i < analyses.length; i++) {
		analyses[i].control('audio')[0].play();
	}
});
document.getElementById('audio-element-pause').addEventListener('click', function() {
	var analyses = VoiceAnalysis.items();
	for (var i = 0; i < analyses.length; i++) {
		analyses[i].control('audio')[0].pause();
	}
});
document.getElementById('process-data').addEventListener('click', function() {
	var analyses = VoiceAnalysis.items();
	for (var i = 0; i < analyses.length; i++) {
		analyses[i].processData();
	}
});

var comparisonControls = {
	$shiftData: $('#shift-data'),
	$shiftAndExportData: $('#shift-export-data'),
	$compareData: $('#compare-data'),
	$comparedAndExportData: $('#compare-export-data')
};

document.getElementById('shift-data').addEventListener('click', function() {
	voiceComparison.shiftData();
});
document.getElementById('compare-data').addEventListener('click', function() {
	voiceComparison.shiftData();
	voiceComparison.compareData();
});
document.getElementById('shift-export-data').addEventListener('click', function() {
	voiceComparison.shiftData();
	voiceComparison.exportShiftedData();
});
document.getElementById('compare-export-data').addEventListener('click', function() {
	voiceComparison.shiftData();
	voiceComparison.compareData();
	voiceComparison.exportComparedData();
});

for (var i = 0; i < Utils.Options.get('voice.audioNbr'); i++) {
	(function() {
		var controls = {
			$fileInput: $('#audio-file-input-' + i),
			$audio: $('#audio-element-' + i),
			$canvas: $('#fft-' + i),
			$title: $('#audio-file-name-' + i),
			$processData: $('#process-data-' + i),
			$exportCSV: $('#export-data-csv-' + i),
			$exportJSON: $('#export-data-json-' + i)
		};

		var analysis = VoiceAnalysis.build(controls);

		controls.$processData.bind('click', function() {
			analysis.processData();
		});
		controls.$exportCSV.bind('click', function() {
			analysis.exportData('csv');
		});
		controls.$exportJSON.bind('click', function() {
			analysis.exportData('json');
		});
	})();
}

var analyses = VoiceAnalysis.items();
var voiceComparison = VoiceComparison.build(comparisonControls, analyses[0], analyses[1]);

setTimeout(function() {
	var analyses = VoiceAnalysis.items();
	for (var i = 0; i < analyses.length; i++) {
		analyses[i]._fileChange();
	}
}, 0);