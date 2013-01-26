/**
 * @constructor
 * @param {VoiceAnalysis} left  The first voice analysis.
 * @param {VoiceAnalysis} right The second voice analysis.
 */
var VoiceComparison = function VoiceComparison(left, right) {
	Utils.Observable.call(this); //Inheritance from Utils.Observable

	this._analyses = [left, right]; //Array containening both analyses
	this._data = {}; //The comparison data
	this._status = 0;
};
VoiceComparison.prototype = {
	/**
	 * Get this comparison's status.
	 * @return {Number} The status.
	 */
	status: function getStatus() {
		return this._status;
	},
	/**
	 * Initialize the comparison.
	 */
	init: function init() {
		this._updateStatus();
	},
	/**
	 * Update this comparison's status.
	 * @param  {Number} [status] The new status.
	 * @private
	 */
	_updateStatus: function _updateStatus(status) {
		status = (typeof status == 'number') ? status : this._status; //By default, don't change the status
		this._status = status;

		//Trigger the event
		this.notify('updatestatus', { status: status });
	},
	/**
	 * Check if voice analyses are valid.
	 */
	checkVoiceAnalyses: function checkVoiceAnalyses() {
		for (var i = 0; i < this._analyses.length; i++) { //For each voice analysis, check if the status is >= 3
			if (this._analyses[i].status() < 3) {
				return false;
			}
		}

		//Check if there are frequencies in common
		if (!this.getFreqInCommon().length > 0) {
			return false;
		}

		this._updateStatus(1);
	},
	/**
	 * Get frequencies in common in both analyses.
	 */
	getFreqInCommon: function getFreqInCommon() {
		var i, j, comparisonFrequencies, analysisFrequencies;
		for (i = 0; i < this._analyses.length; i++) { //For each analysis
			analysisFrequencies = this._analyses[i].frequencies(); //Get this frequencies

			if (!comparisonFrequencies) { //1st one, define frequencies
				comparisonFrequencies = analysisFrequencies;
			} else { //Filter the exsisting list of frequencies
				for (j = 0; j < comparisonFrequencies.length; j++) {
					if ($.inArray(comparisonFrequencies[j], analysisFrequencies) == -1) {
						comparisonFrequencies.splice(j, 1);
					}
				}
			}
		}

		return comparisonFrequencies;
	},
	/**
	 * Prepare voice analyses' data.
	 */
	prepareData: function prepareData() {
		//Check if we can prepare data
		if (this.status() < 1) {
			if (this.checkVoiceAnalyses() === false) {
				return false;
			}
		}

		//Get to two analyses
		var left = this._analyses[0], right = this._analyses[1];

		//Get frequencies in common
		var freqInCommon = this.getFreqInCommon();

		//Determine the bigger analysis
		var leftDataLength = left.range()[1] - left.range()[0],
		rightDataLength = right.range()[1] - right.range()[0];

		var thicker, thickerPos, finer, finerPos;
		if (leftDataLength > rightDataLength) {
			thicker = left;
			thickerPos = 'left';
			finer = right;
			finerPos = 'right';
		} else {
			thicker = right;
			thickerPos = 'right';
			finer = left;
			finerPos = 'left';
		}

		//Retrieve standardized data
		var thickerStandardizedData = thicker.standardizedData(),
		finerStandardizedData = finer.standardizedData();

		//Get frequencies of both analyses
		var thickerFreq = thicker.frequencies(),
		finerFreq = finer.frequencies();

		//Create an object to store prepared data
		var comparableData = {
			right: [],
			left: [],
			time: []
		};

		//And now we can prepare the data

		var lastFinerIndex = finer.range()[0] - 1,
		thickerTime = 0,
		finerTime = 0,
		thickerMagnitudes,
		thickerComparableData,
		finerComparableData,
		freq = 0,
		thickerMagnitude = 0,
		finerMagnitudes,
		finerMagnitude = 0;
		for (var thickerIndex = thicker.range()[0]; thickerIndex <= thicker.range()[1]; thickerIndex++) { //For each FFT in the thicker analysis
			thickerTime = thickerStandardizedData.time[thickerIndex];
			thickerMagnitudes = thickerStandardizedData.magnitude[thickerIndex];

			thickerComparableData = new Float32Array(freqInCommon.length);
			finerComparableData = new Float32Array(freqInCommon.length);

			for (var freqIndex = 0; freqIndex < freqInCommon.length; freqIndex++) { //For each frequency in common
				freq = freqInCommon[freqIndex];
				thickerFreqIndex = $.inArray(freq, thickerFreq);
				finerFreqIndex = $.inArray(freq, finerFreq);
				thickerMagnitude = thickerMagnitudes[thickerFreqIndex];

				Utils.logMessage('---------');
				Utils.logMessage('Thicker ('+thickerPos+') : index: '+thickerIndex+'; time: '+thickerTime+'; freq: '+freq+'; magnitude: '+thickerMagnitude);

				for (var finerIndex = finer.range()[0]; finerIndex <= finer.range()[1]; finerIndex++) { //For each FFT in the finer analysis
					finerTime = finerStandardizedData.time[finerIndex];
					finerMagnitude = finerStandardizedData.magnitude[finerIndex][finerFreqIndex];
					
					if (finerTime >= thickerTime) {
						break;
					}
				}

				var finerMagnitudeForThickerTime;
				if (finerTime == thickerTime) { //Time values for this FFT matches
					finerMagnitudeForThickerTime = finerMagnitude;

					Utils.logMessage('Finer ('+finerPos+') : index: '+finerIndex+'; time: '+finerTime+'; magnitude: '+finerMagnitude);
				} else { //Doesn't match, we'll have to calculate the finer magnitude for the thicker time with the derivative number
					var finerPreviousIndex = finerIndex - 1,
					finerPreviousTime = finerStandardizedData.time[finerPreviousIndex],
					finerPreviousMagnitude = finerStandardizedData.magnitude[finerPreviousIndex][finerFreqIndex];

					var slope = (finerPreviousMagnitude - finerMagnitude) / (finerPreviousTime - finerTime),
					deltaTime = thickerTime - finerPreviousTime;

					finerMagnitudeForThickerTime = finerPreviousMagnitude + deltaTime * slope;

					Utils.logMessage('Finer ('+finerPos+') : index: previous: '+finerPreviousIndex+', current: '+finerIndex+'; time: previous: '+finerPreviousTime+', current: '+finerTime+'; magnitude: previous: '+finerPreviousMagnitude+', current: '+finerMagnitude+'; magnitude for thicker time: '+finerMagnitudeForThickerTime);
				}

				thickerComparableData[freqIndex] = thickerMagnitude;
				finerComparableData[freqIndex] = finerMagnitudeForThickerTime;
			}

			//Store new data in arrays
			comparableData[thickerPos].push(thickerComparableData);
			comparableData[finerPos].push(finerComparableData);
			comparableData.time.push(thickerTime);
		}

		this._data = comparableData;

		this._updateStatus(2);

		return comparableData;
	},
	/**
	 * Exported prepared data to CSV.
	 */
	exportPreparedData: function exportPreparedData() {
		var out = 'Time;Frequency;Right;Left';

		var freqInCommon = this.getFreqInCommon();

		var i, j;
		for (i = 0; i < this._data.right.length; i++) {
			for (j = 0; j < freqInCommon.length; j++) {
				out += "\n"+this._data.time[i]+';'+freqInCommon[j]+';'+this._data.right[i][j]+';'+this._data.left[i][j];
			}
		}
		Utils.Export.exportCSV(out);
	},
	/**
	 * Shift voice analyses' data.
	 * @deprecated This algotithm doesn't work well - DO NOT USE !
	 */
	shiftData: function shiftData() {
		if (this.status() < 2) {
			if (this.prepareData() === false) {
				return false;
			}
		}

		//Retrieve options
		var shiftingEnabled = Utils.Options.get('voice.shifting.enabled'),
		maxDiff = Utils.Options.get('voice.shifting.maxPtShift'),
		toleratedRatio = Utils.Options.get('voice.shifting.toleratedRatio');

		//Check if voice shifting is enabled
		if (!shiftingEnabled) {
			this._updateStatus(3);
			return this._data;
		}

		//Get frequencies in common
		var freqInCommon = this.getFreqInCommon();

		//Create an object to store shifted data
		var comparableData = {
			right: [],
			left: [],
			time: this._data.time
		},
		left = this._data.left,
		right = this._data.right;

		//And now shift data
		//TODO: a global point of view (-> for all frequencies) when shifting voice (cf. "freqShifting")

		var lastLeftIndex = -1,
		freqIndex,
		rightMagnitude = 0;
		for (var rightIndex = 0; rightIndex < right.length; rightIndex++) {
			comparableData.right.push(new Float32Array(freqInCommon.length));
			comparableData.left.push(new Float32Array(freqInCommon.length));

			var freqShifting = []; //Voice shifting value for each frequency

			for (freqIndex = 0; freqIndex < freqInCommon.length; freqIndex++) { //For each frequency
				rightMagnitude = right[rightIndex][freqIndex];

				Utils.logMessage('---------');
				Utils.logMessage('Right : index: '+rightIndex+'; magnitude: '+rightMagnitude);

				var j = 0,
				diff = 0,
				leftIndex = null,
				leftMagnitude = null,
				deviation = 0,
				ratio = 0,
				isDiffPositive = true;
				do {
					leftIndex = lastLeftIndex + 1 + ((isDiffPositive) ? 1 : -1) * diff;

					if (leftIndex >= 0 && leftIndex < left.length) {
						leftMagnitude = left[leftIndex][freqIndex];

						deviation = Math.abs(rightMagnitude - leftMagnitude);
						ratio = deviation / ((rightMagnitude + leftMagnitude) / 2);

						Utils.logMessage('Left : positive diff: '+isDiffPositive+'; right index'+rightIndex+'; left index: '+leftIndex+'; right magnitude: '+rightMagnitude+'; left magnitude: '+leftMagnitude+'; deviation: '+deviation+'; ratio: '+ratio+'; ratio < tolerated ratio: '+(ratio <= toleratedRatio));

						if (ratio <= toleratedRatio) {
							break;
						}
					} else {
						Utils.logMessage('Left : positive diff: '+isDiffPositive+'; right index'+rightIndex+'; left index: '+leftIndex);

						leftMagnitude = null;
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
					leftMagnitude = left[leftIndex][freqIndex];
				}

				Utils.logMessage('=> indexes: '+rightIndex+', '+leftIndex+'; magnitudes: '+rightMagnitude+', '+leftMagnitude);

				comparableData.right[rightIndex][freqIndex] = rightMagnitude;
				comparableData.left[leftIndex][freqIndex] = leftMagnitude;

				freqShifting.push(leftIndex - rightIndex); //Add this frequency shifting to the list
			}

			lastLeftIndex = leftIndex;
		}

		//Replace the original data by the shifted data
		this._data = comparableData;

		this._updateStatus(3);

		return comparableData;
	},
	/**
	 * Export shifted data to CSV.
	 */
	exportShiftedData: function exportShiftedData() {
		this.exportPreparedData(); //Same method
	},
	/**
	 * Compare voice analyses' data.
	 * @return {Object} An object containing the average of differences and the standard deviation.
	 */
	compareData: function compareData() {
		if (this.status() < 3) {
			if (this.shiftData() === false) {
				return false;
			}
		}

		var comparableData = this._data,
		freqInCommon = this.getFreqInCommon(); //Get frequencies in common

		var deviations = [];

		var rightMagnitude, leftMagnitude, deviationPercentage, ratio, deviation;
		for (var i = 0; i < comparableData.right.length; i++) { //For each comparable FFTs
			for (var j = 0; j < freqInCommon.length; j++) { //For each frequency in common
				rightMagnitude = comparableData.right[i][j];
				leftMagnitude = comparableData.left[i][j];

				//Calculate the deviation %
				deviationPercentage = Math.abs(rightMagnitude - leftMagnitude);
				ratio = deviationPercentage / ((rightMagnitude + leftMagnitude) / 2);

				deviations.push(ratio);
			}
		}
		
		//Calculate the average deviation
		var avg = Utils.Math.getAverageFromNumArr(deviations),
		std = Utils.Math.getStandardDeviation(deviations);

		//... And we've done !
		this._deviations = deviations;
		this._avg = avg;
		this._std = std;

		//Log final data
		Utils.logMessage('---------');
		Utils.logMessage('Compare :');
		Utils.logMessage('Avg : ' + avg);
		Utils.logMessage('Std : ' + std);

		//Trigger the event
		this.notify('compare', {
			deviations: deviations,
			result: {
				avg: avg,
				std: std
			}
		});

		this._updateStatus(4);

		return {
			avg: avg,
			std: std
		};
	},
	/**
	 * Export compared data to CSV.
	 */
	exportComparedData: function exportComparedData() {
		var out = 'Index;Deviation';
		for (var i = 0; i < this._deviations.length; i++) {
			out += ("\n"+i+';'+this._deviations[i]).replace(/\./g,',');
		}
		Utils.Export.exportCSV(out);
	}
};

//Inheritance form Observable
Utils.inherit(VoiceComparison, Utils.Observable);

/**
 * Build a new voice comparison.
 * @constructs
 * @param {VoiceAnalysis} left  The first voice analysis.
 * @param {VoiceAnalysis} right The second voice analysis.
 * @return {VoiceComparison}    The voice comparison.
 */
VoiceComparison.build = function build(left, right) {
	return new VoiceComparison(left, right);
};