import * as d3 from "d3";

export default class ParallelCoordinatesD3 {
    constructor({ svg, width, height, onSelectionChange }) {
        this.margin = { top: 60, right: 30, bottom: 30, left: 30 };
        this.width = width - this.margin.left - this.margin.right;
        this.height = height - this.margin.top - this.margin.bottom;
        this.svg = d3.select(svg)
            .attr("width", width)
            .attr("height", height);
        this.onSelectionChange = onSelectionChange;
        this.activeSelections = new Map();

        // Initialize colorScale without a fixed domain/range here
        // It will be set dynamically in updateData
        this.colorScale = d3.scaleOrdinal(); 

        this.dimensions = [
            'price', 'area', 'bedrooms', 'bathrooms', 'stories', 'mainroad',
            'guestroom', 'basement', 'hotwaterheating', 'airconditioning',
            'parking', 'prefarea', 'furnishingstatus'
        ];

        this.y = {};
        
        this.x = d3.scalePoint()
            .domain(this.dimensions)
            .range([0, this.width])
            .padding(0.8);

        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        this.linesGroup = this.g.append("g").attr("class", "lines-group");
        this.axesGroup = this.g.append("g").attr("class", "axes-group");

        this.legendGroup = this.svg.append("g")
            .attr("class", "legend-group")
            .attr("transform", `translate(${width - 150}, 20)`);

        this.lineGenerator = d3.line()
            .defined(p => p[1] !== undefined && p[1] !== null)
            .x(p => p[0])
            .y(p => p[1]);
    }

    updateData(data) {
        this.data = data;

        // --- Dynamic Color Scale Update ---
        // Get all unique furnishing statuses present in the data
        const uniqueFurnishingStatuses = Array.from(new Set(
            data.map(d => d.furnishingstatus)
                .filter(v => v !== undefined && v !== null && v !== "") // Filter out missing status
        )).sort(); // Sort for consistent legend order

        // Define a set of colors. You can extend this if more categories appear.
        const customColors = ['#1f77b4', '#2ca02c', '#ff7f0e', '#d62728', '#9467bd', '#8c564b']; 
        // If you expect more than 3, add more colors here, or use a d3 scheme like d3.schemeCategory10.
        // For example: const customColors = d3.schemeCategory10;

        this.colorScale
            .domain(uniqueFurnishingStatuses) // Set the domain dynamically
            .range(customColors.slice(0, uniqueFurnishingStatuses.length)); // Use only as many colors as needed

        this.x.range([0, this.width]).domain(this.dimensions);

        this.dimensions.forEach(dimension => {
            if (['price', 'area', 'bedrooms', 'bathrooms', 'stories', 'parking'].includes(dimension)) {
                this.y[dimension] = d3.scaleLinear()
                    .domain(d3.extent(data, d => +d[dimension]))
                    .range([this.height, 0])
                    .nice();
            } else {
                const uniqueValues = Array.from(new Set(
                    data.map(d => d[dimension])
                        .filter(v => v !== undefined && v !== null && v !== "")
                )).sort();
                this.y[dimension] = d3.scalePoint()
                    .domain(uniqueValues)
                    .range([this.height, 0])
                    .padding(0.5);
            }
        });

        const axes = this.axesGroup.selectAll('.axis')
            .data(this.dimensions, d => d)
            .join(
                enter => enter.append('g')
                    .attr('class', 'axis')
                    .attr('transform', d => `translate(${this.x(d)},0)`),
                update => update
                    .transition(this.addTransitions(d3.transition()))
                    .attr('transform', d => `translate(${this.x(d)},0)`),
                exit => exit.remove()
            );

        axes.each((d, i, nodes) => {
            const axisG = d3.select(nodes[i]);

            axisG.selectAll('*').remove();

            axisG.call(d3.axisLeft(this.y[d]));
            
            axisG.append("text")
                .attr("class", "axis-title")
                .attr("y", -this.margin.top / 2)
                .attr("x", 0)
                .attr("text-anchor", "middle")
                .style("fill", "black")
                .style("font-weight", "bold")
                .style("font-size", "10px")
                .text(d);

            axisG.select(".domain").remove();

            if (!['price', 'area', 'bedrooms', 'bathrooms', 'stories', 'parking'].includes(d)) {
                axisG.selectAll(".tick text")
                    .style("text-anchor", "end")
                    .attr("dx", "-0.8em")
                    .attr("dy", "0.15em")
                    .attr("transform", "rotate(-30)");
            } else {
                axisG.selectAll(".tick text")
                    .style("text-anchor", "end")
                    .attr("dx", "-0.5em")
                    .attr("dy", "0.32em")
                    .attr("transform", null);
            }
        });
        
        this.linesGroup.selectAll('.line')
            .data(this.data, d => d.index)
            .join(
                enter => enter.append('path')
                    .attr('class', 'line')
                    .attr('d', d => this.lineGenerator(
                        this.dimensions.map(dim => [this.x(dim), this.y[dim](d[dim])])
                    ))
                    .style('fill', 'none')
                    .style('stroke', d => this.colorScale(d.furnishingstatus))
                    .style('opacity', 0.3)
                    .on('mouseover', (event, d) => this.highlightLine(d))
                    .on('mouseout', () => this.unhighlightLine()),
                update => update
                    .transition(this.addTransitions(d3.transition()))
                    .attr('d', d => this.lineGenerator(
                        this.dimensions.map(dim => [this.x(dim), this.y[dim](d[dim])])
                    ))
                    .style('stroke', d => this.colorScale(d.furnishingstatus)),
                exit => exit.remove()
            );

        this.dimensions.forEach(dimension => {
            const brush = d3.brushY()
                .extent([[this.x(dimension) - 10, 0], [this.x(dimension) + 10, this.height]])
                .on('brush', (event) => this.brushed(event, dimension))
                .on('end', (event) => this.brushEnded(event, dimension));

            this.g.selectAll(`.brush-${dimension}`)
                .data([null])
                .join('g')
                .attr('class', `brush brush-${dimension}`)
                .call(brush);
        });

        this.drawLegend(); 
    }

