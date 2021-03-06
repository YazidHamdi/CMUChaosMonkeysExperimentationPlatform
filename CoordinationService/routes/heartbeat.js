var express = require('express');
var router = express.Router();
var path = require('path');
var log = require('./logUtilities');
var nodeCmd = require("node-cmd");
var url = require('url');
var config = require('../config/logDbConfig.json');

/* gets the table of services, controls liveness of remote services and deregisters non responsive ones after 3 minutes */
router.get('/table', function getServiceTable(req, res, next) {
  //Connect to DB
  var connection = createDbConnection();
  connection.connect();
  ip = '';
  result = [];
  //Return all services
  var sql = 'select * from connected_services';
  logMessage(false, log.operationType.QueryData, new Date(), sql);
  connection.query(sql, function getAllConnectedServices(err, rows, fields) {
    if (err) {
      logMessage(true, log.errorType.DBError, new Date(), err);
      err.source = 'mysql';
      err.status = 500;
      next(err)
    } else {
      result = [];
      var duration;
      for (var i = 0; i < rows.length; i++) {
        duration = Date.now() - rows[i]['last_updated'];
        rows[i]['last_updated'] = duration / 1000;
        ip = rows[i]['ip'];
        if (duration > 180000) {
          //Remove service from table
          //Connect to DB
          var deleteConnection = createDbConnection();
          deleteConnection.connect();
          var sqlDelete = 'delete from connected_services where id ="' + rows[i]['id'] + '"';
          logMessage(false, log.operationType.QueryData, new Date(), sqlDelete);
          var results = deleteConnection.query(sqlDelete, function deleteInactiveServer(err, resp) {
            if (err) {
              logMessage(true, log.errorType.DBError, new Date(), err);
              err.source = 'mysql';
              err.status = 500;
              next(err)
            } else {
              logMessage(false, log.operationType.ResponseReceived, new Date(), 'Successfully deleted inactive server with IP: ' + ip);
            }
          });
          deleteConnection.end();
        } else {
          result.push(rows[i]);
        }
      }
      res.json({ table: result });
    }
  });
  //Closing connection
  connection.end();
});

/* sets status */
router.post('/setStatus', function handleHeartbeatMsg(req, res, next) {
  var currentdate = Date.now();
  var newService = req.body;
  //Extracting IP address
  var parsedUrl = url.parse(newService['ip']);
  var ipAddress = parsedUrl.host;
  //Connect to DB
  var connection = createDbConnection();
  connection.connect();
  var sql = 'insert into connected_services (ip_address, type, name, description, status, last_updated) values (\'' + ipAddress + '\',\'' + newService['type'] + '\',\'' + newService['name'] + '\',\'' + newService['description'] + '\',\'' + JSON.stringify(newService['status']) + '\',' + currentdate + ') on duplicate key update type=\'' + newService['type'] + '\', name=\'' + newService['name'] + '\', description=\'' + newService['description'] + '\', status=\'' + JSON.stringify(newService['status']) + '\', last_updated=' + currentdate;
  logMessage(false, log.operationType.QueryData, new Date(), sql);
  connection.query(sql, function checkUpdateOperationStatus(err, result) {
    if (err) {
      res.json({ response: err });
    } else {
      res.json({ response: 'success' });
    }
  });
  connection.end();
});

/*Get errors_log items */
router.get('/getErrLog', function getErrLog(req, res, next) {
  var connection = createLogDbConnection();
  connection.connect();
  var query = "select * from errors_log";
  //Return query results
  var results = connection.query(query, function getLogItems(err, rows, fields) {
    if (err) {  // pass the err to error handler
      err.source = 'mysql'; // add error source for tracing
      err.status = 500;
      next(err);
    } else {
      res.send({ errorItems: rows });
    }
  });
  connection.end();
});

/*Get operations_log items */
router.get('/getOpLog', function getOpLog(req, res, next) {
  var connection = createLogDbConnection();
  connection.connect();
  var query = "select * from operations_log";
  //Return query results
  var results = connection.query(query, function getLogItems(err, rows, fields) {
    if (err) {  // pass the err to error handler
      err.source = 'mysql'; // add error source for tracing
      err.status = 500;
      next(err);
    } else {
      res.send({ operationItems: rows });
    }
  });
  connection.end();
});

/*Export errors_log table to a CSV file */
router.get('/exportErrLogToCSV', function exportErr(req, res) {
  var query = "select * from errors_log";
  var command = "node exportToCSV.js -h " + config.dbhost + " -P " + config.port + " -d " + config.dbname + " -u " + config.dbuser + " -p " + config.dbpassword + " -q \"" + query + "\" -t false -T csv -o errlog";
  var filepath = path.resolve("output/errlog.csv");
  nodeCmd.get(
    command,
    function (err, data, stderr) {
      if (!err) {
        res.download(filepath);
      }
    });
});

/*Export operations_log table to a CSV file */
router.get('/exportOpLogToCSV', function exportOp(req, res) {
  var query = "select * from operations_log";
  var command = "node exportToCSV.js -h " + config.dbhost + " -P " + config.port + " -d " + config.dbname + " -u " + config.dbuser + " -p " + config.dbpassword + " -q \"" + query + "\" -t false -T csv -o oplog";
  var filepath = path.resolve("output/oplog.csv");
  nodeCmd.get(
    command,
    function (err, data, stderr) {
      if (!err) {
        res.download(filepath);
      }
    }
  );
});

module.exports = router;
