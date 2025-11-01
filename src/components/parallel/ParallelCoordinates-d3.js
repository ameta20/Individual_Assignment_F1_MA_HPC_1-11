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

        this.dimensions = ['price', 'area', 'bedrooms', 'bathrooms', 'stories', 'parking'];

        this.y = {};
        this.x = d3.scalePoint()
            .domain(this.dimensions)
            .range([0, this.width])
            .padding(1);

        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    updateData(data) {
        this.data = data; // ✅ store data globally in the class

        // Create scales for each dimension
        this.dimensions.forEach(dimension => {
            this.y[dimension] = d3.scaleLinear()
                .domain(d3.extent(data, d => +d[dimension]))
                .range([this.height, 0])
                .nice();
        });

        // Draw axes
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

        // Define path generator as a class property
        this.path = d => d3.line()(
            this.dimensions.map(dim => [this.x(dim), this.y[dim](+d[dim])])
        );

        // Draw lines
        this.g.selectAll('.line')
            .data(this.data, d => d.id) // use stable id
            .join('path')
            .attr('class', 'line')
            .attr('d', d => this.path(d))
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
            .style('opacity', 0.1);

        this.g.selectAll('.line')
            .filter(line => line.id === d.id)
            .style('opacity', 1)
            .style('stroke-width', 2)
            .raise();
    }

   unhighlightLine() {
    if (this.activeSelections.size === 0) {
        this.g.selectAll('.line')
            .style('opacity', 0.3)
            .style('stroke-width', 1)
            .style('stroke', d => this.colorScale(d.furnishingstatus));
    } else {
        this.updateSelection(); // Changed from updateSelections to updateSelection
    }
}

    brushed(event, dimension) {
    if (!event.selection) {
        this.activeSelections.delete(dimension);
    } else {
        this.activeSelections.set(dimension, event.selection);
    }
    this.updateSelection(); // Changed from updateSelections
}

    // Remove updateSelection method and rename updateSelections to updateSelection
updateSelection(selectedItems) {
    if (!this.g) return;

    // If selectedItems is provided (from scatterplot), use those
    if (selectedItems) {
        this.g.selectAll('.line')
            .transition()
            .duration(300)
            .style('stroke', d => selectedItems.some(item => item.index === d.index) ? 'purple' : this.colorScale(d.furnishingstatus))
            .style('opacity', d => selectedItems.length === 0 ? 0.3 : 
                selectedItems.some(item => item.index === d.index) ? 1 : 0.1)
            .style('stroke-width', d => selectedItems.some(item => item.index === d.index) ? 2 : 1);
        return;
    }

    // Otherwise, use activeSelections from brushing
    if (!this.data) return;
    
    const selected = this.data.filter(d => {
        return Array.from(this.activeSelections.entries())
            .every(([dim, [y0, y1]]) => {
                const y = this.y[dim](+d[dim]);
                return y >= y0 && y <= y1;
            });
    });

    this.g.selectAll('.line')
        .transition()
        .duration(300)
        .style('stroke', d => selected.includes(d) ? 'red' : this.colorScale(d.furnishingstatus))
        .style('opacity', d => selected.length === 0 ? 0.3 : 
            selected.includes(d) ? 1 : 0.1)
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
                .style('stroke', d => this.colorScale(d.furnishingstatus))
                .style('opacity', 0.3)
                .style('stroke-width', 1);
            if (this.onSelectionChange) {
                this.onSelectionChange([]);
            }
        } else {
            this.updateSelection(); // Changed from updateSelections to updateSelection
        }
    }
}

    addTransitions(selection) {
        return selection.transition()
            .duration(300)
            .ease(d3.easeLinear);
    }
}
