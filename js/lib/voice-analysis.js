/**
 * A FFT (from dsp.js, see https://github.com/corbanbrook/dsp.js).
 * @param {Number} bufferSize The buffer size (e.g. 1024).
 * @param {Number} sampleRate The sample rate (e.g. 44100).
 */
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

/**
 * Forward a signal.
 * @param  {Float32Array} buffer The audio data.
 */
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

/**
 * A voice analysis.
 * @param {Object} options Some options such as id and controls.
 */
var VoiceAnalysis = function VoiceAnalysis(options) {
	Utils.Observable.call(this); //Heritage de Observable.

	//Definition des proprietes de l'objet
	this._id = options.id;
	this._$controls = options.controls; //Controles (ex: balise audio)
	this._status = 0; //Statut de l'analyse
	this._name = 'Audio input #' + (this.id() + 1); //Nom de l'analyse
};
VoiceAnalysis.prototype = {
	/**
	 * Get this analysis' id.
	 * @return {Number}
	 */
	id: function getId() {
		return this._id;
	},
	/**
	 * Get this analysis' name.
	 * @return {String}
	 */
	name: function getName() {
		return this._name;
	},
	/**
	 * Get a control.
	 * @param  {String} name The control's name.
	 * @return {jQuery}
	 */
	control: function getControl(name) {
		return this._$controls[name];
	},
	/**
	 * Get this analysis' status.
	 * @return {Number}
	 */
	status: function getStatus() {
		return this._status;
	},
	/**
	 * Get the analysis' range (when does the speaker speak).
	 * @return {Number[]} An array containing two indexes : the begining & the end.
	 */
	range: function getRange() {
		return this._range || [];
	},
	/**
	 * Get this analysis' standardized data.
	 * @return {Object}
	 */
	standardizedData: function getStandardizedData() {
		return {
			magnitude: this._standardizedMagnitudes,
			time: this._standardizedTime
		};
	},
	/**
	 * Initialize the analysis.
	 */
	init: function init() {
		var that = this;

		this.control('audio')
			.bind('MozAudioAvailable', function(e) {
				var event = e.originalEvent;

				that.audioAvailable(event.frameBuffer, event.time);
			})
			.bind('loadedmetadata', function() {
				var channels, sampleRate, frameBufferLength;

				try {
					channels          = that.control('audio')[0].mozChannels;
					sampleRate        = that.control('audio')[0].mozSampleRate;
					frameBufferLength = that.control('audio')[0].mozFrameBufferLength;
				} catch (err) {
					return;
				}

				that.ready(channels, sampleRate, frameBufferLength);
			})
			.bind('ended pause', function() {
				that.ended();
			});

		this._updateStatus();
	},
	/**
	 * Update this analysis' status.
	 * @param  {Number} [status] The new status.
	 * @private
	 */
	_updateStatus: function _updateStatus(status) {
		status = (typeof status == 'number') ? status : this._status;
		this._status = status;

		this.notify('updatestatus', { status: status });

		VoiceAnalysis._updatedStatus(this);
	},
	/**
	 * Set this analysis' input file.
	 * @param {File} file The file.
	 */
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
	/**
	 * Initialize this analysis hen the audio element is ready.
	 */
	ready: function ready(channels, sampleRate, frameBufferLength) {
		this._channels          = channels;
		this._rate              = sampleRate;
		this._frameBufferLength = frameBufferLength;

		this._dataIndex = 0;
		this._maxMagnitude = 0;

		this._magnitudes = new Float32Array(1024);
		this._magnitudesIndex = new Float32Array(1024);
		this._time = new Float32Array(1024);
		this._startTime = null;

		this._fft = new FFT(this._frameBufferLength / this._channels, this._rate);

		this._updateStatus(1);
	},
	/**
	 * Reset this analysis.
	 */
	reset: function reset() {
		this._dataIndex = 0;
		this._maxMagnitude = 0;

		this._magnitudes = new Float32Array(1024);
		this._magnitudesIndex = new Float32Array(1024);
		this._time = new Float32Array(1024);
		this._startTime = null;

		this._updateStatus(1);
	},
	/**
	 * Method to call when audio data is available.
	 * @param  {Float32Array} fb The audio data.
	 * @param  {Number} t  The audio time.
	 */
	audioAvailable: function audioAvailable(fb, t) {
		if (this.status() < 1) {
			this.reset();
		}

		if (this._startTime === null) {
			this._startTime = new Date().getTime() / 1000;
		}
		if (typeof t != 'number') {
			t = new Date().getTime() / 1000 - this._startTime;
		}

		var signal = new Float32Array(fb.length / this._channels),
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
			this._time[this._dataIndex] = t;
		}

		if (this._maxMagnitude < maxMagnitude) {
			this._maxMagnitude = maxMagnitude;
		}

		this._dataIndex++;
	},
	/**
	 * Method to call when the audio is finished.
	 */
	ended: function ended() {
		this._updateStatus(2);
	},
	/**
	 * Process the audio data.
	 */
	processData: function processData() {
		if (this.status() < 2 || !this._magnitudes) {
			return false;
		}

		this.notify('start');

		Utils.logMessage('---------');
		Utils.logMessage('Standardizing magnitudes...');
		Utils.logMessage('Max magnitude for this analysis : ' + this._maxMagnitude);

		this._standardizedMagnitudes = [];

		for (var i = 0; i < this._dataIndex; i++) {
			var magnitude = this._magnitudes[i];
			this._standardizedMagnitudes[i] = Utils.Math.getNumWithSetDec(magnitude / this._maxMagnitude * 100);
		}

		var tolerance = Utils.Options.get('voice.analysis.tolerance'),
		precision = Utils.Options.get('voice.analysis.precision');

		this._range = [0, this._dataIndex];

		var requiredFollowingPts = 4,
		threshold = 8;

		Utils.logMessage('---------');
		Utils.logMessage('Determining the beginning...');

		var startedSince = 0;
		for (var i = 0; i < this._dataIndex; i++) {
			var maxMagnitude = this._standardizedMagnitudes[i];

			if (maxMagnitude > threshold) {
				Utils.logMessage('Peak detected', i, maxMagnitude + ' > ' + threshold);
				startedSince++;
			} else if (startedSince) {
				startedSince = 0;
			}

			if (startedSince >= requiredFollowingPts) {
				this._range[0] = i - startedSince + 1;
				Utils.logMessage('=> Begining detected', this._range[0]);
				break;
			}
		}

		Utils.logMessage('---------');
		Utils.logMessage('Determining the end...');

		var endedSince = 0;
		for (var i = this._dataIndex - 1; i >= 0; i--) {
			var maxMagnitude = this._standardizedMagnitudes[i];

			if (maxMagnitude > threshold) {
				Utils.logMessage('Peak detected', i, maxMagnitude + ' > ' + threshold);
				endedSince++;
			} else if (endedSince) {
				endedSince = 0;
			}

			if (endedSince >= requiredFollowingPts) {
				this._range[1] = i + endedSince - 1;
				Utils.logMessage('=> End detected', this._range[1]);
				break;
			}
		}

		Utils.logMessage('---------');
		Utils.logMessage('Standardizing time...');

		this._standardizedTime = [];

		var startTime = this._time[this._range[0]],
		endTime = this._time[this._range[1]],
		duration = endTime - startTime;

		Utils.logMessage('Number of points collected : ' + (this._range[1] - this._range[0] + 1));
		Utils.logMessage('Speaking duration : ' + duration + ' ('+startTime+' -> '+endTime+')');

		for (var i = 0; i < this._dataIndex; i++) {
			var t = this._time[i] - startTime;

			this._standardizedTime[i] = Utils.Math.getNumWithSetDec(t / duration * 100);
		}


		this._updateStatus(3);

		this.notify('complete');
	},
	/**
	 * Export the audio data.
	 * @param  {String} format The exporting format : csv or json.
	 */
	exportData: function exportData(format) {
		format = format || 'json';

		switch (format) {
			case 'csv':
				var out = 'Time;Time (%);Index;Max magnitude;Max magnitude (%)', status = 0;

				for (var i = 0; i < this._dataIndex; i++) {
					out += "\n"+this._time[i]+';'+this._standardizedTime[i]+';'+this._magnitudesIndex[i]+';'+this._magnitudes[i]+';'+this._standardizedMagnitudes[i];
				}

				Utils.Export.exportCSV(out);
				break;
			case 'json':
				var dataToExport = {};

				for (var i = this._range[0]; i <= this._range[1]; i++) {
					dataToExport[this._standardizedTime[i]] = this._standardizedMagnitudes[i];
				}

				Utils.Export.exportJSON(dataToExport);
				break;
		}
	}
};

