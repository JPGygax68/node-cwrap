{{$forall functions}}

extern "C" {
  GLAPI {{$=type}} GLAPIENTRY {{$=name}}({{$list params type}});
}

Handle<Value>
{{$=name}}(const Arguments& args) {
  HandleScope scope;

  {{$foreach param}}
  {{$=type}} {{$=name}} = static_cast<{{$=type}}>( args[{{$=_index}}}}->{{$=typeConverterMethod}}() );
  {{$end}}
  
  {{$if type="void"}}
  gl{{$=name}}({{$list params name}});
  {{$else}}
  {{$=type}} {{$=name}} = gl{{$=name}}({{$list params name}});
  {{$end}}

  {{$if !type}}
  return scope.Close(Undefined());
  {{$else}}
  return scope.Close({{$=V8TypeWrapper(type)}}::New({{$=name}}));
  {{$end}}
}
{{$end}}