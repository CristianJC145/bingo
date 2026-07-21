import jwt_decode from 'jwt-decode';

export class TokenService {
  // private secretKey : string;

  // constructor(secretKey: string) {
  //     this.secretKey = secretKey;
  // }

  get(): string | boolean {
      const token = localStorage.getItem('token');

      if (token) {
        return token;
      }

    return false;
  }

  set(token: string): void {
    localStorage.setItem('token', token);
  }

  delete() {
    localStorage.removeItem('token');
  }

  isAuthenticated(): Boolean | any {
    const token = this.get();
    if (token) {
      try {
        const decodedToken  = jwt_decode(token as string) as any;
        return decodedToken;
      } catch (error) {
        console.error('Error al verificar el token:', error);
        return false;
      }
    }
    return false;
  }
}