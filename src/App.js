import './App.css';
import {useState, useEffect} from 'react'
import {fetchCSV} from "./utils/helper";
import * as d3 from 'd3';
import ScatterplotContainer from "./components/scatterplot/ScatterplotContainer";
import ParallelCoordinatesContainer from "./components/parallel/ParallelCoordinatesContainer";

function App() {
    const [data, setData] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);

    // Load and process data
    useEffect(() => {
        console.log("Loading data...");
        fetchCSV("data/Housing.csv", (response) => {
            console.log("Data loaded:", response.data);
            const processed = response.data.map((d, i) => ({
                ...d,
                price: +d.price,
                area: +d.area,
                bedrooms: +d.bedrooms,
                bathrooms: +d.bathrooms,
                stories: +d.stories,
                parking: +d.parking,
                index: i
            }));
            setData(processed);
        });
    }, []);

    // Shared controller for both visualizations
    const visualizationController = {
        updateSelectedItems: (items, source) => {
            console.log(`Selection update from ${source}:`, items);
            
            if (!Array.isArray(items) || items.length === 0) {
                setSelectedItems([]);
                return;
            }

            // Find matching items based on price and area values
            const matchingItems = data.filter(d => 
                items.some(item => 
                    d.price === item.price && 
                    d.area === item.area
                )
            );
            
            console.log("Matching items:", matchingItems);
            setSelectedItems(matchingItems);
        }
    };

    // Debug data and selections
    useEffect(() => {
        console.log("Data updated:", data);
    }, [data]);

    useEffect(() => {
        console.log("Selection updated:", selectedItems);
    }, [selectedItems]);

    return (
        <div className="App">
            <div id={"MultiviewContainer"} className={"row"}>
                <ScatterplotContainer
                    scatterplotData={data}
                    xAttribute={"area"}
                    yAttribute={"price"}
                    selectedItems={selectedItems}
                    scatterplotControllerMethods={visualizationController}
                />
                <ParallelCoordinatesContainer
                    data={data}
                    selectedItems={selectedItems}
                    controllerMethods={visualizationController}
                />
            </div>
        </div>
    );
}

export default App;