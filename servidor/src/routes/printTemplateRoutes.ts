import { raw, Router } from "express";
import { deletePrintTemplate, getPrintTemplate, savePrintTemplateConfig, uploadPrintTemplate } from "../controllers/printTemplateController";

const printTemplateRouter = Router();

printTemplateRouter.get("/api/print-template", getPrintTemplate);
printTemplateRouter.post("/api/print-template", raw({ type: "image/*", limit: "15mb" }), uploadPrintTemplate);
printTemplateRouter.put("/api/print-template/config", savePrintTemplateConfig);
printTemplateRouter.delete("/api/print-template", deletePrintTemplate);

export default printTemplateRouter;
