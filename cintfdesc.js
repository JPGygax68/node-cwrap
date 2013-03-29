/** THIS MODULE HAS BEEN SCRAPPED. INCLUDED FOR REFERENCE ONLY.
 *
 *  Though it may be re-activated at a later date, this module is not currently in use,
 *  having been replaced with SWIG.
 *  It represents an attempt (somewhat successful but not complete enough) to extract
 *  an interface model from a C header file using regular expressions.
 */
 
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
  var RE_STRING     = /L?"([^\s\n"])"/;   // match does NOT include quotes!
  var RE_NUMBER     = /([\d.+\-]+)/;      // very approximative, but it should serve
  
  RegExp.concat = function(parts, separator, head, tail) {
    if (separator instanceof RegExp) separator = separator.source;
    if (head      instanceof RegExp) head      = head.source;
    if (tail      instanceof RegExp) tail      = tail.source;
    head = head || '';
    tail = tail || '';
    parts = parts.map(function(el) { return el instanceof RegExp ? el.source : el; });
    var re = new RegExp( head + parts.join(separator) + tail );
    return re;
  }
  
  RegExp.optional = function(expr) {
    if (expr instanceof RegExp) expr = expr.source;
    return new RegExp( '(?:' + expr + ')?' );
  }
  
  RegExp.or = function(pat1, pat2) {
    var list = pat1 instanceof Array ? pat1 : Array.prototype.slice.call(arguments, 0);
    var list = list.map( function(pat) { return pat instanceof RegExp ? pat.source : pat; } );
    return new RegExp( '(?:' + list.join('|') + ')' );
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
  
  /* Access */
  Parameter.BY_VALUE   = 1;
  Parameter.BY_POINTER = 2;
  Parameter.BY_ARRAY   = 3;     // the data is organized in an array (of known/knowable size)
    
  Parameter.parse = (function() {

    var re = RegExp.concat( [ 
        /* 1  : direction */ /(IN|OUT)?/,
        /* 2  : const     */ /(const)?/, 
        /* 3  : type      */ RE_WORD, 
        /* 4  : pointer   */ /(\*)?/,
        /* 5  : name      */ RegExp.optional(RE_WORD),
        /* 6  : size      */ RegExp.optional( RegExp.concat( [/\[/, RE_WORD, /\]/], RE_OPT_WS ) ),
        /* 7/8: default   */ RegExp.optional( RegExp.concat( [ '=', RegExp.or(RE_STRING, RE_NUMBER) ], RE_OPT_WS ) )
      ]
      , RE_OPT_WS, '^', '$' );
    console.log('Param RE:', re);
  
    return function(desc, nameless) {
      //console.log('Parameter.parse('+desc+')');
      var param = new Parameter();
      param.constness = Parameter.CONSTANT;
      var m = re.exec(desc);
      if (!m) throw new Error('Parameter syntax error: failed to parse "'+desc+'", RE: '+ re);
      // Match 1: IN/OUT
      if (m[1] === 'IN' || m[1] === 'OUT') param.direction = m[1];
      // Match 2: const'ness
      if (m[2] === 'const') param.is_const = m[2] === 'const';
      // Match 3: base type
      if (!m[3]) throw new Error('Parameter syntax error: missing base type name');
      param.base_type = m[3];
      // Match 4: pointer access specifier (asterisk)
      if (m[4] === '*') param.access = Parameter.BY_POINTER;
      /* Match 5: name */
      if (m[5]) {
        param.name = m[5];
        // Match 6: array size specifier
        if (typeof m[6] !== 'undefined') {
          if (parseInt(m[6]) !== 0) param.access = Parameter.BY_ARRAY;
          param.size = m[6];
        }
        // Matches 7 or 8: default value
        param.default_value = m[7] || m[8];
      }
      // Default values
      if (!param.access) param.access = Parameter.BY_VALUE;
      // That's all folks
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