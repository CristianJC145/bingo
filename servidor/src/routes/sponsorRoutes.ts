import { raw, Router } from "express";
import { createPersonSponsor, createSponsor, deleteSponsor, listSponsors } from "../controllers/sponsorController";

const sponsorRouter = Router();
sponsorRouter.get("/api/sponsors", listSponsors);
sponsorRouter.post("/api/sponsors/person", createPersonSponsor);
sponsorRouter.post("/api/sponsors", raw({ type: ["image/*", "video/*"], limit: "40mb" }), createSponsor);
sponsorRouter.delete("/api/sponsors/:id", deleteSponsor);

export default sponsorRouter;
