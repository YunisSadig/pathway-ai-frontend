import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingState } from "@/components/shared/loading-state";

describe("LoadingState", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows only the skeleton at first", () => {
    render(<LoadingState label="Loading programs" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText(/taking longer than usual/i)).toBeNull();
  });

  it("explains a long wait (a sleeping free-tier data service) after a few seconds", () => {
    render(<LoadingState />);
    act(() => {
      vi.advanceTimersByTime(6_100);
    });
    expect(screen.getByText(/taking longer than usual/i)).toBeInTheDocument();
    expect(screen.getByText(/up to two minutes/i)).toBeInTheDocument();
  });

  it("stops the timer when it unmounts", () => {
    const { unmount } = render(<LoadingState />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
