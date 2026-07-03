import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Prose } from "./Prose";

describe("Prose", () => {
  it("renders markdown as HTML", () => {
    const { container } = render(<Prose markdown="# Hi" />);
    const heading = container.querySelector("h1");
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toBe("Hi");
  });

  it("strips script tags from the input", () => {
    const { container } = render(<Prose markdown={`# Hi\n<script>alert('xss')</script>`} />);
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("<script>");
  });
});
