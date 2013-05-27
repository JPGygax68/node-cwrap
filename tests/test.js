var assert = require('assert');
var cwrap = require('../cwrap');

describe('parsing', function() {
  
  var intf;

  before( function(done) {
    this.timeout(10000);
    cwrap.parse('./tests/squish-1.11/squish.h')
      .then( function(intf_) { intf = intf_; console.log(intf); done(); } );
  });
  
  describe('interface object', function() {
    it('should have a functions property', function() { return !!intf.functions; } );
  });
  
});