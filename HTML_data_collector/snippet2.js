const axios = require('axios');
const HTMLParser = require('node-html-parser');

let mainData = [];
let pageNumber = 1;
let maxPageNumber = 1;

let minPriceFilter = 0;
let maxPriceFilter = 1000;

let finished = false;

// exchange url
const url2 = `https://www.olx.pl/d/motoryzacja/samochody/fiat/?search%5Bfilter_float_price:from%5D=exchange`;

const adsNumberFunction = (root) => {
  let adsNumber;
  try{
    let container = Object.entries(root.querySelector('div[data-testid="total-count"]'))[1][1];
    adsNumber = Object.entries(container[0])[3][1].replace(/\D/g, '');}
     catch {};
  return adsNumber
}

const addPositionsToDataBase = (root) => {
  let titles = root.querySelectorAll('h6.css-v3vynn-Text.eu5v0x0');
  let prices = root.querySelectorAll('p.css-wpfvmn-Text.eu5v0x0');
  let locations = root.querySelectorAll('p.css-p6wsjo-Text.eu5v0x0');
  let links = root.querySelectorAll('a.css-1bbgabe');

  for (let i = 0; i < titles.length; i++) {
    let dataObject = { title: '', price: '', location: '', link: '' };
    links[i]._rawAttrs.href.includes('/d/')
     ? (dataObject.link =
       'https://www.olx.pl/' + links[i]._rawAttrs.href.split('/d/')[1])
     : (dataObject.link = links[i]._rawAttrs.href);
    dataObject.price = Number(
     Object.entries(prices)
      [i][1].innerHTML.split('zł')[0]
      .replace(/ /g, '')
    );
    dataObject.location =
     Object.entries(locations)[i][1].innerHTML.split(' - ')[0];
    dataObject.title = Object.entries(titles)[i][1].innerHTML;
    mainData.push(dataObject);
    dataSender(dataObject);
   }
}

class DataTaker {
 constructor(url) {
  this.url = url;
  this.throottling = () => {
   return new Promise((resolve) => setTimeout(resolve, 200));
  };
 }
 getData = async () => {
  try {
   await this.throottling();
   const response = await axios.get(this.url);
   return response.data;
  } catch (error) {
   console.log('Gathering data error');
  }
 };
}

class DataExchange {
  constructor(url){
    this.url = url;
  }
  loadData = async () => {
    try {
      const tempDataExchange = new DataTaker(this.url);
      const data = await tempDataExchange.getData(); 
      const root = HTMLParser.parse(data); // node-html-parser
      const adsNumber = adsNumberFunction(root);

      if (!adsNumber) { 
        console.log('No exchange ads');
        return;
        } else {
          console.log('Ads in exchange: ' + adsNumber);
          addPositionsToDataBase(root);
        };
      } catch (error) { console.log('Extracting data error') };
    }
  }

class DataExtractor {
  constructor(minPriceFilter, maxPriceFilter, pageNumber, maxPageNumber) {
    this.minPriceFilter = minPriceFilter;
    this.maxPriceFilter = maxPriceFilter;
    this.pageNumber = pageNumber;
    this.maxPageNumber = maxPageNumber;
    this.url = `https://www.olx.pl/d/motoryzacja/samochody/fiat/?search%5Bfilter_float_price%3Afrom%5D=${this.minPriceFilter}&search%5Bfilter_float_price%3Ato%5D=${this.maxPriceFilter}&page=${this.pageNumber}`;
  }
  loadData = async () => {
    try {
      let tempDataFilters = new DataTaker(this.url);
      const data = await tempDataFilters.getData(); 
      const root = HTMLParser.parse(data); // node-html-parser
      let adsNumber = adsNumberFunction(root);

      console.log('minPriceFilter =', minPriceFilter, ', maxPriceFilter =', maxPriceFilter, ', Ads in price range: ' + adsNumber);
      addPositionsToDataBase(root);

      if (this.maxPageNumber === 1) {
        for (let i = 1; i < 4; i++) {
          try {
            isNaN(root.querySelectorAll('a.css-1mi714g')[i].innerHTML) === false
              ? (maxPageNumber = root.querySelectorAll('a.css-1mi714g')[i].innerHTML,
                  this.maxPageNumber = root.querySelectorAll('a.css-1mi714g')[i].innerHTML
                )
                : next();
            } 
            catch (error) {};
        }
      };
          
      console.log('Max sub pages in range: ' + this.maxPageNumber, '. Current sub page: ', this.pageNumber, ' .Data positions: ' + mainData.length);

      if(this.pageNumber < this.maxPageNumber){
        pageNumber++} else {
          console.log('Result in number of positions: ' + mainData.length),
          maxPageNumber = 1;
          pageNumber = 1;
          if(this.minPriceFilter > 45000){ 
            maxPriceFilter = 999999999 } else {
            minPriceFilter = Number(maxPriceFilter) + 1;
            maxPriceFilter += 1000;
          };
      };
    } catch (error) { console.log('Extracting data error') };
  };
}

const dataSender = async (dataObject) => {
 axios
  .post('http://localhost:4700', dataObject)
  .then((res) => console.log(res.data, res.status, res.statusText))
  .catch(function (error) {
   console.log('data sent error', error.message);
  });
};

;


let extractDataExchange = new DataExchange( url2 ); 

const loop = async () => {
  return new Promise(async (resolve, reject) => {
    // ads on exchange
    await extractDataExchange.loadData()
    const inner = async () => {
      if (!finished) {
        // ads with price
        let extractData = new DataExtractor( minPriceFilter, maxPriceFilter, pageNumber, maxPageNumber ); 
        await extractData.loadData();
        if (maxPriceFilter === 999999999) {
          finished = true;
          resolve();
          console.log('End of data loading');
          return;
          } else {
            return inner();
          }
      }
    };
    await inner();
  });
};

loop();