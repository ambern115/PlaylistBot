// Configures the discord client
const Discord = require('discord.js');
const bot = new Discord.Client();
usr = "default";

// Log in with token from the bot portal
require('dotenv').config();
const BOTTOKEN = process.env.BOTTOKEN;
bot.login(BOTTOKEN);

// Creates a window for jquery to run in so we can use it here...
// Is this needed? Or can jquery just be referenced on the spotify login page?
var jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;
var $ = jQuery = require('jquery')(window);

const fs = require('fs');

// Used for making http request to trigger authorization for spotify login
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// Spotify Node.js web api - makes spotify request simpler
var SpotifyWebApi = require('spotify-web-api-node');
const SPOTIFYTOKEN = process.env.SPOTIFYTOKEN;
// Credentials
var credentials = {
  clientId: '178e7f8423524f08940326b8c2f2a48c',
  clientSecret: SPOTIFYTOKEN,
  redirectUri: 'http://localhost:8888/callback'
}
var spotifyApi = new SpotifyWebApi(credentials);

var user_id_ = '';       // ID of the user whose spotify account playlists will be added to
var user_name_ = '';     // Display name of the user who last logged in (that playlists will be added to)
var discord_id_ = '';
var access_token_ = '';  // Authroized access token needed to use spotify
var refresh_token_ = ''; // Authorized refresh token needed to use spotify

var callback_after_authorized = null;

var tracks_ = [];        // List of spotify track objects to be added to playlists
var channel_;            // Channel the last discord message was sent in
var playlist_channel_;   // Channel a !playlist request was made in
var playlist_call_id_;   // ID of the message that triggered the playlist function
var last_msg_id_;        // Used in playlist loop, last retrieved message id 
var end_of_messages_ = false  // Used to tell if we've reached the end of messages in a channel...
var last_msg_;           // Last message posted in any channel

let emojis = [];

// Runs when bot starts up
bot.on('ready', () => {
    usr = bot.user.tag;
    console.log('Logged in ' + usr);

    // Get all channel's emojis
    bot.emojis.cache.forEach(e => emojis.push(e.id));

    bot.user.setPresence({
      status: "online",
      activity: {
          name: "you cry",  //The message shown
          type: "LISTENING" //PLAYING: WATCHING: LISTENING: STREAMING:
      }
  });
});

// Runs everytime a new messge is posted to any channel
bot.on('message', msg => {
    // Set channel_ to the channel the last message was sent in
    channel_ = bot.channels.cache.get(msg.channel.id);
    last_msg_ = msg;

    //Bots decides to react to a message with an emoji or not (1% chance)
    var random_num = Math.floor(Math.random() * 100);
    console.log(random_num);
    if (random_num == 0) {
      console.log(random_num);
      last_msg_.react(emojis[Math.floor(Math.random() * emojis.length)]);
    }

    // Command to create a spotify playlist from songs in a specific channel
    if (msg.content === '!playlist') {
      playlist_channel_ = bot.channels.cache.get(msg.channel.id);
      playlist_call_id = msg.id;
      discord_id_ = msg.author.id;
      makeNewPlaylist();
    }
    
    if (msg.content.toUpperCase().includes("HENTAIBOT")) {

      msg.reply("OWO~ you called?!");
      //channel_.send("OWO~ you called?!");
    }

    if (msg.content === '!login') {
      httpGetAsync('http://localhost:8888/login', console.log);
    }

    if (msg.content === '!refresh') {
      msg.reply("Refreshing token!");
      refreshToken(console.log);
    }

    if (msg.content == '!randomsong') {
      discord_id_ = msg.author.id;
      getRandomSong();
    }
});

function getRandomSong() {
  if (hasAccess(getRandomSong)) {
    var random_offset = Math.floor(Math.random() * 999);
    var random_search = getRandomSearch();
    console.log(random_offset);

    var search_url = 'https://api.spotify.com/v1/search?' + 'q=' + random_search + '&type=track&limit=1&offset=' + random_offset;
  
    $.ajax({
      type: 'GET',
      url: search_url, 
      headers: {
        'Authorization': 'Bearer ' + access_token_
      },
      success: function(result) {
        console.log(result.tracks.items);
        console.log('Success!');
        channel_.send(result.tracks.items[0].external_urls.spotify)
      },
      error: function(r) {
        if (r.statusText === 'Unauthorized') {
          console.log("Access denied, refreshing access token");
          refreshToken(getRandomSong);
        } else {
          console.log(r)
          console.log('Error!');
        }
      }
    });
  }
}

