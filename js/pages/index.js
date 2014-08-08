jQuery(function($) {
	var Docs = {}; //Namespace for the doc's tools

	Docs._githubProject = 'simonser/voice-recognition.js';
	Docs._githubURL = 'http://github.com/' + Docs._githubProject;
	Docs._githubRawURL = 'https://raw.github.com/' + Docs._githubProject;
	Docs._githubCommit = 'ca1684a26dee92d600a0672d63e2d2f319d220ff';
	Docs.browseCode = function browseCode(file, startLine, endLine, commit) {
		commit = commit || Docs._githubCommit || 'master';
		var url = Docs._githubURL + '/blob/' + commit + '/' + file + '#L' + startLine;

		if (endLine) {
			url += '-' + endLine;
		}

		window.open(url);
	};

	//Export API
	window.Docs = Docs;
});