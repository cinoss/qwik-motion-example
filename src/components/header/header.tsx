import { component$, useStyles$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import styles from "./header.css?inline";

export default component$(() => {
  useStyles$(styles);
  return (
    <header>
      <ul>
        <li>
          <Link href="/">qwik-motion</Link>
        </li>
      </ul>
    </header>
  );
});
