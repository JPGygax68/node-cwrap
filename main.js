"use strict";

var fs    = require('q-io/fs');
var cwrap = require('./cwrap');

var input_path = process.argv[2];

fs.read(input_path)
  .then( function(xml ) { return cwrap.parseXml(xml ) } )
  .then( function(intf) { return cwrap.generate(intf); } );
