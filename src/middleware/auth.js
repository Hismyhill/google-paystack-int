import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const [, token] = bearer.split(" ");
  if (!token) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid token format" });
  }

  try {
    const payload = jwt.verify(token, process.env.APP_SECRET);
    req.user = payload; // Attach user payload to the request
    next();
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
