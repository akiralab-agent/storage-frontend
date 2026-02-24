import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StatusPage from "@/features/status/ui/StatusPage";
import { useStatusViewStore } from "@/features/status/store/statusViewStore";

type StatusResponse = {
  status: string;
  timestamp: string;
};

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("StatusPage", () => {
  beforeEach(() => {
    useStatusViewStore.setState({ showTimestamp: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useStatusViewStore.setState({ showTimestamp: false });
  });

  it("renders API status and allows toggling the timestamp", async () => {
    const payload: StatusResponse = {
      status: "ok",
      timestamp: "2025-01-10T12:00:00.000Z"
    };

    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<StatusPage />);

    const status = await screen.findByText("ok");
    expect(status).toBeInTheDocument();

    const toggleButton = screen.getByRole("button", { name: /show timestamp/i });
    await userEvent.click(toggleButton);

    const updatedStatus = await screen.findByText(/ok\s*\(/);
    expect(updatedStatus).toHaveTextContent(payload.timestamp);
    expect(screen.getByRole("button", { name: /hide timestamp/i })).toBeInTheDocument();
  });

  it("renders an error state when the API is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "down" }), {
          status: 503,
          headers: { "content-type": "application/json" }
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<StatusPage />);

    expect(await screen.findByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/request failed with status 503/i)).toBeInTheDocument();
  });
});
