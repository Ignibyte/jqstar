import { resolve } from "node:path";
import { createNavigationDecisionServer } from "../../test/fixtures/navigation-decision/server.mjs";

const server = createNavigationDecisionServer(resolve(".git/jqstar/navigation-decision/assets"));
const port = Number(process.env.JQS_NAVIGATION_DECISION_PORT ?? 4179);
server.listen(port, "127.0.0.1", () => {
  console.log(`Navigation decision fixture listening on ${port}.`);
});
const close = () => {
  server.closeAllConnections();
  server.close();
};
process.once("SIGINT", close);
process.once("SIGTERM", close);
