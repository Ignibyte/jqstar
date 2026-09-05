import { resolve } from "node:path";
import { createResourceStrategyServer } from "../../test/fixtures/resource-strategy/server.mjs";

const port = Number(process.env.JQS_RESOURCE_STRATEGY_PORT ?? 4178);
const assets = resolve(
  process.env.JQS_RESOURCE_BUILD_DIRECTORY ?? ".git/jqstar/resource-strategy/build",
);
const server = createResourceStrategyServer(assets);
server.listen(port, "127.0.0.1", () =>
  console.log(`Project Inspector fixture listening on ${port}`),
);
const stop = () => server.close();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
