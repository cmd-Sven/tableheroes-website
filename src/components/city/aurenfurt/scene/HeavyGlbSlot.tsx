"use client";

import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";

type Job = {
  ready: Promise<void>;
  open: () => void;
  users: number;
  opened: boolean;
};

const jobs = new Map<string, Job>();
let tail: Promise<void> = Promise.resolve();

/**
 * Gleiche URL teilt sich einen Slot (ein Decode, viele Klone).
 * Die nächste URL startet erst, wenn alle Instanzen der vorigen fertig oder weg sind.
 */
function retainHeavy(url: string): { ready: Promise<void>; release: () => void } {
  let job = jobs.get(url);
  if (!job) {
    let open = () => {};
    const done = new Promise<void>((resolve) => {
      open = () => resolve();
    });
    const ready = tail.then(() => undefined);
    tail = done;
    job = { ready, open, users: 0, opened: false };
    jobs.set(url, job);
  }
  const current = job;
  current.users += 1;
  return {
    ready: current.ready,
    release() {
      current.users -= 1;
      if (current.users > 0 || current.opened) return;
      current.opened = true;
      current.open();
      jobs.delete(url);
    },
  };
}

type BoundaryProps = { children: ReactNode; url: string; onFail: () => void };
type BoundaryState = { failed: boolean };

class GlbErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[HoloCity] Modell nicht geladen:", this.props.url, error);
    this.props.onFail();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function FinishAfterLoad({
  done,
  children,
}: {
  done: MutableRefObject<(() => void) | null>;
  children: ReactNode;
}) {
  useEffect(() => {
    done.current?.();
  }, [done]);
  return children;
}

/**
 * Hält useGLTF vom Stadt-Suspense fern und lässt große Dateien nacheinander decodieren.
 * Ein fehlerhaftes GLB nimmt nur dieses Modell mit, nicht das ganze Diorama.
 */
export function HeavyGlbSlot({ url, children }: { url: string; children: ReactNode }) {
  const [go, setGo] = useState(false);
  const releaseRef = useRef<(() => void) | null>(null);
  const finishedRef = useRef(false);
  const done = useRef<(() => void) | null>(null);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    releaseRef.current?.();
    releaseRef.current = null;
  }

  done.current = finish;

  useEffect(() => {
    const { ready, release } = retainHeavy(url);
    let cancel = false;
    finishedRef.current = false;
    void ready.then(() => {
      if (cancel) {
        release();
        return;
      }
      releaseRef.current = release;
      setGo(true);
    });
    return () => {
      cancel = true;
      if (releaseRef.current && !finishedRef.current) {
        finishedRef.current = true;
        releaseRef.current();
        releaseRef.current = null;
      }
    };
  }, [url]);

  return (
    <GlbErrorBoundary url={url} onFail={finish}>
      {go ? (
        <Suspense fallback={null}>
          <FinishAfterLoad done={done}>{children}</FinishAfterLoad>
        </Suspense>
      ) : null}
    </GlbErrorBoundary>
  );
}
