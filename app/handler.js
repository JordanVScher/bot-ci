const MaAPI = require('./mandatoaberto_api');
// const opt = require('./util/options');
const { createIssue } = require('./send_issue');
const { checkPosition } = require('./utils/dialogFlow');
const { apiai } = require('./utils/helper');
const flow = require('./utils/flow');
const help = require('./utils/helper');

module.exports = async (context) => {
  try {
    // console.log(await MaAPI.getLogAction()); // print possible log actions
    if (!context.state.dialog || context.state.dialog === '' || (context.event.postback && context.event.postback.payload === 'greetings')) { // because of the message that comes from the comment private-reply
      await context.resetState(); await context.setState({ dialog: 'greetings' });
    }
    // let user = await getUser(context)
    // we reload politicianData on every useful event
    await context.setState({ politicianData: await MaAPI.getPoliticianData(context.event.rawEvent.recipient.id) });
    // we update context data at every interaction that's not a comment or a post
    await MaAPI.postRecipient(context.state.politicianData.user_id, {
      fb_id: context.session.user.id,
      name: `${context.session.user.first_name} ${context.session.user.last_name}`,
      origin_dialog: 'greetings',
      picture: context.session.user.profile_pic,
      // session: JSON.stringify(context.state),
    });
    if (context.event.isPostback) {
      await context.setState({ lastPBpayload: context.event.postback.payload });
      await context.setState({ dialog: context.state.lastPBpayload });
      await MaAPI.logFlowChange(context.session.user.id, context.state.politicianData.user_id,
        context.event.postback.payload, context.event.postback.title);
    } else if (context.event.isQuickReply) {
      await context.setState({ lastQRpayload: context.event.quickReply.payload });
      await context.setState({ dialog: context.state.lastQRpayload });
      await MaAPI.logFlowChange(context.session.user.id, context.state.politicianData.user_id,
        context.event.message.quick_reply.payload, context.event.message.quick_reply.payload);
    } else if (context.event.isText) {
      await context.setState({ whatWasTyped: context.event.message.text });
      if (context.state.politicianData.use_dialogflow === 1) { // check if 'politician' is using dialogFlow
        if (context.state.whatWasTyped.length <= 255) { // check if message is short enough for apiai
          await context.setState({ toSend: context.state.whatWasTyped });
        } else { // cutting chars
          await context.setState({ toSend: context.state.whatWasTyped.slice(0, 255) });
        }
        await context.setState({ apiaiResp: await apiai.textRequest(context.state.toSend, { sessionId: context.session.user.id }) });
        await context.setState({ resultParameters: context.state.apiaiResp.result.parameters }); // getting the entities
        await context.setState({ intentName: context.state.apiaiResp.result.metadata.intentName }); // getting the intent
        await checkPosition(context);
      } else { // not using dialogFlow
        await context.setState({ dialog: 'createIssueDirect' });
      }
      // await createIssue(context, 'Não entendi sua mensagem pois ela é muito complexa. Você pode escrever novamente, de forma mais direta?');
    }
    switch (context.state.dialog) {
      case 'greetings':
        await context.sendText(flow.greetings.text1);
        break;
      case 'mainMenu':
        await context.sendText(flow.mainMenu.text1);
        break;
      case 'createIssueDirect':
        await createIssue(context);
        break;
    } // end switch case
  } catch (error) {
    const date = new Date();
    console.log(`Parece que aconteceu um erro as ${date.toLocaleTimeString('pt-BR')} de ${date.getDate()}/${date.getMonth() + 1} =>`);
    console.log(error);
    await context.sendText('Ops. Tive um erro interno. Tente novamente.'); // warning user

    await help.Sentry.configureScope(async (scope) => { // sending to sentry
      scope.setUser({ username: context.session.user.first_name });
      scope.setExtra('state', context.state);
      throw error;
    });
  } // catch
}; // handler function
