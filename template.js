"use strict";

/** Template system designed to generate C++ glue code.
 *  Promise'ified
 */
 
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'q-io/fs', 'underscore' ],
function(       fs ,  _           ) {

  //--- Hierarchy of template elements clases ("Blocks") ---
  
  function Block() {}
  
  Block.prototype.execute = function(data, source, emitter) { throw new Error('Block.execute() method must be overridden'); }
  
  function Text(start, end) {  
    this.start = start; this.end = end;
  }
  Text.prototype = new Block();
  Text.prototype.constructor = Text;
  Text.prototype.execute = function(data, source, emitter) { emitter(source.slice(this.start, this.end)); }
  
  function Placeholder(expr) {
    this.exprEval = buildExpressionEvaluator(expr);
  }
  Placeholder.prototype = new Block();
  Placeholder.prototype.constructor = Placeholder;
  Placeholder.prototype.execute = function(data, source, emitter) { 
    //console.log('Placeholder data:', data);
    emitter(this.exprEval(data, context).toString() );
  }
  
  function Structure() { this.children = []; }
  Structure.prototype = new Block();
  Structure.prototype.constructor = Structure;
  Structure.prototype.execute = function(data, source, emitter) { 
    // This implementation can be used 1:1 by root block
    this.children.forEach( function(child) { child.execute(data, source, emitter); } );
  }
  
  function Repeater(set) {
    Structure.call(this);
    this.set = set; // TODO: parse
  }
  Repeater.prototype = new Structure();
  Repeater.prototype.constructor = Repeater;
  Repeater.prototype.execute = function(data, source, emitter) {
    this.set.split('.').forEach( function(key) { data = data[key]; } );
    //console.log('Repeater outer data:', data);
    _.each(data, function(data_item, key) { 
      //console.log('Repeater inner data:', data_item, '(key = '+key+')');
      Structure.prototype.execute.call(this, data_item, source, emitter); 
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
      var condEval = buildExpressionEvaluator(condition);
    }
    else {
      var condEval = new Function('return true;');
    }
    this.branches.push( {condEval: condEval, first_block: this.children.length } );
  }
  Conditional.prototype.execute = function(data, source, emitter) {
    for (var i = 0; i < this.branches.length; i++) {
      var branch = this.branches[i];
      //console.log('Data for Conditional:', data);
      if (branch.condEval(data, context)) {
        var to_block = i < (this.branches.length-1) ? this.branches[i+1].first_block : this.children.length;
        for (var j = branch.first_block; j < to_block; j++) {
          var block = this.children[j];
          block.execute(data, source, emitter);
        }
        break; // first if / elsif wins, rest are not considered
      }
    }
  }
  
  function JSList(params) {
    var params = params.split(' ').map( function(el) { return el.trim(); } );
    if (params.length < 1) throw new Error('List element needs at minimum the name of the list, and optionally the name of an element member');
    this.list = params[0];
    if (params.length > 1) this.member = params[1];
  }
  JSList.prototype = new Structure();
  JSList.prototype.constructor = JSList;
  JSList.prototype.execute = function(data, source, emitter) { 
    var list = this.member ? _.pluck(data[this.list], this.member) : data[this.list];
    emitter( list.join(', ') );
  }
  
  //--- Functions and stuff usable from within the template ---
  
  var context = {};
  
  function registerFunction(name, func) { context[name] = func; }
  
  //--- Utilities ---
  
  function adaptExpression(expr) {
    // prepend the "data" parameter to all identifiers except register functions
    //return expr.replace(/(\b(\w+)\b)/, 'data.$1')
    var pat = /("?\b\w+\b(?:\.(?:\b\w+\b))*"?)/gm, m;
    var result = '', p = 0;
    while ((m = pat.exec(expr)) !== null) {
      if (m[1][0] !== '"') {
        result += expr.slice(p, m.index);
        if (!context[m[1]]) result += 'data.'; else result += 'context.';
        result += m[1];
        p = pat.lastIndex;
      }
    }
    if (p < expr.length) result += expr.slice(p);
    return result;
  }
  
  function buildExpressionEvaluator(expr) {
    // Create an expression evaluator function
    var code = 'return (' + adaptExpression(expr) + ');';
    // Make injected context available without prefix
    /*
    var statements = _.map(context, function(elem, name) { return 'var '+name+' = context["'+name+'"];' } );
    statements.push(code);
    var code = statements.join('\n');
    */
    //console.log(code);
    return new Function('data', 'context', code);
  }
  
  //--- MAIN CLASS ---
  
  //          -->          <--- 1: block/inline discrimination
  //                    -->    <--- introducer: "{{$"
  //                       --->              <--- 2: command
  //                                     --->       <--- 3: parameters
  //                                            --->  <--- terminator: "}}"
  //                                              --->                            <--- 4: optional newline
  var scanner = /(^[ \t]*)?{{\$(\b\w+\b|=|\-)([^}]*)}}([ \t]*(?:\r\n?|\l\n?))?/gm;
  
  function Template(code) {

    this.code = code;
    
    var stack = [ new Structure() ];
    function current()       { return stack[stack.length-1]; }
    function addChild(child) { current().children.push(child); return child; }
    
    var m;
    var pos = 0;
    while ((m = scanner.exec(code)) !== null) {
      // Inline if lacking a newline at the end
      var inline  = (typeof m[4] === 'undefined');
      //console.log('inline:', inline, m[2], '"'+m[1]+'"', '"'+m[4]+'"');
      var command = m[2], params = m[3].trim();
      // Text between last marked position and beginning of tag becomes new child (text) block
      addChild( new Text(pos, m.index + (inline && m[1] ? m[1].length : 0) ) );
      // Tag type dependent actions
      if      (command === '='      ) addChild( new Placeholder(params) );
      else if (command === 'if'     ) stack.push( addChild(new Conditional(params)) );
      else if (command === 'foreach') stack.push( addChild(new Repeater   (params)) );
      else if (command === 'forall' ) stack.push( addChild(new Repeater   (params)) );
      else if (command === 'elsif'  ) current().newBranch(params);
      else if (command === 'else'   ) current().newBranch(params);
      else if (command === 'end'    ) stack.pop();
      else if (command === 'list'   ) addChild( new JSList(params) );
      else if (command[0] === '-'   ) ; // comment introducer, do nothing
      else                            throw new Error('Unrecognized template command "'+command+'"');
      // Advance past tag
      pos = scanner.lastIndex - (inline && m[4] ? m[4].length : 0);
      //console.log(pos);
    }
    // Add last block of text
    addChild( new Text(pos, code.length) );
    
    // Done!
    if (stack.length !== 1) throw new Error('Opening/closing tag inbalance');
    this.root_block = stack[0];
    //console.log( JSON.stringify(stack[0], null, "    ") );
  }
  
  Template.registerFunction = registerFunction;
  
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