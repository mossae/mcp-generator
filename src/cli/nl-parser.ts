import Fuse from "fuse.js";
import type { WorkflowTemplate } from "@/types";

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
      threshold: 0.4,
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
    const stopWords = new Set(["a", "an", "the", "to", "for", "and", "or", "my", "new", "with", "in"]);
    const meaningful = tokens.filter((t) => !stopWords.has(t) && t.length > 2);

    const results: MatchResult[] = [];

    for (const workflow of this.getAllWorkflows()) {
      const idTokens = workflow.id.split("-");
      const idOverlap = meaningful.filter((t) => idTokens.some((id) => id.includes(t) || t.includes(id)));
      const idScore = idOverlap.length / Math.max(idTokens.length, 1);

      const kwMatches = workflow.keywords.filter((kw) =>
        meaningful.some((t) => kw.includes(t) || t.includes(kw)),
      );
      const kwScore = kwMatches.length / Math.max(workflow.keywords.length, 1);

      const combinedScore = idScore * 0.6 + kwScore * 0.4;

      if (combinedScore >= 0.25) {
        results.push({ workflow, score: Math.min(0.95, combinedScore) });
      }
    }

    if (results.length === 0) return [];

    results.sort((a, b) => b.score - a.score);
    const topScore = results[0].score;
    return results.filter((r) => r.score >= topScore * 0.6);
  }

  private getAllWorkflows(): WorkflowTemplate[] {
    return (this.fuse as any)._docs as WorkflowTemplate[];
  }
}
