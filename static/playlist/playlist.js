angular.module('myApp').service('PlaylistService', function($window,AudioFactory,localStorageService,PlayerService) {
  var myPlaylist = {
    saveTrackList: function(trackList){
      localStorageService.set("trackList", trackList);
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
      console.log(track);
      myPlayer.trackList.push(track);
      myPlayer.saveTrackList(myPlayer.trackList);
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

  };
  return myPlaylist;
});
