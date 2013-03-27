"use strict";

var fs    = require('q-io/fs');
var cwrap = require('./cwrap');
var _     = require('underscore');

var input_path = process.argv[2];

fs.read(input_path)
  .then( function(xml ) { return cwrap.parseSwigXml(xml ); } )
  .then( function(intf) { return postProcess       (intf); } )
  .then( function(intf) { return cwrap.generate    (intf); } )
  ;

//---------

function postProcess(intf) {

  intf.classes = { };
    
  _.each(intf.functions, function(func, fname) {
    
    //console.log(fname, func.type);
    
    if      (func.type === 'int'   ) func.returns_error_code  = true;
    else if (func.type === 'p.void') func.returns_object_ptr  = true;
    
    // Remove the namespacing prefix from the function name
    if (beginsWith(func.name, 'lsdsp')) func.name = func.name.slice(5);
    else console.warn('Function "'+func.name+'" does not have the "lsdsp" namespacing prefix');
    
    func.output_params = {}, func.input_params = {};
    var count = 0;
    _.each(func.params, function(param, pname) {
      if (beginsWith(param.type, 'a(1)') || param.type === 'p.unsigned int' || param.type === 'p.int') {
        func.output_params[pname] = param; 
        param.out_type = beginsWith(param.type, 'p.') ? param.type.slice(2) : param.type.slice(5);
        param.input_expr = '&' + pname;
        count ++;
      }
      else {
        func.input_params[pname] = param;
        param.input_expr = pname;
      }
    });
    if (count > 0 && !func.returns_object_ptr) func.map_outparams_to_retval = true;
    
    // Convert functions to methods
    if (['lsdspCloseGLWindow', 'lsdspCloseGLScreen'].indexOf(fname) >= 0) {
      intf.classes['Display'].factory = func;
      delete intf.functions[fname];
    }
    else if (func.params.disp && func.params.disp.type === 'p.void' && func.params.disp.index === 0) {
      functionToMethod(func, 'Display', fname, 'disp');
      if (func.params['disp2']) func.params['disp2'].wrapper_class = 'Display';
    }
    else if (['lsdspOpenGLScreen', 'lsdspOpenGLWindow2'].indexOf(fname) >= 0) {
      func.output_class = 'Display';
    }
    
    if (fname === 'lsdspGetFont') {
      func.output_class = 'Font';
    }
    
    if (fname === 'lsdspCreateButton' || fname === 'lsdspDirectoryListBoxCreate') {
      func.output_class = 'Control';
    }
    
    if (fname === 'lsdspGetNextEvent') {
      func.output_class = 'Event';
    }
    else if (func.params.evt && func.params.evt.type === 'p.void' && func.params.evt.index === 0) {
      functionToMethod(func, 'Event', fname, 'evt');
    }
    
  });
  
  return intf;

  //---------
  
  function beginsWith(s1, start) { return s1.slice(0, start.length) === start; }
  
  function functionToMethod(func, class_name, fname, self_name) {
    if (!intf.classes[class_name]) intf.classes[class_name] = { name: class_name, methods: {} };
    intf.classes[class_name].methods[func.name] = func;
    func.class_name = class_name;
    func.params[self_name].is_self = true;
    _.each(func.params, function(param) { param.index --; });
    delete intf.functions[fname];
  }
}
