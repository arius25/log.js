/*!
 * Log.js
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;

/**
 * Initialize a `Logger` with the given log `level` defaulting
 * to __DEBUG__ and `stream` defaulting to _stdout_. There should exist
 * a table named dashboard_log in the database
 *
 * @param {Number} level
 * @param {Object} stream
 * @param {Object} dbConnection
 * @api public
 */


var Log = exports = module.exports = function Log(application, level, stream, mysqlPool){
    this.application = application;
    if ('string' == typeof level) level = exports[level.toUpperCase()];
    this.level = level || exports.DEBUG;
    this.stream = stream || process.stdout;
    if (this.stream.readable) this.read();
    this.dbConnPool = mysqlPool;
};

/**
 * System is unusable.
 *
 * @type Number
 */

exports.EMERGENCY = 0;

/**
 * Action must be taken immediately.
 *
 * @type Number
 */

exports.ALERT = 1;

/**
 * Critical condition.
 *
 * @type Number
 */

exports.CRITICAL = 2;

/**
 * Error condition.
 *
 * @type Number
 */

exports.ERROR = 3;

/**
 * Warning condition.
 *
 * @type Number
 */

exports.WARNING = 4;

/**
 * Normal but significant condition.
 *
 * @type Number
 */

exports.NOTICE = 5;

/**
 * Purely informational message.
 *
 * @type Number
 */

exports.INFO = 6;

/**
 * Application debug messages.
 *
 * @type Number
 */

exports.DEBUG = 7;

/**
 * prototype.
 */

Log.prototype = {

    TARGETS: {
        database: 'db'
    },

    /**
     * Start emitting "line" events.
     *
     * @api public
     */

    read: function(){
        var buf = ''
            , self = this
            , stream = this.stream;

        stream.setEncoding('ascii');
        stream.on('data', function(chunk){
            buf += chunk;
            if ('\n' != buf[buf.length - 1]) return;
            buf.split('\n').map(function(line){
                if (!line.length) return;
                try {
                    var captures = line.match(/^\[([^\]]+)\] (\w+) (.*)/);
                    var obj = {
                        date: new Date(captures[1])
                        , level: exports[captures[2]]
                        , levelString: captures[2]
                        , msg: captures[3]
                    };
                    self.emit('line', obj);
                } catch (err) {
                    // Ignore
                }
            });
            buf = '';
        });

        stream.on('end', function(){
            self.emit('end');
        });
    },

    /**
     * Log output message.
     *
     * @param  {String} levelStr
     * @param  {Array} args
     * @api private
     */

    log: function(levelStr, args) {
        if (exports[levelStr] <= this.level) {
            var i = 1;
            var msg = args[0].replace(/%s/g, function(){
                return args[i++];
            });

            this.stream.write(
                '[' + new Date + ']'
                    + ' ' + levelStr
                    + ' [' + this.application + ']'
                    + ' ' + msg
                    + '\n'
            );
        }
    },

    /**
     * Log output message to a MySQL database.
     *
     * @param  {String} levelStr
     * @param  {Array} args
     * @param  {Function} callback
     * @api private
     */

    log_db: function(levelStr, args, callback) {
        if (exports[levelStr] <= this.level) {
            var msg = args[0].replace(/%s/g, function(){
                return args[i++];
            });

            this.dbConnPool.query('insert into dashboard_log (date_created,application,level,message) values(?,?,?,?)', [new Date, this.application, levelStr, msg], function(err, rows, fields) {
                if (err) callback(err);
                else callback();
            });
        }
    },

    /**
     * Log emergency `msg`.
     *
     * @param  {String} msg
     * @param  {String} target
     * @api public
     */

    emergency: function(msg, target){
        if (target && target == this.TARGETS.database) {
            var logger = this;
            this.log_db('EMERGENCY', arguments, function(err) {
                if (err) logger.log('EMERGENCY', [err.toString()]);
            });
        } else {
            this.log('EMERGENCY', arguments);
        }
    },

    /**
     * Log alert `msg`.
     *
     * @param  {String} msg
     * @param  {String} target
     * @api public
     */

    alert: function(msg, target){
        if (target && target == this.TARGETS.database) {
            var logger = this;
            this.log_db('ALERT', arguments, function(err) {
                if (err) logger.log('ALERT', [err.toString()]);
            });
        } else {
            this.log('ALERT', arguments);
        }
    },

    /**
     * Log critical `msg`.
     *
     * @param  {String} msg
     * @param  {String} target
     * @api public
     */

    critical: function(msg, target){
        if (target && target == this.TARGETS.database) {
            var logger = this;
            this.log_db('CRITICAL', arguments, function(err) {
                if (err) logger.log('CRITICAL', [err.toString()]);
            });
        } else {
            this.log('CRITICAL', arguments);
        }
    },

    /**
     * Log error `msg`.
     *
     * @param  {String} msg
     * @param  {String} target
     * @api public
     */

    error: function(msg, target){
        if (target && target == this.TARGETS.database) {
            var logger = this;
            this.log_db('ERROR', arguments, function(err) {
                if (err) logger.log('ERROR', [err.toString()]);
            });
        } else {
            this.log('ERROR', arguments);
        }
    },

    /**
     * Log warning `msg`.
     *
     * @param  {String} msg
     * @param  {String} target
     * @api public
     */

    warning: function(msg, target){
        if (target && target == this.TARGETS.database) {
            var logger = this;
            this.log_db('WARNING', arguments, function(err) {
                if (err) logger.log('WARNING', [err.toString()]);
            });
        } else {
            this.log('WARNING', arguments);
        }
    },

    /**
     * Log notice `msg`.
     *
     * @param  {String} msg
     * @param  {String} target
     * @api public
     */

    notice: function(msg, target){
        if (target && target == this.TARGETS.database) {
            var logger = this;
            this.log_db('NOTICE', arguments, function(err) {
                if (err) logger.log('NOTICE', [err.toString()]);
            });
        } else {
            this.log('NOTICE', arguments);
        }
    },

    /**
     * Log info `msg`.
     *
     * @param  {String} msg
     * @param  {String} target
     * @api public
     */

    info: function(msg, target){
        if (target && target == this.TARGETS.database) {
            var logger = this;
            this.log_db('INFO', arguments, function(err) {
                if (err) logger.log('INFO', [err.toString()]);
            });
        } else {
            this.log('INFO', arguments);
        }
    },

    /**
     * Log debug `msg`.
     *
     * @param  {String} msg
     * @param  {String} target
     * @api public
     */

    debug: function(msg, target){
        if (target && target == this.TARGETS.database) {
            var logger = this;
            this.log_db('DEBUG', arguments, function(err) {
                if (err) logger.log('DEBUG', [err.toString()]);
            });
        } else {
            this.log('DEBUG', arguments);
        }
    }
};

/**
 * Inherit from `EventEmitter`.
 */

Log.prototype.__proto__ = EventEmitter.prototype;