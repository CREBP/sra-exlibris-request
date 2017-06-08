var _ = require('lodash');
var argy = require('argy');
var async = require('async-chainable');
var exlibris = require('/media/LinuxSSD/Projects/Node/exlibris');
var events = require('events');
var util = require('util');

function ExlibrisRequest(settings) {
	var er = this;

	er.settings = _.defaults(settings, {
		exlibris: {
			region: 'eu', // Which region to make the request from
			apiKey: '', // API key for the Exlibis account
		},
		user: {
			email: 'someone@somewhere.com', // Email address lookup of the Exlibris user
		},
		request: {}, // Additional fields to send in request
		validator: (ref, eRef) => true, // Validator function used to verify that a reference can be submitted. Should return either a boolean or a string (error message). Note, this occurs AFTER the field translation stage, so the fields are Exlibris and NOT Reflib spec. If you are mutating the object, mutate the Exlibris object (eRef)
		debug: {
			execRequest: false, // Set to false to disable requesting (i.e. dry-run mode), user details etc. are still retrieved but the request is not made
			titleMangle: title => title, // Title rewriter function. Set this to something to override the requested title for debugging purposes
		},
	});


	/**
	* Utility config merger
	* This function merges the object settings with the given object
	* If a key + val is specified _.set() is used to set the single value, if an object is used it will be merged
	* @param {Object|string} config The new config to merge
	* @param {*} [value] Optional value if `config` is a string
	* @return {Object} This chainable object
	*/
	er.set = function(config, value) {
		if (_.isObject(config)) {
			_.merge(er.settings, config);
		} else {
			_.set(er.settings, config, value);
		}

		return er;
	};


	/**
	* Object containing reflib -> Exlibris resource field translations
	* Key is the reflib field, value is the exlibris equivelent
	* If a field is NOT specified in this object it will not be used during the request
	* @var {Object}
	*/
	er.reflibExlibrisTranslations = {
		title: 'title',
	};


	/**
	* Run all provided references via request()
	* @param {Object} ref The Reflib reference object to process
	* @param {Object} [options] Additional overriding options to use (otherwise `settings` is used)
	* @param {function} [cb] The callback to run on completion
	* @return {Object} This chainable object
	*/
	er.request = argy('object [object] [function]', function(ref, options, cb) {
		var settings = _.defaultsDeep(options, er.settings);

		async()
			// Sanity checks {{{
			.then(function(next) {
				next();
			})
			// }}}
			// Convert the ref into a valid exlibris resource {{{
			.then('resource', function(next) {
				var res = {title: ''};
				_.forEach(ref, (v, k) => {
					if (!er.reflibExlibrisTranslations[k]) return; // Unknown field in the reflib reference
					ref[er.reflibExlibrisTranslations[k]] = v;
				});
				next(null, res);
			})
			// }}}
			// Debug mangling {{{
			.then(function(next) {
				if (settings.debug.titleMangle) this.resource.title = settings.debug.titleMangle(this.resource.title);
				next();
			})
			// }}}
			// Setup Exlibris {{{
			.then('exlibris', function(next) {
				next(null, new exlibris()
					.setKey(settings.exlibris.apiKey)
					.setRegion(settings.exlibris.region)
				);
			})
			// }}}
			// Find the ExLibris user {{{
			.then('user', function(next) {
				this.exlibris.users.search({
					limit: 1,
					email: settings.user.email,
				}, function(err, res) {
					if (err) return next(err);
					if (!res.length) return next(`No user found matching email "${settings.user.email}"`);
					next(null, res[0]);
				});
			})
			// }}}
			// Make the request {{{
			.then('response', function(next) {
				if (!settings.execRequest) return next(null, {id: 'FAKE', response: 'execRequest is disabled!'});

				return next('FIXME: Emergency stop!');
				this.exlibris.resources.request(this.resource, this.user, settings.request);
			})
			// }}}
			// End {{{
			.end(function(err) {
				if (err) return cb(err);
				cb(null, this.response);
			});
			// }}}

		return this;
	});


	/**
	* Run all provided references via request()
	* @param {array} refs The array of Reflib reference objects to process
	* @param {Object} [options] Additional overriding options to use (otherwise `settings` is used)
	* @param {function} [cb] The callback to run on completion
	* @return {Object} This chainable object
	*/
	er.requestAll = argy('array [object] [function]', function(refs, options, cb) {
		var settings = _.defaultsDeep(options, er.settings);

		async()
			.forEach(refs, function(next, ref) {
				er.request(ref, settings, cb);
			})
			.end(cb);
	});
};

util.inherits(ExlibrisRequest, events.EventEmitter);

module.exports = function(settings) {
	return new ExlibrisRequest(settings);
};
