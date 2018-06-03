/* Copyright (c) 2012-2018 LevelDOWN contributors
 * See list at <https://github.com/level/leveldown#contributing>
 * MIT License <https://github.com/level/leveldown/blob/master/LICENSE.md>
 */

#ifndef LD_DATABASE_SNAPSHOT_H
#define LD_DATABASE_SNAPSHOT_H

#include <node.h>
#include <vector>
#include <nan.h>

#include "leveldown.h"
#include "database.h"
#include "async.h"

namespace leveldown {

class Database;

class DatabaseSnapshot : public Nan::ObjectWrap {
public:
  static void Init ();
  static v8::Local<v8::Object> NewInstance (
      v8::Local<v8::Object> database
    , v8::Local<v8::Number> id
    , v8::Local<v8::Object> optionsObj
  );

  DatabaseSnapshot (
      Database* database
    , uint32_t id
    , bool fillCache
    , bool keyAsBuffer
    , bool valueAsBuffer
  );

  ~DatabaseSnapshot ();

  void Release ();

private:
  Database* database;
  uint32_t id;
  leveldb::ReadOptions* options;

public:
  bool keyAsBuffer;
  bool valueAsBuffer;
  leveldb::Snapshot* GetSnapshot();
  
private:
  bool GetDatabaseSnapshot ();
  
  static NAN_METHOD(New);
  static NAN_METHOD(GetSync);
  static NAN_METHOD(Iterator);
};

} // namespace leveldown

#endif
