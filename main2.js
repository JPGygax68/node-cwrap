"use strict";

var fs        = require("q-io/fs");
var Dom       = require("xmldom").DOMParser;
var xpath     = require("xpath");
var Template  = require("./template");

var input_path = process.argv[2];
//console.log(input_path);

var intf;

//--- MAIN PROCEDURE ---
  
// Extend the template system

/** These are class names, but the same names can also be used as methods on
    generic Value instances to cast to a specific type.
 */
Template.registerFunction( 'v8TypeWrapper', function(ctype) {
  var MAP = {
    'int'          : 'Int32Value',
    'unsigned int' : 'Uint32Value' /*,
    GLenum         : 'Uint32Value',
    GLint          : 'Int32Value',
    GLuint         : 'Uint32Value',
    GLsizei        : 'Int32Value',
    GLbitfield     : 'Uint32Value',
    GLboolean      : 'BooleanValue',
    GLsizeiptr     : 'Int32Value',
    GLfloat        : 'NumberValue',
    GLdouble       : 'NumberValue',
    GLclampf       : 'NumberValue',
    GLclampd       : 'NumberValue' */
  };
  console.assert(MAP[ctype], ctype);
  return MAP[ctype];
});

// Read and parse the XML
fs.read(input_path).then( function(content) {
  // Repair the closing tags (which have a space at the end, tsk tsk)
  content = content.replace(/<\/(\w+)\s+>/gm, '</$1>');
  // Parse the whole thing
  var doc = new Dom().parseFromString(content);
  // Extract the interface description
  var intf = extractInterface(doc);  
})

.then( function() {
  return Template.read('nodebindings.tmpl.cc')
    .then( function(template) { return template.exec(intf); } );
});

//--- Main steps ---

function extractInterface(doc) {

  intf = { functions: {}, constants: {} };
  
  // Get the functions
  var attrib_lists = xpath.select('//cdecl/attributelist/attribute[@name="kind"][@value="function"]/..', doc);
  attrib_lists.forEach( function(attrib_list) {
    // Extract the function name
    var name = xpath.select('./attribute[@name="name"]/@value', attrib_list)[0].value;
    // Create and add a new function descriptor
    var func = { name: name, params: {} };
    intf.functions[name] = func;
    // Extract and store the data
    func.type = xpath.select('./attribute[@name="type"]/@value', attrib_list)[0].value;
    var param_nodes = xpath.select('./parmlist/parm', attrib_list);
    var count = 0;
    param_nodes.forEach( function(param_node, i) {
      var name_attr = xpath.select('./attributelist/attribute[@name="name"]/@value', param_node)[0];
      var type_attr = xpath.select('./attributelist/attribute[@name="type"]/@value', param_node)[0];      
      // Have to support unnamed parameters
      var name = name_attr ? name_attr.value : 'param_'+i;
      func.params[name] = { _index: count, name: name, type: type_attr.value };
      count ++;
    });
    // Special case: if only parameter is "void", there are no parameters at all
    if (count === 1 && func.params['param_0'] && func.params.param_0.type === 'void') func.params = {};
  });
  
  // Get the constants
  var attrib_lists = xpath.select('//constant/attributelist/attribute[@name="storage"][@value="%constant"]/..', doc);
  attrib_lists.forEach( function(attrib_list) {
    // Extract the function name
    var name = xpath.select('./attribute[@name="name"]/@value', attrib_list)[0].value;
    // Create and add a new function descriptor
    var constant = { name: name };
    intf.constants[name] = constant;
    // Extract and store the data
    constant.type  = xpath.select('./attribute[@name="type"]/@value' , attrib_list)[0].value;
    constant.value = xpath.select('./attribute[@name="value"]/@value', attrib_list)[0].value;
  });
  
  // Done.
  //console.log( JSON.stringify(intf.functions, null, '\t') );
}

//--- Helper stuff ---

function log(msg) {
  console.log.apply(this, arguments);
}

function warn(msg) {
  console.warn.apply(this, arguments);
}
