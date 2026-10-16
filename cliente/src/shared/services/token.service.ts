import jwtDecode from "jwt-decode";

type DecodedToken = Record<string, unknown>;

export class TokenService {
  get(): string | false { return localStorage.getItem("token") ?? false; }
  set(token: string): void { localStorage.setItem("token", token); }
  delete(): void { localStorage.removeItem("token"); }
  isAuthenticated(): DecodedToken | false {
    const token = this.get();
    if (!token) return false;
    try { return jwtDecode<DecodedToken>(token); }
    catch (error) { console.error("Error al verificar el token:", error); return false; }
  }
}
