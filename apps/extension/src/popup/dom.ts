// 安全 DOM 构建工具：所有页面数据一律走 textContent / 属性，禁止 innerHTML 拼接。

type Child = Node | string;

interface ElProps {
  class?: string;
  text?: string;
  title?: string;
  dataset?: Record<string, string>;
  attrs?: Record<string, string>;
}

const HTTP_RE = /^https?:\/\//i;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.class) node.className = props.class;
  if (props.text != null) node.textContent = props.text;
  if (props.title != null) node.title = props.title;
  if (props.dataset) for (const [k, v] of Object.entries(props.dataset)) node.dataset[k] = v;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) node.setAttribute(k, v);
  for (const child of children) node.append(typeof child === "string" ? document.createTextNode(child) : child);
  return node;
}

export function clear(node: Element): void {
  node.replaceChildren();
}

// 仅允许 http(s) 图标地址；非法或加载失败时回退到首字母头像（内联 SVG）。
export function faviconImg(url: string | undefined, title: string, size = 20): HTMLImageElement {
  const img = el("img", { class: "favicon", attrs: { width: String(size), height: String(size), alt: "" } });
  if (url && HTTP_RE.test(url)) {
    img.src = url;
    img.addEventListener("error", () => applyLetterFallback(img, title), { once: true });
  } else {
    applyLetterFallback(img, title);
  }
  return img;
}

function applyLetterFallback(img: HTMLImageElement, title: string): void {
  const letter = (title.trim()[0] || "?").toUpperCase();
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'>` +
    `<rect width='20' height='20' rx='5' fill='#4f46e5'/>` +
    `<text x='10' y='14' font-size='11' fill='#fff' text-anchor='middle' font-family='sans-serif'>${escapeXml(letter)}</text>` +
    `</svg>`;
  img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
