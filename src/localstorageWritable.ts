import {
  writable as internalWritable,
  get,
  type Writable,
  Updater,
} from "svelte/store";

const stores: { [key: string]: Writable<any> } = {};

function defaultFromJSON<T>(json: any): T {
  return json;
}

function defaultToJSON<T>(value: T): any {
  return value;
}

export type IFromJSON<T> = (json: any) => T;
export type IToJSON<T> = (value: T) => any;

export interface ILocalStorageWritableOptions<T> {
  fromJSON?: IFromJSON<T>;
  toJSON?: IToJSON<T>;
}

export function localstorageWritable<T>(
  key: string,
  initialValue: T,
  options: ILocalStorageWritableOptions<T> = {}
): Writable<T> {
  const browser =
    typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  const toJSON = options.toJSON || defaultToJSON;
  const fromJSON = options.fromJSON || defaultFromJSON;

  function updateStorage(key: string, value: T) {
    if (browser) {
      window.localStorage.setItem(key, JSON.stringify(toJSON(value)));
    }
    return value;
  }

  if (!stores[key]) {
    const store = internalWritable<T>(initialValue, (set) => {
      const json = browser ? window.localStorage.getItem(key) : null;

      if (json) {
        set(fromJSON(JSON.parse(json)));
      }

      if (browser) {
        function handleStorage(event: StorageEvent) {
          if (event.key === key) {
            set(
              event.newValue
                ? fromJSON(JSON.parse(event.newValue))
                : (null as unknown as T)
            );
          }
        }

        window.addEventListener("storage", handleStorage);

        return () => {
          window.removeEventListener("storage", handleStorage);
        };
      }
    });

    const { subscribe, set } = store;

    function localStorageSet(value: T) {
      updateStorage(key, value);
      set(value);
    }

    stores[key] = {
      set: localStorageSet,
      update(updater: Updater<T>) {
        localStorageSet(updater(get(store)));
      },
      subscribe,
    };
  }

  return stores[key];
}
