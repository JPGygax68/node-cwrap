"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'xmldom', 'xpath', './template' ],
function(  xmldom ,  xpath ,    Template  ) {

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

  //--- Public interface ---
  
  return {
    parseXml: parseXml,
    generate: generate
  };
  
  //--- Implementation ---

  function parseXml(xml) {
    // Repair the closing tags (which have a space at the end, tsk tsk)
    xml = xml.replace(/<\/(\w+)\s+>/gm, '</$1>');
    // Parse the whole thing
    var doc = new xmldom.DOMParser().parseFromString(xml);
    // Extract the interface description
    return extractInterface(doc);  
  }

  function generate(intf) {
    return Template.read('nodebindings.tmpl.cc')
      .then( function(template) { return template.exec(intf); } );
  }

  function extractInterface(doc) {

    var intf = { functions: {}, constants: {} };
    
    // Get the functions
    var attrib_lists = xpath.select('//cdecl/attributelist/attribute[@name="kind"][@value="function"]/..', doc);
    attrib_lists.forEach( function(attrib_list) {
      // Extract the function name
      var name = xpath.select('./attribute[@name="name"]/@value', attrib_list)[0].value;
      // Create and add a new function descriptor
      var func = new CFunction(name);
      intf.functions[name] = func;
      // Extract and store the data
      func.type = xpath.select('./attribute[@name="type"]/@value', attrib_list)[0].value;
      func.decl = xpath.select('./attribute[@name="decl"]/@value', attrib_list)[0].value;
      if (func.decl.slice(-3) === '.p.') func.type = 'p.' + func.type; // APPEARS TO BE A BUG IN SWIG
      func.ctype = convertTypeToC(func.type);
      var param_nodes = xpath.select('./parmlist/parm', attrib_list);
      var count = 0;
      param_nodes.forEach( function(param_node, i) {
        var name_attr = xpath.select('./attributelist/attribute[@name="name"]/@value', param_node)[0];
        var type_attr = xpath.select('./attributelist/attribute[@name="type"]/@value', param_node)[0];      
        // Have to support unnamed parameters
        var name = name_attr ? name_attr.value : 'param_'+i;
        func.params[name] = new Parameter(count, name, type_attr.value);
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
    return intf;
  }

  //--- Data types ---

  function CFunction(name) {
    this.name = name;
    this.params = {};
  }

  function Parameter(index, name, type) {
    this.index = index;
    this.name = name;
    this.type = type;
    this.ctype = convertTypeToC(this.type);
  }

  //--- Helper stuff ---

  function convertTypeToC(type) {
    // Convert type descriptor back to C/++ type specification
    var parts = [];
    var pointer = false;
    type.split(/\./).forEach( function(el, i) {
      if      (el    === 'p'   ) pointer = true;
      else if (el    === 'a(1)') pointer = true;
      else if (el[0] === 'q'   ) parts.push( el.slice(2, el.length-1) );
      else {
        parts.push(el);
        if (pointer) parts.push('*');
        pointer = false;
      }
    });
    return parts.join(' ');
  }
  
  function log(msg) {
    console.log.apply(this, arguments);
  }

  function warn(msg) {
    console.warn.apply(this, arguments);
  }

}); // define