/* * * * * * * * * * * * * *
*           MAIN           *
* * * * * * * * * * * * * */

// init global variables & switches
let myDataTable,
    myMapVis,
    myBarVisOne,
    myBarVisTwo,
    myBrushVis;

let selectedTimeRange = [];
let selectedState = '';


// load data using promises
let promises = [

    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),  // not projected -> you need to do it
 //   d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json"), // already projected -> you can just scale it to ft your browser window
    d3.csv("data/covid_data.csv"),
    d3.csv("data/census_usa.csv")
];

Promise.all(promises)
    .then(function (data) {
        initMainPage(data)
    })
    .catch(function (err) {
        console.log(err)
    });

// initMainPage
function initMainPage(dataArray) {

    // log data
    console.log('check out the data', dataArray);

    // init table
    myDataTable = new DataTable('tableDiv', dataArray[1], dataArray[2]);

    // init map
    myMapVis = new MapVis('mapDiv', dataArray[0], dataArray[1], dataArray[2]);

    // init bars
    myBarVisOne = new BarVis('barsTopTen', dataArray[1], dataArray[2], 1, 'Ten Highest States');
    myBarVisTwo = new BarVis('barsBottomTen', dataArray[1], dataArray[2], 0, 'Ten Lowest States');

    // init brush
    myBrushVis = new BrushVis('brushDiv', dataArray[1]);
}

let selectedCategory = document.getElementById("categorySelector").value;

function categoryChange() {
    selectedCategory = document.getElementById("categorySelector").value
    myMapVis.wrangleData();
    myBarVisOne.wrangleData();
    myBarVisTwo.wrangleData();
}


