"use strict";

var cintfdesc = require("./cintfdesc");
var fs        = require("q-io/fs");

var constants = {};
var functions = {};

fs.read('./test/lsdisplay2.h')
.then( function(content) {
  // Multiple inclusion guard
  var re = /^#ifndef (\w+)[^\n]*\n#define \1/gm, m;
  if ((m = re.exec(content)) !== null) {
    log('Header redefinition guard symbol:', m[1]);
  }
  else warn('This header file does not appear to have a guard against multiple inclusion');
  
  // Constant #defines
  var re = /^[ \t]*#[ \t]*define *(\b\w+)[ \t]+((.(?!\/\/))*)$/gm, m;
  log('\nConstant defines:');
  log(  '----------------');
  while ((m = re.exec(content)) !== null) {
    // Filter out definitions that are not constants
    var name  = m[1];
    var value = checkConstant(m[2]);
    if (value !== null) { constants[name] = value; console.log(name, '=', value); }
  }
  
  // Function declarations (m[1] = before name, m[2] = name, m[3] = parameters (without parens) )
  var re = /^(?!#)((?:[ \t\n]*\b\w+)(?:[ \t\n]+\b\w+)+)[ \t\n]*(\b\w+)[ \t\n]*\(([^\)]*)\)[ \t\n]*;/gm, m;
  log('\nFunction signatures:');
  log(  '-------------------');
  while ((m = re.exec(content)) !== null) {
    log(m[1], m[2], '(', m[3], ')');
    // TODO: filter the return type
  }
  
  //----
  
  function checkConstant(expr) {
    var expr = expr.trim();
    var re = /^L?\"[^"]*$/;
    var m = re.exec(expr);
    if (m) return '"' + m[1] + '"';
    var value = parseFloat(expr);
    if (value.toString() !== 'NaN') return value;
    return null;
  }
});

//----------

function log(msg) {
  console.log.apply(this, arguments);
}

function warn(msg) {
  console.warn.apply(this, arguments);
}