package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	"fmt"

	db "github.com/didian-ai/didian/server/pkg/db/generated"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// SeedDemoData creates or ensures the demo user, workspace, and a set of
// demo browser captures exist. It is safe to call multiple times — it
// skips existing entities via a lookup-first approach.
//
// Expected to be called at server startup when DEMO_MODE=true.
func SeedDemoData(ctx context.Context, queries *db.Queries) error {
	// 1. Create demo user (skip if already exists)
	user, err := queries.GetUserByEmail(ctx, demoEmail)
	if err != nil {
		if !isNotFound(err) {
			return fmt.Errorf("lookup demo user: %w", err)
		}
		user, err = queries.CreateUser(ctx, db.CreateUserParams{
			Name:  demoUserName,
			Email: demoEmail,
		})
		if err != nil {
			return fmt.Errorf("create demo user: %w", err)
		}
		slog.Info("demo seed: created demo user", "user_id", uuidToString(user.ID))
	}

	// 2. Create demo workspace (skip if already exists)
	workspace, err := queries.GetWorkspaceBySlug(ctx, demoWorkspaceSlug)
	if err != nil {
		if !isNotFound(err) {
			return fmt.Errorf("lookup demo workspace: %w", err)
		}
		workspace, err = queries.CreateWorkspace(ctx, db.CreateWorkspaceParams{
			Name:        demoWorkspaceName,
			Slug:        demoWorkspaceSlug,
			Description: pgtype.Text{String: "Didian 资源工作台演示工作区 — 包含示例浏览器收藏和 Mission 数据。", Valid: true},
			Context:     pgtype.Text{String: "This is a demo workspace for Didian resource workbench. All data here is auto-generated for demonstration purposes.", Valid: true},
		})
		if err != nil {
			return fmt.Errorf("create demo workspace: %w", err)
		}
		slog.Info("demo seed: created demo workspace", "workspace_id", uuidToString(workspace.ID))
	}

	// 3. Add user as member of workspace (skip if already member)
	_, err = queries.GetMemberByUserAndWorkspace(ctx, db.GetMemberByUserAndWorkspaceParams{
		UserID:      user.ID,
		WorkspaceID: workspace.ID,
	})
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("lookup demo member: %w", err)
		}
		_, err = queries.CreateMember(ctx, db.CreateMemberParams{
			WorkspaceID: workspace.ID,
			UserID:      user.ID,
			Role:        "owner",
		})
		if err != nil {
			return fmt.Errorf("create demo member: %w", err)
		}
		slog.Info("demo seed: added demo user as workspace owner")
	}

	// 4. Seed demo browser captures (skip if already exist)
	if err := seedDemoCaptures(ctx, queries, workspace.ID, user.ID); err != nil {
		return fmt.Errorf("seed demo captures: %w", err)
	}

	// 5. Seed demo Mission (issue)
	if err := seedDemoMission(ctx, queries, workspace.ID, user.ID); err != nil {
		return fmt.Errorf("seed demo mission: %w", err)
	}

	slog.Info("demo seed: complete", "workspace_slug", demoWorkspaceSlug)
	return nil
}

// demoCaptureSpecs defines the seed browser captures used for the demo.
type demoCaptureSpec struct {
	Source       string
	CaptureScope string
	URL          string
	Title        string
	Domain       string
	Description  string
	SelectedText string
	ReadableText string
}

var demoCaptureSpecs = []demoCaptureSpec{
	{
		Source:       "extension",
		CaptureScope: "page",
		URL:          "https://github.com/karakeep-app/karakeep",
		Title:        "Karakeep GitHub",
		Domain:       "github.com/karakeep-app/karakeep",
		Description:  "A self-hostable bookmark-everything app with AI-powered tagging and full-text search.",
		ReadableText: "Karakeep is a bookmark manager that can save links, text and assets, then enrich them with summaries and tags. It uses AI to automatically tag and organize saved content, making it searchable by full-text and semantic meaning.",
	},
	{
		Source:       "extension",
		CaptureScope: "page",
		URL:          "https://github.com/browser-use/browser-use",
		Title:        "browser-use GitHub",
		Domain:       "github.com/browser-use/browser-use",
		Description:  "Open-source browser automation agent project for AI agents.",
		ReadableText: "browser-use is the simplest way to connect your AI agents to the browser. It enables AI agents to control a browser, navigate web pages, fill forms, and extract data. It supports multiple LLM backends and provides a simple Python API. The project is actively maintained with regular updates.",
	},
	{
		Source:       "extension",
		CaptureScope: "page",
		URL:          "https://docs.stagehand.dev",
		Title:        "Stagehand documentation",
		Domain:       "docs.stagehand.dev",
		Description:  "Browser automation documentation and examples for AI agents.",
		ReadableText: "Stagehand is an AI-powered browser automation framework. It provides natural language interfaces for browser control, making it easy to automate complex web interactions. The documentation covers setup, API reference, and practical examples for common use cases.",
	},
	{
		Source:       "extension",
		CaptureScope: "selection",
		URL:          "https://github.com/nicegui-dev/nicegui",
		Title:        "NiceGUI — UI framework for Python",
		Domain:       "github.com/nicegui-dev/nicegui",
		Description:  "NiceGUI enables you to create browser-based UIs with Python.",
		SelectedText: "NiceGUI enables you to create browser-based user interfaces with Python. It's particularly useful for building internal tools, dashboards, and small web applications without needing to write HTML, CSS, or JavaScript.",
		ReadableText:  "NiceGUI is a Python-based UI framework. Create browser-based user interfaces with Python. The framework is designed for building internal tools, dashboards, and small web applications.",
	},
}

