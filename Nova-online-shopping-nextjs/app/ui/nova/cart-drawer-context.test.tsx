import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CartDrawerProvider, useCartDrawer } from "./cart-drawer-context";

function Consumer() {
  const drawer = useCartDrawer();
  return (
    <div>
      <output>{`${drawer.isOpen}/${drawer.hasOpened}`}</output>
      <button onClick={drawer.open}>open</button>
      <button onClick={drawer.close}>close</button>
      <button onClick={drawer.toggle}>toggle</button>
    </div>
  );
}

describe("CartDrawerProvider", () => {
  it("opens, closes, and toggles while remembering that it has opened", async () => {
    const user = userEvent.setup();
    render(<CartDrawerProvider><Consumer /></CartDrawerProvider>);

    expect(screen.getByText("false/false")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "open" }));
    expect(screen.getByText("true/true")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "close" }));
    expect(screen.getByText("false/true")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByText("true/true")).toBeVisible();
  });
});
