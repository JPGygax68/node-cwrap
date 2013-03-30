"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'xmldom', 'xpath', './template' ],
function(  xmldom ,  xpath ,    Template  ) {

  /** Extending the template system with custom functions. */

  /** Maps C types to V8 wrapper classes and type-casting accessor methods of 
   *  the V8::Value class.
   */
  var type_map = {
    'int'          : { v8_class: 'Int32' , accessor: 'Int32Value'  },
    'unsigned int' : { v8_class: 'Uint32', accessor: 'Uint32Value' }
  };

  function findType(type) {
    var entry = type_map[type];
    if (!entry) throw new Error('CWrap: unknown type "'+type+'"');
    if (entry.aliasFor) return findType(entry.aliasFor);
    return entry;
  }
  
  Template.registerFunction( 'v8TypeWrapper' , function(ctype) { return findType(ctype).v8_class; } );
  Template.registerFunction( 'v8TypeAccessor', function(ctype) { return findType(ctype).accessor; } );

  //--- Public interface ---
  
  return {
    parseSwigXml: parseXml,
    registerType: registerType,
    generate    : generate
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

  function registerType(type, v8_class, v8_accessor) {
    type_map[type] = { v8_class: v8_class, accessor: v8_accessor };
  }
  
  function generate(tmpl_file, intf, writer) {
    return Template.read(tmpl_file)
      .then( function(template) { return template.exec(intf, writer); } );
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
      //console.log(func.name, func.type);
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