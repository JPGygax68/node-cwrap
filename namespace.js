"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define( [ 'underscore', './tvparser', './charclasses', './datatypes', './type' ],
function(  _          ,    TVParser ,    cc          ,    dt        ,    Type  ) {

  //--- Parser --------------------------------------------

  /* We use a derivative of the TrivialParser to parse filters.
   */  
  function Parser() { TVParser.apply(this, arguments); }
  
  Parser.prototype = new TVParser();

  //--- Namespace class ----------------------------------
    
  /* The top-level Namespace object represents the interface that will be wrapped.
   */
  function Namespace(parent) {
    this.parent      = parent;
    this.typedefs    = {};
    this.typedef     = this.typedefs; // alias;
    this._funcs      = {};
    this.function    = this._funcs; // alias
    this.constants   = {};
    this.constant    = this.constants; // alias
    this.classes     = {};
    this.classByName = this.classes; // alias
    this.namespaces  = {};
    this.namespace   = this.namespaces; // alias
  }
  
  // TODO: newTypedef(), lookupType(); both recursive
  
  Namespace.prototype.newTypedef = function(name, value) {
    var nsn = this._getNamespace(name);
    if (nsn) {
      return nsn.namespace.newTypedef(nsn.name, value);
    }
    else {
      this.typedefs[name] = value;
    }
  }
  
  Namespace.prototype.functions = function(filterspec) {
    var filter = filterspec ? parseFunctionFilter(filterspec) : function() { return true; };
    var list = [];
    _.each(this._funcs, function(func) { if (filter(func)) list.push(func); } );
    return list;
  }
  
  Namespace.prototype.newFunction = function(cdecl_name) { 
    var nsn = this._getNamespace(cdecl_name);
    if (nsn) {
      return nsn.namespace.newFunction(nsn.name);
    }
    else {    
      var func = new dt.Function(this, cdecl_name);
      this._funcs[cdecl_name] = func;
      return func;
    }
  }

  Namespace.prototype.removeFunction = function(func) { 
    if (this._funcs[func.cdecl_name]) delete this._funcs[func.cdecl_name]; 
  }
  
  Namespace.prototype.newConstant = function(cdecl_name) {
    var nsn = this._getNamespace(cdecl_name);
    if (nsn) {
      return nsn.namespace.newConstant(nsn.name);
    }
    else {
      var constant = new dt.Constant(this, cdecl_name);
      this.constants[cdecl_name] = constant;
      return constant;
    }
  }
  
  Namespace.prototype.removeConstant = function(constant) { 
    if (this.constants[constant.cdecl_name]) delete this.constants[constant.cdecl_name]; 
  }

  Namespace.prototype.newEnum = function(cdecl_name) {
    var nsn = this._getNamespace(name);
    if (nsn) {
      return nsn.namespace(nsn.name);
    }
    else {
      var enum_ = new dt.Enum(this, cdecl_name);
      this.enums[cdecl_name] = enum_;
      return enum_;
    }
  }
  
  Namespace.prototype.removeEnum = function(enum_) {
    if (this.enums[enum_.cdecl_name]) delete this.enums[enum_.cdecl_name];
  }
   
  Namespace.prototype.process = function(config) {
    
    if (config.init) config.init.call(this);
    _(this._funcs).each(config._funcs, this);
    _(this.constants).each(config.constants, this);
    
    this._orderClasses();

    // TODO: propagate to nested namespaces
    
    return this;
  }
  
  //--- INTERNAL ROUTINES -----------------------
  
  Namespace.prototype._orderClasses = function() {
    var self = this, classes = {};
    _.each(this.classes, addClass);
    this.classes = classes;

    function addClass(cls) {
      if (!classes[cls]) { 
        if (cls.derived_from) addClass(self.classes[cls.derived_from]); classes[cls.name] = cls; 
      }
    }
  }
  
  Namespace.prototype._getClass = function(name) {
    var nsn = this._getNamespace(name);
    if (nsn) {
      return nsn.namespace._getClass(nsn.name);
    }
    else {
      var theclass = this.classes[name];
      if (!theclass) theclass = this.classes[name] = new dt.Struct(name, this);
      return theclass;
    }
  }
  
  /**
    Note: _lookupTypedef() is currently() working under the assumption that SWIG
      always uses fully qualified typenames (e.g. "squish::u8" rather than just "u8")
      even if the type is being used within the namespace where it is defined.
    Note 2: _lookupTypedef() attempts repeated lookups until it fails, in order to
      support typedef chains. All but the first lookup are done against the root 
      namespace (again based on the assumption that SWIG fully qualifies all types).
   */
  Namespace.prototype._lookupTypedef = function(name) {
    
    var result, value = name, key = name, ns = this, rootns;
    
    while (true) {      
      //console.log(key, value, result);      
      result = value; // current lookup (or original type) becomes result            
      // If key refers to child ns, delegate; else lookup in present ns
      var nsn = ns._getNamespace(key);
      if (nsn) value = nsn.namespace._lookupTypedef(nsn.name);
      else     value = ns.typedefs[key];     
      // If lookup failed, current definition is final
      if (value === undefined) break;
      key = value; // current definition becomes key for next lookup
      if (!rootns) ns = rootns = getRootNS(ns); // all lookups after the first are relative to the root ns
    }
    
    return result;
    
    function getRootNS(ns) { var parent; while ((parent = ns.parent)) ns = parent; return ns; }
  }

  Namespace.prototype._getNamespace = function(name) {
    var p = name.indexOf('::');
    if (p >= 0) {
      console.assert(p > 0); // '::xyz' is a special case (global namespace) that should not occur
      var nsname = name.slice(0, p);
      var name = name.slice(p + 2);
      if (!this.namespaces[nsname]) {
        var ns = new Namespace(this);
        this.namespaces[nsname] = ns;
        return { name: name, namespace: ns };
      }
      else return { name: name, namespace: this.namespaces[nsname] };
    }
  }
  
  function parseFunctionFilter(filterspec) {  
    
    var parser = new Parser(filterspec);
    
    var filters = [];
    if (true)                                    filters.push( parseNameFilter()       );
    if (parser.peek() === '(') parser.consume(), filters.push( parseSignatureFilter()  ), parser.consume();
    if (parser.peek() === ':') parser.consume(), filters.push( parseReturnTypeFilter() );
    
    return andCombineFilters(filters);

    //----
    
    function parseNameFilter() {
      var pat = '';
      if (cc.isIdentifierStart(parser.peek()) || parser.peek(2) === '::') {
        while (!parser.atEnd() && (cc.isIdentifierPart(parser.peek()) || parser.peek(2) === '::')) {
          if      (cc.isAlnum(parser.peek())) pat += parser.consume();
          else if (parser.peek(2) === '::'  ) parser.consume(2), pat += '::';
          else if (parser.peek()  === '*'   ) parser.consume() , pat += '(.*)';
          else                                break;
        }
      }
      //console.log('name filter regexp: "' + pat + '"', pat.length);
      return pat.length > 0 ? function(func) { return func.name.match(new RegExp('^'+pat+'$')); } 
                            : function()     { return true; };
    }    
   
    function parseSignatureFilter() {
      var parm_descs = [], ending_varargs = false;
      while (parser.peek() !== ')') {
        if (ending_varargs) throw new Error('There can be no more argument descriptors after a "**" placeholder');
        var desc = parseArgDesc();
        parm_descs.push( desc );
        ending_varargs = (desc === '**');
        if (parser.peek() !== ',') break;
        parser.consume();  
      }
      if (parser.peek() !== ')') throw new Error('Cannot parse signature pattern: expected ")", got "'+parser.peek()+'"');
      return function(func) { 
        for (var i = 0; i < parm_descs.length; i++) {
          if (parm_descs[i] === '**') return true; // matches everything, including "no more parameters"
          if (i >= func.parm_list.length) return false;
          if (!checkParam(parm_descs[i], func.parm_list[i])) return false;
        }
        return func.parm_list.length === parm_descs.length;
        //------
        function checkParam(desc, parm) {
          //console.log('checkParam()', desc, parm);
          if (desc.name && desc.name !== parm.name) return false;
          if (desc.type && desc.type !=  parm.type) return false;
          return true;
        }
      };
      
      //------
      function parseArgDesc() {
        for (var desc = '', parens_level = 0; !(parens_level === 0 && parser.peek() === ')') && parser.peek() !== ','; desc += parser.consume()) {
          if      (parser.peek() === '(') parens_level ++;
          else if (parser.peek() === ')') parens_level --;
        }
        //console.log('desc:', desc);
        if      (desc === '*' ) return {};
        else if (desc === '**') return '**';
        var parts = desc.split(':');            
        return { name: parts[0], type: parts[1] };
      }
    }
    
    function parseReturnTypeFilter() {
      for (var type = ''; !parser.atEnd(); type += parser.consume());
      //console.log('parseReturnTypeFilter(), type ="'+type+'"');
      if (type === '') return function()     { return true; }
      else             return function(func) { return func.type == type; }
    }

    //---
    
    function andCombineFilters(filters) {
      return function(el) { for (var i = 0; i < filters.length; i ++) if (!filters[i](el)) return false; return true; };
    }
    
  }
  
  //--- EXPORTS ---
  
  return Namespace;
  
});