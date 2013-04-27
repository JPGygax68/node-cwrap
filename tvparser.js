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
  
  TrivialParser.prototype.atEnd = function()  { return this.index >= this.source.length; }
  
  TrivialParser.prototype.peek  = function() { if (!this.atEnd()) return this.source[this.index]; }
  
  TrivialParser.prototype.consume = function() {
    if (this.atEnd()) throw new Error('TrivialParser.consume(): trying to consume past end of input');
    var ch = this.source[this.index++];
    return ch;
  }
  
  TrivialParser.prototype.identifier = function() {
    if (cc.isAlpha(this.peek())) {
      var id = '';
      while (cc.isAlnum(this.peek())) { id += this.consume(); }
      return id;
    }
  }
  
  return TrivialParser;
});