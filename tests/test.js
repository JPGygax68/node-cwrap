var assert = require('assert');
var cwrap  = require('../cwrap');

describe('Testing with squish library; ', function() {
  
  var intf;

  before( function(done) {
    this.timeout(10000);
    cwrap.parse('./tests/squish-1.11/squish.h')
      .then( function(intf_) { intf = intf_; done(); } );
  });
  
  /*
  describe('Interface object', function() {
    it('should have a "functions" property', function() { assert(!!intf.functions); } );
    it('should have a "constants" property', function() { assert(!!intf.constants); } );
    it('should have a "classes" property', function() { assert(!!intf.classes); } );
    
    var squish;
    it('should have a namespace "squish"', function() { assert( (squish = intf.namespaces['squish']) ); } );
    it('namespace "squish" has a function "Compress"', function() { assert( squish.functions['Compress'] ); } );
    it('namespace "squish" has a function "Decompress"', function() { assert( squish.functions['Decompress'] ); } );
    it('namespace "squish" has a constant "kDxt1"', function() { assert( squish.constants['kDxt1'] ); } );
  });
  */

  describe('Namespace', function() {
    var squish;
    describe('#namespace[]', function() {
      it('gives access to namespace objects by string index', function() { assert( typeof (squish = intf.namespace['squish']) === 'object' ); });
    });
    describe('#_lookupTypedef', function() {
      it('correctly looks up definition of squish::u8', function() { assert.equal( intf._lookupTypedef('squish::u8'), 'unsigned char' ); } );
      it('squish child namespace correctly looks up "u8"', function() { assert.equal( squish._lookupTypedef('u8'), 'unsigned char' ); } );
    });
    describe('#functions()', function() {
      it('returns all functions as an array', function() { assert( squish.functions().length > 0 ); } );
      it('can filter functions by name', function() { assert.equal( squish.functions('Compress').length, 1 ); } );
      it('can filter functions by return type', function() { assert.equal( squish.functions(':void').length, 5 ); } );
      it('can filter functions by argument name', function() { assert.equal( squish.functions('(rgba,**)').length, 5 ); } );
      it('can filter functions by argument type', function() { assert.equal( squish.functions('(:p.u8,**)').length, 3 ); } );
    });
  });  
});