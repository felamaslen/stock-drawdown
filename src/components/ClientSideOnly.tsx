import { useEffect, useState } from "react";

// Wrap components in this to make sure they only render once the
// surrounding page has rendered, on the client.
// This is useful for example when it cannot be guaranteed that the SSR
// version will be the same as the locally rendered copy. (This works because
// useEffect only runs on the client).
export const ClientSideOnly = ({
  children,
}: {
  children?: JSX.Element;
}): JSX.Element => {
  const [initialised, setInitialised] = useState(false);
  useEffect(() => setInitialised(true), []);
  return <>{initialised ? children : null}</>;
};
