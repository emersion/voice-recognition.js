var VoiceRecognition = function VoiceRecognition() {
	Utils.Observable.call(this);
};
VoiceRecognition.prototype = {
	setFileInput: function() {
		
	}
};

Utils.inherit(VoiceRecognition, Utils.Observable);

VoiceRecognition.build = function build() {
	return new VoiceRecognition();
};