{{$forall functions}}

extern "C" {
  GLAPI {{$=type}} GLAPIENTRY {{$=name}}({{$list params type}});
}

Handle<Value>
{{$=name}}(const Arguments& args) {
  HandleScope scope;

  {{$forall params}}
  {{$if type != "void"}}
  {{$=type}} {{$=name}} = static_cast<{{$=type}}>( args[{{$=_index}}]->{{$=v8TypeWrapper(type)}}() );
  {{$end}}
  {{$end}}
  
  {{$if type == "void"}}
  {{$=name}}({{$list params name}});
  {{$else}}
  {{$=type}} result = {{$=name}}({{$list params name}});
  {{$end}}

  {{$if type == "void"}}
  return scope.Close(Undefined());
  {{$else}}
  return scope.Close({{$=v8TypeWrapper(type)}}::New(result));
  {{$end}}
}
{{$end}}