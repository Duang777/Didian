import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@didian/core/i18n/react";
import type { Agent } from "@didian/core/types";
import { describe, expect, it, vi } from "vitest";
import enChat from "../../locales/en/chat.json";
import { ChatAgentConsole } from "./agent-console";

const TEST_RESOURCES = { en: { chat: enChat } };

const agent = {
  id: "agent-1",
  name: "Codex Local",
} as unknown as Agent;

describe("ChatAgentConsole", () => {
  it("shows the local agent status and capability library link", () => {
    render(
      <I18nProvider locale="en" resources={TEST_RESOURCES}>
        <ChatAgentConsole
          agent={agent}
          availability="online"
          capabilityCount={3}
          capabilityHref="/acme/skills"
          onPrompt={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(enChat.console.title)).toBeInTheDocument();
    expect(screen.getByText("Codex Local online")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Capabilities 3" })).toHaveAttribute(
      "href",
      "/acme/skills",
    );
  });

  it("delegates quick actions without sending a message", () => {
    const onPrompt = vi.fn();
    render(
      <I18nProvider locale="en" resources={TEST_RESOURCES}>
        <ChatAgentConsole
          agent={agent}
          availability="online"
          capabilityCount={1}
          capabilityHref="/acme/skills"
          onPrompt={onPrompt}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use capability" }));

    expect(onPrompt).toHaveBeenCalledTimes(1);
    expect(onPrompt).toHaveBeenCalledWith(enChat.console.prompts.use_ability);
  });
});
