"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module); }
define( function() {
return '#include <node.h>\n' +
'#include <node_buffer.h>\n' +
'#include <v8.h>\n' +
'\n' +
'#include <lsdisplay2/lsdisplay2.h>\n' +
'\n' +
'using namespace v8;\n' +
'\n' +
'//--- ERROR HANDLING ---\n' +
'\n' +
'static int  last_error = 0;\n' +
'static char error_data[1024];\n' +
'\n' +
'static bool\n' +
'checkForError() {\n' +
'  last_error = lsdspGetLastError(error_data, 1024);\n' +
'  return last_error != 0;\n' +
'}\n' +
'\n' +
'static Handle<Value>\n' +
'lastError(const char *context = nullptr) {\n' +
'  char buf[1024];\n' +
'  if (last_error == 0) checkForError();\n' +
'  lsdspGetErrorText(last_error, buf, 1024);\n' +
'  Local<String> text = String::New(buf);\n' +
'  if (context) {\n' +
'    text = String::Concat(text, String::New(" "));\n' +
'    text = String::Concat(text, String::New(context));\n' +
'  }\n' +
'  return ThrowException(Exception::Error(text));\n' +
'}\n' +
'\n' +
'{{$--- OBJECT WRAPPERS ---}}\n' +
'\n' +
'{{$forall classes}}\n' +
'class {{$=name}};\n' +
'{{$end classes}}\n' +
'\n' +
'{{$forall classes}}\n' +
'\n' +
'class {{$=name}} : public node::ObjectWrap {\n' +
'public:\n' +
'\n' +
'  static void          Init();\n' +
'  static Handle<Value> NewInstance({{$=name}} *);\n' +
'  \n' +
'  {{$=name}}(void *ptr): _ptr(ptr) {}\n' +
'  \n' +
'  void * handle() { return _ptr; }\n' +
'\n' +
'public:\n' +
'  static Persistent<FunctionTemplate> tpl;\n' +
'  static Persistent<Function> ctor;\n' +
'  \n' +
'  {{$forall static_methods}}\n' +
'  static Handle<Value> {{$=name}}(const Arguments& args);\n' +
'  {{$end static_methods }}\n' +
'\n' +
'private:\n' +
'  \n' +
'  {{$forall methods}}\n' +
'  static Handle<Value> {{$=name}}(const Arguments& args);\n' +
'  {{$end forall }}\n' +
'\n' +
'  ~{{$=name}}() {\n' +
'    {{$if destructor}}{{$=destructor.cdecl_name}}(_ptr);{{$end}}\n' +
'  }\n' +
'  \n' +
'  void * _ptr;\n' +
'};\n' +
'\n' +
'{{$end forall classes }}\n' +
'\n' +
'{{$forall classes}}\n' +
'\n' +
'Persistent<FunctionTemplate> {{$=name}}::tpl;\n' +
'Persistent<Function>         {{$=name}}::ctor;\n' +
'\n' +
'void\n' +
'{{$=name}}::Init() {\n' +
'  static bool init_done = false;\n' +
'  if (!init_done) {\n' +
'    {{$if derivedFrom}}\n' +
'    {{$=derivedFrom}}::Init();\n' +
'    {{$end}}\n' +
'    // Prepare ctor template\n' +
'    Local<FunctionTemplate> t = FunctionTemplate::New();\n' +
'    tpl = Persistent<FunctionTemplate>::New(t);\n' +
'    tpl->SetClassName(String::NewSymbol("{{$=name}}"));\n' +
'    tpl->InstanceTemplate()->SetInternalFieldCount(1);\n' +
'    // Static methods\n' +
'    {{$forall static_methods}}\n' +
'    tpl->Set(String::NewSymbol("{{$=name}}"), FunctionTemplate::New({{$=name}})->GetFunction());\n' +
'    {{$end}}\n' +
'    // Prototype\n' +
'    {{$forall methods}}\n' +
'    tpl->PrototypeTemplate()->Set(String::NewSymbol("{{$=name}}"), FunctionTemplate::New({{$=name}})->GetFunction());\n' +
'    {{$end}}\n' +
'    {{$if derivedFrom}}\n' +
'    // Parent class\n' +
'    tpl->Inherit({{$=derivedFrom}}::tpl); \n' +
'    {{$end}}\n' +
'    // Now create the constructor\n' +
'    ctor = Persistent<Function>::New(tpl->GetFunction());\n' +
'    init_done = true;\n' +
'  }\n' +
'}\n' +
'\n' +
'Handle<Value> \n' +
'{{$=name}}::NewInstance({{$=name}} *wrapper) {\n' +
'  HandleScope scope;\n' +
'\n' +
'  const unsigned argc = 1;\n' +
'  Handle<Value> argv[argc] = { External::New(wrapper) };\n' +
'  Local<Object> instance = ctor->NewInstance(argc, argv);\n' +
'  wrapper->Wrap(instance);\n' +
'\n' +
'  return scope.Close(instance);\n' +
'}\n' +
'\n' +
'{{$end forall classes}}\n' +
'\n' +
'{{$forall classes}}\n' +
'\n' +
'{{$forall static_methods}}\n' +
'\n' +
'Handle<Value> \n' +
'{{$=parent.name}}::{{$=name}}(const Arguments& args) {\n' +
'  HandleScope scope;\n' +
'\n' +
'  {{$call function_body}}\n' +
'}\n' +
'\n' +
'{{$end forall static_methods}}\n' +
'  \n' +
'{{$forall methods}}\n' +
'\n' +
'Handle<Value> \n' +
'{{$=parent.name}}::{{$=name}}(const Arguments& args) {\n' +
'  HandleScope scope;\n' +
'  \n' +
'  void * self = ObjectWrap::Unwrap<{{$=parent.name}}>(args.This())->handle();\n' +
'  \n' +
'  {{$call function_body}}\n' +
'}\n' +
'\n' +
'{{$end forall methods}}\n' +
'  \n' +
'{{$end forall classes}}\n' +
'\n' +
'{{$--- FUNCTIONS ---}}\n' +
'\n' +
'{{$forall functions}}\n' +
'\n' +
'Handle<Value>\n' +
'{{$=name}}(const Arguments& args) {\n' +
'  HandleScope scope;\n' +
'\n' +
'  {{$call function_body}}\n' +
'}\n' +
'\n' +
'{{$end forall functions}}\n' +
'\n' +
'static void init (v8::Handle<Object> target)\n' +
'{\n' +
'  {{$forall classes}}\n' +
'  {{$=name}}::Init();\n' +
'  {{$if exposed}}\n' +
'  target->Set(v8::String::NewSymbol("{{$=name}}"), {{$=name}}::ctor);\n' +
'  {{$end}}\n' +
'  {{$end}}\n' +
'  \n' +
'  {{$forall functions}}\n' +
'  NODE_SET_METHOD(target, "{{$=name}}", {{$=name}});\n' +
'  {{$end}}\n' +
'}\n' +
'\n' +
'NODE_MODULE({{$=name}}, init);\n' +
'\n' +
'{{$--------------------------------------------------------------------------------------------}}\n' +
'\n' +
'{{$macro function_body}}\n' +
'\n' +
'  {{$forall input_params}}\n' +
'  {{$if type != "void" && !is_self}}\n' +
'  {{$call extract_parameter}}\n' +
'  {{$end if}}\n' +
'  {{$end forall}}\n' +
'  \n' +
'  {{$forall output_params}}\n' +
'  {{$=out_type}} {{$=name}}{{$=out_dim || \'\'}};\n' +
'  {{$end forall}}\n' +
'  \n' +
'  {{$--- Call the function --- }}\n' +
'  {{$if type == "void"}}\n' +
'  {{$=cdecl_name}}({{$list params value_expr}});\n' +
'  {{$elsif type == "p.void"}}\n' +
'  {{$--- With return value type void *, nullptr signals error ---}}\n' +
'  {{$=ctype}} object = {{$=cdecl_name}}({{$list params value_expr}});\n' +
'  if (object == nullptr) return lastError("{{$=name}}");\n' +
'  {{$else}}\n' +
'  {{$--- With return value type int, negative values signal errors ---}}\n' +
'  {{$=ctype}} result = {{$=cdecl_name}}({{$list params value_expr}});\n' +
'  if (result < 0) return lastError("{{$=name}}");\n' +
'  {{$end if}}\n' +
'\n' +
'  {{$if retval_wrapper}}\n' +
'  {{$=retval_wrapper}} *wrapper = new {{$=retval_wrapper}}(object);  \n' +
'  return scope.Close( {{$=retval_wrapper}}::NewInstance(wrapper) );\n' +
'  {{$elsif map_outparams_to_retval}}\n' +
'  {{$--- Combine several output parameters into a result object ---}}\n' +
'  Local<Object> r = Object::New();\n' +
'  {{$forall output_params}}\n' +
'  r->Set(String::NewSymbol("{{$=name}}"), Integer::New({{$=name}}));\n' +
'  {{$--- TODO: other types than integer ---}}\n' +
'  {{$end forall}}  \n' +
'  return scope.Close(r);\n' +
'\n' +
'  {{$elsif return_charbuf_on_success}}\n' +
'  {{$--- Integer return code indicates success or failure, output parameter is string ---}}\n' +
'  if (result > 0) return scope.Close(String::New({{$=return_charbuf_name}}, {{$=return_charbuf_size}}));\n' +
'  else            return scope.Close(Undefined());\n' +
'  \n' +
'  {{$elsif type == "void"}}\n' +
'  \n' +
'  return scope.Close(Undefined());\n' +
'  \n' +
'  {{$else}}\n' +
'  \n' +
'  return scope.Close({{$=v8TypeWrapper(type)}}::New(result));\n' +
'  \n' +
'  {{$end if}}\n' +
'  \n' +
'{{$end macro}}\n' +
'\n' +
'{{$macro extract_parameter}}\n' +
'  {{$if type == \'p.q(const).char\'}}\n' +
'  Local<String> {{$=name}} = args[{{$=index}}]->ToString();\n' +
'  {{$elsif wrapper_class}}\n' +
'  void * {{$=name}} = ObjectWrap::Unwrap<{{$=wrapper_class}}>(args[{{$=index}}]->ToObject())->handle();\n' +
'  {{$elsif type == \'p.void\'}}\n' +
'  // TODO: void * parameter!\n' +
'  {{$else}}\n' +
'  {{$=ctype}} {{$=name}} = static_cast<{{$=ctype}}>( args[{{$=index}}]->{{$=v8TypeAccessor(type)}}() );\n' +
'  {{$end}}\n' +
'{{$end}}\n' +
'\n' +
'';
});