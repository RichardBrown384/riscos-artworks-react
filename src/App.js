import {useState} from 'react';
import OutlineComponent from './components/OutlineComponent';
import ShadedComponent from './components/ShadedComponent';
import D3TreeComponent from './components/D3TreeComponent';
import JsonTreeComponent from './components/JsonTreeComponent';

function App() {
    const [buffer, setBuffer] = useState(null);
    async function loadFile(event) {
        const { target: { files = [] }} = event;
        const [file,] = files;
        if (file) {
            try {
                const array = await file.arrayBuffer();
                setBuffer(Buffer.from(array));
            } catch (e) {
                setBuffer(null);
            }
        } else {
            setBuffer(null);
        }
    }
    return (
        <div>
            <h1>RISC OS Artworks Viewer</h1>
            <input type="file" onChange={loadFile} />
            <OutlineComponent buffer={buffer} />
            <ShadedComponent buffer={buffer} />
            <JsonTreeComponent buffer={buffer} />
            <D3TreeComponent buffer={buffer}/>
        </div>
    );
}

export default App;
