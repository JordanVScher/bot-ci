const accents = require('remove-accents');
const MaAPI = require('./mandatoaberto_api');
const { issueText } = require('./utils/flow');

const blacklist = ['sim', 'nao'];

async function formatString(text) {
  let result = text.toLowerCase();
  result = await result.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2580-\u27BF]|\uD83E[\uDD10-\uDDFF])/g, '');
  result = await result.replace(/´|~|\^|`|'|0|1|2|3|4|5|6|7|8|9|/g, '');
  result = await accents.remove(result);
  return result.trim();
}
module.exports.formatString = formatString;

// check if we should create an issue with that text message.If it returns true, we send the appropriate message.
async function createIssue(context) {
  // check if text is not empty and not on the blacklist
  const cleanString = await formatString(context.state.whatWasTyped);
  if (cleanString && cleanString.length > 0 && !blacklist.includes(cleanString)) {
    const issueResponse = await MaAPI.postIssue(context.state.politicianData.user_id, context.session.user.id, context.state.whatWasTyped,
      context.state.resultParameters ? context.state.resultParameters : {}, context.state.politicianData.issue_active);

    if (issueResponse && issueResponse.id) {
      await context.sendText(issueText.success);
      return true;
    }
  }
  await context.sendText(issueText.failure);
  return false;
}
module.exports.createIssue = createIssue;
