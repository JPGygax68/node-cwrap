"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'underscore', './type' ],
function(  _          ,    Type  ) {

  //--- Struct / class --------
  
  function Struct(intf, name) {
    //console.log('new Struct "'+name+'"');
    if (!intf) throw new Error('INTERNAL: Struct constructor needs 2 parameters: interface object and name');
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
    //console.log(this.name+'.setExposed('+ exposed + ')', this.exposed);
  }
  
  Struct.prototype.setParentClass = function(parent_name) {
    console.assert(typeof parent_name === 'string');
    this['interface'].getClass(parent_name); // make sure it's in the list of classes
    this.derived_from = parent_name;
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
    this.parm_list    = [];
    this.type         = null;
  }

  CFunction.prototype.isOneOf = function(names) {
    if (names instanceof RegExp) {
      return this.name.match(names) || this.cdecl_name.match(names);
    }
    else {
      if      (arguments.length > 1)      names = Array.prototype.slice.call(arguments);
      else if (typeof names === 'string') names = names.split(',');
      return names.indexOf(this.name) >= 0|| names.indexOf(this.cdecl_name) >= 0;
    }
  }
  
  CFunction.prototype.isNamed = CFunction.prototype.isOneOf;
  
  CFunction.prototype.addParameter = function(index, name, type) {
    console.assert(!this.params[name]);
    var parm = this.params[name] = new Parameter(index, name, type);
    this.parm_list.push(parm);
    return this;
  }
  
  CFunction.prototype.removePrefix = function(prefix) {
    if (this.cdecl_name.slice(0, prefix.length) === prefix) this.name = this.cdecl_name.slice(prefix.length);
    //else console.warn('"remove prefix" action: function "'+this.name+'" does not have the "'+prefix+'" prefix');
    return this;
  }    

  CFunction.prototype.remove = function() {
    this['interface'].removeFunction(this);
    return null; // intentional STOP to chaining
  }
  
  CFunction.prototype.toMethod = function(class_name, pattern, repl) {
    //console.log(fname, '-> method', class_name);
    var the_class = this['class'] = this['interface'].getClass(class_name);
    // Shift parameters to the left, leftmost becomes "this" reference
    //this.params[self_name].is_self = true;
    this.getParam(0).is_self = true;
    _.each(this.params, function(param) { if (param.index === 0) { param.value_expr = 'self'; }; param.index --; } );
    // Remove function from the interface and add it to the class
    this['interface'].removeFunction(this);
    the_class.addMethod(this);
    // Renaming
    if (pattern) this.rename(pattern, repl);
    return this;
  }
  
  CFunction.prototype.setRetValWrapper = function(class_name) {
    this.retval_wrapper = class_name;
    return this;
  }
  
  CFunction.prototype.toConstructor = function(class_name) {
    var the_class = this['class'] = this['interface'].getClass(class_name);
    // Remove function from the interface and add it to the class as its constructor
    this['interface'].removeFunction(this);
    the_class.setExposed();
    //console.log('Class "'+the_class.name+'" exposed ?', the_class.exposed);
    the_class.constructors[0] = this;
    return this;
  }
  
  CFunction.prototype.toStaticFactoryMethod = function(class_name) {
    this.setRetValWrapper(class_name);
    this.toStaticMethod(class_name);
    return this;
  }
  
  CFunction.prototype.toStaticMethod = function(class_name) {
    var the_class = this['class'] = this['interface'].getClass(class_name);
    // Remove function from the interface and add it to the class as a static member
    this['interface'].removeFunction(this);
    the_class.addStaticMethod(this);
    return this;
  }
  
  CFunction.prototype.clearParams = function() {
    this.params    = {};
    this.parm_list = [];
    return this;
  }
  
  CFunction.prototype.rename = function(pattern, repl) {
    if (typeof pattern === 'string' && typeof repl === 'undefined') this.name = pattern;
    else                                                            this.name.replace(pattern, repl);
    return this;
  }

  CFunction.prototype.getParam = function(key) {
    if (_.isNumber(key)) return this.parm_list[key];
    else                 return this.params[key];
  }
  
  CFunction.prototype.hasParam = function(key) {
    // TODO: support wildcard/omitted parameter name
    if (_.isNumber(key)) return key >= 0 && key < this.parm_list.length;
    else                 return this.params.hasOwnProperty(key);
  }
  
  CFunction.prototype.firstParam = function() { return this.parm_list[0]; }
  
  CFunction.prototype.checkParam = function(key, descr) {
    if (typeof descr === 'undefined') return this.hasParam(key);
    else {
      var parm = this.getParam(key);
      return parm && parm.is(descr);
    }
  }
  
  CFunction.prototype.forEachParam = function(cb, ctx) {
    _.each(this.params, cb, ctx);
  }
  
  // TODO: this does not support more than one factory function
  
  CFunction.prototype.toFactory = function(class_name) {
    this['interface'].getClass(class_name).factory = this;
    this['interface'].removeFunction(this);
    return this;
  }
  
  CFunction.prototype.toDestructor = function(class_name) {
    this['interface'].getClass(class_name).destructor = this;
    this['interface'].removeFunction(this);
    return this;
  }
  
  // TODO: destructor function

  // Constant
  
  function Constant(intf, cdecl_name) {
    this['interface'] = intf;
    this.cdecl_name   = cdecl_name;
    this.name         = cdecl_name;
  }

  Constant.prototype.removePrefix = function(prefix) {
    if (this.cdecl_name.slice(0, prefix.length) === prefix) this.name = this.cdecl_name.slice(prefix.length);
    //else console.warn('"remove prefix" action: constant "'+this.name+'" does not have the "'+prefix+'" prefix');
    return this;
  }    

  Constant.prototype.attachTo = function (class_name) {
    var the_class = this['class'] = this['interface'].getClass(class_name);
    // Remove function from the interface and add it to the class
    this['interface'].removeConstant(this);
    the_class.addConstant(this);
  }
  
  Constant.prototype.remove = function() {
    this['interface'].removeConstant(this);
    return null; // intentional STOP to chaining
  }
  
  //--- Enum --------
  
  function Enum(intf, cdecl_name) {
    this['interface'] = intf;
    this.cdecl_name = cdecl_name;
    this.name       = cdecl_name;
    this.values     = {};
  }
  
  //--- Parameter ---
  
  function Parameter(index, name, type) {
    this.index      = index;
    this.name       = name;
    this.type       = typeof type === 'string' ? new Type(type) : type;
    this.ctype      = this.type.toC();
    this.value_expr = this.type === 'p.q(const).char' ? '* String::Utf8Value('+this.name+')' : this.name;
    //this.input      = true;
  }
  
  Parameter.prototype.is = function(descr) {
    descr = descr.split(':');
    return descr[0] == this.name && (!descr[1] || descr[1] == this.type);
  }
  
  Parameter.prototype.setWrapperClass = function(class_name) {
    this.wrapper_class = class_name;
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