"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'q-io/fs', 'xmldom', 'xpath', 'underscore', 'gpc-template', './type' ],
function(       fs ,  xmldom ,  xpath ,  _          ,  Template     ,    Type  ) {

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

  function parseXml(xml) {
    // Repair the closing tags (which have a space at the end, tsk tsk)
    xml = xml.replace(/<\/(\w+)\s+>/gm, '</$1>');
    // Parse the whole thing
    var doc = new xmldom.DOMParser().parseFromString(xml);
    // Extract the interface description
    return extractInterface(doc);  
  }

  function registerTypeAlias(new_type, alias_for) {
    type_map[new_type] = { alias_for: alias_for };
  }
  
  function generate(tmpl_file, intf, writer) {
    return Template.read(tmpl_file)
      .then( function(template) { return template.exec(intf, writer); } );
  }
  
  function generateNodeJS(intf, writer) {
    intf._orderClasses();
    return fs.read('./node_modules/cwrap/resources/nodebindings.tmpl.cc')
      .then( function(tmpl_code) { return new Template(tmpl_code, 'DEFAULT NODEJS TEMPLATE'); } )
      .then( function(tpl)       { return tpl.exec(intf, writer); } );
  }

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

  //--- Interface class ---

  function Interface() {
    this.functions = {};
    this.constants = {};
    this.classes   = {};
  }
  
  Interface.prototype.newFunction = function(cdecl_name) { 
    var func = new CFunction(this, cdecl_name);
    this.functions[cdecl_name] = func;
    return func;
  }

  Interface.prototype.removeFunction = function(func) { 
    if (this.functions[func.cdecl_name]) delete this.functions[func.cdecl_name]; 
  }
  
  Interface.prototype.getClass = function(name) {
    var theclass = this.classes[name];
    if (!theclass) theclass = this.classes[name] = new ClassOrStruct(name, this);
    return theclass;
  }
  
  Interface.prototype.newConstant = function(cdecl_name) {
    var constant = new Constant(this, cdecl_name);
    this.constants[cdecl_name] = constant;
    return constant;
  }
  
  Interface.prototype.removeConstant = function(constant) { 
    if (this.constants[constant.cdecl_name]) delete this.constants[constant.cdecl_name]; 
  }
  
  Interface.prototype._orderClasses = function() {
    var self = this, classes = {};
    _.each(this.classes, addClass);
    this.classes = classes;

    function addClass(cls) {
      if (!classes[cls]) { 
        if (cls.derived_from) addClass(self.classes[cls.derived_from]); classes[cls.name] = cls; 
      }
    }
  }
  
  //--- ClassOrStruct ---
  
  function ClassOrStruct(name, intf) {
    if (!intf) throw new Error('INTERNAL: ClassOrStruct constructor needs 2 parameters: name and interface object');
    this['interface']   = intf;
    this.name           = name;
    this.methods        = {};
    this.static_methods = {};
    this.constants      = {};
    this.constructors   = []; // TODO: there should be only one, but gpc-templates doesn't support "with" (yet?)
  }
  
  ClassOrStruct.prototype.addMethod = function(func) {
    this.methods[func.name] = func;
    func.parent = func['class'] = this;
  }
  
  ClassOrStruct.prototype.addStaticMethod = function(func) {
    this.static_methods[func.name] = func;
    func.parent = func['class'] = this;
    this.setExposed();
  }
  
  ClassOrStruct.prototype.setExposed = function(exposed) {
    this.exposed = exposed !== false;
  }
  
  ClassOrStruct.prototype.setParentClass = function(parent) {
    console.assert(typeof parent === 'string');
    this['interface'].getClass(parent); // make sure it's in the list of classes
    this.derived_from = parent;
  }
  
  ClassOrStruct.prototype.addConstant = function(constant) {
    this.constants[constant.name] = constant;
    constant.parent = constant['class'] = this;
    this.setExposed();
  }
  
  //--- CFunction ---
  
  function CFunction(intf, cdecl_name) {
    this['interface'] = intf;
    this.cdecl_name   = cdecl_name;
    this.name         = cdecl_name; // initially the same as cdecl name
    this.params       = {};
  }

  CFunction.prototype.removePrefix = function(prefix) {
    if (this.cdecl_name.slice(0, prefix.length) === prefix) this.name = this.cdecl_name.slice(prefix.length);
    else console.warn('Function "'+func.name+'" does not have the "'+prefix+'" prefix');
  }    

  CFunction.prototype.toMethod = function(class_name, fname, self_name) {
    var the_class = this['class'] = this['interface'].getClass(class_name);
    // Shift parameters to the left, leftmost becomes "this" reference
    this.params[self_name].is_self = true;
    _.each(this.params, function(param) { if (param.index === 0) { param.value_expr = 'self'; } param.index --; } );
    // Remove function from the interface and add it to the class
    this['interface'].removeFunction(this);
    the_class.addMethod(this);
  }
  
  CFunction.prototype.setRetValWrapper = function(class_name) {
    this.retval_wrapper = class_name;
  }
  
  CFunction.prototype.toConstructor = function(class_name) {
    var the_class = this['class'] = this['interface'].getClass(class_name);
    // Remove function from the interface and add it to the class as its constructor
    this['interface'].removeFunction(this);
    the_class.setExposed();
    the_class.constructors[0] = this;
  }
  
  CFunction.prototype.toStaticFactoryMethod = function(class_name) {
    this.setRetValWrapper(class_name);
    this.toStaticMethod(class_name);
  }
  
  CFunction.prototype.toStaticMethod = function(class_name) {
    var the_class = this['class'] = this['interface'].getClass(class_name);
    // Remove function from the interface and add it to the class as a static member
    this['interface'].removeFunction(this);
    the_class.addStaticMethod(this);
  }

  // TODO: this does not support more than one factory function
  
  CFunction.prototype.toFactory = function(class_name) {
    this['interface'].classes[class_name].factory = this;
    this['interface'].removeFunction(this);
  }
  
  CFunction.prototype.toDestructor = function(class_name) {
    this['interface'].classes[class_name].destructor = this;
    this['interface'].removeFunction(this);
  }
  
  // TODO: destructor function

  // Constant
  
  function Constant(intf, cdecl_name) {
    this['interface'] = intf;
    this.cdecl_name   = cdecl_name;
    this.name         = cdecl_name;
  }

  Constant.prototype.toClass = function (class_name) {
    var the_class = this['class'] = this['interface'].getClass(class_name);
    // Remove function from the interface and add it to the class
    this['interface'].removeConstant(this);
    the_class.addConstant(this);
  }
  
  //--- Parameter ---
  
  function Parameter(index, name, type) {
    this.index = index;
    this.name  = name;
    this.type  = type;
    this.ctype = convertTypeToC(this.type);
  }
  
  Parameter.IN    = 1;
  Parameter.OUT   = 2;
  Parameter.INOUT = 3;

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

  //--- Public interface ---
  
  return {
    parseSwigXml     : parseXml,
    registerTypeAlias: registerTypeAlias,
    generate         : generate,
    generateNodeJS   : generateNodeJS
  };
  
}); // define