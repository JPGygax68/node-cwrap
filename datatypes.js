"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'underscore', './type' ],
function(  _          ,    Type  ) {

  //--- Struct ---
  
  function Struct(name, intf) {
    if (!intf) throw new Error('INTERNAL: Struct constructor needs 2 parameters: name and interface object');
    this['interface']   = intf;
    this.name           = name;
    this.methods        = {};
    this.static_methods = {};
    this.constants      = {};
    this.constructors   = []; // TODO: there should be only one, but gpc-templates doesn't support "with" (yet?)
  }
  
  Struct.prototype.addMethod = function(func) {
    this.methods[func.name] = func;
    func.parent = func['class'] = this;
  }
  
  Struct.prototype.addStaticMethod = function(func) {
    this.static_methods[func.name] = func;
    func.parent = func['class'] = this;
    this.setExposed();
  }
  
  Struct.prototype.setExposed = function(exposed) {
    this.exposed = exposed !== false;
  }
  
  Struct.prototype.setParentClass = function(parent) {
    console.assert(typeof parent === 'string');
    this['interface'].getClass(parent); // make sure it's in the list of classes
    this.derived_from = parent;
  }
  
  Struct.prototype.addConstant = function(constant) {
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

  CFunction.prototype.isOneOf = function(names) {
    if      (arguments.length > 1)      names = Array.prototype.slice.call(arguments);
    else if (typeof names === 'string') names = names.split(',');
    return names.indexOf(this.name) >= 0 || names.indexOf(this.cdecl_name) >= 0;
  }
  
  CFunction.prototype.addParameter = function(index, name, type) {
    console.assert(!this.params[name]);
    this.params[name] = new Parameter(index, name, type);
  }
  
  CFunction.prototype.removePrefix = function(prefix) {
    if (this.cdecl_name.slice(0, prefix.length) === prefix) this.name = this.cdecl_name.slice(prefix.length);
    else console.warn('Function "'+func.name+'" does not have the "'+prefix+'" prefix');
  }    

  CFunction.prototype.toMethod = function(class_name, fname, self_name) {
    //console.log(fname, '-> method', class_name);
    var the_class = this['class'] = this['interface'].getClass(class_name);
    // Shift parameters to the left, leftmost becomes "this" reference
    this.params[self_name].is_self = true;
    _.each(this.params, function(param) { if (param.index === 0) { param.value_expr = 'self'; }; param.index --; } );
    //console.log(this.params);
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
    this.type  = typeof type === 'string' ? new Type(type) : type;
    this.ctype = this.type.toC();
  }
  
  Parameter.IN    = 1;
  Parameter.OUT   = 2;
  Parameter.INOUT = 3;

  //--- EXPORTS ---
  
  return {
    Struct:       Struct,
    Function:     CFunction,
    Constant:     Constant,
    Parameter:    Parameter
  };
});