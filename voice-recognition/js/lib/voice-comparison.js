var VoiceComparison = function VoiceComparison(left, right) {
	Utils.Observable.call(this);

	this._analyses = [left, right];
	this._data = {};
	this._status = 0;
};
VoiceComparison.prototype = {
	status: function getStatus() {
		return this._status;
	},
	init: function init() {
		this._updateStatus();
	},
	_updateStatus: function _updateStatus(status) {
		status = (typeof status == 'number') ? status : this._status;
		this._status = status;

		this.notify('updatestatus', { status: status });
	},
	checkVoiceAnalyses: function checkVoiceAnalyses() {
		for (var i = 0; i < this._analyses.length; i++) {
			if (this._analyses[i].status() < 3) {
				return false;
			}
		}

		this._updateStatus(1);
	},
	shiftData: function shiftData() {
		var left = this._analyses[0], right = this._analyses[1],
		leftNormalizedData = left.normalizedData(), rightNormalizedData = right.normalizedData();

		var maxDiff = Utils.Options.get('voice.shifting.maxPtShift'),
		toleratedRatio = Utils.Options.get('voice.shifting.toleratedRatio');

		var comparableData = {
			right: [],
			left: []
		};

		var lastLeftIndex = left.range()[0] - 1,
		rightPercentageTime = 0,
		rightMaxPercentage = 0;
		for (var rightIndex = right.range()[0]; rightIndex <= right.range()[1]; rightIndex++) {
			rightPercentageTime = rightNormalizedData.time[rightIndex];
			rightMaxPercentage = rightNormalizedData.magnitude[rightIndex];

			Utils.logMessage('---------');
			Utils.logMessage('Right : ', rightIndex, rightPercentageTime, rightMaxPercentage);

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

				if (leftIndex >= left.range()[0] && leftIndex <= left.range()[1]) {
					leftMaxPercentage = leftNormalizedData.magnitude[leftIndex];

					deviation = Math.abs(rightMaxPercentage - leftMaxPercentage);
					ratio = deviation / ((rightMaxPercentage + leftMaxPercentage) / 2);

					Utils.logMessage(isDiffPositive, rightIndex, leftIndex, rightMaxPercentage, leftMaxPercentage, deviation, ratio, (ratio <= toleratedRatio));

					if (ratio <= toleratedRatio) {
						break;
					}
				} else {
					Utils.logMessage(isDiffPositive, rightIndex, leftIndex, false);

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
				leftMaxPercentage = leftNormalizedData.magnitude[leftIndex];
			}

			Utils.logMessage('=>', rightIndex, leftIndex, rightMaxPercentage, leftMaxPercentage);

			comparableData.right.push(rightMaxPercentage);
			comparableData.left.push(leftMaxPercentage);

			lastLeftIndex = leftIndex;
		}

		this._data = comparableData;

		this._updateStatus(2);
	},
	exportShiftedData: function exportShiftedData() {
		var out = 'Index;Right;Left';
		for (var i = 0; i < this._data.right.length; i++) {
			out += "\n"+i+';'+this._data.right[i]+';'+this._data.left[i];
		}
		Utils.Export.exportCSV(out);
	},
	compareData: function compareData() {
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

		this._updateStatus(3);

		return {
			avg: avg,
			std: std
		};
	},
	exportComparedData: function exportComparedData() {
		var out = 'Index;Deviation';
		for (var i = 0; i < this._deviations.length; i++) {
			out += ("\n"+i+';'+this._deviations[i]).replace(/\./g,',');
		}
		Utils.Export.exportCSV(out);
	}
};
Utils.inherit(VoiceComparison, Utils.Observable);

VoiceComparison.build = function build(left, right) {
	return new VoiceComparison(left, right);
};