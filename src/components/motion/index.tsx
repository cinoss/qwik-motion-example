import {
  component$,
  Slot,
  useClientEffect$,
  useRef,
  useStore,
} from "@builder.io/qwik";
import equal from "deep-equal";
import {
  animate,
  anticipate,
  backIn,
  backInOut,
  backOut,
  bounceIn,
  circIn,
  circInOut,
  circOut,
  easeIn,
  easeInOut,
  easeOut,
  linear,
  PhysicsSpringOptions,
} from "popmotion";
import type { Easing } from "popmotion/lib/easing/types";

export type EasingName =
  | "linear"
  | "easeIn"
  | "easeInOut"
  | "easeOut"
  | "circIn"
  | "circInOut"
  | "circOut"
  | "backIn"
  | "backInOut"
  | "backOut"
  | "anticipate"
  | "bounceIn";
// | "bounceInOut"
// | "bounceOut"
export const easingFunctions: Record<EasingName, Easing> = {
  linear,
  easeIn,
  easeInOut,
  easeOut,
  circIn,
  circInOut,
  circOut,
  backIn,
  backInOut,
  backOut,
  anticipate,
  bounceIn,
};

export type Matrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};
export type Point = {
  x: number;
  y: number;
};
function deltaTransformPoint(matrix: Matrix, point: Point): Point {
  const dx = point.x * matrix.a + point.y * matrix.c + 0;
  const dy = point.x * matrix.b + point.y * matrix.d + 0;
  return { x: dx, y: dy };
}

export type DecomposedMatrix = {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  rotation: number;
};
export function decomposeMatrix(matrix: Matrix): DecomposedMatrix {
  // @see https://gist.github.com/2052247

  // calculate delta transform point
  const px = deltaTransformPoint(matrix, { x: 0, y: 1 });
  const py = deltaTransformPoint(matrix, { x: 1, y: 0 });

  // calculate skew
  const skewX = (180 / Math.PI) * Math.atan2(px.y, px.x) - 90;
  const skewY = (180 / Math.PI) * Math.atan2(py.y, py.x);

  return {
    translateX: matrix.e,
    translateY: matrix.f,
    scaleX: Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b),
    scaleY: Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d),
    skewX: skewX,
    skewY: skewY,
    rotation: skewX, // rotation is the same as skew x
  };
}

export function extractFromComputedStyled(
  computed: CSSStyleDeclaration
): Record<string, string | number> {
  const arr =
    computed.transform === "none"
      ? undefined
      : /^matrix\(([+\-\d.]+), ([+\-\d.]+), ([+\-\d.]+), ([+\-\d.]+), ([+\-\d.]+), ([+\-\d.]+)\)$/
          .exec(computed.transform)!
          .slice(1)
          .map(parseFloat);
  const extracted: Record<string, string | number> = {};
  if (arr) {
    Object.assign(
      extracted,
      decomposeMatrix({
        a: arr[0],
        b: arr[1],
        c: arr[2],
        d: arr[3],
        e: arr[4],
        f: arr[5],
      })
    );
  }
  extracted["backgroundColor"] = computed.backgroundColor;
  return extracted;
}
export type StyleState = Record<string, number | string | undefined>;
export const getStyle = (state: StyleState): StyleState => {
  const style: Record<string, string | number> = {};
  const transform: Record<string, string> = {};
  const keys = Object.keys(state);

  for (const key of keys) {
    const value = state[key];
    if (value === undefined) continue;
    switch (key) {
      case "rotate": {
        transform[key] = `rotate(${value}deg)`;
        break;
      }
      case "scale":
      case "scaleY":
      case "scaleX": {
        transform[key] = `${key}(${value})`;
        break;
      }
      case "x": {
        transform[key] = `translateX(${value})`;
        break;
      }
      default:
        style[key] = value.toString();
    }
  }
  const transforms = Object.values(transform);
  if (transforms.length) {
    style.transform = transforms.join(" ");
  }
  return style;
};

export const takeFirstFrame = (
  animate: Record<string, (string | number) | (string | number)[]>
): Record<string, string | number> => {
  const frame: Record<string, string | number> = {};
  for (const key in animate) {
    const value = animate[key];
    if (typeof value === "number" || typeof value === "string") {
      frame[key] = value;
    } else {
      frame[key] = value[0];
    }
  }
  return frame;
};

export const DEFAULT: StyleState = {
  scale: 1,
  x: 0,
  y: 0,
  rotate: 0,
};

export interface Transtition extends PhysicsSpringOptions {
  type?: "spring" | "decay" | "keyframes";
  duration?: number;
  ease?: EasingName;
  times?: number[];
  repeat?: number; // TODO: Infinity can not be serialized
  repeatDelay?: number;
  repeatType?: "loop" | "reverse" | "mirror";
}
export type Animate =
  | string
  | Record<string, (string | number) | (string | number)[]>;
