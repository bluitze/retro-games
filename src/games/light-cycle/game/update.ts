import { BOARD_COLUMNS, BOARD_ROWS } from "./config";
import type { Direction, GameState, InputState, PlayerId, PlayerState, Position } from "./types";

const playerIds: PlayerId[] = ["one", "two"];

const deltas: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const directionOrder: Direction[] = ["up", "right", "down", "left"];

const opposites: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const positionKey = (position: Position) => `${position.x},${position.y}`;

const addPosition = (position: Position, direction: Direction): Position => {
  const delta = deltas[direction];
  return {
    x: position.x + delta.x,
    y: position.y + delta.y,
  };
};

const isOutOfBounds = (position: Position) =>
  position.x < 0 || position.x >= BOARD_COLUMNS || position.y < 0 || position.y >= BOARD_ROWS;

const clonePlayer = (player: PlayerState): PlayerState => ({
  ...player,
  position: { ...player.position },
  trail: player.trail.map((segment) => ({ ...segment })),
});

const buildOccupiedCells = (players: Record<PlayerId, PlayerState>) => {
  const occupied = new Set<string>();

  for (const id of playerIds) {
    const player = players[id];

    for (const segment of player.trail) {
      occupied.add(positionKey(segment));
    }

    occupied.add(positionKey(player.position));
  }

  return occupied;
};

const isBlocked = (position: Position, blockedCells: Set<string>) =>
  isOutOfBounds(position) || blockedCells.has(positionKey(position));

const getLegalDirections = (player: PlayerState, blockedCells: Set<string>) =>
  directionOrder.filter((direction) => {
    if (direction === opposites[player.direction]) {
      return false;
    }

    return !isBlocked(addPosition(player.position, direction), blockedCells);
  });

const countReachableCells = (
  start: Position,
  blockedCells: Set<string>,
  competingStart?: Position,
  maxCells = BOARD_COLUMNS * BOARD_ROWS,
) => {
  if (isOutOfBounds(start)) {
    return 0;
  }

  const queue: Position[] = [start];
  const visited = new Set([positionKey(start)]);
  const competingKey = competingStart ? positionKey(competingStart) : null;
  let area = 0;

  while (queue.length > 0 && area < maxCells) {
    const position = queue.shift();

    if (!position) {
      break;
    }

    area += 1;

    for (const direction of directionOrder) {
      const nextPosition = addPosition(position, direction);
      const key = positionKey(nextPosition);

      if (
        visited.has(key) ||
        key === competingKey ||
        isOutOfBounds(nextPosition) ||
        blockedCells.has(key)
      ) {
        continue;
      }

      visited.add(key);
      queue.push(nextPosition);
    }
  }

  return area;
};

const getVoronoiTerritory = (
  npcStart: Position,
  playerStart: Position,
  blockedCells: Set<string>,
) => {
  const queue: Array<{ owner: PlayerId; position: Position; distance: number }> = [
    { owner: "two", position: npcStart, distance: 0 },
    { owner: "one", position: playerStart, distance: 0 },
  ];
  const claims = new Map<string, { owner: PlayerId | "contested"; distance: number }>();

  claims.set(positionKey(npcStart), { owner: "two", distance: 0 });
  claims.set(positionKey(playerStart), { owner: "one", distance: 0 });

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];

    for (const direction of directionOrder) {
      const nextPosition = addPosition(current.position, direction);
      const key = positionKey(nextPosition);

      if (isOutOfBounds(nextPosition) || blockedCells.has(key)) {
        continue;
      }

      const nextDistance = current.distance + 1;
      const existingClaim = claims.get(key);

      if (!existingClaim) {
        claims.set(key, { owner: current.owner, distance: nextDistance });
        queue.push({ owner: current.owner, position: nextPosition, distance: nextDistance });
        continue;
      }

      if (existingClaim.distance === nextDistance && existingClaim.owner !== current.owner) {
        existingClaim.owner = "contested";
      }
    }
  }

  let npcCells = 0;
  let playerCells = 0;
  let contestedCells = 0;

  for (const claim of claims.values()) {
    if (claim.owner === "two") {
      npcCells += 1;
    } else if (claim.owner === "one") {
      playerCells += 1;
    } else {
      contestedCells += 1;
    }
  }

  return { npcCells, playerCells, contestedCells };
};

