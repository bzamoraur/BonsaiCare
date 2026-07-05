import { readFileSync } from "node:fs";

import { FIXTURES_PATH } from "./auth-constants";

/** Seed record ids written by global-setup, read by the authenticated flow specs. */
export type Fixtures = {
  userId: string;
  timelineTreeId: string;
  loopTreeId: string;
};

export function readFixtures(): Fixtures {
  return JSON.parse(readFileSync(FIXTURES_PATH, "utf8")) as Fixtures;
}
