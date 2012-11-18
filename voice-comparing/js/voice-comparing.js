var audioNbr = 2,
data = [],
lastSpectrumIndex = 0,
lastSpectrumData = [],
showFft = document.getElementById('show-element-fft'),
toleranceEl = document.getElementById('tolerance'),
precisionEl = document.getElementById('precision'),
logConsoleEl = document.getElementById('console-log'),
autoChangeStatusEl = document.getElementById('auto-change-status');

function logMessage() {
	if (logConsoleEl.checked) {
		console.log.apply(window, Array.prototype.slice.call(arguments));
	}
}

// Math
function getNumWithSetDec(num, numOfDec) {
	numOfDec = (typeof numOfDec == 'number') ? numOfDec : parseFloat(precisionEl.value);

	var pow10s = Math.pow( 10, numOfDec );
	return ( numOfDec ) ? Math.round( pow10s * num ) / pow10s : num;
}
function getAverageFromNumArr(numArr, numOfDec, range) {
	range = range || [0, numArr.length - 1];

	var i = range[1] + 1,
		sum = 0;
	while( i-- && i >= range[0] ){
		sum += numArr[ i ];
	}

	return getNumWithSetDec( (sum / (range[1] - range[0]) ), numOfDec );
}
function getVariance(numArr, numOfDec, range) {
	range = range || [0, numArr.length - 1];

	var avg = getAverageFromNumArr(numArr, numOfDec, range), 
		i = range[1] + 1,
		v = 0;
 
	while( i-- && i >= range[0] ){
		v += Math.pow( (numArr[ i ] - avg), 2 );
	}
	v /= range[1] - range[0];
	return getNumWithSetDec(v, numOfDec);
}
function getStandardDeviation(numArr, numOfDec, range) {
	var stdDev = Math.sqrt(getVariance(numArr, numOfDec, range));
	return getNumWithSetDec(stdDev, numOfDec);
}

function audioChangeState(thisData) {
	var id = thisData.id, status = thisData.status;

	var globalMinStatus;
	for (var i = 0; i < data.length; i++) {
		if (typeof globalMinStatus != 'number' || data[i].status < globalMinStatus) {
			globalMinStatus = data[i].status;
		}
	}

	var globalControls = {
		play: document.getElementById('audio-element-play'),
		pause: document.getElementById('audio-element-pause'),
		processData: document.getElementById('process-data'),
		shiftData: document.getElementById('shift-data'),
		compareData: document.getElementById('compare-data'),
		shiftExportData: document.getElementById('shift-export-data'),
		compareExportData: document.getElementById('compare-export-data')
	};
	var specificControls = {
		processData: document.getElementById('process-data-' + id),
		exportDataToCSV: document.getElementById('export-data-csv-' + id),
		exportDataToJSON: document.getElementById('export-data-json-' + id)
	};

	for (var index in globalControls) {
		globalControls[index].disabled = true;
	}
	for (var index in specificControls) {
		specificControls[index].disabled = true;
	}

	if (globalMinStatus > 0) {
		globalControls.play.disabled = false;
		globalControls.pause.disabled = false;
	}

	if (status > 1) {
		specificControls.processData.disabled = false;
	}
	if (globalMinStatus > 1) {
		globalControls.processData.disabled = false;
	}

	if (status > 2) {
		specificControls.exportDataToCSV.disabled = false;
		specificControls.exportDataToJSON.disabled = false;
	}
	if (globalMinStatus > 2) {
		globalControls.shiftData.disabled = false;
		globalControls.compareData.disabled = false;
		globalControls.shiftExportData.disabled = false;
		globalControls.compareExportData.disabled = false;
	}

	if (autoChangeStatusEl.checked) {
		var globalFunctions = {
			3: function() {
				compareData(0, 1);
			}
		};
		var specificFunctions = {
			2: function() {
				processData(id);
			}
		};

		if (typeof globalFunctions[globalMinStatus] == 'function') {
			globalFunctions[globalMinStatus]();
		}
		if (typeof specificFunctions[status] == 'function') {
			specificFunctions[status]();
		}
	}
}

