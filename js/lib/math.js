(function() {
	if (!window.Utils) {
		window.Utils = {};
	}

	if (Utils.Math) {
		return;
	}

	Utils.Math = {};

	Utils.Math.getNumWithSetDec = function getNumWithSetDec(num, numOfDec) {
		numOfDec = (typeof numOfDec == 'number') ? numOfDec : Utils.Options.get('utils.math.precision');

		var pow10s = Math.pow( 10, numOfDec );
		return ( numOfDec ) ? Math.round( pow10s * num ) / pow10s : num;
	};
	Utils.Math.getAverageFromNumArr = function getAverageFromNumArr(numArr, numOfDec, range) {
		range = range || [0, numArr.length - 1];

		if (range[1] - range[0] <= 0) {
			return Number.NaN;
		}

		var i = range[1] + 1,
			sum = 0;
		while( i-- && i >= range[0] ){
			sum += numArr[ i ];
		}

		return Utils.Math.getNumWithSetDec( (sum / (range[1] - range[0] + 1)), numOfDec );
	};
	Utils.Math.getVariance = function getVariance(numArr, numOfDec, range) {
		range = range || [0, numArr.length - 1];

		if (range[1] - range[0] <= 0) {
			return Number.NaN;
		}

		var avg = Utils.Math.getAverageFromNumArr(numArr, numOfDec, range), 
			i = range[1] + 1,
			v = 0;
	 
		while( i-- && i >= range[0] ){
			v += Math.pow( (numArr[ i ] - avg), 2 );
		}
		v /= range[1] - range[0] + 1;
		return Utils.Math.getNumWithSetDec(v, numOfDec);
	};
	Utils.Math.getStandardDeviation = function getStandardDeviation(numArr, numOfDec, range) {
		var stdDev = Math.sqrt(Utils.Math.getVariance(numArr, numOfDec, range));
		return Utils.Math.getNumWithSetDec(stdDev, numOfDec);
	};
})();