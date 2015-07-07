var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var wrap = require('gulp-wrap');
var opn = require('opn');

var src = {
    js: [
        'src/Framer.js',
        'src/util.js',
        'src/Manager.js',
        'src/Client.js'
    ]
};

var commonExample = 'http://localhost:3000/examples/common/index.html';

gulp.task('default', ['serve']);

gulp.task('serve', ['build'], function () {

    browserSync({
        server: '.',
        open: false
    });

    opn(commonExample);

    gulp.watch(src.js, ['build']);
    gulp.watch(src.js).on('change', function () {
        console.log('changes reloading..');
        reload();
    });
});

gulp.task('build', ['clean'], function () {
    return gulp.src(src.js)
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(concat('framer.min.js'))
        .pipe(wrap('(function (window) {\n"use strict";\n<%= contents %>\n})(window);'))
        .pipe(sourcemaps.write(
            '.',
            {
                sourceRoot: '../src',
                includeContent: false,
                base: '../src'
            }))
        .pipe(gulp.dest('dist'));
});

gulp.task('clean', function (callback) {
    del(['build'], callback);
});