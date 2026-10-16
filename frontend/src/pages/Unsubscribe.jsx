import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck, CircleX } from "lucide-react";
import { unsubscribe } from "../api";
import { useSeo } from "../useSeo";

// Opened from the "Unsubscribe" link in a new-recipe email; works without logging in
export function Unsubscribe() {
  useSeo({ title: "Unsubscribe", noindex: true });
  const [params] = useSearchParams();
  const [state, setState] = useState("working");
  // Only send it once, even when React runs effects twice in development
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    unsubscribe(params.get("u") || "", params.get("t") || "")
      .then(() => setState("done"))
      .catch(() => setState("failed"));
  }, [params]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      {state === "working" && <p className="text-muted-foreground">Unsubscribing…</p>}
      {state === "done" && (
        <>
          <CircleCheck className="mx-auto h-14 w-14 text-primary" />
          <h1 className="mt-6 text-3xl font-semibold">You're unsubscribed</h1>
          <p className="mt-3 text-muted-foreground">
            You won't get emails about new recipes any more. Changed your mind? Turn them back on in your{" "}
            <Link to="/profile" className="font-medium text-primary hover:underline">account settings</Link>.
          </p>
        </>
      )}
      {state === "failed" && (
        <>
          <CircleX className="mx-auto h-14 w-14 text-destructive" />
          <h1 className="mt-6 text-3xl font-semibold">That link didn't work</h1>
          <p className="mt-3 text-muted-foreground">
            You can turn off new-recipe emails in your{" "}
            <Link to="/profile" className="font-medium text-primary hover:underline">account settings</Link>.
          </p>
        </>
      )}
    </div>
  );
}
