"use strict";

/** Defines the Type class, which is used to describe C/C++ types using the SWIG conventions.
 */
 
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [],
function() {

  //--- Type: augmented array for type construction/manipulation/querying ---
  
  function Type(arg) { 
    Array.call(this); 
    if      (arg instanceof Type    ) Type.call(this, arg.toString());
    //else if (arg instanceof Operator) Array.prototype.push.call(this, arg);
    // TODO: the following will not work with varargs (encoded "v(...)" by SWIG)!!
    else if (typeof arg === 'string') {
      var ops = [];
      for (var i = 0, ilast = 0, nesting = 0; i < arg.length; i ++) {
        if      (arg[i] === '('                 ) nesting ++;
        else if (arg[i] === ')'                 ) nesting --;
        else if (nesting === 0 && arg[i] === '.') Array.prototype.push.call(this, arg.slice(ilast, i)), ilast = i + 1;
      }
      Array.prototype.push.call(this, arg.slice(ilast));
    }
  }
  
  Type.prototype = new Array();
  
  Type.prototype.clone = function(from) {
    if (from) return new Type(this.slice(from).toString());
    else      return new Type(this.toString());
  }
  
  Type.prototype.toString = function() {
    return this.map( function(op) { return op.toString(); } ).join('.'); 
    //return this.join('.');
  }
  
  // Construction
  
  Type.prototype.addPointer       = function()            { this.unshift( 'p'            ); }
  Type.prototype.addQualifier     = function(value)       { this.unshift( 'q('+value+')' ); }
  Type.prototype.addMemberPointer = function(cls)         { this.unshift( 'm('+cls  +')' ); }
  Type.prototype.addReference     = function()            { this.unshift( 'r'            ); }
  Type.prototype.addArray         = function(size)        { this.unshift( 'a('+size +')' ); }
  Type.prototype.delPointer       = function()            { checkPointer(); popQualifiers(this); this.shift(); }
  Type.prototype.delArray         = function()            { checkArray(); popQualifiers(this); this.shift(); }
  Type.prototype.arrayNDim        = function()            { for (var i = skipQualifiers(this), n = 0; this[i+n] && this[i+n].match(/^a\(/); n++); return n; }
  Type.prototype.getArrayDim      = function(n)           { var i = checkHasNthDim(this, n); return this[i+n].size; }
  Type.prototype.setArrayDim      = function(n, size)     { var i = checkHasNthDim(this, n); this[i+n].size = size; }
  //Type.prototype.addFunction      = function(kind, parms) { }
  //Type.prototype.addTemplate ...
  Type.prototype.pop              = function()            { return new Type(this.shift()); }
  Type.prototype.popFunction      = function()            { return popOperator(this, /^f\(/); } 
  Type.prototype.push             = function(other)       { this.unshift( other.shift() ); }
  Type.prototype.popQualifiers    = function()            { popQualifiers(this); return this; }
  
  Type.prototype.popArrays = function() { 
    for (var i = skipQualifiers(this); i < this.length && this[i].match(/^a\b/); i = skipQualifiers(this, i+1));
    if (i > 0 && this[i-1].match(/^a\(/)) {
      var popped = new Type();
      for (; i > 0; i --) popped.push( this.shift() );
      return popped;
    }
  }
  
  Type.prototype.base = function() { 
    for (var i = this.length -1; i > 0 && this[--i].kind === 'q'; );  
    return new Type(this.slice(i)); 
  }

  // Tests
  
  Type.prototype.isSimple        = function() { return ! this[skipQualifiers(this)].match(/^[\w ]+$/); }
  Type.prototype.isPointer       = function() { return !!this[skipQualifiers(this)].match(/^p$/ ); }
  Type.prototype.isMemberPointer = function() { return !!this[skipQualifiers(this)].match(/^m\(/); }
  Type.prototype.isReference     = function() { return !!this[skipQualifiers(this)].match(/^r$/ ); }
  Type.prototype.isArray         = function() { return !!this[skipQualifiers(this)].match(/^a\(/); }
  Type.prototype.isFunction      = function() { return !!this[skipQualifiers(this)].match(/^f\(/); }
  Type.prototype.isQualifier     = function() { return !!this[0                   ].match(/^q\(/); }
  Type.prototype.isTemplatized   = function() { return !!this[skipQualifiers(this)].match(/^\w+<[^>]*>$/); }
  Type.prototype.isConst         = function() { return checkAllQualifiers(this, 'const'); }

  // Misc
  
  // TODO: this is rudimentary, not a complete solution!
  
  Type.prototype.toC = function() {
    // Convert type descriptor back to C/++ type specification
    var parts = [];
    var pointer = false;
    this.forEach( function(op, i) {
      if      (op    == 'p'   ) pointer = true;
      else if (op    == 'a(1)') pointer = true;
      else if (op[0] == 'q'   ) parts.push( op.slice(2, op.length-1) );
      else {
        parts.push(op);
        if (pointer) parts.push('*');
        pointer = false;
      }
    });
    return parts.join(' ');
  }
  
  // Internal helper functions
  
  function checkPointer(type)  { if (!type.isPointer()) throw new Error('Type "'+type+'" is not a pointer'); }  
  function checkArray  (type)  { if (!type.isArray()  ) throw new Error('Type "'+type+'" is not an array' ); }
  
  function popQualifiers(type) { while (type.isQualifier()) type.shift(); }
  
  function checkAllQualifiers(type, value) {
    for (var i = 0; i < type.length && type[i].match(/^q\(/); i++) if (type[i].slice(2, -1) === value) return true; 
    return false;
  }
  
  function checkHasNthDim(type, n) {
    var i = skipQualifiers(type);
    if (!(type[i+n] && type[i+n].match(/^a\(/))) throw new Error('Type "'+type+'" is not an array or has fewer than '+(n+1)+' dimensions');
    return i;
  }
  
  function skipQualifiers(type, start) { 
    start = start || 0;
    for (var i = start; ; i ++) {
      if (i >= type.length  ) throw new Error('Type "'+type+'" is empty or consists of qualifiers only');
      if (!type[i].match(/^q\(/)) break;
    }
    return i;
  }
  
  function popOperator(type, pattern) {
    var new_type = new Type(), op, m;
    while ((m = (op = type.shift()).exec(/^q\(([^\)]+)\)$/))) new_type.addQualifier(m[1]);
    if (!op.match(pattern)) throw new Error('Cannot pop, not the correct type: expected "'+op_type+'", got "'+op+'"');
  }
  
  //--- EXPORT ---
  
  return Type;
});
