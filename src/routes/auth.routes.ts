import express from "express";
import querystring from "querystring";
import axios from "axios";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and management
 */

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Get Google OAuth URL
 *     tags: [Authentication]
 *     description: >
 *       Initiates the Google OAuth 2.0 authentication flow.
 *       This endpoint returns a URL to which the client should redirect the user.
 *       After the user grants consent, Google will redirect them back to the specified `redirect_uri` with an authorization code.
 *     responses:
 *       200:
 *         description: The Google authentication URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 google_auth_url:
 *                   type: string
 *                   format: uri
 *                   example: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...
 */
router.get("/google", (req, res) => {
  const params = querystring.stringify({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid profile email",
    access_type: "offline",
    prompt: "consent",
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  res.json({ google_auth_url: url });
});

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Authentication]
 *     description: >
 *       This is the callback URL that Google redirects to after a user authenticates.
 *       It receives an authorization code, exchanges it for an access token, fetches the user's profile,
 *       and then creates a new user or updates an existing one in the database.
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: The authorization code provided by Google.
 *     responses:
 *       201:
 *         description: User authenticated and logged in successfully. Returns user details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: integer
 *                   description: The user's unique ID in our database.
 *                 email:
 *                   type: string
 *                   format: email
 *                 name:
 *                   type: string
 *                 picture:
 *                   type: string
 *                   format: uri
 *                 token:
 *                   type: string
 *                   description: JWT token for authenticating subsequent requests.
 *       400:
 *         description: Bad Request - Missing authorization code.
 *       500:
 *         description: Internal Server Error - Google authentication failed.
 */
router.get("/google/callback", async (req, res) => {
  const code = req.query.code;

  if (!code)
    return res.status(400).json({ error: "Missing authorization code" });

  try {
    // 1. Exchange code → token
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
        code,
      }
    );

    const { access_token } = tokenResponse.data;

    // 2. Fetch Google user info
    const userResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const { id, email, name, picture } = userResponse.data;

    // 3. Save user
    const [user]: any = await User.upsert(
      {
        googleId: id,
        email,
        name,
        picture,
      },
      { returning: true } // Ensure the user object is returned
    );

    // 4. Generate JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "30d",
    });

    res.status(201).json({
      user_id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      token,
    });
  } catch (error: any) {
    console.error(error.response?.data || error);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

export default router;
