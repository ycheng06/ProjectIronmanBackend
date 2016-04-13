// Create references for library
var http = require('http');
var path = require('path');
var express = require('express');
var Firebase = require('firebase');
var config = require('./helper/config.js');

// Express server setup
var router = express();
var server = http.createServer(router);

// Authenticate Firebase.
var firebaseRef = new Firebase(config.firebase.url);
firebaseRef.authWithCustomToken(config.firebase.secret, function(error, authData) {
  if (error) {
    console.log("Firebase server authentication failed.");
  } else {
    console.log("Authenticated with Firebase secret successfully.");
  }
});


// activity added listener
var activitiesRef = firebaseRef.child("activities");

activitiesRef.on("child_added", function(snapshot){
  var activity = snapshot.val();
  
  // get userId from activity.
  var userId = activity.userId;
  console.log(activity);
  
  // get live challenges from user
  var liveChallengeRef = new Firebase(config.firebase.url + "/live/" + userId + "/active")
  liveChallengeRef.once("value").then(function(liveChallenges){
    // go through all live active challenges
    liveChallenges.forEach(function(challenge) {
      console.log(challenge.key());
      
      // get info of the challenge
      var publicChallengeRef = new Firebase(config.firebase.url + "/challenges/" + challenge.key());
      publicChallengeRef.once("value", function(snapshot){
        var challenge = snapshot;
        
         // compare activity with challenge
        // activity startDate > challenge startDate
        if (activity.startDate > challenge.startDate) {
          // decides if challenge progress should be updated with the activity distance or pace
          var progress = challenge.progress
          
          // 1v1
          if (challenge.type == "OneVOne"){
            switch(challenge.mode){
              case "Distance":
                  progress[userId] = activity.distance
                  
                break
              case "Speed":
                break
              case "Streak":
                break
            }
          }
          // coop
          else if (challenge.type == "Coop"){}
          
          challenge.progress = progress;
          // update challenge
          publicChallengeRef.update(challenge);
        }
      });
    });
  });
});


  
// challenge updated listener
var publicChallengeRef = new Firebase(config.firebase.url + "/challenges")
publicChallengeRef.on("child_changed", function(snapshot){
  var challenge = snapshot.val()
  console.log("challenge progress of challenge: " + snapshot.key() + "has been updated")
  
  // check challenge update with challenge completed condition
  
  // if completed... move challenge from active to completed table for both host and member
});





server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
