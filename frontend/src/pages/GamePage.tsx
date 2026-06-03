import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { DrawingCanvas } from "../components/DrawingCanvas";
import { GuessForm } from "../components/GuessForm";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { api, type Point } from "../services/api";
import { useRoomState, useRoomStore } from "../state/roomStore";

const POLL_INTERVAL_MS = 2000;

export function GamePage() {
  const navigate = useNavigate();
  const store = useRoomStore();
  const { room, participantId } = useRoomState();
  const [guessError, setGuessError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const consecutiveFailures = useRef(0);

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  useEffect(() => {
    if (!room) return;

    const id = setInterval(async () => {
      try {
        await store.fetchRoom();
        consecutiveFailures.current = 0;
      } catch {
        consecutiveFailures.current += 1;
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [store, room?.code]);

  useEffect(() => {
    if (room?.status === "lobby") {
      navigate("/lobby", { replace: true });
    }
  }, [navigate, room?.status]);

  if (!room || !participantId) {
    return null;
  }

  // Game-over overlay — render before canvas/guess layout
  if (room.status === "game-over") {
    const sorted = [...room.participants].sort((a, b) => b.score - a.score);
    const isHost = room.participants.find((p) => p.id === participantId)?.isHost ?? false;

    async function handleRestart() {
      if (!room || !participantId) return;
      try {
        const response = await api.restartGame(room.code, participantId);
        store.setRoomSnapshot(response.room);
      } catch {
        // ignore; polling will reflect state
      }
    }

    return (
      <section className="panel game-page">
        <div className="game-page__header">
          <div className="game-page__header-left">
            <span className="section-kicker">Game Over</span>
            <h1 className="game-page__title">Final Scores</h1>
          </div>
          <RoomCodeBadge code={room.code} />
        </div>

        <div style={{ maxWidth: "560px", margin: "2rem auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {room.currentWord && (
            <Card title="Word Reveal">
              <p style={{ fontSize: "1.25rem", fontWeight: 600, textAlign: "center" }}>
                The word was: <strong>{room.currentWord}</strong>
              </p>
            </Card>
          )}

          <Card title="Final Scores">
            <ul className="player-list">
              {sorted.map((p, i) => (
                <li key={p.id} className="player-list__item">
                  <span className="player-list__name">{i + 1}. {p.name}</span>
                  <strong>{p.score} pts</strong>
                </li>
              ))}
            </ul>
          </Card>

          <ResultPanel guesses={room.guesses ?? []} />
        </div>

        <div className="button-row">
          {isHost && (
            <button className="button button--primary" onClick={handleRestart}>
              Play Again
            </button>
          )}
          <button className="button button--secondary" onClick={() => navigate("/lobby")}>
            Back to Lobby
          </button>
        </div>
      </section>
    );
  }

  const isDrawer = room.drawerId === participantId;
  const drawerName = room.participants.find((p) => p.id === room.drawerId)?.name;
  const wordDisplay = isDrawer
    ? room.currentWord
    : room.wordLength
      ? Array.from({ length: room.wordLength }, () => "_").join(" ")
      : null;

  async function handleStroke(points: Point[]) {
    if (!room || !participantId) {
      return;
    }

    try {
      const response = await api.addStroke(room.code, participantId, points);
      store.setRoomSnapshot(response.room);
    } catch {
      // stroke failures are non-critical; drawing continues locally
    }
  }

  async function handleClear() {
    if (!room || !participantId) {
      return;
    }

    try {
      const response = await api.clearStrokes(room.code, participantId);
      store.setRoomSnapshot(response.room);
    } catch {
      // ignore
    }
  }

  async function handleGuess(text: string) {
    if (!room || !participantId) {
      return;
    }

    setIsSubmitting(true);
    setGuessError(null);

    try {
      const response = await api.submitGuess(room.code, participantId, text);
      store.setRoomSnapshot(response.room);
    } catch (error) {
      setGuessError(error instanceof Error ? error.message : "Failed to submit guess");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">
            Round {room.roundNumber} &nbsp;·&nbsp; {room.secondsRemaining}s
          </span>
          <h1 className="game-page__title">Guess the Word!</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Card title="Current Drawer">
            <p className="game-page__drawer-name">{drawerName ?? "Unknown"}</p>
          </Card>

          <Card title="Word">
            <p className="game-page__word">{wordDisplay ?? "—"}</p>
          </Card>

          <Scoreboard participants={room.participants} />
          <ResultPanel guesses={room.guesses ?? []} />
        </aside>

        <div className="game-page__main">
          <Card title="Canvas">
            <DrawingCanvas
              strokes={room.strokes ?? []}
              onStroke={isDrawer ? handleStroke : undefined}
              onClear={isDrawer ? handleClear : undefined}
            />
          </Card>
        </div>

        {!isDrawer && (
          <aside className="game-page__sidebar game-page__sidebar--right">
            <Card title="Your Guess">
              <GuessForm
                onSubmit={handleGuess}
                error={guessError}
                disabled={isSubmitting}
              />
            </Card>
          </aside>
        )}
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
      </div>
    </section>
  );
}
