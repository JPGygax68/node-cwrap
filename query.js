"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'underscore', './interface', './tvparser', './charclasses' ],
function(  _          ,    Interface ,    TVParser ,    cc           ) {

  function Parser() { TVParser.apply(this, arguments); }
  
  Parser.prototype = new TVParser();
  
  Parser.prototype.pattern = function() {
    var pat = '';
    while (!this.atEnd()) {
      if      (cc.isAlnum(this.peek())) pat += this.consume();
      else if (this.peek() === '*'    ) this.consume(), pat += '.*';
      else                              break;
    }
    //console.log('regexp: ', pat);
    return new RegExp('^'+pat+'$');
  }
  
  
  function query(intf) {
  
    function parseSelector(seltor, intf) {
      var parser = new Parser(seltor);
      
      var id = parser.identifier();
      if (id === 'f') {
        var name_pat;
        if (parser.peek() === '.') parser.consume(), name_pat = parser.pattern();
        if (name_pat) return function() { return _.filter(intf.functions, function(fn) { return fn.name.match(name_pat); } ); };
        else          return function() { return intf.functions; };
      }
      else throw new Error('Failed to parse selector "'+seltor+'"');
    }
  
    var fn = function(seltor) {
      return parseSelector(seltor, intf)();
    };
    
    fn.intf = intf;
    
    return fn;
  }
  
  return query;
});