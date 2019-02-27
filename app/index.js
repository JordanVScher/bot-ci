require('dotenv').config();

const { MessengerBot, FileSessionStore, withTyping } = require('bottender');
const { createServer } = require('bottender/restify');

const config = require('./bottender.config.js').messenger;
const { getPoliticianData } = require('./mandatoaberto_api');

const mapPageToAccessToken = async (pageId) => {
  const perfilData = await getPoliticianData(pageId);
  return perfilData.fb_access_token;
};

const bot = new MessengerBot({
  mapPageToAccessToken,
  // accessToken: config.accessToken,
  appSecret: config.appSecret,
  verifyToken: config.verifyToken,
  sessionStore: new FileSessionStore(),
});

bot.setInitialState({});

const messageWaiting = eval(process.env.WITH_TYPING); // eslint-disable-line no-eval
if (messageWaiting) { bot.use(withTyping({ delay: messageWaiting })); }

const handler = require('./handler');

bot.onEvent(handler);

const server = createServer(bot, { verifyToken: config.verifyToken });

server.listen(process.env.API_PORT, () => {
  console.log(`Server is running on ${process.env.API_PORT} port...`);
  console.log(`App: ${process.env.APP} & Page: ${process.env.PAGE} - ${process.env.SHARE_LINK}`);
  console.log(`MA User: ${process.env.MA_USER}`);
});