func seedDemoCaptures(ctx context.Context, queries *db.Queries, workspaceID, userID pgtype.UUID) error {
	now := time.Now()
	statuses := []string{"ready", "ready", "pending", "ready"}
	memoryStatuses := []string{"ready", "ready", "", "ready"}

	for i, spec := range demoCaptureSpecs {
		// Check if already seeded by URL
		existing, err := queries.ListCapturedSources(ctx, db.ListCapturedSourcesParams{
			WorkspaceID: workspaceID,
			Query:       pgtype.Text{String: spec.URL, Valid: true},
			Limit:       1,
		})
		if err != nil {
			return fmt.Errorf("check existing capture %q: %w", spec.URL, err)
		}
		if len(existing) > 0 {
			continue // already seeded
		}

		status := statuses[i%len(statuses)]
		linksJSON, _ := json.Marshal([]map[string]string{
			{"url": spec.URL, "title": spec.Title},
		})

		capture, err := queries.CreateCapturedSource(ctx, db.CreateCapturedSourceParams{
			WorkspaceID:     workspaceID,
			CreatorID:       userID,
			SourceType:      "page",
			Source:          spec.Source,
			CaptureScope:    spec.CaptureScope,
			Url:             spec.URL,
			NormalizedUrl:   spec.URL,
			Title:           spec.Title,
			Domain:          spec.Domain,
			Description:     pgtype.Text{String: spec.Description, Valid: spec.Description != ""},
			SelectedText:    pgtype.Text{String: spec.SelectedText, Valid: spec.SelectedText != ""},
			ReadableText:    pgtype.Text{String: spec.ReadableText, Valid: spec.ReadableText != ""},
			Links:           linksJSON,
			Status:          status,
			MetadataStatus:  "ready",
			ArchiveStatus:   "active",
			SummaryStatus:   status,
			EmbeddingStatus: "pending",
			MemoryState:     "active",
			CapturedAt:      pgtype.Timestamptz{Time: now.Add(-time.Duration(len(demoCaptureSpecs)-i) * time.Hour), Valid: true},
		})
		if err != nil {
			return fmt.Errorf("create demo capture %q: %w", spec.URL, err)
		}

		// Create page memory for captures that are "ready"
		memStatus := memoryStatuses[i%len(memoryStatuses)]
		if memStatus == "ready" {
			keywords := []string{"demo", "ai", "browser automation", spec.Title}
			keywordsJSON, _ := json.Marshal(keywords)
			searchText := fmt.Sprintf("%s %s %s", spec.Title, spec.Description, spec.ReadableText)

			_, err := queries.CreatePendingPageMemory(ctx, db.CreatePendingPageMemoryParams{
				CapturedSourceID: capture.ID,
				WorkspaceID:      workspaceID,
				SearchText:       searchText,
				Keywords:         keywordsJSON,
			})
			if err != nil {
				return fmt.Errorf("create demo page memory for %q: %w", spec.URL, err)
			}
		}

		slog.Info("demo seed: created browser capture", "title", spec.Title, "id", uuidToString(capture.ID))
	}

	return nil
}

func seedDemoMission(ctx context.Context, queries *db.Queries, workspaceID, userID pgtype.UUID) error {
	// Check if demo mission already exists
	existing, err := queries.ListIssues(ctx, db.ListIssuesParams{
		WorkspaceID: workspaceID,
		Limit:       100,
	})
	if err != nil {
		return fmt.Errorf("list existing issues: %w", err)
	}
	for _, issue := range existing {
		if issue.Title == "整理 AI Agent 学习资料包" {
			slog.Info("demo seed: demo mission already exists, skipping", "issue_id", uuidToString(issue.ID))
			return nil
		}
	}

	description := `## Mission 目标
把浏览器自动化和 AI Agent 相关资源整理成可学习、可追问、可持续更新的资料包。

## 输入来源
- Karakeep GitHub: https://github.com/karakeep-app/karakeep
- browser-use GitHub: https://github.com/browser-use/browser-use
- Stagehand docs: https://docs.stagehand.dev
- NiceGUI: https://github.com/nicegui-dev/nicegui

## AI 理解
- 意图: research_pack
- 置信度: 82%
- 建议产物: 资源索引、重点摘要、相关关系、下一步建议

## Atlas Workspace
Workspace 路径: AI Agent 项目调研

文件结构:
- mission.md — Mission 目标和 Agent 工作约定
- sources/*.md — 原始输入来源
- evidence.md — 执行证据
- decisions.md — 待确认决策
- outputs/*.md — 可交付产物
- agent-log.md — Agent 执行日志

## 计划步骤
1. 识别输入 — 提取链接、文本目标和资源类型
2. 组织主题 — 按入门、工具和实战项目聚类
3. 等待确认 — 确认是否创建 Atlas Collection 和周期摘要策略
4. 沉淀到 Atlas — 确认后生成资源索引、摘要和关系`

	_, err = queries.CreateIssue(ctx, db.CreateIssueParams{
		WorkspaceID:  workspaceID,
		Title:        "整理 AI Agent 学习资料包",
		Description:  pgtype.Text{String: description, Valid: true},
		Status:       "backlog",
		Priority:     "p2",
		CreatorType:  "user",
		CreatorID:    userID,
		Position:     1000,
	})
	if err != nil {
		return fmt.Errorf("create demo mission: %w", err)
	}

	slog.Info("demo seed: created demo mission", "title", "整理 AI Agent 学习资料包")
	return nil
}