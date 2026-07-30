import { bootstrap } from "./bootstrap.js";

bootstrap().catch((error) => {
  console.error("City Engine failed to initialize.", error);
});
