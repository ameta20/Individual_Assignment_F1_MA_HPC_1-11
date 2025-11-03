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
                mainroad: d.mainroad,
                guestroom: d.guestroom,
                basement: d.basement,
                hotwaterheating: d.hotwaterheating,
                airconditioning: d.airconditioning,
                prefarea: d.prefarea,
                furnishingstatus: d.furnishingstatus,
                index: i // add index for unique identification
            }));
            setData(processed);
        });
    }, []);

    // Shared controller for both visualizations
    const visualizationController = {
        updateSelectedItems: (items, source) => {
            if (!Array.isArray(items)) {
                return;
            }
            // items from child components are full data object and can be set directly as selected
            setSelectedItems(items);
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
            <div id={"MultiviewContainer"} className={"column"}>
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