import { google } from "googleapis";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

// Initialize the Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_OAUTH_REDIRECT_URL
);

// Scopes define what user information we are requesting
const scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export const generateGoogleAuthURL = () => {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
};

export const handleGoogleCallback = async (code) => {
  // Exchange the authorization code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Use the tokens to get user info
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  if (!userInfo.id || !userInfo.email) {
    throw new Error("Failed to retrieve user information from Google");
  }

  // Create or update user in the database (upsert)
  const user = await prisma.user.upsert({
    where: { googleId: userInfo.id },
    update: {
      name: userInfo.name,
      picture: userInfo.picture,
      email: userInfo.email, // Update email in case it changed
    },
    create: {
      googleId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      provider: "google",
    },
  });

  // Create a JWT token for the user session
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.APP_SECRET,
    { expiresIn: "7d" }
  );

  return {
    user: { id: user.id, name: user.name, email: user.email },
    token,
  };
};
