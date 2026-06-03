import { useState } from "react";

interface GuessFormProps {
  onSubmit: (text: string) => void;
  error?: string | null;
  disabled?: boolean;
}

export function GuessForm({ onSubmit, error = null, disabled = false }: GuessFormProps) {
  const [guessText, setGuessText] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(guessText);
    setGuessText("");
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__field">
        <input
          className="form__input"
          value={guessText}
          onChange={(event) => setGuessText(event.target.value)}
          placeholder="Type your guess here..."
          disabled={disabled}
        />
      </label>
      {error && <p className="form__error" style={{ color: "#ef4444", fontSize: "0.875rem" }}>{error}</p>}
      <div className="button-row button-row--compact">
        <button className="button button--primary" type="submit" disabled={disabled}>
          Submit Guess
        </button>
      </div>
    </form>
  );
}
