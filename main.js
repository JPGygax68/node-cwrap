"use strict";

var fs    = require('q-io/fs');
var cwrap = require('./cwrap');
var _     = require('underscore');

var input_path = process.argv[2];

fs.read(input_path)
  .then( function(xml ) { return cwrap.parseXml(xml ); } )
  .then( function(intf) { return postProcess   (intf); } )
  .then( function(intf) { return cwrap.generate(intf); } )
  ;

//---------

function postProcess(intf) {

  _.each(intf.functions, function(func, fname) {
    
    if      (func.type === 'int'   ) func.returns_error_code  = true;
    else if (func.type === 'p.void') func.returns_object_ptr  = true;
    
    func.output_params = {}, func.input_params = {};
    var count = 0;
    _.each(func.params, function(param, pname) {
      if (beginsWith(param.type, 'a(1)')) {
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
     
  });
  
  return intf;
  
  function beginsWith(s1, start) { return s1.slice(0, start.length) === start; }
}
