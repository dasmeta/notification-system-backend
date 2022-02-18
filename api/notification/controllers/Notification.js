'use strict';

/**
 * Notification.js controller
 *
 * @description: A set of functions called "actions" for managing `Notification`.
 */

module.exports = {

  createManyNotifications: async (ctx, next) => {
    return strapi.services.notification.createManyNotifications(ctx.request.body);
  },
};
