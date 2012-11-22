(function() {
	if (!window.Utils) {
		window.Utils = {};
	}

	if (Utils.Observable) {
		return;
	}

	Utils.Observable = function Observable() {
		this._observers = [];
	};
	Utils.Observable.prototype = {
		bind: function $_Observable_bind(event, fn) {
			var namespace = event;
			var events = event.split(' '), eventsNames = [];
			for (var i = 0; i < events.length; i++) {
				eventsNames.push(events[i].split('.')[0]);
			}

			return this._observers.push({
				fn: fn,
				eventsNames: eventsNames,
				events: events
			}) - 1;
		},
		one: function $_Observable_one(event, fn) {
			var that = this;

			var callbackId = this.bind(event, function(data) {
				that.unbind(callbackId);
				fn.call(this, data);
			});
		},
		unbind: function $_Observable_unbind(key, fn) {
			var observers = [];
			if (typeof key == 'number') {
				for (var i = 0; i < this._observers.length; i++) {
					var el = this._observers[i];
					if (key != i) {
						observers.push(el);
					}
				}
			} else {
				key = String(key);
				var events = key.split(' ');
				for (var i = 0; i < this._observers.length; i++) {
					var el = this._observers[i], keep = true;

					if (fn && el.fn === fn) {
						keep = false;
					}
					
					for (var j = 0; j < events.length; j++) {
						if (key && (jQuery.inArray(events[j], el.eventsNames) != -1 || jQuery.inArray(events[j], el.events) != -1)) {
							keep = false;
						}
					}

					if (keep) {
						observers.push(el);
					}
				}
			}
			this._observers = observers;
		},
		notify: function $_Observable_notify(event, data, thisObj) {
			data = data || {};
			var scope = thisObj || this, events = event.split(' ');

			for (var i = 0; i < this._observers.length; i++) {
				var el = this._observers[i];

				for (var j = 0; j < events.length; j++) {
					if (jQuery.inArray(events[j], el.eventsNames) != -1 || jQuery.inArray(events[j], el.events) != -1) {
						el.fn.call(scope, data);
					}
				}
			}
		}
	};

	Utils.Observable.build = function $_Observable_build(object) {
		object._observers = [];
		object.bind = function(event, fn) {
			return Utils.Observable.prototype.bind.call(object, event, fn);
		};
		object.one = function(event, fn) {
			return Utils.Observable.prototype.one.call(object, event, fn);
		};
		object.unbind = function(key, fn) {
			return Utils.Observable.prototype.unbind.call(object, key, fn);
		};
		object.notify = function(event, data, thisObj) {
			return Utils.Observable.prototype.notify.call(object, event, data, thisObj);
		};
		return object;
	};

	Utils.Observable.Group = function ObservableGroup(observables) {
		var list = [];
		if (observables instanceof Array) {
			for (var i = 0; i < observables.length; i++) {
				if (Utils.isInstanceOf(observables[i], Utils.Observable)) {
					list.push(observables[i]);
				}
			}
		} else if (Utils.isInstanceOf(observables, Utils.Observable)) {
			list = [observables];
		}

		this._observables = list;

		// xxxEach() methods
		for (var method in Utils.Observable.prototype) {
			var thisMethodName = method + 'Each';
			this[thisMethodName] = function() {
				var args = Array.prototype.slice.call(arguments);
				return this._eachObserver(method, args);
			};
		}
	};
	Utils.Observable.Group.prototype = {
		_eachObserver: function $_ObservableGroup__eachObserver(method, args) {
			var returnValues = [];

			for (var i = 0; i < this._observables.length; i++) {
				if (!this._observables[i][method]) {
					continue;
				}

				var result = this._observables[i][method].apply(this._observables[i], args);
				returnValues.push(result);
			}

			return returnValues;
		},
		bind: function $_ObservableGroup_bind(event, fn) {
			var that = this;
			var nbrNotifications = 0;
			var notifsData = [];

			this._eachObserver('bind', [event, function(data) {
				nbrNotifications++;
				notifsData.push(data);

				if (nbrNotifications >= that._observables.length) {
					fn.call(that, notifsData);

					nbrNotifications = 0;
					notifsData = [];
				}
			}]);
		},
		one: function $_ObservableGroup_one(event, fn) {
			var that = this;
			var nbrNotifications = 0;
			var notifsData = [];

			this._eachObserver('one', [event, function(data) {
				nbrNotifications++;
				notifsData.push(data);

				if (nbrNotifications >= that._observables.length) {
					fn.call(that, notifsData);
				}
			}]);
		},
		addObservable: function $_ObservableGroup_addObservable(observable) {
			if (!Utils.isInstanceOf(observable, Utils.Observable)) {
				return false;
			}

			this._observables.push(observable);
		},
		removeObservable: function $_ObservableGroup_removeObservable(observable) {
			if (!Utils.isInstanceOf(observable, Utils.Observable)) {
				return false;
			}

			var list = [];

			for (var i = 0; i < this._observables.length; i++) {
				if (this._observables[i] !== observable) {
					list.push(this._observables[i]);
				}
			}

			this._observables = list;
		},
		observables: function $_ObservableGroup_observables() {
			return this._observables;
		}
	};

	Utils.Observable.group = function $_Observable_group(observables) {
		return new Utils.Observable.Group(observables);
	};
})();