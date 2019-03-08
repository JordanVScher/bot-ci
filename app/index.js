require('dotenv').config();

const { MessengerBot, FileSessionStore, withTyping } = require('bottender');
const { createServer } = require('bottender/restify');

const config = require('./bottender.config.js').messenger;
const { getPoliticianData } = require('./chatbot_api.js');

const mapPageToAccessToken = async (pageId) => {
  const perfilData = await getPoliticianData(pageId);
  let token = 0;
  if (perfilData && perfilData.fb_access_token && perfilData.fb_access_token.length > 0) {
    token = perfilData.fb_access_token;
  } else {
    token = process.env.ACCESS_TOKEN;
  }

  console.log(token);
  return token;
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

server.listen(process.env.API_PORT, async () => {
  // const { addNewUser } = require('./chatbot_api.js');
  // await addNewUser('teste homol', '123456', 'teste_local@mail.com');
  console.log(`Server is running on ${process.env.API_PORT} port...`);
  console.log(`App: ${process.env.APP} & Page: ${process.env.PAGE} - ${process.env.SHARE_LINK}`);
  console.log(`MA User: ${process.env.MA_USER}`);
});
