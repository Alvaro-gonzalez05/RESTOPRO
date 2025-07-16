import type { NextApiRequest } from "next"
import { verify } from "jsonwebtoken"

export function getCurrentUserFromApiRoute(req: NextApiRequest, options?: { cookieName?: string }) {
  // Permitir especificar el nombre de la cookie, o buscar en los nombres comunes
  let token = null;
  if (options?.cookieName && req.cookies[options.cookieName]) {
    token = req.cookies[options.cookieName];
  } else {
    const cookieNames = [
      "next-auth.session-token",
      "authjs.session-token",
      "session",
      "token"
    ];
    for (const name of cookieNames) {
      if (req.cookies[name]) {
        token = req.cookies[name];
        break;
      }
    }
  }
  if (!token) return null;
  try {
    return verify(token, process.env.JWT_SECRET!);
  } catch {
    return null;
  }
}
