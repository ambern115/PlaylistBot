// Creates a window for jquery to run in?
var jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

var $ = jQuery = require('jquery')(window);

// Used for making http request to authorize spotify login
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// Configures the discord client 
const Discord = require('discord.js');
const client = new Discord.Client();
usr = "default";

var user_id_ = '';  // Id of the user whose spotify account playlists will be added to
var tracks_ = [];  // List of spotify track objects to be added to playlists
var channel;  // Channel the last discord message was sent in

// Runs when bot starts up
client.on('ready', () => {
    usr = client.user.tag;
    console.log('Logged in ' + usr);
});

// Runs everytime a new messge is posted to any channel
client.on('message', msg => {
    // Find the channel the last message was sent in
    channel = client.channels.cache.get(msg.channel.id);

    // Command to create a spotify playlist from add songs in a specific channel
    if (msg.content === '!playlist') {
        //msg.reply('Playlist Made?');
        //httpGetAsync('http://localhost:8888/login', console.log);
        //collectTracks(channel);
    }

    if (msg.content.toUpperCase().includes("HENTAIBOT")) {
      //msg.reply("OWO ~");
      channel.send("OWO~ you called?!");
    }
});

// Logs in with token from the bot portal
client.login(''); // Remove before commits to GitHub


// Collects all songs from the channel it was messaged in (all their URIs)
function collectTracks(local_channel) {
  var all_ms;
  local_channel.messages.fetch({ limit: 50 })
    .then(messages => collectTracksCallback(messages), error => console.log(error))
    .catch(console.error);
  console.log("in collection");
}

function collectTracksCallback(messages) {
  console.log(`Message size is ${messages.size}`);

  var tracks = '';
  
  for (let [key, msg] of messages) {
    //console.log(key + ' goes ' + msg.content);
    if (msg.content.includes("https://open.spotify.com/track/")) {
      //console.log(key + ' goes ' + msg.content);
      song_link = '' + msg.content.split("https://open.spotify.com/track/").slice(1);
      console.log(`SONG URI spotify:track:${song_link}`);

      // Get the song from spotify
      $.ajax({
        type: 'GET',
        url: 'https://open.spotify.com/track/' + song_link,
        dataType: 'json',
        headers: {
          'Authorization': 'Bearer ' + g_access_token
        },
        contentType: 'application/json',
        success: function(result) {
          console.log(result)
          console.log('Woo! :)');
          console.log(result.external_urls.spotify);
          var playlist_url = result.external_urls.spotify;
          channel.send(playlist_url);
        },
        error: function(r) {
          console.log(r)
          console.log('Error! :(');
        }
      });
      //tracks.push(song_link + ', ';
    }
  }

  tracks_ = tracks;
  console.log(`TRACKS ${tracks_}`);
  httpGetAsync('http://localhost:8888/login', console.log);
}


// BEGIN SPOTIFY AUTHENTICATION
function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
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

  // If already authorized, don't do anything
  if (temp_access_token === '') {
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

    console.log(url);
  } else {
    makePlaylist(user_id, "Test Playlist 3", temp_access_token, console.log);
  }
});

var user_id = '';
var temp_access_token = '';

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
        console.log(body);
        temp_access_token = access_token;
        user_id = body.id;

        // ALL USEFUL INFO ABOUT USER IS STORED IN BODY
        makePlaylist(body.id, "Test Playlist 2", access_token, console.log);
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

  // }
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

// app.get('/makeplaylist', function(req, res) {

//   request.post({
//     headers: {'content-type' : 'application/json', 'Authorization': 'Bearer ' + auth_code},
//     url:     'https://api.spotify.com/v1/users/' + user_id + '/playlists',
//     body:    JSON.stringify({'name': "Test P", 'public': true})
//   }, function(error, response, body){
    
//     console.log("REPSONSE");
//     //console.log(response);
//     console.log("after");
//     console.log(auth_code);
//     //console.log(response);
//   });


  // request.post(authOptions, function(error, response, body) {
  //   if (!error && response.statusCode === 200) {
  //     var access_token = body.access_token;
  //     res.send({
  //       'access_token': access_token
  //     });
  //   }
  // });
  // makePlaylist(user_id, "Test P", auth_code, console.log);
// });


function makePlaylist(user_id, playlist_name, g_access_token, callback) {
  console.log('create playlist');
  var url = 'https://api.spotify.com/v1/users/' +  user_id + '/playlists';
  
  var json_data = {
    'name': playlist_name,
    'public': true
  };

  $.ajax({
    type: 'POST',
    url: url,
    data: JSON.stringify({
      'name': playlist_name,
      'public': true,
      'tracks': tracks_
    }),
    dataType: 'json',
    headers: {
      'Authorization': 'Bearer ' + g_access_token
    },
    contentType: 'application/json',
    success: function(result) {
      console.log(result)
      console.log('Woo! :)');
      console.log(result.external_urls.spotify);
      var playlist_url = result.external_urls.spotify;
      channel.send(playlist_url);
    },
    error: function(r) {
      console.log(r)
      console.log('Error! :(');
    }
  });


}


// // not my code
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