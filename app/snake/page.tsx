import type { Metadata } from "next";
import Link from "next/link";
import { SnakeGame } from "@/components/snake/snake-game";
import styles from "@/components/snake/snake.module.css";

export const metadata: Metadata = {
  title: "Snake | Enterprise Intelligence Platform",
  description: "Guide the snake, eat the food, and grow as long as you can.",
};

export default function SnakePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          {"← Back to workspace"}
        </Link>
        <h1 className={styles.title}>Snake</h1>
        <p className={styles.subtitle}>
          Eat the food to grow longer. Avoid the walls and your own tail.
        </p>
      </header>
      <SnakeGame />
    </main>
  );
}
