import { Injectable } from '@angular/core';
import { DayStatus } from '../models/chain.model';

export interface VoronoiCell {
  id: number;
  x: number;
  y: number;
  path: string;
  day: DayStatus;
  isMonthLabel?: boolean;
}

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

@Injectable({
  providedIn: 'root'
})
export class VoronoiService {
  generateVoronoiDiagram(
    days: DayStatus[],
    width: number,
    height: number,
    minSizePercent: number = 90,
    maxSizePercent: number = 110
  ): VoronoiCell[] {
    if (!days.length) return [];

    const padding = 12;
    const gap = 3;
    const bounds: Rect = {
      x: padding,
      y: padding,
      width: width - padding * 2,
      height: height - padding * 2
    };

    const seed = this.hashCode(
      `${days.length}-${days[0].date.getFullYear()}-${days[0].date.getMonth()}`
    );
    const rng = this.seededRandom(seed);

    const avgDistance = Math.min(bounds.width, bounds.height) / Math.sqrt(days.length) * 0.85;

    let seeds = this.generateSeedPoints(days.length, bounds, rng, minSizePercent, maxSizePercent);

    // Выравниваем клетки методом Lloyd's relaxation для более равномерных размеров
    for (let i = 0; i < 3; i++) {
      const polys = this.buildVoronoi(seeds, bounds);
      seeds = polys.map((poly, idx) => {
        const centroid = this.centroid(poly);
        if (!centroid) return seeds[idx];

        // Плавно двигаем к центроиду (не полностью, чтобы сохранить порядок)
        return {
          x: seeds[idx].x * 0.3 + centroid.x * 0.7,
          y: seeds[idx].y * 0.3 + centroid.y * 0.7
        };
      });
    }

    // Находим ячейку ближайшую к центру для названия месяца
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    let monthLabelIndex = 0;
    let minDistToCenter = Infinity;

    seeds.forEach((seed, idx) => {
      const dx = seed.x - centerX;
      const dy = seed.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistToCenter) {
        minDistToCenter = dist;
        monthLabelIndex = idx;
      }
    });

    // Увеличиваем пространство вокруг ячейки с месяцем, раздвигая соседние точки
    const monthLabelSeed = seeds[monthLabelIndex];
    const minDistanceFromLabel = avgDistance * 1.8; // Больше расстояние от названия месяца

    seeds = seeds.map((seed, idx) => {
      if (idx === monthLabelIndex) return seed;

      const dx = seed.x - monthLabelSeed.x;
      const dy = seed.y - monthLabelSeed.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Если точка слишком близко к названию месяца, отодвигаем её
      if (dist < minDistanceFromLabel && dist > 0) {
        const pushFactor = minDistanceFromLabel / dist;
        return {
          x: monthLabelSeed.x + dx * pushFactor,
          y: monthLabelSeed.y + dy * pushFactor
        };
      }

      return seed;
    });

    const polygons = this.buildVoronoi(seeds, bounds);

