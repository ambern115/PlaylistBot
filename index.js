// Creates a window for jquery to run in?
var jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

var $ = jQuery = require('jquery')(window);

// Used for making http request to trigger authorization for spotify login
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// Configures the discord client 
const Discord = require('discord.js');
const client = new Discord.Client();
usr = "default";

var user_id_ = '';       // Id of the user whose spotify account playlists will be added to
var access_token_ = '';  // Authroized access token needed to use spotify
var tracks_ = [];        // List of spotify track objects to be added to playlists
var channel_;            // Channel the last discord message was sent in
var playlist_channel_;   // Channel a !playlist request was made in
var playlist_call_id_;   // Message id of the message that triggered the playlist function
var last_msg_id_;        // Used in playlist loop, last retrieved message id 
var end_of_messages_ = false  // Used to tell if we've reached the end of messages in a channel...

var last_msg_;           // Last message posted in any channel
var playlist_url_;

// Runs when bot starts up
client.on('ready', () => {
    usr = client.user.tag;
    console.log('Logged in ' + usr);
});

// Runs everytime a new messge is posted to any channel
client.on('message', msg => {
    // Set channel_ to the channel the last message was sent in
    channel_ = client.channels.cache.get(msg.channel.id);
    last_msg_ = msg;

    // Command to create a spotify playlist from songs in a specific channel
    if (msg.content === '!playlist') {
        playlist_channel_ = client.channels.cache.get(msg.channel.id);
        playlist_call_id = msg.id;
        makeNewPlaylist();
    }

    if (msg.content.toUpperCase().includes("HENTAIBOT")) {
      //msg.reply("OWO ~");
      channel_.send("OWO~ you called?!");
    }
});

// Logs in with token from the bot portal
client.login(''); // REMOVE BEFORE GITHUB COMMITS


function makeNewPlaylist() {
  if (access_token_ != '') {
    // Collect tracks and post to a new playlist
    collectTracks(playlist_channel_);
  } else {
    // Gain spotify access
    httpGetAsync('http://localhost:8888/login', console.log);
  }
}

// Collects all songs from a given channel
function collectTracks(local_channel) {
  // Get 100 messages at a time...

  last_msg_id_ = playlist_call_id_;

  const request = async () => {
   while (end_of_messages_ == false) {
      await local_channel.messages.fetch({ limit: 100, before: last_msg_id_ })
      .then(
        messages => collectTracksCallback(messages),
        error => console.log(error))
      .catch(console.error);
   }
   makePlaylist(user_id_, "Test Playlist!", access_token_, console.log);
  }

  request();
}


// Collects all songs from a channel's messages, stores them in tracks_
function collectTracksCallback(messages) {
  console.log(`Message size is ${messages.size}`);

  var first_msg = true;

  for (let [key, msg] of messages) {
    console.log(key + " " + msg.content);
    

    last_msg_id_ = key;

    if (msg.content.includes("https://open.spotify.com/track/")) {
      song_uri = 'spotify:track:' + msg.content.split('https://open.spotify.com/track/').pop().split('?')[0];

      tracks_.push(song_uri);
    }
  }

  if (messages.size < 100) {
    console.log('TRACKS TRACKS');
    console.log(tracks_);
    end_of_messages_ = true;
  }

  console.log("NEW MESSAGE ID");
  console.log(last_msg_id_);
}


// Creates a spotify playlist
function makePlaylist(user_id, playlist_name, access_token, callback) {
  var url = 'https://api.spotify.com/v1/users/' +  user_id + '/playlists';

  console.log("IN PLAYLIST")

  var playlist_url = '';

  $.ajax({
    type: 'POST',
    url: url,
    data: JSON.stringify({
      'name': playlist_name,
      'public': true
    }),
    dataType: 'json',
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    contentType: 'application/json',
    success: function(result) {
      console.log('Playlist created!');

      // Now Add Songs to it

      playlist_url = result.external_urls.spotify;
      console.log(playlist_url);

      playlist_url_ = result.external_urls.spotify;

      addTracks(playlist_url_);
    },
    error: function(r) {
      console.log(r)
      console.log('Error!');
    }
  });



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

// Makes a get request the given URL 
// Used to automatically make a request to login
function httpGetAsync(url, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", url, true); // true for asynchronous 
    xmlHttp.send(null);
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
var client_secret = ''; // Your secret (remove before commits to github)
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

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-modify-public playlist-read-collaborative playlist-read-private playlist-modify-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));

  var url = 'https://accounts.spotify.com/authorize?' +
  querystring.stringify({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state
  });

  //console.log(url);
  // URL links to the autorization page
  last_msg_.author.send("I need authorization to make a playlist!");
  last_msg_.author.send(url);
  console.log("URL SENT");
});


