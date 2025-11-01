import * as d3 from "d3";

export default class ParallelCoordinatesD3 {
    constructor({ svg, width, height, onSelectionChange }) {
        this.margin = { top: 30, right: 50, bottom: 30, left: 50 };
        this.width = width - this.margin.left - this.margin.right;
        this.height = height - this.margin.top - this.margin.bottom;
        this.svg = d3.select(svg);
        this.onSelectionChange = onSelectionChange;
        this.activeSelections = new Map();

         this.colorScale = d3.scaleOrdinal()
            .domain(['furnished', 'semi-furnished', 'unfurnished'])
            .range(['#1f77b4', '#2ca02c', '#ff7f0e']);

        // Define numeric dimensions to show
        this.dimensions = ['price', 'area', 'bedrooms', 'bathrooms', 'stories', 'parking'];

        // Create scales for each dimension
        this.y = {};
        this.x = d3.scalePoint()
            .domain(this.dimensions)
            .range([0, this.width])
            .padding(1);

        // Add group for the visualization
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    updateData(data) {
        this.data = data;


        

        // Create scales for each dimension
        this.dimensions.forEach(dimension => {
            this.y[dimension] = d3.scaleLinear()
                .domain(d3.extent(data, d => +d[dimension]))
                .range([this.height, 0])
                .nice();
        });


        

        // Add axes
        const axes = this.g.selectAll('.axis')
            .data(this.dimensions)
            .join('g')
            .attr('class', 'axis')
            .attr('transform', d => `translate(${this.x(d)},0)`);

        axes.each((d, i, nodes) => {
            d3.select(nodes[i])
                .call(d3.axisLeft(this.y[d]))
                .call(g => g.append('text')
                    .attr('y', -9)
                    .attr('text-anchor', 'middle')
                    .text(d)
                    .style('fill', 'black'));
        });

        // Add lines with path generator
        const line = this.dimensions.map(d => {
            return [this.x(d), d];
        });

        const path = d => d3.line()(line.map(([x, dimension]) => {
            return [x, this.y[dimension](+d[dimension])];
        }));

        // Update paths
        this.g.selectAll('.line')
            .data(data)
            .join('path')
            .attr('class', 'line')
            .attr('d', path)
            .style('fill', 'none')
            .style('stroke', d => this.colorScale(d.furnishingstatus))
            .style('opacity', 0.3)
            .on('mouseover', (event, d) => this.highlightLine(d))
            .on('mouseout', () => this.unhighlightLine());

        // Add brushes
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
    }

    highlightLine(d) {
        this.g.selectAll('.line')
            .style('opacity', 0.1)
            .style('stroke', d => this.colorScale(d.furnishingstatus));

        this.g.selectAll('.line')
            .filter(line => line === d)
            .style('opacity', 1)
            .style('stroke-width', 2)
            .raise();
    }

    unhighlightLine() {
        if (this.activeSelections.size === 0) {
            this.g.selectAll('.line')
                .style('opacity', 0.3)
                .style('stroke', d => this.colorScale(d.furnishingstatus))
                .style('stroke-width', 1);
        } else {
            this.updateSelections();
        }
    }

    brushed(event, dimension) {
        if (!event.selection) {
            this.activeSelections.delete(dimension);
        } else {
            this.activeSelections.set(dimension, event.selection);
        }
        this.updateSelections();
    }

    updateSelections() {
        const selected = this.data.filter(d => {
            return Array.from(this.activeSelections.entries())
                .every(([dim, [y0, y1]]) => {
                    const y = this.y[dim](+d[dim]);
                    return y >= y0 && y <= y1;
                });
        });

        this.g.selectAll('.line')
        .call(sel => this.addTransitions(sel))
        .style('stroke', d => this.colorScale(d.furnishingstatus))
        .style('opacity', d => selected.includes(d) ? 1 : 0.1)
        .style('stroke-width', d => selected.includes(d) ? 2 : 1);


        if (this.onSelectionChange) {
            this.onSelectionChange(selected);
        }
    }


    brushEnded(event, dimension) {
    if (!event.selection) {
        this.activeSelections.delete(dimension);
        if (this.activeSelections.size === 0) {
            this.g.selectAll('.line')
                .style('stroke', d => this.colorScale(d.furnishingstatus))  // Changed from '#69b3a2'
                .style('opacity', 0.3)
                .style('stroke-width', 1);
            if (this.onSelectionChange) {
                this.onSelectionChange([]);
            }
        } else {
            this.updateSelections();
        }
    }
  }
  // Add this method to the class
    addTransitions(selection) {
        return selection.transition()
            .duration(300)
            .ease(d3.easeLinear);
    }

}