"use strict";

/** Template system designed to generate C++ glue code.
 *  Promise'ified
 */
 
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'q-io/fs' ],
function(       fs  ) {
  //          -->          <--- block/inline discrimination
  //                    -->    <--- introducer: {{$
  //                       --->           <--- command
  //                                  --->       <--- parameters
  //                                         --->  >--- terminator: }}
  //                                           --->     <--- optional newline
  var scanner = /(^[ \t]*)?{{\$(\b\w+\b|=)([^}]*)}}(\n)?/gm;
  
  function Template(code) {

    this.code = code;
    
    var stack = [ { children: [] } ];
    var top = stack[0];
    var m;
    while ((m = scanner.exec(code)) !== null) {
      var inline  = !(m[1] !== null && m[3] !== null);
      var command = m[2], params = m[3];
      // TODO: command parameters
      //console.log(stack.length, '"'+m[0]+'"', '"'+m[1]+'"', '"'+m[2]+'"', '"'+m[3]+'"' );
      if      (command === 'if'     ) beginBlock    ( m.index, scanner.lastIndex, command, params );
      else if (command === 'forall' ) beginBlock    ( m.index, scanner.lastIndex, command, params );
      else if (command === 'foreach') beginBlock    ( m.index, scanner.lastIndex, command, params );
      else if (command === 'else'   ) splitBlock    ( m.index, scanner.lastIndex, command, params );
      else if (command === '='      ) addPlaceholder( m.index, scanner.lastIndex, command, params );
      else if (command === 'list'   ) addPlaceholder( m.index, scanner.lastIndex, command, params );
      else if (command === 'end'    ) endBlock      ( m.index, scanner.lastIndex );
      else throw new Error('Unrecognized template command "'+command+'"');
    }
    //console.log( JSON.stringify(stack[0], null, "    ") );
    if (stack.length !== 1) throw new Error('Opening/closing tag inbalance');
    this.blocks = top.children;
    
    function beginBlock(outer, inner, command, params) {
      var block = { command: command, params: params, outer_start: outer, inner_start: inner, children: [] };
      top.children.push( block );
      top = block;
      stack.push(top);
    }
    
    function splitBlock(outer, inner, command, params) {
      endBlock  (outer, inner);
      beginBlock(outer, inner, command, params);
    }
    
    function endBlock(outer, inner) {
      top.inner_end = inner; top.outer_end = outer;
      stack.pop();
      top = stack[stack.length-1];
    }
    
    function addPlaceholder(start, end, command, params) {
      var block = { command: command, params: params, outer_start: start, inner_start: start, inner_end: end, outer_end: end };
      top.children.push( block );
    }
  }
  
  Template.read = function(filename) {
    return fs.read(filename)
      .then( function(code) { return new Template(code) } );
  }
  
  Template.prototype.exec = function(data) {
  
    //console.log( JSON.stringify(this.blocks, null, "    ") );
    
    var self = this;
    
    execBlock(null, null, 0, this.code.length, this.blocks );
    
    function execBlock(command, params, start, end, blocks) {
      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        emitBlock(block);
      }
    }
    
    function emitBlock(block) {
      if (block.inner_start < block.inner_end) {
        console.log('--->');
        console.log( self.code.slice(block.inner_start, block.inner_end) );
        console.log('<---');
      }
    }
  }
  
  return Template;
});