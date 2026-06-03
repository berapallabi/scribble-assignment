import type { Participant } from "../services/api";
import { Card } from "./Card";

interface ScoreboardProps {
  participants: Participant[];
}

export function Scoreboard({ participants }: ScoreboardProps) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);

  return (
    <Card title="Scoreboard">
      <ul className="player-list">
        {sorted.map((p) => (
          <li key={p.id} className="player-list__item">
            <span className="player-list__name">{p.name}</span>
            <strong>{p.score}</strong>
          </li>
        ))}
      </ul>
    </Card>
  );
}
