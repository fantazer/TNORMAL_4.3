var gulp = require("gulp");
var autoprefixer = require('gulp-autoprefixer');
var useref = require('gulp-useref');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var stylus = require('gulp-stylus');
var browserSync = require('browser-sync').create();
var ftp = require('vinyl-ftp');
var reload = browserSync.reload;
var rupture = require('rupture');
var notify = require('gulp-notify');
var pngquant = require('imagemin-pngquant');
var imageminMozjpeg = require('imagemin-mozjpeg');
var imagemin = require('gulp-imagemin');
var newer = require('gulp-newer');
var remember = require('gulp-remember');
var runSequence = require('run-sequence');
var progeny = require('gulp-progeny');
var filter = require('gulp-filter');
var fs = require('fs');
var combineMq = require('gulp-combine-mq');
var webshot = require('gulp-webshot');
var createFile = require('create-file');
var svgSprite = require('gulp-svg-sprite');
var svgSpriteTempl = require('gulp-svg-sprites');
var rename = require('gulp-rename');
var svgmin = require('gulp-svgmin');
var cheerio = require('gulp-cheerio');
var pug = require('gulp-pug');
var prettify = require('gulp-html-prettify');
var cached = require('gulp-cached');
const changed = require('gulp-changed');
var pugInheritance = require('gulp-pug-inheritance');
var gcmq = require('gulp-group-css-media-queries');

// ########## make img ###############

//compress image
gulp.task('imageCompress', function () {
	return gulp.src([
		'app/img/**/**.*',
		'!app/img/svg/**.*',
		'!app/img/svg',
		'!app/img/screen/'
	])
		.pipe(newer('dist/img/'))
		.pipe(gulpif("*.png",
			imagemin({
				progressive: true,
				use: [pngquant({quality: '80', speed: 5})]
			})
		))
		.pipe(gulpif("*.jpg",
			imagemin({
				progressive: true,
				use: [imageminMozjpeg({quality: '80', speed: 5})]
			})
		))
		.pipe(gulp.dest('dist/img/'));
});

//sprite SVG
gulp.task('svg', function () {
	gulp.src(['!app/img/svg/**--color.*', 'app/img/svg/**.*', '!app/img/svg/defs.svg', '!app/img/svg/sprite.svg'])
		.pipe(cheerio({
			run: function ($) {
				$('[fill]').removeAttr('fill'); //remove if need color icon
				$('[style]').removeAttr('style');
				$('[opacity]').removeAttr('opacity');
				$('style').remove();
			},
			parserOptions: {xmlMode: true}
		}))
		.pipe(gulp.dest('app/img/svg/'));

	var svgSrc = gulp.src(['app/img/svg/**.*', '!app/img/svg/defs.svg', '!app/img/svg/sprite.svg']);
	svgSrc
		.pipe(svgmin({
			js2svg: {
				pretty: true
			}
		}))
		.pipe(svgSprite({
			mode: {
				symbol: true,
			}
		}))
		.pipe(rename("pack.html"))
		.pipe(gulp.dest('app/img/'))
		.pipe(gulp.dest('dist/img/'))

	svgSrc
		.pipe(svgSpriteTempl())
		.pipe(gulp.dest('app/img/'))
		.pipe(gulp.dest('dist/img/'))

	var svgArray = [];
	fs.writeFile("app/html/block_html/_svg.pug", '', function (err, result) {
		if (err) console.log('error', err);
	});
	fs.readdirSync('app/img/svg').forEach(file => {
		svgArray.push("\'" + file + "\'");
	})
	fs.writeFile("app/html/block_html/_svg.pug", '- svgArray = [' + svgArray + '];', '', function (err, result) {
		if (err) console.log('error', err);
	});
});

//ScreenShot
gulp.task('screenshot', function () {
	return gulp.src('app/*.html')
		.pipe(webshot(
			{
				dest: 'app/img/screen/',
				root: '.',
				windowSize: {
					width: 1920,
					height: 1024
				},
				userAgent: 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
			}
		));
})
// ########## make img  end ###############

// ########## make css ###############

//Prefix my css
gulp.task('prefix', function () {
	return gulp.src('app/css/style.css')
		.pipe(cached('prefix'))
		.pipe(autoprefixer({
			browsers: ['last 15 versions']
		}))
		.pipe(gcmq())
		.pipe(gulp.dest('app/css/'));
});

//Stylus
gulp.task('stylus', function () {
		return gulp.src(['app/css/**/**/*.styl','app/module/**/*.styl'])
			.pipe(cached('stylus'))
			.pipe(progeny({
					regexp: /^\s*@import\s*(?:\(\w+\)\s*)?['"]([^'"]+)['"]/
			}))
			.pipe(filter(['**/*.styl', '!**/_*.styl']))
			.pipe(stylus({
					use:[rupture()],
					'include css': true
			})).on('error', errorhandler)
			.pipe(gulp.dest('app/css/'))
});
//css beautify
gulp.task('css-beautify', function () {
	return gulp.src('app/css/style.css')
		.pipe(combineMq({
			beautify: true
		}))
		.pipe(gulp.dest('dist/css/'));
})

//min css
gulp.task('min:css', function () {
	return gulp.src('./app/css/style.css')
		.pipe(minifyCss())
		.pipe(rename("style-min.css"))
		.pipe(gulp.dest('./dist/css/'))
})

//min js
gulp.task('min:js', function () {
	return gulp.src('./app/js/script.js')
		.pipe(uglify())
		.pipe(rename("script-min.js"))
		.pipe(gulp.dest('./dist/js/'))
})

// ########## make css end ###############

// ########## make html ###############

