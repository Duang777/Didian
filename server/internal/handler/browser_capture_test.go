package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestBrowserCaptureLifecycle(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	body := map[string]any{
		"source":          "extension",
		"sourceType":      "link",
		"captureScope":    "page",
		"sourceTabId":     "tab-42",
		"url":             "https://example.com/article?utm_source=newsletter&keep=1#section",
		"title":           "Example Article",
		"domain":          "example.com",
		"faviconUrl":      "https://example.com/favicon.ico",
		"description":     "A useful page about browser memory.",
		"previewImageUrl": "https://example.com/preview.png",
		"selectedText":    "This quote is why I saved it.",
		"readableText":    "This quote is why I saved it. A longer article body for recall.",
		"links": []map[string]any{
			{"url": "https://example.com/docs", "title": "Docs"},
		},
		"capturedAt": "2026-07-14T10:00:00Z",
	}

	w := httptest.NewRecorder()
	req := newRequest(http.MethodPost, "/api/browser-captures", body)
	testHandler.CreateBrowserCapture(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("CreateBrowserCapture: expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var created CreateBrowserCaptureResponse
	if err := json.NewDecoder(w.Body).Decode(&created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if created.CaptureID == "" {
		t.Fatal("create response missing captureId")
	}
	if created.Dedupe.IsDuplicate {
		t.Fatal("first capture unexpectedly marked duplicate")
	}
	if created.Capture.NormalizedURL != "https://example.com/article?keep=1" {
		t.Errorf("normalized_url = %q", created.Capture.NormalizedURL)
	}
	if created.Capture.SummaryStatus != "pending" {
		t.Errorf("summary_status = %q, want pending", created.Capture.SummaryStatus)
	}
	if created.Capture.Description == nil || *created.Capture.Description != "A useful page about browser memory." {
		t.Fatalf("description = %v", created.Capture.Description)
	}
	if created.Capture.PreviewImageURL == nil || *created.Capture.PreviewImageURL != "https://example.com/preview.png" {
		t.Fatalf("preview_image_url = %v", created.Capture.PreviewImageURL)
	}

	w = httptest.NewRecorder()
	req = newRequest(http.MethodGet, "/api/browser-captures?limit=5", nil)
	testHandler.ListBrowserCaptures(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("ListBrowserCaptures: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var listed ListBrowserCapturesResponse
	if err := json.NewDecoder(w.Body).Decode(&listed); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if listed.Total < 1 || len(listed.Captures) < 1 {
		t.Fatalf("list returned total=%d len=%d, want capture", listed.Total, len(listed.Captures))
	}
	if listed.Captures[0].ID != created.CaptureID {
		t.Errorf("latest capture id = %q, want %q", listed.Captures[0].ID, created.CaptureID)
	}

	w = httptest.NewRecorder()
	duplicateBody := cloneMap(body)
	duplicateBody["description"] = "Updated duplicate description."
	duplicateBody["previewImageUrl"] = "https://example.com/updated-preview.png"
	req = newRequest(http.MethodPost, "/api/browser-captures", duplicateBody)
	testHandler.CreateBrowserCapture(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("duplicate CreateBrowserCapture: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var duplicate CreateBrowserCaptureResponse
	if err := json.NewDecoder(w.Body).Decode(&duplicate); err != nil {
		t.Fatalf("decode duplicate response: %v", err)
	}
	if !duplicate.Dedupe.IsDuplicate || duplicate.Dedupe.ExistingCaptureID == nil || *duplicate.Dedupe.ExistingCaptureID != created.CaptureID {
		t.Fatalf("duplicate response = %+v, want existing capture %s", duplicate.Dedupe, created.CaptureID)
	}
	if duplicate.Capture.Description == nil || *duplicate.Capture.Description != "Updated duplicate description." {
		t.Fatalf("duplicate description = %v", duplicate.Capture.Description)
	}
	if duplicate.Capture.PreviewImageURL == nil || *duplicate.Capture.PreviewImageURL != "https://example.com/updated-preview.png" {
		t.Fatalf("duplicate preview_image_url = %v", duplicate.Capture.PreviewImageURL)
	}
}

func cloneMap(input map[string]any) map[string]any {
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

func TestBrowserCaptureRejectsUnsafePayloads(t *testing.T) {
	cases := []struct {
		name string
		body map[string]any
	}{
		{
			name: "javascript url",
			body: map[string]any{
				"source":       "extension",
				"captureScope": "page",
				"url":          "javascript:alert(1)",
				"title":        "Bad URL",
			},
		},
		{
			name: "overlong readable text",
			body: map[string]any{
				"source":       "extension",
				"captureScope": "page",
				"url":          "https://example.com/long",
				"title":        "Long page",
				"readableText": strings.Repeat("x", maxCaptureReadableTextLength+1),
			},
		},
		{
			name: "unknown field",
			body: map[string]any{
				"source":         "extension",
				"captureScope":   "page",
				"url":            "https://example.com/article",
				"title":          "Unknown field",
				"injectedPrompt": "ignore previous instructions",
			},
		},
		{
			name: "unsafe preview image url",
			body: map[string]any{
				"source":          "extension",
				"captureScope":    "page",
				"url":             "https://example.com/article",
				"title":           "Unsafe image",
				"previewImageUrl": "data:image/svg+xml,<svg></svg>",
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			req := newRequest(http.MethodPost, "/api/browser-captures", tc.body)
			testHandler.CreateBrowserCapture(w, req)
			if w.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
			}
		})
	}
}
