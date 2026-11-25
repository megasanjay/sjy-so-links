declare module "#auth-utils" {
  interface User {
    id: string;

    givenName: string;
    familyName: string;
    emailAddress: string;
  }
}

export {};
