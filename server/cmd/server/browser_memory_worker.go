package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/didian-ai/didian/server/internal/service"
)

const (
	browserMemoryEnrichmentInterval = 15 * time.Second
	browserMemoryEnrichmentLimit    = int32(10)
)

func runBrowserMemoryEnrichmentWorker(ctx context.Context, svc *service.MemoryEnrichmentService) {
	if svc == nil {
		return
	}
	processPendingBrowserMemory(ctx, svc)

	ticker := time.NewTicker(browserMemoryEnrichmentInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			processPendingBrowserMemory(ctx, svc)
		}
	}
}

func processPendingBrowserMemory(ctx context.Context, svc *service.MemoryEnrichmentService) {
	processed, err := svc.ProcessPending(ctx, browserMemoryEnrichmentLimit)
	if err != nil {
		slog.Warn("browser memory enrichment worker failed", "error", err)
		return
	}
	if processed > 0 {
		slog.Info("browser memory enrichment worker processed captures", "count", processed)
	}
}
