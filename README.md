SRA-Exlibris-Request
====================
This module is part of the [Bond University Centre for Research in Evidence-Based Practice](https://github.com/CREBP) Systematic Review Assistant suite of tools.

This module forms the reference request tool.

```javascript
var exlibrisRequest = require('sra-exlibis-request');

new sraExlibrisRequest()
	.set({
		exlibris: {
			apiKey: 'YOUR API KEY'
		},
		user: {
			email: 'someone@somewhere', // User making request
		},
	})
	.set('request.source', 'SRA') // Set some extra request fields
	.set('request.note', 'SRA')
	.set('validator', (ref, eref) => { // Custom validator code
		if (!ref.type) return 'No reference type specified';
		if (ref.type == 'book') {
			if (!eref.title) return 'Missing book title';
			if (!eref.journal) return 'Missing journal';
			eref.pickup_location = 'MAIN',
			eref.format = 'PHYSICAL';
			eref.citation_type = 'BK';
		}
		return true;
	})
	.requestAll(refs, function(err, res) { // Request a bunch of references (maybe use reflib - https://github.com/hash-bang/Reflib-Node - to read in a library?)
		expect(err).to.be.not.ok;
		done();
	})
```

See the [testkits](test/) for more examples.
