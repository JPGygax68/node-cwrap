var expect    = require('chai').expect;
var requirejs = require('requirejs');
var Path      = require('./'); // load our own package's entry point

if (1) { // TODO: wrap this so it will work in an asynchronous (browser) environment

  describe('#constructor', function() {
    it('called without params results in Path convertible to empty string', function() {
      var p = new Path();
      expect(p.toString()).to.be.equal('');
    });
  });

}

