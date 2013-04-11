#include <node.h>
#include <node_buffer.h>
#include <v8.h>

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
  
  {{$=name}}(void *ptr): _ptr(ptr) {}
  
  void * handle() { return _ptr; }

public:
  static Persistent<FunctionTemplate> tpl;
  
private:
  static Persistent<Function> ctor;
  
  {{$forall methods}}
  static Handle<Value> {{$=name}}(const Arguments& args);
  {{$end forall }}

  ~{{$=name}}() {
    {{$if destructor}}{{$=destructor.cdecl_name}}(_ptr);{{$end}}
  }
  
  void * _ptr;
};

{{$end forall classes }}

{{$forall classes}}

Persistent<FunctionTemplate> {{$=name}}::tpl;
Persistent<Function>         {{$=name}}::ctor;

void
{{$=name}}::Init() {
  static bool init_done = false;
  if (!init_done) {
    {{$if derivedFrom}}
    {{$=derivedFrom}}::Init();
    {{$end}}
    // Prepare ctor template
    Local<FunctionTemplate> t = FunctionTemplate::New();
    tpl = Persistent<FunctionTemplate>::New(t);
    tpl->SetClassName(String::NewSymbol("{{$=name}}"));
    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    // Prototype
    {{$forall methods}}
    tpl->PrototypeTemplate()->Set(String::NewSymbol("{{$=name}}"), FunctionTemplate::New({{$=name}})->GetFunction());
    {{$end}}
    ctor = Persistent<Function>::New(tpl->GetFunction());
    {{$if derivedFrom}}
    tpl->Inherit({{$=derivedFrom}}::tpl); 
    {{$end}}
    init_done = true;
  }
}

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

{{$forall methods}}

Handle<Value> 
{{$=parent.name}}::{{$=name}}(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<{{$=parent.name}}>(args.This())->handle();
  
  {{$call function_body}}
}

{{$end forall methods}}
  
{{$end forall classes}}

{{$--- FUNCTIONS ---}}

{{$forall functions}}

Handle<Value>
{{$=name}}(const Arguments& args) {
  HandleScope scope;

  {{$call function_body}}
}

{{$end forall functions}}

static void init (v8::Handle<Object> target)
{
  {{$forall classes}}
  {{$=name}}::Init();
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
  {{$=out_type}} {{$=name}}{{$=out_dim ||''}};
  {{$end forall}}
  
  {{$--- Call the function --- }}
  {{$if type == "void"}}
  {{$=cdecl_name}}({{$list params value_expr}});
  {{$elsif type == "p.void"}}
  {{$--- With return value type void *, nullptr signals error ---}}
  {{$=ctype}} object = {{$=cdecl_name}}({{$list params value_expr}});
  if (object == nullptr) return lastError("{{$=name}}");
  {{$else}}
  {{$--- With return value type int, negative values signal errors ---}}
  {{$=ctype}} result = {{$=cdecl_name}}({{$list params value_expr}});
  if (result < 0) return lastError("{{$=name}}");
  {{$end if}}

  {{$if retval_wrapper }}
  {{$--- If this is a factory function, wrap the resulting pointer ---}}
  {{$=retval_wrapper}} *wrapper = new {{$=retval_wrapper}}(object);  
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
  
{{$end macro}}

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