
import express from "express";

import {
    createSubmission,
    getFormSubmissions
} from "../controllers/submissionController.js";

const router = express.Router();


// POST /submissions
// Maps incoming POST requests to the createSubmission controller
router.post("/submissions", createSubmission);


// GET /forms/:form_id/submissions
// :form_id is a dynamic URL parameter
// Example: /forms/contact-form/submissions?page=1
router.get("/forms/:form_id/submissions", getFormSubmissions);


export default router;
