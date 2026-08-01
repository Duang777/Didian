import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AtlasPage } from "./atlas-page";
import { createAtlasLocalStore } from "./atlas-local-store";

const mockViewport = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@didian/ui/hooks/use-mobile", () => ({
  useIsMobile: () => mockViewport.isMobile,
}));

vi.mock("../../editor", () => ({
  ContentEditor: ({
    defaultValue,
    placeholder,
    showBubbleMenu,
    onUpdate,
  }: {
    defaultValue?: string;
    placeholder?: string;
    showBubbleMenu?: boolean;
    onUpdate?: (markdown: string) => void;
  }) => (
    <div data-testid="atlas-document-editor" data-placeholder={placeholder} data-show-bubble-menu={String(showBubbleMenu)}>
      <pre>{defaultValue}</pre>
      <textarea
        aria-label="Mock editor input"
        defaultValue={defaultValue}
        onChange={(event) => onUpdate?.(event.currentTarget.value)}
      />
    </div>
  ),
  ReadonlyContent: ({ content }: { content: string }) => <div data-testid="atlas-readonly-document">{content}</div>,
}));

vi.mock("@didian/ui/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({
    children,
    className,
    defaultSize,
    minSize,
    maxSize,
    id,
  }: {
    children: React.ReactNode;
    className?: string;
    defaultSize?: string | number;
    minSize?: string | number;
    maxSize?: string | number;
    id?: string;
  }) => (
    <div
      className={className}
      data-panel-id={id}
      data-default-size={defaultSize}
      data-min-size={minSize}
      data-max-size={maxSize}
    >
      {children}
    </div>
  ),
  ResizableHandle: () => <div data-testid="atlas-resize-handle" />,
}));

