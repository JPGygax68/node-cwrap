@echo off
::
:: Call SWIG with the -xml switch to generate an XML file, then call
:: CWrap to do the rest (filter/convert to JSON, annotate, apply the
:: template).
::
swig -xml lsdisplay2.i
node generate.js lsdisplay2 lsdisplay2_wrap.xml lsdisplay2_wrap.cc
