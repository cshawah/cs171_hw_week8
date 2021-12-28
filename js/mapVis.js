/* * * * * * * * * * * * * *
*          MapVis          *
* * * * * * * * * * * * * */


class MapVis {

    constructor(parentElement, geoData, covidData, usaData) {
        this.parentElement = parentElement;
        this.covidData = covidData;
        this.usaData = usaData;
        this.geoData = geoData;
        this.displayData = [];



        // parse date method
        this.parseDate = d3.timeParse("%m/%d/%Y");

        this.initVis()
    }

    initVis() {

        let vis = this;

        vis.margin = {top: 20, right: 20, bottom: 20, left: 20};
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr('transform', `translate (0,-${vis.height + vis.margin.top})`);
            //.attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);


        vis.projection = d3.geoAlbersUsa()
            .translate([vis.width-150, vis.height / 1.5])
            .scale(1300);

        vis.path = d3.geoPath()
            .projection(vis.projection);

        vis.us = topojson.feature(vis.geoData, vis.geoData.objects.states).features;

        function fifty_states(us_data) {
            return (us_data.properties.name != 'District of Columbia' &&
                us_data.properties.name != 'United States Virgin Islands' &&
                us_data.properties.name != 'Guam' &&
                us_data.properties.name != 'Puerto Rico' &&
                us_data.properties.name != 'American Samoa' &&
                us_data.properties.name != 'Commonwealth of the Northern Mariana Islands');
        }

        vis.us = vis.us.filter(fifty_states);

        vis.viewpoint = {'width': 975, 'height': 610};
        vis.zoom = vis.width / vis.viewpoint.width;

        // adjust map position
        vis.map = vis.svg.append("g") // group will contain all state paths
            .attr("class", "states")
            .attr('transform', `scale(${vis.zoom} ${vis.zoom})`);

        vis.states = vis.map.selectAll(".state")
            .data(vis.us)
            .enter().append("path")
            .attr('class', 'state')
            .attr("d", vis.path)
            .attr("fill", "white");

        vis.tooltip = d3.select("body").append('div')
            .attr('class', "tooltip")
            .attr('id', 'mapTooltip');

        vis.wrangleData();
    }

    wrangleData() {

        let vis = this

        // check out the data
        // console.log(vis.covidData)
        // console.log(vis.usaData)

        // first, filter according to selectedTimeRange, init empty array
        let filteredData = [];

        // if there is a region selected
        if (selectedTimeRange.length !== 0) {
            //console.log('region selected', vis.selectedTimeRange, vis.selectedTimeRange[0].getTime() )

            // iterate over all rows the csv (dataFill)
            vis.covidData.forEach(row => {
                // and push rows with proper dates into filteredData
                if (selectedTimeRange[0].getTime() <= vis.parseDate(row.submission_date).getTime() && vis.parseDate(row.submission_date).getTime() <= selectedTimeRange[1].getTime()) {
                    filteredData.push(row);
                }
            });
        } else {
            filteredData = vis.covidData;
        }

        // prepare covid data by grouping all rows by state
        let covidDataByState = Array.from(d3.group(filteredData, d => d.state), ([key, value]) => ({key, value}))

        // have a look
        // console.log(covidDataByState)

        // init final data structure in which both data sets will be merged into
        vis.stateInfo = []
        vis.lookUp = []

        // merge
        covidDataByState.forEach(state => {

            // get full state name
            let stateName = nameConverter.getFullName(state.key)

            // init counters
            let newCasesSum = 0;
            let newDeathsSum = 0;
            let population = 0;

            // look up population for the state in the census data set
            vis.usaData.forEach(row => {
                if (row.state === stateName) {
                    population += +row["2020"].replaceAll(',', '');
                }
            })

            // calculate new cases by summing up all the entries for each state
            state.value.forEach(entry => {
                newCasesSum += +entry['new_case'];
                newDeathsSum += +entry['new_death'];
            });

            // populate the final data structure


            vis.stateInfo.push({

                name: stateName,
                population: population,
                absCases: newCasesSum,
                absDeaths: newDeathsSum,
                relCases: (newCasesSum / population * 100),
                relDeaths: (newDeathsSum / population * 100)})

            vis.lookUp[stateName] = {name: stateName,
                population: population,
                absCases: newCasesSum,
                absDeaths: newDeathsSum,
                relCases: (newCasesSum / population * 100),
                relDeaths: (newDeathsSum / population * 100)}

        });

        console.log('final data structure for map', vis.stateInfo);
        console.log(vis.lookUp);

        vis.updateMap()


    };