    return polygons.map((poly, index) => {
      // Для ячейки с названием месяца делаем меньший inset
      const cellGap = index === monthLabelIndex ? gap * 0.5 : gap;
      const inset = this.insetPolygon(poly, cellGap);
      const smooth = this.chaikinSmooth(inset, 2);
      const path = this.buildSmoothPath(smooth);
      const center = this.centroid(smooth) || seeds[index];

      return {
        id: index,
        x: center.x,
        y: center.y,
        path,
        day: days[index],
        isMonthLabel: index === monthLabelIndex
      };
    });
  }

  private generateSeedPoints(
    count: number,
    bounds: Rect,
    rng: () => number,
    minSizePercent: number,
    maxSizePercent: number
  ): Point[] {
    if (count === 0) return [];

    const pts: Point[] = [];
    const avgDistance = Math.min(bounds.width, bounds.height) / Math.sqrt(count) * 0.85;
    const minDistance = avgDistance * (minSizePercent / 100);
    const maxDistance = avgDistance * (maxSizePercent / 100);
    const margin = 20;

    // День 1 всегда в верхнем левом углу
    pts.push({
      x: bounds.x + margin + rng() * 30,
      y: bounds.y + margin + rng() * 30
    });

    // Генерируем остальные дни по цепочке
    for (let i = 1; i < count; i++) {
      const prev = pts[i - 1];
      let attempt = 0;
      let newPoint: Point | null = null;

      // Пытаемся найти подходящее место для следующего дня
      while (attempt < 50) {
        // Случайный угол в диапазоне 0-360 градусов
        const angle = rng() * Math.PI * 2;
        // Случайное расстояние
        const distance = minDistance + rng() * (maxDistance - minDistance);

        const candidate = {
          x: prev.x + Math.cos(angle) * distance,
          y: prev.y + Math.sin(angle) * distance
        };

        // Проверяем, что точка в границах
        if (
          candidate.x > bounds.x + margin &&
          candidate.x < bounds.x + bounds.width - margin &&
          candidate.y > bounds.y + margin &&
          candidate.y < bounds.y + bounds.height - margin
        ) {
          // Проверяем, что не слишком близко к другим точкам (кроме предыдущей)
          let tooClose = false;
          for (let j = 0; j < i - 1; j++) {
            const dx = candidate.x - pts[j].x;
            const dy = candidate.y - pts[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance * 0.7) {
              tooClose = true;
              break;
            }
          }

          if (!tooClose) {
            newPoint = candidate;
            break;
          }
        }

        attempt++;
      }

      // Если не нашли подходящее место, используем fallback
      if (!newPoint) {
        const cols = Math.ceil(Math.sqrt(count));
        const cellW = bounds.width / cols;
        const cellH = bounds.height / cols;
        const col = i % cols;
        const row = Math.floor(i / cols);
        newPoint = {
          x: bounds.x + (col + 0.5) * cellW + (rng() - 0.5) * cellW * 0.3,
          y: bounds.y + (row + 0.5) * cellH + (rng() - 0.5) * cellH * 0.3
        };
      }

      pts.push(newPoint);
    }

    return pts;
  }

  private buildVoronoi(points: Point[], bounds: Rect): Point[][] {
    const base = this.boundsPolygon(bounds);
    return points.map((p, i) => {
      let poly = base;
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue;
        poly = this.clipWithBisector(poly, p, points[j]);
        if (!poly.length) break;
      }
      return poly;
    });
  }

  private clipWithBisector(poly: Point[], a: Point, b: Point): Point[] {
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const nx = a.x - b.x;
    const ny = a.y - b.y;

    const inside = (p: Point) => (p.x - midX) * nx + (p.y - midY) * ny >= 0;

    const result: Point[] = [];
    for (let i = 0; i < poly.length; i++) {
      const curr = poly[i];
      const next = poly[(i + 1) % poly.length];
      const currInside = inside(curr);
      const nextInside = inside(next);

      if (currInside && nextInside) {
        result.push(next);
      } else if (currInside !== nextInside) {
        const dx = next.x - curr.x;
        const dy = next.y - curr.y;
        const t =
          ((midX - curr.x) * nx + (midY - curr.y) * ny) /
          (dx * nx + dy * ny);
        result.push({ x: curr.x + dx * t, y: curr.y + dy * t });
        if (nextInside) result.push(next);
      }
    }

    return result;
  }

  private insetPolygon(points: Point[], gap: number): Point[] {
    if (!points.length) return points;
    const c = this.centroid(points);
    if (!c) return points;
    return points.map(p => {
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const dist = Math.hypot(dx, dy) || 1;
      const scale = Math.max(dist - gap, 0) / dist;
      return { x: c.x + dx * scale, y: c.y + dy * scale };
    });
  }

  private chaikinSmooth(points: Point[], iterations = 1): Point[] {
    let pts = points;
    for (let k = 0; k < iterations; k++) {
      const next: Point[] = [];
      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[i];
        const p1 = pts[(i + 1) % pts.length];
        next.push(
          { x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y },
          { x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y }
        );
      }
      pts = next;
    }
    return pts;
  }

  private buildSmoothPath(points: Point[]): string {
    if (!points.length) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i <= points.length; i++) {
      const curr = points[i % points.length];
      const prev = points[i - 1];
      const mid = { x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2 };
      path += ` Q ${prev.x} ${prev.y} ${mid.x} ${mid.y}`;
    }
    return `${path} Z`;
  }

  private boundsPolygon(bounds: Rect): Point[] {
    return [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height }
    ];
  }

  private centroid(points: Point[]): Point | null {
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < points.length; i++) {
      const p0 = points[i];
      const p1 = points[(i + 1) % points.length];
      const cross = p0.x * p1.y - p1.x * p0.y;
      area += cross;
      cx += (p0.x + p1.x) * cross;
      cy += (p0.y + p1.y) * cross;
    }
    area *= 0.5;
    if (Math.abs(area) < 1e-5) {
      const meanX = points.reduce((s, p) => s + p.x, 0) / points.length;
      const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
      return { x: meanX, y: meanY };
    }
    return { x: cx / (6 * area), y: cy / (6 * area) };
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  private seededRandom(seed: number): () => number {
    let value = seed;
    return () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
  }
}
