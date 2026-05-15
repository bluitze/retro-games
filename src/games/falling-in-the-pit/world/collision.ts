export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MovingRect = Rect & {
  velocityX: number;
  velocityY: number;
};

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function containsPoint(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveHorizontal(entity: MovingRect, solids: Rect[]): void {
  for (const solid of solids) {
    if (!intersects(entity, solid)) {
      continue;
    }

    if (entity.velocityX > 0) {
      entity.x = solid.x - entity.width;
    } else if (entity.velocityX < 0) {
      entity.x = solid.x + solid.width;
    }

    entity.velocityX = 0;
  }
}

export function resolveVertical(entity: MovingRect, solids: Rect[]): boolean {
  let landed = false;

  for (const solid of solids) {
    if (!intersects(entity, solid)) {
      continue;
    }

    if (entity.velocityY > 0) {
      entity.y = solid.y - entity.height;
      landed = true;
    } else if (entity.velocityY < 0) {
      entity.y = solid.y + solid.height;
    }

    entity.velocityY = 0;
  }

  return landed;
}

export function rectCenter(rect: Rect): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}
