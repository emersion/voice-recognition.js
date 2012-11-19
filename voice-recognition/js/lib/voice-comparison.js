var VoiceComparison = function VoiceComparison(controls, left, right) {
	this._analyses = [left, right];
	this._controls = controls;
	this._data = {};
	this._status = 0;

	this._updateStatus();
};
VoiceComparison.prototype = {
	control: function getControl(name) {
		return this._controls['$' + name];
	},
	status: function getStatus() {
		return this._status;
	},
	_updateStatus: function _updateStatus(status) {
		status = (typeof status == 'number') ? status : this._status;
		this._status = status;

		var specificControls = {
			$shiftData: this.control('shiftData'),
			$shiftAndExportData: this.control('shiftAndExportData'),
			$compareData: this.control('compareData'),
			$comparedAndExportData: this.control('comparedAndExportData')
		};

		for (var index in specificControls) {
			specificControls[index].prop('disabled', true);
		}

		if (status > 1) {
			specificControls.$shiftData.prop('disabled', false);
			specificControls.$shiftAndExportData.prop('disabled', false);
		}

		if (status > 2) {
			specificControls.$compareData.prop('disabled', false);
			specificControls.$comparedAndExportData.prop('disabled', false);
		}

		if (Utils.Options.get('voice.fnChaining')) {
			var that = this;

			var specificFunctions = {
				1: function() {
					that.shiftData();
				},
				2: function() {
					that.compareData();
				}
			};

			if (typeof specificFunctions[status] == 'function') {
				specificFunctions[status]();
			}
		}
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
			rightMaxPercentage = rightNormalizedData.magnitudes[rightIndex];

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
					leftMaxPercentage = leftNormalizedData.magnitudes[leftIndex];

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
				leftMaxPercentage = leftNormalizedData.magnitudes[leftIndex];
			}

			Utils.logMessage('=>', rightIndex, leftIndex, rightMaxPercentage, leftMaxPercentage);

			comparableData.right.push(rightMaxPercentage);
			comparableData.left.push(leftMaxPercentage);

			lastLeftIndex = leftIndex;
		}

		this._updateStatus(1);

		this._data = comparableData;
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

		document.getElementById('result-container').style.display = 'block';
		$('#result-deviation').removeClass('text-success text-warning text-error').addClass(resultClass);
		document.getElementById('result-deviation').innerHTML = avg;
		document.getElementById('result-std').innerHTML = std;

		var right = data[rightIndex], left = data[leftIndex];

		this._updateStatus(2);
	},
	exportComparedData: function exportComparedData() {
		var out = 'Index;Deviation';
		for (var i = 0; i < this._deviations.length; i++) {
			out += ("\n"+i+';'+this._deviations[i]).replace(/\./g,',');
		}
		Utils.Export.exportCSV(out);
	}
};

VoiceComparison.build = function(controls, left, right) {
	return new VoiceComparison(controls, left, right);
};