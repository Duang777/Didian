import { FileText } from "lucide-react";
import { Badge } from "@didian/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@didian/ui/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@didian/ui/components/ui/tabs";
import { Markdown } from "../../common/markdown";
import type { ResourceArtifact } from "../mock-data";

const COPY = {
  empty: "还没有生成 artifact。",
  markdownBadge: "Markdown",
};

export type ArtifactPreviewProps = {
  artifacts: ResourceArtifact[];
};

export function ArtifactPreview({ artifacts }: ArtifactPreviewProps) {
  const firstArtifact = artifacts[0];

  if (!firstArtifact) {
    return (
      <Card size="sm">
        <CardContent className="text-sm text-muted-foreground">{COPY.empty}</CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue={firstArtifact.name}>
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        {artifacts.map((artifact) => (
          <TabsTrigger key={artifact.name} value={artifact.name}>
            {artifact.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {artifacts.map((artifact) => (
        <TabsContent key={artifact.name} value={artifact.name} className="mt-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4" />
                <span className="truncate">{artifact.name}</span>
                <Badge variant="outline" className="ml-auto shrink-0">
                  {COPY.markdownBadge}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{artifact.description}</p>
              <div className="max-h-[360px] overflow-auto rounded-md border bg-background p-3">
                <Markdown mode="full">{artifact.markdown}</Markdown>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
