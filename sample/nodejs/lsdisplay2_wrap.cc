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

class Display : public node::ObjectWrap {
public:

  static void          Init();
  static Handle<Value> NewInstance(Display *);
  
  Display(void *ptr): _ptr(ptr) {}
  
  void * handle() { return _ptr; }

private:
  static Persistent<Function>   constructor;
  static Handle<Value> SetSourceRate(const Arguments& args);
  static Handle<Value> DisplayGood(const Arguments& args);
  static Handle<Value> GetWindowInnerSize(const Arguments& args);
  static Handle<Value> ChangeWindowTitle(const Arguments& args);
  static Handle<Value> ChangeScreenTitle(const Arguments& args);
  static Handle<Value> SelectGLScreen(const Arguments& args);
  static Handle<Value> SelectGLWindow(const Arguments& args);
  static Handle<Value> SwapBuffers(const Arguments& args);
  static Handle<Value> SharingContexts(const Arguments& args);
  static Handle<Value> GetFont(const Arguments& args);
  static Handle<Value> PrepareFor2D(const Arguments& args);
  static Handle<Value> DisplayIn2DMode(const Arguments& args);
  static Handle<Value> Done2D(const Arguments& args);
  static Handle<Value> DrawTextA(const Arguments& args);
  static Handle<Value> DrawText2(const Arguments& args);
  static Handle<Value> CreateButton(const Arguments& args);
  static Handle<Value> DirectoryListBoxCreate(const Arguments& args);
  static Handle<Value> RenderUI(const Arguments& args);
  static Handle<Value> DrawTestBitmap(const Arguments& args);
  ~Display() {
    lsdspCloseGLWindow(_ptr);  }
  
  void * _ptr;
};

Persistent<Function> Display::constructor;

