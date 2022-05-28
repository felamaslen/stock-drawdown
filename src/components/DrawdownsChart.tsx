import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { format as formatDate, fromUnixTime, getUnixTime } from "date-fns";
import { rem } from "polished";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import { Drawdown, Price } from "../types";
import { parseDrawdowns } from "../utils";

const Plot = styled.div`
  border: 1px dashed #ccc;
  height: ${rem(500)};
  width: ${rem(500)};
`;

const getName = (drawdown: Drawdown): string =>
  formatDate(drawdown.top.date, "PP");

function useCanvas() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D>();

  useEffect(() => {
    ctxRef.current = canvas.current?.getContext("2d") ?? undefined;
  }, []);

  return { canvas, ctxRef };
}

type Point = { x: number; y: number };

type Params = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  pixX: (x: number) => number;
  pixY: (y: number) => number;
  tickSpacing: Point;
};

function niceFraction(
  exponent: number,
  fraction: number,
  round: boolean
): number {
  if (round) {
    if (fraction < 1.5) return 1;
    if (fraction < 3) return 2;
    if (fraction < 7) return 5;
    return 10;
  }
  if (fraction <= 1) return 1;
  if (fraction <= 2) return 2;
  if (fraction <= 5) return 5;
  return 10;
}

function niceNum(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;

  return niceFraction(exponent, fraction, round) * 10 ** exponent;
}

function niceScale(min: number, max: number, maxTicks = 10) {
  const range = niceNum(max - min, false);
  const tickSpacing = niceNum(range / (maxTicks - 1), true);
  const niceMin = Math.floor(min / tickSpacing) * tickSpacing;
  const niceMax = Math.ceil(max / tickSpacing) * tickSpacing;

  return { spacing: tickSpacing, min: niceMin, max: niceMax };
}

type DrawParams = {
  ctx: CanvasRenderingContext2D;
  drawdowns: Record<
    "maxDecline" | "maxTimeToBottom" | "maxTimeToRecover",
    Drawdown[]
  >;
  points: Point[];
  params: Params;
};

function drawAxes({
  ctx,
  points,
  params: { maxX, maxY, minX, minY, pixX, pixY, tickSpacing },
}: DrawParams): void {
  ctx.fillStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#000";

  // Y axis
  ctx.beginPath();
  ctx.moveTo(pixX(minX), pixY(minY));
  ctx.lineTo(pixX(minX), pixY(maxY));
  ctx.stroke();

  // X axis
  ctx.beginPath();
  ctx.moveTo(pixX(minX), pixY(0));
  ctx.lineTo(pixX(maxX), pixY(0));
  ctx.stroke();

  // Axis labels
  ctx.font = "11px sans-serif";
  ctx.lineWidth = 1;

  // Y axis labels
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const numTicksY = Math.ceil((maxY - minY) / tickSpacing.y) + 1;
  Array(numTicksY)
    .fill(0)
    .forEach((_, index) => {
      const yValue = minY + tickSpacing.y * index;

      ctx.beginPath();
      ctx.moveTo(pixX(minX), pixY(yValue));
      ctx.lineTo(pixX(minX) - 4, pixY(yValue));
      ctx.stroke();

      ctx.fillText(`${yValue}`, pixX(minX) - 6, pixY(yValue));
    });

  // X axis labels
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const numTicksX = Math.ceil((maxX - minX) / tickSpacing.x);
  Array(numTicksX)
    .fill(0)
    .forEach((_, index) => {
      const xValue = minX + tickSpacing.x * index;
      const indent = index % 2 === 0 ? 6 : 16;

      ctx.beginPath();
      ctx.moveTo(pixX(xValue), pixY(0));
      ctx.lineTo(pixX(xValue), pixY(0) + 4);
      ctx.stroke();

      ctx.fillText(
        `${formatDate(fromUnixTime(xValue), "yyyy-MM-dd")}`,
        pixX(xValue),
        pixY(0) + indent
      );
    });
}

