var _ = require('lodash');
var argy = require('argy');
var async = require('async-chainable');
var exlibris = require('exlibris');
var events = require('events');
var util = require('util');

var send_failedRequests = require('./send_mail/failedRequests')

function ExlibrisRequest(settings) {
	var er = this;
	er.cacheContents = {}; // In-memory default cache
	er.failedRequests = []; // Array to store failed requests for email
	er.successfulRequests = []; // Array to store successful requests for email
	er.totalRequests = 0;

	er.settings = _.defaults(settings, {
		exlibris: {
			region: 'eu', // Which region to make the request from
			apiKey: '', // API key for the Exlibis account
			resourceRequestRetry: 10, // How many times to retry the request if we get back a fail
			resourceRequestRetryDelay: attempt => _.random(0, 2000), // How long to delay between requests
			threads: 2, // How many threads to run in parrallel during requestAll(), don't set this too high as Exlibris has a tendency to reject too many API hits
		},
		user: {
			email: 'someone@somewhere.com', // Email address lookup of the Exlibris user
		},
		request: {}, // Additional fields to send in request. These will override any incomming request fields
		validator: (ref, eRef) => true, // Validator function used to verify that a reference can be submitted. Should return either a boolean or a string (error message). Note, this occurs AFTER the field translation stage, so the fields are Exlibris and NOT Reflib spec. If you are mutating the object, mutate the Exlibris object (eRef)
		debug: {
			execRequest: false, // Set to false to disable requesting (i.e. dry-run mode), user details etc. are still retrieved but the request is not made
			titleMangle: title => title, // Title rewriter function. Set this to something to override the requested title for debugging purposes
		},
		cache: {
			enabled: true,
			cacheGet: email => er.cacheContents[email],
			cacheSet: (email, obj) => er.cacheContents[email] = obj,
		},
		template: 'failed-requests.hbs', // Template to send email listing failed requests
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
		// reflib => exlibris request field
		title: 'title',
		journal: 'journal_title',
		pages: 'pages',
		section: 'section',
		volume: 'volume',
		number: 'issue',
		doi: 'doi',
		issn: 'issn',
		isbn: 'issn',
		year: 'year',
		language: 'language',
		authors: (ref, eref) => eref.author = ref.authors.join(', '),
		urls: (ref, eref) => eref.source = ref.urls.join(', '), // URL/s to provided resource
	};


	/**
	* Field definitions and the defaults to use if no value is provided
	* This is a workaround for systems where certain fields are marked as mandatory (e.g. pages) but we do not have any data to provide
	* @var {Object}
	*/
	er.mandatoryFields = {
		title: 'Title Missing',
		journal_title: 'N.A.',
		author: 'N.A.',
		volume: 'N.A.',
		issue: 'N.A.',
		pages: 'N.A.'
	};


	/**
	* Make a single request
	* @param {Object} ref The Reflib reference object to process
	* @param {Object} [options] Additional overriding options to use (otherwise `settings` is used)
	* @param {function} [cb] The callback to run on completion
	* @return {Object} This chainable object
	* @fires requestSucceed Event fired when a request succeeded. Called as (ref, attempt)
	* @fires requestRetry Event fired when a request fails but will be retried. Called as (ref, attempt, tryAgainInTimeout)
	* @fires requestFailed Event fired when a request fails after exhausing the number of retries. Called as (ref, attempts)
	* @fires requestError Event fired when a request is completely rejected by the server. Called as (ref, err)
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

				// Translate fields from Reflib -> Exlibris
				_.forEach(ref, (v, k) => {
					if (!er.reflibExlibrisTranslations[k]) {
						return; // Unknown field in the reflib reference
					} else if (_.isFunction(er.reflibExlibrisTranslations[k])) { // Run via filter and return result
						var ret = er.reflibExlibrisTranslations[k](ref, res);  // Call by reference to mutate res
					} else { // Key -> Key mapping
						res[er.reflibExlibrisTranslations[k]] = v;
					}
				});

				// Force fields to have a value if they don't already
				_.forEach(er.mandatoryFields, (v, k) => {
					if (!res[k]) res[k] = v;
				});

				// Add article to total count
				er.totalRequests++;

				next(null, res);
			})
			// }}}
			// Validate the reference {{{
			.then(function(next) {
				if (!settings.validator) return next();

				var result = settings.validator(ref, this.resource);
				if (result === true) return next();

				var humanRef =
					ref.doi ? `DOI ${this.resource.doi}`
					: ref.recNumber ? `Record #${this.resource.recNumber}`
					: ref.isbn ? `ISBN ${this.resource.isbn}`
					: ref.title ? `"${this.resource.title}"`
					: 'Unnamed reference';

				return next(`Validation failed for reference ${humanRef}` + (_.isString(result) ? ` - ${result}` : ''));
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
				// Try and pull from cache {{{
				if (settings.cache.enabled) {
					var ret = settings.cache.cacheGet(settings.user.email);
					if (ret) return next(null, ret);
				}
				// }}}

				this.exlibris.users.search({
					limit: 1,
					email: settings.user.email,
				}, function(err, res) {
					if (err) return next(err);
					if (!res.length) return next(`No user found matching email "${settings.user.email}"`);

					if (settings.cache.enabled) settings.cache.cacheSet(settings.user.email, res[0]);
					next(null, res[0]);
				});
			})
			// }}}
			// Make the request {{{
			.then('response', function(next) {
				var attempt = 0;
				// Wrap the actual request in a function that we can retry until we're exhausted
				// For some reason ExLibris will randomly reject requests even if their own internal setting is set to high thoughput, so its neccessary to deal with this weirdness by retrying until we're successful with some exponential backoff
				var attemptRequest = ()=> {
					if (!settings.debug.execRequest) {
						this.resource.error = "Exec request disabled"
						er.failedRequests.push(this.resource);
						er.emit('requestSucceed', this.resource, attempt);
						next(null, {id: 'FAKE', response: 'execRequest is disabled!'});
					}
					// Else live requests are enabled
					else {
						this.exlibris.resources.request(_.assign({}, this.resource, settings.request), this.user, settings.request, (err, res) => {
							if (err && err.status == 400 && !err.text) {
								if (++attempt < settings.exlibris.resourceRequestRetry) { // Errored but we're still below retry threshold
									var tryAgainInTimeout = settings.exlibris.resourceRequestRetryDelay(attempt);
									er.emit('requestRetry', this.resource, attempt, tryAgainInTimeout);
									setTimeout(()=> attemptRequest(), tryAgainInTimeout);
								} else {
									er.emit('requestFailed', this.resource, attempt);
									next(`Failed after ${attempt} attempts - ${err.toString()}`);
								}
							} else if (err) {
								er.emit('requestError', this.resource, err);
								next(err);
							} else {
								er.successfulRequests.push(this.resource)
								er.emit('requestSucceed', this.resource, attempt);
								next(null, res);
							}
						});
					}
				};

				attemptRequest();
			})
			// }}}
			// End {{{
			.end(function(err) {
				if (err) {
					// Push failed resource to failed requests for email
					this.resource.error = err
					er.failedRequests.push(this.resource);
					return cb(err);
				}
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
			.limit(settings.exlibris.threads)
			.forEach(refs, function(nextRef, ref) {
				er.request(ref, settings, nextRef);
			})
			.end(() => {
				// Send email with failed requests
				send_failedRequests(er.settings.user, er.failedRequests, er.totalRequests, er.successfulRequests)
				cb()
			});

		return this;
	});
};

util.inherits(ExlibrisRequest, events.EventEmitter);

module.exports = function(settings) {
	return new ExlibrisRequest(settings);
};
