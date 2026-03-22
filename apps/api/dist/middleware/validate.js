"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateParams = validateParams;
/**
 * Returns an Express middleware that validates req.body against the given Zod schema.
 * On success, replaces req.body with the parsed (and coerced) value.
 * On failure, responds 400 with structured error details.
 */
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const issues = result.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            }));
            res.status(400).json({
                data: null,
                error: {
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    issues,
                },
            });
            return;
        }
        req.body = result.data;
        next();
    };
}
/**
 * Returns an Express middleware that validates req.params against the given Zod schema.
 */
function validateParams(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            res.status(400).json({
                data: null,
                error: {
                    message: 'Invalid route parameters',
                    code: 'VALIDATION_ERROR',
                    issues: result.error.issues,
                },
            });
            return;
        }
        req.params = result.data;
        next();
    };
}
