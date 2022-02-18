'use strict';

/**
 * notificationemail.js controller
 *
 * @description: A set of functions called "actions" for managing `notificationemail`.
 */

module.exports = {

  /**
   * Retrieve notificationemail records.
   *
   * @return {Object|Array}
   */

  find: async (ctx, next, { populate } = {}) => {
    if (ctx.query._q) {
      return strapi.services.notificationemail.search(ctx.query);
    } else {
      return strapi.services.notificationemail.fetchAll(ctx.state.partnerId, ctx.query, populate);
    }
  },

  /**
   * Retrieve a notificationemail record.
   *
   * @return {Object}
   */

  findOne: async (ctx) => {
    if (!ctx.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return ctx.notFound();
    }

    return strapi.services.notificationemail.fetch(ctx.state.partnerId, ctx.params);
  },

  /**
   * Count notificationemail records.
   *
   * @return {Number}
   */

  count: async (ctx) => {
    return strapi.services.notificationemail.count(ctx.state.partnerId, ctx.query);
  },

  /**
   * Save a/an notificationemail record.
   *
   * @return {Object}
   */

  save: async (ctx) => {
    return strapi.services.notificationemail.save(ctx.state.partnerId, ctx.request.body);
  },
};
