-- Knowledge Relation: lightweight edges between personal skills, proposals and
-- captured sources for the V3 "Atlas 局部关系" feature. Created now so the schema
-- is stable; only minimal CRUD is wired in V2.

CREATE TABLE knowledge_relation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,

    from_type TEXT NOT NULL,
    from_id UUID NOT NULL,
    to_type TEXT NOT NULL,
    to_id UUID NOT NULL,

    -- related_to | derived_from | supports
    relation_type TEXT NOT NULL,
    strength DOUBLE PRECISION,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_relation_workspace ON knowledge_relation(workspace_id);
CREATE INDEX idx_knowledge_relation_from ON knowledge_relation(from_type, from_id);
CREATE INDEX idx_knowledge_relation_to ON knowledge_relation(to_type, to_id);
