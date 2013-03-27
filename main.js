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

  intf.classes = { Display: { name: 'Display', methods: {} } };
    
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
        param.out_type = param.type.slice(5);
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
    else if (func.params.handle && func.params.handle.type === 'p.void' && func.params.handle.index === 0) {
      intf.classes['Display'].methods[func.name] = func;
      func.class_name = 'Display';
      func.params['handle'].is_self = true;
      _.each(func.params, function(param) { param.index --; });
      if (func.params['handle2']) func.params['handle2'].wrapper_class = 'Display';
      delete intf.functions[fname];
    }
    else if (['lsdspOpenGLScreen', 'lsdspOpenGLWindow2'].indexOf(fname) >= 0) {
      func.is_factory = true;
      func.class_name = 'Display';
    }
  });
  
  return intf;
  
  function beginsWith(s1, start) { return s1.slice(0, start.length) === start; }
}
