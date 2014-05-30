(function() {
    var http = require('http'),
        fs = require('fs'),
        //xml2js = require('xml2js'), Shitty little parser.  Only good for building XML.
        //xmlBuilder = new xml2js.Builder(),
        libxmljs = require("libxmljs");

    var namespaces = {
        'soap-env': 'http://schemas.xmlsoap.org/soap/envelope/', // probably not needed
        'xmlns': 'http://www.switchfly.com/switchfly/R14/header'
    };

    http.createServer(function(req, res) {
        var requestBody = '';

        req.on('data', function(chunk) {
            requestBody += chunk;
        });

        req.on('end', function() {
            console.log('Request body: ' + requestBody);

            var requestId = _getRequestId(requestBody),
                responseResource = _getResponseResourceName(requestBody);

            _acknowledge(res);

            setTimeout(function() {
                console.log('Rise!!');
                fs.readFile(responseResource, function(err, data) {
                    var responseDoc = _parseXmlString(data);
                    _setRequestId(responseDoc, requestId); // echo requestId from request in response.
                    _sendResponse(responseDoc);
                });

            }, 1000);  // Sleep for 31+ seconds to test error scenarios
        });

    }).listen(1337, '127.0.0.1');

    var _acknowledge = function(res) {
        fs.readFile('resources/ack.xml', function(err, data) {
            res.writeHead(200, {'Content-Type': 'application/xml'});
            res.end(_parseXmlString(data).toString());
        });
    };

    var _getRequestId = function(xml) {
        if (!xml) {
            return '';
        }
        return _parseXmlString(xml).get('string(//xmlns:PayloadInfo/@RequestId)', namespaces);
    };

    var _setRequestId = function(xmlDoc, requestId) {
        var payloadInfoElement = xmlDoc.get('//xmlns:PayloadInfo', namespaces);
        payloadInfoElement.attr({'RequestId': requestId});
    };

    var _getResponseResourceName = function(xml) {
        if (!xml) {
            return '';
        }
        var requestType = _parseXmlString(xml).get('string(//xmlns:PayloadDescriptor/@Name)', namespaces);
        return  'resources/' + requestType.replace('RQ', 'RS') + '.xml';
    };

    var _sendResponse = function(responseDoc) {
        var postOptions = {
            path: 'http://distribution.143mirror.dev/api/disney',
            method: 'POST',
            headers: { 'Content-Type': 'application/xml'}
        };

        var post = http.request(postOptions, function(res) {
            res.on('data', function(chunk) {
               console.log('Response: ' + chunk);
            });
        });

        console.log("Sending response to " + postOptions.path + ": " + responseDoc.toString());
        post.write(responseDoc.toString());
        post.end();
    };

    var _parseXmlString = function(xml) {
        return libxmljs.parseXmlString(xml)
    };

    console.log('Server running at http://127.0.0.1:1337/');
})();