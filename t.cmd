@echo off
swig -xml test/lsdisplay2.i
node main.js test/lsdisplay2_wrap.xml
