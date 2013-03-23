"use strict";

/** Template system designed to generate C++ glue code.
 *  Promise'ified
 */
 
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'q-io/fs' ],
function(       fs  ) {
  
  var scanner = /(^[ \t]*){{\$(\b\w+\b)([^}]+)[ \t]*(\n)?}}/gm;
  
  function read(filename) {
    return fs.read(filename)
      .then( function(template) {
        var m;
        while ((m = scanner.exec(template)) !== null) {
          var block = m[1] !== null && m[3] !== null; // if all spaces at beginning and newline at end: (block instead of inline)
          var command = m[2];
          console.log(m[0], 'at:', m.index, 'to:', scanner.lastIndex, 'block:', block, 'command:', command);
        }
        return {}; // TODO
      });
  }
  
  function exec(data) {
  }
  
  return {
    read: read,
    exec: exec
  }
});