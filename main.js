"use strict";

var cintfdesc = require("./cintfdesc");
var fs        = require("q-io/fs");

var FUNCTION_HEADERS = [
  // Only consider functions marked for exportation
  { pattern: /^ *EXPORT\b/gm, predicate: function(matches) { return !!matches; } },
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
  var re = /^ *(?:static const|const static) +(\b[a-zA-Z]\w+\b) *= *(.*);/gm, m; // *(.(?!\/\/))+).*$/gm, m;
  log('\nConstants:');
  log(  '----------');
  while ((m = re.exec(content)) !== null) {
    //console.log( m[1], '=', m[2] );
    intf_desc.constants[m[1]] = m[2].trim();
  }
  
  // TODO: enums
  
  // Function declarations (m[1] = before name, m[2] = name, m[3] = parameters (without parens) )
  // TODO: function trailer (const'ness, new-style return type specification)
  var re = /^(?!#)((?:[ \t\n]*\b\w+)(?:[ \t\n]+\b\w+)+)[ \t\n]*(\b\w+)[ \t\n]*\(([^\)]*)\)[ \t\n]*;/gm, m;
  log('\nFunction signatures:');
  log(  '-------------------');
  while ((m = re.exec(content)) !== null) {
    //log(m[1], m[2], '(', m[3], ')');
    var func = processFunction(m[1], m[2], m[3], m[4]);
    if (func !== null) { intf_desc.functions[m[2]] = func; console.log(m[2], ':', func); }
  }
  
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
    var func = new cintfdesc.Function();
    var header_ok;
    for (var i = 0; i < FUNCTION_HEADERS.length; i ++) {
      var checker = FUNCTION_HEADERS[i];
      var ok;
      if      (checker.pattern)             ok = checker.predicate.call(func, checker.pattern.exec(header) );
      else if (checker instanceof Function) ok = checker( header );
      if      (ok === false) return null;
      else if (ok === true ) header_ok = true;
    }
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