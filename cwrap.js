"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'q-io/fs', 'underscore', 'gpc-template', './swig' ],
function(       fs ,  _          ,  Template     ,    swig  ) {

  /** Maps C types to V8 wrapper classes and type-casting accessor methods of 
   *  the V8::Value class.
   */
  var type_map = {
    'void'              : {                                                  buffer_ctor: 'ArrayBuffer' , ext_array_type: 'kExternalByteArray'          },
    'char'              : { v8_class: 'Int32'    , accessor: 'Int32Value'  , buffer_ctor: 'Int8Array'   , ext_array_type: 'kExternalByteArray'          },
    'unsigned char'     : { v8_class: 'Uint32'   , accessor: 'Uint32Value' , buffer_ctor: 'Uint8Array'  , ext_array_type: 'kExternalUnsignedByteArray'  },
    'short'             : { v8_class: 'Int32'    , accessor: 'Int32Value'  , buffer_ctor: 'Int16Array'  , ext_array_type: 'kExternalShortArray'         },
    'unsigned short'    : { v8_class: 'Uint32'   , accessor: 'Uint32Value' , buffer_ctor: 'Uint16Array' , ext_array_type: 'kExternalUnsignedShortArray' },
    'int'               : { v8_class: 'Int32'    , accessor: 'Int32Value'  , buffer_ctor: 'Int32Array'  , ext_array_type: 'kExternalIntArray'           },
    'unsigned int'      : { v8_class: 'Uint32'   , accessor: 'Uint32Value' , buffer_ctor: 'Uint32Array' , ext_array_type: 'kExternalUnsignedIntArray'   },
    'float'             : { v8_class: 'Number'   , accessor: 'NumberValue' , buffer_ctor: 'Float32Array', ext_array_type: 'kExternalFloatArray'         },
    'double'            : { v8_class: 'Number'   , accessor: 'NumberValue' , buffer_ctor: 'Float64Array', ext_array_type: 'kExternalDoubleArray'        },
    'bool'              : { v8_class: 'Boolean'  , accessor: 'BooleanValue', buffer_ctor: 'Uint8Array'  , ext_array_type: 'kExternalByteArray'          },
    'long long'         : { v8_class: 'Int64'    , accessor: 'Int64Value'  },
    'unsigned long long': { v8_class: 'Uint64'   , accessor: 'Uint64Value' },
    'p.void'            : { v8_class: 'External' , accessor: ''  } // TODO: THIS IS SPECIAL
  };

  function findType(type) {
    var entry = type_map[type];
    if (!entry) throw new Error('CWrap: unknown type "'+type+'"');
    if (entry.alias_for) return findType(entry.alias_for);
    return entry;
  }
  
  /** Extend the template system with custom functions. */

  Template.registerFunction( 'v8TypeWrapper'      , function(ctype) { return findType(ctype).v8_class      ; } );
  Template.registerFunction( 'v8TypeAccessor'     , function(ctype) { return findType(ctype).accessor      ; } );
  Template.registerFunction( 'v8BufferType'       , function(ctype) { return findType(ctype).buffer_ctor   ; } );
  Template.registerFunction( 'v8ExternalArrayType', function(ctype) { return findType(ctype).ext_array_type; } );

  //--- Implementation ---

  function registerTypeAlias(new_type, alias_for) {
    type_map[new_type] = { alias_for: alias_for };
  }
  
  function generate(tmpl_file, intf, writer) {
    return Template.read(tmpl_file)
      .then( function(template) { return template.exec(intf, writer); } );
  }
  
  function generateNodeJS(intf, writer) {
    //intf._orderClasses();
    return fs.read('./node_modules/cwrap/resources/nodebindings.tmpl.cc')
      .then( function(tmpl_code) { return new Template(tmpl_code, 'DEFAULT NODEJS TEMPLATE'); } )
      .then( function(tpl)       { return tpl.exec(intf, writer); } );
  }

  //--- Helper stuff ---

  function log(msg) {
    console.log.apply(this, arguments);
  }

  function warn(msg) {
    console.warn.apply(this, arguments);
  }

  //--- Public interface ---
  
  return {
    parseSwigXml     : swig.parseSwigXml,
    registerTypeAlias: registerTypeAlias,
    generate         : generate,
    generateNodeJS   : generateNodeJS
  };
  
}); // define