void
Display::Init() {
  // Prepare constructor template
  Local<FunctionTemplate> tpl = FunctionTemplate::New();
  tpl->SetClassName(String::NewSymbol("Display"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  // Prototype
  tpl->PrototypeTemplate()->Set(String::NewSymbol("SetSourceRate"), FunctionTemplate::New(SetSourceRate)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("DisplayGood"), FunctionTemplate::New(DisplayGood)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("GetWindowInnerSize"), FunctionTemplate::New(GetWindowInnerSize)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("ChangeWindowTitle"), FunctionTemplate::New(ChangeWindowTitle)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("ChangeScreenTitle"), FunctionTemplate::New(ChangeScreenTitle)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("SelectGLScreen"), FunctionTemplate::New(SelectGLScreen)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("SelectGLWindow"), FunctionTemplate::New(SelectGLWindow)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("SwapBuffers"), FunctionTemplate::New(SwapBuffers)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("SharingContexts"), FunctionTemplate::New(SharingContexts)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("GetFont"), FunctionTemplate::New(GetFont)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("PrepareFor2D"), FunctionTemplate::New(PrepareFor2D)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("DisplayIn2DMode"), FunctionTemplate::New(DisplayIn2DMode)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("Done2D"), FunctionTemplate::New(Done2D)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("DrawTextA"), FunctionTemplate::New(DrawTextA)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("DrawText2"), FunctionTemplate::New(DrawText2)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("CreateButton"), FunctionTemplate::New(CreateButton)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("DirectoryListBoxCreate"), FunctionTemplate::New(DirectoryListBoxCreate)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("RenderUI"), FunctionTemplate::New(RenderUI)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("DrawTestBitmap"), FunctionTemplate::New(DrawTestBitmap)->GetFunction());
  constructor = Persistent<Function>::New(tpl->GetFunction());
}

Handle<Value> 
Display::NewInstance(Display *wrapper) {
  HandleScope scope;

  const unsigned argc = 1;
  Handle<Value> argv[argc] = { External::New(wrapper) };
  Local<Object> instance = constructor->NewInstance(argc, argv);
  wrapper->Wrap(instance);

  return scope.Close(instance);
}

class Event : public node::ObjectWrap {
public:

  static void          Init();
  static Handle<Value> NewInstance(Event *);
  
  Event(void *ptr): _ptr(ptr) {}
  
  void * handle() { return _ptr; }

private:
  static Persistent<Function>   constructor;
  static Handle<Value> EventType(const Arguments& args);
  static Handle<Value> EventTarget(const Arguments& args);
  static Handle<Value> DecodeKeyEvent(const Arguments& args);
  static Handle<Value> GetMouseEventCoords(const Arguments& args);
  static Handle<Value> GetMouseButtonAction(const Arguments& args);
  ~Event() {
      }
  
  void * _ptr;
};

Persistent<Function> Event::constructor;

void
Event::Init() {
  // Prepare constructor template
  Local<FunctionTemplate> tpl = FunctionTemplate::New();
  tpl->SetClassName(String::NewSymbol("Event"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  // Prototype
  tpl->PrototypeTemplate()->Set(String::NewSymbol("EventType"), FunctionTemplate::New(EventType)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("EventTarget"), FunctionTemplate::New(EventTarget)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("DecodeKeyEvent"), FunctionTemplate::New(DecodeKeyEvent)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("GetMouseEventCoords"), FunctionTemplate::New(GetMouseEventCoords)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("GetMouseButtonAction"), FunctionTemplate::New(GetMouseButtonAction)->GetFunction());
  constructor = Persistent<Function>::New(tpl->GetFunction());
}

Handle<Value> 
Event::NewInstance(Event *wrapper) {
  HandleScope scope;

  const unsigned argc = 1;
  Handle<Value> argv[argc] = { External::New(wrapper) };
  Local<Object> instance = constructor->NewInstance(argc, argv);
  wrapper->Wrap(instance);

  return scope.Close(instance);
}

class Font : public node::ObjectWrap {
public:

  static void          Init();
  static Handle<Value> NewInstance(Font *);
  
  Font(void *ptr): _ptr(ptr) {}
  
  void * handle() { return _ptr; }

private:
  static Persistent<Function>   constructor;
  static Handle<Value> TextExtentsA(const Arguments& args);
  ~Font() {
      }
  
  void * _ptr;
};

Persistent<Function> Font::constructor;

void
Font::Init() {
  // Prepare constructor template
  Local<FunctionTemplate> tpl = FunctionTemplate::New();
  tpl->SetClassName(String::NewSymbol("Font"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  // Prototype
  tpl->PrototypeTemplate()->Set(String::NewSymbol("TextExtentsA"), FunctionTemplate::New(TextExtentsA)->GetFunction());
  constructor = Persistent<Function>::New(tpl->GetFunction());
}

Handle<Value> 
Font::NewInstance(Font *wrapper) {
  HandleScope scope;

  const unsigned argc = 1;
  Handle<Value> argv[argc] = { External::New(wrapper) };
  Local<Object> instance = constructor->NewInstance(argc, argv);
  wrapper->Wrap(instance);

  return scope.Close(instance);
}

class Button : public node::ObjectWrap {
public:

  static void          Init();
  static Handle<Value> NewInstance(Button *);
  
  Button(void *ptr): _ptr(ptr) {}
  
  void * handle() { return _ptr; }

private:
  static Persistent<Function>   constructor;
  static Handle<Value> SetControlDisabled(const Arguments& args);
  static Handle<Value> DeleteControl(const Arguments& args);
  static Handle<Value> RetrieveButtonClicks(const Arguments& args);
  static Handle<Value> SetButtonCaption(const Arguments& args);
  ~Button() {
      }
  
  void * _ptr;
};

Persistent<Function> Button::constructor;

void
Button::Init() {
  // Prepare constructor template
  Local<FunctionTemplate> tpl = FunctionTemplate::New();
  tpl->SetClassName(String::NewSymbol("Button"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  // Prototype
  tpl->PrototypeTemplate()->Set(String::NewSymbol("SetControlDisabled"), FunctionTemplate::New(SetControlDisabled)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("DeleteControl"), FunctionTemplate::New(DeleteControl)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("RetrieveButtonClicks"), FunctionTemplate::New(RetrieveButtonClicks)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("SetButtonCaption"), FunctionTemplate::New(SetButtonCaption)->GetFunction());
  constructor = Persistent<Function>::New(tpl->GetFunction());
}

Handle<Value> 
Button::NewInstance(Button *wrapper) {
  HandleScope scope;

  const unsigned argc = 1;
  Handle<Value> argv[argc] = { External::New(wrapper) };
  Local<Object> instance = constructor->NewInstance(argc, argv);
  wrapper->Wrap(instance);

  return scope.Close(instance);
}

class DirectoryListBox : public node::ObjectWrap {
public:

  static void          Init();
  static Handle<Value> NewInstance(DirectoryListBox *);
  
  DirectoryListBox(void *ptr): _ptr(ptr) {}
  
  void * handle() { return _ptr; }

private:
  static Persistent<Function>   constructor;
  ~DirectoryListBox() {
      }
  
  void * _ptr;
};

Persistent<Function> DirectoryListBox::constructor;

void
DirectoryListBox::Init() {
  // Prepare constructor template
  Local<FunctionTemplate> tpl = FunctionTemplate::New();
  tpl->SetClassName(String::NewSymbol("DirectoryListBox"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  // Prototype
  constructor = Persistent<Function>::New(tpl->GetFunction());
}

Handle<Value> 
DirectoryListBox::NewInstance(DirectoryListBox *wrapper) {
  HandleScope scope;

  const unsigned argc = 1;
  Handle<Value> argv[argc] = { External::New(wrapper) };
  Local<Object> instance = constructor->NewInstance(argc, argv);
  wrapper->Wrap(instance);

  return scope.Close(instance);
}

class Control : public node::ObjectWrap {
public:

  static void          Init();
  static Handle<Value> NewInstance(Control *);
  
  Control(void *ptr): _ptr(ptr) {}
  
  void * handle() { return _ptr; }

private:
  static Persistent<Function>   constructor;
  static Handle<Value> DirectoryListBoxRetrieveCloseCount(const Arguments& args);
  static Handle<Value> DirectoryListBoxGetSelectedFilePath(const Arguments& args);
  ~Control() {
      }
  
  void * _ptr;
};

Persistent<Function> Control::constructor;

void
Control::Init() {
  // Prepare constructor template
  Local<FunctionTemplate> tpl = FunctionTemplate::New();
  tpl->SetClassName(String::NewSymbol("Control"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  // Prototype
  tpl->PrototypeTemplate()->Set(String::NewSymbol("DirectoryListBoxRetrieveCloseCount"), FunctionTemplate::New(DirectoryListBoxRetrieveCloseCount)->GetFunction());
  tpl->PrototypeTemplate()->Set(String::NewSymbol("DirectoryListBoxGetSelectedFilePath"), FunctionTemplate::New(DirectoryListBoxGetSelectedFilePath)->GetFunction());
  constructor = Persistent<Function>::New(tpl->GetFunction());
}

Handle<Value> 
Control::NewInstance(Control *wrapper) {
  HandleScope scope;

  const unsigned argc = 1;
  Handle<Value> argv[argc] = { External::New(wrapper) };
  Local<Object> instance = constructor->NewInstance(argc, argv);
  wrapper->Wrap(instance);

  return scope.Close(instance);
}

Handle<Value> 
Display::SetSourceRate(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  unsigned int num = static_cast<unsigned int>( args[0]->Uint32Value() );
  unsigned int denom = static_cast<unsigned int>( args[1]->Uint32Value() );
  int result = lsdspSetSourceRate(self, num, denom);
  if (result < 0) return lastError("SetSourceRate");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::DisplayGood(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int result = lsdspDisplayGood(self);
  if (result < 0) return lastError("DisplayGood");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::GetWindowInnerSize(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  unsigned int width;
  unsigned int height;
  int result = lsdspGetWindowInnerSize(self, &width, &height);
  if (result < 0) return lastError("GetWindowInnerSize");
  Local<Object> r = Object::New();
  r->Set(String::NewSymbol("width"), Integer::New(width));
  r->Set(String::NewSymbol("height"), Integer::New(height));
  return scope.Close(r);

}

Handle<Value> 
Display::ChangeWindowTitle(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  Local<String> title_str = args[0]->ToString();
  const char * title = * String::Utf8Value(title_str);
  int result = lsdspChangeWindowTitle(self, title);
  if (result < 0) return lastError("ChangeWindowTitle");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::ChangeScreenTitle(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  Local<String> title_str = args[0]->ToString();
  const char * title = * String::Utf8Value(title_str);
  int result = lsdspChangeScreenTitle(self, title);
  if (result < 0) return lastError("ChangeScreenTitle");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::SelectGLScreen(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int result = lsdspSelectGLScreen(self);
  if (result < 0) return lastError("SelectGLScreen");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::SelectGLWindow(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int result = lsdspSelectGLWindow(self);
  if (result < 0) return lastError("SelectGLWindow");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::SwapBuffers(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int result = lsdspSwapBuffers(self);
  if (result < 0) return lastError("SwapBuffers");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::SharingContexts(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  void * disp2 = ObjectWrap::Unwrap<Display>(args[0]->ToObject())->handle();
  int result = lsdspSharingContexts(self, disp2);
  if (result < 0) return lastError("SharingContexts");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::GetFont(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int type = static_cast<int>( args[0]->Int32Value() );
  Local<String> family_str = args[1]->ToString();
  const char * family = * String::Utf8Value(family_str);
  unsigned int height = static_cast<unsigned int>( args[2]->Uint32Value() );
  unsigned int attribs = static_cast<unsigned int>( args[3]->Uint32Value() );
  void * object = lsdspGetFont(self, type, family, height, attribs);
  if (object == nullptr) return lastError("GetFont");
  Font *wrapper = new Font(object);  
  return scope.Close( Font::NewInstance(wrapper) );

}

Handle<Value> 
Display::PrepareFor2D(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int result = lsdspPrepareFor2D(self);
  if (result < 0) return lastError("PrepareFor2D");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::DisplayIn2DMode(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int result = lsdspDisplayIn2DMode(self);
  if (result < 0) return lastError("DisplayIn2DMode");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::Done2D(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int result = lsdspDone2D(self);
  if (result < 0) return lastError("Done2D");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::DrawTextA(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  void * font = ObjectWrap::Unwrap<Font>(args[0]->ToObject())->handle();
  int x = static_cast<int>( args[1]->Int32Value() );
  int y = static_cast<int>( args[2]->Int32Value() );
  Local<String> text_str = args[3]->ToString();
  const char * text = * String::Utf8Value(text_str);
  int result = lsdspDrawTextA(self, font, x, y, text);
  if (result < 0) return lastError("DrawTextA");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::DrawText2(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  void * font = ObjectWrap::Unwrap<Font>(args[0]->ToObject())->handle();
  int x = static_cast<int>( args[1]->Int32Value() );
  int y = static_cast<int>( args[2]->Int32Value() );
  Local<String> text_str = args[3]->ToString();
  const char * text = * String::Utf8Value(text_str);
  unsigned int options = static_cast<unsigned int>( args[4]->Uint32Value() );
  int result = lsdspDrawText2(self, font, x, y, text, options);
  if (result < 0) return lastError("DrawText2");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::CreateButton(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int x = static_cast<int>( args[0]->Int32Value() );
  int y = static_cast<int>( args[1]->Int32Value() );
  int w = static_cast<int>( args[2]->Int32Value() );
  int h = static_cast<int>( args[3]->Int32Value() );
  Local<String> caption_str = args[4]->ToString();
  const char * caption = * String::Utf8Value(caption_str);
  int click_counter;
  void * object = lsdspCreateButton(self, x, y, w, h, caption, &click_counter);
  if (object == nullptr) return lastError("CreateButton");
  Button *wrapper = new Button(object);  
  return scope.Close( Button::NewInstance(wrapper) );

}

Handle<Value> 
Display::DirectoryListBoxCreate(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int x = static_cast<int>( args[0]->Int32Value() );
  int y = static_cast<int>( args[1]->Int32Value() );
  int w = static_cast<int>( args[2]->Int32Value() );
  int h = static_cast<int>( args[3]->Int32Value() );
  Local<String> folder_path_str = args[4]->ToString();
  const char * folder_path = * String::Utf8Value(folder_path_str);
  Local<String> filters_str = args[5]->ToString();
  const char * filters = * String::Utf8Value(filters_str);
  int select_accum;
  void * object = lsdspDirectoryListBoxCreate(self, x, y, w, h, folder_path, filters, &select_accum);
  if (object == nullptr) return lastError("DirectoryListBoxCreate");
  DirectoryListBox *wrapper = new DirectoryListBox(object);  
  return scope.Close( DirectoryListBox::NewInstance(wrapper) );

}

Handle<Value> 
Display::RenderUI(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int result = lsdspRenderUI(self);
  if (result < 0) return lastError("RenderUI");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Display::DrawTestBitmap(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Display>(args.This())->handle();
  
  int x = static_cast<int>( args[0]->Int32Value() );
  int y = static_cast<int>( args[1]->Int32Value() );
  int result = lsdspDrawTestBitmap(self, x, y);
  if (result < 0) return lastError("DrawTestBitmap");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Event::EventType(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Event>(args.This())->handle();
  
  int result = lsdspEventType(self);
  if (result < 0) return lastError("EventType");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Event::EventTarget(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Event>(args.This())->handle();
  
  void * object = lsdspEventTarget(self);
  if (object == nullptr) return lastError("EventTarget");
  Display *wrapper = new Display(object);  
  return scope.Close( Display::NewInstance(wrapper) );

}

Handle<Value> 
Event::DecodeKeyEvent(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Event>(args.This())->handle();
  
  int type;
  int code;
  int dir;
  int result = lsdspDecodeKeyEvent(self, &type, &code, &dir);
  if (result < 0) return lastError("DecodeKeyEvent");
  Local<Object> r = Object::New();
  r->Set(String::NewSymbol("type"), Integer::New(type));
  r->Set(String::NewSymbol("code"), Integer::New(code));
  r->Set(String::NewSymbol("dir"), Integer::New(dir));
  return scope.Close(r);

}

Handle<Value> 
Event::GetMouseEventCoords(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Event>(args.This())->handle();
  
  int x;
  int y;
  int result = lsdspGetMouseEventCoords(self, &x, &y);
  if (result < 0) return lastError("GetMouseEventCoords");
  Local<Object> r = Object::New();
  r->Set(String::NewSymbol("x"), Integer::New(x));
  r->Set(String::NewSymbol("y"), Integer::New(y));
  return scope.Close(r);

}

Handle<Value> 
Event::GetMouseButtonAction(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Event>(args.This())->handle();
  
  int button;
  int dir;
  int result = lsdspGetMouseButtonAction(self, &button, &dir);
  if (result < 0) return lastError("GetMouseButtonAction");
  Local<Object> r = Object::New();
  r->Set(String::NewSymbol("button"), Integer::New(button));
  r->Set(String::NewSymbol("dir"), Integer::New(dir));
  return scope.Close(r);

}

Handle<Value> 
Font::TextExtentsA(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Font>(args.This())->handle();
  
  Local<String> text_str = args[0]->ToString();
  const char * text = * String::Utf8Value(text_str);
  unsigned int len = static_cast<unsigned int>( args[1]->Uint32Value() );
  int ascent;
  int descent;
  unsigned int width;
  int result = lsdspTextExtentsA(self, text, len, &ascent, &descent, &width);
  if (result < 0) return lastError("TextExtentsA");
  Local<Object> r = Object::New();
  r->Set(String::NewSymbol("ascent"), Integer::New(ascent));
  r->Set(String::NewSymbol("descent"), Integer::New(descent));
  r->Set(String::NewSymbol("width"), Integer::New(width));
  return scope.Close(r);

}

Handle<Value> 
Button::SetControlDisabled(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Button>(args.This())->handle();
  
  int state = static_cast<int>( args[0]->Int32Value() );
  int result = lsdspSetControlDisabled(self, state);
  if (result < 0) return lastError("SetControlDisabled");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Button::DeleteControl(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Button>(args.This())->handle();
  
  int result = lsdspDeleteControl(self);
  if (result < 0) return lastError("DeleteControl");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Button::RetrieveButtonClicks(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Button>(args.This())->handle();
  
  int result = lsdspRetrieveButtonClicks(self);
  if (result < 0) return lastError("RetrieveButtonClicks");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Button::SetButtonCaption(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Button>(args.This())->handle();
  
  Local<String> caption_str = args[0]->ToString();
  const char * caption = * String::Utf8Value(caption_str);
  int result = lsdspSetButtonCaption(self, caption);
  if (result < 0) return lastError("SetButtonCaption");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Control::DirectoryListBoxRetrieveCloseCount(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Control>(args.This())->handle();
  
  int result = lsdspDirectoryListBoxRetrieveCloseCount(self);
  if (result < 0) return lastError("DirectoryListBoxRetrieveCloseCount");
  return scope.Close(Int32::New(result));
  
}

Handle<Value> 
Control::DirectoryListBoxGetSelectedFilePath(const Arguments& args) {
  HandleScope scope;
  
  void * self = ObjectWrap::Unwrap<Control>(args.This())->handle();
  
  char buffer[1024];
  int result = lsdspDirectoryListBoxGetSelectedFilePath(self, buffer, 1024);
  if (result < 0) return lastError("DirectoryListBoxGetSelectedFilePath");
  if (result > 0) return scope.Close(String::New(buffer, 1024));
  else            return scope.Close(Undefined());
  
}

Handle<Value>
NumberOfScreens(const Arguments& args) {
  HandleScope scope;

  int result = lsdspNumberOfScreens();
  if (result < 0) return lastError("NumberOfScreens");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
GetScreenInfo(const Arguments& args) {
  HandleScope scope;

  int screen = static_cast<int>( args[0]->Int32Value() );
  int x;
  int y;
  unsigned int w;
  unsigned int h;
  int result = lsdspGetScreenInfo(screen, &x, &y, &w, &h);
  if (result < 0) return lastError("GetScreenInfo");
  Local<Object> r = Object::New();
  r->Set(String::NewSymbol("x"), Integer::New(x));
  r->Set(String::NewSymbol("y"), Integer::New(y));
  r->Set(String::NewSymbol("w"), Integer::New(w));
  r->Set(String::NewSymbol("h"), Integer::New(h));
  return scope.Close(r);

}

Handle<Value>
OpenGLScreen(const Arguments& args) {
  HandleScope scope;

  int screen = static_cast<int>( args[0]->Int32Value() );
  unsigned int options = static_cast<unsigned int>( args[1]->Uint32Value() );
  void * object = lsdspOpenGLScreen(screen, options);
  if (object == nullptr) return lastError("OpenGLScreen");
  Display *wrapper = new Display(object);  
  return scope.Close( Display::NewInstance(wrapper) );

}

Handle<Value>
OpenGLWindow2(const Arguments& args) {
  HandleScope scope;

  unsigned int screen = static_cast<unsigned int>( args[0]->Uint32Value() );
  int x = static_cast<int>( args[1]->Int32Value() );
  int y = static_cast<int>( args[2]->Int32Value() );
  unsigned int w = static_cast<unsigned int>( args[3]->Uint32Value() );
  unsigned int h = static_cast<unsigned int>( args[4]->Uint32Value() );
  Local<String> caption_str = args[5]->ToString();
  const char * caption = * String::Utf8Value(caption_str);
  void * object = lsdspOpenGLWindow2(screen, x, y, w, h, caption);
  if (object == nullptr) return lastError("OpenGLWindow2");
  Display *wrapper = new Display(object);  
  return scope.Close( Display::NewInstance(wrapper) );

}

Handle<Value>
RestoreOriginalContext(const Arguments& args) {
  HandleScope scope;

  int result = lsdspRestoreOriginalContext();
  if (result < 0) return lastError("RestoreOriginalContext");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
SelectCoordinateConversions(const Arguments& args) {
  HandleScope scope;

  int coords = static_cast<int>( args[0]->Int32Value() );
  int mouse = static_cast<int>( args[1]->Int32Value() );
  int result = lsdspSelectCoordinateConversions(coords, mouse);
  if (result < 0) return lastError("SelectCoordinateConversions");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
GetNextEvent(const Arguments& args) {
  HandleScope scope;

  void * object = lsdspGetNextEvent();
  if (object == nullptr) return lastError("GetNextEvent");
  Event *wrapper = new Event(object);  
  return scope.Close( Event::NewInstance(wrapper) );

}

Handle<Value>
GetMetaKeyStates(const Arguments& args) {
  HandleScope scope;

  int result = lsdspGetMetaKeyStates();
  if (result < 0) return lastError("GetMetaKeyStates");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
SaveFontCache(const Arguments& args) {
  HandleScope scope;

  Local<String> path_str = args[0]->ToString();
  const char * path = * String::Utf8Value(path_str);
  int result = lsdspSaveFontCache(path);
  if (result < 0) return lastError("SaveFontCache");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
LoadFontCache(const Arguments& args) {
  HandleScope scope;

  Local<String> path_str = args[0]->ToString();
  const char * path = * String::Utf8Value(path_str);
  int result = lsdspLoadFontCache(path);
  if (result < 0) return lastError("LoadFontCache");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
CreateAndSelectFBO(const Arguments& args) {
  HandleScope scope;

  int id = static_cast<int>( args[0]->Int32Value() );
  unsigned int width = static_cast<unsigned int>( args[1]->Uint32Value() );
  unsigned int height = static_cast<unsigned int>( args[2]->Uint32Value() );
  unsigned int options = static_cast<unsigned int>( args[3]->Uint32Value() );
  int result = lsdspCreateAndSelectFBO(id, width, height, options);
  if (result < 0) return lastError("CreateAndSelectFBO");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
DoneFBO(const Arguments& args) {
  HandleScope scope;

  int id = static_cast<int>( args[0]->Int32Value() );
  int result = lsdspDoneFBO(id);
  if (result < 0) return lastError("DoneFBO");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
InitPerformanceFunctions(const Arguments& args) {
  HandleScope scope;

  int result = lsdspInitPerformanceFunctions();
  if (result < 0) return lastError("InitPerformanceFunctions");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
ShutdownPerformanceFunctions(const Arguments& args) {
  HandleScope scope;

  int result = lsdspShutdownPerformanceFunctions();
  if (result < 0) return lastError("ShutdownPerformanceFunctions");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
BeginPerformanceExperiment(const Arguments& args) {
  HandleScope scope;

  int result = lsdspBeginPerformanceExperiment();
  if (result < 0) return lastError("BeginPerformanceExperiment");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
BeginExperimentPass(const Arguments& args) {
  HandleScope scope;

  int pass_ = static_cast<int>( args[0]->Int32Value() );
  int result = lsdspBeginExperimentPass(pass_);
  if (result < 0) return lastError("BeginExperimentPass");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
EndExperimentPass(const Arguments& args) {
  HandleScope scope;

  int pass_ = static_cast<int>( args[0]->Int32Value() );
  int result = lsdspEndExperimentPass(pass_);
  if (result < 0) return lastError("EndExperimentPass");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
EndPerformanceExperiment(const Arguments& args) {
  HandleScope scope;

  int result = lsdspEndPerformanceExperiment();
  if (result < 0) return lastError("EndPerformanceExperiment");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
SampleAndRenderStats(const Arguments& args) {
  HandleScope scope;

  int result = lsdspSampleAndRenderStats();
  if (result < 0) return lastError("SampleAndRenderStats");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
DebugWrite(const Arguments& args) {
  HandleScope scope;

  Local<String> line_str = args[0]->ToString();
  const char * line = * String::Utf8Value(line_str);
  int result = lsdspDebugWrite(line);
  if (result < 0) return lastError("DebugWrite");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
RenderDebugOutput(const Arguments& args) {
  HandleScope scope;

  int result = lsdspRenderDebugOutput();
  if (result < 0) return lastError("RenderDebugOutput");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
OpenGLErrorReporting(const Arguments& args) {
  HandleScope scope;

  int option = static_cast<int>( args[0]->Int32Value() );
  int result = lsdspOpenGLErrorReporting(option);
  if (result < 0) return lastError("OpenGLErrorReporting");
  return scope.Close(Int32::New(result));
  
}

Handle<Value>
RecordDwmTiming(const Arguments& args) {
  HandleScope scope;

  int quantity = static_cast<int>( args[0]->Int32Value() );
  Local<String> path_str = args[1]->ToString();
  const char * path = * String::Utf8Value(path_str);
  int result = lsdspRecordDwmTiming(quantity, path);
  if (result < 0) return lastError("RecordDwmTiming");
  return scope.Close(Int32::New(result));
  
}

static void init (v8::Handle<Object> target)
{
  Display::Init();
  Event::Init();
  Font::Init();
  Button::Init();
  DirectoryListBox::Init();
  Control::Init();
  NODE_SET_METHOD(target, "NumberOfScreens", NumberOfScreens);
  NODE_SET_METHOD(target, "GetScreenInfo", GetScreenInfo);
  NODE_SET_METHOD(target, "OpenGLScreen", OpenGLScreen);
  NODE_SET_METHOD(target, "OpenGLWindow2", OpenGLWindow2);
  NODE_SET_METHOD(target, "RestoreOriginalContext", RestoreOriginalContext);
  NODE_SET_METHOD(target, "SelectCoordinateConversions", SelectCoordinateConversions);
  NODE_SET_METHOD(target, "GetNextEvent", GetNextEvent);
  NODE_SET_METHOD(target, "GetMetaKeyStates", GetMetaKeyStates);
  NODE_SET_METHOD(target, "SaveFontCache", SaveFontCache);
  NODE_SET_METHOD(target, "LoadFontCache", LoadFontCache);
  NODE_SET_METHOD(target, "CreateAndSelectFBO", CreateAndSelectFBO);
  NODE_SET_METHOD(target, "DoneFBO", DoneFBO);
  NODE_SET_METHOD(target, "InitPerformanceFunctions", InitPerformanceFunctions);
  NODE_SET_METHOD(target, "ShutdownPerformanceFunctions", ShutdownPerformanceFunctions);
  NODE_SET_METHOD(target, "BeginPerformanceExperiment", BeginPerformanceExperiment);
  NODE_SET_METHOD(target, "BeginExperimentPass", BeginExperimentPass);
  NODE_SET_METHOD(target, "EndExperimentPass", EndExperimentPass);
  NODE_SET_METHOD(target, "EndPerformanceExperiment", EndPerformanceExperiment);
  NODE_SET_METHOD(target, "SampleAndRenderStats", SampleAndRenderStats);
  NODE_SET_METHOD(target, "DebugWrite", DebugWrite);
  NODE_SET_METHOD(target, "RenderDebugOutput", RenderDebugOutput);
  NODE_SET_METHOD(target, "OpenGLErrorReporting", OpenGLErrorReporting);
  NODE_SET_METHOD(target, "RecordDwmTiming", RecordDwmTiming);
}

NODE_MODULE(lsdisplay2, init);

