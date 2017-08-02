//Update view with table values
setInterval(function () {
  $.getJSON('http://127.0.0.1:3000/table', function (data) {
    var tr = '<tr class="table-active"><th>IP</th><th>Type</th><th>Name</th><th>Description</th><th>Status</th><th>Last Contacted (seconds ago)</th></tr>';
    var color;
    var displayStatus;
    var jsonStatus;
    for (i = 0; i < data['table'].length; i++) {
      var item = data['table'][i];
      if (item['last_updated'] > 60 && item['last_updated'] < 120)
        color = 'class="bg-warning"';
      else if (item['last_updated'] > 120)
        color = 'class="bg-danger"';
      else
        color = 'class="bg-success"';
      displayStatus = '';
      if (item['status']) {
        jsonStatus = JSON.parse(item['status']);
        displayStatus += '<ul>';
        for (var name in jsonStatus) {
          displayStatus += '<li>' + name + ' :' + jsonStatus[name] + '</li>';
        }
        displayStatus += '</ul>';
      } else {
        displayStatus = 'N/A';
      }
      tr += '<tr><td>' + item['ip_address'] + '</td><td>' + item['type'] + '</td><td>' + item['name'] + '</td><td>' + item['description'] + '</td><td style="width:30%">' + displayStatus + '</td><td ' + color + '>' + item['last_updated'] + '</td></tr>';
    }
    $('table').html(tr);
  })
}, 2000);