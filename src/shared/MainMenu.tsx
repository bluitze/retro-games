import type { CSSProperties } from "react";
import type { GameDefinition, GameSlug } from "../app/types";

type MainMenuProps = {
  games: GameDefinition[];
  onSelectGame: (slug: GameSlug) => void;
};

export function MainMenu({ games, onSelectGame }: MainMenuProps) {
  return (
    <main className="arcade-menu" aria-labelledby="arcade-title">
      <section className="menu-hero">
        <div className="menu-brand">
          <img src="/favicon.png" alt="Retro Games Arcade logo" className="menu-logo" />
          <p className="menu-kicker">ten games / one cabinet</p>
        </div>
        <h1 id="arcade-title">Retro Games Arcade</h1>
        <p className="menu-copy">
          Pick a cabinet slot, drop into the game, and return here anytime without leaving the app.
        </p>
      </section>

      <section className="game-grid" aria-label="Game selection">
        {games.map((game, index) => (
          <article
            className="game-card"
            key={game.slug}
            style={{ "--accent": game.accent } as CSSProperties}
          >
            <div className="card-topline">
              <span className="slot-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="mini-marquee">{game.shortTitle}</span>
            </div>
            <h2>{game.title}</h2>
            <p>{game.description}</p>
            <p className="controls-line">{game.controls}</p>
            <button type="button" onClick={() => onSelectGame(game.slug)} aria-label={`Play ${game.title}`}>
              Play
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
