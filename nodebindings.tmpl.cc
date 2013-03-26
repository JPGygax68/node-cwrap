{{$forall functions}}

extern "C" {
  GLAPI {{$=type}} GLAPIENTRY {{$=name}}({{$list params ctype}});
}

Handle<Value>
{{$=name}}(const Arguments& args) {
  HandleScope scope;

  {{$forall input_params}}
  {{$if type != "void"}}
  {{$=ctype}} {{$=name}} = static_cast<{{$=ctype}}>( args[{{$=index}}]->{{$=v8TypeWrapper(type)}}() );
  {{$end if}}
  {{$end forall}}
  
  {{$forall output_params}}
  {{$=out_type}} {{$=name}};
  {{$end forall}}
  
  {{$if type == "void"}}
  {{$=name}}({{$list params name}});
  {{$else}}
  {{$=type}} result = {{$=name}}({{$list params input_expr}});
  {{$end}}

  {{$if map_outparams_to_retval}}
  Local<Object> r = Object::New();
  {{$forall output_params}}
  r->Set(String::NewSymbol("{{$=name}}"), Integer::New({{$=name}}));
  {{$end forall}}
  {{$end if}}
  
  {{$if type == "void"}}
  return scope.Close(Undefined());
  {{$else}}
  return scope.Close({{$=v8TypeWrapper(type)}}::New(result));
  {{$end}}
}
{{$end}}