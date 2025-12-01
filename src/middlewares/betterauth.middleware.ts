import type { Request, Response, NextFunction } from "express";
import { auth } from "../libs/betterauth";

/**
 * Better Auth Handler Middleware
 * Converts Express requests to Fetch API format for Better Auth
 */
export const betterAuthHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Convert Express request to Fetch API Request
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const requestInit: RequestInit = {
      method: req.method,
      headers: req.headers as any,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      requestInit.body = JSON.stringify(req.body);
    }

    const fetchRequest = new Request(url, requestInit);
    const response = await auth.handler(fetchRequest);

    // Copy response headers and status
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.status(response.status);
    const body = await response.text();
    res.send(body);
  } catch (error) {
    next(error);
  }
};

