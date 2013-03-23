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
      
        var stack = [ { children: [] } ];
        var top = stack[0];
        var m;
        while ((m = scanner.exec(template)) !== null) {
          var inline = ! (m[1] !== null && m[3] !== null);
          var command = m[2];
          if (command !== 'end') beginBlock( m.index, scanner.lastIndex, command );
          else                   endBlock  ( m.index, scanner.lastIndex );
        }
        console.log( JSON.stringify(stack[0], null, "    ") );
        return stack[0];
        
        function beginBlock(outer, inner, command) {
          var block = { outer_start: outer, inner_start: inner, children: [], command: command };
          top.children.push( block );
          top = block;
          stack.push(top);
        }
        
        function endBlock(outer, inner) {
          top.inner_end = inner; top.outer_end = outer;
          stack.pop();
          top = stack[stack.length-1];
        }
      });
  }
  
  function exec(data) {
  }
  
  return {
    read: read,
    exec: exec
  }
});