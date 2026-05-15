import { useMemo, useState } from "react";
import type { GameSlug } from "./types";
import { games } from "../games/gameRegistry";
import { GameShell } from "../shared/GameShell";
import { MainMenu } from "../shared/MainMenu";

export function App() {
  const [selectedGame, setSelectedGame] = useState<GameSlug | null>(null);
  const activeGame = useMemo(
    () => games.find((game) => game.slug === selectedGame) ?? null,
    [selectedGame],
  );

  if (!activeGame) {
    return <MainMenu games={games} onSelectGame={setSelectedGame} />;
  }

  const Game = activeGame.Component;

  return (
    <GameShell
      title={activeGame.title}
      controls={activeGame.controls}
      accent={activeGame.accent}
      onReturnToMenu={() => setSelectedGame(null)}
    >
      <Game />
    </GameShell>
  );
}
