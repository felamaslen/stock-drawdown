import styled from "@emotion/styled";
import formatDate from "date-fns/format";
import Plotly from "plotly.js";
import { rem } from "polished";
import { useEffect, useMemo, useRef } from "react";

import { Drawdown } from "../types";

const Plot = styled.div`
  border: 1px dashed #ccc;
  height: ${rem(500)};
  width: ${rem(500)};
`;

const getName = (drawdown: Drawdown): string =>
  formatDate(drawdown.top.date, "PP");

export const DrawdownsChart = ({
  drawdowns,
}: {
  drawdowns: Drawdown[];
}): JSX.Element => {
  const keyed = useMemo<(Drawdown & { key: number })[]>(
    () => drawdowns.map((drawdown, index) => ({ ...drawdown, key: index })),
    [drawdowns]
  );

  const maxDrawdowns = useMemo(
    () =>
      keyed
        .slice()
        .sort((a, b) => b.declinePct - a.declinePct)
        .slice(0, 10),
    [keyed]
  );

  const maxDropTime = useMemo(
    () =>
      keyed
        .slice()
        .sort((a, b) => b.daysTopToBottom - a.daysTopToBottom)
        .slice(0, 10),
    [keyed]
  );

  const maxRecoveryTime = useMemo(
    () =>
      keyed
        .slice()
        .sort((a, b) => {
          if (a.daysBottomToRecovery && b.daysBottomToRecovery) {
            return b.daysBottomToRecovery - a.daysBottomToRecovery;
          }
          return a.daysBottomToRecovery ? 1 : 0;
        })
        .slice(0, 10),
    [keyed]
  );

  const toPlot = useMemo<Drawdown[]>(
    () =>
      [maxDrawdowns, maxDropTime].reduce(
        (prev, group) =>
          prev.concat(
            group.filter(
              ({ key }) => !prev.some((drawdown) => drawdown.key === key)
            )
          ),
        []
      ),
    [maxDrawdowns, maxDropTime]
  );

  const plot = useRef<HTMLDivElement>(null);

  const data = useMemo<Plotly.Data[]>(
    () => [
      {
        mode: "text+markers",
        name: "Max drawdown",
        text: toPlot.map(getName),
        type: "scatter3d",
        x: toPlot.map(({ daysTopToBottom }) => daysTopToBottom),
        xaxis: "Top to bottom (days)",
        y: toPlot.map(({ daysBottomToRecovery }) => daysBottomToRecovery ?? 0),
        yaxis: "Recovery from bottom (days)",
        z: toPlot.map(({ declinePct }) => declinePct),
      },
    ],
    [toPlot]
  );

  const layout = useMemo<Partial<Plotly.Layout>>(
    () => ({
      margin: {
        l: 0,
        r: 0,
        b: 0,
        t: 0,
      },
    }),
    []
  );

  const hasDrawn = useRef(false);
  useEffect(() => {
    if (!plot.current) {
      return;
    }
    if (hasDrawn.current) {
      Plotly.plot(plot.current, data, layout);
    } else {
      Plotly.newPlot(plot.current, data, layout);
    }
  }, [data, layout]);

  return <Plot ref={plot} />;
};

export default DrawdownsChart;
