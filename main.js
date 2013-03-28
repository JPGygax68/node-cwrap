"use strict";

var fs    = require('q-io/fs');
var cwrap = require('./cwrap');
var _     = require('underscore');

var input_path  = process.argv[2];
var output_path = process.argv[3];

fs.read(input_path)
  .then( function(xml ) { return cwrap.parseSwigXml(xml );              } )
  .then( function(intf) { return postProcess       (intf);              } )
  .then( function(intf) { return generateToFile    (intf, output_path); } )
  .done();

//---------

function postProcess(intf) {

  intf.classes = { };
    
  _.each(intf.functions, function(func, fname) {
    
    //console.log(fname, func.type);
    
    if (['lsdspGetLastError', 'lsdspGetErrorText'].indexOf(fname) >= 0) { delete intf.functions[fname]; return; }
    
    if      (func.type === 'int'   ) func.returns_error_code  = true;
    else if (func.type === 'p.void') func.returns_object_ptr  = true;
    
    // Convert functions to methods, pointers to wrapper objects
    
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
    else if (/^lsdsp.*Control.*$/.test(fname)) {
      // These functions must be mapped as methods of more than one wrapper class
      functionToMethod(func, 'Button', fname, 'ctl');
      functionToMethod(func, 'DirectoryListBox', fname, 'ctl');
    }
    else if (fname === 'lsdspCreateButton' || fname === 'lsdspDirectoryListBoxCreate') {
      func.output_class = 'Control';
    }
    else if (beginsWith(fname, 'lsdspDirectoryListBox')) {
      functionToMethod(func, 'Control', fname, 'dlb');
    }
    else if (fname === 'lsdspGetNextEvent') {
      func.output_class = 'Event';
    }
    else if (func.params.evt && func.params.evt.type === 'p.void' && func.params.evt.index === 0) {
      functionToMethod(func, 'Event', fname, 'evt');
    }
    
    // Map returned pointers to wrapper classes
    
    if      (fname === 'lsdspEventTarget'           ) func.output_class = 'Display';
    else if (fname === 'lsdspGetFont'               ) func.output_class = 'Font';
    else if (fname === 'lsdspCreateButton'          ) func.output_class = 'Button';
    else if (fname === 'lsdspDirectoryListBoxCreate') func.output_class = 'DirectoryListBox';

    // Remove the namespacing prefix from the function name
    
    if (beginsWith(func.name, 'lsdsp')) func.name = func.name.slice(5);
    else console.warn('Function "'+func.name+'" does not have the "lsdsp" namespacing prefix');
    
    // Classify parameters as input or output
    
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

    // Specific adjustments to parameters
    if (fname === 'lsdspDirectoryListBoxGetSelectedFilePath') {
      var param1 = func.input_params['buffer'], param2 = func.input_params['bsize'];
      param1.out_type = 'char', param1.out_dim = '[1024]';
      param2.input_expr = '1024';
      func.output_params['buffer'] = param1;
      func.return_charbuf_on_success = true;
      func.return_charbuf_name = 'buffer';
      func.return_charbuf_size = 1024;
      delete func.input_params['buffer'];
      delete func.input_params['bsize'];
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
    if (intf.functions[fname]) delete intf.functions[fname];
  }
}

function generateToFile(intf, path) {
  return fs.open(path, 'w')
    .then( function(writer) { 
      return cwrap.generate(intf, function(frag) { writer.write(frag); } ); 
    });
}