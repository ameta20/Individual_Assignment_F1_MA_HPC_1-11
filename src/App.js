import './App.css';
import {useState, useEffect} from 'react'
import {fetchCSV} from "./utils/helper";
import * as d3 from 'd3';
import ScatterplotContainer from "./components/scatterplot/ScatterplotContainer";
import ParallelCoordinatesContainer from "./components/parallel/ParallelCoordinatesContainer";

function App() {
    const [data, setData] = useState([])
    const [selectedItems, setSelectedItems] = useState([])

    useEffect(() => {
        fetchCSV("data/Housing.csv", (response) => {
            const processed = response.data.map((d, i) => ({
                ...d,
                id: i // unique id for synchronization
        }));
        setData(processed);
        })
    }, [])

    const visualizationController = {
            updateSelectedItems: (items) => {
                // Store complete data objects instead of just IDs
                setSelectedItems(Array.isArray(items) ? items : []);
            }
        };



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