import { createActorWithConfig as _createActorWithConfig } from "@caffeineai/core-infrastructure";
import type { CreateActorOptions } from "@caffeineai/core-infrastructure";
import { createActor } from "./backend";
import type { backendInterface } from "./backend";

/**
 * Creates a backend actor with the app's canister configuration.
 * Wraps core-infrastructure's createActorWithConfig with the app's createActor.
 */
export async function createActorWithConfig(
  options?: CreateActorOptions,
): Promise<backendInterface> {
  return _createActorWithConfig(createActor, options) as Promise<backendInterface>;
}
