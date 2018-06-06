/* Copyright (c) 2012-2018 LevelDOWN contributors
 * See list at <https://github.com/level/leveldown#contributing>
 * MIT License <https://github.com/level/leveldown/blob/master/LICENSE.md>
 */

#include <node.h>
#include <node_buffer.h>

#include "database.h"
#include "database_async.h"
#include "database_snapshot.h"
#include "common.h"

namespace leveldown {

static Nan::Persistent<v8::FunctionTemplate> database_snapshot_constructor;

DatabaseSnapshot::DatabaseSnapshot (
    Database* database
  , uint32_t id
  , bool fillCache
  , bool keyAsBuffer
  , bool valueAsBuffer
) : database(database)
  , id(id)
  , keyAsBuffer(keyAsBuffer)
  , valueAsBuffer(valueAsBuffer)
{
  Nan::HandleScope scope;

  options    = new leveldb::ReadOptions();
  options->fill_cache = fillCache;
  // get a snapshot of the current state
  options->snapshot = database->NewSnapshot();
};

DatabaseSnapshot::~DatabaseSnapshot () {
  delete options;
};

void DatabaseSnapshot::Release () {
  database->ReleaseDatabaseSnapshot(id);
};

leveldb::Snapshot* DatabaseSnapshot::GetSnapshot() {
  return (leveldb::Snapshot*)options->snapshot;
};

NAN_METHOD(DatabaseSnapshot::Close) {
  leveldown::DatabaseSnapshot* databaseSnapshot =
    Nan::ObjectWrap::Unwrap<leveldown::DatabaseSnapshot>(info.This());
  databaseSnapshot->Release();
}

NAN_METHOD(DatabaseSnapshot::Get) {
  LD_METHOD_SETUP_COMMON(get, 1, 2)

  leveldown::DatabaseSnapshot* databaseSnapshot =
      Nan::ObjectWrap::Unwrap<leveldown::DatabaseSnapshot>(info.This());

  v8::Local<v8::Object> keyHandle = info[0].As<v8::Object>();
  LD_STRING_OR_BUFFER_TO_SLICE(key, keyHandle, key);

  bool asBuffer = BooleanOptionValue(optionsObj, "asBuffer", true);
  bool fillCache = BooleanOptionValue(optionsObj, "fillCache", true);

  ReadWorker* worker = new ReadWorker(
      database
    , new Nan::Callback(callback)
    , key
    , asBuffer
    , fillCache
    , keyHandle
    , databaseSnapshot->GetSnapshot()
  );
  // TODO !!!
  // how do we get the V8 handle for our database reference?
  // persist to prevent accidental GC
  // v8::Local<v8::Object> _this = info.This();
  // worker->SaveToPersistent("database", _this);
  Nan::AsyncQueueWorker(worker);
}

NAN_METHOD(DatabaseSnapshot::GetSync) {

  if (info.Length() != 1)                                                      \
    return Nan::ThrowError("getSync() requires a single argument: key");

  leveldown::DatabaseSnapshot* databaseSnapshot =
    Nan::ObjectWrap::Unwrap<leveldown::DatabaseSnapshot>(info.This());

  v8::Local<v8::Object> keyHandle = info[0].As<v8::Object>();
  LD_STRING_OR_BUFFER_TO_SLICE(key, keyHandle, key);

  leveldb::ReadOptions options;
  options.fill_cache = true;

  std::string value;
  leveldb::Status status = databaseSnapshot->database->GetFromDatabase(databaseSnapshot->options, key, value);

  DisposeStringOrBufferFromSlice(keyHandle, key);

  if (!status.ok())
    return Nan::ThrowError(status.ToString().c_str());

  v8::Local<v8::Value> returnValue
    = Nan::New<v8::String>((char*)value.data(), value.size()).ToLocalChecked();
  
  info.GetReturnValue().Set(returnValue);
}

void DatabaseSnapshot::Init () {
  v8::Local<v8::FunctionTemplate> tpl =
      Nan::New<v8::FunctionTemplate>(DatabaseSnapshot::New);
  database_snapshot_constructor.Reset(tpl);
  tpl->SetClassName(Nan::New("DatabaseSnapshot").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(tpl, "close", DatabaseSnapshot::Close);
  Nan::SetPrototypeMethod(tpl, "get", DatabaseSnapshot::Get);
  Nan::SetPrototypeMethod(tpl, "getSync", DatabaseSnapshot::GetSync);
}

v8::Local<v8::Object> DatabaseSnapshot::NewInstance (
        v8::Local<v8::Object> database
      , v8::Local<v8::Number> id
      , v8::Local<v8::Object> optionsObj
    ) {
  Nan::EscapableHandleScope scope;

  Nan::MaybeLocal<v8::Object> maybeInstance;
  v8::Local<v8::Object> instance;
  v8::Local<v8::FunctionTemplate> constructorHandle =
      Nan::New<v8::FunctionTemplate>(database_snapshot_constructor);

  if (optionsObj.IsEmpty()) {
    v8::Local<v8::Value> argv[2] = { database, id };
    maybeInstance = Nan::NewInstance(constructorHandle->GetFunction(), 2, argv);
  } else {
    v8::Local<v8::Value> argv[3] = { database, id, optionsObj };
    maybeInstance = Nan::NewInstance(constructorHandle->GetFunction(), 3, argv);
  }

  if (maybeInstance.IsEmpty())
      Nan::ThrowError("Could not create new Snapshot instance");
  else
    instance = maybeInstance.ToLocalChecked();

  return scope.Escape(instance);
}

NAN_METHOD(DatabaseSnapshot::New) {
  Database* database = Nan::ObjectWrap::Unwrap<Database>(info[0]->ToObject());

  v8::Local<v8::Value> id = info[1];

  v8::Local<v8::Object> optionsObj;
  if (info.Length() > 1 && info[2]->IsObject()) {
    optionsObj = v8::Local<v8::Object>::Cast(info[2]);
  }

  bool keyAsBuffer = BooleanOptionValue(optionsObj, "keyAsBuffer", true);
  bool valueAsBuffer = BooleanOptionValue(optionsObj, "valueAsBuffer", true);
  bool fillCache = BooleanOptionValue(optionsObj, "fillCache");

  DatabaseSnapshot* databaseSnapshot = new DatabaseSnapshot(
      database
    , (uint32_t)id->Int32Value()
    , fillCache
    , keyAsBuffer
    , valueAsBuffer
  );

  databaseSnapshot->Wrap(info.This());

  info.GetReturnValue().Set(info.This());
}

} // namespace leveldown
