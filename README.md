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


API
===

ExlibrisRequest (class)
-----------------------
The main ExlibrisRequest class is used to setup the instance with initial settings and provide an API.

Supported Settings:

| Setting                              | Type     | Default     | Description                                                                                                                    |
|--------------------------------------|----------|-------------|--------------------------------------------------------------------------------------------------------------------------------|
| `exlibris`                           | Object   | See below   | Settings passed onto the [Exlibris](https://github.com/CREBP/exlibris) NPM module                                              |
| `exlibris.region`                    | String   | `"eu"`      | What Exlibris region server the place the request with                                                                         |
| `exlibris.apiKey`                    | String   | none        | Your Exlibris API key                                                                                                          |
| `exlibris.resourceRequestRetry`      | Number   | `10`        | How many times to retry a single request if it fails                                                                           |
| `exlibris.resourceRequestRetryDelay` | Function | See code    | How to calculate how long to wait between requests. Default behaviour is to pick a random millisecond delay between 0 and 2000 |
| `exlibris.threads`                   | Number   | `2`         | How many requests to place simultaneously                                                                                      |
| `user`                               | Object   | See below   | Information about the user to place the request against                                                                        |
| `user.email`                         | String   | none        | The users email to link the request against                                                                                    |
| `request`                            | Object   | `{}`        | Additional fields to provide in the request                                                                                    |
| `validator`                          | Function | `()=> true` | Validator function used to verify that a reference can be submitted. Should return either a boolean or a string (error message). Note, this occurs AFTER the field translation stage, so the fields are Exlibris and NOT Reflib spec. If you are mutating the object, mutate the Exlibris object (eRef) |
| `debug`                              | Object   | See below   | Debug flags                                                                                                                    |
| `debug.execRequest`                  | Boolean  | `false`     | Whether to actually place requests. User details and all other validation stages are applied except the final submission       |
| `debug.titleMangle`                  | String   | `title => title` | How to mutate the citation title before submission. Override this function to specify a prefix / suffix                   |
| `cache`                              | Object   | See below   | Caching details, the cache is used only on this instance and can significantly speed up requests if working in batches         |
| `cache.enabled`                      | Boolean  | `true`      | Whether to use caching                                                                                                         |
| `cache.cacheGet`                     | Function | See code    | Uses simple memory caching                                                                                                     |
| `cache.cacheSet`                     | Function | See code    | Uses simple memory caching                                                                                                     |


**Notes:**

* The `debug.execRequest` flag is disabled by default. Set this to true to make the library submit requests, although you should test without this enabled first
* All functions are chainable


ExlibrisRequest.set(config, [value])
------------------------------------
Used to quickly set one or more config values. See the main constructor for a list of settings.

```javascript
ExlibrisRequest
	.set('key1', 'value1')
	.set('key2', 'value2')
	.set('key3.subKey1', 'value3')

ExlibrisRequest.set({
	key1: 'value1',
	key2: 'value2',
	key3: {
		subKey1: 'value3',
	},
})
```


ExlibrisRequest.request(ref, [options], [cb])
---------------------------------------------
Make a citation request to Exlibris.

The reference should be in the [reflib](https://github.com/hash-bang/Reflib-Node) format.

Options can be specified to override the defaults. Callback is optional.


ExlibrisRequest.requestAll(refs, [options], [cb])
-------------------------------------------------
Similar to `request()` but places requests in batch.

See the request function for details.


Events
------
The ExlibrisRequest instance can also fire events.

| Event            | Parameters                          | Description                                               |
|------------------|-------------------------------------|-----------------------------------------------------------|
| `requestSucceed` | `(ref, attempt)`                    | Fired when a request succeeded                            |
| `requestRetry`   | `(ref, attempt, tryagainInTimeout)` | Fired when a request fails but will be retried            |
| `requestFailed`  | `(ref, attempts)`                   | Fired when a request failed after retrying                |
| `requestError`   | `(ref, err)`                        | Fired when a request is completely rejected by the server |
