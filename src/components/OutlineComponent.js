import {
    Artworks,
    RECORD_PATH,
    RECORD_2C,
    RECORD_34,
    RECORD_35,
    RECORD_38,
    RECORD_3D
} from 'riscos-artworks';

function convertPaths(paths, strokeWidth) {

    function toPathString(path) {
        const result = [];
        for (const element of path) {
            const {tag, points = []} = element;
            result.push(`${tag} ${points.flatMap(({x, y}) => [x, y])}`);
        }
        return result.join(' ');
    }

    return paths.map((path, index) => {
        return <path d={toPathString(path)}
                     fill="none"
                     stroke="black"
                     strokeWidth={strokeWidth}
                     key={index}/>;
    });
}


function extractOutlines({records = []}) {

    const paths = [];
    const fileBoundingBox = {}

    function isBoundingBoxValid({minX, maxX, minY, maxY}) {
        return (minX < maxX) && (minY < maxY);
    }

    function mergeBoundingBox(other) {
        if (!isBoundingBoxValid(other)) {
            return;
        }

        function safe(operation, a, b) {
            return !a ? b : operation(a, b);
        }

        fileBoundingBox.minX = safe(Math.min, fileBoundingBox.minX, other.minX);
        fileBoundingBox.maxX = safe(Math.max, fileBoundingBox.maxX, other.maxX);
        fileBoundingBox.minY = safe(Math.min, fileBoundingBox.minY, other.minY);
        fileBoundingBox.maxY = safe(Math.max, fileBoundingBox.maxY, other.maxY);
    }

    function processPath({path, boundingBox}) {
        mergeBoundingBox(boundingBox);
        paths.push(path);
    }

    function traverse({children = [], ...data}) {
        const {type} = data;
        switch (type & 0xFF) {
            case RECORD_PATH:
                processPath(data);
                break;
            case RECORD_2C:
                processPath(data);
                break;
            case RECORD_34:
                processPath(data);
                break;
            case RECORD_35:
                processPath(data);
                break;
            case RECORD_38:
                processPath(data);
                break;
            case RECORD_3D:
                processPath(data);
                break;
            default:
                break;
        }
        for (const child of children) {
            traverse(child);
        }
    }

    for (const record of records) {
        traverse(record);
    }

    return {boundingBox: fileBoundingBox, paths};
}

function OutlineComponent({buffer}) {
    if (!buffer) {
        return <div/>;
    }

    const artworks = Artworks.load(buffer);
    const {error} = artworks;
    if (error) {
        return (
            <div>
                <div>
                    A problem occurred loading the file: {error.message}
                </div>
            </div>
        );
    }

    const {
        boundingBox: {minX, maxX, minY, maxY},
        paths
    } = extractOutlines(artworks);

    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);

    const screenWidth = 800;
    const screenHeight = (height * screenWidth) / width;

    const sx = screenWidth / width;
    const sy = screenHeight / height;

    const transform = [sx, 0, 0, -sy, -sx * minX, sy * maxY];

    return (
        <div>
            <svg width={screenWidth} height={screenHeight}>
                <g transform={`matrix(${transform})`}>
                    {convertPaths(paths, 160)}
                </g>
            </svg>
        </div>
    );
}

export default OutlineComponent;