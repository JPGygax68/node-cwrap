"use strict";

/** Data model types for C module interfaces.
 */
 
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [  ],
function(  ) {

  //--- Regular expressions ---
  
  var RE_WHITESPACE = /[ \t\n]*/;
  var RE_OPT_WS     = /[ \t\n]*/;
  var RE_WORD       = /(\b\w+\b)/;
  
  RegExp.concat = function(parts, separator, head, tail) {
    if (separator instanceof RegExp) separator = separator.source;
    if (head      instanceof RegExp) head      = head.source;
    if (tail      instanceof RegExp) tail      = tail.source;
    head = head || '';
    tail = tail || '';
    parts = parts.map(function(el) { return el instanceof RegExp ? el.source : el; });
    var re = new RegExp( head + parts.join(separator) + tail );
    console.log('Concat =>', re);
    return re;
  }
  
  RegExp.optional = function(expr) {
    if (expr instanceof RegExp) expr = expr.source;
    return new RegExp( '(?:' + expr + ')?' );
  }
  
  /** Module.
   */
  function Module() {
  }
  
  /** Function 
   */
  function CFunction() {
    this.retval = new Parameter();
    this.params = [];
  }

  /** Parameter class (used for input parameters, output parameters, and return values).
   */
  function Parameter() {
    //this.base_type = '';              /* type of element(s) being passed */
    //this.constness = 0;
    //this.access    = 0;
  }
  
  /* Const'ness */
  Parameter.VARIABLE = 1;
  Parameter.CONSTANT = 2;
  
  /* Access */
  Parameter.BY_VALUE   = 1;
  Parameter.BY_POINTER = 2;
  Parameter.BY_ARRAY   = 3;     // the data is organized in an array (of known/knowable size)
    
  Parameter.parse = (function() {
  
    var re = RegExp.concat( [ 
        /(const)?/, 
        RE_WORD, 
        /(\*)?/,
        RegExp.optional(RE_WORD),
        RegExp.optional( RegExp.concat( [/\[/, RE_WORD, /\]/], RE_OPT_WS ) )
      ]
      , RE_OPT_WS, '^', '$' );
  
    return function(desc, nameless) {
      console.log('Parameter.parse('+desc+')');
      var param = new Parameter();
      param.constness = Parameter.CONSTANT;
      var m = re.exec(desc);
      if (!m) throw new Error('Parameter syntax error: failed to parse "'+desc+'"');
      if (m[1] === 'const') param.constness = Parameter.CONSTANT;
      if (!m[2]) throw new Error('Parameter syntax error: missing base type name');
      param.base_type = m[2];
      if (m[3] === '*') param.access = Parameter.BY_POINTER;
      if (typeof m[4] !== 'undefined') {
        if (parseInt(m[4]) !== 0) param.access = BY_ARRAY;
        param.size = m[4];
      }
      return param;
    }
  }) ();

  Parameter.prototype.toString = function() {
    var parts = [];
    if (this.constness === Parameter.CONSTANT) parts.push('const');
    parts.push(this.elem_type);
    parts.push(this.name);
    if      (this.access === Parameter.BY_ARRAY  ) parts.push('[' + parts.size + ']');
    else if (this.access === Parameter.BY_POINTER) parts.push('*');
    return parts.join(' ');
  }
  
  /** Public interface */
  
  return {
    Module   : Module,
    Function : CFunction,
    Parameter: Parameter
  }
  
});