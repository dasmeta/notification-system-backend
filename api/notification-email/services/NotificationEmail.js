'use strict';

/**
 * Notificationemail.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */


// Public dependencies.
const _ = require('lodash');
const moment = require('moment-timezone');
const mjml2html = require('mjml');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

const emailPattern = /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const isCorrectEmail = email => emailPattern.test(email);

const getFormattedData = (data, date, item) => {

  const format = (str, force = false) => {
    if (!str) {
      return null;
    }
    const l1 = _.get(data, str);
    if (l1) {
      if (_.isArray(l1)) {
        return l1.join(',');
      }
      return l1;
    }
    if (!str.includes('{{') && force) {
      return l1;
    }
    const compiled = _.template(str.replace(/{{/g, '<').replace(/}}/g, '>'), {
      imports: {
        _,
        moment: (...args) => moment.tz(...args, data.timezone || 'Asia/Yerevan')
      },
    });
    return compiled(data);
  };

  const nowDate = new Date();
  const cancel = !(item.enable && new Date(date) > new Date(new Date().setDate(nowDate.getDate() - 7)));
  const name = item.name;
  const from = format(item.from);
  const replyTo = format(item.replyTo);
  const to = isCorrectEmail(item.to) ? item.to : format(item.to, true);
  const cc = format(item.cc);
  const bcc = format(item.bcc);
  const subject = format(item.subject);
  const channel = item.channel;
  const bodyMjml = format(item.body);

  return {
    cancel,
    name,
    from,
    replyTo,
    to,
    cc,
    bcc,
    subject,
    channel,
    bodyMjml
  };
};

module.exports = {

  /**
   * Promise to fetch all Notificationemails.
   *
   * @return {Promise}
   */

  fetchAll: (partnerId, params, populate) => {
    const condition = { partnerId, ...params };
    if (condition.channel === 'e-mail') {
      condition.channel = { $in: ['e-mail', null, ''] };
    }
    const filters = convertRestQueryParams(condition);
    const populateOpt = populate || strapi.models.notificationemail.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias);

    return buildQuery({
      model: strapi.models.notificationemail,
      filters,
      populate: populateOpt,
    });
  },

  /**
  * Promise to fetch a/an Notificationemail.
  *
  * @return {Promise}
  */

  fetch: async (partnerId, params) => {
    if (params.id) {
      params._id = params.id;
    }

    // Select field to populate.
    const populate = strapi.models.notificationemail.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    const notification = await strapi.models.notificationemail
      .findOne(_.pick(params, _.keys(strapi.models.notificationemail.schema.paths)))
      .populate(populate);

    if (!partnerId || params.id) {
      return notification;
    }
    const { key, name, channel } = notification;
    const partnerNotification = (await strapi.models.notificationemail.findOne({ partnerId, key, name, channel })) || {};
    if (partnerNotification) {
      return { ...notification.toObject(), ...partnerNotification.toObject() };
    }
    return notification;
  },

  /**
   * Promise to count Notificationemails.
   *
   * @return {Promise}
   */

  count: (partnerId, params) => {
    const filters = convertRestQueryParams({ partnerId, ...params });
    filters.partnerId = '';
    return buildQuery({
      model: strapi.models.notificationemail,
      filters: { where: filters.where },
    })
      .count();
  },

  /**
   * Promise to edit a/an Notificationemail.
   *
   * @return {Promise}
   */

  save: async (ctxPartnerId, values) => {
    // Extract values related to relational data.
    const data = _.omit(values, strapi.models.notificationemail.associations.map(a => a.alias));
    // Update entry with no-relational data.
    const partnerId = data.partnerId || ctxPartnerId || '';
    const params = {
      key: data.key,
      // name: data.name,
    };

    if (data.channel === 'in-app') {
      params.channel = data.channel;
    } else {
      params.channel = { $in: ['e-mail', null, ''] };
    }

    data.partnerId = partnerId;
    params.partnerId = partnerId;

    return await strapi.models.notificationemail.updateOne(params, data, { multi: true, upsert: true });
  },

  /**
   * Promise.
   *
   * @return {Promise}
   */

  generate: async (notificationId, partnerId, key, date, data, uniqueKey, attachmentData) => {
    const mapping = {};
    const notificationsGeneral = await strapi.models.notificationemail.find({ key, partnerId: '' });
    notificationsGeneral.forEach(item => {
      mapping[`${item.key}${item.channel || ''}`] = item;
    });
    const notificationsByPartner = await strapi.models.notificationemail.find({ key, partnerId });
    notificationsByPartner.forEach(item => {
      mapping[`${item.key}${item.channel || ''}`] = item;
    });

    for (const item of Object.values(mapping)) {
      try {

        const {
          name,
          to,
          from,
          replyTo,
          cc,
          bcc,
          subject,
          cancel,
          channel,
          bodyMjml
        } = getFormattedData(data, date, item);

        if (!to) {
          continue;
        }

        const notificationData = {
          notificationId,
          partnerId,
          date: new Date(date),
          key,
          emails: to.split(',').map(s => s.trim()).filter(Boolean),
          uniqueKey,
          name,
          from,
          replyTo,
          to,
          cc,
          bcc,
          subject,
          cancel,
          channel,
          sent: false,
          read: false,
          history: [],
          data,
          attachmentData
        };

        switch (channel) {
          case 'in-app': {
            notificationData.body = bodyMjml;
            break;
          }
          default: {
            const { html: body } = mjml2html(bodyMjml);
            notificationData.body = body;
          }
        }

        await strapi.models.queueemail.create(notificationData);

      } catch (e) {
        console.error('partnerId', partnerId);
        console.error('key', key);
        console.error('name', item.name);
        console.error('QUEUE GENERATION ERROR', e.message);

        const notificationData = {
          notificationId,
          partnerId,
          date: new Date(date),
          key,
          emails: [],
          uniqueKey,
          name: item.name,
          from: 'error',
          replyTo: 'error',
          to: 'error',
          cc: 'error',
          bcc: 'error',
          subject: 'error',
          cancel: true,
          channel: item.channel,
          sent: false,
          read: false,
          history: [],
          data,
          attachmentData,
          body: 'error',
          cancelReason: e.message
        };
        await strapi.models.queueemail.create(notificationData);
      }
    }
  },

  /**
   * Promise to search a/an Notificationemail.
   *
   * @return {Promise}
   */

  search: async (params) => {
    // Convert `params` object to filters compatible with Mongo.
    const filters = strapi.utils.models.convertParams('Notificationemail', params);
    // Select field to populate.
    const populate = strapi.models.notificationemail.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    const $or = Object.keys(strapi.models.notificationemail.attributes).reduce((acc, curr) => {
      switch (strapi.models.notificationemail.attributes[curr].type) {
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

    return strapi.models.notificationemail
      .find({ $or })
      .sort(filters.sort)
      .skip(filters.start)
      .limit(filters.limit)
      .populate(populate);
  },

  getFormattedData: (data, date, email) => {
    return getFormattedData(data, date, email);
  }
};
