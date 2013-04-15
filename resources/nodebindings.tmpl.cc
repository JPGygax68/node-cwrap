#include <map>
#include <node.h>
#include <node_buffer.h>
#include <v8.h>
#include <utils.h>

#include <lsdisplay2/lsdisplay2.h>

using namespace v8;

//--- ERROR HANDLING ---

static int  last_error = 0;
static char error_data[1024];

static bool
checkForError() {
  last_error = lsdspGetLastError(error_data, 1024);
  return last_error != 0;
}

static Handle<Value>
lastError(const char *context = nullptr) {
  char buf[1024];
  if (last_error == 0) checkForError();
  lsdspGetErrorText(last_error, buf, 1024);
  Local<String> text = String::New(buf);
  if (context) {
    text = String::Concat(text, String::New(" "));
    text = String::Concat(text, String::New(context));
  }
  return ThrowException(Exception::Error(text));
}

{{$--- OBJECT WRAPPERS ---}}

{{$forall classes}}
class {{$=name}};
{{$end classes}}

{{$forall classes}}

class {{$=name}} : public node::ObjectWrap {
public:

  static void          Init();
  static Handle<Value> NewInstance({{$=name}} *);
  static {{$=name}} *  Create(void *ptr_);
  
  void * handle() { return _ptr; }

public:
  static Persistent<FunctionTemplate> tpl;
  static Persistent<Function> ctor;
  
  {{$forall static_methods}}
  static Handle<Value> {{$=name}}(const Arguments& args);
  {{$end static_methods }}

private:

  typedef std::map<void*, {{$=name}}*> wrapper_map_t;

  static wrapper_map_t wrapper_map;
  
  static void         Remove({{$=name}} *wrapper);

  {{$=name}}(void *ptr): _ptr(ptr) {}
  
  {{$if constructors.length > 0}}
  static Handle<Value> NewHandler(const Arguments& args);
  {{$end}}
  
  {{$forall methods}}
  static Handle<Value> {{$=name}}(const Arguments& args);
  {{$end forall }}

  ~{{$=name}}() {
    {{$if destructor}}{{$=destructor.cdecl_name}}(_ptr);{{$end}}
    Remove(this);
  }
  
  void * _ptr;
};

{{$end forall classes }}

{{$forall classes}}

{{$=name}}::wrapper_map_t {{$=name}}::wrapper_map;

Persistent<FunctionTemplate> {{$=name}}::tpl;
Persistent<Function>         {{$=name}}::ctor;

{{$=name}} *
{{$=name}}::Create(void *ptr_) {
  {{$=name}} *wrapper = new {{$=name}}(ptr_);
  wrapper_map[ptr_] = wrapper;
  return wrapper;
}

void
{{$=name}}::Remove({{$=name}} *wrapper) {
  wrapper_map.erase(wrapper->handle());
}

void
{{$=name}}::Init() {
  static bool init_done = false;
  if (!init_done) {
    {{$if derivedFrom}}
    {{$=derivedFrom}}::Init();
    {{$end}}
    // Prepare ctor template
    Local<FunctionTemplate> t = FunctionTemplate::New({{$if constructors.length > 0}}NewHandler{{$end}});
    tpl = Persistent<FunctionTemplate>::New(t);
    tpl->SetClassName(String::NewSymbol("{{$=name}}"));
    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    // Static methods
    {{$forall static_methods}}
    tpl->Set(String::NewSymbol("{{$=name}}"), FunctionTemplate::New({{$=name}})->GetFunction());
    {{$end}}
    // Prototype
    {{$forall methods}}
    tpl->PrototypeTemplate()->Set(String::NewSymbol("{{$=name}}"), FunctionTemplate::New({{$=name}})->GetFunction());
    {{$end}}
    {{$if derivedFrom}}
    // Parent class
    tpl->Inherit({{$=derivedFrom}}::tpl); 
    {{$end}}
    // Now create the constructor
    ctor = Persistent<Function>::New(tpl->GetFunction());
    init_done = true;
  }
}

{{$if constructors.length > 0}}

{{$forall constructors}}

Handle<Value> 
{{$=class.name}}::NewHandler(const Arguments& args) {

  {{$call function_body}}

  Window *wrapper = Create(object);  
  wrapper->Wrap(args.This());
  
  return args.This();
}

{{$end}}

{{$end}}

Handle<Value> 
{{$=name}}::NewInstance({{$=name}} *wrapper) {
  HandleScope scope;

  const unsigned argc = 1;
  Handle<Value> argv[argc] = { External::New(wrapper) };
  Local<Object> instance = ctor->NewInstance(argc, argv);
  wrapper->Wrap(instance);

  return scope.Close(instance);
}

