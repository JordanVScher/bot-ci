const dialogflow = require('dialogflow');
const MaAPI = require('../chatbot_api');
const { createIssue } = require('../send_issue');

/* Initialize DialogFlow agent */
/* set GOOGLE_APPLICATION_CREDENTIALS on .env */
const sessionClient = new dialogflow.SessionsClient();
const projectId = process.env.GOOGLE_PROJECT_ID;

/**
 * Send a text query to the dialogflow agent, and return the query result.
 * @param {string} text The text to be queried
 * @param {string} sessionId A unique identifier for the given session
 */
async function textRequestDF(text, sessionId) {
  const sessionPath = sessionClient.sessionPath(projectId, sessionId);
  const request = { session: sessionPath, queryInput: { text: { text, languageCode: 'pt-BR' } } };
  const responses = await sessionClient.detectIntent(request);
  return responses;
}

async function getExistingRes(res) {
  let result = null;
  res.forEach((e) => { if (e !== null && result === null) result = e; });
  return result;
}

/**
 * Build object with the entity name and it's values from the dialogflow response
 * @param {string} res result from dialogflow request
 */
async function getEntity(res) {
  const result = {};
  const entities = res[0] && res[0].queryResult && res[0].queryResult.parameters ? res[0].queryResult.parameters.fields : [];
  if (entities) {
    Object.keys(entities).forEach((e) => {
      const aux = [];
      if (entities[e] && entities[e].listValue && entities[e].listValue.values) {
        entities[e].listValue.values.forEach((name) => { aux.push(name.stringValue); });
      }
      result[e] = aux;
    });
  }

  return result || {};
}


// const dictionary = require('./utils/dictionary');

/*
    This file is in charge of answering free text messages, based on the "Pontos de vista" we have on both Dialoglow and MA
    In regular chatbots, we probably won't have another "types of theme", so there's one type 'posicionamento', so a lot of what was used in MA isn't necessary anymore
*/

async function sendAnswer(context) { // send answer from posicionamento
  // await context.setState({ currentTheme: await context.state.knowledge.knowledge_base.find(x => x.type === 'posicionamento') });
  await context.setState({ currentTheme: await context.state.knowledge.knowledge_base[0] });

  await MaAPI.setIntentStatus(context.state.politicianData.user_id, context.session.user.id, context.state.currentIntent, 1);
  await MaAPI.logAskedEntity(context.session.user.id, context.state.politicianData.user_id, context.state.currentTheme.entities[0].id);

  // console.log('currentTheme', currentTheme);
  if (context.state.currentTheme && (context.state.currentTheme.answer
        || (context.state.currentTheme.saved_attachment_type !== null && context.state.currentTheme.saved_attachment_id !== null))) {
    if (context.state.currentTheme.answer) { // if there's a text asnwer we send it
      await context.sendText(context.state.currentTheme.answer);
    }
    if (context.state.currentTheme.saved_attachment_type === 'image') { // if attachment is image
      await context.sendImage({ attachment_id: context.state.currentTheme.saved_attachment_id });
    }
    if (context.state.currentTheme.saved_attachment_type === 'video') { // if attachment is video
      await context.sendVideo({ attachment_id: context.state.currentTheme.saved_attachment_id });
    }
    if (context.state.currentTheme.saved_attachment_type === 'audio') { // if attachment is audio
      await context.sendAudio({ attachment_id: context.state.currentTheme.saved_attachment_id });
    }
    await context.typingOn();
    await context.setState({ dialog: 'mainMenu' });
  }
}
module.exports.sendAnswer = sendAnswer;


async function checkPosition(context) {
  await context.setState({ dialog: 'prompt' });
  switch (context.state.intentName) {
    // case 'Greetings': // add specific intents here
    // 	break;
    case 'Fallback': // didn't understand what was typed

      break;
    default: // default acts for every intent - position on MA
      // getting knowledge base. We send the complete answer from dialogflow
      await context.setState({
        knowledge: await MaAPI.getknowledgeBase(
          context.state.politicianData.user_id, await getExistingRes(context.state.apiaiResp), context.session.user.id,
        ),
      });
      console.log('knowledge', context.state.knowledge);

      // check if there's at least one answer in knowledge_base
      if (context.state.knowledge && context.state.knowledge.knowledge_base && context.state.knowledge.knowledge_base.length >= 1) {
        await sendAnswer(context);
      } else { // no answers in knowledge_base (We know the entity but politician doesn't have a position)
        await createIssue(context);
      }
      break;
  }
}


async function dialogFlow(context) {
  console.log(`\n${context.session.user.name} digitou ${context.event.message.text} - DF Status: ${context.state.politicianData.use_dialogflow}`);
  if (context.state.politicianData.use_dialogflow === 1) { // check if 'politician' is using dialogFlow
    await context.setState({ apiaiResp: await textRequestDF(await context.state.whatWasTyped, context.session.user.id) });
    await context.setState({ intentName: context.state.apiaiResp[0].queryResult.intent.displayName || '' }); // intent name
    await context.setState({ resultParameters: await getEntity(context.state.apiaiResp) }); // entities
    await context.setState({ apiaiTextAnswer: context.state.apiaiResp[0].queryResult.fulfillmentText || '' }); // response text
    await checkPosition(context);
  } else {
    await context.setState({ dialog: 'createIssueDirect' });
  }
}

module.exports = { checkPosition, dialogFlow };
