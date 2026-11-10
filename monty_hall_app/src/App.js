import { useState } from "react";
import "./App.css";

const VENUES = [
  {
    id: "oberweis",
    name: "Oberweis Ice Cream",
    kind: "The expensive pick",
    href: "https://www.oberweis.com/ice-cream-and-dairy-stores/Troy",
    icon: "🍨",
  },
  {
    id: "mcdonalds",
    name: "McDonald's",
    kind: "A budget-friendly treat",
    href: "https://www.mcdonalds.com/us/en-us/location/MI/STERLING-HEIGHTS/2000-18-MILE-RD/21836.html?cid=RF%3AYXT%3AGMB%3A%3AClicks",
    icon: "🍦",
  },
  {
    id: "wendys",
    name: "Wendy's",
    kind: "A budget-friendly treat",
    href: "https://locations.wendys.com/united-states/mi/sterling-heights/40950-ryan-road",
    icon: "🍦",
  },
];

const DAILY_PLAY_KEY = "monty-hall-daily-play";

function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function shuffleVenues() {
  const shuffled = [...VENUES];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function readDailyPlay() {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(DAILY_PLAY_KEY) || "null",
    );
    if (
      saved?.date !== getLocalDateKey() ||
      !Array.isArray(saved.venueIds) ||
      saved.venueIds.length !== 3 ||
      new Set(saved.venueIds).size !== 3 ||
      saved.venueIds.some((id) => !VENUES.some((venue) => venue.id === id)) ||
      !Number.isInteger(saved.pickedDoor) ||
      !Number.isInteger(saved.openedDoor) ||
      !Number.isInteger(saved.finalDoor) ||
      [saved.pickedDoor, saved.openedDoor, saved.finalDoor].some(
        (door) => door < 0 || door > 2,
      ) ||
      typeof saved.switched !== "boolean"
    ) {
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

function makeResultsText(round, venues) {
  const revealedVenue = venues[round.openedDoor];
  const finalVenue = venues[round.finalDoor];
  const finalRow = venues
    .map((venue, door) => (door === round.openedDoor ? "❌" : venue.icon))
    .join(" ");

  return [
    "SCOOP OR SWITCH",
    `Picked door ${round.pickedDoor + 1}.`,
    `The host revealed door ${round.openedDoor + 1}: ${revealedVenue.name} ${revealedVenue.icon}.`,
    `${round.switched ? "Switched" : "Stayed with"} door ${round.finalDoor + 1}: ${finalVenue.name}.`,
    round.won ? "🍨 Found Oberweis!" : "Not the pricey scoop today.",
    "",
    "🚪 🚪 🚪",
    venues
      .map((venue, door) => (door === round.openedDoor ? venue.icon : "🚪"))
      .join(" "),
    finalRow,
  ].join("\n");
}

function Door({
  number,
  venue,
  isOpen,
  isSelected,
  isHostReveal,
  isFinalChoice,
  onClick,
  disabled,
}) {
  const classes = [
    "door",
    isOpen ? "door--open" : "",
    isSelected ? "door--selected" : "",
    isHostReveal ? "door--host-reveal" : "",
    isFinalChoice ? "door--final-choice" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Door ${number}${isOpen && venue ? `, ${venue.name}` : ""}`}
      aria-pressed={isSelected || isFinalChoice}
    >
      <span className="door-number">{String(number).padStart(2, "0")}</span>
      {isOpen && venue ? (
        <span className="door-prize">
          <span className="door-icon" aria-hidden="true">
            {venue.icon}
          </span>
          <span className="door-venue">{venue.name}</span>
        </span>
      ) : (
        <span className="door-knob" aria-hidden="true" />
      )}
      {isSelected && !isOpen && <span className="door-tag">Your pick</span>}
      {isFinalChoice && <span className="door-tag">Your choice</span>}
    </button>
  );
}

function App() {
  const [initialGame] = useState(() => {
    const savedPlay = readDailyPlay();
    const savedVenues = savedPlay
      ? savedPlay.venueIds.map((id) => VENUES.find((venue) => venue.id === id))
      : shuffleVenues();
    return { savedPlay, savedVenues };
  });
  const [venues, setVenues] = useState(initialGame.savedVenues);
  const [dailyPlay, setDailyPlay] = useState(initialGame.savedPlay);
  const [pickedDoor, setPickedDoor] = useState(
    initialGame.savedPlay?.pickedDoor ?? null,
  );
  const [openedDoor, setOpenedDoor] = useState(
    initialGame.savedPlay?.openedDoor ?? null,
  );
  const [finalDoor, setFinalDoor] = useState(
    initialGame.savedPlay?.finalDoor ?? null,
  );
  const [isResultOpen, setIsResultOpen] = useState(
    Boolean(initialGame.savedPlay),
  );
  const [copied, setCopied] = useState(false);
  const [retryPassword, setRetryPassword] = useState("");
  const [retryError, setRetryError] = useState("");

  const phase =
    finalDoor !== null
      ? "result"
      : openedDoor !== null
        ? "decision"
        : pickedDoor !== null
          ? "reveal"
          : "pick";
  const won = phase === "result" && venues[finalDoor]?.id === "oberweis";

  function chooseDoor(door) {
    if (phase !== "pick" || dailyPlay) return;
    const safeDoors = [0, 1, 2].filter(
      (candidate) => candidate !== door && venues[candidate].id !== "oberweis",
    );
    setPickedDoor(door);
    setOpenedDoor(safeDoors[Math.floor(Math.random() * safeDoors.length)]);
  }

  function finishRound(shouldSwitch) {
    if (dailyPlay || pickedDoor === null || openedDoor === null) return;
    const resultDoor = shouldSwitch
      ? [0, 1, 2].find((door) => door !== pickedDoor && door !== openedDoor)
      : pickedDoor;
    const round = {
      date: getLocalDateKey(),
      venueIds: venues.map((venue) => venue.id),
      pickedDoor,
      openedDoor,
      finalDoor: resultDoor,
      switched: shouldSwitch,
      won: venues[resultDoor].id === "oberweis",
    };
    setFinalDoor(resultDoor);
    setDailyPlay(round);
    setIsResultOpen(true);
    try {
      window.localStorage.setItem(DAILY_PLAY_KEY, JSON.stringify(round));
    } catch {}
  }

  async function copyResults() {
    const resultsText = makeResultsText(dailyPlay, venues);
    try {
      await navigator.clipboard.writeText(resultsText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy your game results:", resultsText);
    }
  }

  function retryWithPassword(event) {
    event.preventDefault();
    if (retryPassword.trim().toLowerCase() !== "jesus") {
      setRetryError("That password did not match. Try again.");
      return;
    }

    setVenues(shuffleVenues());
    setPickedDoor(null);
    setOpenedDoor(null);
    setFinalDoor(null);
    setDailyPlay(null);
    setIsResultOpen(false);
    setCopied(false);
    setRetryPassword("");
    setRetryError("");
    try {
      window.localStorage.removeItem(DAILY_PLAY_KEY);
    } catch {}
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href={process.env.PUBLIC_URL || "/"}
          aria-label="Scoop or Switch home"
        >
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          <span>Scoop or Switch</span>
        </a>
        <div className="topbar-note">
          <span className="live-dot" /> A little game of odds
        </div>
      </header>

      <section className="game-layout" aria-label="Monty Hall game">
        <div className="game-main">
          <div className="stage-heading">
            <span className="stage-number">
              {phase === "result" ? "03" : phase === "decision" ? "02" : "01"}
            </span>
            <div>
              <h2>
                {phase === "pick" && "Choose your door"}
                {phase === "reveal" && "You have a door"}
                {phase === "decision" && "The host opened a door"}
                {phase === "result" &&
                  (won ? "A very good scoop" : "Not this time")}
              </h2>
              <p>
                {phase === "pick" &&
                  "One hides Oberweis. The other two are the cheaper option."}
                {phase === "reveal" &&
                  "Your pick is locked in. The host is opening a safe door…"}
                {phase === "decision" &&
                  `Door ${openedDoor + 1} has ${venues[openedDoor].name}. Keep your pick or switch?`}
                {phase === "result" &&
                  "Today's game is complete. Come back tomorrow for another round."}
              </p>
            </div>
          </div>

          <div
            className={`doors doors--${phase}`}
            aria-label="Three game doors"
          >
            {[0, 1, 2].map((door) => {
              const isOpen =
                phase === "result" ||
                (openedDoor === door && phase !== "pick" && phase !== "reveal");
              return (
                <Door
                  key={door}
                  number={door + 1}
                  venue={isOpen ? venues[door] : null}
                  isOpen={isOpen}
                  isSelected={pickedDoor === door}
                  isHostReveal={openedDoor === door && phase !== "result"}
                  isFinalChoice={finalDoor === door}
                  onClick={() => chooseDoor(door)}
                  disabled={phase !== "pick"}
                />
              );
            })}
          </div>

          <div className="game-controls" aria-live="polite">
            {phase === "pick" && (
              <p className="helper-text">
                Choose a door to get started <span aria-hidden="true">↗</span>
              </p>
            )}
            {phase === "reveal" && (
              <p className="helper-text">Opening a door…</p>
            )}
            {phase === "decision" && (
              <div className="decision-actions">
                <button
                  className="button button--quiet"
                  type="button"
                  onClick={() => finishRound(false)}
                >
                  Stay with door {pickedDoor + 1}
                </button>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => finishRound(true)}
                >
                  Switch doors <span aria-hidden="true">↗</span>
                </button>
              </div>
            )}
            {phase === "result" && (
              <div className="result-actions">
                <button
                  className="button button--quiet"
                  type="button"
                  onClick={() => setIsResultOpen(true)}
                >
                  View today's result
                </button>
                <a
                  className="venue-link"
                  href={venues[finalDoor].href}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit {venues[finalDoor].name}{" "}
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {dailyPlay && isResultOpen && (
        <div className="result-backdrop">
          <section
            className="score-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
          >
            <div className="panel-topline">
              <span>YOUR DAILY SCOOP</span>
              <span className="panel-star" aria-hidden="true">
                ✳
              </span>
            </div>
            <p className={`result-kicker ${won ? "result-kicker--win" : ""}`}>
              {won ? "A VERY GOOD PICK" : "THE SCOOP GOT AWAY"}
            </p>
            <h2 id="result-title">
              {won ? "You found Oberweis!" : "Not the pricey scoop today."}
            </h2>
            <p className="result-description">
              {dailyPlay.switched
                ? "You switched doors"
                : "You stayed with your first pick"}{" "}
              and landed on {venues[finalDoor].name}.
            </p>
            <div className="result-details">
              <p>
                You picked door <strong>{pickedDoor + 1}</strong>.
              </p>
              <p>
                The host revealed door <strong>{openedDoor + 1}</strong>:{" "}
                {venues[openedDoor].name} {venues[openedDoor].icon}
              </p>
              <p>
                You {dailyPlay.switched ? "switched" : "stayed"} to door{" "}
                <strong>{finalDoor + 1}</strong>.
              </p>
            </div>
            <pre className="result-grid" aria-label="Your door choices">
              {`🚪 🚪 🚪\n${venues.map((venue, door) => (door === openedDoor ? venue.icon : "🚪")).join(" ")}\n${venues.map((venue, door) => (door === openedDoor ? "❌" : venue.icon)).join(" ")}`}
            </pre>
            <button
              className="button button--primary copy-results"
              type="button"
              onClick={copyResults}
            >
              <span aria-hidden="true">▣</span>{" "}
              {copied ? "Copied to clipboard" : "Copy results to clipboard"}
            </button>
            <a
              className="venue-link modal-venue-link"
              href={venues[finalDoor].href}
              target="_blank"
              rel="noreferrer"
            >
              Visit {venues[finalDoor].name} <span aria-hidden="true">↗</span>
            </a>
            <p className="daily-limit">
              One game per day. Enter the retry password to play again.
            </p>
            <form className="retry-form" onSubmit={retryWithPassword}>
              <label htmlFor="retry-password">Retry password</label>
              <div className="retry-controls">
                <input
                  id="retry-password"
                  type="password"
                  value={retryPassword}
                  onChange={(event) => {
                    setRetryPassword(event.target.value);
                    setRetryError("");
                  }}
                  placeholder="Enter password"
                  autoComplete="off"
                  aria-describedby={retryError ? "retry-error" : undefined}
                />
                <button className="button button--quiet" type="submit">
                  Retry
                </button>
              </div>
              {retryError && (
                <p className="retry-error" id="retry-error" role="alert">
                  {retryError}
                </p>
              )}
            </form>
            <button
              className="modal-close"
              type="button"
              aria-label="Close results"
              onClick={() => setIsResultOpen(false)}
            >
              ×
            </button>
          </section>
        </div>
      )}

      <footer className="page-footer">
        <span>Three doors, one delicious decision.</span>
        <span>
          GOOD LUCK OUT THERE <span aria-hidden="true">✳</span>
        </span>
      </footer>
    </main>
  );
}

export default App;