    updateMap() {

        let vis = this;

        vis.colorScale = d3.scaleSequential(d3.interpolate("white", "#428A8D"))
            .domain([0,
                d3.max(vis.stateInfo, function (d) {return d[selectedCategory]})]);

        //d3.min(vis.stateInfo, function (d) {return d['absDeaths']})

        let states = vis.states
            .data(vis.us);


        states.enter()
            .merge(states)
            .attr("fill", (d) => vis.colorScale(vis.lookUp[d.properties.name][selectedCategory]))
            .on('mouseover', function(event, d){
                d3.select(this)
                    .attr('stroke-width', '2px')
                    .attr('stroke', 'black')
                    .attr('fill', 'GoldenRod')
                vis.tooltip
                    .style("opacity", 1)
                    .style("left", event.pageX + 20 + "px")
                    .style("top", event.pageY + "px")
                    .html(`
                         <div style="border: thin solid grey; border-radius: 5px; background: lightgrey; padding: 20px">
                             <h3>${d.properties.name}<h3>
                             <h4> Population: ${vis.lookUp[d.properties.name].population}</h4>
                             <h4> Cases (absolute): ${vis.lookUp[d.properties.name].absCases}</h4>
                             <h4> Deaths (absolute): ${vis.lookUp[d.properties.name].absDeaths}</h4>
                             <h4> Cases (relative): ${vis.lookUp[d.properties.name].relCases.toFixed(2)}</h4>
                             <h4> Deaths (relative): ${vis.lookUp[d.properties.name].relDeaths.toFixed(2)}</h4>
                         </div>`)})
            .on('mouseout', function(event, d){
                d3.select(this)
                    .attr('stroke-width', '0px')
                    .attr("fill", (d) => vis.colorScale(vis.lookUp[d.properties.name][selectedCategory]))
                vis.tooltip
                    .style("opacity", 0)
                    .style("left", 0)
                    .style("top", 0)
                    .html(``);
            });

        vis.legendScale = d3.scaleLinear()
            .range([1, 300])
            .domain(vis.colorScale.domain());

        vis.legendAxis = d3.axisBottom()
            .scale(vis.legendScale)
            .ticks(4);

        vis.legendAxisGroup = vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", "translate("+ vis.width/2 + ","+ vis.height/1.05 + ")");

        vis.svg.select(".x-axis")
            .transition()
            .duration(400)
            .call(vis.legendAxis);

        ///////////////////
        // USED THIS WEBSITE FOR GRADIENT HELP: https://www.freshconsulting.com/insights/blog/d3-js-gradients-the-easy-way/
        ///////////////////

        vis.defs = vis.svg.append('defs');

        vis.gradient = vis.defs.append('linearGradient')
            .attr('id', 'svgGradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '100%')
            .attr('y2', '100%');

        vis.gradient.append('stop')
            .attr('class', 'start')
            .attr('offset', '0%')
            .attr('stop-color', 'white')
            .attr('stop-opacity', 1);

        vis.gradient.append('stop')
            .attr('class', 'end')
            .attr('offset', '100%')
            .attr('stop-color', "#428A8D")
            .attr('stop-opacity', 1);

        vis.svg.append("rect")
            .data(d3.range(300))
            .attr("x", vis.width/2)
            .attr("y", vis.height/1.09)
            .attr("width", 300)
            .attr("height", 15)
            .attr("fill", 'url(#svgGradient)');


    }
}