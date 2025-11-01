import * as d3 from 'd3'
// import { getDefaultFontSize } from '../../utils/helper';

class ScatterplotD3 {
    margin = {top: 100, right: 10, bottom: 50, left: 100};
    size;
    height;
    width;
    matSvg;
    // add specific class properties used for the vis render/updates
    defaultOpacity=0.3;
    transitionDuration=1000;
    circleRadius = 3;
    xScale;
    yScale;


    constructor(el){
        this.el=el;
    };

    create = function (config) {
        this.size = {width: config.size.width, height: config.size.height};

        // get the effect size of the view by subtracting the margin
        this.width = this.size.width - this.margin.left - this.margin.right;
        this.height = this.size.height - this.margin.top - this.margin.bottom ;
        console.log("create SVG width=" + (this.width + this.margin.left + this.margin.right ) + " height=" + (this.height+ this.margin.top + this.margin.bottom));
        // initialize the svg and keep it in a class property to reuse it in renderScatterplot()
        this.matSvg=d3.select(this.el).append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("class","matSvgG")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
        ;

        this.xScale = d3.scaleLinear().range([0,this.width]);
        this.yScale = d3.scaleLinear().range([this.height,0]);

        // build xAxisG
        this.matSvg.append("g")
            .attr("class","xAxisG")
            .attr("transform","translate(0,"+this.height+")")
        ;
        this.matSvg.append("g")
            .attr("class","yAxisG")
        ;

         this.brushG = this.matSvg.append("g")
            .attr("class", "brush");
            
        // Create brush
        this.brush = d3.brush()
            .extent([[0, 0], [this.width, this.height]])
            .on("brush", (event) => this.brushed(event))
            .on("end", (event) => this.brushEnded(event));
            
        this.brushG.call(this.brush);
    }

   brushed(event) {
    if (!event.selection) return;
    const [[x0, y0], [x1, y1]] = event.selection;
    
    // Find points within brush selection
    const selected = this.currentData.filter(d => {
        const x = this.xScale(d[this.currentXAttribute]);
        const y = this.yScale(d[this.currentYAttribute]);
        return x >= x0 && x <= x1 && y >= y0 && y <= y1;
    });

    if (this.controllerMethods?.updateSelectedItems) {
        this.controllerMethods.updateSelectedItems(selected, 'scatterplot');
    }
}
    
    brushEnded(event) {
        if (!event.selection) {
            if (this.controllerMethods?.updateSelectedItems) {
                this.controllerMethods.updateSelectedItems([], 'scatterplot');
            }
        }
    }

    updateMarkers(selection,xAttribute,yAttribute){
        // transform selection
        selection
            .transition().duration(this.transitionDuration)
            .attr("transform", (item)=>{
                // use scales to return shape position from data values
                const xPos = this.xScale(item[xAttribute]);
                const yPos = this.yScale(item[yAttribute]);
                return "translate("+xPos+","+yPos+")";
            })
        ;
        selection.style("opacity",this.defaultOpacity);
        selection.select(".markerCircle")
            .attr("fill", "black");
    }

    highlightSelectedItems(selectedItems) {
        if (!this.matSvg) return;
        const selectedIndices = new Set(selectedItems.map(d => d.index));

        this.matSvg.selectAll(".markerG")
            .transition().duration(300)
            .style("opacity", d => {
                return selectedItems.length === 0 ? this.defaultOpacity : selectedIndices.has(d.index) ? 1 : 0.1;
            });

        this.matSvg.selectAll(".markerCircle")
            .transition().duration(300)
            .attr("fill", d => selectedIndices.has(d.index) ? "purple" : "black");
        }



    updateAxis = function(visData,xAttribute,yAttribute){
        // compute min max using d3.min/max(visData.map(item=>item.attribute))
        const minXAxis = d3.min(visData.map((item)=>{return item[xAttribute]}));
        const maxXAxis = d3.max(visData.map((item)=>{return item[xAttribute]}));
        const minYAxis = d3.min(visData.map((item)=>{return item[yAttribute]}));
        const maxYAxis = d3.max(visData.map((item)=>{return item[yAttribute]}));

        this.xScale.domain([minXAxis,maxXAxis]);
        this.yScale.domain([minYAxis,maxYAxis]);

        // create axis with computed scales
        this.matSvg.select(".xAxisG")
            .transition().duration(500)
            .call(d3.axisBottom(this.xScale))
        ;
        this.matSvg.select(".yAxisG")
            .transition().duration(500)
            .call(d3.axisLeft(this.yScale))
    }


    renderScatterplot = function (visData, xAttribute, yAttribute, controllerMethods){
        console.log("render scatterplot with a new data list ...")
        
        this.currentData = visData;
        this.currentXAttribute = xAttribute;
        this.currentYAttribute = yAttribute;
        this.controllerMethods = controllerMethods;

        this.updateAxis(visData, xAttribute, yAttribute);

        this.matSvg.selectAll(".markerG")
            // all elements with the class .markerG (empty the first time)
            .data(visData,(itemData)=>itemData.index)
            .join(
                enter=>{
                    // all data items to add:
                    // doesn’exist in the select but exist in the new array
                    const itemG=enter.append("g")
                        .attr("class","markerG")
                        .style("opacity",this.defaultOpacity)
                    ;
                    // render element as child of each element "g"
                    itemG.append("circle")
                        .attr("class", "markerCircle")
                        .attr("r", this.circleRadius)
                        .attr("stroke", "none")
                        .attr("fill", "black")
                    ;
                    this.updateMarkers(itemG,xAttribute,yAttribute);
                },
                update=>{
                    this.updateMarkers(update,xAttribute,yAttribute)
                },
                exit =>{
                    exit.remove()
                    ;
                }

            )
    }

    clear = function(){
        d3.select(this.el).selectAll("*").remove();
    }
}
export default ScatterplotD3;