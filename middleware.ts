import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/_next",
  "/favicon.ico",
  "/public",
  "/assets",
  "/manifest.json"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir acceso a rutas públicas
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Proteger todas las rutas de la API y otras rutas que no sean públicas
  // La autenticación se manejará dentro de las rutas de la API o acciones de servidor
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("expired", "1");
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"]
};