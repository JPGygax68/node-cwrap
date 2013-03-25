@echo off
swig -xml test/lsdisplay2.i
node main2.js test/lsdisplay2_wrap.xml