    drawLegend() {
        const legendRectSize = 10;
        const legendSpacing = 4;

        const legendItems = this.legendGroup.selectAll(".legend-item")
            .data(this.colorScale.domain()) // Now, this domain is dynamic
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", "legend-item")
                        .attr("transform", (d, i) => `translate(0, ${i * (legendRectSize + legendSpacing)})`);
                    
                    g.append("rect")
                        .attr("width", legendRectSize)
                        .attr("height", legendRectSize)
                        .style("fill", d => this.colorScale(d));

                    g.append("text")
                        .attr("x", legendRectSize + legendSpacing)
                        .attr("y", legendRectSize / 2)
                        .attr("dy", "0.35em")
                        .style("font-size", "10px")
                        .text(d => d);
                    return g;
                },
                update => update
                    .transition(this.addTransitions(d3.transition()))
                    .attr("transform", (d, i) => `translate(0, ${i * (legendRectSize + legendSpacing)})`)
                    .call(update => {
                        update.select("rect").style("fill", d => this.colorScale(d));
                        update.select("text").text(d => d);
                    }),
                exit => exit.remove()
            );
    }

    highlightLine(d) {
        this.linesGroup.selectAll('.line')
            .filter(item => item === d)
            .raise()
            .transition()
            .duration(100)
            .style('stroke', 'red')
            .style('stroke-width', 2.5)
            .style('opacity', 1);

        this.linesGroup.selectAll('.line')
            .filter(item => item !== d)
            .transition()
            .duration(100)
            .style('opacity', 0.1);
    }

    unhighlightLine() {
        if (this.activeSelections.size === 0) {
            this.linesGroup.selectAll('.line')
                .transition()
                .duration(100)
                .style('stroke', d => this.colorScale(d.furnishingstatus))
                .style('stroke-width', 1.5)
                .style('opacity', 0.3);
        } else {
            this.updateSelection();
        }
    }

    brushed(event, dimension) {
        if (!event.selection) {
            this.activeSelections.delete(dimension);
        } else {
            this.activeSelections.set(dimension, event.selection);
        }
        this.updateSelection();
    }

    updateSelection(selectedItems) {
        if (!this.g || !this.data) return;

        if (selectedItems !== undefined) {
            const selectedIndices = new Set(selectedItems.map(d => d.index));
            this.linesGroup.selectAll('.line')
                .transition()
                .duration(300)
                .style('stroke', d => selectedIndices.has(d.index) ? 'purple' : this.colorScale(d.furnishingstatus))
                .style('stroke-width', d => selectedIndices.has(d.index) ? 2.5 : 1.5)
                .style('opacity', d => selectedIndices.has(d.index) ? 1 : 0.1);
            
            if (selectedItems.length === 0 && this.activeSelections.size === 0) {
                 this.linesGroup.selectAll('.line')
                    .transition()
                    .duration(300)
                    .style('stroke', d => this.colorScale(d.furnishingstatus))
                    .style('stroke-width', 1.5)
                    .style('opacity', 0.3);
            }

            return;
        }

        const selected = this.data.filter(d => {
            return Array.from(this.activeSelections.entries())
                .every(([dim, [y0, y1]]) => {
                    const value = d[dim];
                    const y = this.y[dim](value);
                    return y !== undefined && y >= y0 && y <= y1;
                });
        });

        const selectedIndices = new Set(selected.map(d => d.index));

        this.linesGroup.selectAll('.line')
            .transition()
            .duration(300)
            .style('stroke', d => selectedIndices.has(d.index) ? 'red' : this.colorScale(d.furnishingstatus))
            .style('stroke-width', d => selectedIndices.has(d.index) ? 2.5 : 1.5)
            .style('opacity', d => {
                if (this.activeSelections.size === 0) return 0.3;
                return selectedIndices.has(d.index) ? 1 : 0.1;
            });

        if (this.onSelectionChange) {
            this.onSelectionChange(selected.map(d => ({...d, selected: true})));
        }
    }

    brushEnded(event, dimension) {
        if (!event.selection) {
            this.activeSelections.delete(dimension);
        }
        this.updateSelection();
    }

    addTransitions(selection) {
        return selection.transition()
            .duration(500)
            .ease(d3.easeCubicInOut);
    }
}