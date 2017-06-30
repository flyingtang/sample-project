'use strict';

const _ = require('lodash');

module.exports = function (app) {
  // init log levels
  require('logs').setLevel(app.get('logLevel') || 'info');
  // add logger to model
  _.forEach(app.models(), model => model.logger = app.logger.extend(model.modelName));
  app.logger.info('Server is running at "%s" environment', app.get('env'));
};
