const MaAPI = require('../mandatoaberto_api');
const { createIssue } = require('../send_issue');
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
      await context.setState({ knowledge: await MaAPI.getknowledgeBase(context.state.politicianData.user_id, context.state.apiaiResp) });
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

module.exports.checkPosition = checkPosition;
