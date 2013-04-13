module.exports = function(grunt) {
  
  // Project configuration.
  grunt.initConfig({
    
    pkg: grunt.file.readJSON('package.json'),
    
    text2amd: {
      templates: { src: [ 'nodebindings.tmpl.cc' ],  dest: 'nodebindings.tmpl.cc.js' }
    }
    
  }); // initConfig
  
  grunt.loadNpmTasks('grunt-text2amd');
}
