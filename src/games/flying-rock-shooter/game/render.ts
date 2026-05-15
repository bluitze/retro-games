import type { Bullet, GameState, Rock, Ship } from "./types";

export function renderGame(context: CanvasRenderingContext2D, game: GameState, now: number): void {
  context.clearRect(0, 0, game.width, game.height);
  drawBackground(context, game);
  drawBullets(context, game.bullets);
  drawRocks(context, game.rocks);
  drawShip(context, game.ship, now);
  drawOverlay(context, game);
}

function drawBackground(context: CanvasRenderingContext2D, game: GameState): void {
  const gradient = context.createRadialGradient(
    game.width * 0.5,
    game.height * 0.55,
    0,
    game.width * 0.5,
    game.height * 0.55,
    Math.max(game.width, game.height)
  );
  gradient.addColorStop(0, "#07101c");
  gradient.addColorStop(1, "#02040a");

  context.fillStyle = gradient;
  context.fillRect(0, 0, game.width, game.height);

  for (const star of game.stars) {
    context.globalAlpha = star.alpha;
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(star.position.x, star.position.y, star.radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
}

function drawShip(context: CanvasRenderingContext2D, ship: Ship, now: number): void {
  const shouldBlink = now < ship.invulnerableUntil && Math.floor(now * 12) % 2 === 0;

  if (shouldBlink) {
    return;
  }

  context.save();
  context.translate(ship.position.x, ship.position.y);
  context.rotate(ship.angle);
  context.strokeStyle = "#f6fbff";
  context.lineWidth = 2;
  context.lineJoin = "round";

  context.beginPath();
  context.moveTo(ship.radius, 0);
  context.lineTo(-ship.radius * 0.72, ship.radius * 0.72);
  context.lineTo(-ship.radius * 0.44, 0);
  context.lineTo(-ship.radius * 0.72, -ship.radius * 0.72);
  context.closePath();
  context.stroke();

  if (ship.thrusting) {
    context.strokeStyle = "#ffcf66";
    context.beginPath();
    context.moveTo(-ship.radius * 0.68, -ship.radius * 0.42);
    context.lineTo(-ship.radius * 1.35, 0);
    context.lineTo(-ship.radius * 0.68, ship.radius * 0.42);
    context.stroke();
  }

  context.restore();
}

function drawBullets(context: CanvasRenderingContext2D, bullets: Bullet[]): void {
  context.fillStyle = "#f9fbff";

  for (const bullet of bullets) {
    context.beginPath();
    context.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawRocks(context: CanvasRenderingContext2D, rocks: Rock[]): void {
  context.strokeStyle = "#dce8f6";
  context.lineWidth = 2;

  for (const rock of rocks) {
    context.save();
    context.translate(rock.position.x, rock.position.y);
    context.rotate(rock.angle);
    context.beginPath();

    rock.vertices.forEach((scale, index) => {
      const angle = (index / rock.vertices.length) * Math.PI * 2;
      const x = Math.cos(angle) * rock.radius * scale;
      const y = Math.sin(angle) * rock.radius * scale;

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });

    context.closePath();
    context.stroke();
    context.restore();
  }
}

function drawOverlay(context: CanvasRenderingContext2D, game: GameState): void {
  context.save();
  context.fillStyle = "#f4f7fb";
  context.textBaseline = "top";
  context.shadowColor = "rgba(0, 0, 0, 0.7)";
  context.shadowBlur = 6;

  context.font = "700 18px Inter, system-ui, sans-serif";
  context.fillText("Flying Rock Shooter", 20, 18);

  context.font = "600 15px Inter, system-ui, sans-serif";
  context.fillText(`Score ${game.score}`, 20, 48);
  context.fillText(`Lives ${game.lives}`, 20, 70);
  context.fillText(`Wave ${game.wave}`, 20, 92);

  context.textAlign = "center";
  context.font = "500 13px Inter, system-ui, sans-serif";
  context.fillStyle = "rgba(244, 247, 251, 0.78)";
  context.fillText(
    "Move: Arrow/WASD  Shoot: Space  Pause: P  Start: Enter",
    game.width / 2,
    game.height - 34
  );

  if (game.status === "start") {
    drawCenterMessage(context, game, "Flying Rock Shooter", "Press Enter to start");
  } else if (game.status === "paused") {
    drawCenterMessage(context, game, "Paused", "Press P to resume");
  } else if (game.status === "gameover") {
    drawCenterMessage(context, game, "Game Over", "Press Enter to restart");
  }

  context.restore();
}

function drawCenterMessage(
  context: CanvasRenderingContext2D,
  game: GameState,
  title: string,
  subtitle: string
): void {
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillStyle = "rgba(2, 4, 10, 0.58)";
  context.fillRect(0, 0, game.width, game.height);

  context.fillStyle = "#ffffff";
  context.font = "800 42px Inter, system-ui, sans-serif";
  context.fillText(title, game.width / 2, game.height / 2 - 28);

  context.fillStyle = "rgba(244, 247, 251, 0.82)";
  context.font = "500 18px Inter, system-ui, sans-serif";
  context.fillText(subtitle, game.width / 2, game.height / 2 + 26);
}
