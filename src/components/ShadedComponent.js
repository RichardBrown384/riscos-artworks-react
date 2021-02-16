// TODO support start and end line caps with svg markers
// https://stackoverflow.com/questions/11808860/how-to-place-arrow-head-triangles-on-svg-lines

// TODO colour transitions between shapes
// https://graphicdesign.stackexchange.com/questions/127669/is-it-possible-to-do-smooth-color-transition-between-2-paths-in-inkscape

import {
    Artworks,
    FILL_FLAT,
    FILL_LINEAR,
    FILL_RADIAL,
    RECORD_2C,
    RECORD_34,
    RECORD_35,
    RECORD_38,
    RECORD_3D,
    RECORD_FILL_COLOUR,
    RECORD_LINE_CAP_END,
    RECORD_LINE_CAP_START,
    RECORD_PATH,
    RECORD_STROKE_COLOUR,
    RECORD_STROKE_WIDTH
} from 'riscos-artworks';

function convertPaths(paths) {
    return paths.map((path, index) => {
        const {pointer, ...pathData} = path;
        return <path {...pathData} key={index}>
            <desc>{JSON.stringify(pointer)}</desc>
        </path>;
    });
}

function convertStops(stops) {
    return stops.map((stop, index) => {
        return <stop {...stop} key={index}/>
    });
}

function convertDefs(CustomTag, defs) {
    return defs.map(({stops, ...data}, index) => {
        return <CustomTag {...data} key={index}>
            {convertStops(stops)}
        </CustomTag>
    });
}


function extractShaded({records = [], palette = {}}) {

    const linearGradients = [];
    const radialGradients = [];
    const paths = [];
    const fileBoundingBox = {}

    const renderState = {
        fill: 'none',
        fillRule: 'nonzero',
        stroke: 'black',
        strokeWidth: 160,
        strokeLinecap: 'butt'
    };

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

    function getColour(index) {
        const {colours = []} = palette;
        if (index < colours.length) {
            const {colour = 0xFF00FF} = colours[index];
            const b = (colour >> 16) & 0xFF;
            const g = (colour >> 8) & 0xFF;
            const r = (colour) & 0xFF;
            return `rgb(${[r, g, b]})`
        }
        return 'none';
    }

    function toPathString(path) {
        const result = [];
        for (const element of path) {
            const {tag, points = []} = element;
            result.push(`${tag} ${points.flatMap(({x, y}) => [x, y])}`);
        }
        return result.join(' ');
    }

    function flatFill({colour}) {
        return getColour(colour);
    }

    function linearGradient({gradientLine, startColour, endColour}) {
        const id = `linear-gradient-${linearGradients.length}`;
        const [p1, p2] = gradientLine;
        const gradient = {
            id,
            gradientUnits: 'userSpaceOnUse',
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            stops: [
                {offset: "0%", stopColor: getColour(startColour)},
                {offset: "100%", stopColor: getColour(endColour)},
            ]
        };
        linearGradients.push(gradient);
        return `url(#${id})`;
    }

    function radialGradient({gradientLine, startColour, endColour}) {
        const id = `radial-gradient-${radialGradients.length}`;
        const [p1, p2] = gradientLine;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        const gradient = {
            id,
            gradientUnits: 'userSpaceOnUse',
            cx: p1.x,
            cy: p1.y,
            fx: p1.x,
            fy: p1.y,
            r,
            stops: [
                {offset: "0%", stopColor: getColour(startColour)},
                {offset: "100%", stopColor: getColour(endColour)},
            ]
        };
        radialGradients.push(gradient);
        return `url(#${id})`;
    }

    function fill({fillType, ...data}) {
        switch (fillType) {
            case FILL_FLAT:
                return flatFill(data);
            case FILL_LINEAR:
                return linearGradient(data);
            case FILL_RADIAL:
                return radialGradient(data);
            default:
                return 'none';
        }
    }

    function processPath({pointer, path, boundingBox}) {
        mergeBoundingBox(boundingBox);
        paths.push({
            d: toPathString(path),
            ...renderState,
            pointer
        });
        // TODO Hack forcibly reset the render state
        renderState.fill = 'none';
        renderState.stroke = 'black';
        renderState.strokeWidth = 160;
        renderState.strokeLinecap = 'butt';
    }

    function processStrokeColour({strokeColour}) {
        renderState.stroke = getColour(strokeColour);
    }

    function processStrokeWidth({strokeWidth}) {
        renderState.strokeWidth = strokeWidth;
    }

    function processFillColour(data) {
        renderState.fill = fill(data);
    }

    function processLineCap({capStyle}) {
        const styles = [
            'butt', 'round', 'square', 'butt'
        ];
        renderState.strokeLinecap = styles[capStyle];
    }

    function traverse({children = [], ...data}, reverse) {

        function traverseInner() {
            if (reverse) {
                for (const grandchild of children.reverse()) {
                    traverse(grandchild, false);
                }
            } else {
                for (const grandchild of children) {
                    traverse(grandchild, true);
                }
            }
        }

        const {type} = data;
        switch (type & 0xFF) {
            case RECORD_PATH:
                traverseInner();
                processPath(data);
                break;
            case RECORD_STROKE_COLOUR:
                processStrokeColour(data);
                break;
            case RECORD_STROKE_WIDTH:
                processStrokeWidth(data);
                break;
            case RECORD_FILL_COLOUR:
                processFillColour(data);
                break;
            case RECORD_LINE_CAP_START:
                processLineCap(data);
                break;
            case RECORD_LINE_CAP_END:
                processLineCap(data)
                break;
            case RECORD_2C:
                traverseInner();
                processPath(data);
                break;
            case RECORD_34:
                traverseInner();
                processPath(data);
                break;
            case RECORD_35:
                traverseInner();
                processPath(data);
                break;
            case RECORD_38:
                traverseInner();
                processPath(data);
                break;
            case RECORD_3D:
                traverseInner();
                processPath(data);
                break;
            default:
                traverseInner();
                break;
        }
    }

    for (const record of records) {
        traverse(record, true);
    }

    return {
        boundingBox: fileBoundingBox,
        linearGradients,
        radialGradients,
        paths
    };
}

function ShadedComponent({buffer}) {
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
        linearGradients,
        radialGradients,
        paths
    } = extractShaded(artworks);


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
                <defs>
                    {convertDefs('linearGradient', linearGradients)}
                    {convertDefs('radialGradient', radialGradients)}
                </defs>
                <g transform={`matrix(${transform})`}>
                    {convertPaths(paths, 160)}
                </g>
            </svg>
        </div>
    );
}

export default ShadedComponent;