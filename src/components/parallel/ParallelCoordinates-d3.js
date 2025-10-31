import * as d3 from "d3";

export default class ParallelCoordinatesD3 {
  constructor({ svg, width, height, onSelectionChange }) {
    this.svg = d3.select(svg);
    this.width = width;
    this.height = height;
    this.onSelectionChange = onSelectionChange;
    this.margin = { top: 30, right: 40, bottom: 10, left: 40 };
    this.innerWidth = width - this.margin.left - this.margin.right;
    this.innerHeight = height - this.margin.top - this.margin.bottom;

    this.g = this.svg
      .attr("viewBox", [0, 0, width, height])
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
  }

  updateData(data) {
    this.data = data;
    const numericKeys = Object.keys(data[0]).filter(
      (k) => k !== "index" && data.every((d) => !isNaN(+d[k]))
    );

    this.x = d3.scalePoint().domain(numericKeys).range([0, this.innerWidth]);
    this.y = {};
    numericKeys.forEach(
      (dim) =>
        (this.y[dim] = d3
          .scaleLinear()
          .domain(d3.extent(data, (d) => +d[dim]))
          .nice()
          .range([this.innerHeight, 0]))
    );

    this.draw(numericKeys);
  }

  draw(dimensions) {
    const g = this.g;
    const self = this;

    // clear before redraw
    g.selectAll("*").remove();

    // create background and foreground line groups
    this.background = g.append("g").attr("class", "background");
    this.foreground = g.append("g").attr("class", "foreground");

    const line = d3
      .line()
      .defined((d) => !isNaN(d[1]))
      .x((d) => this.x(d[0]))
      .y((d) => this.y[d[0]](d[1]));

    // draw all lines
    this.foreground
      .selectAll("path")
      .data(this.data)
      .join("path")
      .attr("d", (d) => line(d3.cross(dimensions, [d], (dim) => [dim, +d[dim]])))
      .attr("stroke", "#4682b4")
      .attr("stroke-width", 1)
      .attr("fill", "none")
      .attr("opacity", 0.6);

    // axes
    const axis = d3.axisLeft();
    const dimensionGroup = g
      .selectAll(".dimension")
      .data(dimensions)
      .join("g")
      .attr("class", "dimension")
      .attr("transform", (d) => `translate(${this.x(d)})`);

    dimensionGroup.each(function (dim) {
      d3.select(this).call(axis.scale(self.y[dim]));
    });

    // dimension labels
    dimensionGroup
      .append("text")
      .attr("y", -9)
      .attr("text-anchor", "middle")
      .text((d) => d)
      .style("fill", "black");

    // add 1D brushes
    dimensionGroup.each(function (dim) {
      d3.select(this)
        .append("g")
        .attr("class", "brush")
        .call(
          d3
            .brushY()
            .extent([
              [-10, 0],
              [10, self.innerHeight],
            ])
            .on("brush end", (event) => self.brushed(event, dim))
        );
    });
  }

  brushed(event, dim) {
    if (!event.selection) {
      this.updateSelection(new Set()); // clear
      this.onSelectionChange([]);
      return;
    }
    const [y0, y1] = event.selection;
    const selected = this.data.filter((d) => {
      const value = +d[dim];
      const yPos = this.y[dim](value);
      return yPos >= y0 && yPos <= y1;
    });

    this.updateSelection(new Set(selected.map((d) => d.index)));
    this.onSelectionChange(selected);
  }

  updateSelection(selectedSet) {
    this.foreground
      .selectAll("path")
      .attr("stroke", (d) => (selectedSet.has(d.index) ? "orange" : "#4682b4"))
      .attr("stroke-width", (d) => (selectedSet.has(d.index) ? 2 : 1))
      .attr("opacity", (d) =>
        selectedSet.size === 0 ? 0.6 : selectedSet.has(d.index) ? 1 : 0.1
      );
  }
}
