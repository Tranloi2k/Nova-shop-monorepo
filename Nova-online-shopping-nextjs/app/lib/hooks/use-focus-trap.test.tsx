import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { useFocusTrap } from "./use-focus-trap";

function Trap() {
  const [active, setActive] = useState(true);
  const ref = useFocusTrap<HTMLDivElement>(active, () => setActive(false));
  return (
    <div>
      <span>{active ? "active" : "closed"}</span>
      <div ref={ref}>
        <button>first</button>
        <button>last</button>
      </div>
    </div>
  );
}

describe("useFocusTrap", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 10 });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 10 });
  });

  it("wraps tab focus and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Trap />);
    const first = screen.getByRole("button", { name: "first" });
    const last = screen.getByRole("button", { name: "last" });

    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(first).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.getByText("closed")).toBeVisible();
  });

  it("safely ignores a focusable collection without a last element", () => {
    const at = vi.spyOn(Array.prototype, "at").mockReturnValueOnce(undefined);
    render(<Trap />);
    screen.getByRole("button", { name: "last" }).focus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(at).toHaveBeenCalledWith(-1);
    at.mockRestore();
  });
});
