"use strict";

var cintfdesc = require("./cintfdesc");
var fs        = require("q-io/fs");

// Returning false discard the function
// Returning a string replaces the header string
// What is left after all checkers have been executed is either empty or the return type of the function
var FUNCTION_HEADER_CHECKERS = [
  { pattern: /^EXPORT\b *(.*)$/gm, predicate: function(m) { return m ? m[1] : false; } },
  { pattern: /^((?:.|\n)*)__cdecl *$/gm, predicate: function(m) { if (m) return m[1]; } }
];

var intf_desc = {
  constants: {},
  functions: {}
};

fs.read('./test/lsdisplay2.h')
.then( function(content) {
  // Multiple inclusion guard
  var re = /^#ifndef (\w+)[^\n]*\n#define \1/gm, m;
  if ((m = re.exec(content)) !== null) {
    log('Header redefinition guard symbol:', m[1]);
  }
  else warn('This header file does not appear to have a guard against multiple inclusion');
  
  // #defines (preprocessor constants)
  var re = /^[ \t]*#[ \t]*define *(\b\w+)[ \t]+((.(?!\/\/))*).*$/gm, m;
  log('\nPreprocessor constants:');
  log(  '----------------');
  while ((m = re.exec(content)) !== null) {
    // Filter out definitions that are not constants
    var name  = m[1];
    var value = processConstantDefine(m[2]);
    if (value !== null) { intf_desc.constants[name] = value; /*console.log(name, '=', value);*/ }
  }
  
  // Regular constants
  var re = /^ *(?:static const|const static) +(\b[a-zA-Z]\w+\b) *= *(.*);/gm, m;
  log('\nConstants:');
  log(  '----------');
  while ((m = re.exec(content)) !== null) {
    //console.log( m[1], '=', m[2] );
    intf_desc.constants[m[1]] = m[2].trim();
  }
  
  // TODO: enums
  
  // Function declarations (m[1] = before name, m[2] = name, m[3] = parameters (without parens) )
  // TODO: function trailer (const'ness, new-style return type specification)
  var re = /^(?!#)((?:[ \t\n]*(?:\b(?:\w+)|\*))+)[ \t\n]*(\b\w+)[ \t\n]*\(([^\)]*)\)[ \t\n]*;/gm, m;
  log('\nFunction signatures:');
  log(  '-------------------');
  while ((m = re.exec(content)) !== null) {
    //log(m[1], m[2], '(', m[3], ')');
    var func = processFunction(m[1], m[2], m[3], m[4]);
    if (func !== null) { intf_desc.functions[m[2]] = func; }
  }
  
  log(JSON.stringify(intf_desc, null, '\t'));
  
  //----
  
  function processConstantDefine(expr) {
    var expr = expr.trim();
    var re = /^L?\"[^"]*$/;
    var m = re.exec(expr);
    if (m) return '"' + m[1] + '"';
    var value = parseFloat(expr);
    if (value.toString() !== 'NaN') return value;
    return null;
  }
  
  function processFunction(header, name, param_list, trailer) {
    //console.log(header, '|', name, '|', param_list, '|', trailer);
    // Check the header
    header = header.trim();
    var ok;
    for (var i = 0; i < FUNCTION_HEADER_CHECKERS.length; i ++) {
      var checker = FUNCTION_HEADER_CHECKERS[i];
      var retval;
      // Perform check
      if      (checker.pattern)             { checker.pattern.lastIndex = 0; retval = checker.predicate( checker.pattern.exec(header) ); }
      else if (checker instanceof Function) retval = checker( header );
      // Handle check result
      if      (retval === false)            return null;
      else if (retval === true)             ok = true;
      else if (typeof retval === 'string' ) header = retval;
    }
    header = header.trim();
    var func = new cintfdesc.Function();
    func.retval = cintfdesc.Parameter.parse(header, true);
    return func;
  }
  
});

//----------

function log(msg) {
  console.log.apply(this, arguments);
}

function warn(msg) {
  console.warn.apply(this, arguments);
}