function processData(dataIndex) {
	(function(data) {
		var tolerance = parseFloat(toleranceEl.value),
		precision = parseFloat(precisionEl.value);

		logMessage('Détermination du début...');

		data.range = [0, data.dataIndex];

		for (var i = 0; i <= data.dataIndex; i++) {
			var range = [0, i - 1], maxMagnitude = data.magnitudes[i];

			if (range[1] - range[0] > 5) {
				var avg = getAverageFromNumArr(data.magnitudes, precision, range),
				stdDev = getStandardDeviation(data.magnitudes, precision, range),
				toleratedDev = stdDev * tolerance;

				logMessage(i, maxMagnitude, avg, toleratedDev);

				if (maxMagnitude < avg - toleratedDev || maxMagnitude > avg + toleratedDev) {
					data.range[0] = i;
					break;
				}
			}
		}

		logMessage('---------');
		logMessage('Détermination de la fin...');

		for (var i = data.dataIndex; i >= 0; i--) {
			var range = [i + 1, data.dataIndex], maxMagnitude = data.magnitudes[i];

			if (range[1] - range[0] > 5) {
				var avg = getAverageFromNumArr(data.magnitudes, precision, range),
				stdDev = getStandardDeviation(data.magnitudes, precision, range),
				toleratedDev = stdDev * tolerance;

				logMessage(i, maxMagnitude, avg, toleratedDev);

				if (maxMagnitude < avg - toleratedDev || maxMagnitude > avg + toleratedDev) {
					data.range[1] = i;
					break;
				}
			}
		}

		logMessage('---------');
		logMessage('Mise à l\'échelle des données...');

		data.percentages = [];
		data.percentagesTime = [];

		var startTime = data.magnitudesTime[data.range[0]],
		endTime = data.magnitudesTime[data.range[1]],
		duration = endTime - startTime;

		for (var i = 0; i <= data.dataIndex; i++) {
			var magnitude = data.magnitudes[i];

			data.percentages[i] = magnitude / data.maxMagnitude * 100;

			var t = data.magnitudesTime[i] - startTime;

			data.percentagesTime[i] = t / duration * 100;
		}

		data.status = 3;
		audioChangeState(data);
	})(data[dataIndex]);
}

function exportData(contents, type) {
	window.open('data:'+type+';base64,'+window.btoa(contents));
}

function exportCSV(csv) {
	return exportData(csv, 'text/csv');
}

function exportJSON(data) {
	return exportData(JSON.stringify(data), 'application/json');
}

function exportProcessedData(dataIndex, format) {
	var format = format || 'json';

	var out = 'Time;Time (%);Index;Max magnitude;Max magnitude (%);Status';
	var status = 0;

	(function(data) {
		switch (format) {
			case 'csv':
				for (var i = 0; i <= data.dataIndex; i++) {
					for (var j = 0; j < data.range.length; j++) {
						if (data.range[j] == i) {
							status = (status) ? 0 : 1;
						}
					}

					out += ("\n"+data.magnitudesTime[i]+';'+data.percentagesTime[i]+';'+data.magnitudesIndex[i]+';'+data.magnitudes[i]+';'+data.percentages[i]+';'+status).replace(/\./g,',');
				}

				exportCSV(out);
				break;
			case 'json':
				var dataToExport = {};

				for (var i = data.range[0]; i <= data.range[1]; i++) {
					dataToExport[data.percentagesTime[i]] = data.percentages[i];
				}

				exportJSON(dataToExport);
				break;
		}

		
	})(data[dataIndex]);
}

