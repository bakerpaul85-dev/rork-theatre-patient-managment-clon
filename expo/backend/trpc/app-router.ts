import { createTRPCRouter } from "./create-context";
import { emailRouter } from "./routes/email";

export const appRouter = createTRPCRouter({
  email: emailRouter,
});

export type AppRouter = typeof appRouter;
