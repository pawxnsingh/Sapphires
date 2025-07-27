import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  console.log("token from backend: ", token)
  
  if (!token) {
    res.status(401).json({
      message: "token missing",
    });
    return;
  }

  console.log(process.env.JWT_PUBLIC_KEY)

  const decode = jwt.verify(token, process.env.JWT_PUBLIC_KEY!, {
    algorithms: ["RS256"],
  });
  
  if (!decode) {
    res.status(401).json({
      message: "unauthorized",
    });
    return;
  }

  console.log(decode)

  const userId = (decode as any).sub;

  if (!userId) {
    res.status(401).json({
      message: "unauthorized",
    });
    return;
  }

  req.userId = userId;
  next();
}