// Returns a random search string 
function getRandomSearch() {
  // A list of all characters that can be chosen.
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  
  // Gets a random character from the characters string.
  const randomCharacter = characters.charAt(Math.floor(Math.random() * characters.length));
  let randomSearch = '';

  // Places the wildcard character at the beginning, or both beginning and end, randomly.
  switch (Math.round(Math.random())) {
    case 0:
      randomSearch = randomCharacter + '%20';
      break;
    case 1:
      randomSearch = '%20' + randomCharacter + '%20';
      break;
  }
  return randomSearch;
}

function makeNewPlaylist() {
  if (hasAccess(makeNewPlaylist)) {
    // Collect tracks and post to a new playlist
    collectTracks(playlist_channel_);
    channel_.send('Adding playlist to ' + user_name_ + "'s account. This may take a minute!");
  }
}

// Collects all songs from a given channel
function collectTracks(channel) {
  // Gets 100 messages at a time, the max you can get
  last_msg_id_ = playlist_call_id_;

  const request = async () => {
    while (end_of_messages_ == false) {
      await channel.messages.fetch({ limit: 100, before: last_msg_id_ })
      .then(
        messages => collectTracksCallback(messages),
        error => console.log(error))
      .catch(console.error);
    }
    
    let playlist_name = "PlaylistBot";
    if (channel.guild) {
      playlist_name = channel.guild.name + ': ' + channel.name;
    }
    // Checks if the signed in user already has a playlist with this name
    checkPlaylistName(user_id_, playlist_name, makePlaylist);
  }
  request();
}

// Collects all songs from a channel's messages, stores them in tracks_ array
function collectTracksCallback(messages) {
  console.log(`Message size is ${messages.size}`);

  var first_msg = true;

  for (let [key, msg] of messages) {
    last_msg_id_ = key;

    if (msg.content.includes("https://open.spotify.com/track/")) {
      song_uri = 'spotify:track:' + msg.content.split('https://open.spotify.com/track/').pop().split('?')[0];
      tracks_.push(song_uri);
    }
  }

  if (messages.size < 100) {
    console.log('TRACKS TRACKS');
    end_of_messages_ = true;
  }
}

// Check's if the signed in user already has a playlist with playlist_name
// and sends its ID over to createPlaylist in the callback.
// If the playlist does not exist, it sends a null id over to create a new playlist.
function checkPlaylistName(user_id, playlist_name, callback) {
  console.log('in check playlist name');
  // This is only checking 50 playlists. May need to add more here to 
  // have it check as many playlist that exist for a user???
  var url = 'https://api.spotify.com/v1/users/' +  user_id + '/playlists?limit=50';
  var playlist_id = '';
  $.ajax({
    type: 'GET',
    url: url,
    headers: {
      'Authorization': 'Bearer ' + access_token_
    },
    success: function(result) {
      console.log(result.items.length);
      for (i=0; i < result.items.length; i++) {
        if (result.items[i].name == playlist_name) {
          playlist_id = result.items[i].id;
        }
      }
      callback(user_id, playlist_name, playlist_id);
    }
  });
}

// Creates a spotify playlist
function makePlaylist(user_id, playlist_name, playlist_id) {
  var url = 'https://api.spotify.com/v1/users/' +  user_id + '/playlists';

  // If playlist already exists, just add songs to it
  if (playlist_id != '') {
    addTracks('https://open.spotify.com/playlist/' + playlist_id);
  } else {
    // Make new playlist
    $.ajax({
      type: 'POST',
      url: url,
      data: JSON.stringify({
        'name': playlist_name,
        'public': true
      }),
      dataType: 'json',
      headers: {
        'Authorization': 'Bearer ' + access_token_
      },
      contentType: 'application/json',
      success: function(result) {
        console.log('Playlist created!');
  
        // Now Add Songs to it
        playlist_url = result.external_urls.spotify;
        console.log(playlist_url);
  
        addTracks(playlist_url);
      },
      error: function(r) {
        console.log(r)
        console.log('Error making playlist!');
      }
    });
  }
}

function addTracks(playlist_url) {
  var playlist_id = '' + playlist_url.split('https://open.spotify.com/playlist/').slice(1);
  console.log(playlist_id);

  $.ajax({
    type: 'POST',
    url: 'https://api.spotify.com/v1/users/' + user_id_ + '/playlists/' + playlist_id + '/tracks', 
    dataType: 'json',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + access_token_
    },
    data: JSON.stringify({
      'uris': tracks_
    }),
    success: function(result) {
      playlist_channel_.send(playlist_url);
      console.log('Success!');
    },
    error: function(r) {
      console.log(r)
      console.log('Error!');
    }
  });
}


// BEGIN SPOTIFY AUTHORIZATION

