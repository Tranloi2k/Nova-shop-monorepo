import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SafeImage, canOptimizeImageWithNext } from "./safe-image";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} data-next-image="true" />
  ),
}));

describe("SafeImage", () => {
  it("recognizes local and configured remote image sources", () => {
    expect(canOptimizeImageWithNext("/products/phone.jpg")).toBe(true);
    expect(canOptimizeImageWithNext("https://res.cloudinary.com/demo/image.jpg")).toBe(true);
    expect(canOptimizeImageWithNext("https://lh3.googleusercontent.com/avatar.jpg")).toBe(true);
    expect(canOptimizeImageWithNext("not a URL")).toBe(false);
  });

  it("uses next/image for an allowed source", () => {
    render(<SafeImage src="/phone.jpg" alt="Phone" width={100} height={100} />);

    expect(screen.getByAltText("Phone")).toHaveAttribute("data-next-image", "true");
  });

  it("uses a lazy fallback image for an unconfigured host", () => {
    render(
      <SafeImage
        src="https://vendor.example.com/phone.jpg"
        alt="Vendor phone"
        width={120}
        height={80}
      />,
    );

    expect(screen.getByAltText("Vendor phone")).toHaveAttribute("loading", "lazy");
    expect(screen.getByAltText("Vendor phone")).toHaveStyle({ width: "120px", height: "80px" });
  });

  it("supports eager, fill-positioned fallback images", () => {
    render(
      <SafeImage
        src="https://vendor.example.com/hero.jpg"
        alt="Hero"
        fill
        priority
        style={{ objectFit: "cover" }}
      />,
    );

    expect(screen.getByAltText("Hero")).toHaveAttribute("loading", "eager");
    expect(screen.getByAltText("Hero")).toHaveStyle({ position: "absolute", objectFit: "cover" });
  });
});
