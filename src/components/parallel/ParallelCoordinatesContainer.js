import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import ParallelCoordinatesD3 from "./ParallelCoordinates-d3";
import './ParallelCoordinates.css';

function ParallelCoordinatesContainer({ data, selectedItems, controllerMethods }) {
    const svgRef = useRef();
    const pcRef = useRef();
    const containerRef = useRef();

    // Get container dimensions
    const getChartSize = () => {
        if (!containerRef.current) return { width: 600, height: 400 };
        return {
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight
        };
    };

    // Initialize and update visualization
    useEffect(() => {
        if (!data || data.length === 0) return;

        if (!pcRef.current) {
            const size = getChartSize();
            pcRef.current = new ParallelCoordinatesD3({
                svg: svgRef.current,
                width: size.width,
                height: size.height,
                onSelectionChange: (selected) => {
                    // Make sure we pass complete data objects
                    const selectedData = selected.map(d => ({...d, selected: true}));
                    controllerMethods.updateSelectedItems(selectedData);
                }
            });
        }

        pcRef.current.updateData(data);
    }, [data, controllerMethods]);

    // Update highlights when selection changes
    useEffect(() => {
        if (pcRef.current && selectedItems) {
            // Update the parallel coordinates visualization's selection state
            pcRef.current.updateSelection(selectedItems);
        }
    }, [selectedItems]);

    return (
        <div ref={containerRef} className="parallel-coordinates-container">
            <svg ref={svgRef}></svg>
        </div>
    );
}

export default ParallelCoordinatesContainer;