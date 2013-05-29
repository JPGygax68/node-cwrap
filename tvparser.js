"use strict";

/**
    Trivial parser for your basic, hand-coded parsing needs.
 */
 
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( ['./charclasses'],
function(   cc          ) {

  function TrivialParser(s) {
    this.source = s;
    this.index  = 0;
  }
  
  TrivialParser.prototype.atEnd = function() { return this.index >= this.source.length; }
  
  TrivialParser.prototype.peek  = function(n) { n = n || 1; if (!this.atEnd()) return this.source.slice(this.index, this.index+n); }
  
  TrivialParser.prototype.consume = function(n) {
    if (this.atEnd()) throw new Error('TrivialParser.consume(): trying to consume past end of input');
    n = n || 1;
    var ch = this.source.slice(this.index, this.index+n);
    this.index += n;
    return ch;
  }
  
  TrivialParser.prototype.identifier = function() {
    if (cc.isAlpha(this.peek())) {
      var id = '';
      while (this.peek() !== undefined && cc.isAlnum(this.peek())) { id += this.consume(); }
      return id;
    }
  }
  
  return TrivialParser;
});