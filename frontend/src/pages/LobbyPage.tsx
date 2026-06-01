import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState, useRoomStore } from "../state/roomStore";

const POLL_INTERVAL_MS = 2000;
const ERROR_THRESHOLD = 3;

export function LobbyPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId, isLoading } = useRoomState();
  const [pollError, setPollError] = useState<string | null>(null);
  const consecutiveFailures = useRef(0);

  // Redirect to home if no room in state
  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  // Phase-change navigation: detect in-game status from poll and navigate all clients
  useEffect(() => {
    if (room?.status === "in-game") {
      navigate("/game");
    }
  }, [navigate, room?.status]);

  // Auto-polling: replace manual refresh with ~2s interval
  useEffect(() => {
    if (!room) return;

    const id = setInterval(async () => {
      try {
        await roomStore.fetchRoom();
        consecutiveFailures.current = 0;
        setPollError(null);
      } catch (error) {
        consecutiveFailures.current += 1;
        if (consecutiveFailures.current >= ERROR_THRESHOLD) {
          setPollError(error instanceof Error ? error.message : "Unable to refresh room");
        }
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [roomStore, room?.code]);

  const currentParticipant = room?.participants.find((p) => p.id === participantId);
  const isCurrentPlayerHost = currentParticipant?.isHost ?? false;
  const canStartGame = isCurrentPlayerHost && (room?.participants.length ?? 0) >= 2;

  if (!room) {
    return null;
  }

  return (
    <section className="panel placeholder-page">
      <div className="lobby-header">
        <PageHeader
          kicker="Waiting for players"
          title="Lobby"
          description="Share the room code with friends so they can join your game."
        />
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="summary-grid">
        <Card title="Participants">
          {room.participants.length === 0 ? (
            <p>No participants are connected to this room yet.</p>
          ) : (
            <ul className="player-list">
              {room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>{participant.name}</span>
                  {participant.isHost ? (
                    <span className="player-list__badge">Host</span>
                  ) : (
                    <span className="player-list__meta">joined</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status">
          <p
            className="status-line"
            style={{
              backgroundColor: isLoading ? "#fef3c7" : "#e0e7ff",
              color: isLoading ? "#b45309" : "#3730a3"
            }}
          >
            {isLoading ? "Starting game..." : "Ready to play"}
          </p>
          {pollError ? (
            <p style={{ marginTop: "8px", color: "#dc2626" }}>{pollError}</p>
          ) : (
            <p style={{ marginTop: "8px" }}>Waiting for the host to start the game.</p>
          )}
        </Card>
      </div>

      {isCurrentPlayerHost && (
        <div className="button-row button-row--spread">
          <button
            className="button button--primary"
            disabled={!canStartGame || isLoading}
            onClick={() => void roomStore.startGame()}
          >
            {canStartGame ? "Start Game" : "Need at least 2 players"}
          </button>
        </div>
      )}
    </section>
  );
}