function drawPrices({
  ctx,
  drawdowns,
  points,
  params: { pixX, pixY },
}: DrawParams): void {
  ctx.beginPath();
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;

  const maxPoints = 200;
  const drawEvery = Math.ceil(points.length / maxPoints);

  const allDrawdownPoints = Object.values(drawdowns).flat();

  points
    .filter(
      (_, index) =>
        index === 0 ||
        index === points.length - 1 ||
        index % drawEvery === 0 ||
        allDrawdownPoints.some(
          ({ bottom, top }) => bottom.index === index || top.index === index
        )
    )
    .forEach((point, index) => {
      const [px, py] = [pixX(point.x), pixY(point.y)];
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
}

function drawDrawdowns({
  ctx,
  drawdowns,
  params: { pixX, pixY },
}: DrawParams): void {
  ctx.lineWidth = 3;
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";

  ctx.fillStyle = "#f00";
  ctx.strokeStyle = "#f00";
  ctx.textBaseline = "bottom";

  drawdowns.maxDecline.forEach(({ bottom, declinePct, top }, index) => {
    ctx.beginPath();
    const topX = pixX(getUnixTime(top.date));
    const bottomX = pixX(getUnixTime(bottom.date));

    const topY = pixY(top.price);
    const bottomY = pixY(bottom.price);

    ctx.moveTo(topX, topY);
    ctx.lineTo(bottomX, bottomY);
    ctx.stroke();

    const angle = Math.atan2(bottomY - topY, bottomX - topX);

    const midX = (topX + bottomX) / 2;
    const midY = (topY + bottomY) / 2;

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(angle);

    ctx.fillText(`(#${index + 1}) ${declinePct.toFixed(1)}%`, 0, -2);

    ctx.restore();
  });

  ctx.fillStyle = "#033";
  ctx.strokeStyle = "#033";
  ctx.textBaseline = "top";

  drawdowns.maxTimeToBottom.forEach(
    ({ bottom, daysTopToBottom, top }, index) => {
      ctx.beginPath();
      const topX = pixX(getUnixTime(top.date));
      const bottomX = pixX(getUnixTime(bottom.date));

      const topY = pixY(bottom.price);
      const bottomY = pixY(bottom.price);

      ctx.moveTo(topX, topY);
      ctx.lineTo(bottomX, bottomY);
      ctx.stroke();

      const midX = (topX + bottomX) / 2;
      const midY = (topY + bottomY) / 2;

      ctx.save();
      ctx.translate(midX, midY);

      ctx.fillText(`(#${index + 1}) ${daysTopToBottom} days`, 0, 2);

      ctx.restore();
    }
  );

  ctx.fillStyle = "#319";
  ctx.strokeStyle = "#319";
  ctx.textBaseline = "bottom";

  drawdowns.maxTimeToRecover.forEach(
    ({ bottom, daysBottomToRecovery, recovery, top }, index) => {
      if (!recovery) {
        return;
      }

      ctx.beginPath();
      const topX = pixX(getUnixTime(bottom.date));
      const bottomX = pixX(getUnixTime(recovery.date));

      const topY = pixY(top.price);
      const bottomY = topY;

      ctx.moveTo(topX, topY);
      ctx.lineTo(bottomX, bottomY);
      ctx.stroke();

      const midX = (topX + bottomX) / 2;
      const midY = (topY + bottomY) / 2;

      ctx.save();
      ctx.translate(midX, midY);

      ctx.fillText(`(#${index + 1}) ${daysBottomToRecovery} days`, 0, -2);

      ctx.restore();
    }
  );
}

function draw(drawParams: DrawParams): void {
  const { ctx } = drawParams;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const filteredDrawdowns = drawAxes(drawParams);
  drawPrices(drawParams);
  drawDrawdowns(drawParams);
}

export const DrawdownsChart = ({
  prices,
}: {
  prices: Price[];
}): JSX.Element => {
  const { drawdowns, sortedPrices } = useMemo(
    () => parseDrawdowns(prices),
    [prices]
  );

  const filteredDrawdowns = useMemo<DrawParams["drawdowns"]>(() => {
    const maxDecline = drawdowns
      .slice()
      .sort((a, b) => b.declinePct - a.declinePct)
      .slice(0, 3);

    const maxTimeToBottom = drawdowns
      .slice()
      .sort((a, b) => b.daysTopToBottom - a.daysTopToBottom)
      .slice(0, 3);

    const maxTimeToRecover = drawdowns
      .slice()
      .sort((a, b) => {
        if (a.daysBottomToRecovery && b.daysBottomToRecovery) {
          return b.daysBottomToRecovery - a.daysBottomToRecovery;
        }
        return a.daysBottomToRecovery ? 1 : 0;
      })
      .slice(0, 3);

    return { maxDecline, maxTimeToBottom, maxTimeToRecover };
  }, [drawdowns]);

  const { canvas, ctxRef } = useCanvas();
  const hasContext = !!ctxRef.current;

  const height = 480;
  const width = 640;
  const padding = 50;

  const points = useMemo<Point[]>(
    () =>
      sortedPrices.map<Point>(({ date, price }) => ({
        x: getUnixTime(date),
        y: price,
      })),
    [sortedPrices]
  );

  const params = useMemo<Params>(() => {
    const minX = points.reduce<number>(
      (prev, { x }) => Math.min(prev, x),
      Infinity
    );
    const maxX = points.reduce<number>(
      (prev, { x }) => Math.max(prev, x),
      -Infinity
    );
    const minY = points.reduce<number>((prev, { y }) => Math.min(prev, y), 0);
    const maxY = points.reduce<number>(
      (prev, { y }) => Math.max(prev, y),
      -Infinity
    );

    const niceY = niceScale(minY, maxY);

    const pixX = (x: number) => padding + ((x - minX) / (maxX - minX)) * width;
    const pixY = (y: number) =>
      padding + (1 - (y - niceY.min) / (niceY.max - niceY.min)) * height;

    return {
      minX,
      maxX,
      minY: niceY.min,
      maxY: niceY.max,
      pixX,
      pixY,
      tickSpacing: { x: 86400 * 365 * 2.5, y: niceY.spacing },
    };
  }, [points]);

  const redraw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) {
      return;
    }

    draw({ ctx, drawdowns: filteredDrawdowns, points, params });
  }, [ctxRef, filteredDrawdowns, params, points]);

  useLayoutEffect(() => {
    const handle = requestAnimationFrame(redraw);
    return () => cancelAnimationFrame(handle);
  }, [redraw]);

  return (
    <canvas
      ref={canvas}
      css={css`
        border: 1px dashed #ccc;
        height: ${rem(height + padding * 2)};
        width: ${rem(width + padding * 2)};
      `}
      height={height + padding * 2}
      width={width + padding * 2}
    />
  );
};

export default DrawdownsChart;
