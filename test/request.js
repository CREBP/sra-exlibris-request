var expect = require('chai').expect;
var mlog = require('mocha-logger');
var reflib = require('reflib');
var sraExlibrisRequest = require('..');

describe('request()', function() {

	var er;
	before('init sraExlibrisRequest object', ()=> er = new sraExlibrisRequest().set(require('./config')));

	var refs;
	before('fetch example references', done => {
		reflib.parseFile('./test/data/endnote-sm.xml', function(err, res) {
			if (err) return done(err);
			refs = res;
			done();
		});
	});

	it('should make a simple request (execRequest = false)', function(done) {
		this.timeout(30 * 1000);

		er
			.request(refs[0], {debug: {execRequest: false}}, function(err, res) {
				expect(err).to.be.not.ok;
				expect(res).to.be.deep.equal({id: 'FAKE', response: 'execRequest is disabled!'});

				done();
			})
			.on('requestRetry', (ref, attempt, tryAgainInTimeout) => mlog.log(`request refused (attempt #${attempt}) for "${ref.title}" retry in ${tryAgainInTimeout}ms`))
			.on('requestFailed', (ref, attempt) => mlog.log(`request completely failed (after #${attempt} attempts) for "${ref.title}" - giving up`))
			.on('requestSucceed', (ref, attempt) => mlog.log(`request success for "${ref.title}"`))
			.on('requestError', (ref, err) => mlog.log(`request error for "${ref.title}" - ${err.toString()} ` + (err.text ? `(has response text: "${err.text}")` : '(no response reason given)')))
	});

});