gulp.task('pug', function () {
	gulp.src(['app/html/**/*.pug', 'app/module/**/*.pug',])
		//gulp.src(['app/html/modal.pug','app/module/**/*.pug',])
		.pipe(changed('dist', {extension: '.html'}))
		.pipe(cached('pug'))
		.pipe(pugInheritance({basedir: 'app/html', extension: '.pug', skip: 'node_modules', saveInTempFile: true}))

		.pipe(filter(function (file) {
			return !/\/_/.test(file.path) && !/^_/.test(file.relative);
		}))
		.pipe(pug({
			pretty: '\t',
			cache: 'true',
			basedir: __dirname
		})
		.on('error', errorhandler))
		.pipe(prettify({
			'unformatted': ['pre', 'code'],
			'indent_with_tabs': true,
			'preserve_newlines': true,
			'brace_style': 'expand',
			'end_with_newline': true
		}))
		.pipe(gulp.dest('app/'))
		.on('end', browserSync.reload);
});

gulp.task('include-pug', function () {
	var FileCreate = JSON.parse(fs.readFileSync('./file.json'));
	for (var key in FileCreate) {
		var obj = FileCreate[key];
		if (key == "block") {
			for (var prop in obj) {
				fs.writeFile("app/html/block_html/_include.pug", '')
				fs.appendFile("app/html/block_html/_include.pug", "include ../../module/" + obj[prop] + "/_" + obj[prop] + ".pug\n");
			}
		}
	}
})


// ########## make html end###############

// ########## make service###############

//copy fonts
gulp.task('copy:font', function () {
	return gulp.src('./app/fonts/**/**.*')
		.pipe(newer('./dist/fonts/'))
		.pipe(gulp.dest('./dist/fonts/'))
})

//copy js
gulp.task('copy:js', function () {
	return gulp.src(['./app/js/script.js', './app/js/script-edit.js'])
		.pipe(gulp.dest('./dist/js/'))
})

//copy css
gulp.task('copy:css', function () {
	return gulp.src(['./app/css/style.css', './app/css/style-edit.css'])
		.pipe(gulp.dest('./dist/css/'))
})

//Show error
function errorhandler(a) {
	var args = Array.prototype.slice.call(arguments);
	// Send error to notification center with gulp-notify
	notify.onError({
		title: 'Compile Error',
		message: a,
	}).apply(this, args);
	this.emit('end');
};

//Make file
gulp.task('make', function () {
	var assets = useref.assets();
	return gulp.src('app/*.html')
		.pipe(cached('make'))
		.pipe(assets)
		.pipe(remember('make'))
		.pipe(gulpif('*.js', uglify()))
		.pipe(gulpif('*.css', minifyCss()))
		.pipe(assets.restore())
		.pipe(useref())
		.pipe(gulp.dest('dist'));
});


//Ftp
gulp.task('ftp', function () {
	var ftpConf = JSON.parse(fs.readFileSync('./ftp.json'));
	var conn = ftp.create({
		host: 'deploys.ru',
		user: ftpConf.user,
		password: ftpConf.pass,
		parallel: 1,
		maxConnections: 1
	});
	var globs = [
		'dist/**/**/**.*'
	];
	return gulp.src(globs, {buffer: false})
		.pipe(conn.newer('/httpdocs/deploys.ru/' + ftpConf.name))
		.pipe(conn.dest('/httpdocs/deploys.ru/' + ftpConf.name));
});

//LiveReload
gulp.task('serve', function () {
	browserSync.init({
		notify: false,
		reloadDelay: 300,
		//tunnel: true,
		//tunnel: "webpage",
		server: {
			baseDir: "app/",
		}
	});
	browserSync.watch(["app/css/**/*.css", "app/js/**.*"]).on("change", browserSync.reload);
});

// ########## make service end ###############

//create File
gulp.task('file', function () {
	var FileCreate = JSON.parse(fs.readFileSync('./file.json'));
	for (var key in FileCreate) {
		var obj = FileCreate[key];
		if (key == "block") {
			for (var prop in obj) {
				createFile(
					'app/module/' + obj[prop] + '/_' + obj[prop] + '.pug',
					"mixin " + obj[prop] + "()" + "\n\t//block " + obj[prop] + "\n\t//block " + obj[prop] + ' end',
					function (err) {
					}
				);
				createFile(
					'app/module/' + obj[prop] + '/_' + obj[prop] + '.styl',
					"/*! block " + obj[prop] + "*/" + "\n/*!block " + obj[prop] + ' end */',
					function (err) {
					}
				);
			}
		}
		if (key == "page") {
			for (var prop in obj) {
				createFile('app/html/' + obj[prop] + '.pug', "", function (err) {
				});
			}
		}
	}
});


//Watcher
gulp.task('see', function () {
	gulp.watch(['app/html/**/*.pug', 'app/module/**/*.pug'], ['pug']);
	gulp.watch(['app/css/**/*.styl', 'app/module/**/*.styl'], ['stylus']);
})

//default
gulp.task('copy',['copy:font','copy:js','copy:css']);
gulp.task('min',['min:css','min:js']);
gulp.task('img',['imageCompress']);
gulp.task('default',['see','serve'] );


gulp.task('build',function(){
		runSequence(
				'pug',
				'stylus',
				'prefix',
				'copy',
				'min',
				'img',
				'svg',
				'make'
		)
});


gulp.task('build:ftp',function(){
		runSequence(
				'pug',
				'stylus',
				'prefix',
				'copy',
				'min',
				'img',
				'svg',
				'make',
				'ftp'
		)
});

gulp.task('build:ftp:img',function(){
		runSequence(
				'pug',
				'stylus',
				'prefix',
				'copy',
				'min',
				'screenshot',
				'img',
				'svg',
				'make',
				'ftp'
		)
});