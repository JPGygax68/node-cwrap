"use strict";

var exec     = require('child_process').exec;
var Q        = require('q');
var fs       = require('q-io/fs');
var path     = require('path');
var _        = require('underscore');
var temp     = require('temp');
var Template = require('gpc-template');
var swig     = require('./swig');

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

function parse(filename, options) {
	var options = options || {};
	var tmpdir, modulename, ifile, xmlfile;
	
	return Q.nfcall(temp.mkdir, 'cwrap')
		.then( function(dirPath) {
			tmpdir = dirPath;
			module = path.basename(filename, path.extname(filename));
			ifile  = path.join(tmpdir, modulename + '.i');
			var data = [
				'%module ' + modulename,
				'%{',
				'#include "'+path.resolve(filename)+'"',
				'%}',
				'%include "'+path.resolve(filename)+'"'
			].join('\n');
			//console.log(ifile, data);
			return fs.write(ifile, data);
		})
		.then( function() {
			xmlfile = path.join(tmpdir, module + '.xml');
			var params = '-xml -c++ -o "'+xmlfile+'" "'+ifile+'"';
			return Q.nfcall(exec, 'swig '+params);
		})
		.then( function() {
			return fs.read(xmlfile);
		})
		// TODO: remove this, it's for debugging only
		.then( function(xmldata) {
			return fs.write('swig.xml', xmldata).then( function() { return xmldata; } );
		})
		.then( swig.parseSwigXml.bind(this) )
		// TODO: remove temporary file
		;
}

//--- Helper stuff ---

function log(msg) {
  console.log.apply(this, arguments);
}

function warn(msg) {
  console.warn.apply(this, arguments);
}

//--- Public interface ---

exports.parse						  = parse;
exports.parseSwigXml      = swig.parseSwigXml;
exports.registerTypeAlias = registerTypeAlias;
exports.generate          = generate;
exports.generateNodeJS    = generateNodeJS;