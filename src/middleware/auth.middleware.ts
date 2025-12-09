import jwt, { type JwtPayload } from "jsonwebtoken";
import { type Request, type Response, type NextFunction } from "express";
import User from "../models/User.js";

// Define a type for our JWT payload to ensure type safety
interface DecodedToken extends JwtPayload {
  id: number;
  email: string;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      if (!token) {
        throw new Error("Token not found in header");
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as unknown as DecodedToken;

      // Explicitly type the result to match our expected user shape
      const user = await User.findByPk<any>(decoded.id, {
        raw: true, // Return a plain JavaScript object
      });

      if (user) {
        // Only assign to req.user if a user was found
        // The type assertion here satisfies the compiler
        req.user = user;
        return next();
      }

      // If user is not found with the token's ID
      throw new Error("User not found");
    } catch (error) {
      return res.status(401).json({ error: "Not authorized, token failed" });
    }
  }

  // This will catch cases where the authorization header is missing
  return res.status(401).json({ error: "Not authorized, no token" });
};
