var gulp = require('gulp')

var autoprefixer = require('gulp-autoprefixer')
var browserify = require('browserify')
var buffer = require('vinyl-buffer')
var concat = require('gulp-concat')
var del = require('del')
var fs = require('fs')
var KarmaServer = require('karma').Server
var minifyCSS = require('gulp-minify-css')
var source = require('vinyl-source-stream')
var standard = require('gulp-standard')
var shell = require('gulp-shell')
var sourcemaps = require('gulp-sourcemaps')
var ts = require('gulp-typescript')
var tsify = require('tsify')
var tslint = require('gulp-tslint')
var util = require('gulp-util')
var uglify = require('gulp-uglify')
var watchify = require('watchify')
var argv = require('yargs').argv

var browserSync = require('browser-sync').create()

var paths = {
  mapillaryjs: 'mapillaryjs',
  css: './styles/**/*.css',
  build: './build',
  ts: {
    src: './src/**/*.ts',
    tests: './spec/**/*.ts',
    dest: 'build',
    testDest: 'build/spec'
  },
  js: {
    src: './build/**/*.js',
    tests: './spec/**/*.js'
  },
  sourceMaps: './build/bundle.js.map',
  sourceMapsDist: './dist/mapillary-js.map'
}

var config = {
  browserify: {
    entries: ['./src/Mapillary.ts'],
    debug: true,
    standalone: 'Mapillary',
    cache: {},
    packageCache: {}
  },
  ts: JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8')).compilerOptions,
  typedoc: {
    includes: [
      './src/viewer/Viewer.ts',
      './src/viewer/interfaces/IViewerOptions.ts',
      './src/graph/edge/EdgeDirection.ts',
      './src/viewer/ImageSize.ts'
    ],
    options: {
      target: 'ES5',
      module: 'commonjs',
      theme: 'minimal',
      mode: 'file',
      out: './docs-out',
      name: 'mapillary-js',
      excludeExternals: ''
    }
  }
}

gulp.task('clean', function () {
  return del([
    'docs/ts/**/*',
    'build/**/*',
    'debug/**/*.js'
  ])
})

var parsedOptions = []
for (var key in config.typedoc.options) {
  parsedOptions.push('--' + key + ' ' + config.typedoc.options[key])
}

gulp.task('documentation', shell.task('./node_modules/typedoc/bin/typedoc ' +
                                      parsedOptions.join(' ') +
                                      ' ' +
                                      config.typedoc.includes.join(' ')
                                     ))

gulp.task('js-lint', function () {
  return gulp.src('./Gulpfile.js')
    .pipe(standard())
    .pipe(standard.reporter('default', {
      breakOnError: true
    }))
})

gulp.task('serve', ['ts'], function () {
  browserSync.init({
    server: {
      baseDir: './debug',
      routes: {
        '/dist': 'dist',
        '/build': 'build'
      }
    },
    logFileChanges: false
  })
})

gulp.task('test', function (done) {
  var config
  if (argv.grep) {
    config = extendKarmaConfig(__dirname + '/karma.conf.js', {
      client: {
        args: ['--grep', argv.grep]
      },
      singleRun: true
    })
  } else {
    config = extendKarmaConfig(__dirname + '/karma.conf.js', {
      singleRun: true
    })
  }

  new KarmaServer(config, function (exitCode) {
    if (exitCode) {
      process.exit(exitCode)
    }
  }, done).start()
})

gulp.task('test-watch', function (done) {
  var config
  if (argv.grep) {
    config = extendKarmaConfig(__dirname + '/karma.conf.js', {
      client: {
        args: ['--grep', argv.grep]
      },
      singleRun: false
    })
  } else {
    config = extendKarmaConfig(__dirname + '/karma.conf.js', {
      singleRun: false
    })
  }

  new KarmaServer(config, function (exitCode) {
    if (exitCode) {
      process.exit(exitCode)
    }
  }, done).start()
})

gulp.task('ts-lint', function (cb) {
  var stream = gulp.src(paths.ts.src)
    .pipe(tslint())
    .pipe(tslint.report('verbose'))
  return stream
})

gulp.task('tsd', shell.task('./node_modules/tsd/build/cli.js install'))

gulp.task('typescript', ['ts-lint', 'typescript-src', 'typescript-test'], function (cb) { cb() })

gulp.task('typescript-src', function () {
  var stream = gulp.src(paths.ts.src)
    .pipe(ts(config.ts))
    .pipe(gulp.dest(paths.ts.dest))
  return stream
})

gulp.task('watch', ['css'], function () {
  gulp.watch([paths.ts.src, paths.ts.tests], ['dev:ts'])
  gulp.watch([paths.css], ['css'])
})

gulp.task('default', ['serve', 'watch'])

// Helpers
function extendKarmaConfig (path, conf) {
  conf.configFile = path
  return conf
}

gulp.task('prepublish', ['tsd', 'ts-lint', 'css'], function () {
  browserify(config.browserify)
    .plugin(tsify, config.ts)
    .transform('brfs')
    .transform('envify')
    .bundle()
    .on('error', function (error) {
      console.error(error.toString())
    })
    .pipe(source('mapillary-js.min.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist'))
})

// TODO: Refine this task
gulp.task('ts', ['ts-lint'], function () {
  var bundler = browserify(config.browserify)

  bundler.plugin(tsify, config.ts)

  if (util.env.env === 'TEST') {
    // skip watchify in test environment
  } else {
    bundler.plugin(watchify)
  }

  bundler
    .transform('brfs')
    .transform('envify')
    .bundle()
    .on('error', function (error) {
      console.error(error.toString())
    })
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./build'))
})

gulp.task('dev:ts', ['ts'], function () {
  browserSync.reload()
})

gulp.task('copy-style-assets', function () {
  gulp.src('styles/**/!(*.css)')
    .pipe(gulp.dest('dist'))
})

gulp.task('css', ['copy-style-assets'], function () {
  gulp.src([
    'styles/mapillary-js.css',
    'styles/**/!(mapillary-js)*.css'
  ])
    .pipe(autoprefixer('last 2 version', 'safari 7', 'ie 11'))
    .pipe(minifyCSS())
    .pipe(concat('mapillary-js.min.css'))
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream())
})
