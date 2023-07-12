import { JSDOM } from "jsdom";
import { get } from "svelte/store";
import * as tape from "tape";
import { localstorageWritable as writable } from ".";

const dom = new JSDOM("", { url: "http://localhost" });

(global as any).window = dom.window;
(global as any).document = dom.window.document;

tape("setup", (assert) => {
  window.localStorage.clear();
  assert.end();
});

tape("uses initial value if nothing in local storage", (assert) => {
  const store = writable("myKey", 123);
  const value = get(store);

  assert.equals(value, 123);

  assert.end();
});

tape("uses existing value if data already in local storage", (assert) => {
  window.localStorage.setItem("myKey2", '"existing"');

  const store = writable("myKey2", "initial");
  const value = get(store);

  assert.equals(value, "existing");

  assert.end();
});

tape("replaces old value", (assert) => {
  window.localStorage.setItem("myKey3", '"existing"');

  const store = writable("myKey3", "");
  store.set("new-value");
  const value = get(store);

  assert.equals(window.localStorage.myKey3, '"new-value"');
  assert.equals(value, "new-value");

  assert.end();
});

tape("adds new value", (assert) => {
  const store = writable("myKey4", "");
  store.set("new-value");
  const value = get(store);

  assert.equals(window.localStorage.myKey4, '"new-value"');
  assert.equals(value, "new-value");

  assert.end();
});

tape("replaces old value", (assert) => {
  window.localStorage.setItem("myKey5", "123");

  const store = writable("myKey5", 0);
  store.update((n) => n + 1);
  const value = get(store);

  assert.equals(window.localStorage.myKey5, "124");
  assert.equals(value, 124);

  assert.end();
});

tape("adds new value", (assert) => {
  const store = writable("myKey6", 123);
  store.update((n) => n + 1);
  const value = get(store);

  assert.equals(window.localStorage.myKey6, "124");
  assert.equals(value, 124);

  assert.end();
});

tape("publishes updates", (assert) => {
  const store = writable("myKey7", 123);
  const values: number[] = [];
  const unsub = store.subscribe((value: number) => {
    if (value !== undefined) {
      values.push(value);
    }
  });
  store.set(456);
  store.set(999);

  assert.deepEquals(values, [123, 456, 999]);

  unsub();

  assert.end();
});

tape("handles duplicate stores with the same key", (assert) => {
  const store1 = writable("same-key", 1);
  const values1: number[] = [];

  const unsub1 = store1.subscribe((value) => {
    values1.push(value);
  });

  store1.set(2);

  const store2 = writable("same-key", 99);
  const values2: number[] = [];

  const unsub2 = store2.subscribe((value) => {
    values2.push(value);
  });

  store1.set(3);
  store2.set(4);

  assert.deepEquals(values1, [1, 2, 3, 4]);
  assert.deepEquals(values2, [2, 3, 4]);
  assert.equals(get(store1), get(store2));

  assert.deepEquals(store1, store2);

  unsub1();
  unsub2();

  assert.end();
});

type NumberDict = { [key: string]: number };

tape("sets storage when key matches", (assert) => {
  const store = writable("myKey8", { a: 1 });
  const values: NumberDict[] = [];

  const unsub = store.subscribe((value: NumberDict) => {
    values.push(value);
  });

  const event = new window.StorageEvent("storage", {
    key: "myKey8",
    newValue: '{"a": 1, "b": 2}',
  });
  window.dispatchEvent(event);

  assert.deepEquals(values, [{ a: 1 }, { a: 1, b: 2 }]);

  unsub();

  assert.end();
});

tape("sets store to null when value is null", (assert) => {
  const store = writable("myKey9", { a: 1 });
  const values: NumberDict[] = [];

  const unsub = store.subscribe((value: NumberDict) => {
    values.push(value);
  });

  const event = new window.StorageEvent("storage", {
    key: "myKey9",
    newValue: null,
  });
  window.dispatchEvent(event);

  assert.deepEquals(values, [{ a: 1 }, null]);

  unsub();

  assert.end();
});

tape("doesn't update store when key doesn't match", (assert) => {
  const store = writable("myKey10", 1);
  const values: number[] = [];

  const unsub = store.subscribe((value: number) => {
    values.push(value);
  });

  const event = new window.StorageEvent("storage", {
    key: "unknownKey",
    newValue: "2",
  });
  window.dispatchEvent(event);

  assert.deepEquals(values, [1]);

  unsub();

  assert.end();
});

tape("doesn't update store when there are no subscribers", (assert) => {
  const store = writable("myKey", 1);
  const values: number[] = [];

  const event = new window.StorageEvent("storage", {
    key: "myKey",
    newValue: "2",
  });
  window.dispatchEvent(event);
  window.localStorage.setItem("myKey", "2");

  const unsub = store.subscribe((value: number) => {
    values.push(value);
  });

  assert.deepEquals(values, [2]);

  unsub();

  assert.end();
});

interface Entity {
  date: Date;
}
interface EntityJSON {
  date: string;
}

function toJSON(entity: Entity): EntityJSON {
  return {
    date: entity.date.toJSON(),
  };
}

function fromJSON(entity: EntityJSON): Entity {
  return {
    date: new Date(entity.date),
  };
}

tape("uses to/from JSON to convert value before setting", (asset) => {
  const store = writable<Entity>(
    "myKey11",
    { date: new Date("2020-01-01") },
    { fromJSON, toJSON },
  );

  const initial = get(store);
  store.set({ date: new Date("2021-01-01") });
  const current = get(store);

  asset.deepEquals(initial, { date: new Date("2020-01-01") });
  asset.deepEquals(current, { date: new Date("2021-01-01") });

  asset.end();
});