{{$end forall classes}}

{{$forall classes}}

{{$forall static_methods}}

Handle<Value> 
{{$=parent.name}}::{{$=name}}(const Arguments& args) {
  HandleScope scope;

  {{$call function_body}}
  {{$call function_retval}}
}

{{$end forall static_methods}}
  
{{$forall methods}}

Handle<Value> 
{{$=parent.name}}::{{$=name}}(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<{{$=parent.name}}>(args.This())->handle();
  
  {{$call function_body}}
  {{$call function_retval}}
}

{{$end forall methods}}
  
{{$end forall classes}}

{{$--- FUNCTIONS ---}}

{{$forall functions}}

Handle<Value>
{{$=name}}(const Arguments& args) {
  HandleScope scope;

  {{$call function_body}}
  {{$call function_retval}}
}

{{$end forall functions}}

static void 
init (v8::Handle<Object> target)
{
  {{$forall classes}}
  {{$=name}}::Init();
  {{$if exposed}}
  target->Set(v8::String::NewSymbol("{{$=name}}"), {{$=name}}::ctor);
  {{$end}}
  {{$end}}
  
  {{$forall functions}}
  NODE_SET_METHOD(target, "{{$=name}}", {{$=name}});
  {{$end}}
}

NODE_MODULE({{$=name}}, init);

{{$--------------------------------------------------------------------------------------------}}

{{$macro function_body}}

  {{$forall input_params}}
  {{$if type != "void" && !is_self}}
  {{$call extract_parameter}}
  {{$end if}}
  {{$end forall}}
  
  {{$forall output_params}}
  {{$=out_type}} {{$=name}}{{$=out_dim || ''}};
  {{$end forall}}
  
  {{$--- Call the function --- }}
  {{$if type == "void"}}
  {{$=cdecl_name}}({{$list params value_expr}});
  {{$elsif type == "p.void"}}
  {{$--- With return value type void *, nullptr signals error ---}}
  {{$=ctype}} object = {{$=cdecl_name}}({{$list params value_expr}});
  {{$if nullptr_retval_allowed}}
  if (object == nullptr) return scope.Close(Undefined());
  {{$else}}
  if (object == nullptr) return lastError("{{$=name}}");
  {{$end}}
  {{$else}}
  {{$--- With return value type int, negative values signal errors ---}}
  {{$=ctype}} result = {{$=cdecl_name}}({{$list params value_expr}});
  if (result < 0) return lastError("{{$=name}}");
  {{$end if}}
  
{{$end function_body}}

{{$macro function_retval}}

  {{$if retval_wrapper}}
  {{$=retval_wrapper}} *wrapper = {{$=retval_wrapper}}::Create(object);  
  return scope.Close( {{$=retval_wrapper}}::NewInstance(wrapper) );
  {{$elsif map_outparams_to_retval}}
  {{$--- Combine several output parameters into a result object ---}}
  Local<Object> r = Object::New();
  {{$forall output_params}}
  r->Set(String::NewSymbol("{{$=name}}"), Integer::New({{$=name}}));
  {{$--- TODO: other types than integer ---}}
  {{$end forall}}  
  return scope.Close(r);

  {{$elsif return_charbuf_on_success}}
  {{$--- Integer return code indicates success or failure, output parameter is string ---}}
  if (result > 0) return scope.Close(String::New({{$=return_charbuf_name}}, {{$=return_charbuf_size}}));
  else            return scope.Close(Undefined());
  
  {{$elsif type == "void"}}
  
  return scope.Close(Undefined());
  
  {{$else}}
  
  return scope.Close({{$=v8TypeWrapper(type)}}::New(result));
  
  {{$end if}}
  
{{$end function_retval}}

{{$macro extract_parameter}}
  {{$if type == 'p.q(const).char'}}
  Local<String> {{$=name}} = args[{{$=index}}]->ToString();
  {{$elsif wrapper_class}}
  void * {{$=name}} = ObjectWrap::Unwrap<{{$=wrapper_class}}>(args[{{$=index}}]->ToObject())->handle();
  {{$elsif type == 'p.void'}}
  // TODO: void * parameter!
  {{$else}}
  {{$=ctype}} {{$=name}} = static_cast<{{$=ctype}}>( args[{{$=index}}]->{{$=v8TypeAccessor(type)}}() );
  {{$end}}
{{$end}}
