/**
 * FFT is a class for calculating the Discrete Fourier Transform of a signal.
 * with the Fast Fourier Transform algorithm.
 * @see <a href="https://github.com/corbanbrook/dsp.js">https://github.com/corbanbrook/dsp.js</a>
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2.
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100).
 *
 * @constructor
 */
var FFT = function FFT(bufferSize, sampleRate) {
	//Initialize variables
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
 * Performs a forward transform on the sample buffer.
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param {Array} buffer The sample buffer. Buffer Length must be power of 2.
 *
 * @return The frequency spectrum array.
 */
FFT.prototype.forward = function forward(buffer) {
	// Locally scope variables for speed up
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

	i = bufferSize / 2;
	while(i--) {
		spectrum[i] = 2 * Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / bufferSize;
	}
};

/**
 * A voice analysis.
 * @constructor
 * @param {Object} options Some options such as id and controls.
 */
var VoiceAnalysis = function VoiceAnalysis(options) {
	Utils.Observable.call(this); //Inheritance from Observable.

	//Define object's properties
	this._id = options.id;
	this._$controls = options.controls; //Controls (e.g. the audio tag)
	this._status = 0; //Analysis' status
	this._name = (typeof options.name == 'string') ? options.name : 'Audio input #' + (this.id() + 1); //Analysis' name
	this._frequencies = null;
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
	 * Get/set this analysis' name.
	 * @param  {String} [name] If specified, the new analysis' name.
	 * @return {String}
	 */
	name: function name(name) {
		if (typeof name == 'undefined') { //Getter
			return this._name;
		} else { //Setter
			this._name = String(name); //Save the new name

			//Trigger the event
			this.notify('namechange', {
				name: this._name
			});
		}
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
			magnitude: this._standardizedMagnitudes, //Magnitudes
			time: this._standardizedTime //Time
		};
	},
	/**
	 * Get/set frequencies on which this analysis is made.
	 * @param  {Number|Number[]} freq Frequencies.
	 * @return {Number[]|null}        Frequencies on which this analysis is made.
	 */
	frequencies: function frequencies(freq) {
		if (typeof freq == 'undefined') { //Getter
			return this._frequencies;
		} else { //Setter
			switch (typeof freq) {
				case 'number': //If a number is specified, make the analysis on this one
					freq = [freq];
					break;
				case 'string': //If a string is specified
					if (/^[0-9]+-[0-9]+$/.test(freq)) { //E.g. "7-40" -> frequencies from 7 to 40
						var result = /^([0-9]+)-([0-9]+)$/.exec(freq),
						range = [parseInt(result[1]), parseInt(result[2])];

						if (range[0] > range[1]) {
							range = [range[1], range[0]];
						}

						freq = [];
						for (var i = range[0]; i <= range[1]; i++) {
							freq.push(i);
						}
					} else if (/^[0-9]+$/.test(freq)) { //E.g. "36"
						freq = [parseInt(freq)];
					}
					break;
				case 'object': //If an object is specified
					if (freq instanceof Array) {
						//Use the array as is
						//freq = freq;
					} else {
						return false;
					}
					break;
				default: //Wrong value
					return false;
			}

			//Sort frequencies
			freq.sort();

			this._frequencies = freq;
		}
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
	 * Initialize the analysis.
	 */
	init: function init() {
		var that = this;

		this.control('audio')
			.bind('MozAudioAvailable', function(e) { //When audio is available
				var event = e.originalEvent;

				that.audioAvailable(event.frameBuffer, event.time); //Process the audio data
			})
			.bind('loadedmetadata', function() { //When metadata are loaded
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
			.bind('ended pause', function() { //On pause/end
				that.ended();
			});

		this._updateStatus();
	},
	/**
	 * Set this analysis' input file.
	 * @param {File} file The file.
	 */
	setInputFile: function setInputFile(file) {
		if (!file) { //If no file is specified
			return;
		}

		this._input = file;
		this.control('audio').attr('src', window.URL.createObjectURL(file)); //Create an URL pointing to this file
		this._name = file.name;

		//Trigger events
		this.notify('inputchange', {
			file: file,
			name: this._name
		});
		this.notify('namechange', {
			name: this._name
		});
	},
	/**
	 * Initialize this analysis when the audio element is ready.
	 * @param {Number} channels          The number of channels in the audio data.
	 * @param {Number} sampleRate        The audio sample rate (e.g. 44100 Hz).
	 * @param {Number} frameBufferLength The frame buffer length
	 */
	ready: function ready(channels, sampleRate, frameBufferLength) {
		this._channels = channels;
		this._rate = sampleRate;
		this._frameBufferLength = frameBufferLength;

		this._maxMagnitude = 0; //The analysis' max. magnitude value
		this._maxMagnitudeFreq = null; //The analysis' max. magnitude frequency

		this._maxAnalysisLength = 1024; //The analysis' max. number of data frames

		this._magnitudes = []; //Magnitudes
		this._time = []; //Time
		this._startTime = null; //Time when the analysis started

		this._fft = new FFT(this._frameBufferLength / this._channels, this._rate); //The FFT

		this.notify('ready'); //Trigger the event

		this._updateStatus(1);
	},
	/**
	 * Reset this analysis.
	 */
	reset: function reset() {
		this._maxMagnitude = 0; //The analysis' max. magnitude value
		this._maxMagnitudeFreq = null; //The analysis' max. magnitude frequency

		this._magnitudes = []; //Magnitudes
		this._time = []; //Time
		this._startTime = null; //Time when the analysis started

		this.notify('ready'); //Trigger the event

		this._updateStatus(1);
	},
	/**
	 * Method to call when audio data is available.
	 * @param  {Float32Array} fb The audio data (frame buffer).
	 * @param  {Number} t  The audio time.
	 */
	audioAvailable: function audioAvailable(fb, t) {
		if (this.status() < 1) { //If it's a new analysis, reset this one
			this.reset();
		}

		if (this._startTime === null) { //If it's the first one this method is called, register actual time as start time
			this._startTime = new Date().getTime() / 1000;
		}
		if (typeof t != 'number') { //If no time is specified, let's deduce it from the start time
			t = (new Date).getTime() / 1000 - this._startTime;
		}

		//Forward signal to FFT
		var signal = new Float32Array(fb.length / this._channels);

		for (var i = 0, fbl = this._frameBufferLength / 2; i < fbl; i++ ) {
			// Assuming interlaced stereo channels,
			// need to split and merge into a stero-mix mono signal
			signal[i] = (fb[2*i] + fb[2*i+1]) / 2;
		}

		this._fft.forward(signal); //Forward the signal

		//Variables for canvas drawing
		var showFFT = Utils.Options.get('voice.comparing.showFFT'), // Do we have to draw the FFT on the canvas ?
		canvas = this.control('canvas')[0],
		ctx = canvas.getContext('2d');

		if (showFFT) { //If FFT is shown, clear the canvas
			ctx.clearRect(0,0, canvas.width, canvas.height);
		}

		//Get the selected magnitudes
		var analysisFreq = this.frequencies(); //Frequencies on which this analysis is made
		var magnitudes = new Float32Array(analysisFreq.length);

		var magnitude,
		freqIndex = 0,
		maxMagnitude = 0,
		maxMagnitudeFreq;

		for (var i = 0; i < this._fft.spectrum.length; i++ ) { //For each frequency
			var isMagnitudeSaved = ($.inArray(i, analysisFreq) != -1); //Is this magnitude saved ?

			if (!showFFT && !isMagnitudeSaved) { //If we don't show the FFT or we don't save this magnitude value
				continue; //Ignore this magnitude
			}

			//Multiply spectrum by a zoom value
			magnitude = this._fft.spectrum[i] * 4000;

			if (showFFT) {
				//Draw rectangle bars for each frequency bin
				ctx.fillRect(i * 4, canvas.height, 3, - magnitude);
			}

			if (isMagnitudeSaved) { //If we have to save this magnitude
				magnitudes[freqIndex] = magnitude;
				freqIndex++;

				if (magnitude > maxMagnitude) { //Is this the max. magnitude in the FFT ?
					maxMagnitude = magnitude;
					maxMagnitudeFreq = freqIndex;
				}
			}
		}

		if (this._magnitudes.length < this._maxAnalysisLength) { //If this analysis is not overflowed
			//Save data in arrays
			this._magnitudes.push(magnitudes);
			this._time.push(t);
		}

		if (this._maxMagnitude < maxMagnitude) { //Analysis' max magnitude
			this._maxMagnitude = maxMagnitude;
			this._maxMagnitudeFreq = maxMagnitudeFreq;
		}
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
		if (this.status() < 2 || !this._magnitudes || this._magnitudes.length == 0) {
			return false;
		}

		this.notify('start');

		//Let's standardize magnitudes
		Utils.logMessage('---------');
		Utils.logMessage('Standardizing magnitudes...');
		Utils.logMessage('Max magnitude for this analysis : ' + this._maxMagnitude);

		this._standardizedMagnitudes = [];
		var i, j, magnitudes;
		for (i = 0; i < this._magnitudes.length; i++) { //For each data frame
			magnitudes = this._magnitudes[i]; //Get magnitudes saved at this time

			this._standardizedMagnitudes[i] = new Float32Array(magnitudes.length); //Create a new array to store standardized data

			for (j = 0; j < magnitudes.length; j++) {
				//We want the magnitude in % of the max magnitude
				this._standardizedMagnitudes[i][j] = Utils.Math.getNumWithSetDec(magnitudes[j] / this._maxMagnitude * 100);
			}
		}

		//Now we can determine when does the voice begin and end
		//Get the tolerance & precision options
		var tolerance = Utils.Options.get('voice.analysis.tolerance'),
		precision = Utils.Options.get('voice.analysis.precision');

		this._range = [0, this._dataIndex]; //The voice range

		//Internal options
		var threshold = 8, //Required freq. magnitude in % to determine the begining/end of the speech
		requiredFollowingPts = 4; //Required following points wich are > the threshold to determine the begining/end of the speech

		//Detect the begining
		Utils.logMessage('---------');
		Utils.logMessage('Determining the beginning...');

		var startedSince = 0, magnitude;
		for (var i = 0; i < this._magnitudes.length; i++) { //For each data frame from left to right (forward)
			magnitude = this._standardizedMagnitudes[i][0]; //Get the first magnitude of the FFT

			if (magnitude > threshold) { //If the magnitude if greater than the threshold
				Utils.logMessage('Peak detected', i, magnitude + ' > ' + threshold);
				startedSince++;
			} else if (startedSince) {
				startedSince = 0;
			}

			if (startedSince >= requiredFollowingPts) { //If the magnitude if greater than the threshold during a certain number of data frames, it's the begining
				this._range[0] = i - startedSince + 1;
				Utils.logMessage('=> Begining detected', this._range[0]);
				break;
			}
		}

		//Detect the end
		Utils.logMessage('---------');
		Utils.logMessage('Determining the end...');

		var endedSince = 0, magnitude;
		for (var i = this._magnitudes.length - 1; i >= 0; i--) {  //For each data frame from right to left (backward)
			magnitude = this._standardizedMagnitudes[i][0]; //Get the first magnitude of the FFT

			if (magnitude > threshold) { //If the magnitude if greater than the threshold
				Utils.logMessage('Peak detected', i, magnitude + ' > ' + threshold);
				endedSince++;
			} else if (endedSince) {
				endedSince = 0;
			}

			if (endedSince >= requiredFollowingPts) { //If the magnitude if greater than the threshold during a certain number of data frames, it's the end
				this._range[1] = i + endedSince - 1;
				Utils.logMessage('=> End detected', this._range[1]);
				break;
			}
		}

		//And finally standardize time
		Utils.logMessage('---------');
		Utils.logMessage('Standardizing time...');

		this._standardizedTime = [];

		var startTime = this._time[this._range[0]], //Time when the voice begins
		endTime = this._time[this._range[1]], //Time when the voice ends
		duration = endTime - startTime; //Voice duration

		//Display some stats
		Utils.logMessage('Number of points collected : ' + (this._range[1] - this._range[0] + 1));
		Utils.logMessage('Speaking duration : ' + duration + ' ('+startTime+' -> '+endTime+')');

		var t;
		for (var i = 0; i < this._magnitudes.length; i++) {
			t = this._time[i] - startTime; //Time since the begining

			//We want the time in %
			this._standardizedTime[i] = Utils.Math.getNumWithSetDec(t / duration * 100);
		}


		this._updateStatus(3);

		this.notify('complete'); //Trigger the event : we've finished with this voice analysis !
	},
	/**
	 * Export the audio data.
	 * @param  {String} format The exporting format : csv or json.
	 */
	exportData: function exportData(format) {
		format = format || 'json';

		switch (format) { //Different methods for deffierent export formats
			case 'csv': //CSV : for spreadsheet
				var out = 'Time;Standardized time;Frequency;Magnitude;Standardized magnitude',
				status = 0,
				analysisFreq = this.frequencies(); //Frequencies on which this analysis is made

				var i, j, magnitudes;
				for (i = 0; i < this._magnitudes.length; i++) {
					magnitudes = this._magnitudes[i]; //Get magnitudes saved at this time

					for (j = 0; j < magnitudes.length; j++) {
						out += "\n"+this._time[i]+';'+this._standardizedTime[i]+';'+analysisFreq[j]+';'+magnitudes[j]+';'+this._standardizedMagnitudes[i][j];
					}
				}

				Utils.Export.exportCSV(out);
				break;
			case 'json': //JSON : to save as a model
				var dataToExport = {};

				for (var i = this._range[0]; i <= this._range[1]; i++) {
					dataToExport[this._standardizedTime[i]] = this._standardizedMagnitudes[i];
				}

				var i, j, magnitudes;
				for (i = 0; i < this._magnitudes.length; i++) {
					magnitudes = this._magnitudes[i]; //Get magnitudes saved at this time

					dataToExport[this._standardizedTime[i]] = magnitudes;
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
 * @constructs
 * @param  {Object} controls The analysis controls, such as th audio element...
 * @return {VoiceAnalysis}   The voice analysis.
 */
VoiceAnalysis.build = function build(controls) {
	//Create a new analysis instance
	var analysis = new VoiceAnalysis({
		id: VoiceAnalysis._items.length,
		controls: controls
	});

	VoiceAnalysis._items.push(analysis); //Add this analysis to the list

	return analysis;
};

/**
 * Get a list of all voice analyses.
 * @return {VoiceAnalysis[]} A list of voice analyses.
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
	for (var i = 0; i < analyses.length; i++) { //For each analysis
		//Check if this status is the lower one
		if (typeof globalMinStatus != 'number' || analyses[i].status() < globalMinStatus) {
			globalMinStatus = analyses[i].status();
		}
	}

	//Trigger the event
	VoiceAnalysis.notify('updatestatus', { status: globalMinStatus });
};