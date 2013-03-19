"use strict";

var cintfdesc = require("./cintfdesc");
var fs        = require("q-io/fs");

fs.read('./test/lsdisplay2.h')
.then( function(content) {
  // Multiple inclusion guard
  var re = /^#ifndef (\w+)[^\n]*\n#define \1/gm, m;
  if ((m = re.exec(content)) !== null) {
    log('Header redefinition guard symbol:', m[1]);
  }
  else warn('This header file does not appear to have a guard against multiple inclusion');
  
  // Function declarations
  var re = /^(?!#)((?:[ \t\n]*\w+)(?:[ \t\n]+\w+)+)(\w+)\s*\([^\)]*\) *;/gm, m; //[ \t]*(\w*)[ \t]*\(([^,](?:,[^,)])*\) *;/gm, m;
  while ((m = re.exec(content)) !== null) {
    log('Function signature found:', m[0]);
  }
});

//----------

function log(msg) {
  console.log.apply(this, arguments);
}

function warn(msg) {
  console.warn(msg);
}