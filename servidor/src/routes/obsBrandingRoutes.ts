import { raw, Router } from "express";
import { deleteObsBranding, getObsBranding, saveObsBranding } from "../controllers/obsBrandingController";

const obsBrandingRouter = Router();
obsBrandingRouter.get("/api/obs-branding", getObsBranding);
obsBrandingRouter.put("/api/obs-branding", raw({ type: ["image/*", "video/*"], limit: "50mb" }), saveObsBranding);
obsBrandingRouter.delete("/api/obs-branding", deleteObsBranding);

export default obsBrandingRouter;
