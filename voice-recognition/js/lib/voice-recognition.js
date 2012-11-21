var VoiceModel = function VoiceModel(data) {
	this._name = data.name;
	this._gender = data.gender;
	this._speaker = data.speaker;
	this._micro = data.micro;
	this._data = {
		magnitude: data.data.magnitude,
		time: data.data.time
	};
};
VoiceModel.prototype = {
	name: function getName() {
		return this._name;
	},
	gender: function getGender() {
		return this._gender;
	},
	speaker: function getSpeaker() {
		return this._speaker;
	},
	micro: function getMicro() {
		return this._micro;
	},
	range: function getRange() {
		return [0, this.normalizedData().magnitude.length];
	},
	normalizedData: function getNormalizedData() {
		return this._data;
	},
	status: function getStatus() {
		return 4;
	}
};

var VoiceRecognition = function VoiceRecognition() {
	Utils.Observable.call(this);

	this._status = 0;
	this._input = null;
	this._models = [];

	this._data = null;
	this._result = null;
};
VoiceRecognition.prototype = {
	status: function getStatus() {
		return this._status;
	},
	_updateStatus: function _updateStatus(status) {
		status = (typeof status == 'number') ? status : this._status;
		this._status = status;

		this.notify('updatestatus', { status: status });
	},
	setInputAnalysis: function setInputAnalysis(analysis) {
		this._input = analysis;

		this.notify('inputchange', {
			analysis: analysis
		});
	},
	setVoiceModels: function setVoiceModels(models) {
		this._models = models;

		this.notify('modelschange', {
			models: models
		});
	},
	countVoiceModels: function countVoiceModels() {
		var nbr = 0;

		for (var i = 0; i < this._models.length; i++) {
			nbr += this._models[i].models.length;
		}

		return nbr;
	},
	recognize: function recognize(options) {
		this.notify('start');

		Utils.logMessage('Recognition start');
		Utils.logMessage('---------');

		var that = this, analysis = this._input;

		var avgs = [], stds = [];
		var modelSetsAvgs = [], modelSetsStds = [], modelSetMinAvg, modelSetIndex;

		for (var i = 0; i < this._models.length; i++) {
			(function(modelSet) {
				avgs[i] = [];
				stds[i] = [];

				for (var j = 0; j < modelSet.models.length; j++) {
					(function(modelData) {
						var model = new VoiceModel(modelData);

						var comparison = VoiceComparison.build(model, analysis);

						that.notify('comparestart', {
							model: model,
							comparison: comparison
						});

						comparison.checkVoiceAnalyses();
						comparison.shiftData();
						var result = comparison.compareData();

						avgs[i][j] = result.avg;
						stds[i][j] = result.std;

						that.notify('comparecomplete', {
							model: model,
							comparison: comparison
						});

					})(modelSet.models[j]);
				}

				modelSetsAvgs[i] = Utils.Math.getAverageFromNumArr(avgs[i]);
				modelSetsStds[i] = Utils.Math.getStandardDeviation(stds[i]);

				if (typeof modelSetMinAvg == 'undefined' || modelSetsAvgs[i] < modelSetMinAvg) {
					modelSetMinAvg = modelSetsAvgs[i];
					modelSetIndex = i;
				}
			})(this._models[i]);
		}

		this._data = {
			models: {
				avgs: avgs,
				stds: stds
			},
			modelSets: {
				avgs: modelSetsAvgs,
				stds: modelSetsStds
			}
		};

		var modelsAvgs = [];
		for (var i = 0; i < this._data.modelSets.avgs.length; i++) {
			modelsAvgs.push(this._data.modelSets.avgs[i]);
		}

		modelsAvgs.sort();

		this._stats = {
			avgError: Utils.Math.getNumWithSetDec(modelsAvgs[0] / modelsAvgs[1])
		};

		var modelSetName = this._models[modelSetIndex].name;
		this._result = modelSetIndex;

		Utils.logMessage('Recognition complete');
		Utils.logMessage('---------');
		Utils.logMessage(this._data);

		this.notify('complete', {
			data: this._data,
			stats: this._stats,
			result: {
				index: modelSetIndex,
				name: modelSetName
			}
		});

		return {
			data: this._data,
			stats: this._stats,
			result: {
				index: modelSetIndex,
				name: modelSetName
			}
		}
	}
};

Utils.inherit(VoiceRecognition, Utils.Observable);

VoiceRecognition.build = function build($controls) {
	return new VoiceRecognition($controls);
};