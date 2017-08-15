/**
* Specific version of the request testkit script designed for Bond University
* Bond requires a certain request format (citation_type='BK' for books, 'CR' for everything else), complete rules in the validator
*/

var expect = require('chai').expect;
var mlog = require('mocha-logger');
var reflib = require('reflib');
var sraExlibrisRequest = require('..');

// Bond config {{{
var setupBond = ()=>
	new sraExlibrisRequest()
		.set(require('./config'))
		.set('debug.titleMangle', title => `[SRA TEST ${(new Date).toISOString()} - DO NOT ACCEPT] ${title}`)
		.set('debug.execRequest', true)
		.set('request.source', 'SRA')
		.set('request.note', 'SRA')
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
		});
// }}}

describe.skip('request() - Bond specific', function() {

	var er;
	before('init sraExlibrisRequest object', ()=> er = setupBond());

	var refs;
	before('fetch example references', done => {
		reflib.parseFile('./test/data/endnote-md.xml', function(err, res) {
			if (err) return done(err);
			refs = res;
			done();
		});
	});

	it('should make a sample request (execRequest = false)', function(done) {
		this.timeout(30 * 1000);

		er
			.request(refs[0], {debug: {execRequest: false}}, function(err, res) {
				expect(err).to.be.not.ok;
				expect(res).to.be.deep.equal({id: 'FAKE', response: 'execRequest is disabled!'});

				done();
			})
			.on('requestRetry', (ref, attempt, tryAgainInTimeout) => mlog.log(`request failed (attempt #${attempt}) for "${ref.title}" retry in ${tryAgainInTimeout}ms`))
	});

	it('should make a request for one reference', function(done) {
		this.timeout(30 * 1000);

		er
			.request(refs.filter(r => r.type == 'book')[0], function(err, res) {
				expect(err).to.be.not.ok;
				done();
			})
			.on('requestRetry', (ref, attempt, tryAgainInTimeout) => mlog.log(`request failed (attempt #${attempt}) for "${ref.title}" retry in ${tryAgainInTimeout}ms`))
	});

});

describe('requestAll() - Bond specific', function() {

	var er;
	before('init sraExlibrisRequest object', ()=> er = setupBond());

	var refs;
	before('fetch example references', function(done) {
		this.timeout(30 * 1000);
		reflib.parseFile('./test/data/endnote-md.xml', function(err, res) {
			if (err) return done(err);
			refs = res;
			done();
		});
	});

	it('should make a request for all references', function(done) {
		this.timeout(60 * 60 * 1000);

		er
			.requestAll(refs, function(err, res) {
				expect(err).to.be.not.ok;
				done();
			})
			.on('requestRetry', (ref, attempt, tryAgainInTimeout) => mlog.log(`request refused (attempt #${attempt}) for "${ref.title}" retry in ${tryAgainInTimeout}ms`))
			.on('requestFailed', (ref, attempt) => mlog.log(`request completely failed (after #${attempt} attempts) for "${ref.title}" - giving up`))
			.on('requestSucceed', (ref, attempt) => mlog.log(`request success for "${ref.title}"`))
			.on('requestError', (ref, err) => mlog.log(`request error for "${ref.title}" - ${err.toString()} ` + (err.text ? `(has response text: "${err.text}")` : '(no response reason given)')))

	});

});
