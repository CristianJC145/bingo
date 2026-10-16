import { Router, raw } from "express";
import { createSoundEffect, deleteSoundEffect, getMultipleWinnersSound, listSoundEffects, setMultipleWinnersSound } from "../controllers/soundEffectController";

const soundEffectRouter = Router();

soundEffectRouter.get("/api/sound-effects", listSoundEffects);
soundEffectRouter.get("/api/sound-effects/multiple-winners", getMultipleWinnersSound);
soundEffectRouter.put("/api/sound-effects/multiple-winners", setMultipleWinnersSound);
soundEffectRouter.post(
  "/api/sound-effects",
  raw({ type: "audio/*", limit: "10mb" }),
  createSoundEffect
);
soundEffectRouter.delete("/api/sound-effects/:id", deleteSoundEffect);

export default soundEffectRouter;
