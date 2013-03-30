"use strict";

var fs    = require('q-io/fs');
var _     = require('underscore');
var cwrap = require('cwrap');

var module_name = process.argv[2];
var input_path  = process.argv[3];
var output_path = process.argv[4];

fs.read(input_path)
  .then( function(xml ) { return cwrap.parseSwigXml(xml );              } )
  .then( function(intf) { return postProcess       (intf);              } )
  .then( function(intf) { return generateToFile    (intf, output_path); } )
  .done();

//---------

function postProcess(intf) {

  intf.name = module_name;
  
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
      functionToMethod(func, 'Button', fname, 'ctl'); // TODO: control hierarchy
      //functionToMethod(func, 'DirectoryListBox', fname, 'ctl');
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
    else if (func.params.font && func.params.font.type === 'p.void' && func.params.font.index === 0) {
      functionToMethod(func, 'Font', fname, 'font');
    }
    else if (func.params.btn && func.params.btn.type === 'p.void' && func.params.btn.index === 0) {
      functionToMethod(func, 'Button', fname, 'btn');
    }
    
    // Map returned pointers to wrapper classes
    
    if      (fname === 'lsdspEventTarget'           ) getClass((func.output_class = 'Display'));
    else if (fname === 'lsdspGetFont'               ) getClass((func.output_class = 'Font'));
    else if (fname === 'lsdspCreateButton'          ) getClass((func.output_class = 'Button'));
    else if (fname === 'lsdspDirectoryListBoxCreate') getClass((func.output_class = 'DirectoryListBox'));

    // Remove the namespacing prefix from the function name
    
    if (beginsWith(func.name, 'lsdsp')) func.name = func.name.slice(5);
    else console.warn('Function "'+func.name+'" does not have the "lsdsp" namespacing prefix');
    
    // Classify parameters as input or output; other adjustments
    
    func.output_params = {}, func.input_params = {};
    var remapped = 0;
    _.each(func.params, function(param, pname) {
      if (beginsWith(param.type, 'a(1)') || param.type === 'p.unsigned int' || param.type === 'p.int') {
        func.output_params[pname] = param; 
        param.out_type = beginsWith(param.type, 'p.') ? param.type.slice(2) : param.type.slice(5);
        if (!param.value_expr) param.value_expr = '&' + pname;
        remapped ++;
      }
      else {
        func.input_params[pname] = param;
        if (param.type === 'p.q(const).char') param.value_expr = '* String::Utf8Value('+param.name+')';
        if (!param.value_expr) param.value_expr = pname;
      }
      if (param.name === 'font') param.wrapper_class = 'Font';
    });
    if (remapped > 0 && !func.returns_object_ptr) func.map_outparams_to_retval = true;

    // Specific adjustments to parameters
    
    if (fname === 'lsdspDirectoryListBoxGetSelectedFilePath') {
      var param1 = func.input_params['buffer'], param2 = func.input_params['bsize'];
      param1.out_type = 'char', param1.out_dim = '[1024]';
      param2.value_expr = '1024';
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
    var theclass = getClass(class_name);
    func.class_name = class_name;
    func.params[self_name].is_self = true;
    _.each(func.params, function(param) { if (param.index === 0) { param.value_expr = 'self'; } param.index --; } );
    if (intf.functions[fname]) delete intf.functions[fname];
    theclass.methods[func.name] = func;
  }
  
  function getClass(class_name) {
    var theclass = intf.classes[class_name];
    if (!theclass) theclass = intf.classes[class_name] = { name: class_name, methods: {} };
    return theclass;
  }
}

function generateToFile(intf, path) {
  return fs.open(path, 'w')
    .then( function(writer) { 
      return cwrap.generate(intf, function(frag) { writer.write(frag); } ); 
    });
}