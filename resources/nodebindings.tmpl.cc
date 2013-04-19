#include <map>
#include <cassert>
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

{{$--- CLASS DECLARATIONS ----------------------}}

{{$forall classes}}
class {{$=name}};
{{$end classes}}

{{$forall classes}}
{{$call class_declaration}}
{{$end forall classes }}

{{$--- CLASS METHODS ---------------------------}}

{{$forall classes}}

{{$--- CLASS INITIALIZATION ---}}

void
{{$=name}}::Init() {
  static bool init_done = false;
  if (!init_done) {
    {{$if derived_from}}
    {{$=derived_from}}::Init();
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
    // Methods (through prototype)
    {{$forall methods}}
    tpl->PrototypeTemplate()->Set(String::NewSymbol("{{$=name}}"), FunctionTemplate::New({{$=name}})->GetFunction());
    {{$end}}
    // Constants (through prototype)
    {{$forall constants}}
    {{$call class_constant}}
    {{$end}}
    {{$if derived_from}}
    // Parent class
    tpl->Inherit({{$=derived_from}}::tpl); 
    {{$end}}
    // Now create the constructor
    ctor = Persistent<Function>::New(tpl->GetFunction());
    init_done = true;
  }
}

{{$--- WRAPPER MAP (base classes only) ---}}

{{$if !derived_from}}
{{$=name}}::wrapper_map_t {{$=name}}::wrapper_map;

void
{{$=name}}::Remove({{$=name}} *wrapper) {
  wrapper_map.erase(wrapper->handle());
}
{{$end}}

{{$--- GET WRAPPER ---}}

{{$=name}} *
{{$=name}}::GetWrapper(void *object) {
  wrapper_map_t::iterator it = wrapper_map.find(object);
  if (it != wrapper_map.end()) return static_cast<{{$=name}}*>(it->second);
  {{$=name}} *wrapper = new {{$=name}}(object);
  wrapper_map[object] = static_cast<base_type*>(wrapper);
  return wrapper;
}

Persistent<FunctionTemplate> {{$=name}}::tpl;
Persistent<Function>         {{$=name}}::ctor;

{{$if constructors.length > 0}}
{{$forall constructors}}

Handle<Value> 
{{$=class.name}}::NewHandler(const Arguments& args) {
  // std::cerr << "{{$=class.name}}::NewHandler" << std::endl;
  {{$call function_body}}
  assert(wrapper_map.find(object) == wrapper_map.end());
  {{$=class.name}} *wrapper = new {{$=class.name}}(object);
  wrapper_map[object] = wrapper;
  wrapper->Wrap(args.This());  
  return args.This();
}

{{$end all constructors}}
{{$end if has constructors}}

Handle<Value> 
{{$=name}}::GetInstance(void *object) {
  HandleScope scope;

  if (wrapper_map.find(object) != wrapper_map.end()) {
    // std::cerr << "{{$=name}}::GetInstance: object already wrapped" << std::endl;
    return wrapper_map[object]->handle_;
  }
  else {  
    // std::cerr << "{{$=name}}::GetInstance: creating new wrapper" << std::endl;
    {{$=name}} *wrapper = new {{$=name}}(object);
    wrapper_map[object] = wrapper;
    const unsigned argc = 1;
    Handle<Value> argv[argc] = { External::New(wrapper) };
    Local<Object> instance = ctor->NewInstance(argc, argv);
    wrapper->Wrap(instance);
    return scope.Close(instance);
  }
}

{{$end forall classes}}

{{$--- STATIC METHODS -------------------------------------}}

{{$forall classes}}

{{$forall static_methods}}

Handle<Value> 
{{$=parent.name}}::{{$=name}}(const Arguments& args) {
  HandleScope scope;

  {{$call function_body}}
  {{$call function_retval}}
}

{{$end forall static_methods}}

{{$--- METHODS --------------------------------------------}}

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

//--- GLOBAL FUNCTIONS --------------------------------------

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
  
  {{$forall constants}}
  {{$call global_constant}}
  {{$end}}
  
  {{$forall functions}}
  NODE_SET_METHOD(target, "{{$=name}}", {{$=name}});
  {{$end}}
}

NODE_MODULE({{$=name}}, init);

{{$--------------------------------------------------------------------------------------------}}

{{$macro class_declaration}}

class {{$=name}} : public {{$if derived_from}}{{$=derived_from}}{{$else}}node::ObjectWrap{{$end}} {
public:

  static void Init();
  static {{$=name}} * GetWrapper(void *object);
  static Handle<Value> GetInstance(void *object);

  {{$if !derived_from}}
  void * handle() { return _ptr; }
  {{$end}}

public:
  static Persistent<FunctionTemplate> tpl;
  static Persistent<Function> ctor;

  {{$forall static_methods}}
  static Handle<Value> {{$=name}}(const Arguments& args);
  {{$end static_methods }}

protected:

  {{$if !derived_from}}
  typedef {{$=name}} base_type;
  static void Remove({{$=name}} *wrapper);
  {{$end}}

  virtual ~{{$=name}}() {
    {{$if destructor}}
    {{$=destructor.cdecl_name}}(handle());
    {{$end}}
    {{$if !derived_from}}
    Remove(this);
    {{$end}}
  }

  {{$if !derived_from}}
  typedef std::map<void*, {{$=name}}*> wrapper_map_t;
  static wrapper_map_t wrapper_map;
  {{$end}}

  {{$=name}}(void *ptr): {{$if derived_from}}{{$=derived_from}}(ptr){{$else}}node::ObjectWrap(), _ptr(ptr){{$end}} { }

private:

  {{$if constructors.length > 0}}
  static Handle<Value> NewHandler(const Arguments& args);
  {{$end}}

  {{$forall methods}}
  static Handle<Value> {{$=name}}(const Arguments& args);
  {{$end forall }}

  {{$if !derived_from}}
  void * _ptr;
  {{$end}}
};

{{$end class_declaration}}

{{$macro function_body ------------------------------------}}

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

{{$end macro function_body}}

{{$macro function_retval ----------------------------------}}

  {{$if retval_wrapper}}

  return scope.Close( {{$=retval_wrapper}}::GetInstance(object) );

  {{$elsif map_outparams_to_retval}}

  // Combine several output parameters into a result object
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

{{$end macro function_retval}}

{{$macro extract_parameter --------------------------------}}
  {{$if type == 'p.q(const).char'}}
  Local<String> {{$=name}} = args[{{$=index}}]->ToString();
  {{$elsif wrapper_class}}
  void * {{$=name}} = ObjectWrap::Unwrap<{{$=wrapper_class}}>(args[{{$=index}}]->ToObject())->handle();
  {{$elsif type == 'p.void'}}
  // TODO: void * parameter!
  {{$else}}
  {{$=ctype}} {{$=name}} = static_cast<{{$=ctype}}>( args[{{$=index}}]->{{$=v8TypeAccessor(type)}}() );
  {{$end}}
{{$end macro extract_parameter}}

{{$macro class_constant -----------------------------------}}
  {{$if type == 'int'}}
  tpl->Set(String::NewSymbol("{{$=name}}"), Integer::New({{$=value}}) );
  {{$end}}
{{$end}}

{{$macro global_constant ----------------------------------}}
  {{$if type == 'int'}}
  target->Set(String::NewSymbol("{{$=name}}"), Integer::New({{$=value}}) );
  {{$end}}
{{$end}}