app.get('/callback', function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  // NOT CHECKING STATE, CALL COMES RIGHT FROM DISCORD
  // if (state === null || state !== storedState) {
  //   res.redirect('/#' +
  //     querystring.stringify({
  //       error: 'state_mismatch'
  //     }));
  // } else {
  res.clearCookie(stateKey);
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {

    if ((!error) && response.statusCode === 200) {
      var access_token = body.access_token,
          refresh_token = body.refresh_token;

      var options = {
        url: 'https://api.spotify.com/v1/me',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };
      console.log("inside of post I guess");
      // use the access token to access the Spotify Web API
      request.get(options, function(error, response, body) {
        // Save this info so authorization not required every time
        access_token_ = access_token;
        user_id_ = body.id;

        // NOW collect tracks and post them to a playlist
        makeNewPlaylist();
      });

      // we can also pass the token to the browser to make requests from there
      res.redirect('/#' +
        querystring.stringify({
          access_token: access_token,
          refresh_token: refresh_token
        }));
    } else {
      res.redirect('/#' +
        querystring.stringify({
          error: 'invalid_token'
        }));
    }
  });
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(8888);

// END SPOTIFY AUTHENTICATION






// // NOT MY CODE
// var g_access_token = '';
// var g_username = '';
// var g_tracks = [];


// function getUsername(callback) {
// 	console.log('getUsername');
// 	var url = 'https://api.spotify.com/v1/me';
// 	$.ajax(url, {
// 		dataType: 'json',
// 		headers: {
// 			'Authorization': 'Bearer ' + g_access_token
// 		},
// 		success: function(r) {
// 			console.log('got username response', r);
// 			callback(r.id);
// 		},
// 		error: function(r) {
// 			callback(null);
// 		}
// 	});
// }

// function createPlaylist(username, name, callback) {
// 	console.log('createPlaylist', username, name);
// 	var url = 'https://api.spotify.com/v1/users/' + username +
// 		'/playlists';
// 	$.ajax(url, {
// 		method: 'POST',
// 		data: JSON.stringify({
// 			'name': name,
// 			'public': false
// 		}),
// 		dataType: 'json',
// 		headers: {
// 			'Authorization': 'Bearer ' + g_access_token,
// 			'Content-Type': 'application/json'
// 		},
// 		success: function(r) {
// 			console.log('create playlist response', r);
// 			callback(r.id);
// 		},
// 		error: function(r) {
// 			callback(null);
// 		}
// 	});
// }

// function addTracksToPlaylist(username, playlist, tracks, callback) {
// 	console.log('addTracksToPlaylist', username, playlist, tracks);
// 	var url = 'https://api.spotify.com/v1/users/' + username +
// 		'/playlists/' + playlist +
// 		'/tracks'; // ?uris='+encodeURIComponent(tracks.join(','));
// 	$.ajax(url, {
// 		method: 'POST',
// 		data: JSON.stringify(tracks),
// 		dataType: 'text',
// 		headers: {
// 			'Authorization': 'Bearer ' + g_access_token,
// 			'Content-Type': 'application/json'
// 		},
// 		success: function(r) {
// 			console.log('add track response', r);
// 			callback(r.id);
// 		},
// 		error: function(r) {
// 			callback(null);
// 		}
// 	});
// }

// function doit() {
// 	// parse hash
// 	var hash = location.hash.replace(/#/g, '');
// 	var all = hash.split('&');
// 	var args = {};
// 	console.log('all', all);
// 	all.forEach(function(keyvalue) {
// 		var idx = keyvalue.indexOf('=');
// 		var key = keyvalue.substring(0, idx);
// 		var val = keyvalue.substring(idx + 1);
// 		args[key] = val;
// 	});

// 	g_name = localStorage.getItem('createplaylist-name');
// 	g_tracks = JSON.parse(localStorage.getItem('createplaylist-tracks'));

// 	console.log('got args', args);

// 	if (typeof(args['access_token']) != 'undefined') {
// 		// got access token
// 		console.log('got access token', args['access_token']);
// 		g_access_token = args['access_token'];
// 	}

// 	getUsername(function(username) {
// 		console.log('got username', username);
// 		createPlaylist(username, g_name, function(playlist) {
// 			console.log('created playlist', playlist);
// 			addTracksToPlaylist(username, playlist, g_tracks, function() {
// 				console.log('tracks added.');
// 				$('#playlistlink').attr('href', 'spotify:user:'+username+':playlist:'+playlist);
// 				$('#creating').hide();
// 				$('#done').show();
// 			});
// 		});
// 	});
// }