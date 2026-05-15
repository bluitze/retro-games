import type { CSSProperties, ReactNode } from "react";

type GameShellProps = {
  title: string;
  controls: string;
  accent: string;
  onReturnToMenu: () => void;
  children: ReactNode;
};

export function GameShell({ title, controls, accent, onReturnToMenu, children }: GameShellProps) {
  return (
    <main className="game-shell" style={{ "--accent": accent } as CSSProperties}>
      <header className="game-shell__bar">
        <div>
          <p className="menu-kicker">now playing</p>
          <h1>{title}</h1>
        </div>
        <button type="button" className="return-button" onClick={onReturnToMenu}>
          Return to Menu
        </button>
      </header>
      <section className="game-shell__stage">{children}</section>
      <footer className="game-shell__footer">{controls}</footer>
    </main>
  );
}
