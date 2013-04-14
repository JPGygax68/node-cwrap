#ifndef __UTILS_H
#define __UTILS_H

#include <node.h>
#include <node_buffer.h>
#include <v8.h>

template <typename Elt> Elt *
getInputArray( v8::Handle<v8::Value> arg ) {
  return static_cast<Elt *>( arg->ToObject()->GetIndexedPropertiesExternalArrayData() );
}

v8::Local<v8::Object> 
makeArrayBuffer(const char *type_, unsigned int size_);

#endif // __UTILS_H
