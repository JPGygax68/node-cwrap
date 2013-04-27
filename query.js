"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'underscore', './interface', './tvparser', './charclasses' ],
function(  _          ,    Interface ,    TVParser ,    cc           ) {

  function Parser() { TVParser.apply(this, arguments); }
  
  Parser.prototype = new TVParser();
  
  Parser.prototype.namePattern = function() {
    var pat = '';
    while (!this.atEnd()) {
      if      (cc.isAlnum(this.peek())) pat += this.consume();
      else if (this.peek() === '*'    ) this.consume(), pat += '(.*)';
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
        var filters = [];
        if (parser.peek() === '.') {
          parser.consume();
          var pat = parser.namePattern();
          filters.push( function(func) { return func.name.match(pat); } );
        }
        var filter = andCombineFilters(filters);
        return function() { return _.filter(intf.functions, function(func) { return filter(func); }); };
      }
      else throw new Error('Failed to parse selector "'+seltor+'"');
    }
  
    var fn = function(seltor) {
      return parseSelector(seltor, intf)();
    };
    
    fn.intf = intf;
    
    return fn;
    
    //---
    
    function andCombineFilters(filters) {
      return function(el) { for (var i = 0; i < filters.length; i ++) if (!filters[i](el)) return false; return true; };
    }
  }
  
  return query;
});