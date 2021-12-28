/* * * * * * * * * * * * * *
*      class BarVis        *
* * * * * * * * * * * * * */


class BarVis {

    constructor(parentElement, covidData, usaData, top, title){
        this.parentElement = parentElement;
        this.covidData = covidData;
        this.usaData = usaData;
        this.top = top;
        this.title = title;
        this.displayData = [];

        // parse date method
        this.parseDate = d3.timeParse("%m/%d/%Y");

        this.initVis()
    }

    initVis(){
        let vis = this;

        vis.margin = {top: 20, right: 60, bottom: 60, left: 60};
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append('g')
            .attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);

        // add title
        vis.svg.append('g')
            .attr('class', 'title bar-title')
            .append('text')
            .text(this.title)
            .attr('transform', `translate(${vis.width / 2}, 10)`)
            .attr('text-anchor', 'middle');


        vis.x = d3.scaleBand()
            .rangeRound([0, vis.width])
            .paddingInner(0.3);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);

        vis.xAxisGroup = vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", "translate(0,"+ vis.height + ")");

        vis.yAxisGroup = vis.svg.append("g")
            .attr("class", "y-axis axis")
            .attr("transform", "translate(0,0)");

        // tooltip
        vis.tooltip = d3.select("body").append('div')
            .attr('class', "tooltip")
            .attr('id', 'barTooltip')

        this.wrangleData();
    }

    wrangleData(){
        let vis = this
        // Pulling this straight from dataTable.js
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
        
        // init final data structure in which both data sets will be merged into
        vis.stateInfo = []

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
            vis.stateInfo.push(
                {
                    state: stateName,
                    population: population,
                    absCases: newCasesSum,
                    absDeaths: newDeathsSum,
                    relCases: (newCasesSum / population * 100),
                    relDeaths: (newDeathsSum / population * 100)
                }
            )
        })

        function fifty_states(us_data) {
            return (us_data.state != 'District of Columbia' &&
                us_data.state != 'US Virgin Islands' &&
                us_data.state != 'Guam' &&
                us_data.state != 'Puerto Rico' &&
                us_data.state != 'American Samoa' &&
                us_data.state != 'Commonwealth of the Northern Mariana Islands');
        }

        vis.stateInfo = vis.stateInfo.filter(fifty_states);


        if (vis.top === 0){
            vis.stateInfo.sort((a,b) => {return a[selectedCategory] - b[selectedCategory]})
        } else {
            vis.stateInfo.sort((a,b) => {return b[selectedCategory] - a[selectedCategory]})
        }

        console.log('final data structure', vis.stateInfo);

        vis.topTenData = vis.stateInfo.slice(0, 10)

        console.log('final data structure', vis.topTenData);


        vis.updateVis()

    }

    updateVis(){
        let vis = this;

        vis.x.domain(vis.topTenData.map(d => d.state));
        vis.y.domain([0, d3.max(vis.topTenData, function (d) {return d[selectedCategory]})]);

        vis.colorScale = d3.scaleSequential(d3.interpolate("white", "#428A8D"))
            .domain([0,
                d3.max(vis.stateInfo, function (d) {return d[selectedCategory]})]);

        vis.rect = vis.svg.selectAll("rect")
            .data(vis.topTenData);

        vis.rect.enter()
            .append("rect")

            // Enter and Update (set the dynamic properties of the elements)
            .merge(vis.rect)
            .attr("class", "bar")
            .attr("stroke", "none")
            .attr("fill", (d) => (vis.colorScale(d[selectedCategory])))
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
                                 <h3>${d.state}<h3>
                                 <h4> Population: ${d.population}</h4>
                                 <h4> Cases (absolute): ${d.absCases}</h4>
                                 <h4> Deaths (absolute): ${d.absDeaths}</h4>
                                 <h4> Cases (relative): ${d.relCases.toFixed(2)}</h4>
                                 <h4> Deaths (relative): ${d.relDeaths.toFixed(2)}</h4>
                             </div>`)})
            .on('mouseout', function(event, d){
                d3.select(this)
                    .attr('stroke-width', '0px')
                    .attr("fill", (d) => vis.colorScale(d[selectedCategory]))
                vis.tooltip
                    .style("opacity", 0)
                    .style("left", 0)
                    .style("top", 0)
                    .html(``);
            })
            .transition()
            .duration(400)
            .attr("y", (d) => vis.y(d[selectedCategory]))
            .attr("x", (d) => vis.x(d.state))
            .attr("width", vis.x.bandwidth())
            .attr("height", (d) => (vis.height - vis.y(d[selectedCategory])));

        vis.svg.select(".x-axis")
            .transition()
            .duration(400)
            .call(vis.xAxis);

        vis.svg.select(".y-axis")
            .transition()
            .duration(400)
            .call(vis.yAxis);

        vis.xAxisGroup.selectAll("text")
            .attr("transform", "rotate(30) translate(0,20)");

    }


}