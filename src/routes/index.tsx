import { component$, mutable, useStore, useStyles$ } from "@builder.io/qwik";
import { DocumentHead } from "@builder.io/qwik-city";
import motion from "~/components/motion";
import styles from "./styles.css?inline";

export const variants = {
  open: { opacity: 1, x: "0%" },
  closed: { opacity: 0, x: "-100%" },
};

export default component$(() => {
  useStyles$(styles);

  const isOpen = useStore({ value: false });
  return (
    <div class="main">
      <motion.div
        class="box"
        animate={mutable({
          scale: [1, 2, 2, 1, 1],
          rotate: [0, 0, 180, 180, 0],
          borderRadius: ["25%", "0%", "50%", "50%", "25%"],
          // borderRadius: ["0%", "50%"],
        })}
        transition={mutable({
          duration: 2,
          ease: "easeInOut",
          times: [0, 0.2, 0.5, 0.8, 1],
          // repeat: Infinity,
          repeat: 1000,
          repeatDelay: 1,
        })}
      />
      <motion.div
        class="box"
        initial={mutable({ opacity: 0, scale: 0.5 })}
        animate={mutable({ opacity: 1, scale: 1 })}
        transition={mutable({ duration: 0.5 })}
      />
      <div>
        <div>
          <button onClick$={() => (isOpen.value = !isOpen.value)}>
            toggle:
            {isOpen.value ? "open" : "closed"}
          </button>
        </div>
        <motion.div
          class="box"
          animate={mutable(isOpen.value ? "open" : "closed")}
          variants={mutable(variants)}
        />
      </div>

      <motion.div
        class="box"
        whileHover={mutable({ scale: 1.2, backgroundColor: "#f00" })}
        whileTap={mutable({ scale: 0.8, backgroundColor: "#0f0" })}
        transition={mutable({ type: "spring", stiffness: 400, damping: 17 })}
      >
        Click Me
      </motion.div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Welcome to qwik-motion",
};
