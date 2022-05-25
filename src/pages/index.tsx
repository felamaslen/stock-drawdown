import { css } from "@emotion/react";
import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import { Drawdown } from "../types";

const stockName = "smt";

function useDrawdowns(): {
  drawdowns: Drawdown[];
  error: string | null;
  loading: boolean;
} {
  const [drawdowns, setDrawdowns] = useState<Drawdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const requestDrawdowns = async () => {
      try {
        setLoading(true);
        const result = await fetch(`/api/drawdowns?name=${stockName}`);
        const parsed = await result.json();
        if (cancelled) {
          return;
        }
        if (parsed.drawdowns) {
          setDrawdowns(parsed.drawdowns);
          setError(null);
        } else if (parsed.message) {
          setDrawdowns([]);
          setError(parsed.message);
        }
      } catch (e) {
        if (cancelled) {
          return;
        }
        setDrawdowns([]);
        setError((e as Error).message);
      } finally {
        if (cancelled) {
          return;
        }
        setLoading(false);
      }
    };
    requestDrawdowns();
    return () => {
      cancelled = true;
    };
  }, []);

  return { drawdowns, error, loading };
}

const Home: NextPage = () => {
  const { drawdowns, error, loading } = useDrawdowns();

  return (
    <div>
      <h1>Drawdowns</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          {error && (
            <pre
              css={css`
                color: red;
              `}
            >
              {error}
            </pre>
          )}
          <pre>{JSON.stringify(drawdowns)}</pre>
        </div>
      )}
    </div>
  );
};

export default Home;
