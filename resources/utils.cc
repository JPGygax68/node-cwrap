#include <map>
#include <string>

#include "utils.h"

using namespace v8;
using namespace node;
using namespace std;

Local<Object> 
makeArrayBuffer(const char *type_, unsigned int size_) 
{
  static map<string, Persistent<Function>> constructors;
  
  Persistent<Function> ctor;
  string type(type_);
  
  auto it = constructors.find(type);
  if (it == constructors.end()) {
    Local<Object> global = Context::GetCurrent()->Global();
    Local<Value> val = global->Get(String::New(type_));
    assert(!val.IsEmpty() && "array buffer constructor not found");
    assert(val->IsFunction() && "not a constructor");
    ctor = Persistent<Function>::New(val.As<Function>());
    constructors.insert( pair<string, Persistent<Function>>(type, ctor) );
  }
  else ctor = it->second;

  Local<Value> size = Integer::NewFromUnsigned(size_);
  return ctor->NewInstance(1, &size);
}
