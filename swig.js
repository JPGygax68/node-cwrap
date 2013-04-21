"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'xmldom', 'xpath', './type', './interface' ],
function(  xmldom ,  xpath ,    Type ,    Interface  ) {

  //--- PUBLIC FUNCTIONALITY ---
  
  function parseXml(xml) {
    // Repair the closing tags (which have a space at the end, tsk tsk)
    xml = xml.replace(/<\/(\w+)\s+>/gm, '</$1>');
    // Parse the whole thing
    var doc = new xmldom.DOMParser().parseFromString(xml);
    // Extract the interface description
    return extractInterface(doc);  
  }

  //--- INTERNAL ROUTINES ---
  
  function extractInterface(doc) {

    var intf = new Interface();
    
    // Get the functions
    var attrib_lists = xpath.select('//cdecl/attributelist/attribute[@name="kind"][@value="function"]/..', doc);
    attrib_lists.forEach( function(attrib_list) {
      // Extract the function name
      var name = xpath.select('./attribute[@name="name"]/@value', attrib_list)[0].value;
      // Create and add a new function descriptor
      var func = intf.newFunction(name);
      // Extract and store the data
      var type = xpath.select('./attribute[@name="type"]/@value', attrib_list)[0].value;
      var decl = xpath.select('./attribute[@name="decl"]/@value', attrib_list)[0].value;
      if (decl.slice(-3) === '.p.') {
        // APPEARS TO BE A BUG IN SWIG: instead of attributing the pointer to the returned type, it is attributed to the function itself!
        type = 'p.' + type;
        decl = decl.slice(0, func.length - 2);
      }
      func.type = new Type(type);
      func.decl = decl;
      //console.log('Function type: "'+type+'", "'+func.decl+'"');
      func.ctype = func.type.toC();
      //console.log(func.name, func.type);
      var param_nodes = xpath.select('./parmlist/parm', attrib_list);
      var count = 0;
      param_nodes.forEach( function(param_node, i) {
        var name_attr = xpath.select('./attributelist/attribute[@name="name"]/@value', param_node)[0];
        var type_attr = xpath.select('./attributelist/attribute[@name="type"]/@value', param_node)[0];      
        // Have to support unnamed parameters
        var name = name_attr ? name_attr.value : 'param_'+i;
        func.addParameter(count, name, type_attr.value);
        count ++;
      });
      // Special case: if only parameter is "void", there are no parameters at all
      if (count === 1 && func.params['param_0'] && func.params.param_0.type == 'void') func.params = {};
    });
    
    // Get the preprocessor constants
    var attrib_lists = xpath.select('//constant/attributelist/attribute[@name="storage"][@value="%constant"]/..', doc);
    attrib_lists.forEach( function(attrib_list) {
      // Extract the constant name
      var name = xpath.select('./attribute[@name="name"]/@value', attrib_list)[0].value;
      // Create and add a new constant descriptor
      var constant = intf.newConstant(name);
      // Extract and store the data
      constant.type  = xpath.select('./attribute[@name="type"]/@value' , attrib_list)[0].value;
      constant.value = xpath.select('./attribute[@name="value"]/@value', attrib_list)[0].value;
    });
    
    // Get the cdecl constants
    var attrib_lists = xpath.select('//cdecl/attributelist/attribute[@name="kind"][@value="variable"]/..', doc);
    attrib_lists.forEach( function(attrib_list) {
      // Extract the constant name & other attributes
      var name         = xpath.select('./attribute[@name="name"]/@value'        , attrib_list)[0].value;
      var hasconsttype = xpath.select('./attribute[@name="hasconsttype"]/@value', attrib_list)[0].value;
      if (hasconsttype) {
        // Create and add a new constant descriptor
        var constant = intf.newConstant(name);
        // Extract and store the data
        constant.type  = new Type( xpath.select('./attribute[@name="type"]/@value' , attrib_list)[0].value ).popQualifiers();
        //console.log('New constant:', name, constant.type.toString() );
        constant.value = xpath.select('./attribute[@name="value"]/@value', attrib_list)[0].value;
      }
      // else TODO: how to wrap global variables ?
    });
    
    // Done.
    //console.log( JSON.stringify(intf.functions, null, '\t') );
    return intf;
  }

  //--- EXPORTS ---
  
  return {
    parseSwigXml: parseXml
  };
});