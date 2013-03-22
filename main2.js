"use strict";

var fs     = require("q-io/fs");
var Dom    = require("xmldom").DOMParser;
var xpath  = require("xpath");

fs.read('./test/lsdisplay2_wrap.xml')
.then( function(content) {
  // Repair the closing tags (which have a space at the end, tsk tsk)
  content = content.replace(/<\/(\w+)\s+>/gm, '</$1>');
  // Parse the whole thing
  var doc = new Dom().parseFromString(content);
  // Now let's try a query
  var attrib_lists = xpath.select('//cdecl/attributelist/attribute[@name="kind"][@value="function"]/..', doc);
  attrib_lists.forEach( function(attrib_list) {
    var name_attr   = xpath.select('./attribute[@name="name"]/@value', attrib_list)[0];
    var type_attr   = xpath.select('./attribute[@name="type"]/@value', attrib_list)[0];
    var param_nodes = xpath.select('./parmlist/parm', attrib_list);
    log(name_attr.value, ':', type_attr.value);
    param_nodes.forEach( function(param_node) {
      var name_attr = xpath.select('./attributelist/attribute[@name="name"]/@value', param_node)[0];
      // If no "name" attribute was found, then the function has no parameters
      if (name_attr) {
        var type_attr = xpath.select('./attributelist/attribute[@name="type"]/@value', param_node)[0];      
        console.log('  ', name_attr.value, ':', type_attr.value);
      }
    });
  });
});

//----------

function log(msg) {
  console.log.apply(this, arguments);
}

function warn(msg) {
  console.warn.apply(this, arguments);
}