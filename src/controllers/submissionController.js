
import {
    createSubmissionService,
    getFormSubmissionsService
} from "../services/submissionService.js";


// POST /submissions
export const createSubmission = async (req, res, next) => {
    try {

        // Pass the request body to the service layer.
        // The service handles validation, insertion and duplicate detection.
        const result = await createSubmissionService(req.body);


        // Return 201 when a new submission is created.
        // Return 200 when an existing submission is returned.
        return res.status(result.isDuplicate ? 200 : 201).json({
            success: true,

            message: result.isDuplicate
                ? "Submission already exists"
                : "Submission created successfully",

            isDuplicate: result.isDuplicate,

            submission: result.submission
        });

    } catch (error) {

        // Pass errors to Express's global error-handling middleware
        next(error);
    }
};


// GET /forms/:form_id/submissions
export const getFormSubmissions = async (req, res, next) => {
    try {

        // Extract form_id from URL parameters
        // Extract page from query parameters (defaults to page 1)
        const result = await getFormSubmissionsService(
            req.params.form_id,
            req.query.page || 1
        );


        // Return the paginated submissions
        return res.status(200).json({
            success: true,

            form_id: req.params.form_id,

            // Include pagination details and submission records
            ...result
        });

    } catch (error) {

        // Forward errors to the global error handler
        next(error);
    }
};
