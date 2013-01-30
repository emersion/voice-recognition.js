jQuery(function($) {
	var Docs = {}; //Namespace for the doc's tools

	Docs._githubURL = 'http://github.com/simonser/voice-recognition.js';
	Docs.browseCode = function browseCode(file, startLine, endLine) {
		var url = Docs._githubURL + '/blob/master/' + file + '#L' + startLine;

		if (endLine) {
			url += '-' + endLine;
		}

		window.open(url);
	};

	//Export API
	window.Docs = Docs;
});