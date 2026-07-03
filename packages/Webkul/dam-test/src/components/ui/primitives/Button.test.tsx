import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "./Button";
describe("Button", () => {
  it("renders children and variant class", () => {
    render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });
});
