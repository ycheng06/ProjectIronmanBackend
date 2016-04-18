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

// ============== Activity ========================
// ** Public activity child added listener
/*
  1) public activity added
  2) get userId of that activity
  3) get all live challenges with userId
  4) check if activity start date > challenge start date
  5) Yes: depending on what challenge type it is ... update the challenge progress appropriately
*/
var activitiesRef = firebaseRef.child("public_activities");

activitiesRef.on("child_added", function(snapshot){
  var activity = snapshot.val();
  var activityId = snapshot.key();
  
  // get userId from activity.
  var userId = activity.userId;
  console.log("activity id " + snapshot.key());
  
  // get live challenges from user
  var liveChallengeRef = new Firebase(config.firebase.url + "/live_challenges/" + userId + "/active");
  liveChallengeRef.once("value").then(function(liveChallenges){
    // go through all live active challenges
    liveChallenges.forEach(function(challenge) {
      console.log("live challenge id " + challenge.key());
      
      // get info of the challenge
      var publicChallengeRef = new Firebase(config.firebase.url + "/public_challenges/" + challenge.key());
      publicChallengeRef.once("value", function(snapshot){
        var challenge = snapshot.val();
        console.log("challenge found");
         // compare activity with challenge
         
        // activity startDate > challenge startDate
        console.log("activity start date: " + activity.startDate);
        console.log("challenge start date: " + challenge.startDate);
        
        if (activity.startDate > challenge.startDate) {
          console.log("activity date counts");
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
          
          // update challenge
          challenge.progress = progress;
          publicChallengeRef.update(challenge);
          
          // update public activity
          var publicActivityRef = new Firebase(config.firebase.url + "/public_activities/" + activityId);
          publicActivityRef.update({isNew: 'false'});
        }
      });
    });
  });
});

// ==========================================================


// ================== Public Challenge =============================  
// ** Public challenge child changed listener
/*
  1) public challenge updated
  2) go through all the challenge progress
  3) compare progress with challenge completed condition
*/
var publicChallengeRef = new Firebase(config.firebase.url + "/public_challenges")
publicChallengeRef.on("child_changed", function(snapshot){
  var challenge = snapshot.val();
  var challengeId = snapshot.key();
  console.log("challenge progress of challenge: " + challengeId + " has been updated")
  
  
  var progress = challenge.progress;
  var challengeCompleted = false;
  
  // check challenge update with challenge completed condition
  // also need to record who is the winner(do this maybe later)
  Object.keys(progress).forEach(function(key){
    var userProgress = progress[key];
    if (userProgress >= challenge.completedCondition) {
      challengeCompleted = true;
    }
  });
  
  // if completed... move challenge from active to completed table for both host and member
  if (challengeCompleted) {
    var hostUserId = challenge.createdBy
  
    // remove from live
    var hostLiveChallengeRef = new Firebase(config.firebase.url + "/live_challenges/" + hostUserId + "/active/" + challengeId);
    hostLiveChallengeRef.remove()
    
    // add to completed
    var hostDeadChallengeRef = new Firebase(config.firebase.url + "/dead_challenges/" + hostUserId + "/completed/" + challengeId);
    hostDeadChallengeRef.set(true);
    
    // TO DO: remove challenge from member live_challenges
    
    // TO DO: add challenge to member dead_challenges
    
    // change public challenge status to completed
    var publicChallengeRef = new Firebase(config.firebase.url + "/public_challenges/" + challengeId);
    publicChallengeRef.update({status: 'Completed'});
  }
  
  
  
});

// ** Public challenge child added listener
publicChallengeRef.on("child_added", function(snapshot){
  console.log(snapshot.val())  
});

// ==========================================================

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
