import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState } from "../state/roomStore";

export function GamePage() {
  const navigate = useNavigate();
  const { room, participantId } = useRoomState();

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  if (!room) {
    return null;
  }

  const isDrawer = room.drawerId === participantId;
  const drawerName = room.participants.find((p) => p.id === room.drawerId)?.name;
  const wordDisplay = isDrawer
    ? room.currentWord
    : room.wordLength
      ? Array.from({ length: room.wordLength }, () => "_").join(" ")
      : null;

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
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

          <Card title="Players">
            <ul className="player-list">
              {room.participants.map((p) => (
                <li key={p.id} className="player-list__item">
                  <span className="player-list__name">{p.name}</span>
                  <span className="player-list__role">
                    {p.id === room.drawerId ? "Drawer" : "Guesser"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        <div className="game-page__main">
          <Card title="Canvas">
            <div
              className="canvas-placeholder"
              style={{ minHeight: "500px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}
            >
              {isDrawer ? "You are drawing!" : `Waiting for ${drawerName ?? "the drawer"} to draw...`}
            </div>
          </Card>
        </div>
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
      </div>
    </section>
  );
}
