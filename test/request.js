var expect = require('chai').expect;
var reflib = require('reflib');
var sraExlibrisRequest = require('..');

describe('sra-exlibris-request', function() {

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

		er.request(refs[0], {debug: {execRequest: false}}, function(err, res) {
			expect(err).to.be.not.ok;
			expect(res).to.be.deep.equal({id: 'FAKE', response: 'execRequest is disabled!'});

			done();
		});
	});

});
