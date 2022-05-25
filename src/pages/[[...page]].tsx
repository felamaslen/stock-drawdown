import { css } from "@emotion/react";
import type {
  GetStaticPaths,
  GetStaticProps,
  InferGetStaticPropsType,
  NextPage,
} from "next";
import dynamic from "next/dynamic";
import Head from "next/head";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { getDrawdowns } from "../repository";

const DynamicDrawdownsChart = dynamic(import("../components/DrawdownsChart"), {
  ssr: false,
});

import { Drawdown, RawDate, RawDrawdown } from "../types";

export const getStaticProps: GetStaticProps<
  { drawdowns: RawDrawdown[] | null },
  { page: string[] }
> = async (ctx) => {
  const stockName = ctx.params?.page?.[0] ?? "";
  const drawdowns = await getDrawdowns(stockName);
  const rawDrawdowns =
    drawdowns?.map<RawDrawdown>(({ top, bottom, recovery, ...rest }) => ({
      top: { ...top, date: top.date.toISOString() },
      bottom: { ...bottom, date: bottom.date.toISOString() },
      recovery: recovery?.toISOString() ?? null,
      ...rest,
    })) ?? null;
  return { props: { drawdowns: rawDrawdowns }, revalidate: 5 };
};

export const getStaticPaths: GetStaticPaths = () => ({
  fallback: true,
  paths: ["/smt"],
});

const Home = ({
  drawdowns: rawDrawdowns,
}: InferGetStaticPropsType<typeof getStaticProps>): JSX.Element => {
  const drawdowns = useMemo<Drawdown[] | null>(
    () =>
      rawDrawdowns?.map<Drawdown>(({ top, bottom, recovery, ...rest }) => ({
        top: { ...top, date: new Date(top.date) },
        bottom: { ...bottom, date: new Date(bottom.date) },
        recovery: recovery ? new Date(recovery) : null,
        ...rest,
      })) ?? null,
    [rawDrawdowns]
  );

  return (
    <div>
      <h1>Drawdowns</h1>
      <div>
        {drawdowns ? (
          <DynamicDrawdownsChart drawdowns={drawdowns} />
        ) : (
          <span>Not found</span>
        )}
      </div>
    </div>
  );
};

export default Home;
