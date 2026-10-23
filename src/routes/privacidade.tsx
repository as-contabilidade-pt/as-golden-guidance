import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  beforeLoad: () => {
    throw redirect({ to: "/politica-de-privacidade", statusCode: 301 });
  },
});