// Makes a get request to the given URL 
// Used to automatically make a request to login and refresh token
function httpGetAsync(url, callback)
{
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() { 
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      callback(xmlHttp.responseText);
  }
  xmlHttp.open("GET", url, true); // true for asynchronous 
  xmlHttp.send();
}

/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '178e7f8423524f08940326b8c2f2a48c'; // Your client id
var client_secret = SPOTIFYTOKEN; // Your secret (remove before commits to github)
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var scopes = ['user-read-private', 'user-read-email', 'playlist-modify-public', 
              'playlist-read-collaborative', 'playlist-read-private', 
              'playlist-modify-private'];
var state = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {
  var stateKey = generateRandomString(16);
  res.cookie(state, stateKey);

  // application requests authorization
  var url = spotifyApi.createAuthorizeURL(scopes, state);

  // URL links to the autorization page
  last_msg_.author.send("I need spotify authorization!");
  last_msg_.author.send(url);
  console.log("URL SENT");
});

// callback after user has been authorized
app.get('/callback', function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter
  var code = req.query.code || null;
  // NOT CHECKING STATE, call comes right from discord
  res.clearCookie(state);

  spotifyApi.authorizationCodeGrant(code).then(
    function(data) {
      console.log('The token expires in ' + data.body['expires_in']);
      console.log('The access token is ' + data.body['access_token']);
      console.log('The refresh token is ' + data.body['refresh_token']);
  
      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);

      console.log('set refresh token');
      console.log(spotifyApi.getRefreshToken());

      var options = {
        url: 'https://api.spotify.com/v1/me',
        headers: { 'Authorization': 'Bearer ' + data.body['access_token'] },
        json: true
      };
      
      // Use the access token to access Spotify Web API info
      request.get(options, function(error, response, body) {
        // Save this info globally
        access_token_ = data.body['access_token'];
        refresh_token_ = data.body['refresh_token'];
        user_id_ = body.id;
        user_name_ = body.display_name;

        const updated_user = {
          "id": body.id,
          "discord_id": discord_id_,
          "name": body.display_name,
          "refresh_token": refresh_token_
        };
        fs.readFile('cache.json', 'utf-8', (error, data) => {
          if (error) { throw error; }

          users = JSON.parse(data).users;
          // Remove old user if they already exist in cache
          users = users.filter(user => {
            if (user.discord_id == discord_id_) {
              return false;
            }
            return true;
          });
          users.push(updated_user);
          let updated_cache = {
            "users": users
          };

          fs.writeFile('cache.json', JSON.stringify(updated_cache), (error) => {
            if (error) { throw error; }
            console.log("JSON data saved");
          });
        });

        if (callback_after_authorized) {
          callback_after_authorized();
          callback_after_authorized = null;
        }
      });

      // We can also pass the token to the browser to make requests from there
      // This redirects to the user info page
      res.redirect('/#' +
        querystring.stringify({
          access_token: data.body['access_token'],
          refresh_token: data.body['refresh_token']
        }));
    },
    function(err) {
      console.log('Something went wrong!', err);
    }
  )
});

app.get('/refresh_token', function(req, res) {
  // Requesting access token from refresh token
  // clientId, clientSecret and refreshToken has been set on the api object previous to this call.
  spotifyApi.refreshAccessToken().then(
    function(data) {
      console.log('The access token has been refreshed!');
      
      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
      access_token_ = data.body['access_token'];
      if (callback_after_authorized) {
        callback_after_authorized();
        callback_after_authorized = null;
      }
    },
    function(err) {
      console.log('Could not refresh access token', err);
    }
  );
});

// Check for spotify access
function hasAccess(callback) {
  if (access_token_ == '') {
    callback_after_authorized = callback;

    // Check cache for refresh token
    fs.readFile('cache.json', 'utf-8', (error, data) => {
      if (error) { throw error; }
      users = JSON.parse(data).users;
      users.forEach(user => {
        if (user.discord_id == discord_id_) {
          refresh_token_ = user.refresh_token;
          user_id_ = user.id;
          user_name_ = user.name;
          spotifyApi.setRefreshToken(refresh_token_);
          console.log('user found!');
        }
      });
      if (refresh_token_) {
        refreshToken();
      } else {
        httpGetAsync('http://localhost:8888/login', console.log);
        last_msg_.reply("You need to login to spotify! Login through the link I dmed you and try this command again.");   
      }
    });
    return false;
  }
  return true;
}

// Function to call within js that refreshes the access token when needed
function refreshToken() {
  httpGetAsync('http://localhost:8888/refresh_token', console.log);
}

console.log('Listening on 8888');
app.listen(8888);

// END SPOTIFY AUTHENTICATION