const getCandidateBlockedCells = (
  occupiedCells: Set<string>,
  npcNextPosition: Position,
  playerNextPosition: Position,
) => {
  const blockedCells = new Set(occupiedCells);

  blockedCells.add(positionKey(npcNextPosition));
  blockedCells.add(positionKey(playerNextPosition));

  return blockedCells;
};

const evaluateNpcMove = (
  npc: PlayerState,
  player: PlayerState,
  direction: Direction,
  occupiedCells: Set<string>,
) => {
  const npcNextPosition = addPosition(npc.position, direction);

  if (isBlocked(npcNextPosition, occupiedCells)) {
    return Number.NEGATIVE_INFINITY;
  }

  const playerNextPosition = addPosition(player.position, player.pendingDirection);
  const playerCrashes =
    isBlocked(playerNextPosition, occupiedCells) ||
    positionKey(playerNextPosition) === positionKey(npcNextPosition);

  if (playerCrashes) {
    return positionKey(playerNextPosition) === positionKey(npcNextPosition) ? 250 : 10_000;
  }

  const blockedAfterMove = getCandidateBlockedCells(occupiedCells, npcNextPosition, playerNextPosition);
  const npcArea = countReachableCells(npcNextPosition, blockedAfterMove, playerNextPosition);
  const playerArea = countReachableCells(playerNextPosition, blockedAfterMove, npcNextPosition);
  const territory = getVoronoiTerritory(npcNextPosition, playerNextPosition, blockedAfterMove);
  const playerNextState: PlayerState = {
    ...player,
    position: playerNextPosition,
    direction: player.pendingDirection,
    pendingDirection: player.pendingDirection,
  };
  const npcNextState: PlayerState = {
    ...npc,
    position: npcNextPosition,
    direction,
    pendingDirection: direction,
  };
  const playerExitCount = getLegalDirections(playerNextState, blockedAfterMove).length;
  const npcExitCount = getLegalDirections(npcNextState, blockedAfterMove).length;
  const distanceToPlayer =
    Math.abs(npcNextPosition.x - playerNextPosition.x) +
    Math.abs(npcNextPosition.y - playerNextPosition.y);
  const straightBonus = direction === npc.direction ? 4 : 0;
  const chokeBonus = playerExitCount === 1 ? 90 : playerExitCount === 0 ? 180 : 0;
  const safetyPenalty = npcExitCount === 0 ? 300 : npcExitCount === 1 ? 60 : 0;

  return (
    npcArea * 1.6 -
    playerArea * 1.9 +
    territory.npcCells * 0.9 -
    territory.playerCells * 1.25 +
    territory.contestedCells * 0.15 -
    playerExitCount * 35 +
    npcExitCount * 24 -
    distanceToPlayer * 1.8 +
    chokeBonus +
    straightBonus -
    safetyPenalty
  );
};

const countOpenCells = (
  start: Position,
  direction: Direction,
  occupiedCells: Set<string>,
  maxLookAhead = 8,
) => {
  let score = 0;
  let position = start;

  for (let step = 0; step < maxLookAhead; step += 1) {
    position = addPosition(position, direction);

    if (isBlocked(position, occupiedCells)) {
      break;
    }

    score += 1;
  }

  return score;
};

const chooseNpcDirection = (
  npc: PlayerState,
  opponent: PlayerState,
  occupiedCells: Set<string>,
): Direction => {
  const candidates = directionOrder
    .filter((direction) => direction !== opposites[npc.direction])
    .map((direction) => {
      const nextPosition = addPosition(npc.position, direction);
      const wouldCrash = isBlocked(nextPosition, occupiedCells);
      const forwardSpace = wouldCrash ? -1 : countOpenCells(npc.position, direction, occupiedCells);

      return {
        direction,
        score: evaluateNpcMove(npc, opponent, direction, occupiedCells) + forwardSpace,
      };
    });

  return candidates.sort((left, right) => right.score - left.score)[0]?.direction ?? npc.direction;
};

