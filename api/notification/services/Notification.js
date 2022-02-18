'use strict';

/**
 * Notification.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

// Public dependencies.
const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');
const { cancelQueueEmail } = require('../../queue-email/services/QueueEmail');

module.exports = {

  createManyNotifications: async (value) => {
    const { notificationList, uniqueKey = null } = value;

    if (!notificationList.length) {
      return notificationList.length;
    }

    if (uniqueKey) {
      const nowDate = new Date();
      await strapi.models.queueemail.updateMany(
        { uniqueKey, cancel: false, sent: false, date: { $gte: new Date(nowDate.setMonth(nowDate.getMonth() - 2)) } },
        { $set: { cancel: true } }
      );
    }

    return await Promise.all(notificationList.map(
      async item => {
        try {
          const ORMModel = strapi.query('notification').model;

          const relations = _.pick(item, ORMModel.associations.map(ast => ast.alias));
          const data = _.omit(item, ORMModel.associations.map(ast => ast.alias));

          if (item.unique && item.uniqueKey) {
            const notification = await ORMModel.findOne({ key: item.key, uniqueKey: item.uniqueKey });
            if (notification) {
              return notification;
            }
          }

          // Create entry with no-relational data.
          const entry = await ORMModel.create(data);
          ORMModel.lifecycles.afterCreate(entry);
          // Create relational data and return the entry.
          return ORMModel.updateRelations({ _id: entry.id, values: relations });
        } catch(e) {
          console.log(`AFTER CREATE ERROR ${e.message}`);
        }

      }
    ));
  },

  /**
   * Promise to search a/an notification.
   *
   * @return {Promise}
   */

  search: async (params) => {
    // Convert `params` object to filters compatible with Mongo.
    const filters = strapi.utils.models.convertParams('notification', params);
    // Select field to populate.
    const populate = strapi.models.notification.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    const $or = Object.keys(strapi.models.notification.attributes).reduce((acc, curr) => {
      switch (strapi.models.notification.attributes[curr].type) {
        case 'integer':
        case 'float':
        case 'decimal':
          if (!_.isNaN(_.toNumber(params._q))) {
            return acc.concat({ [curr]: params._q });
          }

          return acc;
        case 'string':
        case 'text':
        case 'password':
          return acc.concat({ [curr]: { $regex: params._q, $options: 'i' } });
        case 'boolean':
          if (params._q === 'true' || params._q === 'false') {
            return acc.concat({ [curr]: params._q === 'true' });
          }

          return acc;
        default:
          return acc;
      }
    }, []);

    return strapi.models.notification
      .find({ $or })
      .sort(filters.sort)
      .skip(filters.start)
      .limit(filters.limit)
      .populate(populate);
  }
};
