"use strict";

/**
 * Queueemail.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

// Public dependencies.
const _ = require("lodash");
const { convertRestQueryParams, buildQuery } = require("strapi-utils");
const nodemailer = require("nodemailer");
const mg = require("nodemailer-mailgun-transport");
const axios = require("axios");
const ics = require("ics");
const uuid = require("uuid/v4");
const htmlToText = require("html-to-text");
const QRCode = require("qrcode");

const mailgunApiHosts = {
  EU: "api.eu.mailgun.net",
  US: "api.mailgun.net",
};

const mailgunDomainSettings = JSON.parse(process.env.MAILGUN_DOMAIN_SETTINGS);

const cachedNodemailerTransports = {};

const nodemailerMailgunTransport = (from) => {
  const domainSetting = mailgunDomainSettings.find(
    (settingItem) => {
      const regexp = new RegExp(settingItem.fromMatchRegex);
      return regexp.test('mg.course.rm') || domainSetting.isDefault;
    }
  );

  if (!cachedNodemailerTransports[domainSetting.domain]) {
    const auth = {
      auth: {
        api_key: process.env.MAILGUN_API_KEY,
        domain: domainSetting.domain,
      },
      host: domainSetting.host,
    };

    cachedNodemailerTransports[
      domainSetting.domain
    ] = nodemailer.createTransport(mg(auth));
  }

  return cachedNodemailerTransports[domainSetting.domain];
};

const sendMail = async (params) => {
  if (process.env.FORWARD_TO === "false") {
    return { message: "Skipped" };
  }

  return await nodemailerMailgunTransport(params.from).sendMail({
    ...params,
    to: process.env.FORWARD_TO || params.to,
    cc: process.env.FORWARD_TO || params.cc,
    bcc: process.env.FORWARD_TO || params.bcc,
  });
};

const sendInAppMessage = async (value) => {
  const options = {
    headers: JSON.parse(process.env.IN_APP_MESSAGE_API_HEADERS),
  };

  return await axios.post(
    process.env.BACKEND_URL,
    value,
    options
  );
};

const createCalendarEvent = (data) =>
  new Promise((resolve, reject) => {
    ics.createEvent(data, (error, value) => {
      if (error) {
        reject(error);
      }
      resolve(value);
    });
  });

const getAttachments = async (attachments) => {
  const result = { attachments: [] };
  for (const type of Object.keys(attachments)) {
    if (_.isEmpty(attachments[type])) {
      continue;
    }
    switch (type) {
      case "calendar": {
        const icalData = await createCalendarEvent(attachments[type]);
        result.icalEvent = {
          method: "request",
          content: icalData,
        };
      }
      case "fileList": {
        for (const item of attachments[type]) {
          const file = await axios({
            url: item.src,
            method: "GET",
            responseType: "stream", // Important
          });

          result.attachments.push({
            filename: item.filename,
            content: file.data,
          });
        }
        break;
      }
      case "file": {
        const file = await axios({
          url: attachments[type].src,
          method: "GET",
          responseType: "stream", // Important
        });

        result.attachments.push({
          filename: attachments[type].filename,
          content: file.data,
        });
        break;
      }
      case "qr": {
        const content = await QRCode.toDataURL(attachments[type].url);
        result.attachments.push({
          filename: `${attachments[type].filename}.png`,
          path: content
        });
        break;
      }
    }
  }

  if (_.isEmpty(result.attachments)) {
    delete result.attachments;
  }

  return result;
};

module.exports = {
  /**
   * Promise to count Queueemails.
   *
   * @return {Promise}
   */

  count: (partnerId, params) => {
    const filters = convertRestQueryParams({ partnerId, ...params });

    return buildQuery({
      model: strapi.models.queueemail,
      filters: { where: filters.where },
    }).count();
  },

  /**
   * Promise to fetch all Queueemails.
   *
   * @return {Promise}
   */

  fetchAll: (partnerId, params, populate) => {
    const condition = { partnerId, ...params };
    if (condition.channel === "e-mail") {
      condition.channel = { $in: ["e-mail", null, ""] };
    }
    const filters = convertRestQueryParams(condition);
    const populateOpt =
      populate ||
      strapi.models.queueemail.associations
        .filter((ast) => ast.autoPopulate !== false)
        .map((ast) => ast.alias);

    return buildQuery({
      model: strapi.models.queueemail,
      filters,
      populate: populateOpt,
    });
  },

  cancelQueueEmail: async (params) => {
    const { key, email, date, uniqueKey = null, remove = 'false' } = params;

    if (!key || (!uniqueKey && !email)) {
      return;
    }

    const nowDate = new Date();
    const condition = {
      key,
      cancel: false,
      sent: false,
      date: {
        $gte: new Date(nowDate.setMonth(nowDate.getMonth() - 2)),
      },
    };

    if (uniqueKey) {
      condition.uniqueKey = uniqueKey;
    }
    if (email) {
      condition.emails = email;
    }
    if (date) {
      condition.date = { $gte: new Date(date) };
    }

    if(remove && remove === 'true') {
      const { cancel, ...removeCondition } = condition;
      return await strapi.models.queueemail.deleteMany(removeCondition);
    } else {
      return await strapi.models.queueemail.updateMany(condition, {
        $set: { cancel: true },
      });
    }
  },

  cleanup: async (params) => {
    const { key, date } = params;

    const nowDate = new Date();
    const condition = {
      cancel: true,
      sent: false,
      date: {
        $gte: new Date(nowDate.setMonth(nowDate.getMonth() - 2)),
      },
    };

    if (key) {
      condition.key = key;
    }

    if (date) {
      condition.date = { $gte: new Date(date) };
    }

    return await strapi.models.queueemail.deleteMany(condition);
  },

  /**
   * Promise to search a/an Queueemail.
   *
   * @return {Promise}
   */

  search: async (params) => {
    // Convert `params` object to filters compatible with Mongo.
    const filters = strapi.utils.models.convertParams("Queueemail", params);
    // Select field to populate.
    const populate = strapi.models.queueemail.associations
      .filter((ast) => ast.autoPopulate !== false)
      .map((ast) => ast.alias)
      .join(" ");

    const $or = Object.keys(strapi.models.queueemail.attributes).reduce(
      (acc, curr) => {
        switch (strapi.models.queueemail.attributes[curr].type) {
          case "integer":
          case "float":
          case "decimal":
            if (!_.isNaN(_.toNumber(params._q))) {
              return acc.concat({ [curr]: params._q });
            }

            return acc;
          case "string":
          case "text":
          case "password":
            return acc.concat({ [curr]: { $regex: params._q, $options: "i" } });
          case "boolean":
            if (params._q === "true" || params._q === "false") {
              return acc.concat({ [curr]: params._q === "true" });
            }

            return acc;
          default:
            return acc;
        }
      },
      []
    );

    return strapi.models.queueemail
      .find({ $or })
      .sort(filters.sort)
      .skip(filters.start)
      .limit(filters.limit)
      .populate(populate);
  },

  /**
   * Promise.
   *
   * @return {Promise}
   */
  read: async (params, userAgent) => {
    const item = await strapi.models.queueemail.findOne({ _id: params.id });
    if (!item) {
      return;
    }
    const { history } = item;
    const read = true;
    history.push({
      action: "Read",
      date: new Date(),
      userAgent,
    });
    await strapi.models.queueemail.updateOne(
      { _id: item._id },
      { $set: { read, history } }
    );
  },

  /**
   * Promise.
   *
   * @return {Promise}
   */
  process: async () => {
    const processingId = uuid();
    const list = await strapi.models.queueemail
      .find({
        cancel: false,
        sent: false,
        processing: { $in: [false, null] },
        date: { $lte: new Date() },
      })
      .limit(50);
    console.log(
      `start processing ${
        list.length
      } queue emails cronJobId =${processingId} start at ${new Date()}`
    );
    const base = process.env.BASE_URL;

    const idList = list.map((item) => item._id);
    //todo if become problem delete
    await strapi.models.queueemail.updateMany(
      { _id: { $in: idList } },
      { $set: { processing: true } }
    );

    let successCount = 0;
    let failedCount = 0;

    for (const item of list) {
      if (!item.to || item.to.includes("@contactid")) {
        continue;
      }

      const result = {
        sent: false,
        history: item.history || [],
      };

      result.history.push({
        action: "Start Processing",
        date: new Date(),
        cronJobId: processingId,
      });

      const track = `<img src="${base}/read/${item.id}" alt="." style="width: 1px; height: 1px;">`;
      try {
        const messageBody = {
          from: item.from,
          replyTo: item.replyTo,
          to: item.to,
          cc: item.cc,
          bcc: item.bcc,
          subject: item.subject,
        };

        switch (item.channel) {
          case "in-app": {
            messageBody.text = item.body;
            const res = await sendInAppMessage(messageBody);
            result.sent = res.status === 200;
            result.history.push({
              action: "Send Message",
              date: new Date(),
              cronJobId: processingId,
            });

            break;
          }
          default: {
            messageBody.html = item.body + track;
            messageBody.text = htmlToText.fromString(item.body, {
              wordwrap: 130,
            });

            const attachments = await getAttachments(item.attachmentData);

            const res = await sendMail({ ...messageBody, ...attachments });

            result.sent = true;
            result.history.push({
              action: "Send Mail",
              date: new Date(),
              result: res,
              cronJobId: processingId,
            });
          }
        }
        await strapi.models.queueemail.updateOne(
          { _id: item._id },
          { $set: { ...result, processing: false } }
        );
        successCount++;
        console.log(
          `mail=${item._id}, email=${item.to}, key=${
            item.key
          }, cronJobId=${processingId} end ok at ${new Date()}`
        );
      } catch (err) {
        console.log(err, "> err");
        result.history.push({
          action: "Send Fail",
          date: new Date(),
          error: _.get(err, "response.data.message", err.message),
          cronJobId: processingId,
        });
        await strapi.models.queueemail.updateOne(
          { _id: item._id },
          { $set: { cancel: true, ...result, processing: false } }
        );
        failedCount++;
        console.log(
          `mail=${item._id}, email=${item.to}, key=${
            item.key
          }, cronJobId=${processingId} end with error at ${new Date()}`
        );
      }
    }
    console.log(
      `end processing ${
        list.length
      } success=${successCount} failed=${failedCount} queue emails cronJobId=${processingId} start at ${new Date()}`
    );
  },

  reprocess: async (params) => {
    const { id, history } = params;

    if (!id) {
      return;
    }

    const queueEmail = await strapi.models.queueemail.findOne({ _id: id });
    let notificationEmail = await strapi.models.notificationemail.findOne({
      key: queueEmail.key,
      channel: queueEmail.channel,
      partnerId: queueEmail.partnerId,
    });
    if (!notificationEmail) {
      notificationEmail = await strapi.models.notificationemail.findOne({
        key: queueEmail.key,
        channel: queueEmail.channel,
        partnerId: "",
      });
    }

    if (!notificationEmail) {
      return;
    }

    const emailHistory = queueEmail.history || [];
    emailHistory.push(history);

    try {
      const {
        from,
        replyTo,
        to,
        cc,
        bcc,
        subject,
        bodyMjml,
      } = strapi.services.notificationemail.getFormattedData(
        queueEmail.data,
        null,
        notificationEmail
      );

      const data = {
        history: emailHistory,
        cancelReason: null,
        from,
        to,
        replyTo,
        cc,
        bcc,
        subject,
        body: bodyMjml,
        cancel: false,
      };

      return await strapi.models.queueemail.updateOne(
        { _id: id },
        { $set: data }
      );
    } catch (e) {
      console.error("partnerId", notificationEmail.partnerId);
      console.error("key", notificationEmail.key);
      console.error("name", notificationEmail.name);
      console.error("QUEUE REPROCESS ERROR", e.message);

      return await strapi.models.queueemail.updateOne(
        { _id: id },
        { $set: { cancelReason: e.message, history: emailHistory } }
      );
    }
  },
};
