"use strict";

/** Data model types for C module interfaces.
 */
 
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [  ],
function(  ) {

  /** Module.
   */
  function Module() {
  }
  
  /** Function 
   */
  function CFunction() {
    this.name   = '';
    this.retval = new Type();
    this.params = [];
  }

  /** Parameter class (used for input parameters, output parameters, and return values).
   */
  function Parameter() {
    this.elem_type = '';              /* type of element(s) being passed */
    this.constness = Type.VARIABLE;
    this.access    = Type.BY_VALUE;
  }
  
  /* Const'ness */
  Parameter.VARIABLE   = 0;
  Parameter.CONSTANT   = 1;
  
  /* Access */
  Parameter.BY_VALUE   = 1;
  Parameter.BY_POINTER = 2;
  Parameter.BY_ARRAY   = 3;     // the data is organized in an array (of known/knowable size)
  
  /** Public interface */
  
  return {
    Module   : Module,
    Function : CFunction,
    Parameter: Parameter
  }
  
});