//Inheritance from Observable
Utils.inherit(VoiceAnalysis, Utils.Observable);
Utils.Observable.build(VoiceAnalysis);

/**
 * List of voice analyses.
 * @type {Array}
 * @private
 */
VoiceAnalysis._items = [];

/**
 * Build a new voice analysis.
 * @param  {Object} controls The analysis controls, such as th audio element...
 * @return {VoiceAnalysis}   The voice analysis.
 */
VoiceAnalysis.build = function build(controls) {
	var analysis = new VoiceAnalysis({
		id: VoiceAnalysis._items.length,
		controls: controls
	});

	VoiceAnalysis._items.push(analysis);

	return analysis;
};

/**
 * Get a list of all voice analyses.
 * @return {Array} A list of voice analyses.
 */
VoiceAnalysis.items = function items() {
	return VoiceAnalysis._items;
};

/**
 * Called when a voice analysis' status is updated.
 * @param  {VoiceAnalysis} analysis The voice analysis.
 * @private
 */
VoiceAnalysis._updatedStatus = function _updatedStatus(analysis) {
	var analyses = VoiceAnalysis.items(), globalMinStatus;
	for (var i = 0; i < analyses.length; i++) {
		if (typeof globalMinStatus != 'number' || analyses[i].status() < globalMinStatus) {
			globalMinStatus = analyses[i].status();
		}
	}

	VoiceAnalysis.notify('updatestatus', { status: globalMinStatus });
};