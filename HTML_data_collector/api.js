const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());

app.post('/', (req, res) => {
  try {
    fs.appendFileSync('data.json', JSON.stringify(req.body) +',' + '\n', (error) => {
      if (error) {
        console.log('Error during file saving. ', error.message);
        res.send('Server data error');
      } else {
        console.log('File saved');
        res.send('Data succesfully saved');
      }
    });
  } catch (error) {
    console.log('File saving error. ', error.message);
    res.send('Server error');
  }
});

app.all('*', (req, res) => {
  res.send('Unknown request');
});

app.listen(4700, () => console.log('server started'));