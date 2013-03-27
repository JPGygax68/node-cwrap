//--- ERROR HANDLING ---

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

class {{$=name}} : public node::ObjectWrap {
public:

  static void          Init();
  static Handle<Value> NewInstance({{$=name}} *);
  
  {{$=name}}(void *ptr): _ptr(ptr) {}
  
private:
  static Persistent<Function>   constructor;
  {{$forall methods}}
  static Handle<Value> {{$=name}}(const Arguments& args);
  {{$end forall }}

  ~{{$=name}}() {
    {{$=factory.name}}(_ptr);
  }
  
  void * handle() const { return _ptr; }

  void * _ptr;
};

Persistent<Function> {{$=name}}::constructor;

void
{{$=name}}::Init() { // Handle<Object> exports) {
  // Prepare constructor template
  Local<FunctionTemplate> tpl = FunctionTemplate::New();
  tpl->SetClassName(String::NewSymbol("{{$=name}}"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  // Prototype
  {{$forall methods}}
  tpl->PrototypeTemplate()->Set(String::NewSymbol("{{$=name}}"), FunctionTemplate::New({{$=name}})->GetFunction());
  {{$end}}

  constructor = Persistent<Function>::New(tpl->GetFunction());
}

Handle<Value> 
{{$=name}}::NewInstance({{$=name}} *wrapper) {
  HandleScope scope;

  const unsigned argc = 1;
  Handle<Value> argv[argc] = { External::New(wrapper) };
  Local<Object> instance = constructor->NewInstance(argc, argv);
  wrapper->Wrap(instance);

  return scope.Close(instance);
}

{{$forall methods}}

Handle<Value> 
{{$=class_name}}::{{$=name}}(const Arguments& args) {
  HandleScope scope;
  {{$=class_name}} *wrapper = ObjectWrap::Unwrap<{{$=class_name}}>(args.This());
  
  {{$call function_body}}
}

{{$end forall methods}}
  
{{$end forall classes}}

{{$--- FUNCTIONS ---}}

{{$forall functions}}

extern "C" {
  GLAPI {{$=ctype}} GLAPIENTRY {{$=name}}({{$list params ctype}});
}

Handle<Value>
{{$=name}}(const Arguments& args) {
  HandleScope scope;

  {{$call function_body}}
}

{{$end forall functions}}

{{$--------------------------------------------------------------------------------------------}}

{{$macro function_body}}

  {{$forall input_params}}
  {{$if type != "void" && !is_self}}
  {{$call extract_parameter}}
  {{$end if}}
  {{$end forall}}
  
  {{$forall output_params}}
  {{$=out_type}} {{$=name}};
  {{$end forall}}
  
  {{$--- We support void, void *, and int return values ---}}
  {{$if type == "void"}}
  lsdsp{{$=name}}({{$list params name}});
  {{$elsif type == "p.void"}}
  {{$--- With return value type void *, nullptr signals error ---}}
  {{$=ctype}} object = lsdsp{{$=name}}({{$list params input_expr}});
  if (object == nullptr) return lastError();
  {{$else}}
  {{$--- With return value type int, negative values signal errors ---}}
  {{$=ctype}} result = lsdsp{{$=name}}({{$list params input_expr}});
  if (result < 0) return lastError();
  {{$end if}}

  {{$--- If this is a factory function, wrap the resulting pointer ---}}
  {{$if is_factory }}
  {{$=class_name}} *wrapper = new {{$=class_name}}(object);  
  return scope.Close( {{$=class_name}}::NewInstance(wrapper) );

  {{$elsif map_outparams_to_retval}}
  Local<Object> r = Object::New();
  
  {{$forall output_params}}
  r->Set(String::NewSymbol("{{$=name}}"), Integer::New({{$=name}}));  
  {{$end forall}}
  
  return scope.close(r);
  
  {{$elsif type == "void"}}
  
  return scope.Close(Undefined());
  
  {{$else}}
  
  return scope.Close({{$=v8TypeWrapper(type)}}::New(result));
  
  {{$end if}}
  
{{$end macro}}

{{$macro extract_parameter}}
  {{$if type == 'p.q(const).char'}}
  Local<String> {{$=name}}_str = args[{{$=index}}]->ToString();
  const char * {{$=name}} = * String::Utf8Value({{$=name}}_str);
  {{$else}}
  {{$=ctype}} {{$=name}} = static_cast<{{$=ctype}}>( args[{{$=index}}]->{{$=v8TypeWrapper(type)}}() );
  {{$end}}
{{$end}}