"use strict";

/** Defines the Type class, which is used to describe C/C++ types using the SWIG conventions.
 */
 
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [],
function() {

  //--- Type: augmented array for type construction/manipulation/querying ---
  
  function Type(arg) { 
    Array.call(this); 
    if      (arg instanceof Type    ) arg.each( function(el) { this.push(el.clone()); } );
    else if (arg instanceof Operator) Array.prototype.push.call(this, arg);
    else                              Array.prototype.push.call(this, new Operator(undefined, arg.toString()) );
  }
  
  Type.prototype = new Array();
  
  Type.prototype.toString = function() {
    return this.map( function(op) { return op.toString(); } ).join('.'); 
    //return this.join('.');
  }
  
  // Construction
  
  Type.prototype.addPointer       = function()            { this.unshift( new Operator('p'       ) ); }
  Type.prototype.addQualifier     = function(value)       { this.unshift( new Operator('q', value) ); }
  Type.prototype.addMemberPointer = function(cls)         { this.unshift( new Operator('m', cls  ) ); }
  Type.prototype.addReference     = function()            { this.unshift( new Operator('r'       ) ); }
  Type.prototype.addArray         = function(size)        { this.unshift( new operator('a', size ) ); }
  Type.prototype.delPointer       = function()            { checkPointer(); removeQualifiers(this); this.shift(); }
  Type.prototype.delArray         = function()            { checkArray(); removeQualifiers(); this.shift(); }
  Type.prototype.arrayNDim        = function()            { for (var i = skipQualifiers(this), n = 0; this[i+n] && this[i+n].type === 'a'; n++); return n; }
  Type.prototype.getArrayDim      = function(n)           { var i = checkHasNthDim(this, n); return this[i+n].size; }
  Type.prototype.setArrayDim      = function(n, size)     { var i = checkHasNthDim(this, n); this[i+n].size = size; }
  //Type.prototype.addFunction      = function(type, parms) { }
  //Type.prototype.addTemplate ...
  Type.prototype.pop              = function()            { return new Type(this.shift()); }
  Type.prototype.push             = function(other)       { this.unshift( other.shift() ); }
  Type.prototype.popArrays        = function()            { for (var i = 0; i < this.length && this[i].type === 'q' || this[i].type === 'a'; i ++);
                                                            if (i >= 0) return new Type(this.slice(0, i)); }
  Type.prototype.popFunction      = function()            { var i = skipQualifiers(this);
                                                            if (i >= this.length) throw new Error('Type "'+this+'" is not a function');
                                                            return new Type(this.slice(0, i)); }
  Type.prototype.base             = function()            { for (var i = this.length -1; i > 0 && this[--i].type === 'q'; ); 
                                                            if (i >= 0) return new Type(this.slice(i)); }
  
  // Tests
  
  Type.prototype.isSimple        = function() { return ! this[skipQualifiers(this)].type; }
  Type.prototype.isPointer       = function() { return this[skipQualifiers(this)].type === 'p'; }
  Type.prototype.isMemberPointer = function() { return this[skipQualifiers(this)].type === 'm'; }
  Type.prototype.isReference     = function() { return this[skipQualifiers(this)].type === 'r'; }
  Type.prototype.isArray         = function() { return this[skipQualifiers(this)].type === 'a'; }
  Type.prototype.isFunction      = function() { return this[skipQualifiers(this)].type === 'f'; }
  Type.prototype.isQualifier     = function() { return this[0                   ].type === 'q'; }
  Type.prototype.isTemplatized   = function() { return this[skipQualifiers(this)].value.match(/^\w+<[^>]*>$/); }
  Type.prototype.isConst         = function() { return checkAllQualifiers(this, 'const'); }

  // Operator class
  
  function Operator(type, value) { this.type = type; this.value = value; }
  
  Operator.prototype.toString = function() { 
    //console.log('Operator.toString()', this);
    if      (typeof this.type  === 'undefined') return this.value; // simple type
    else if (typeof this.value !== 'undefined') return this.type + '(' + this.value + ')';
    else                                        return this.type;
  }
  
  // Internal helper functions
  
  function checkPointer(type) { if (type[skipQualifiers(type)].type !== 'p') throw new Error('Type "'+type+'" is not a pointer'); }  
  function checkArray  (type) { if (type[skipQualifiers(type)].type !== 'a') throw new Error('Type "'+type+'" is not an array' ); }
  
  function removeQualifiers(type) { while (type[0].type === 'q') type.shift(); }
  
  function checkAllQualifiers(type, value) {
    for (var i = 0; i < type.length && type[i].type === 'q'; i++) if (type[i].value === value) return true; 
    return false;
  }
  
  function checkHasNthDim(type, n) {
    var i = skipQualifiers(type);
    if (!(type[i+n] && type[i+n].type === 'a')) throw new Error('Type "'+type+'" is not an array or has fewer than '+(n+1)+' dimensions');
    return i;
  }
  
  function skipQualifiers(type) { 
    for (var i = 0; ; i ++) {
      if (i >= type.length  ) throw new Error('Type "'+type+'" is empty or consists of qualifiers only');
      if (type[i].type !== 'q') break;
    }
    return i;
  }
  
  function popOperator(type, op_type) {
    var new_type = new Type(), op;
    while ((op = type.shift())[0] === 'q') new_type.addQualifier(op.type);
    if (op[0] !== op_type) throw new Error('Cannot pop, not the correct type: expected "'+op_type+'", got "'+op+'"');
  }
  
  //--- EXPORT ---
  
  return Type;
});
