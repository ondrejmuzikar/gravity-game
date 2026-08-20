import { createFileRoute } from "@tanstack/react-router";
import { GravityGame } from "@/components/gravity-game";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <GravityGame />;
}
