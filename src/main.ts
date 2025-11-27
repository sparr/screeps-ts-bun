import { wrapLoop } from "./util/ErrorMapper";

console.log("Initializing main...");

export const loop = wrapLoop(() => {
  console.log("Game tick:", Game.time);
});

console.log("Main fully initialized...");
