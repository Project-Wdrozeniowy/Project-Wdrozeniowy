/** Request generations protect UI/cache writes; they do not replace server-side revocation. */
let generation = 0;
const controllers = new Set<AbortController>();

export const sessionEvents = {
  current: () => generation,
  advance: () => {
    generation += 1;
    for (const controller of controllers) controller.abort();
    controllers.clear();
    return generation;
  },
  controller: () => {
    const controller = new AbortController();
    controllers.add(controller);
    return { controller, release: () => controllers.delete(controller) };
  },
};
