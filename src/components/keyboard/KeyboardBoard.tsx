import { memo, useCallback, useEffect, useState } from "react";
import { KEYBOARD_ROWS } from "@/lib/keyboard-layout";
import type { SponsorSpot } from "@/lib/auction";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import {
  loadSoundPreference,
  playHover,
  playKeyDown,
  playKeyUp,
  primeAudio,
  setSoundEnabled,
} from "@/lib/keyboard-sound";

type Props = {
  spots: Map<string, SponsorSpot>;
  selectedCode: string | null;
  onSelect: (spot: SponsorSpot) => void;
};

/** natural pixel width of the board — scaled down to fit, never scrolled */
const BOARD_WIDTH = 680;

const KEY_WIDTHS = new Map<string, number>(
  KEYBOARD_ROWS.flat().map((k) => [k.code, k.w ?? 1]),
);

/* A single keycap. Memoised so the 60+ caps never re-render unless their own
   data, selection, or pressed state actually changes. */
const Keycap = memo(function Keycap({
  code,
  label,
  width,
  spot,
  selected,
  isDown,
  onPress,
  onRelease,
  onSelect,
}: {
  code: string;
  label: string;
  width: number;
  spot: SponsorSpot | undefined;
  selected: boolean;
  isDown: boolean;
  onPress: (code: string) => void;
  onRelease: (code: string) => void;
  onSelect: (spot: SponsorSpot) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onPress(code);
      }}
      onPointerUp={() => onRelease(code)}
      onPointerLeave={() => isDown && onRelease(code)}
      onPointerEnter={() => spot && playHover(code)}
      onClick={() => spot && onSelect(spot)}
      style={{ flexGrow: width, flexBasis: 0 }}
      className={cn(
        "kb-key font-mono-ui group relative flex h-9 min-w-0 select-none items-center justify-center rounded-[5px] px-1 text-[10px] leading-none transition-transform duration-100 sm:h-11 sm:text-[11px]",
        !spot && "kb-key-dead cursor-default text-keycap-foreground/60",
        spot?.status === "open" &&
          "kb-key-open cursor-pointer text-primary hover:translate-y-[1px] hover:brightness-110",
        spot?.status === "taken" &&
          "kb-key-taken cursor-pointer text-clay-foreground hover:translate-y-[1px] hover:brightness-110",
        isDown && "kb-key-down",
        selected && "ring-2 ring-clay ring-offset-2 ring-offset-[#141416]",
      )}
      aria-label={
        spot
          ? `${spot.label} — ${spot.status === "open" ? "open" : `taken by ${spot.sponsor_name}`}`
          : label
      }
    >
      <span className="relative truncate">
        {spot?.status === "taken" ? spot.sponsor_name : label}
      </span>
    </button>
  );
});

export function KeyboardBoard({ spots, selectedCode, onSelect }: Props) {
  const [sound, setSound] = useState(true);
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [scale, setScale] = useState(1);
  const [viewHeight, setViewHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    setSound(loadSoundPreference());
  }, []);

  /* Fit-to-width: the board renders at its natural width and is scaled down to
     the container, so there is never a scrollbar on any screen size. */
  const viewRef = useCallback((view: HTMLDivElement | null) => {
    if (!view) return;
    const inner = view.querySelector<HTMLElement>("[data-kb-inner]");
    if (!inner) return;
    const measure = () => {
      const s = Math.min(1, view.clientWidth / BOARD_WIDTH);
      setScale(s);
      setViewHeight(inner.offsetHeight * s);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(view);
    ro.observe(inner);
    measure();
    // ResizeObserver lives as long as the board does.
    return () => ro.disconnect();
  }, []);

  const mark = useCallback((code: string, on: boolean) => {
    setPressed((prev) => {
      if (prev.has(code) === on) return prev;
      const next = new Set(prev);
      if (on) next.add(code);
      else next.delete(code);
      return next;
    });
  }, []);

  const press = useCallback(
    (code: string, velocity = 1) => {
      primeAudio();
      playKeyDown({ code, width: KEY_WIDTHS.get(code) ?? 1, velocity });
      mark(code, true);
    },
    [mark],
  );

  const release = useCallback(
    (code: string) => {
      playKeyUp({ code, width: KEY_WIDTHS.get(code) ?? 1 });
      mark(code, false);
    },
    [mark],
  );

  const pressFromCap = useCallback((code: string) => press(code), [press]);

  // Physical typing plays and lights the matching keycap.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!KEY_WIDTHS.has(e.code)) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      press(e.code, 0.85);
    };
    const up = (e: KeyboardEvent) => {
      if (!KEY_WIDTHS.has(e.code)) return;
      release(e.code);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [press, release]);

  return (
    <div className="w-full">
      {/* Fixed, front-on stage — no spin, no drag. A gentle top tilt gives the
          caps their physical depth, like a product shot. */}
      <div
        ref={viewRef}
        className="w-full overflow-hidden rounded-2xl border border-border bg-surface px-1 pb-8 pt-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] sm:px-4"
        style={{
          perspective: "1600px",
          perspectiveOrigin: "50% 40%",
          height: viewHeight ? viewHeight + 56 : undefined,
        }}
      >
        <div
          data-kb-inner
          className="mx-auto origin-top"
          style={{ width: BOARD_WIDTH, transform: `scale(${scale})` }}
        >
          <div
            className="kb-stage relative"
            style={{ transform: "translate3d(0, 0, 0) rotateX(14deg)" }}
          >
            <div
              className="kb-case relative rounded-xl border border-black/60 p-3 sm:p-4"
              style={{ transform: "translateZ(0)" }}
            >
              <div className="kb-plate relative rounded-lg bg-black/25 p-2 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]">
                {/* world-fixed spotlight, specular sheen and ambient occlusion */}
                <span className="kb-spot" />
                <span className="kb-sheen" />
                <span className="kb-ao" />
                <span className="kb-dim" />
                <div className="relative flex flex-col gap-1.5">
                  {KEYBOARD_ROWS.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-1.5">
                      {row.map((key) => (
                        <Keycap
                          key={key.code}
                          code={key.code}
                          label={key.label}
                          width={key.w ?? 1}
                          spot={spots.get(key.code)}
                          selected={selectedCode === key.code}
                          isDown={pressed.has(key.code)}
                          onPress={pressFromCap}
                          onRelease={release}
                          onSelect={onSelect}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <span className="font-mono-ui text-[11px] text-muted-foreground">
          tap a keycap — or type on your own keyboard
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-mono-ui shrink-0 text-xs"
          aria-pressed={sound}
          onClick={() => {
            const next = !sound;
            setSound(next);
            setSoundEnabled(next);
            if (next) playKeyDown({ code: "KeyS", width: 1 });
          }}
        >
          {sound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          {sound ? "sound on" : "sound off"}
        </Button>
      </div>

      <div className="font-mono-ui mt-4 flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
          <span className="size-2 rounded-full bg-foreground/30" /> open spot
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
          <span className="size-2 rounded-full bg-clay" /> taken
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
          <span className="size-2 rounded-full bg-keycap" /> not for sale
        </span>
      </div>
    </div>
  );
}
