import type { SourceHealth } from "@/domain/catalogue";

export function sourceHealthMessage(status: SourceHealth): string | null {
  const messages: Record<Exclude<SourceHealth, "healthy">, string> = {
    changed:
      "The latest source check needs human review. This page still shows the last approved information; confirm details with the publisher.",
    stale:
      "We have not successfully checked this source within its review window. Confirm details with the publisher.",
    unreachable:
      "The publisher’s source could not be reached on the latest check. This shows the last approved information.",
    invalid:
      "The source format changed and could not be reviewed automatically. This shows the last approved information.",
    suspended:
      "Automated source checking is suspended. Confirm all details directly with the publisher.",
  };
  return status === "healthy" ? null : messages[status];
}
