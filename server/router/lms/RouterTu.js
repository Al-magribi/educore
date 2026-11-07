import { Router } from "express";
import { authorize } from "../../middleware/authorize.js";
import { ensureTuSchema } from "./tu/shared.js";
import bukuRoutes from "./tu/bukuRoutes.js";
import recordRoutes from "./tu/recordRoutes.js";
import officeRoutes from "./tu/officeRoutes.js";

const router = Router();

const prepareSchema = async (req, res, next) => {
  try {
    await ensureTuSchema();
    next();
  } catch (error) {
    console.error("[tu] skema gagal", error);
    res.status(500).json({
      status: "error",
      message: "Skema tata usaha gagal disiapkan.",
    });
  }
};

router.use("/tu", authorize("satuan", "assignment:tu"), prepareSchema);

router.use(bukuRoutes);
router.use(recordRoutes);
router.use(officeRoutes);

export default router;
