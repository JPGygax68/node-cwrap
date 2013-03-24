{{$forall functions}}

extern "C" {
  GLAPI {{$=retval.type}} GLAPIENTRY {{$=name}}({{$list params type}});
}

Handle<Value>
{{$=name}}(const Arguments& args) {
  HandleScope scope;

  {{$foreach param}}
  {{$=type}} {{$=name}} = static_cast<{{$=type}}>( args[{{$=_index}}}}->{{$=typeConverterMethod}}() );
  {{$end}}
  
  {{$if !retval.type}}
  gl{{$=name}}({{$list params name}});
  {{$else}}
  {{$=retval.type}} {{$=retval.name}} = gl{{$=name}}({{$list params name}});
  {{$end}}

  {{$if !retval.type}}
  return scope.Close(Undefined());
  {{$else}}
  return scope.Close({{$=V8TypeWrapper(retval.type)}}::New({{$=retval.name}}));
  {{$end}}
}
{{$end}}