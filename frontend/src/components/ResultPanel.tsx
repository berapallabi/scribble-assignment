import type { Guess } from "../services/api";
import { Card } from "./Card";

interface ResultPanelProps {
  guesses: Guess[];
}

export function ResultPanel({ guesses }: ResultPanelProps) {
  return (
    <Card title="Guesses">
      {guesses.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>No guesses yet.</p>
      ) : (
        <ul className="player-list">
          {guesses.map((g, index) => (
            <li key={index} className="player-list__item">
              <span className="player-list__name">
                <strong>{g.participantName}</strong>: {g.text}
              </span>
              <span style={{ color: g.isCorrect ? "#16a34a" : "#ef4444" }}>
                {g.isCorrect ? "✓" : "✗"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
