var assert = require('assert');
var cwrap = require('../cwrap');

describe('parsing', function() {
  
  var intf;

  before( function(done) {
    this.timeout(10000);
    cwrap.parse('./tests/squish-1.11/squish.h')
      .then( function(intf_) { intf = intf_; done(); } );
  });
  
  describe('interface object', function() {
    it('should have a "functions" property', function() { assert(!!intf.functions); } );
    it('should have a "constants" property', function() { assert(!!intf.constants); } );
    it('should have a "classes" property', function() { assert(!!intf.classes); } );
    it('should have found a function "squish::Compress"', function() { assert(!!intf.functions['squish::Compress']); } );
    it('should have found a function "squish::Decompress"', function() { assert(!!intf.functions['squish::Compress']); } );
    it('should have found a constant "squish::kDxt1"', function() { assert(!!intf.constants['squish::kDxt1']); } );
  });
  
});