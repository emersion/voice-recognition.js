Utils.Options.set('utils.math.precision', 6);

Utils.Options.register('utils.logMessages', 'boolean', '#options-logMessages');
Utils.Options.register('voice.comparing.showFFT', 'boolean', '#options-showFFT');

Utils.Options.register('voice.analysis.tolerance', 'number', '#options-tolerance');
Utils.Options.register('voice.analysis.precision', 'number', '#options-precision');

Utils.Options.register('voice.shifting.maxPtShift', 'number', '#options-maxPtShift');
Utils.Options.register('voice.shifting.toleratedRatio', 'number', '#options-toleratedRatio');

var $recognitionControls = {
	audio: $('#audio-element'),
	canvas: $('#fft'),
	globalProgressContainer: $('#global-progress-container'),
	globalProgressBar: $('#global-progress-bar'),
	globalProgressMsg: $('#global-progress-msg'),
	resultContainer: $('#result-container'),
	resultName: $('#result-name'),
	resultAvg: $('#result-avg'),
	resultStd: $('#result-std'),
	resultError: $('#result-error'),

	inputFileTab: $('#input-file'),

	fileInput: $('#audio-file-input'),
	recognize: $('#recognize'),

	defaultModelsTab: $('#models-default')
};

var globalProgress = new Utils.Progress({
	parts: 4
});

globalProgress.bind('update', function(data) {
	$recognitionControls.globalProgressBar.css('width', data.value + '%');
	$recognitionControls.globalProgressMsg
		.toggleClass('text-error', data.error)
		.html(data.message || 'Loading...');

	if ($recognitionControls.globalProgressContainer.is(':hidden')) {
		$recognitionControls.globalProgressContainer.slideDown();
	}

	if (data.value == 100) {
		$recognitionControls.globalProgressContainer.slideUp();
	}
});

var analysis = VoiceAnalysis.build({
	audio: $recognitionControls.audio,
	canvas: $recognitionControls.canvas
});

$recognitionControls.audio.bind('play', function() {
	globalProgress.partComplete();
	globalProgress.message('Retrieving input data...');
}).bind('ended', function() {
	globalProgress.message('Input data retrieved.');

	analysis.processData();
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

analysis.init();

var recognition = VoiceRecognition.build();

recognition.bind('start', function() {
	globalProgress.message('Recognizing...');
});
recognition.bind('comparestart', function(data) {
	globalProgress.message('Comparing with '+data.model.name()+'...');
});
recognition.bind('comparecomplete', function(data) {
	globalProgress.message('Compared with '+data.model.name()+'.');
});
recognition.bind('complete', function(data) {
	globalProgress.partComplete();
	globalProgress.message('Recognition done.');

	var avg = data.data.modelSets.avgs[data.result.index],
	std = data.data.modelSets.stds[data.result.index];

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

	var error = 0;

	$recognitionControls.resultAvg
		.removeClass('text-success text-warning text-error')
		.addClass(resultClass)
		.html(avg);
	$recognitionControls.resultStd.html(std);
	$recognitionControls.resultError.html(error);
	$recognitionControls.resultName.html(data.result.name);

	$recognitionControls.resultContainer.slideDown();
});

var setRecognitionModels = function(callback) {
	callback = callback || function() {};

	globalProgress.message('Loading models...');

	if ($recognitionControls.inputFileTab.is('.active')) {
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
	globalProgress.value(0);

	$recognitionControls.audio[0].play();
});