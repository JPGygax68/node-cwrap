"use strict";

/** 

  This module provides a "query" wrapper for namespace descriptors. It allows
  user code to query an Interface and to execute chainable transformations on
  result sets (somewhat similar to jQuery).
  
*/
 
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'underscore', './namespace', './tvparser', './charclasses' ],
function(  _          ,    Namespace ,    TVParser ,    cc           ) {

  //--- Parser --------------------------------------------
  
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
  
  //--- Interface wrapper ---------------------------------
  
  function query(intf) {
  
    function parseSelector(seltor, intf) {
      var parser = new Parser(seltor);
      
      var id = parser.identifier();
      if (id === 'f') {
        var filters = [];
        if (parser.peek() === '.') parser.consume(), filters.push( parseNameFilter()       );
        if (parser.peek() === '(') parser.consume(), filters.push( parseSignatureFilter()  ), parser.consume();
        if (parser.peek() === ':') parser.consume(), filters.push( parseReturnTypeFilter() );
        var filter = andCombineFilters(filters);
        return function() { return _.filter(intf.functions, function(func) { return filter(func); }); };
      }
      else if (id === 'ns') {
        /*
        var filters = [];
        if (parser.peek() === '.') parser.consume(), filters.push( parseNameFilter()      );
        var filter = andCombineFilters(filters);
        //return function() { return _.filter(intf
        */
      }
      else throw new Error('Failed to parse selector "'+seltor+'"');

      //---
      
      function parseNameFilter() {
        var pat = parser.namePattern();
        return function(func) { return func.name.match(pat); };
      }    
     
      function parseSignatureFilter() {
        var parm_descs = [], ending_varargs = false;
        while (parser.peek() !== ')') {
          if (ending_varargs) throw new Error('There can be no more argument descriptors after a "**" placeholder');
          var desc = parseArgDesc();
          parm_descs.push( desc );
          ending_varargs = (desc === '**');
          if (parser.peek() !== ',') break;
          parser.consume();  
        }
        if (parser.peek() !== ')') throw new Error('Cannot parse signature pattern: expected ")", got "'+parser.peek()+'"');
        return function(func) { 
          for (var i = 0; i < parm_descs.length; i++) {
            if (parm_descs[i] === '**') return true; // matches everything, including "no more parameters"
            if (i >= func.parm_list.length) return false;
            if (!checkParam(parm_descs[i], func.parm_list[i])) return false;
          }
          return func.parm_list.length === parm_descs.length;
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
          if      (desc === '*' ) return {};
          else if (desc === '**') return '**';
          var parts = desc.split(':');            
          return { name: parts[0], type: parts[1] };
        }
      }
      
      function parseReturnTypeFilter() {
        //console.log('parseReturnTypeFilter()');
        for (var type = ''; !parser.atEnd(); type += parser.consume());
        if (type === '') return function()     { return true; }
        else             return function(func) { return func.type == type; }
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
    
  } // query()
  
  //--- EXPORTS -------------------------------------------
  
  return query;
});