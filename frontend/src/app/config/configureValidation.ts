import { z } from 'zod';

// Express serves this SPA with script-src 'self'. Avoid even Zod's caught
// new Function capability probe; validation semantics stay unchanged.
z.config({ jitless: true });
