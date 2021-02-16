import JSONTree from 'react-json-tree';
import {Artworks} from "riscos-artworks";

function JsonTreeComponent({buffer}) {
    if (!buffer) {
        return <div/>;
    }
    const artworks = Artworks.load(buffer);
    return <JSONTree data={artworks} />
}

export default JsonTreeComponent;