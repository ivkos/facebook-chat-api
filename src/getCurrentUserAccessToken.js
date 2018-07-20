"use strict";

const bluebird = require("bluebird");
const utils = require("../utils");

module.exports = function(defaultFuncs, api, ctx) {
  function findToken(str) {
    const matches = str.match(/access_token:"(.+?)"/);
    if (matches === null) return undefined;
    return matches[1];
  }

  function parseToken(data) {
    return bluebird.try(() => {
      if (data.statusCode !== 200)
        throw new Error("parseToken got status code: " + data.statusCode);

      let token = findToken(data.body);
      if (token !== undefined) return token;

      let res;
      try {
        res = JSON.parse(utils.makeParsable(data.body));
      } catch (e) {
        throw {
          error:
            "JSON.parse error while looking for access_token. Check the `detail` property on this error.",
          detail: e,
          res: data.body
        };
      }

      if (res.redirect) {
        return defaultFuncs.get(res.redirect, ctx.jar).then(parseToken);
      }

      token = findToken(data.body);
      if (token !== undefined) return token;

      throw { error: "Could not find access_token in response" };
    });
  }

  return function getCurrentUserAccessToken(callback) {
    if (!callback) {
      throw { error: "getCurrentUserAccessToken: need callback" };
    }

    defaultFuncs
      .get("https://www.facebook.com/profile.php", ctx.jar, { id: ctx.userID })
      .then(parseToken)
      .then(token => callback(null, token))
      .catch(err => callback(err));
  };
};
