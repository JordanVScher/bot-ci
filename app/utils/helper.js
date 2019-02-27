const Sentry = require('@sentry/node');
const dialogFlow = require('apiai-promise');

// Sentry - error reporting
Sentry.init({
  dsn: process.env.SENTRY_DSN, environment: process.env.ENV, captureUnhandledRejections: false,
});
module.exports.Sentry = Sentry;

// Dialogflow
module.exports.apiai = dialogFlow(process.env.DIALOGFLOW_TOKEN);

module.exports.waitTypingEffect = async (context, waitTime = 2500) => {
  await context.typingOn();
  setTimeout(async () => {
    await context.typingOff();
  }, waitTime);
};
