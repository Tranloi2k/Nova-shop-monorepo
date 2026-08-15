import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileForm from "./profile-form";

const mocks = vi.hoisted(() => ({ updateUser: vi.fn(), revalidate: vi.fn(), refresh: vi.fn() }));

vi.mock("@/app/lib/services/user", () => ({ updateUser: mocks.updateUser }));
vi.mock("@/app/lib/actions", () => ({ revalidateUserProfile: mocks.revalidate }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

describe("ProfileForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits trimmed values and displays an API validation error", async () => {
    mocks.updateUser.mockResolvedValue({ error: "Email is already used" });
    const user = userEvent.setup();
    render(
      <ProfileForm initialUser={{ id: 7, username: "Nova", email: "nova@example.com" }} />,
    );

    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "  Nova Admin  ");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mocks.updateUser).toHaveBeenCalledWith({
      username: "Nova Admin",
      email: "nova@example.com",
    });
    expect(await screen.findByText("Email is already used")).toBeVisible();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
