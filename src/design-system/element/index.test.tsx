import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "./index";

describe("TransPerfect Element public component surface", () => {
  it("renders the foundational components through the public barrel", () => {
    const html = renderToStaticMarkup(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Review ready</CardTitle>
          <CardDescription>Confirm the approved content.</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge>Approved</Badge>
          <Input aria-label="Project name" defaultValue="Element" />
          <Textarea aria-label="Notes" defaultValue="Ready" />
          <Button>Continue</Button>
        </CardContent>
      </Card>,
    );

    expect(html).toContain("Review ready");
    expect(html).toContain("Project name");
    expect(html).toContain("Continue");
  });

  it("preserves semantic native elements and named variants", () => {
    const html = renderToStaticMarkup(
      <>
        <Button variant="outline" size="sm">
          Review
        </Button>
        <Badge variant="secondary">Draft</Badge>
        <Input type="email" aria-label="Email" />
        <Textarea aria-label="Summary" />
      </>,
    );

    expect(html).toContain("<button");
    expect(html).toContain('type="email"');
    expect(html).toContain("<textarea");
    expect(html).toContain("bg-secondary");
  });
});