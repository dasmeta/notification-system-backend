module.exports = ({ env }) => ({
  host: "0.0.0.0",
  port: env("PORT", 1337),
  url: env('API_URL'),
  production: true,
  parser: {
    "formLimit": "3mb",
    "jsonLimit": "3mb"
  },
  cron: {
    "enabled": true
  },
  admin: {
    autoOpen: false,
    url: env('ADMIN_URL'),
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    }
  }
});