var maxDiff = 5,
toleratedRatio = 3;
function shiftData(leftIndex, rightIndex) {
	return (function(right, left) {
		var comparableData = {
			right: [],
			left: []
		};

		var lastLeftIndex = left.range[0] - 1,
		rightPercentageTime = 0,
		rightMaxPercentage = 0;
		for (var rightIndex = right.range[0]; rightIndex <= right.range[1]; rightIndex++) {
			rightPercentageTime = right.percentagesTime[rightIndex];
			rightMaxPercentage = right.percentages[rightIndex];

			logMessage('---------');
			logMessage('Right : ', rightIndex, rightPercentageTime, rightMaxPercentage);

			var j = 0,
			diff = 0,
			leftIndex = null,
			leftMaxPercentage = null,
			deviation = 0,
			ratio = 0,
			leftPercentageTime = 0,
			isDiffPositive = true;
			do {
				var leftIndex = lastLeftIndex + 1 + ((isDiffPositive) ? 1 : -1) * diff;

				if (leftIndex >= left.range[0] && leftIndex <= left.range[1]) {
					leftMaxPercentage = left.percentages[leftIndex];

					deviation = Math.abs(rightMaxPercentage - leftMaxPercentage);
					ratio = deviation / ((rightMaxPercentage + leftMaxPercentage) / 2);

					logMessage(isDiffPositive, rightIndex, leftIndex, rightMaxPercentage, leftMaxPercentage, deviation, ratio, (ratio <= toleratedRatio));

					if (ratio <= toleratedRatio) {
						break;
					}
				} else {
					logMessage(isDiffPositive, rightIndex, leftIndex, false);

					leftMaxPercentage = null;
					leftIndex = null;
				}

				j++;
				isDiffPositive = (j % 2 == 0) ? true : false;
				if (isDiffPositive) {
					diff++;
				}
			} while (diff < maxDiff);

			if (leftIndex === null) {
				leftIndex = lastLeftIndex + 1;
				leftMaxPercentage = left.percentages[leftIndex];
			}

			logMessage('=>', rightIndex, leftIndex, rightMaxPercentage, leftMaxPercentage);

			comparableData.right.push(rightMaxPercentage);
			comparableData.left.push(leftMaxPercentage);

			lastLeftIndex = leftIndex;
		}

		right.status = 4;
		left.status = 4;

		audioChangeState(right);
		audioChangeState(left);

		return comparableData;
	})(data[rightIndex], data[leftIndex]);
}

function exportShift(data) {
	var out = 'Index;Right;Left';
	for (var i = 0; i < data.right.length; i++) {
		out += ("\n"+i+';'+data.right[i]+';'+data.left[i]).replace(/\./g,',');
	}
	exportCSV(out);
}

function compareData(leftIndex, rightIndex) {
	var comparableData = shiftData(leftIndex, rightIndex);

	var deviations = [];

	var rightMaxPercentage, leftMaxPercentage, deviationPercentage, ratio, deviation;
	for (var i = 0; i < comparableData.right.length; i++) {
		rightMaxPercentage = comparableData.right[i];
		leftMaxPercentage = comparableData.left[i];

		deviationPercentage = Math.abs(rightMaxPercentage - leftMaxPercentage);
		ratio = deviationPercentage / ((rightMaxPercentage + leftMaxPercentage) / 2);

		deviations.push(ratio);
	}
	
	var avg = getAverageFromNumArr(deviations),
	std = getStandardDeviation(deviations);

	logMessage('---------');
	logMessage('Compare :');
	logMessage('Avg : ' + avg);
	logMessage('Std : ' + std);

	var gradientRange = [0, 2],
	factor = avg / (gradientRange[1] - gradientRange[0]),
	resultClass;

	if (factor <= 0.33) {
		resultClass = 'success';
	} else if (factor <= 0.66) {
		resultClass = 'warning';
	} else {
		resultClass = 'error';
	}

	document.getElementById('result-container').style.display = 'block';
	$('#result-deviation').addClass('text-'+resultClass);
	document.getElementById('result-deviation').innerHTML = avg;
	document.getElementById('result-std').innerHTML = std;

	var right = data[rightIndex], left = data[leftIndex];

	right.status = 5;
	left.status = 5;

	audioChangeState(right);
	audioChangeState(left);

	return deviations;
}

