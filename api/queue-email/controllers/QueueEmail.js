'use strict';

/**
 * queueemail.js controller
 *
 * @description: A set of functions called "actions" for managing `queueemail`.
 */

module.exports = {

  /**
  * Retrieve queueemail records.
  *
  * @return {Object|Array}
  */

  find: async (ctx, next, { populate } = {}) => {
    if (ctx.query._q) {
      return strapi.services.queueemail.search(ctx.query);
    } else {
      return strapi.services.queueemail.fetchAll(ctx.state.partnerId, ctx.query, populate);
    }
  },

  /**
   * Count queueemail records.
   *
   * @return {Number}
   */

  count: async (ctx) => {
    return strapi.services.queueemail.count(ctx.state.partnerId, ctx.query);
  },

  /**
   * edit a/an queueemail record.
   *
   * @return {Object}
   */

  edit: async (ctx, next) => {
    return strapi.services.queueemail.edit(ctx.params, ctx.request.body);
  },

  cancelQueueEmail: async (ctx, next) => {
    return strapi.services.queueemail.cancelQueueEmail(ctx.query);
  },

  reprocessQueueEmail: async (ctx, next) => {
    return strapi.services.queueemail.reprocess(ctx.request.body);
  },

  cleanup: async (ctx, next) => {
    return strapi.services.queueemail.cleanup(ctx.query);
  },

  /**
   * Mark As Read.
   *
   * @return {Object}
   */

  read: async (ctx) => {
    const userAgent = ctx.req.headers['user-agent']
    await strapi.services.queueemail.read(ctx.params, userAgent);
    ctx.type = 'image/png';
    ctx.response.body = new Buffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  }
};
