import Fuse from "fuse.js";
import type { WorkflowTemplate } from "../types/index.js";

export interface MatchResult {
  workflow: WorkflowTemplate;
  score: number;
}

export class NLParser {
  private fuse: Fuse<WorkflowTemplate>;

  constructor(workflows: WorkflowTemplate[]) {
    this.fuse = new Fuse(workflows, {
      keys: [
        { name: "intent", weight: 0.4 },
        { name: "keywords", weight: 0.35 },
        { name: "name", weight: 0.15 },
        { name: "toolDescription", weight: 0.1 },
      ],
      threshold: 0.5,
      includeScore: true,
      shouldSort: true,
    });
  }

  parse(input: string): MatchResult[] {
    const directMatch = this.tryDirectMatch(input);
    if (directMatch.length > 0) return directMatch;

    const results = this.fuse.search(input);

    return results.map((r) => ({
      workflow: r.item,
      score: 1 - (r.score ?? 1),
    }));
  }

  parseMultiple(inputs: string[]): MatchResult[] {
    const seen = new Set<string>();
    const results: MatchResult[] = [];

    for (const input of inputs) {
      for (const match of this.parse(input)) {
        if (!seen.has(match.workflow.id)) {
          seen.add(match.workflow.id);
          results.push(match);
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private tryDirectMatch(input: string): MatchResult[] {
    const lower = input.toLowerCase().trim();
    const tokens = lower.split(/[\s,]+/).filter(Boolean);

    const results: MatchResult[] = [];

    for (const workflow of this.getAllWorkflows()) {
      const idMatch = tokens.some((t) => workflow.id.includes(t));
      const keywordMatch = workflow.keywords.some((kw) =>
        tokens.some((t) => kw.includes(t) || t.includes(kw)),
      );

      if (idMatch) {
        results.push({ workflow, score: 0.95 });
      } else if (keywordMatch) {
        const matchCount = workflow.keywords.filter((kw) =>
          tokens.some((t) => kw.includes(t) || t.includes(kw)),
        ).length;
        results.push({
          workflow,
          score: Math.min(0.9, 0.5 + matchCount * 0.1),
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private getAllWorkflows(): WorkflowTemplate[] {
    return (this.fuse as any)._docs as WorkflowTemplate[];
  }
}
