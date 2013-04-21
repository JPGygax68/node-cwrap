"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'underscore', './datatypes', './type' ],
function(  _          ,    dt        ,    Type  ) {

  function Interface() {
    this.functions = {};
    this.constants = {};
    this.classes   = {};
  }
  
  Interface.prototype.newFunction = function(cdecl_name) { 
    var func = new dt.Function(this, cdecl_name);
    this.functions[cdecl_name] = func;
    return func;
  }

  Interface.prototype.removeFunction = function(func) { 
    if (this.functions[func.cdecl_name]) delete this.functions[func.cdecl_name]; 
  }
  
  Interface.prototype.getClass = function(name) {
    var theclass = this.classes[name];
    if (!theclass) theclass = this.classes[name] = new dt.Struct(name, this);
    return theclass;
  }
  
  Interface.prototype.newConstant = function(cdecl_name) {
    var constant = new dt.Constant(this, cdecl_name);
    this.constants[cdecl_name] = constant;
    return constant;
  }
  
  Interface.prototype.removeConstant = function(constant) { 
    if (this.constants[constant.cdecl_name]) delete this.constants[constant.cdecl_name]; 
  }
  
  Interface.prototype.process = function(config) {
    
    if (config.global) config.global.call(this);
    _.each(this.functions, config.functions, this);
    _.each(this.constants, config.constants, this);
    
    this._orderClasses();
    
    return this;
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
  
  //--- EXPORTS ---
  
  return Interface;
  
});