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

interface ChromeScripting {
  executeScript(options: { target: { tabId: number }; files: string[] }): Promise<void>;
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