describe("AtlasPage markdown workspace", () => {
  beforeEach(() => {
    mockViewport.isMobile = false;
    vi.restoreAllMocks();
  });

  it("centers the experience on Markdown editing and direct AI edits", () => {
    render(<AtlasPage />);

    expect(screen.getByRole("heading", { name: "Flowix Memo" })).toBeInTheDocument();
    expect(screen.queryByText(/本地 Markdown 笔记本/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "mission.md" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Notebook" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "搜索笔记" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "打开的文档" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Agent workspace" })).not.toBeInTheDocument();
    expect(screen.getAllByText("整理 AI Agent 学习资料包").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "mission.md" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText("AI 修改指令")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "让 AI 修改" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AI 对话" })).not.toBeInTheDocument();
    expect(screen.getByTestId("atlas-document-editor")).toHaveAttribute("data-show-bubble-menu", "undefined");
    expect(screen.getByRole("button", { name: "导入素材" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建笔记" })).toBeInTheDocument();
    expect(screen.getByText("筛选")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "内置 Agent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Codex" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Agent 上下文: 当前文档")).not.toBeInTheDocument();
    expect(screen.queryByText("CLI")).not.toBeInTheDocument();
    expect(screen.queryByText("MCP")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "项目对比表" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "资源索引" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "可复用清单" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "下一步行动" })).not.toBeInTheDocument();
    expect(screen.queryByText("AI 整理")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "生成资料索引" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "清理飞书 Markdown" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "确认追加内容" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Markdown tools" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开文件夹" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "运行技能" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cmd/Ctrl + K" })).not.toBeInTheDocument();
    expect(screen.queryByText("Current job")).not.toBeInTheDocument();
    expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("## Agent 工作目标");
  });

  it("filters notebook notes by search text and tags", () => {
    render(<AtlasPage />);

    fireEvent.change(screen.getByRole("searchbox", { name: "搜索笔记" }), { target: { value: "stagehand" } });

    expect(screen.getByRole("button", { name: "sources/stagehand.md" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "mission.md" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "搜索笔记" }), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "#source" }));

    expect(screen.getByRole("button", { name: "sources/browser-use.md" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "mission.md" })).not.toBeInTheDocument();
  });

  it("keeps opened documents as Flowix-style tabs", () => {
    render(<AtlasPage />);

    fireEvent.click(screen.getByRole("button", { name: "sources/stagehand.md" }));

    expect(screen.getByRole("button", { name: "sources/stagehand.md" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "打开的 stagehand" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("atlas-readonly-document")).toHaveTextContent("Stagehand documentation");

    fireEvent.click(screen.getByRole("tab", { name: "打开的 mission.md" }));

    expect(screen.getByRole("tab", { name: "打开的 mission.md" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("## Agent 工作目标");
  });

  it("shows AI chat only after selecting document text and writes back into the selection", () => {
    const aiEdit = vi.fn(async () => ({ markdown: "### 三步计划" }));
    render(<AtlasPage aiEdit={aiEdit} />);

    selectDocumentText("Agent 工作目标");
    fireEvent.click(screen.getByRole("button", { name: "AI 对话" }));
    fireEvent.change(screen.getByLabelText("AI 对话指令"), { target: { value: "把这里改成三步" } });
    fireEvent.click(screen.getByRole("button", { name: "写入选中内容" }));

    return waitFor(() => {
      expect(aiEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          instruction: "把这里改成三步",
          selectedText: "Agent 工作目标",
          filePath: "mission.md",
        }),
      );
      expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("### 三步计划");
      expect(screen.getByText("未保存")).toBeInTheDocument();
      expect(screen.queryByLabelText("AI 对话指令")).not.toBeInTheDocument();
    });
  });

  it("dismisses selected-text AI controls when the user clicks outside", () => {
    render(<AtlasPage aiEdit={vi.fn()} />);

    selectDocumentText("Agent 工作目标");
    fireEvent.click(screen.getByRole("button", { name: "AI 对话" }));

    expect(screen.getByLabelText("AI 对话指令")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("button", { name: "AI 对话" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("AI 对话指令")).not.toBeInTheDocument();
  });

  it("keeps tag filters collapsed inside the compact notebook", () => {
    render(<AtlasPage />);

    expect(screen.getByText("筛选")).toBeInTheDocument();
    expect(screen.queryByText("当前文档")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("筛选"));
    fireEvent.click(screen.getByRole("button", { name: "#source" }));

    expect(screen.getByText("筛选: #source")).toBeInTheDocument();
  });

  it("adds editable notes explicitly instead of showing generated outputs on first load", () => {
    render(<AtlasPage />);

    expect(screen.queryByRole("tab", { name: "项目对比表" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新建笔记" }));

    expect(screen.getByRole("tab", { name: "notes/new-note-1.md" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("# 新建笔记");
    expect(screen.queryByLabelText("AI 修改指令")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "来源与证据" })).toBeInTheDocument();
    expect(screen.getAllByTestId("atlas-resize-handle").length).toBeGreaterThan(0);
  });

  it("toggles importable Mission material instead of auto-importing everything", () => {
    render(<AtlasPage />);

    fireEvent.click(screen.getByRole("button", { name: "导入素材" }));

    const agentOutputs = screen.getByRole("button", { name: /Agent 输出/ });
    const attachments = screen.getByRole("button", { name: /附件和链接/ });

    expect(agentOutputs).toHaveAttribute("aria-pressed", "true");
    expect(attachments).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(attachments);

    expect(attachments).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/写入当前 md/)).toBeInTheDocument();
  });

  it("collapses the notebook so the Markdown page can take the space", () => {
    render(<AtlasPage />);

    fireEvent.click(screen.getByRole("button", { name: "收起 Notebook" }));

    expect(screen.queryByRole("complementary", { name: "Notebook" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开 Notebook" })).toBeInTheDocument();
  });

  it("uses readable panel sizes so the Notebook does not collapse into ellipses", () => {
    render(<AtlasPage />);

    const notebookPanel = screen.getByRole("complementary", { name: "Notebook" }).parentElement;

    expect(notebookPanel).toHaveAttribute("data-panel-id", "notebook");
    expect(notebookPanel).toHaveAttribute("data-default-size", "16%");
    expect(notebookPanel).toHaveAttribute("data-min-size", "12%");
    expect(notebookPanel).toHaveAttribute("data-max-size", "22%");
  });

  it("defaults to the Markdown page on mobile widths", () => {
    mockViewport.isMobile = true;

    render(<AtlasPage />);

    expect(screen.queryByRole("complementary", { name: "Notebook" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开 Notebook" })).toBeInTheDocument();
  });

  it("previews Markdown through the readonly renderer for images and Mermaid", () => {
    render(<AtlasPage />);

    fireEvent.change(screen.getByLabelText("Mock editor input"), {
      target: { value: "# Preview\n\n![demo](data:image/png;base64,abc)\n\n```mermaid\ngraph TD; A-->B;\n```" },
    });
    fireEvent.click(screen.getByRole("button", { name: "预览" }));

    expect(screen.queryByTestId("atlas-document-editor")).not.toBeInTheDocument();
    expect(screen.getByTestId("atlas-readonly-document")).toHaveTextContent("![demo](data:image/png;base64,abc)");
    expect(screen.getByTestId("atlas-readonly-document")).toHaveTextContent("mermaid");
  });

  it("keeps context and evidence behind an explicit dialog", () => {
    render(<AtlasPage />);

    expect(screen.queryByText(/仓库标题和 README/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "来源与证据" }));

    expect(screen.getByRole("dialog", { name: "来源与证据" })).toBeInTheDocument();
    expect(screen.getByText(/仓库标题和 README/)).toBeInTheDocument();
  });

  it("creates a new editable Markdown note", () => {
    render(<AtlasPage />);

    fireEvent.click(screen.getByRole("button", { name: "新建笔记" }));

    expect(screen.getByRole("tab", { name: "notes/new-note-1.md" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("# 新建笔记");
  });

  it("deletes local notes after confirmation while keeping Mission material", () => {
    render(<AtlasPage />);

    expect(screen.queryByRole("button", { name: "删除笔记" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新建笔记" }));

    expect(screen.getByRole("tab", { name: "notes/new-note-1.md" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "删除笔记" }));

    expect(screen.getByRole("alertdialog", { name: "删除这篇笔记？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "删除笔记" }));

    expect(screen.queryByRole("tab", { name: "notes/new-note-1.md" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "mission.md" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "删除笔记" })).not.toBeInTheDocument();
  });

  it("does not offer delete for captured readonly sources", () => {
    render(<AtlasPage />);

    fireEvent.click(screen.getByRole("button", { name: "evidence.md" }));

    expect(screen.getByText("只读来源")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "删除笔记" })).not.toBeInTheDocument();
  });

  it("lets AI edit the selected Markdown draft directly", () => {
    const aiEdit = vi.fn(async () => ({ markdown: "## 资料索引\n- browser-use 项目" }));
    render(<AtlasPage aiEdit={aiEdit} />);

    selectDocumentText("AI 理解");
    fireEvent.click(screen.getByRole("button", { name: "AI 对话" }));
    fireEvent.change(screen.getByLabelText("AI 对话指令"), { target: { value: "改成资料索引" } });
    fireEvent.click(screen.getByRole("button", { name: "写入选中内容" }));

    return waitFor(() => {
      expect(aiEdit).toHaveBeenCalledWith(expect.objectContaining({ instruction: "改成资料索引", selectedText: "AI 理解" }));
      expect(screen.queryByRole("dialog", { name: "确认追加内容" })).not.toBeInTheDocument();
      expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("## 资料索引");
      expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("browser-use 项目");
      expect(screen.getByText("未保存")).toBeInTheDocument();
    });
  });

  it("keeps AI edits in the current draft until the user saves", () => {
    const aiEdit = vi.fn(async () => ({ markdown: "## 飞书 Markdown 清洗" }));
    render(<AtlasPage aiEdit={aiEdit} />);

    selectDocumentText("Workspace 使用方式");
    fireEvent.click(screen.getByRole("button", { name: "AI 对话" }));
    fireEvent.change(screen.getByLabelText("AI 对话指令"), { target: { value: "清理飞书 Markdown" } });
    fireEvent.click(screen.getByRole("button", { name: "写入选中内容" }));

    return waitFor(() => {
      expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("## 飞书 Markdown 清洗");
      expect(screen.getByText("未保存")).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "确认追加内容" })).not.toBeInTheDocument();
    });
  });

  it("imports selected Mission material into the current draft without a patch preview", () => {
    render(<AtlasPage />);

    fireEvent.click(screen.getByRole("button", { name: "导入素材" }));
    expect(screen.getByRole("dialog", { name: "选择 Mission 素材" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /附件和链接/ }).at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: "插入当前 md" }));

    expect(screen.queryByRole("dialog", { name: "确认追加内容" })).not.toBeInTheDocument();
    expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("## 从 Mission 导入");
    expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("Mission 目标");
    expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("附件和链接");
    expect(screen.getByText("未保存")).toBeInTheDocument();
  });

  it("persists saved document edits across remounts", () => {
    const storage = new StorageShim();
    const localStore = createAtlasLocalStore(storage);
    const { unmount } = render(<AtlasPage localStore={localStore} />);

    fireEvent.change(screen.getByLabelText("Mock editor input"), { target: { value: "# Saved locally" } });

    expect(screen.getByText("未保存")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "保存文档" }));

    expect(screen.getByText("已保存")).toBeInTheDocument();
    unmount();

    render(<AtlasPage localStore={localStore} />);
    expect(screen.getByTestId("atlas-document-editor")).toHaveTextContent("# Saved locally");
  });

  it("persists new notes across remounts", () => {
    const storage = new StorageShim();
    const localStore = createAtlasLocalStore(storage);
    const { unmount } = render(<AtlasPage localStore={localStore} />);

    fireEvent.click(screen.getByRole("button", { name: "新建笔记" }));

    expect(screen.getByRole("tab", { name: "notes/new-note-1.md" })).toBeInTheDocument();
    unmount();

    render(<AtlasPage localStore={localStore} />);
    expect(screen.getByRole("tab", { name: "notes/new-note-1.md" })).toBeInTheDocument();
  });

  it("opens captured sources and evidence as readonly context", () => {
    render(<AtlasPage />);

    fireEvent.click(screen.getByRole("button", { name: "evidence.md" }));

    expect(screen.queryByTestId("atlas-document-editor")).not.toBeInTheDocument();
    expect(screen.getByTestId("atlas-readonly-document")).toHaveTextContent("# 整理 AI Agent 学习资料包 / Evidence");
    expect(screen.getByText("只读来源")).toBeInTheDocument();
  });
});

function selectDocumentText(text: string) {
  const region = screen.getByTestId("atlas-document-editor").parentElement!;
  const textNode = region.firstChild ?? region;

  vi.spyOn(window, "getSelection").mockReturnValue({
    anchorNode: textNode,
    rangeCount: 1,
    getRangeAt: () => ({
      getBoundingClientRect: () => ({
        bottom: 128,
        height: 20,
        left: 240,
        right: 360,
        top: 108,
        width: 120,
        x: 240,
        y: 108,
        toJSON: () => ({}),
      }),
    }),
    toString: () => text,
  } as unknown as Selection);
  fireEvent(document, new Event("selectionchange"));
}

class StorageShim {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