function exportCompare(data) {
	var out = 'Index;Deviation';
	for (var i = 0; i < data.length; i++) {
		out += ("\n"+i+';'+data[i]).replace(/\./g,',');
	}
	exportCSV(out);
}

function fileChange(data) {
	var file = data.fileInput.files[0];
	if (!file) {
		return;
	}
	data.audio.src = window.URL.createObjectURL(file);
	data.name = file.name;
	data.title.innerHTML = data.name;
}

function loadedMetadata(data) {
	data.channels          = data.audio.mozChannels;
	data.rate              = data.audio.mozSampleRate;
	data.frameBufferLength = data.audio.mozFrameBufferLength;

	data.started = false;
	data.isBegining = true;
	data.finished = false;
	data.isEnd = true;

	data.dataIndex = 0;
	data.maxMagnitude = 0;

	data.magnitudes = new Float32Array(1024);
	data.magnitudesIndex = new Float32Array(1024);
	data.magnitudesTime = new Float32Array(1024);
	data.range = [];

	data.fft = new FFT(data.frameBufferLength / data.channels, data.rate);
}

function audioAvailable(data, event) {
	var fb = event.frameBuffer,
	t  = event.time, /* unused, but it's there */
	signal = new Float32Array(fb.length / data.channels),
	magnitude,
	lastMagnitude,
	maxMagnitude = 0,
	maxMagnitudeIndex;

	for (var i = 0, fbl = data.frameBufferLength / 2; i < fbl; i++ ) {
		// Assuming interlaced stereo channels,
		// need to split and merge into a stero-mix mono signal
		signal[i] = (fb[2*i] + fb[2*i+1]) / 2;
	}

	data.fft.forward(signal);

	if (showFft.checked) {
		data.ctx.clearRect(0,0, data.canvas.width, data.canvas.height);
	}

	for (var i = 0; i < data.fft.spectrum.length; i++ ) {
		// multiply spectrum by a zoom value
		magnitude = data.fft.spectrum[i] * 4000;

		if (magnitude > maxMagnitude) {
			maxMagnitude = magnitude;
			maxMagnitudeIndex = i;
		}

		if (showFft.checked) {
			// Draw rectangle bars for each frequency bin
			data.ctx.fillRect(i * 4, data.canvas.height, 3, - magnitude);
		}
	}

	if (data.dataIndex < data.magnitudes.length) {
		data.magnitudes[data.dataIndex] = maxMagnitude;
		data.magnitudesIndex[data.dataIndex] = maxMagnitudeIndex;
		data.magnitudesTime[data.dataIndex] = t;
	}

	if (data.maxMagnitude < maxMagnitude) {
		data.maxMagnitude = maxMagnitude;
	}

	data.dataIndex++;
}

for (var i = 0; i < audioNbr; i++) {
	(function(i) {
		data[i] = {};

		data[i].id = i;
		data[i].audio = document.getElementById('audio-element-'+i);
		data[i].fileInput = document.getElementById('audio-file-input-'+i);
		data[i].title = document.getElementById('audio-file-name-'+i);
		data[i].canvas = document.getElementById('fft-'+i);
		data[i].ctx = data[i].canvas.getContext('2d');
		data[i].status = 0;

		data[i].fileInput.addEventListener('change', function () {
			fileChange(data[i]);
		});
		data[i].audio.addEventListener('MozAudioAvailable', function(event) {
			audioAvailable(data[i], event);
		});
		data[i].audio.addEventListener('loadedmetadata', function() {
			loadedMetadata(data[i]);

			data[i].status = 1;
			audioChangeState(data[i]);
		});
		data[i].audio.addEventListener('ended', function(e) {
			data[i].status = 2;
			audioChangeState(data[i]);
		});

		data[i].title.innerHTML = 'Audio input #'+(i+1);

		document.getElementById('process-data-'+i).addEventListener('click', function() {
			processData(i);
		});
		document.getElementById('export-data-csv-'+i).addEventListener('click', function() {
			exportProcessedData(i, 'csv');
		});
		document.getElementById('export-data-json-'+i).addEventListener('click', function() {
			exportProcessedData(i, 'json');
		});

		audioChangeState(data[i]);
	})(i);
}

