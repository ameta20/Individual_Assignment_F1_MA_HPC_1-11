import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import ParallelCoordinatesD3 from "./ParallelCoordinates-d3";

function ParallelCoordinatesContainer({ data, selectedItems, controllerMethods }) {
  const svgRef = useRef();
  const pcRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    if (!pcRef.current) {
      pcRef.current = new ParallelCoordinatesD3({
        svg: svgRef.current,
        width: 600,
        height: 400,
        onSelectionChange: controllerMethods.updateSelectedItems,
      });
    }

    pcRef.current.updateData(data);
  }, [data]);

  // update highlights whenever selection changes
  useEffect(() => {
    if (pcRef.current) {
      pcRef.current.updateSelection(new Set(selectedItems.map((d) => d.index)));
    }
  }, [selectedItems]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <svg ref={svgRef} width="100%" height="100%"></svg>
    </div>
  );
}

export default ParallelCoordinatesContainer;
