/**
 * A comparison between two voice analyses.
 * @param {VoiceAnalysis} left  The first voice analysis.
 * @param {VoiceAnalysis} right The second voice analysis.
 */
var VoiceComparison = function VoiceComparison(left, right) {
	Utils.Observable.call(this);

	this._analyses = [left, right];
	this._data = {};
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
		status = (typeof status == 'number') ? status : this._status;
		this._status = status;

		this.notify('updatestatus', { status: status });
	},
	/**
	 * Check if voice analyses are valid.
	 */
	checkVoiceAnalyses: function checkVoiceAnalyses() {
		for (var i = 0; i < this._analyses.length; i++) {
			if (this._analyses[i].status() < 3) {
				return false;
			}
		}

		this._updateStatus(1);
	},
	/**
	 * Prepare voice analyses' data.
	 */
	prepareData: function prepareData() {
		if (this.status() < 1) {
			if (this.checkVoiceAnalyses() === false) {
				return false;
			}
		}

		var left = this._analyses[0], right = this._analyses[1];

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

		var thickerStandardizedData = thicker.standardizedData(),
		finerStandardizedData = finer.standardizedData()

		var comparableData = {
			right: [],
			left: [],
			time: []
		};

		var lastFinerIndex = finer.range()[0] - 1,
		thickerTime = 0,
		finerTime = 0,
		thickerMagnitude = 0,
		finerMagnitude = 0;
		for (var thickerIndex = thicker.range()[0]; thickerIndex <= thicker.range()[1]; thickerIndex++) {
			thickerTime = thickerStandardizedData.time[thickerIndex];
			thickerMagnitude = thickerStandardizedData.magnitude[thickerIndex];

			Utils.logMessage('---------');
			Utils.logMessage('Thicker ('+thickerPos+') : ', thickerIndex, thickerTime, thickerMagnitude);

			for (var finerIndex = finer.range()[0]; finerIndex <= finer.range()[1]; finerIndex++) {
				finerTime = finerStandardizedData.time[finerIndex];
				finerMagnitude = finerStandardizedData.magnitude[finerIndex];
				
				if (finerTime >= thickerTime) {
					break;
				}
			}

			var finerMagnitudeForThickerTime;
			if (finerTime == thickerTime) {
				finerMagnitudeForThickerTime = finerMagnitude;

				Utils.logMessage('Finer ('+finerPos+') : ', finerIndex, finerTime, finerMagnitude);
			} else {
				var finerPreviousIndex = finerIndex - 1,
				finerPreviousTime = finerStandardizedData.time[finerPreviousIndex],
				finerPreviousMagnitude = finerStandardizedData.magnitude[finerPreviousIndex];

				var slope = (finerPreviousMagnitude - finerMagnitude) / (finerPreviousTime - finerTime),
				deltaTime = thickerTime - finerPreviousTime;

				finerMagnitudeForThickerTime = finerPreviousMagnitude + deltaTime * slope;

				Utils.logMessage('Finer ('+finerPos+') : ', [finerPreviousIndex, finerIndex], [finerPreviousTime, finerTime], [finerPreviousMagnitude, finerMagnitude], finerMagnitudeForThickerTime);
			}

			comparableData[thickerPos].push(thickerMagnitude);
			comparableData[finerPos].push(finerMagnitudeForThickerTime);
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
		var out = 'Time;Right;Left';
		for (var i = 0; i < this._data.right.length; i++) {
			out += "\n"+this._data.time[i]+';'+this._data.right[i]+';'+this._data.left[i];
		}
		Utils.Export.exportCSV(out);
	},
	/**
	 * Shift voice analyses' data.
	 */
	shiftData: function shiftData() {
		if (this.status() < 2) {
			if (this.prepareData() === false) {
				return false;
			}
		}

		var shiftingEnabled = Utils.Options.get('voice.shifting.enabled'),
		maxDiff = Utils.Options.get('voice.shifting.maxPtShift'),
		toleratedRatio = Utils.Options.get('voice.shifting.toleratedRatio');

		if (!shiftingEnabled) {
			this._updateStatus(3);
			return this._data;
		}

		var comparableData = {
			right: [],
			left: [],
			time: this._data.time
		},
		left = this._data.left,
		right = this._data.right;

		var lastLeftIndex = -1,
		rightMagnitude = 0;

		for (var rightIndex = 0; rightIndex < right.length; rightIndex++) {
			rightMagnitude = right[rightIndex];

			Utils.logMessage('---------');
			Utils.logMessage('Right : ', rightIndex, rightMagnitude);

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
					leftMagnitude = left[leftIndex];

					deviation = Math.abs(rightMagnitude - leftMagnitude);
					ratio = deviation / ((rightMagnitude + leftMagnitude) / 2);

					Utils.logMessage('Left : ', isDiffPositive, rightIndex, leftIndex, rightMagnitude, leftMagnitude, deviation, ratio, (ratio <= toleratedRatio));

					if (ratio <= toleratedRatio) {
						break;
					}
				} else {
					Utils.logMessage('Left : ', isDiffPositive, rightIndex, leftIndex, false);

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
				leftMagnitude = left[leftIndex];
			}

			Utils.logMessage('=>', rightIndex, leftIndex, rightMagnitude, leftMagnitude);

			comparableData.right.push(rightMagnitude);
			comparableData.left.push(leftMagnitude);

			lastLeftIndex = leftIndex;
		}

		this._data = comparableData;

		this._updateStatus(3);

		return comparableData;
	},
	/**
	 * Export shifted data to CSV.
	 */
	exportShiftedData: function exportShiftedData() {
		var out = 'Time;Right;Left';
		for (var i = 0; i < this._data.right.length; i++) {
			out += "\n"+this._data.time[i]+';'+this._data.right[i]+';'+this._data.left[i];
		}
		Utils.Export.exportCSV(out);
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

		var comparableData = this._data;

		var deviations = [];

		var rightMaxPercentage, leftMaxPercentage, deviationPercentage, ratio, deviation;
		for (var i = 0; i < comparableData.right.length; i++) {
			rightMaxPercentage = comparableData.right[i];
			leftMaxPercentage = comparableData.left[i];

			deviationPercentage = Math.abs(rightMaxPercentage - leftMaxPercentage);
			ratio = deviationPercentage / ((rightMaxPercentage + leftMaxPercentage) / 2);

			deviations.push(ratio);
		}
		
		var avg = Utils.Math.getAverageFromNumArr(deviations),
		std = Utils.Math.getStandardDeviation(deviations);

		this._deviations = deviations;
		this._avg = avg;
		this._std = std;

		Utils.logMessage('---------');
		Utils.logMessage('Compare :');
		Utils.logMessage('Avg : ' + avg);
		Utils.logMessage('Std : ' + std);

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
 * @param {VoiceAnalysis} left  The first voice analysis.
 * @param {VoiceAnalysis} right The second voice analysis.
 * @return {VoiceComparison}    The voice comparison.
 */
VoiceComparison.build = function build(left, right) {
	return new VoiceComparison(left, right);
};