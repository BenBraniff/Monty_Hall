import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  window.localStorage.clear();
});

test("shows and copies the result, then blocks another game for the day", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const { unmount } = render(<App />);

  expect(
    screen.queryByText("THE STERLING HEIGHTS SCOOP"),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/One door has/i)).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("Possible ice cream locations"),
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Door 1" }));
  expect(screen.getByText(/The host opened a door/i)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Door [23], (McDonald's|Wendy's)/i }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: /Stay with door 1/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Switch doors/i }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Switch doors/i }));

  expect(screen.getByRole("dialog")).toHaveTextContent(/You switched doors/);
  expect(screen.getByRole("dialog")).toHaveTextContent(
    /Copy results to clipboard/,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Copy results to clipboard/i }),
  );
  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
  expect(writeText.mock.calls[0][0]).toMatch(/Picked door 1\.[\s\S]*🚪 🚪 🚪/);
  expect(writeText.mock.calls[0][0]).toMatch(/The host revealed door [23]:/);

  fireEvent.click(screen.getByRole("button", { name: /Close results/i }));
  expect(screen.getByText(/Today's game is complete/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Door 1/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /View today's result/i }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();

  unmount();
  render(<App />);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Door 1/ })).toBeDisabled();

  const retryInput = screen.getByLabelText("Retry password");
  fireEvent.change(retryInput, { target: { value: "incorrect" } });
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    /password did not match/i,
  );
  expect(screen.getByRole("button", { name: /^Door 1/ })).toBeDisabled();

  fireEvent.change(retryInput, { target: { value: "jEsUs" } });
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Door 1" })).toBeEnabled();
  expect(window.localStorage.getItem("monty-hall-daily-play")).toBeNull();
});
