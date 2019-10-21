const Sentry = require('@sentry/node');

// Sentry - error reporting
Sentry.init({
  dsn: process.env.SENTRY_DSN, environment: process.env.ENV, captureUnhandledRejections: false,
});

async function waitTypingEffect(context, waitTime = 2500) {
  await context.typingOn();
  setTimeout(async () => {
    await context.typingOff();
  }, waitTime);
}

function sentryError(msg, err) {
  console.log(msg, err || '');
  if (process.env.ENV !== 'local') { Sentry.captureMessage(msg); }
  return false;
}

async function sendMsgFromAssistente(context, code, defaultMsgs) {
  try {
    const answers = context.state && context.state.politicianData && context.state.politicianData.answers ? context.state.politicianData.answers : false;
    let msgToSend;

    if (answers && answers.length > 0) {
      const currentMsg = answers.find(x => x.code === code);
      if (currentMsg && currentMsg.content) msgToSend = currentMsg.content;
    }

    if (msgToSend && msgToSend.length > 0) {
      await context.sendText(msgToSend);
    } else if (defaultMsgs && defaultMsgs.length > 0) {
      for (const msg of defaultMsgs) { // eslint-disable-line
        await context.sendText(msg);
      }
    }
  } catch (error) {
    sentryError('Erro em sendMsgFromAssistente', error);
  }
}

module.exports = {
  sentryError, sendMsgFromAssistente, waitTypingEffect, Sentry,
};
