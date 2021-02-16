'use strict';


const Discord = require('discord.js');

const needle = require('needle');


const client = new Discord.Client();



const twitterBearer = "<REDACTED>"

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules'
const streamURL = 'https://api.twitter.com/2/tweets/search/stream';

// Edit rules as desired here below
const rules = [
  { 'value': 'from:BotDaft' }
];




Date.prototype.addDays = function(days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
}

Array.prototype.max = function() {
  return Math.max.apply(null, this);
};



client.on('ready', () => {
  //grab discord servers here
turnOn();
});




function turnOn (args) {
  twitterThing = twitterThingy()
  console.log('I am ready!');
}
// Create an event listener for messages

async function twitterThingy() {
  let currentRules;
  
    try {
      // (Spano's note: not running unneeded rule stuff seems to help. Twitter remembers whatever rule you set it to be before.)

      // Gets the complete list of rules currently applied to the stream
      //currentRules = await getAllRules();
      //console.log(currentRules)

      // Delete all rules. Comment the line below if you want to keep your existing rules.
      //await deleteAllRules(currentRules);
  
      // Add rules to the stream. Comment the line below if you don't want to add new rules.
      //await setRules();
      
    } catch (e) {
      console.error(e);
      process.exit(-1);
    }
  
    // Listen to the stream.
    // This reconnection logic will attempt to reconnect when a disconnection is detected.
    // To avoid rate limites, this logic implements exponential backoff, so the wait time
    // will increase if the client cannot reconnect to the stream.
  
    const filteredStream = streamConnect()
    let timeout = 0;
    filteredStream.on('timeout', () => {
      // Reconnect on error
      console.log('A Twitter connection error occurred. Reconnecting…'); //Haven't seen this happen yet
      setTimeout(() => {
        timeout++;
        console.log("Pre-streamConnect1")
        streamConnect(twitterBearer);
      }, 2 ** timeout);
      console.log("Pre-streamConnect2")
      streamConnect(twitterBearer);
    })
}






async function getAllRules() {

  const response = await needle('get', rulesURL, { headers: {
      "authorization": `Bearer ${twitterBearer}`
  }})

  if (response.statusCode !== 200) {
      throw new Error(response.body);
      return null;
  }

  return (response.body);
}

async function deleteAllRules(rules) {

  if (!Array.isArray(rules.data)) {
      return null;
    }

  const ids = rules.data.map(rule => rule.id);

  const data = {
      "delete": {
          "ids": ids
      }
  }

  const response = await needle('post', rulesURL, data, {headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${twitterBearer}`
  }}) 

  if (response.statusCode !== 200) {
      throw new Error(response.body);
      return null;
  }
  
  return (response.body);

}

async function setRules() {

  const data = {
      "add": rules
    }

  const response = await needle('post', rulesURL, data, {headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${twitterBearer}`
  }}) 

  if (response.statusCode !== 201) {
      throw new Error(response.body);
      return null;
  }
  
  return (response.body);

}

function streamConnect() {
  console.log("Starting streamConnect")
  //Listen to the stream
  const options = {
      timeout: 20000
    }
    console.log("getting stream")
  const stream = needle.get(streamURL, {
    headers: { 
        Authorization: `Bearer ${twitterBearer}`
    }
}, (...a) => console.log(a)); //options used to be a third param

  stream.on('data', data => {
    //console.log("Attempting stream.on data try")
    try {
      //console.log("Parsing json")
        const json = JSON.parse(data);
        //var timesta = Date.now()
        console.log("twitter_to_hackmud " + getLondonTime(new Date()))
        console.log(json);
        var daft_message = json.data.text
        console.log(daft_message);
    } catch (e) {
    console.log("Twitter Keep alive signal " + getLondonTime(new Date()))
      // Keep alive signal received. Do nothing.
  }
  }).on('error', error => {
    console.log(".on error?")
      if (error.code === 'ETIMEDOUT') {
        console.log("timeout") //Haven't seen this happen yet
          stream.emit('timeout');
      }
      if (error.code === 'ECONNRESET') {
        console.log("connreset") //This never gets triggered
          stream.emit('timeout');
      }
  });

  stream.on('close', close => {
    console.log('***stream closed!***') //Haven't seen this happen yet
  });

  stream.on('error', zeerror => {
    console.log('***stream errored!***') //Haven't seen this happen yet
  });
  console.log("returning stream")
  return stream;
  
}






/* Return a Date for the last Sunday in a month
** @param {number} year - full year number (e.g. 2015)
** @param {number} month - calendar month number (jan=1)
** @returns {Date} date for last Sunday in given month
*/
function getLastSunday(year, month) {
  // Create date for last day in month
  var d = new Date(year, month, 0);
  // Adjust to previous Sunday
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/* Format a date string as ISO 8601 with supplied offset
** @param {Date} date - date to format
** @param {number} offset - offset in minutes (+east, -west), will be
**                          converted to +/-00:00
** @returns {string} formatted date and time
**
** Note that javascript Date offsets are opposite: -east, +west but 
** this function doesn't use the Date's offset.
*/
function formatDate(d, offset) {
  function z(n){return ('0'+n).slice(-2)}
  // Default offset to 0
  offset = offset || 0;
  // Generate offset string
  var offSign = offset < 0? '-' : '+';
  offset = Math.abs(offset);
  var offString = offSign + ('0'+(offset/60|0)).slice(-2) + ':' + ('0'+(offset%60)).slice(-2);
  // Generate date string
  /*return d.getUTCFullYear() + '-' + z(d.getUTCMonth()+1) + '-' + z(d.getUTCDate()) +
         'T' + z(d.getUTCHours()) + ':' + z(d.getUTCMinutes()) + ':' + z(d.getUTCSeconds()) +
         offString;*/
  
  return z(d.getUTCHours()) + ':' + z(d.getUTCMinutes()) + ':' + z(d.getUTCSeconds());
}

/* Return Date object for current time in London. Assumes
** daylight saving starts at 01:00 UTC on last Sunday in March
** and ends at 01:00 UTC on the last Sunday in October.
** @param {Date} d - date to test. Default to current
**                   system date and time
** @param {boolean, optional} obj - if true, return a Date object. Otherwise, return
**                        an ISO 8601 formatted string
*/
function getLondonTime(d, obj) {
  // Use provided date or default to current date and time
  d = d || new Date();

  // Get start and end dates for daylight saving for supplied date's year
  // Set UTC date values and time to 01:00
  var dstS = getLastSunday(d.getFullYear(), 3);
  var dstE = getLastSunday(d.getFullYear(), 10);
  dstS = new Date(Date.UTC(dstS.getFullYear(), dstS.getMonth(), dstS.getDate(),1));
  dstE = new Date(Date.UTC(dstE.getFullYear(), dstE.getMonth(), dstE.getDate(),1));
  // If date is between dstStart and dstEnd, add 1 hour to UTC time
  // and format using +60 offset
  if (d > dstS && d < dstE) {
    d.setUTCHours(d.getUTCHours() +1);
    return formatDate(d, 60);
  }
  // Otherwise, don't adjust and format with 00 offset
  return obj? d : formatDate(d);
}





// Log our bot in using the token from https://discordapp.com/developers/applications/me
client.login("<REDACTED>");