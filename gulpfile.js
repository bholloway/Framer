var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var wrap = require('gulp-wrap');

var src = {
    js: 'src/**.*js'
};

gulp.task('default', ['serve']);

gulp.task('serve', ['build'], function () {

    browserSync({
        server: '.',
        index: 'example/common/index.html'
    });

    gulp.watch(src.js, ['build']);
    gulp.watch(src.js).on('change', reload);
});

gulp.task('build', ['clean'], function () {
    return gulp.src(src.js)
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(concat('framer.min.js'))
        .pipe(wrap('(function (window) {\n"use strict";\n<%= contents %>\n})(window);'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist'));
});

gulp.task('clean', function (callback) {
    del(['build'], callback);
});