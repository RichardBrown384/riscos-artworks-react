import React, {Component} from 'react';
import * as d3 from 'd3';

import {
    Artworks,
    RECORD_2C,
    RECORD_34,
    RECORD_CHARACTER,
    RECORD_FILL_COLOUR,
    RECORD_GROUP,
    RECORD_LAYER,
    RECORD_LINE_CAP_END,
    RECORD_LINE_CAP_START,
    RECORD_PATH,
    RECORD_STROKE_COLOUR,
    RECORD_STROKE_WIDTH,
} from 'riscos-artworks';

const FILLS = ['flat', 'linear', 'radial']

function nameInner({type, fillType, strokeWidth, strokeColour}) {
    switch (type & 0xFF) {
        case RECORD_PATH: return `Path (2)`;
        case RECORD_GROUP: return 'Group';
        case RECORD_LAYER: return 'Layer';
        case RECORD_STROKE_COLOUR: return `Stroke (${strokeColour | 0})`;
        case RECORD_STROKE_WIDTH: return `Stroke width (${strokeWidth})`;
        case RECORD_FILL_COLOUR: return `Fill (${FILLS[fillType]})`;
        case RECORD_LINE_CAP_END: return 'Cap start';
        case RECORD_LINE_CAP_START: return 'Cap end';
        case RECORD_2C: return 'Path (2C)';
        case RECORD_34: return 'Path (34)';
        case RECORD_CHARACTER: return 'Character';
        default:
            return type.toString(16);
    }
}

function name({type, ...data}) {
    if (!type) {
        return 'List';
    } else {
        return nameInner({type, ...data});
    }
}

class D3TreeComponent extends Component {
    constructor(props) {
        super(props);
        this.ref = React.createRef();
    }

    componentDidUpdate() {
        this.buildTree();
    }

    componentDidMount() {
        this.buildTree()
    }

    buildTree() {

        const {buffer} = this.props;
        if (!buffer) {
            return;
        }
        const width = 1600;

        const hierarchy = d3.hierarchy({
            children: Artworks.load(buffer).records
        });
        hierarchy.dx = 10;
        hierarchy.dy = width / (hierarchy.height + 1);
        const root = d3.tree().nodeSize([hierarchy.dx, hierarchy.dy])(hierarchy);

        let x0 = Infinity;
        let x1 = -x0;
        root.each(d => {
            if (d.x > x1) x1 = d.x;
            if (d.x < x0) x0 = d.x;
        });

        this.ref.current.innerHTML = '';

        const svg = d3.select(this.ref.current)
            .append("svg")
            .attr("viewBox", [0, 0, width, x1 - x0 + root.dx * 2]);

        const g = svg.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10)
            .attr("transform", `translate(${root.dy / 3},${root.dx - x0})`);

        const link = g.append("g")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(root.links())
            .join("path")
            .attr("d", d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));

        const node = g.append("g")
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 3)
            .selectAll("g")
            .data(root.descendants())
            .join("g")
            .attr("transform", d => `translate(${d.y},${d.x})`);

        node.append("circle")
            .attr("fill", d => d.children ? "#555" : "#999")
            .attr("r", 2.5);

        node.append("text")
            .attr("dy", "0.31em")
            .attr("x", d => d.children ? -6 : 6)
            .attr("text-anchor", d => d.children ? "end" : "start")
            .text(d => name(d.data))
            .clone(true).lower()
            .attr("stroke", "white");

    }

    render() {
        if (!this.props.buffer) {
            return <div/>;
        }
        return <div ref={this.ref}/>;
    }
}

export default D3TreeComponent;