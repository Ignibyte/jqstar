import { datastarPlugin } from "jquery-star/datastar";
import { bootInspector } from "./common";
import { createServerStrategy } from "./server-strategy";
bootInspector(createServerStrategy, [datastarPlugin]);
