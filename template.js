"use strict";

/** Template system designed to generate C++ glue code.
 *  Promise'ified
 */
 
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'q-io/fs', 'underscore' ],
function(       fs ,  _           ) {

  //--- Hierarchy of template elements clases ("Blocks") ---
  
  function Block() {}
  
  Block.prototype.execute = function(context, source, emitter) { throw new Error('Block.execute() method must be overridden'); }
  
  function Text(start, end) {  
    this.start = start; this.end = end;
  }
  Text.prototype = new Block();
  Text.prototype.constructor = Text;
  Text.prototype.execute = function(context, source, emitter) { emitter(source.slice(this.start, this.end)); }
  
  function Placeholder(path) {
    this.path = path; // TODO: parse
  }
  Placeholder.prototype = new Block();
  Placeholder.prototype.constructor = Placeholder;
  Placeholder.prototype.execute = function(context, source, emitter) { 
    this.path.split('.').forEach( function(key) { context = context[key]; } );
    emitter(context);
  }
  
  function Structure() { this.children = []; }
  Structure.prototype = new Block();
  Structure.prototype.constructor = Structure;
  Structure.prototype.execute = function(context, source, emitter) { 
    // This implementation can be used 1:1 by root block
    this.children.forEach( function(child) { child.execute(context, source, emitter); } );
  }
  
  function Repeater(set) {
    Structure.call(this);
    this.set = set; // TODO: parse
  }
  Repeater.prototype = new Structure();
  Repeater.prototype.constructor = Repeater;
  Repeater.prototype.execute = function(context, source, emitter) {
    this.set.split('.').forEach( function(key) { context = context[key]; } );
    //console.log('Repeater outer context:', context);
    _.each(context, function(ctx, key) { 
      //console.log('Repeater inner context:', ctx, '(key = '+key+')');
      Structure.prototype.execute.call(this, ctx, source, emitter); 
    }, this);
  }
  
  function Conditional(condition) {
    Structure.call(this);
    this.branches = [];
    this.newBranch(condition);
  }
  Conditional.prototype = new Structure();
  Conditional.prototype.constructor = Conditional;
  Conditional.prototype.newBranch = function(condition) {
    // TODO: check for proper sequence if .. elsif .. else
    if (condition.length > 0) {
      var code = 'return (' + condition.replace(/(\b(\w+)\b)/, 'context.$1') + ');'; // TODO: prevent this in string constants
      //console.log('condition:', code);
      var condEval = Function('context', code);
    }
    else {
      var condEval = Function('return true;');
    }
    this.branches.push( {condEval: condEval, first_block: this.children.length } );
  }
  Conditional.prototype.execute = function(context, source, emitter) {
    //throw new Error('Conditional.execute() NOT IMPLEMENTED'); 
    for (var i = 0; i < this.branches.length; i++) {
      var branch = this.branches[i];
      //console.log('Conditional context:', context);
      if (branch.condEval(context)) {
        var to_block = i < (this.branches.length-1) ? this.branches[i+1].first_block : this.children.length;
        for (var j = branch.first_block; j < to_block; j++) {
          var block = this.children[j];
          block.execute(context, source, emitter);
        }
        break; // first if / elsif (or else) wins
      }
    }
  }
  
  function JSList(list) { this.list = list; }
  JSList.prototype = new Structure();
  JSList.prototype.constructor = JSList;
  JSList.prototype.execute = function(context, source, emitter) { throw new Error('JSList.execute() NOT IMPLEMENTED'); }
  JSList.prototype.execute = function(context, source, emitter) { 
    // TODO: provisional dummy implementation
    emitter('<<JSLIST>>');
  }
  
  //--- MAIN CLASS ---
  
  //          -->          <--- block/inline discrimination
  //                    -->    <--- introducer: {{$
  //                       --->           <--- command
  //                                  --->       <--- parameters
  //                                         --->  >--- terminator: }}
  //                                           --->     <--- optional newline
  var scanner = /(^[ \t]*)?{{\$(\b\w+\b|=)([^}]*)}}(\n)?/gm;
  
  function Template(code) {

    this.code = code;
    
    var stack = [ new Structure() ];
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
  }
  
  Template.read = function(filename) {
    return fs.read(filename)
      .then( function(code) { return new Template(code); } );
  }
  
  Template.prototype.exec = function(data) {
  
    this.root_block.execute(data, this.code, emit);
    
    function emit(text) { process.stdout.write(text); }
  }
  
  return Template;
});