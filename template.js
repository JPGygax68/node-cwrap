"use strict";

/** Template system designed to generate C++ glue code.
 *  Promise'ified
 */
 
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'q-io/fs' ],
function(       fs  ) {

  //--- Hierarchy of template elements clases ("Blocks") ---
  
  function Block() {}
  
  function Text(start, end) {  
    this.start = start; this.end = end;
  }
  Text.prototype = new Block();
  Text.prototype.constructor = Text;
  
  function Placeholder(path) {
    this.path = path; // TODO: parse
  }
  Placeholder.prototype = new Block();
  Placeholder.prototype.constructor = Placeholder;
  
  function Structure() { this.children = []; }
  Structure.prototype = new Block();
  Structure.prototype.constructor = Structure;
  
  function Repeater(set) {
    Structure.call(this);
    this.set = set; // TODO: parse
  }
  Repeater.prototype = new Structure();
  Repeater.prototype.constructor = Repeater;
  
  function Conditional(condition) {
    Structure.call(this);
    this.branches = [];
    this.newBranch(condition);
  }
  Conditional.prototype = new Structure();
  Conditional.prototype.constructor = Conditional;
  Conditional.prototype.newBranch = function(condition) {
    this.branches.push( {condition: condition, first_block: this.children.length } );
  }
  
  function JSList(list) { this.list = list; }
  JSList.prototype = new Structure();
  JSList.prototype.constructor = JSList;
  
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
    function current()       { return stack[stack.length-1]; }
    function addChild(child) { current().children.push(child); return child; }
    
    var m;
    var pos = 0;
    while ((m = scanner.exec(code)) !== null) {
      var inline  = !(m[1] !== null && m[3] !== null);
      var command = m[2], params = m[3].trim();
      // Text between last marked position and beginning of tag becomes new child (text) block
      current().children.push( new Text(pos, m.index) );
      // Tag type dependent actions
      if      (command === '='      ) addChild( new Placeholder(params) );
      else if (command === 'if'     ) stack.push( addChild(new Conditional(params)) );
      else if (command === 'foreach') stack.push( addChild(new Repeater   (params)) );
      else if (command === 'forall' ) stack.push( addChild(new Repeater   (params)) );
      else if (command === 'elsif'  ) current().newBranch(params);
      else if (command === 'else'   ) current().newBranch(params);
      else if (command === 'end'    ) stack.pop();
      else if (command === 'list'   ) addChild( new JSList(params) );
      else                            throw new Error('Unrecognized template command "'+command+'"');
      // Advance
      pos = scanner.lastIndex;
    }
    // Add last block of text
    addChild( new Text(pos, code.length) );
    // Done!
    if (stack.length !== 1) throw new Error('Opening/closing tag inbalance');
    this.root_block = stack[0];
    //console.log( JSON.stringify(stack[0], null, "    ") );

    //---------
    
    function beginBlock(start, end, command, params) {
      var block = { command: command, params: params, outer_start: start, inner_start: end, children: [] };
      top.children.push( block );
      top = block;
      stack.push(top);
    }
    
    function nextBlock(start, end, command, params) {
      endBlock  (start, end);
      beginBlock(start, end, command, params);
    }
    
    function endBlock(start, end) {
      top.inner_end = start; top.outer_end = end;
      stack.pop();
      top = stack[stack.length-1];
    }
    
    function addPlaceholder(start, end, command, params) {
      // Placeholders don't have inner start or end (no "content")
      var block = { command: command, params: params, outer_start: start, outer_end: end };
      top.children.push( block );
    }
  }
  
  Template.read = function(filename) {
    return fs.read(filename)
      .then( function(code) { return new Template(code); } );
  }
  
  Template.prototype.exec = function(data) {
  
    console.log( JSON.stringify(this.root_block, null, "    ") );
    return;
    
    var self = this;
    
    console.log(this.root_block);
    execBlock(this.root_block);
    
    function execBlock(block) {
      if (typeof block.inner_start === 'number') {
        var pos = block.inner_start;
        if (block.children && block.children.length > 0) {
          if (block.inner_start < block.children[0].outer_start) emit('<start>'+self.code.slice(block.inner_start, block.children[0].outer_start));
          for (var i = 0; i < block.children.length; i++) {
            var child = block.children[i];
            execBlock(child);
            pos = child.outer_end;
          }
          if (pos < block.inner_end) emit('<end>'+self.code.slice(pos, block.inner_end));
        }
        else {
          emit('<'+block.command+'>'+self.code.slice(block.inner_start, block.inner_end));
        }
      }
      else {
        emit('<PLACEHOLDER>');
      }
      
      function emit(text) { process.stdout.write(text); }
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