document.getElementById('audio-element-play').addEventListener('click', function() {
	for (var i = 0; i < data.length; i++) {
		data[i].audio.load();
	}
	for (var i = 0; i < data.length; i++) {
		data[i].audio.play();
	}
});
document.getElementById('audio-element-pause').addEventListener('click', function() {
	for (var i = 0; i < data.length; i++) {
		data[i].audio.pause();
	}
});
document.getElementById('process-data').addEventListener('click', function() {
	for (var i = 0; i < data.length; i++) {
		processData(i);
	}
});
document.getElementById('shift-data').addEventListener('click', function() {
	shiftData(0, 1);
});
document.getElementById('compare-data').addEventListener('click', function() {
	compareData(0, 1);
});
document.getElementById('shift-export-data').addEventListener('click', function() {
	var data = shiftData(0, 1);
	exportShift(data);
});
document.getElementById('compare-export-data').addEventListener('click', function() {
	var data = compareData(0, 1);
	exportCompare(data);
});

setTimeout(function() {
	for (var i = 0; i < data.length; i++) {
		fileChange(data[i]);
	}
}, 0);

// FFT from dsp.js, see below
var FFT = function(bufferSize, sampleRate) {
	this.bufferSize   = bufferSize;
	this.sampleRate   = sampleRate;
	this.spectrum     = new Float32Array(bufferSize/2);
	this.real         = new Float32Array(bufferSize);
	this.imag         = new Float32Array(bufferSize);
	this.reverseTable = new Uint32Array(bufferSize);
	this.sinTable     = new Float32Array(bufferSize);
	this.cosTable     = new Float32Array(bufferSize);

	var limit = 1,
	bit = bufferSize >> 1;

	while ( limit < bufferSize ) {
		for ( var i = 0; i < limit; i++ ) {
			this.reverseTable[i + limit] = this.reverseTable[i] + bit;
		}

		limit = limit << 1;
		bit = bit >> 1;
	}

	for ( var i = 0; i < bufferSize; i++ ) {
		this.sinTable[i] = Math.sin(-Math.PI/i);
		this.cosTable[i] = Math.cos(-Math.PI/i);
	}
};

FFT.prototype.forward = function(buffer) {
	var bufferSize   = this.bufferSize,
	cosTable     = this.cosTable,
	sinTable     = this.sinTable,
	reverseTable = this.reverseTable,
	real         = this.real,
	imag         = this.imag,
	spectrum     = this.spectrum;

	if ( bufferSize !== buffer.length ) {
		throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + bufferSize + " Buffer Size: " + buffer.length;
	}

	for ( var i = 0; i < bufferSize; i++ ) {
		real[i] = buffer[reverseTable[i]];
		imag[i] = 0;
	}

	var halfSize = 1,
	phaseShiftStepReal,	
	phaseShiftStepImag,
	currentPhaseShiftReal,
	currentPhaseShiftImag,
	off,
	tr,
	ti,
	tmpReal,	
	i;

	while ( halfSize < bufferSize ) {
		phaseShiftStepReal = cosTable[halfSize];
		phaseShiftStepImag = sinTable[halfSize];
		currentPhaseShiftReal = 1.0;
		currentPhaseShiftImag = 0.0;

		for ( var fftStep = 0; fftStep < halfSize; fftStep++ ) {
			i = fftStep;

			while ( i < bufferSize ) {
				off = i + halfSize;
				tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
				ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

				real[off] = real[i] - tr;
				imag[off] = imag[i] - ti;
				real[i] += tr;
				imag[i] += ti;

				i += halfSize << 1;
			}

			tmpReal = currentPhaseShiftReal;
			currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
			currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
		}

		halfSize = halfSize << 1;
	}

	i = bufferSize/2;
	while(i--) {
		spectrum[i] = 2 * Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / bufferSize;
	}
};