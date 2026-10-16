import { raw, Router } from "express";
import { createBallVoice, deleteBallVoice, listBallVoices, uploadBallVoiceBall } from "../controllers/ballVoiceController";

const ballVoiceRouter = Router();

ballVoiceRouter.get("/api/ball-voices", listBallVoices);
ballVoiceRouter.post("/api/ball-voices", createBallVoice);
ballVoiceRouter.put("/api/ball-voices/:id/ball/:number", raw({ type: () => true, limit: "5mb" }), uploadBallVoiceBall);
ballVoiceRouter.delete("/api/ball-voices/:id", deleteBallVoice);

export default ballVoiceRouter;
