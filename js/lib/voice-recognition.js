/**
 * A voice model.
 * @constructor
 * @param {Object} data The model data containing the name, the speaker's name & gender, the microphone's name and the voice data.
 */
var VoiceModel = function VoiceModel(data) {
	this._name = data.name; //Model's name
	this._gender = data.gender; //Speaker's gender
	this._speaker = data.speaker; //Speaker's name
	this._micro = data.micro; //Speaker's microphone

	//Voice data
	this._data = {
		magnitude: data.data.magnitude,
		time: data.data.time,
		frequencies: data.data.frequencies
	};
};
VoiceModel.prototype = {
	/**
	 * Get the model's name.
	 * @return {String}
	 */
	name: function getName() {
		return this._name;
	},
	/**
	 * Get the speaker's gender.
	 * @return {String}
	 */
	gender: function getGender() {
		return this._gender;
	},
	/**
	 * Get the speaker's name.
	 * @return {String}
	 */
	speaker: function getSpeaker() {
		return this._speaker;
	},
	/**
	 * Get the microphone's name.
	 * @return {String}
	 */
	micro: function getMicro() {
		return this._micro;
	},
	/**
	 * Get this model's range (when does the speaker speak).
	 * @return {Number[]} An array containing two indexes : the begining & the end.
	 */
	range: function getRange() {
		return [0, this.standardizedData().magnitude.length - 1];
	},
	/**
	 * Get this model's standardized data.
	 * @return {Object}
	 */
	standardizedData: function getStandardizedData() {
		return {
			magnitude: this._data.magnitude,
			time: this._data.time
		};
	},
	/**
	 * Get frequencies on which this model is made.
	 * @return {Number[]} Frequencies on which this model is made.
	 */
	frequencies: function frequencies() {
		return this._data.frequencies;
	},
	/**
	 * Get this model's status.
	 * @return {Number}
	 */
	status: function getStatus() {
		return 4;
	}
};


/**
 * A voice recognition.
 * @constructor
 */
var VoiceRecognition = function VoiceRecognition() {
	Utils.Observable.call(this); // Inheritance from Observable

	this._status = 0;
	this._input = null;
	this._models = [];

	this._data = null;
	this._result = null;
};
VoiceRecognition.prototype = {
	/**
	 * Get the recognition's status.
	 */
	status: function getStatus() {
		return this._status;
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
	 * Set the analysis which will be recognized.
	 * @param {VoiceAnalysis} analysis The voice analysis.
	 */
	setInputAnalysis: function setInputAnalysis(analysis) {
		this._input = analysis;

		this.notify('inputchange', {
			analysis: analysis
		});
	},
	/**
	 * Set the voice models, with which the voice analysis will be compared.
	 * @param {VoiceModel[]} models An array of models.
	 */
	setVoiceModels: function setVoiceModels(models) {
		this._models = models;

		this.notify('modelschange', {
			models: models
		});
	},
	/**
	 * Get the number of voice models selected.
	 * @return {Number} The number of voice models.
	 */
	countVoiceModels: function countVoiceModels() {
		var nbr = 0;

		for (var i = 0; i < this._models.length; i++) {
			nbr += this._models[i].models.length;
		}

		return nbr;
	},
	/**
	 * Start the voice recognition.
	 * @return {Object} An object containing the recognition's results.
	 */
	recognize: function recognize() {
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

						var result = comparison.compareData();

						if (result === false) {
							that.notify('compareerror', {
								model: model,
								comparison: comparison
							});
							return;
						}

						avgs[i][j] = result.avg;
						stds[i][j] = result.std;

						that.notify('comparecomplete', {
							model: model,
							comparison: comparison
						});

					})(modelSet.models[j]);
				}

				modelSetsAvgs[i] = Utils.Math.getAverageFromNumArr(avgs[i]);
				modelSetsStds[i] = Utils.Math.getAverageFromNumArr(stds[i]);

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

Utils.inherit(VoiceRecognition, Utils.Observable); //Inheritance from Observable

/**
 * Build a new voice recognition.
 * @constructs
 * @return {VoiceRecogniton} The voice recognition.
 */
VoiceRecognition.build = function build() {
	return new VoiceRecognition();
};