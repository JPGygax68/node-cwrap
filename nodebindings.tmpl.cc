{{$forall functions}}

extern "C" {
  GLAPI {{$=type}} GLAPIENTRY {{$=name}}({{$list params type}});
}

Handle<Value>
{{$=name}}(const Arguments& args) {
  HandleScope scope;

  {{$foreach param}}
  {{$=type}} {{$=name}} = static_cast<{{$=type}}>( args[{{$=_index}}}}->{{$=converterMethod(type)}}() );
  {{$end}}
  
  {{$if type="void"}}
  {{$=name}}({{$list params name}});
  {{$else}}
  {{$=type}} {{$=name}} = {{$=name}}({{$list params name}});
  {{$end}}

  {{$if !type}}
  return scope.Close(Undefined());
  {{$else}}
  return scope.Close({{$=v8TypeWrapper(type)}}::New({{$=name}}));
  {{$end}}
}
{{$end}}