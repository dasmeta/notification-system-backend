const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

Sentry.init({
  environment: process.env.NODE_ENV || 'development',
  dsn: process.env.SENTRY_DSN,

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

module.exports = strapi => {
  return {
    initialize() {
      strapi.app.use(async (ctx, next) => {
        try {
          await next();
        } catch (error) {
          Sentry.setContext('request', {
            headers: ctx.request.header,
            host: ctx.request.header.host,
            method: ctx.request.method,
            url: ctx.request.url,
            data: ctx.request.body
          });
          Sentry.captureException(error);
          throw error;
        }
      });
    },
  };
};
