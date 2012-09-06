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
 * to __DEBUG__ and `stream` defaulting to _stdout_.
 * The table where logs are to be written (if it's the case) should exist in the database.
 *
 * @param {Number} level
 * @param {Object} stream
 * @param {Object} dbConn
 * @param {String} applicationName
 * @param {String} tableName
 * @api public
 */

var Log = exports = module.exports = function Log(level, stream, dbConn, applicationName, tableName){
    if ('string' == typeof level) level = exports[level.toUpperCase()];
    this.level = level || exports.DEBUG;
    this.stream = stream || process.stdout;
    if (this.stream.readable) this.read();

    this.dbConn = dbConn;
    this.applicationName = applicationName; //perhaps we should ask for an app name as well, if in db mode
    this.tableName = tableName;

    //if a db connection has been specified, we require a table name as well
    if (dbConn && !tableName) {
        throw new Error('Log.js: since the logger is instantiated with a database connection, a table name is required');
    }
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
                    + (this.applicationName ? ' [' + this.applicationName + ']' : '')
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

    //'args' actually contains both variables ('module_name' and 'callback')
    //the 'log message' is contained in args[0] and can have 'abc %s def %s ...' form, where the first '%s' string is taken from args[1], the second from args[2], etc.
    //as long as there are enough args supplied, the 'replace' method below will not touch the last two params (module_name, callback)
    log_db: function(levelStr, args, module_name, callback) {
        if (exports[levelStr] <= this.level) {
            var msg = args[0].replace(/%s/g, function(){
                return args[i++];
            });

            var logger = this;
            this.dbConn.query('insert into ' + this.tableName + ' (date_created,application,module,level,message) values(?,?,?,?,?)', [new Date, this.applicationName, module_name, levelStr, msg], function(err, rows, fields) {
                if (err) {
                    logger.emergency((module_name ? 'Module [' + module_name + '], ' : '') + JSON.stringify(err));
                }
                if (callback) callback(err);
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

    emergency: function(msg, module_name, target, callback){
        if (target && target == this.TARGETS.database) {
            this.log_db('EMERGENCY', arguments, module_name, callback);
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

    alert: function(msg, module_name, target, callback){
        if (target && target == this.TARGETS.database) {
            this.log_db('ALERT', arguments, module_name, callback);
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

    critical: function(msg, module_name, target, callback){
        if (target && target == this.TARGETS.database) {
            this.log_db('CRITICAL', arguments, module_name, callback);
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

    error: function(msg, module_name, target, callback){
        if (target && target == this.TARGETS.database) {
            this.log_db('ERROR', arguments, module_name, callback);
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

    warning: function(msg, module_name, target, callback){
        if (target && target == this.TARGETS.database) {
            this.log_db('WARNING', arguments, module_name, callback);
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

    notice: function(msg, module_name, target, callback){
        if (target && target == this.TARGETS.database) {
            this.log_db('NOTICE', arguments, module_name, callback);
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

    info: function(msg, module_name, target, callback){
        if (target && target == this.TARGETS.database) {
            this.log_db('INFO', arguments, module_name, callback);
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

    debug: function(msg, module_name, target, callback){
        if (target && target == this.TARGETS.database) {
            this.log_db('DEBUG', arguments, module_name, callback);
        } else {
            this.log('DEBUG', arguments);
        }
    }
};

/**
 * Inherit from `EventEmitter`.
 */

Log.prototype.__proto__ = EventEmitter.prototype;