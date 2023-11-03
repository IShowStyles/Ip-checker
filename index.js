const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const app = express();
let ipRanges = [];

function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc * 256) + parseInt(octet, 10), 0);
}

function intToIPv4(intVal) {
  const part1 = intVal >>> 24;
  const part2 = (intVal >>> 16) & 255;
  const part3 = (intVal >>> 8) & 255;
  const part4 = intVal & 255;
  return [part1, part2, part3, part4].join('.');
}

function findCountry(ip) {
  const ipInt = ipToInt(ip);
  for (let range of ipRanges) {
    if (ipInt >= range.from && ipInt <= range.to) {
      return {country: range.country, range: `${intToIPv4(range.from)}-${intToIPv4(range.to)}`};
    }
  }
  return {country: 'Unknown', range: ''};
}

fs.createReadStream('IP2LOCATION-LITE-DB1.CSV')
    .pipe(csv())
    .on('data', (row) => {
      const data = Object.values(row);
      ipRanges.push({
        from: ipToInt(data[0]),
        to: ipToInt(data[1]),
        country: data[2]
      });
    })
    .on('end', () => {
      console.log('IP ranges loaded:', ipRanges.length);
    });

app.use((req, res, next) => {
  req.realIp = req.ip.replace(/^.*:/, ''); // IPv4 compatibility
  next();
});

app.get('/check-ip/:ip', (req, res) => {
  const ip = req.params.ip;
  const {country, range} = findCountry(ip);

  if (country === 'Unknown') {
    return res.json({
      success: false,
      message: `IP address ${ip} not found in any ranges.`,
    });
  }

  return res.json({
    success: true,
    message: `IP address ${ip} is located within range ${range}, ${country}.`,
  });
});

app.get('/', (req, res) => {
  const {realIp} = req;
  const {country, range} = findCountry(realIp);
  res.json({ip: realIp, range, country});
});
app.listen(3000, () => console.log('Server running on port 3000'));