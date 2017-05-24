var argy = require('argy');
var events = require('events');
var util = require('util');

function ExlibrisRequest(settings) {
	var er = this;

	er.settings = _.defaults(settings, {
	});


	/**
	* Run all provided references via request()
	* @param {Object} ref The Reflib reference object to process
	* @param {Object} [options] Additional overriding options to use (otherwise `settings` is used)
	* @param {function} [cb] The callback to run on completion
	* @return {Object} This chainable object
	*/
	er.request = argy('object [object] [function]', function(ref, options, cb) {

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
		var settings = _.defaults(options, er.settings);

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
