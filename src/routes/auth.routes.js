import express from "express";
import querystring from "querystring";
import axios from "axios";
import User from "../models/User.model.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and management
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
 * /auth/google:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: The user's email.
 *               password:
 *                 type: string
 *                 description: The user's password.
 *     responses:
 *       201:
 *         description: User created successfully.
 *       400:
 *         description: Bad request.
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
    const user = await User.upsert(
      {
        googleId: id,
        email,
        name,
        picture,
      },
      { returning: true }
    );

    res.json({
      user_id: user[0].id,
      email,
      name,
      picture,
    });
  } catch (error) {
    console.error(error.response?.data || error);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

export default router;
