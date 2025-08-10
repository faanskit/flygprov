import type { Handler } from "@netlify/functions";
import { login } from "../src/auth-handler"; // Adjusted path

const handler: Handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    try {
        const result = await login(event.body);
        return {
            statusCode: 200,
            body: JSON.stringify(result),
            headers: { "Content-Type": "application/json" },
        };
    } catch (error: any) {
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ error: error.message }),
            headers: { "Content-Type": "application/json" },
        };
    }
};

export { handler };
