angular.module('myApp').service('PlayerService', function($window,AudioFactory,localStorageService) {
  var myPlayer = {
    isPaused: true,
    // Sample tracks, to be replaced by the audio files you actually want to use
    trackList: [
     // { url: "" , artist: "" , album: "", title: "" }    
    ],
    currentIndex: null,
    currentSong: {},
    repeat: false,
    shuffle: false,
    currentSongString: "Paused",
    audio: AudioFactory,
    saveTrackList: function(trackList){
      localStorageService.set("trackList", myPlayer.trackList);
    },
    loadTrackList: function(){
      return localStorageService.get("trackList");
    },
    remove: function(track){
      var index = myPlayer.trackList.indexOf(track);
      if (index > -1) {
        myPlayer.trackList.splice(index, 1);
        myPlayer.saveTrackList(myPlayer.trackList);
      }
    },
    addRadio: function(url, name){
       var track={"url":url, "title": name,"isRadio":true};
       console.log(track);
       myPlayer.add(track);
    },
    add: function(track){
      //'http://localhost:5000/api/v1.0/artists/{{album.albumartist}}/{{album.title}}/{{song}}'
      var selectFirst=false;
      if (myPlayer.currentIndex==null){
        selectFirst=true;
      }
      myPlayer.trackList.push(track);
      myPlayer.saveTrackList(myPlayer.trackList);
      if (selectFirst){
        myPlayer.currentIndex=0;
      }
    },
    addAlbum: function(tracks){
      tracks.forEach(function(track) {
        myPlayer.add(track);
      });

    },
    clearPlaylist: function(){
      myPlayer.trackList=[];
      myPlayer.saveTrackList(myPlayer.trackList);
    },
    play: function () {
                if (myPlayer.currentIndex==null){
                  myPlayer.currentIndex=0;
                }
                if (myPlayer.trackList.length>0){
                  var token=$window.sessionStorage.token;
                  var auth=encodeURIComponent(token);
                  //var url =myPlayer.trackList[myPlayer.currentIndex].url.replace("http://","")
                  //url= "http://" + auth +"@"+ url;
                  var url= myPlayer.trackList[myPlayer.currentIndex].url + "?token=" + auth;
                  console.log(url);
                  AudioFactory.src = url;
                  AudioFactory.load();
                  AudioFactory.play();
                  myPlayer.isPaused = false;
                  console.log(myPlayer.currentSong);
                }
            },
    stop: function(){
      AudioFactory.pause();
      AudioFactory.currentTime = 0;
    },
    pause: function () {
                myPlayer.isPaused = !myPlayer.isPaused;
                if (myPlayer.isPaused) {
                    AudioFactory.pause();
                } else {
                    AudioFactory.play();
                }
            },
    previous: function () {
          if (myPlayer.currentIndex > 0) {
                myPlayer.currentIndex--;
                myPlayer.play();
          }
          else if (myPlayer.repeat){
            if (myPlayer.currentIndex===0){
                myPlayer.currentIndex=myPlayer.trackList.length-1;
                myPlayer.play();
              }
          }
          },
    next: function () {
            if (myPlayer.shuffle){
                myPlayer.shuffleTrack();
            }
            else if (myPlayer.currentIndex < myPlayer.trackList.length-1) {
                myPlayer.currentIndex++;
                myPlayer.play();
              }
            else if (myPlayer.repeat){
              if (myPlayer.currentIndex===myPlayer.trackList.length-1){
                myPlayer.currentIndex=0;
                myPlayer.play();
              }
            }
          },
    shuffleTrack: function(){
      maxTracks=myPlayer.trackList.length;
      index=myPlayer.currentIndex;
      if (maxTracks>1){
        while (index==myPlayer.currentIndex){
          index=Math.floor((Math.random() * maxTracks));  
        }
      }else{
        index=0;
      }
      track= myPlayer.trackList[index];
      myPlayer.playTrack(track);
    },
    playTrack: function(track){
      var index = myPlayer.trackList.indexOf(track);
      if (index > -1) {
        myPlayer.currentIndex=index;
        myPlayer.play();
      }
    }
  };
  var loadTrackList = myPlayer.loadTrackList();
  if (loadTrackList){
    myPlayer.trackList=loadTrackList;  
    myPlayer.currentIndex=0;
  }
  return myPlayer;
});
angular.module('myApp').factory('AudioFactory', function($document) {
  var audio = $document[0].createElement('audio');
  return audio;
});
angular.module('myApp')
  .directive('myPlayer', function($window,PlayerService, AuthService) {
  return {
      restrict: "E",
      scope: {},
      templateUrl: "./player/player.html",
      link: function (scope, element, attrs) {
        scope.myPlayerService = PlayerService;
        var windowElement = angular.element($window);
        windowElement.on('beforeunload', function (event) {
          scope.myPlayerService.stop();
        });
        
        
        scope.AuthService= AuthService;
        scope.$watch('myPlayerService.currentIndex', function(newValue, oldValue) {
              if (!scope.myPlayerService.isPaused){
                track=scope.myPlayerService.trackList[newValue];
                scope.myPlayerService.currentSong=track;
                console.log("currentSong" + scope.myPlayerService.currentSong);
              }
              else{
                scope.myPlayerService.currentSong={};
              }
        }, true);
        scope.$watch('myPlayerService.isPaused', function(newValue, oldValue) {
              if (!newValue){
                track=scope.myPlayerService.trackList[scope.myPlayerService.currentIndex];
                scope.myPlayerService.currentSong=track;
              }
              else{
                scope.myPlayerService.currentSong={};
              }
            }, true);
        scope.$watch('myPlayerService.currentSong', function(newValue, oldValue) {
              if (angular.equals(newValue, {})){
                scope.myPlayerService.currentSongString="Paused";
              }
              else{
                track=scope.myPlayerService.currentSong;
                if (track.isRadio)
                {
                  scope.myPlayerService.currentSongString=track.title;  
                }else{
                  scope.myPlayerService.currentSongString=track.title + " by "+track.artist+" from "+track.album;  
                }
              }
            }, true);

        scope.myPlayerService.audio.addEventListener('ended', function() {
          scope.myPlayerService.next();
          // listeners above are not working for some reason
          track=scope.myPlayerService.trackList[scope.myPlayerService.currentIndex];
          scope.myPlayerService.currentSong=track;
          scope.$apply();
        }, true);
    }
  };
});