const applyNpcIntent = (state: GameState, occupiedCells: Set<string>): GameState => ({
  ...state,
  players: {
    one: clonePlayer(state.players.one),
    two: {
      ...clonePlayer(state.players.two),
      pendingDirection: chooseNpcDirection(state.players.two, state.players.one, occupiedCells),
    },
  },
});

const roundOver = (state: GameState, crashedPlayers: Set<PlayerId>): GameState => {
  const nextState: GameState = {
    ...state,
    players: {
      one: clonePlayer(state.players.one),
      two: clonePlayer(state.players.two),
    },
    phase: "round-over",
  };

  for (const id of crashedPlayers) {
    nextState.players[id].alive = false;
  }

  const survivors = playerIds.filter((id) => nextState.players[id].alive);

  if (survivors.length === 1) {
    const winner = survivors[0];
    nextState.winner = winner;
    nextState.isDraw = false;
    nextState.players[winner].score += 1;
    nextState.message = `${nextState.players[winner].name} wins the round`;
  } else {
    nextState.winner = null;
    nextState.isDraw = true;
    nextState.message = "Draw round";
  }

  return nextState;
};

export const updateGame = (state: GameState, _input: InputState): GameState => {
  if (state.phase !== "playing") {
    return state;
  }

  const occupiedBeforeMove = buildOccupiedCells(state.players);
  const stateWithNpcIntent = applyNpcIntent(state, occupiedBeforeMove);
  const nextPositions = new Map<PlayerId, Position>();
  const crashedPlayers = new Set<PlayerId>();

  for (const id of playerIds) {
    const player = stateWithNpcIntent.players[id];

    if (!player.alive) {
      continue;
    }

    nextPositions.set(id, addPosition(player.position, player.pendingDirection));
  }

  for (const id of playerIds) {
    const nextPosition = nextPositions.get(id);

    if (!nextPosition || isOutOfBounds(nextPosition) || occupiedBeforeMove.has(positionKey(nextPosition))) {
      crashedPlayers.add(id);
    }
  }

  const destinations = new Map<string, PlayerId[]>();

  for (const [id, position] of nextPositions) {
    const key = positionKey(position);
    destinations.set(key, [...(destinations.get(key) ?? []), id]);
  }

  for (const ids of destinations.values()) {
    if (ids.length > 1) {
      for (const id of ids) {
        crashedPlayers.add(id);
      }
    }
  }

  const playerOneNextPosition = nextPositions.get("one");
  const playerTwoNextPosition = nextPositions.get("two");

  if (playerOneNextPosition && playerTwoNextPosition) {
    const playerOneNextKey = positionKey(playerOneNextPosition);
    const playerTwoNextKey = positionKey(playerTwoNextPosition);
    const playerOneHeadKey = positionKey(stateWithNpcIntent.players.one.position);
    const playerTwoHeadKey = positionKey(stateWithNpcIntent.players.two.position);

    if (
      playerOneNextKey === playerTwoHeadKey ||
      playerTwoNextKey === playerOneHeadKey ||
      playerOneNextKey === playerTwoNextKey
    ) {
      crashedPlayers.add("one");
      crashedPlayers.add("two");
    }
  }

  if (crashedPlayers.size > 0) {
    return roundOver(stateWithNpcIntent, crashedPlayers);
  }

  return {
    ...stateWithNpcIntent,
    players: {
      one: movePlayer(stateWithNpcIntent.players.one, nextPositions.get("one")),
      two: movePlayer(stateWithNpcIntent.players.two, nextPositions.get("two")),
    },
  };
};

const movePlayer = (player: PlayerState, nextPosition: Position | undefined): PlayerState => {
  if (!nextPosition || !player.alive) {
    return clonePlayer(player);
  }

  return {
    ...player,
    direction: player.pendingDirection,
    position: nextPosition,
    trail: [...player.trail, { ...player.position }],
  };
};
