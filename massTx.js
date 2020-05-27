var request = require('request');
var fs = require('fs');
let json = require('./config.json')
let bulk = this


// Split an array of objects in multiple chunks
function chunkArray(myArray, chunk_size) {
  var results = [];

  while (myArray.length) {
    results.push(myArray.splice(0, chunk_size));
  }

  return results;
}

// Prepare groups of 99 receivers for bulk payment as bulk payment in LTO Network does not work > 99
module.exports.prepareTxs = function(receivers) {

  var results = chunkArray(receivers, json.common.maxmasstransfertxs);

  for (var i in results) {
    bulk.makeSingMassTx(results[i])
  }
}

// Bulk payment function
// Consume config file config.json as input
// Creates a transaction (up to 99 receivers )
module.exports.makeSingMassTx = function(receivers) {
  return new Promise(function(resolve, reject) {

    const masstransferversion = json.common.masstransferversion;
    const masstransfertype = json.common.masstransfertype;
    const transferfee = json.common.transferfee;
    const masstransferfee = json.common.masstransferfee;
    const node = json.node;

    var arrayReceivers = []
    for (var i in receivers) {

      arrayReceivers.push({
        "amount": receivers[i].amount * json.common.lto_digits,
        "fee": 25000000,
        "sender": json.node.wallet,
        "recipient": receivers[i].address
      })
    }

    var masstransactionpayment = {
      "version": masstransferversion,
      "type": masstransfertype,
      "sender": node.wallet,
      "fee": transferfee + (masstransferfee * arrayReceivers.length),
      "transfers": arrayReceivers
    }
    console.log(masstransactionpayment)

    request.post({
      url: node.myquerynode + '/transactions/sign',
      json: masstransactionpayment,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api_key": node.apiKey
      }
    }, function(err, res) {

      if (err || res.body.error) {
        const error = err || res.body;

        console.log(JSON.stringify(error));
        return;
      }

      request.post({
        url: node.myquerynode + '/transactions/broadcast',
        json: res.body,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "api_key": node.apiKey
        }
      }, function(err, res) {
        if (err || res.body.error) {
          const error = err || res.body;

          console.log(error);
          return;
        }
        var options = {
          parse_mode: "HTML",
          disable_web_page_preview: true,


        };

        resolve(res.body.id)
      })
    })
  })
}