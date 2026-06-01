import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function LobbyPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, error, isLoading, participantId } = useRoomState();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);
useEffect(() => {
    // If there is no active room configuration tracking, don't spin up polling
    if (!room) return;

    // Trigger an immediate initial sync fetch on mount
    roomStore.fetchRoom().catch((err) => console.error("Initial lobby sync failed:", err));

    // Spin up an automatic 2000ms polling interval process 
    const pollingInterval = setInterval(() => {
      roomStore.fetchRoom().catch((err) => console.error("Automated lobby sync failed:", err));
    }, 2000);

    // CRITICAL CLEANUP: Clear interval on unmount to completely kill background execution loops
    return () => clearInterval(pollingInterval);
  }, [room, roomStore]);
  async function handleRefresh() {
    try {
      setRefreshError(null);
      await roomStore.fetchRoom();
    } catch (caughtError) {
      setRefreshError(caughtError instanceof Error ? caughtError.message : "Unable to refresh room");
    }
  }
async function handleStartGame() {
    if (!room || !participantId) return;
    try {
      setRefreshError(null);
      
      const response = await fetch(`http://localhost:3000/api/rooms/${room.code}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to start game.");
      }
    } catch (caughtError) {
      setRefreshError(caughtError instanceof Error ? caughtError.message : "Unable to launch match.");
    }
  }
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
                  <span className="player-list__meta">joined</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status">
          <p className="status-line" style={{ backgroundColor: isLoading ? '#fef3c7' : '#e0e7ff', color: isLoading ? '#b45309' : '#3730a3' }}>
            {isLoading ? "Refreshing players..." : "Ready to play"}
          </p>
          <p style={{ marginTop: '8px' }}>{error ?? refreshError ?? "Waiting for the host to start the game."}</p>
        </Card>
      </div>

      <div className="button-row button-row--spread">
        <button className="button button--secondary" disabled={isLoading} onClick={handleRefresh}>
          {isLoading ? "Refreshing..." : "Refresh Room"}
        </button>
        {room && participantId === room.hostId ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <button 
              className="button button--primary" 
              onClick={handleStartGame}
              disabled={room.participants.length < 2}
              style={{ opacity: room.participants.length < 2 ? 0.6 : 1 }}
            >
              Start Game ({room.participants.length}/2)
            </button>
            {room.participants.length < 2 && (
              <span style={{ color: "#e53e3e", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                Need ≥ 2 players
              </span>
            )}
          </div>
        ) : (
          <span style={{ color: "#718096", fontSize: "0.875rem", fontStyle: "italic", alignSelf: "center" }}>
            Waiting for host to start...
          </span>
        )}
      </div>
    </section>
  );
}
