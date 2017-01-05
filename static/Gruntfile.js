module.exports = function(grunt) {
    grunt.initConfig({
      watch: {
        options: {
          livereload: true,
        },
        webapp: {
          files: ['../static/*.js','../static/*.html','../static/**/*.js','../static/**/*.html'],
          
        },
      },
    });
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('default', ['watch']);
};