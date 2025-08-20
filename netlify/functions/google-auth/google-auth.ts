import { Handler } from "@netlify/functions";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import connectToDatabase from "../src/database";
import { User } from "../src/models/User";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 1. Läs in credential (Google ID Token från frontend)
    const body = JSON.parse(event.body || "{}");
    const { credential } = body;

    if (!credential) {
      return { statusCode: 400, body: "Missing credential" };
    }

    // 2. Verifiera Googles token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID, // samma client id som i index.html
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return { statusCode: 401, body: "Invalid Google token" };
    }

    const { db } = await connectToDatabase();
    const user = await db.collection<User>('users').findOne({ email: payload.email, authMethod: 'google' });

    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: "User not found or not Google-enabled" }) };
    }

    // Uppdatera googleSub om det saknas
    if (!user.googleSub) {
        await db.collection<User>('users').updateOne(
            { _id: user._id },
            { $set: { googleSub: payload.sub } }
        );
    }

    // 3. Skapa en egen server-JWT (för dashboard och API:er)
    const serverJwt = jwt.sign(
      {
        sub: payload.sub,             // Googles unika ID för användaren
        userId: user._id.toString(),  // För befintlig kod
        email: payload.email,
        role: user.role,
        authMethod: 'google',         // Specifiera att detta är en Google-använd
        name: payload.name,           // fullständigt namn
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
      },
      process.env.JWT_SECRET!,        // din hemliga nyckel i Netlify env vars
      { expiresIn: "1h" }
    );

    // 4. Returnera JWT till frontend
    return {
      statusCode: 200,
      body: JSON.stringify({ jwt: serverJwt }),
    };
  } catch (err) {
    console.error("Google Auth Error:", err);
    return { statusCode: 401, body: "Google auth failed" };
  }
};