export type AnimateSingle = string | Record<string, string | number>;
export type Variant = Record<string, string | number>;
export type Variants = Record<string, Variant>;

export const Div = component$(
  (props: {
    class?: string;
    initial?: AnimateSingle;
    animate?: Animate;
    whileHover?: Animate;
    whileTap?: Animate;
    transition?: Transtition;
    variants?: Variants;
  }) => {
    const initialStyle =
      typeof props.initial === "string"
        ? props.variants![props.initial]
        : typeof props.animate === "string"
        ? props.variants![props.animate]
        : props.initial ??
          (typeof props.animate === "object"
            ? takeFirstFrame(props.animate)
            : {});

    const state = useStore<{
      style: Record<string, string | number>;
      initialDomStyle: Record<string, string | number>;
      animate?: Animate;
      initial?: Animate;
      hover?: boolean;
      tap?: boolean;
      hoverUpdated?: boolean;
      tapUpdated?: boolean;
    }>(
      {
        style: initialStyle,
        initialDomStyle: {},
        animate: props.animate,
        initial: props.initial,
      },
      { recursive: true }
    );
    const ref = useRef();
    useClientEffect$(({ track }) => {
      track(ref, "current");
      if (ref.current) {
        state.initialDomStyle = extractFromComputedStyled(
          getComputedStyle(ref.current)
        );
      }
    });
    useClientEffect$(({ track }) => {
      track(props, "animate");
      if (!equal(props.animate, state.animate)) {
        console.debug("animate updated", props.animate, state.animate);
        state.animate = props.animate;
      }
    });
    useClientEffect$(
      ({ cleanup, track }) => {
        track(state, "animate");
        // track(props, "animate");
        track(state, "hover");
        track(state, "tap");
        const target =
          (state.tap && props.whileTap) ||
          (state.hover && props.whileHover) ||
          props.animate;
        if (!(target || state.tapUpdated || state.hoverUpdated)) return;
        state.tapUpdated = false;
        state.hoverUpdated = false;
        const keys =
          typeof target === "string"
            ? Object.keys(props.variants![target])
            : target
            ? Object.keys(target)
            : Object.keys(state.style);

        keys.forEach((key) => {
          if (
            typeof state.animate === "string" &&
            props.animate !== state.animate
          ) {
            // state.initial = state.animate;
            state.animate = props.animate;
          }
          const from = !state.initial
            ? state.style[key] ?? DEFAULT[key] ?? state.initialDomStyle[key]
            : typeof state.initial === "string"
            ? props.variants![state.initial][key]
            : state.initial?.[key] ??
              DEFAULT[key] ??
              state.initialDomStyle[key];

          const to =
            (typeof target === "string"
              ? props.variants![target][key]
              : target?.[key]) ??
            DEFAULT[key] ??
            state.initialDomStyle[key];
          if (from === to && to && typeof to !== "object") {
            state.style[key] = to;
            return;
          }
          const { transition } = props;
          const { stop } = animate({
            from,
            to,
            ...transition,
            offset: transition?.times,
            ease: transition?.ease && easingFunctions[transition?.ease],
            duration: transition?.duration && transition?.duration * 1000,
            repeat: transition?.repeat,
            repeatDelay:
              transition?.repeatDelay && transition?.repeatDelay * 1000,
            repeatType: transition?.repeatType,
            // onPlay() {
            //   console.log("play");
            // },
            // onStop() {
            //   console.log("stop");
            // },
            onUpdate(latest: any) {
              //   console.log("update:", key, latest);
              state.style[key] = latest;
            },
          });
          cleanup(stop);
        });
      }
      // { eagerness: "load" }
    );

    return (
      <div
        ref={ref}
        onMouseOver$={() => {
          if (!props.whileHover) return;
          state.hover = true;
          state.hoverUpdated = true;
        }}
        onMouseLeave$={() => {
          if (!props.whileHover) return;
          state.hover = true;
          state.hover = false;
          state.hoverUpdated = true;
        }}
        onMouseDown$={() => {
          if (!props.whileTap) return;
          state.hover = true;
          state.tap = true;
          state.tapUpdated = true;
        }}
        onMouseUp$={() => {
          if (!props.whileTap) return;
          state.tap = false;
          state.tapUpdated = true;
        }}
        onMouseOut$={() => {
          if (!props.whileTap) return;
          state.tap = false;
          state.tapUpdated = true;
        }}
        class={props.class}
        style={getStyle(state.style)}
      >
        <Slot />
      </div>
    );
  }
);
export default { div: Div };
