import { raw, Router } from "express";
import { deleteSlotWinnerSound, getSlotWinnerSound, saveSlotWinnerSound } from "../controllers/slotWinnerSoundController";

const slotWinnerSoundRouter = Router();
slotWinnerSoundRouter.get("/api/slot-winner-sound", getSlotWinnerSound);
slotWinnerSoundRouter.put("/api/slot-winner-sound", raw({ type: "audio/*", limit: "15mb" }), saveSlotWinnerSound);
slotWinnerSoundRouter.delete("/api/slot-winner-sound", deleteSlotWinnerSound);

export default slotWinnerSoundRouter;
