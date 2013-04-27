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
        if (parser.peek() === '.') parser.consume(), filters.push( makeNameFilter()      );
        if (parser.peek() === '(') parser.consume(), filters.push( makeSignatureFilter() ), parser.consume;
        var filter = andCombineFilters(filters);
        return function() { return _.filter(intf.functions, function(func) { return filter(func); }); };
      }
      else throw new Error('Failed to parse selector "'+seltor+'"');

      //---
      
      function makeNameFilter() {
        var pat = parser.namePattern();
        return function(func) { return func.name.match(pat); };
      }    
     
      function makeSignatureFilter() {
        var parm_descs = [];
        while (parser.peek() !== ')') {
          parm_descs.push( parseArgDesc() );
          if (parser.peek() !== ',') break; else parser.consume();          
        }
        if (parser.peek() !== ')') throw new Error('Cannot parse signature pattern: expected ")", got "'+parser.peek()+'"');
        return function(func) { 
          if (func.parm_list.length !== parm_descs.length) return false; // TODO: varargs!
          for (var i = 0; i < func.parm_list.length; i++) if (!checkParam(parm_descs[i], func.parm_list[i])) return false;
          return true;
          //------
          function checkParam(desc, parm) {
            if (desc.name && desc.name !== parm.name) return false;
            if (desc.type && desc.type !=  parm.type) return false;
            return true;
          }
        };
        
        //------
        function parseArgDesc() {
          for (var desc = '', parens_level = 0; !(parens_level === 0 && parser.peek() === ')') && parser.peek() !== ','; desc += parser.consume()) {
            if      (parser.peek() === '(') parens_level ++;
            else if (parser.peek() === ')') parens_level --;
          }
          //console.log('desc:', desc);
          if (desc === '*') return {};
          var parts = desc.split(':');            
          return { name: parts[0], type: parts[1] };
        }
      }
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