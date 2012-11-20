// FFT from dsp.js, see below
var FFT = function FFT(bufferSize, sampleRate) {
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

FFT.prototype.forward = function forward(buffer) {
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

var VoiceAnalysis = function VoiceAnalysis(options) {
	Utils.Observable.call(this);

	this._id = options.id;
	this._$controls = options.controls;
	this._status = 0;
	this._name = 'Audio input #' + (this.id() + 1);
};
VoiceAnalysis.prototype = {
	id: function getId() {
		return this._id;
	},
	name: function getName() {
		return this._name;
	},
	control: function getControl(name) {
		return this._$controls[name];
	},
	status: function getStatus() {
		return this._status;
	},
	range: function getRange() {
		return this._range || [];
	},
	normalizedData: function getNormalizedData() {
		return {
			magnitude: this._normalizedMagnitudes,
			time: this._normalizedTime
		};
	},
	init: function init() {
		var that = this;

		this.control('audio')
			.bind('MozAudioAvailable', function(event) {
				that._audioAvailable(event.originalEvent);
			})
			.bind('loadedmetadata', function() {
				that._loadedMetadata();
			})
			.bind('ended', function() {
				that._updateStatus(2);
			});

		this._updateStatus();
	},
	_updateStatus: function _updateStatus(status) {
		status = (typeof status == 'number') ? status : this._status;
		this._status = status;

		this.notify('updatestatus', { status: status });

		VoiceAnalysis._updatedStatus(this);
	},
	setInputFile: function setInputFile(file) {
		if (!file) {
			return;
		}

		this._input = file;
		this.control('audio').attr('src', window.URL.createObjectURL(file));
		this._name = file.name;

		this.notify('inputchange', {
			file: file
		});
	},
	_loadedMetadata: function _loadedMetadata() {
		this._channels          = this.control('audio')[0].mozChannels;
		this._rate              = this.control('audio')[0].mozSampleRate;
		this._frameBufferLength = this.control('audio')[0].mozFrameBufferLength;

		this._dataIndex = 0;
		this._maxMagnitude = 0;

		this._magnitudes = new Float32Array(1024);
		this._magnitudesIndex = new Float32Array(1024);
		this._magnitudesTime = new Float32Array(1024);

		this._fft = new FFT(this._frameBufferLength / this._channels, this._rate);

		this._updateStatus(1);
	},
	_audioAvailable: function _audioAvailable(event) {
		var fb = event.frameBuffer,
		t  = event.time, /* unused, but it's there */
		signal = new Float32Array(fb.length / this._channels),
		magnitude,
		lastMagnitude,
		maxMagnitude = 0,
		maxMagnitudeIndex;

		var showFFT = Utils.Options.get('voice.comparing.showFFT'),
		canvas = this.control('canvas')[0],
		ctx = canvas.getContext('2d');

		for (var i = 0, fbl = this._frameBufferLength / 2; i < fbl; i++ ) {
			// Assuming interlaced stereo channels,
			// need to split and merge into a stero-mix mono signal
			signal[i] = (fb[2*i] + fb[2*i+1]) / 2;
		}

		this._fft.forward(signal);

		if (showFFT) {
			ctx.clearRect(0,0, canvas.width, canvas.height);
		}

		for (var i = 0; i < this._fft.spectrum.length; i++ ) {
			// multiply spectrum by a zoom value
			magnitude = this._fft.spectrum[i] * 4000;

			if (magnitude > maxMagnitude) {
				maxMagnitude = magnitude;
				maxMagnitudeIndex = i;
			}

			if (showFFT) {
				// Draw rectangle bars for each frequency bin
				ctx.fillRect(i * 4, canvas.height, 3, - magnitude);
			}
		}

		if (this._dataIndex < this._magnitudes.length) {
			this._magnitudes[this._dataIndex] = maxMagnitude;
			this._magnitudesIndex[this._dataIndex] = maxMagnitudeIndex;
			this._magnitudesTime[this._dataIndex] = t;
		}

		if (this._maxMagnitude < maxMagnitude) {
			this._maxMagnitude = maxMagnitude;
		}

		this._dataIndex++;
	},
	processData: function processData() {
		this.notify('start');

		var tolerance = Utils.Options.get('voice.analysis.tolerance'),
		precision = Utils.Options.get('voice.analysis.precision');

		Utils.logMessage('Détermination du début...');

		this._range = [0, this._dataIndex];

		for (var i = 0; i <= this._dataIndex; i++) {
			var range = [0, i - 1], maxMagnitude = this._magnitudes[i];

			if (range[1] - range[0] > 5) {
				var avg = Utils.Math.getAverageFromNumArr(this._magnitudes, precision, range),
				stdDev = Utils.Math.getStandardDeviation(this._magnitudes, precision, range),
				toleratedDev = stdDev * tolerance;

				Utils.logMessage(i, maxMagnitude, avg, toleratedDev);

				if (maxMagnitude < avg - toleratedDev || maxMagnitude > avg + toleratedDev) {
					this._range[0] = i;
					break;
				}
			}
		}

		Utils.logMessage('---------');
		Utils.logMessage('Détermination de la fin...');

		for (var i = this._dataIndex; i >= 0; i--) {
			var range = [i + 1, this._dataIndex], maxMagnitude = this._magnitudes[i];

			if (range[1] - range[0] > 5) {
				var avg = Utils.Math.getAverageFromNumArr(this._magnitudes, precision, range),
				stdDev = Utils.Math.getStandardDeviation(this._magnitudes, precision, range),
				toleratedDev = stdDev * tolerance;

				Utils.logMessage(i, maxMagnitude, avg, toleratedDev);

				if (maxMagnitude < avg - toleratedDev || maxMagnitude > avg + toleratedDev) {
					this._range[1] = i;
					break;
				}
			}
		}

		Utils.logMessage('---------');
		Utils.logMessage('Normalisation des données...');

		this._normalizedMagnitudes = [];
		this._normalizedTime = [];

		var startTime = this._magnitudesTime[this._range[0]],
		endTime = this._magnitudesTime[this._range[1]],
		duration = endTime - startTime;

		for (var i = 0; i <= this._dataIndex; i++) {
			var magnitude = this._magnitudes[i];

			this._normalizedMagnitudes[i] = magnitude / this._maxMagnitude * 100;

			var t = this._magnitudesTime[i] - startTime;

			this._normalizedTime[i] = t / duration * 100;
		}

		this._updateStatus(3);

		this.notify('complete');
	},
	exportData: function exportData(format) {
		format = format || 'json';

		switch (format) {
			case 'csv':
				var out = 'Time;Time (%);Index;Max magnitude;Max magnitude (%)', status = 0;

				for (var i = 0; i <= this._dataIndex; i++) {
					out += "\n"+this._magnitudesTime[i]+';'+this._normalizedTime[i]+';'+this._magnitudesIndex[i]+';'+this._magnitudes[i]+';'+this._normalizedMagnitudes[i];
				}

				Utils.Export.exportCSV(out);
				break;
			case 'json':
				var dataToExport = {};

				for (var i = this._range[0]; i <= this._range[1]; i++) {
					dataToExport[this._normalizedTime[i]] = this._normalizedMagnitudes[i];
				}

				Utils.Export.exportJSON(dataToExport);
				break;
		}
	}
};
Utils.inherit(VoiceAnalysis, Utils.Observable);

Utils.Observable.build(VoiceAnalysis);


VoiceAnalysis._items = [];

VoiceAnalysis.build = function build(controls) {
	var analysis = new VoiceAnalysis({
		id: VoiceAnalysis._items.length,
		controls: controls
	});

	VoiceAnalysis._items.push(analysis);

	return analysis;
};

VoiceAnalysis.items = function items() {
	return VoiceAnalysis._items;
};

VoiceAnalysis._updatedStatus = function _updatedStatus(analysis) {
	var analyses = VoiceAnalysis.items(), globalMinStatus;
	for (var i = 0; i < analyses.length; i++) {
		if (typeof globalMinStatus != 'number' || analyses[i].status() < globalMinStatus) {
			globalMinStatus = analyses[i].status();
		}
	}

	VoiceAnalysis.notify('updatestatus', { status: globalMinStatus });
};