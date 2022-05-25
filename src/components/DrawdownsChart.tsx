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
  drawdown.top.date?.toString() ?? "foo"; // formatDate(drawdown.top.date, "PP");

export const DrawdownsChart = ({
  drawdowns,
}: {
  drawdowns: Drawdown[];
}): JSX.Element => {
  const maxDrawdowns = useMemo<Drawdown[]>(
    () =>
      drawdowns
        .slice()
        .sort((a, b) => b.declinePct - a.declinePct)
        .slice(0, 10),
    [drawdowns]
  );

  const plot = useRef<HTMLDivElement>(null);

  const data = useMemo<Plotly.Data[]>(
    () => [
      {
        labels: maxDrawdowns.map(getName),
        mode: "text+markers",
        name: "Max drawdown",
        type: "scatter3d",
        x: maxDrawdowns.map(({ daysTopToBottom }) => daysTopToBottom),
        xaxis: "Top to bottom (days)",
        y: maxDrawdowns.map(
          ({ daysBottomToRecovery }) => daysBottomToRecovery ?? 0
        ),
        yaxis: "Recovery from bottom (days)",
        z: maxDrawdowns.map(({ declinePct }) => declinePct),
      },
    ],
    [maxDrawdowns]
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
