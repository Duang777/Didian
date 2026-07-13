import { Bot, Boxes, Workflow } from "lucide-react";
import { demoCapabilities, demoRecipes, demoRoles } from "../fixtures";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";

export function AiStudioPage() {
  return (
    <WorkbenchShell
      icon={Bot}
      title="AI Studio"
      description="AI Studio 把旧的 Agents、Skills、Squads 收敛为 AI 角色、能力包和处理配方。"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <WorkbenchSection title="Roles" description="AI 如何分工。">
          <div className="space-y-2">
            {demoRoles.map((role) => (
              <div key={role.id} className="rounded-md border bg-background p-3">
                <div className="text-sm font-medium">{role.name}</div>
                <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </div>
        </WorkbenchSection>

        <WorkbenchSection title="Capabilities" description="AI 可以调用的能力。">
          <div className="space-y-2">
            {demoCapabilities.map((capability) => (
              <div key={capability.id} className="rounded-md border bg-background p-3">
                <div className="flex items-center gap-2 text-sm font-medium"><Boxes className="size-3.5 text-muted-foreground" />{capability.name}</div>
                <p className="mt-1 text-xs text-muted-foreground">{capability.description}</p>
              </div>
            ))}
          </div>
        </WorkbenchSection>

        <WorkbenchSection title="Recipes" description="可复用的处理配方。">
          <div className="space-y-2">
            {demoRecipes.map((recipe) => (
              <div key={recipe.id} className="rounded-md border bg-background p-3">
                <div className="flex items-center gap-2 text-sm font-medium"><Workflow className="size-3.5 text-muted-foreground" />{recipe.name}</div>
                <p className="mt-1 text-xs text-muted-foreground">{recipe.description}</p>
              </div>
            ))}
          </div>
        </WorkbenchSection>
      </div>
    </WorkbenchShell>
  );
}
