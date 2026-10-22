declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string; // env variables are always strings
    MONGO_DB: string;

    JWT_SECRET: string;
    JWT_RESET_SECRET: string;
    JWT_REFRESH_SECRET?: string;
    JWT_ACCESS_EXPIRATION?: string;
    JWT_REFRESH_EXPIRATION?: string;

    EMAIL_HOST?: string;
    EMAIL_PORT?: string;
    EMAIL_USER: string;
    EMAIL_PASS: string;
    ADMIN_EMAIL?: string;
    OWNER_EMAIL?: string;

    PASSWORD_RESET_URL?: string;

    NODE_ENV: "development" | "production" | "test";
  }
}
