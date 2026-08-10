interface ChromeTab {
  id?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
}

interface ChromeMessageSender {
  tab?: ChromeTab;
}

interface ChromeRuntime {
  onMessage: {
    addListener(
      callback: (
        message: unknown,
        sender: ChromeMessageSender,
        sendResponse: (response?: unknown) => void,
      ) => boolean | void,
    ): void;
  };
  sendMessage(message: unknown): Promise<unknown>;
}

interface ChromeTabs {
  query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<ChromeTab[]>;
  sendMessage(tabId: number, message: unknown): Promise<unknown>;
  create(createProperties: { url: string }): Promise<ChromeTab>;
}

interface ChromeInjectionTarget {
  tabId: number;
}
interface ChromeScriptingFiles {
  target: ChromeInjectionTarget;
  files: string[];
}
interface ChromeScriptingFunc<T> {
  target: ChromeInjectionTarget;
  func: () => T;
}
interface ChromeScripting {
  executeScript(script: ChromeScriptingFiles): Promise<void>;
  executeScript<T>(script: ChromeScriptingFunc<T>): Promise<Array<{ result: T }>>;
}

interface ChromeStorageArea {
  get<T extends Record<string, unknown>>(keys?: string[] | Record<string, unknown>): Promise<T>;
  set(items: Record<string, unknown>): Promise<void>;
}

interface ChromeStorage {
  sync: ChromeStorageArea;
  local: ChromeStorageArea;
}

interface ChromeCookie {
  value: string;
}

interface ChromeCookies {
  get(details: { url: string; name: string }): Promise<ChromeCookie | null>;
}

interface ChromeAPI {
  runtime: ChromeRuntime;
  tabs: ChromeTabs;
  scripting: ChromeScripting;
  storage: ChromeStorage;
  cookies: ChromeCookies;
}

declare const chrome: ChromeAPI;
