
import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";
import Submission from "../models/Submission.js";
import { redis, getCachedSubmission, cacheSubmission } from "../config/redis.js";
import { publishSubmission } from "../config/kafka.js";

// Basic email validation pattern
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


/*
 * Creates a new submission.
 *
 * This service handles:
 * 1. Input validation
 * 2. Duplicate prevention using idempotency_key
 * 3. Database insertion
 * 4. Returning an existing submission if it is a duplicate
 */
export const createSubmissionService = async (payload) => {

    // Extract the required fields from the request payload
    const {
        form_id,
        idempotency_key,
        email,
        data
    } = payload;


    // Validate form_id
    // It must be a non-empty string
    if (typeof form_id !== "string" || !form_id.trim()) {
        throw Object.assign(new Error("form_id is required"), {
            status: 400
        });
    }


    // Validate idempotency_key
    // This key identifies a unique submission attempt
    if (
        typeof idempotency_key !== "string" ||
        !idempotency_key.trim()
    ) {
        throw Object.assign(new Error("idempotency_key is required"), {
            status: 400
        });
    }


    // Validate email format
    // Invalid email addresses should be rejected before database insertion
    if (
        typeof email !== "string" ||
        !emailRegex.test(email.trim())
    ) {
        throw Object.assign(new Error("Invalid email address"), {
            status: 400
        });
    }


    // Validate data
    // The data field must be a JSON object, not null or an array
    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        throw Object.assign(new Error("data must be a JSON object"), {
            status: 400
        });
    }


    // Redis is the first duplicate lookup. This protects the database during
    // repeated replay of already-known idempotency keys.
    const cachedSubmission = await getCachedSubmission(idempotency_key.trim());
    if (cachedSubmission) {
        return { submission: cachedSubmission, isDuplicate: true };
    }

    /*
     * ATOMIC INSERT
     *
     * We directly attempt to insert the submission.
     *
     * ON CONFLICT DO NOTHING:
     * If another submission already has the same idempotency_key,
     * PostgreSQL skips the insertion instead of throwing a duplicate-key error.
     *
     * RETURNING *:
     * If insertion succeeds, PostgreSQL returns the newly created record.
     *
     * This avoids the race condition that can happen when we first check
     * whether a key exists and then insert it separately.
     */
    const inserted = await sequelize.query(
        `
        INSERT INTO "submissions"
            ("form_id", "idempotency_key", "email", "data", "createdAt", "updatedAt")
        VALUES
            ($form_id, $idempotency_key, $email, $data, NOW(), NOW())
        ON CONFLICT ("idempotency_key") DO NOTHING
        RETURNING *
        `,
        {
            // Bind parameters safely instead of concatenating user input
            bind: {
                form_id: form_id.trim(),
                idempotency_key: idempotency_key.trim(),
                email: email.trim(),
                data: JSON.stringify(data)
            },

            // Tell Sequelize to return the SELECT-style result rows
            type: QueryTypes.SELECT
        }
    );


    // If PostgreSQL returned a row, the insertion was successful
    if (inserted.length > 0) {
        await cacheSubmission(inserted[0]);
        try {
            await redis.xAdd("submission-events", "*", {
                event_id: String(inserted[0].id),
                form_id: inserted[0].form_id,
                created_at: new Date(inserted[0].createdAt).toISOString()
            });
        } catch {
            // Redis Stream delivery is best-effort here; the database remains authoritative.
        }
        await publishSubmission(inserted[0]);
        return {
            submission: inserted[0],
            isDuplicate: false
        };
    }


    /*
     * If no row was inserted, the idempotency_key already exists.
     *
     * Fetch the original submission and return it.
     * We do not create another database record.
     */
    const existingSubmission = await Submission.findOne({
        where: {
            idempotency_key: idempotency_key.trim()
        }
    });


    // Handle the unexpected case where the existing record cannot be found
    if (!existingSubmission) {
        throw new Error("Could not retrieve existing submission");
    }


    await cacheSubmission(existingSubmission);

    // Return the original record and indicate that this was a duplicate
    return {
        submission: existingSubmission,
        isDuplicate: true
    };
};


/*
 * Retrieves submissions belonging to a particular form.
 *
 * Supports pagination:
 * Page 1 -> Records 1 to 10
 * Page 2 -> Records 11 to 20
 * Page 3 -> Records 21 to 30
 */
export const getFormSubmissionsService = async (form_id, page = 1) => {

    // Validate the form ID
    if (typeof form_id !== "string" || !form_id.trim()) {
        throw Object.assign(new Error("form_id is required"), {
            status: 400
        });
    }


    // Convert the page query parameter from string to number
    const currentPage = Number(page);


    // Page must be a positive integer
    // Reject values such as 0, -1, 1.5, abc and empty strings
    if (
        !/^[1-9]\d*$/.test(String(page)) ||
        !Number.isSafeInteger(currentPage)
    ) {
        throw Object.assign(new Error("Invalid page number"), {
            status: 400
        });
    }


    // We always return 10 records per page
    const limit = 10;


    // Calculate how many records should be skipped
    // Page 1 -> offset 0
    // Page 2 -> offset 10
    // Page 3 -> offset 20
    const offset = (currentPage - 1) * limit;


    // Prevent unsafe or excessively large offset values
    if (!Number.isSafeInteger(offset)) {
        throw Object.assign(new Error("Page number is too large"), {
            status: 400
        });
    }


    /*
     * findAndCountAll performs two operations:
     *
     * 1. COUNT: Gets the total number of submissions for this form.
     * 2. FIND: Retrieves only the records required for the current page.
     *
     * order:
     * Newest submissions appear first.
     *
     * id is used as a secondary sort field so records with identical
     * timestamps have a deterministic order.
     */
    const { count, rows } = await Submission.findAndCountAll({
        where: {
            form_id: form_id.trim()
        },
        limit,
        offset,
        order: [
            ["createdAt", "DESC"],
            ["id", "DESC"]
        ]
    });


    // Return the records along with pagination information
    return {
        pagination: {
            totalSubmissions: count,
            currentPage,
            totalPages: Math.ceil(count / limit),
            pageSize: limit
        },

        submissions: rows
    };
};
