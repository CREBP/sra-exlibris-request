/**
* Specific version of the request testkit script designed for Bond University
* Bond requires a certain request format (citation_type='BK' for books, 'CR' for everything else), complete rules in the validator
*/

var _ = require('lodash');
var expect = require('chai').expect;
var mlog = require('mocha-logger');
var reflib = require('reflib');
var sraExlibrisRequest = require('..');
var util = require('util');

// Bond config {{{
var setupBond = ()=>
	new sraExlibrisRequest()
		.set(require('./config'))
		.set('exlibris.resourceRequestRetry', 3) // Only attempt three times
		// .set('debug.titleMangle', title => `[SRA TEST ${(new Date).toISOString()} - LIVE-1] ${title}`)
		.set('debug.execRequest', true)
		.set('request.source', 'SRA')
		.set('validator', (ref, eref) => {
			if (!ref.type) return 'No reference type specified';
			if (ref.type == 'book') {
				if (!eref.title) return 'Missing book title';
				eref.pickup_location = 'MAIN',
				eref.format = 'PHYSICAL';
				eref.citation_type = 'BK';
			} else if (ref.type == 'bookSection') {
				if (!eref.title) return 'Missing book title';
				if (!eref.pages && !eref.section) return 'Missing book section or pages';
				eref.format = 'DIGITAL';
				eref.citation_type = 'BK';
			} else if (ref.type == 'conferencePaper') {
				if (!eref.title) return 'Missing conference paper title';
				eref.format = 'DIGITAL';
				eref.citation_type = 'BK';
			} else { // Assume everything else is a digital item
				if (!eref.title) return 'Missing title';
				eref.format = 'DIGITAL';
				eref.citation_type = 'CR';
			}

			return true;
		})
			.on('requestRetry', (ref, attempt, tryAgainInTimeout) => mlog.log(`request refused (attempt #${attempt}) for "${ref.title}" retry in ${tryAgainInTimeout}ms`))
			.on('requestFailed', (ref, attempt) => mlog.log(`request completely failed (after #${attempt} attempts) for "${ref.title}" - giving up`))
			.on('requestSucceed', (ref, attempt) => mlog.log(`request success for "${ref.title}"`))
			.on('requestError', (ref, err) => mlog.log(`request error for "${ref.title}" - ${err.toString()} ` + (err.text ? `(has response text: "${err.text}")` : '(no response reason given)')))
// }}}

describe('requestAll() - Custom Bond', function() {

	var er;
	before('init sraExlibrisRequest object', ()=> er = setupBond());

	var refs;
	before('fetch example references', function(done) {
		this.timeout(30 * 1000);
		reflib.parseFile('./test/data/custom.xml', function(err, res) {
			if (err) return done(err);
			refs = res;
			done();
		});
	});

	it.only('should make a request for all references (execRequest = false)', function(done) {
		this.timeout(60 * 60 * 1000);

		er.requestAll(refs, {debug: {execRequest: false}}, function(err, res) {
			expect(err).to.be.not.ok;
			done();
		})
	});

	// Only run this for live testing with real requests
	it.skip('should make a live request for all references', function(done) {
		this.timeout(60 * 60 * 1000);

		er.requestAll(refs, function(err, res) {
			expect(err).to.be.not.ok;
			done();
		})
	});

});
