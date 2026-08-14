package handler

import (
	"log/slog"
	"net/http"

	"github.com/didian-ai/didian/server/internal/logger"
)

// DemoAuth handles POST /auth/demo — returns a signed JWT for the demo user.
// This allows the Chrome extension and other clients to authenticate without
// going through the email verification flow during development / demo.
func (h *Handler) DemoAuth(w http.ResponseWriter, r *http.Request) {
	user, err := h.Queries.GetUserByEmail(r.Context(), demoEmail)
	if err != nil {
		slog.Warn("demo auth: demo user not found (seed not run?)", append(logger.RequestAttrs(r), "error", err)...)
		writeError(w, http.StatusNotFound, "demo user not found. Start the server with --demo or DEMO_MODE=true to seed demo data.")
		return
	}

	tokenString, err := h.issueJWT(user)
	if err != nil {
		slog.Warn("demo auth: failed to issue JWT", append(logger.RequestAttrs(r), "error", err)...)
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"token": tokenString,
	})
}